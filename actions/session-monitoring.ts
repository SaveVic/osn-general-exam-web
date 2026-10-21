"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/admin";
import { getAdminUser } from "@/actions/auth";
import { scoreExamSession } from "@/actions/scoring";
import type { ExamRow, Json } from "@/types/database";

export interface MonitoredSessionRow {
  id: string;
  studentName: string;
  studentClass: string;
  startedAt: string;
  submittedAt: string | null;
  isCompleted: boolean;
  totalScore: number | null;
  answeredCount: number;
  lastSyncedAt: string | null;
}

export interface ExamMonitoringDataResult {
  success: boolean;
  message?: string;
  serverTime?: string;
  exam?: ExamRow;
  totalQuestions?: number;
  sessions?: MonitoredSessionRow[];
}

export interface ForceSubmitSessionResult {
  success: boolean;
  alreadyCompleted?: boolean;
  submittedAt?: string;
  totalScore?: number | null;
  message?: string;
}

function isAnswerFilled(val: Json | undefined): boolean {
  if (val === null || val === undefined) {
    return false;
  }
  if (typeof val === "string") {
    return val.trim().length > 0;
  }
  if (typeof val === "number" || typeof val === "boolean") {
    return true;
  }
  if (Array.isArray(val)) {
    return val.length > 0;
  }
  if (typeof val === "object") {
    const record = val as Record<string, Json | undefined>;
    if ("value" in record) {
      return isAnswerFilled(record.value);
    }
    if ("selected" in record) {
      return isAnswerFilled(record.selected);
    }
    if ("text" in record) {
      return isAnswerFilled(record.text);
    }
    return Object.keys(record).length > 0;
  }
  return false;
}

/**
 * Server Action F5-04 (ADM-MONI-01):
 * Mengambil data pemantauan sesi aktif peserta ujian beserta progres jawaban & waktu sinkronisasi terakhir.
 */
export async function getExamMonitoringData(
  examId: string
): Promise<ExamMonitoringDataResult> {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return {
        success: false,
        message: "Akses ditolak. Silakan masuk sebagai administrator.",
      };
    }

    const supabase = createServiceClient();

    // 1. Ambil metadata naskah ujian
    const examTable = supabase.from("exams");
    if (!examTable || typeof examTable.select !== "function") {
      return {
        success: false,
        message: "Klien database tidak mendukung kueri ujian.",
      };
    }

    const { data: exam, error: examError } = await examTable
      .select("*")
      .eq("id", examId)
      .single();

    if (examError || !exam) {
      return {
        success: false,
        message: "Naskah ujian tidak ditemukan.",
      };
    }

    // 2. Hitung jumlah butir soal pada naskah ujian ini
    let totalQuestions = 0;
    const questionsTable = supabase.from("questions");
    if (questionsTable && typeof questionsTable.select === "function") {
      const { data: questionsData, error: questionsError } = await questionsTable
        .select("id")
        .eq("exam_id", examId);

      if (!questionsError && Array.isArray(questionsData)) {
        totalQuestions = questionsData.length;
      }
    }

    // 3. Ambil data sesi pemantauan (Coba via database view v_exam_session_monitoring terlebih dahulu)
    let sessions: MonitoredSessionRow[] = [];

    try {
      const viewTable = supabase.from("v_exam_session_monitoring");
      if (viewTable && typeof viewTable.select === "function") {
        const { data: viewData, error: viewError } = await viewTable
          .select(
            "id, student_name, student_class, started_at, submitted_at, is_completed, total_score, answered_count, last_synced_at"
          )
          .eq("exam_id", examId)
          .order("started_at", { ascending: true });

        if (!viewError && Array.isArray(viewData)) {
          sessions = viewData.map((s) => ({
            id: s.id,
            studentName: s.student_name,
            studentClass: s.student_class,
            startedAt: s.started_at,
            submittedAt: s.submitted_at ?? null,
            isCompleted: Boolean(s.is_completed),
            totalScore:
              s.total_score !== null && s.total_score !== undefined
                ? Number(s.total_score)
                : null,
            answeredCount: Number(s.answered_count) || 0,
            lastSyncedAt: s.last_synced_at ?? null,
          }));
        }
      }
    } catch {
      // Beralih ke fallback manual jika view belum terpasang
    }

    // Jika view belum terpasang atau mengembalikan array kosong, gunakan kueri fallback
    if (sessions.length === 0) {
      const sessionTable = supabase.from("exam_sessions");
      if (!sessionTable || typeof sessionTable.select !== "function") {
        return {
          success: false,
          message: "Klien database tidak mendukung kueri sesi peserta.",
        };
      }

      const { data: sessionsData, error: sessionsError } = await sessionTable
        .select(
          "id, student_name, student_class, started_at, submitted_at, is_completed, total_score"
        )
        .eq("exam_id", examId)
        .order("started_at", { ascending: true });

      if (sessionsError) {
        console.error(
          "Gagal mengambil daftar sesi untuk pemantauan:",
          sessionsError.message
        );
        return {
          success: false,
          message: "Gagal memuat daftar sesi peserta ujian.",
        };
      }

      const sessionList = sessionsData || [];
      const sessionIds = sessionList.map((s) => s.id);

      // 4. Ambil ringkasan jawaban untuk menghitung progres & waktu sinkronisasi terakhir per sesi
      const syncStatsMap = new Map<
        string,
        { answeredCount: number; lastSyncedAt: string | null }
      >();

      if (sessionIds.length > 0) {
        const answersTable = supabase.from("session_answers");
        if (answersTable && typeof answersTable.select === "function") {
          const { data: answersData, error: answersError } = await answersTable
            .select("session_id, answer_value, last_updated_at")
            .in("session_id", sessionIds);

          if (!answersError && Array.isArray(answersData)) {
            for (const ans of answersData) {
              const current = syncStatsMap.get(ans.session_id) ?? {
                answeredCount: 0,
                lastSyncedAt: null,
              };

              if (isAnswerFilled(ans.answer_value as Json)) {
                current.answeredCount += 1;
              }

              if (ans.last_updated_at) {
                if (
                  !current.lastSyncedAt ||
                  new Date(ans.last_updated_at).getTime() >
                    new Date(current.lastSyncedAt).getTime()
                ) {
                  current.lastSyncedAt = ans.last_updated_at;
                }
              }

              syncStatsMap.set(ans.session_id, current);
            }
          }
        }
      }

      sessions = sessionList.map((s) => {
        const syncStats = syncStatsMap.get(s.id);
        return {
          id: s.id,
          studentName: s.student_name,
          studentClass: s.student_class,
          startedAt: s.started_at,
          submittedAt: s.submitted_at ?? null,
          isCompleted: Boolean(s.is_completed),
          totalScore:
            s.total_score !== null && s.total_score !== undefined
              ? Number(s.total_score)
              : null,
          answeredCount: syncStats?.answeredCount ?? 0,
          lastSyncedAt: syncStats?.lastSyncedAt ?? null,
        };
      });
    }

    return {
      success: true,
      serverTime: new Date().toISOString(),
      exam: exam as ExamRow,
      totalQuestions,
      sessions,
    };
  } catch (err) {
    console.error("Kesalahan internal saat memuat pemantauan sesi:", err);
    return {
      success: false,
      message: "Terjadi kesalahan internal saat memuat data pemantauan sesi.",
    };
  }
}

