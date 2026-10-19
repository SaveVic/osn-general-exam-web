"use server";

import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/admin";
import { generateSessionToken, hashSessionToken, verifySessionToken } from "@/lib/security/session-token";
import {
  startExamSessionSchema,
  syncBatchAnswersSchema,
  type StartExamSessionInput,
  type SyncBatchAnswersInput,
} from "@/lib/validations/session";
import type { ExamRow, ExamSessionRow, Json, QuestionType, ReferralCodeRow } from "@/types/database";

export interface ClientQuestionItem {
  id: string;
  exam_id: string;
  order_index: number;
  question_type: QuestionType;
  prompt: string;
  options: Json;
  points: number;
}

export interface StartExamSessionResult {
  success: boolean;
  message?: string;
  data?: {
    sessionId: string;
    examId: string;
    examTitle: string;
    durationMinutes: number;
    startedAt: string;
    serverEndTime: string;
    serverTime?: string;
    studentName: string;
    studentClass: string;
    questions: ClientQuestionItem[];
  };
}

type ReferralCodeWithExam = ReferralCodeRow & {
  exams: ExamRow | null;
};

/**
 * Server Action untuk memulai sesi ujian peserta secara aman
 */
export async function startExamSessionAction(
  payload: StartExamSessionInput
): Promise<StartExamSessionResult> {
  const parseResult = startExamSessionSchema.safeParse(payload);
  if (!parseResult.success) {
    const errorMsg =
      Object.values(parseResult.error.flatten().fieldErrors)[0]?.[0] ||
      "Data formulir peserta tidak valid.";
    return {
      success: false,
      message: errorMsg,
    };
  }

  const { referralCode, studentName, studentClass } = parseResult.data;

  try {
    const supabase = createServiceClient();
    const now = new Date();

    // 1. Ambil dan validasi kode rujukan beserta naskah ujian
    const { data: refData, error: refError } = await supabase
      .from("referral_codes")
      .select("*, exams(*)")
      .eq("code", referralCode)
      .maybeSingle();

    if (refError || !refData) {
      return {
        success: false,
        message: "Kode rujukan tidak valid atau tidak ditemukan pada sistem.",
      };
    }

    const referral = refData as unknown as ReferralCodeWithExam;

    // 2. Cek status keaktifan kode
    if (!referral.is_active) {
      return {
        success: false,
        message: "Kode rujukan telah dinonaktifkan oleh pengawas ujian.",
      };
    }

    // 3. Cek masa kedaluwarsa kode rujukan
    if (referral.expires_at && now > new Date(referral.expires_at)) {
      return {
        success: false,
        message: "Masa berlaku kode rujukan telah kedaluwarsa.",
      };
    }

    // 4. Cek batas kuota penggunaan
    if (referral.max_uses !== null && referral.current_uses >= referral.max_uses) {
      return {
        success: false,
        message: "Batas kuota penggunaan untuk kode rujukan ini telah habis.",
      };
    }

    const exam = referral.exams;
    if (!exam || !exam.is_published) {
      return {
        success: false,
        message: "Naskah ujian belum dipublikasikan atau sedang ditutup.",
      };
    }

    // 5. Cek rentang waktu pengerjaan naskah ujian
    const startMs = new Date(exam.starts_at).getTime();
    const endMs = new Date(exam.ends_at).getTime();
    const nowMs = now.getTime();

    if (nowMs < startMs) {
      return {
        success: false,
        message: "Jadwal pelaksanaan naskah ujian ini belum dimulai.",
      };
    }

    if (nowMs > endMs) {
      return {
        success: false,
        message: "Jadwal pelaksanaan naskah ujian ini telah resmi berakhir.",
      };
    }

    // 6. Hitung batas akhir pengerjaan sesi (serverEndTime)
    // Sesi berakhir pada waktu mulai + durasi ujian, namun TIDAK boleh melebihi batas resmi ends_at ujian
    const durationMs = exam.duration_minutes * 60 * 1000;
    const sessionEndMs = Math.min(nowMs + durationMs, endMs);
    const serverEndTime = new Date(sessionEndMs).toISOString();

    // 7. Terbitkan token sesi acak aman & hitung hash untuk database
    const rawToken = generateSessionToken();
    const tokenHash = hashSessionToken(rawToken);

    // 8. Catat sesi ujian baru ke tabel exam_sessions
    const { data: sessionData, error: sessionError } = await supabase
      .from("exam_sessions")
      .insert({
        exam_id: exam.id,
        referral_code_id: referral.id,
        student_name: studentName,
        student_class: studentClass,
        started_at: now.toISOString(),
        is_completed: false,
        session_token_hash: tokenHash,
      })
      .select()
      .single();

    if (sessionError || !sessionData) {
      console.error("Gagal membuat sesi ujian:", sessionError?.message);
      return {
        success: false,
        message: "Gagal membuat sesi pengerjaan ujian. Silakan coba kembali.",
      };
    }

    const session = sessionData as ExamSessionRow;

    // 9. Tambah kuota terpakai pada referral_codes
    await supabase
      .from("referral_codes")
      .update({ current_uses: referral.current_uses + 1 })
      .eq("id", referral.id);

    // 10. Ambil daftar butir soal tanpa kunci jawaban (CRUCIAL SECURITY FILTER)
    const { data: questionsData, error: questionsError } = await supabase
      .from("questions")
      .select("id, exam_id, order_index, question_type, prompt, options, points")
      .eq("exam_id", exam.id)
      .order("order_index", { ascending: true });

    if (questionsError) {
      console.error("Gagal mengambil butir soal:", questionsError.message);
      return {
        success: false,
        message: "Terjadi kesalahan saat memuat lembar soal ujian.",
      };
    }

    // 11. Pasang HTTP-Only Cookie exam_token pada peramban siswa
    const cookieStore = await cookies();
    const maxAgeSeconds = Math.max(
      3600,
      Math.ceil((sessionEndMs - nowMs) / 1000) + 1800
    );

    cookieStore.set("exam_token", rawToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: maxAgeSeconds,
    });

    return {
      success: true,
      data: {
        sessionId: session.id,
        examId: exam.id,
        examTitle: exam.title,
        durationMinutes: exam.duration_minutes,
        startedAt: session.started_at,
        serverEndTime,
        serverTime: now.toISOString(),
        studentName,
        studentClass,
        questions: (questionsData || []) as ClientQuestionItem[],
      },
    };
  } catch (err) {
    console.error("Kesalahan internal saat memulai sesi:", err);
    return {
      success: false,
      message: "Terjadi kesalahan internal sistem saat menginisialisasi sesi ujian.",
    };
  }
}

