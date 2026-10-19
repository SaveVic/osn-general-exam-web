"use server";

import { createServiceClient } from "@/lib/supabase/admin";
import { getAdminUser } from "@/actions/auth";
import { roundToTwoDecimals } from "@/lib/exam/scoring";
import type { ExamReportSessionRow } from "@/lib/exam/report-csv";
import type { ExamRow } from "@/types/database";

export interface ExamReportDataResult {
  success: boolean;
  message?: string;
  exam?: ExamRow;
  maxPossibleScore?: number;
  sessions?: ExamReportSessionRow[];
}

/**
 * Server Action: Mengambil data rekapitulasi nilai & sesi peserta untuk halaman Laporan Akademis (ADM-RECP-01)
 */
export async function getExamReportData(
  examId: string
): Promise<ExamReportDataResult> {
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

    // 2. Hitung total bobot poin maksimal dari seluruh soal ujian
    let maxPossibleScore = 0;
    const questionsTable = supabase.from("questions");
    if (questionsTable && typeof questionsTable.select === "function") {
      const { data: questionsData, error: questionsError } = await questionsTable
        .select("points")
        .eq("exam_id", examId);

      if (!questionsError && questionsData) {
        const sumPoints = questionsData.reduce(
          (acc, q) => acc + (Number(q.points) || 0),
          0
        );
        maxPossibleScore = roundToTwoDecimals(sumPoints);
      }
    }

    // 3. Ambil seluruh sesi peserta untuk ujian ini
    const sessionTable = supabase.from("exam_sessions");
    if (!sessionTable || typeof sessionTable.select !== "function") {
      return {
        success: false,
        message: "Klien database tidak mendukung kueri sesi peserta.",
      };
    }

    const { data: sessionsData, error: sessionsError } = await sessionTable
      .select(
        "id, student_name, student_class, started_at, submitted_at, total_score, is_completed"
      )
      .eq("exam_id", examId)
      .order("started_at", { ascending: true });

    if (sessionsError) {
      console.error(
        "Gagal mengambil daftar sesi peserta untuk laporan:",
        sessionsError.message
      );
      return {
        success: false,
        message: "Gagal memuat daftar sesi peserta ujian.",
      };
    }

    const sessions: ExamReportSessionRow[] = (sessionsData || []).map((s) => ({
      id: s.id,
      studentName: s.student_name,
      studentClass: s.student_class,
      startedAt: s.started_at,
      submittedAt: s.submitted_at ?? null,
      totalScore:
        s.total_score !== null && s.total_score !== undefined
          ? Number(s.total_score)
          : null,
      isCompleted: Boolean(s.is_completed),
    }));

    return {
      success: true,
      exam: exam as ExamRow,
      maxPossibleScore,
      sessions,
    };
  } catch (err) {
    console.error("Kesalahan internal saat memuat laporan ujian:", err);
    return {
      success: false,
      message: "Terjadi kesalahan internal saat memuat data laporan ujian.",
    };
  }
}