/**
 * Server Action F5-04 (ADM-MONI-01):
 * Aksi Darurat Administrator ("Paksa Kumpulkan" / Force Submit) untuk mengakhiri sesi peserta dari jauh,
 * menghentikan hak akses pengisian, dan menghitung skor otomatis dari jawaban terakhir yang tersimpan.
 */
export async function forceSubmitSessionAction(
  sessionId: string
): Promise<ForceSubmitSessionResult> {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return {
        success: false,
        message: "Akses ditolak. Silakan masuk sebagai administrator.",
      };
    }

    if (!sessionId || sessionId.trim().length === 0) {
      return {
        success: false,
        message: "ID sesi peserta tidak valid.",
      };
    }

    const supabase = createServiceClient();
    const sessionTable = supabase.from("exam_sessions");

    if (!sessionTable || typeof sessionTable.select !== "function") {
      return {
        success: false,
        message: "Klien database tidak mendukung operasi sesi.",
      };
    }

    const { data: session, error: sessionError } = await sessionTable
      .select("id, exam_id, started_at, submitted_at, is_completed, total_score")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return {
        success: false,
        message: "Sesi peserta ujian tidak ditemukan.",
      };
    }

    if (session.is_completed) {
      return {
        success: true,
        alreadyCompleted: true,
        submittedAt: session.submitted_at ?? session.started_at,
        totalScore:
          session.total_score !== null && session.total_score !== undefined
            ? Number(session.total_score)
            : null,
        message: "Sesi peserta ini telah diselesaikan sebelumnya.",
      };
    }

    const nowIso = new Date().toISOString();

    const { error: updateError } = await sessionTable
      .update({
        is_completed: true,
        submitted_at: nowIso,
      })
      .eq("id", sessionId);

    if (updateError) {
      console.error(
        "Gagal memaksa pengumpulan sesi peserta:",
        updateError.message
      );
      return {
        success: false,
        message: "Gagal memperbarui status pengumpulan paksa pada server.",
      };
    }

    // Hitung nilai otomatis atas seluruh jawaban terakhir yang telah tersinkronisasi
    const scoreResult = await scoreExamSession(sessionId);

    revalidatePath(`/admin/ujian/${session.exam_id}/pemantauan`);
    revalidatePath(`/admin/ujian/${session.exam_id}/laporan`);
    revalidatePath(`/admin/ujian/${session.exam_id}/penilaian`);
    revalidatePath("/admin/dasbor");

    return {
      success: true,
      submittedAt: nowIso,
      totalScore: scoreResult.totalScore ?? 0,
      message:
        "Sesi peserta berhasil dipaksa kumpulkan dan hak akses pengisian telah dihentikan.",
    };
  } catch (err) {
    console.error("Kesalahan internal saat paksa kumpulkan sesi:", err);
    return {
      success: false,
      message:
        "Terjadi kesalahan internal saat memproses pengumpulan paksa sesi peserta.",
    };
  }
}