export interface VerifySessionAuthResult {
  valid: boolean;
  message?: string;
  session?: ExamSessionRow;
  exam?: ExamRow;
}

/**
 * Memverifikasi keabsahan sesi ujian aktif dari cookie HTTP-only di Server Component
 */
export async function verifyActiveSessionAction(
  sessionId: string
): Promise<VerifySessionAuthResult> {
  try {
    const cookieStore = await cookies();
    const examToken = cookieStore.get("exam_token")?.value;

    if (!examToken) {
      return {
        valid: false,
        message: "Token autentikasi sesi ujian tidak ditemukan pada peramban.",
      };
    }

    const supabase = createServiceClient();
    const { data: session, error } = await supabase
      .from("exam_sessions")
      .select("*, exams(*)")
      .eq("id", sessionId)
      .maybeSingle();

    if (error || !session) {
      return {
        valid: false,
        message: "Sesi ujian tidak ditemukan pada sistem.",
      };
    }

    const sessionRow = session as ExamSessionRow & { exams: ExamRow | null };

    // Cek kecocokan hash token
    const isTokenMatch = verifySessionToken(examToken, sessionRow.session_token_hash);
    if (!isTokenMatch) {
      return {
        valid: false,
        message: "Token autentikasi sesi tidak cocok dengan catatan sistem.",
      };
    }

    if (sessionRow.is_completed) {
      return {
        valid: false,
        message: "Sesi ujian ini telah diselesaikan.",
        session: sessionRow,
      };
    }

    return {
      valid: true,
      session: sessionRow,
      exam: sessionRow.exams || undefined,
    };
  } catch (err) {
    console.error("Gagal memverifikasi sesi:", err);
    return {
      valid: false,
      message: "Terjadi gangguan sistem saat memverifikasi sesi pengerjaan ujian.",
    };
  }
}

export interface SyncBatchAnswersResult {
  success: boolean;
  message?: string;
  syncedAt?: string;
  syncedCount?: number;
}

const NETWORK_GRACE_PERIOD_MS = 60 * 1000; // 60 detik toleransi keterlambatan jaringan

/**
 * Server Action F4-01 (EXM-SYNC-01):
 * Menyinkronkan selisih jawaban siswa (batch diff) ke tabel session_answers melalui operasi UPSERT.
 */
export async function syncBatchAnswersAction(
  payload: SyncBatchAnswersInput
): Promise<SyncBatchAnswersResult> {
  const parseResult = syncBatchAnswersSchema.safeParse(payload);
  if (!parseResult.success) {
    const errorMsg =
      Object.values(parseResult.error.flatten().fieldErrors)[0]?.[0] ||
      "Data sinkronisasi jawaban tidak valid.";
    return {
      success: false,
      message: errorMsg,
    };
  }

  const { sessionId, answers } = parseResult.data;

  try {
    // 1. Verifikasi keabsahan sesi aktif dan kecocokan token cookie HTTP-only
    const authResult = await verifyActiveSessionAction(sessionId);
    if (!authResult.valid || !authResult.session) {
      return {
        success: false,
        message: authResult.message || "Sesi pengerjaan tidak sah atau telah ditutup.",
      };
    }

    const { session, exam } = authResult;
    const now = new Date();
    const nowMs = now.getTime();

    // 2. Verifikasi otoritas waktu server dengan toleransi keterlambatan jaringan 60 detik
    if (exam) {
      const startedMs = new Date(session.started_at).getTime();
      const durationMs = exam.duration_minutes * 60 * 1000;
      const examEndMs = new Date(exam.ends_at).getTime();
      const deadlineMs = Math.min(startedMs + durationMs, examEndMs);

      if (nowMs > deadlineMs + NETWORK_GRACE_PERIOD_MS) {
        return {
          success: false,
          message: "Batas waktu pengerjaan ujian telah berakhir.",
        };
      }
    }

    // 3. Lakukan operasi UPSERT batch ke tabel session_answers
    const supabase = createServiceClient();
    const nowIso = now.toISOString();

    const upsertRows = answers.map((item) => ({
      session_id: sessionId,
      question_id: item.questionId,
      answer_value: item.answerValue ?? null,
      is_flagged: Boolean(item.isFlagged),
      last_updated_at: nowIso,
    }));

    const { error: upsertError } = await supabase
      .from("session_answers")
      .upsert(upsertRows, {
        onConflict: "session_id,question_id",
      });

    if (upsertError) {
      console.error("Gagal menyinkronkan jawaban ke database:", upsertError.message);
      return {
        success: false,
        message: "Gagal menyinkronkan jawaban ke server. Data tetap aman di perangkat Anda.",
      };
    }

    return {
      success: true,
      syncedAt: nowIso,
      syncedCount: upsertRows.length,
    };
  } catch (err) {
    console.error("Kesalahan internal saat sinkronisasi jawaban:", err);
    return {
      success: false,
      message: "Terjadi gangguan jaringan saat menyinkronkan jawaban.",
    };
  }
}

export { syncBatchAnswersAction as syncBatchAnswers };

export interface RecoverExamSessionData {
  sessionId: string;
  examId: string;
  examTitle: string;
  durationMinutes: number;
  startedAt: string;
  serverEndTime: string;
  serverTime: string;
  studentName: string;
  studentClass: string;
  questions: ClientQuestionItem[];
  recoveredAnswersMap: Record<string, Json>;
  recoveredFlaggedMap: Record<string, boolean>;
  lastSyncedAt: string | null;
}

export interface RecoverExamSessionResult {
  success: boolean;
  message?: string;
  isCompleted?: boolean;
  data?: RecoverExamSessionData;
}

/**
 * Server Action F4-02 (EXM-RECV-01):
 * Memulihkan kondisi pengerjaan peserta dari database Supabase (questions & session_answers)
 * setelah tab browser tertutup, reload, atau perangkat mati mendadak.
 */
export async function recoverExamSessionAction(
  sessionId: string
): Promise<RecoverExamSessionResult> {
  try {
    const authResult = await verifyActiveSessionAction(sessionId);
    if (!authResult.valid || !authResult.session) {
      return {
        success: false,
        message: authResult.message || "Sesi ujian tidak valid atau token tidak cocok.",
        isCompleted: authResult.session?.is_completed,
      };
    }

    const { session, exam } = authResult;
    const now = new Date();
    const nowIso = now.toISOString();

    const startedMs = new Date(session.started_at).getTime();
    const durationMs = (exam?.duration_minutes ?? 90) * 60 * 1000;
    const examEndMs = exam ? new Date(exam.ends_at).getTime() : startedMs + durationMs;
    const serverEndTime = new Date(Math.min(startedMs + durationMs, examEndMs)).toISOString();

    const supabase = createServiceClient();

    // 1. Ambil daftar butir soal tanpa kunci jawaban (CRUCIAL SECURITY FILTER)
    const { data: questionsData, error: questionsError } = await supabase
      .from("questions")
      .select("id, exam_id, order_index, question_type, prompt, options, points")
      .eq("exam_id", session.exam_id)
      .order("order_index", { ascending: true });

    if (questionsError) {
      console.error("Gagal mengambil butir soal saat pemulihan sesi:", questionsError.message);
      return {
        success: false,
        message: "Terjadi kesalahan saat memulihkan lembar soal ujian.",
      };
    }

    // 2. Ambil seluruh jawaban dan status flag yang telah tersinkronisasi di session_answers
    const { data: answersData, error: answersError } = await supabase
      .from("session_answers")
      .select("question_id, answer_value, is_flagged, last_updated_at")
      .eq("session_id", sessionId);

    if (answersError) {
      console.error("Gagal mengambil session_answers saat pemulihan sesi:", answersError.message);
      return {
        success: false,
        message: "Terjadi kesalahan saat memulihkan jawaban tersimpan.",
      };
    }

    const recoveredAnswersMap: Record<string, Json> = {};
    const recoveredFlaggedMap: Record<string, boolean> = {};
    let latestSyncedAt: string | null = null;

    if (Array.isArray(answersData)) {
      for (const row of answersData) {
        if (row.answer_value !== null && row.answer_value !== undefined) {
          recoveredAnswersMap[row.question_id] = row.answer_value as Json;
        }
        if (row.is_flagged) {
          recoveredFlaggedMap[row.question_id] = true;
        }
        if (row.last_updated_at) {
          if (!latestSyncedAt || new Date(row.last_updated_at).getTime() > new Date(latestSyncedAt).getTime()) {
            latestSyncedAt = row.last_updated_at;
          }
        }
      }
    }

    return {
      success: true,
      data: {
        sessionId: session.id,
        examId: session.exam_id,
        examTitle: exam?.title ?? "Ujian",
        durationMinutes: exam?.duration_minutes ?? 90,
        startedAt: session.started_at,
        serverEndTime,
        serverTime: nowIso,
        studentName: session.student_name,
        studentClass: session.student_class,
        questions: (questionsData || []) as ClientQuestionItem[],
        recoveredAnswersMap,
        recoveredFlaggedMap,
        lastSyncedAt: latestSyncedAt,
      },
    };
  } catch (err) {
    console.error("Kesalahan internal saat memulihkan sesi ujian:", err);
    return {
      success: false,
      message: "Terjadi kesalahan sistem saat memulihkan sesi ujian.",
    };
  }
}

export { recoverExamSessionAction as recoverExamSession };


