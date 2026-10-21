"use server";

import { createServiceClient } from "@/lib/supabase/admin";
import { getAdminUser } from "@/actions/auth";
import {
  calculateExamSessionScores,
  type QuestionScoringItem,
  type SessionAnswerScoringItem,
} from "@/lib/exam/scoring";
import { revalidatePath } from "next/cache";

export interface ScoreExamSessionResult {
  success: boolean;
  totalScore?: number;
  awardedCount?: number;
  message?: string;
}

export interface RecalculateScoresResult {
  success: boolean;
  processedSessions: number;
  message: string;
}

/**
 * Mesin Penilaian Otomatis (ADM-SCOR-01) untuk satu sesi ujian
 * Mengalkulasi awarded_score tiap butir soal dan total_score sesi.
 */
export async function scoreExamSession(
  sessionId: string,
  preloadedQuestions?: QuestionScoringItem[]
): Promise<ScoreExamSessionResult> {
  try {
    const supabase = createServiceClient();

    const sessionTable = supabase.from("exam_sessions");
    if (!sessionTable || typeof sessionTable.select !== "function") {
      return {
        success: false,
        message: "Klien database tidak mendukung kueri sesi ujian.",
      };
    }

    // 1. Ambil data sesi ujian
    const { data: session, error: sessionError } = await sessionTable
      .select("id, exam_id, is_completed")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      console.error("Gagal menemukan sesi ujian untuk penilaian:", sessionError?.message);
      return {
        success: false,
        message: "Sesi ujian tidak ditemukan.",
      };
    }

    const examId = session.exam_id;

    // 2. Ambil butir soal (gunakan preloadedQuestions jika sudah tersedia untuk menghemat kueri)
    let questions: QuestionScoringItem[] = [];

    if (preloadedQuestions && preloadedQuestions.length > 0) {
      questions = preloadedQuestions;
    } else {
      const questionsTable = supabase.from("questions");
      if (!questionsTable || typeof questionsTable.select !== "function") {
        return {
          success: false,
          message: "Klien database tidak mendukung kueri butir soal.",
        };
      }

      const { data: questionsData, error: questionsError } = await questionsTable
        .select("id, question_type, points, correct_answer")
        .eq("exam_id", examId);

      if (questionsError || !questionsData) {
        console.error("Gagal mengambil butir soal untuk penilaian:", questionsError?.message);
        return {
          success: false,
          message: "Gagal memuat butir soal naskah ujian.",
        };
      }

      questions = questionsData.map((q) => ({
        id: q.id,
        question_type: q.question_type,
        points: Number(q.points) || 0,
        correct_answer: q.correct_answer,
      }));
    }

    // 3. Ambil seluruh lembar jawaban peserta yang tersimpan
    const answersTable = supabase.from("session_answers");
    if (!answersTable || typeof answersTable.select !== "function") {
      return {
        success: false,
        message: "Klien database tidak mendukung kueri lembar jawaban.",
      };
    }

    const { data: answersData, error: answersError } = await answersTable
      .select("question_id, answer_value, is_flagged")
      .eq("session_id", sessionId);

    if (answersError) {
      console.error("Gagal mengambil jawaban sesi ujian:", answersError.message);
      return {
        success: false,
        message: "Gagal memuat lembar jawaban sesi ujian.",
      };
    }

    const answers: SessionAnswerScoringItem[] = (answersData || []).map((a) => ({
      question_id: a.question_id,
      answer_value: a.answer_value,
    }));

    // 4. Kalkulasi perolehan skor menggunakan pure function scoring engine
    const calculation = calculateExamSessionScores(questions, answers);

    // 5. Simpan awarded_score untuk setiap butir soal
    const existingAnswersMap = new Map<string, { answer_value: unknown; is_flagged: boolean }>();
    for (const a of answersData || []) {
      existingAnswersMap.set(a.question_id, {
        answer_value: a.answer_value,
        is_flagged: a.is_flagged,
      });
    }

    const nowIso = new Date().toISOString();
    const upsertRows = questions.map((q) => {
      const existing = existingAnswersMap.get(q.id);
      return {
        session_id: sessionId,
        question_id: q.id,
        answer_value: existing ? (existing.answer_value as import("@/types/database").Json) : null,
        is_flagged: existing ? existing.is_flagged : false,
        awarded_score: calculation.awardedScores[q.id] ?? 0,
        last_updated_at: nowIso,
      };
    });

    if (upsertRows.length > 0) {
      const { error: upsertError } = await supabase
        .from("session_answers")
        .upsert(upsertRows, {
          onConflict: "session_id,question_id",
        });

      if (upsertError) {
        console.error("Gagal menyimpan awarded_score ke session_answers:", upsertError.message);
        return {
          success: false,
          message: "Gagal menyimpan rincian skor butir soal ke database.",
        };
      }
    }

    // 6. Simpan akumulasi total_score ke exam_sessions
    const { error: updateSessionError } = await supabase
      .from("exam_sessions")
      .update({
        total_score: calculation.totalScore,
      })
      .eq("id", sessionId);

    if (updateSessionError) {
      console.error("Gagal memperbarui total_score pada exam_sessions:", updateSessionError.message);
      return {
        success: false,
        message: "Gagal memperbarui total skor sesi ujian.",
      };
    }

    return {
      success: true,
      totalScore: calculation.totalScore,
      awardedCount: upsertRows.length,
      message: `Penilaian otomatis selesai. Total skor: ${calculation.totalScore}.`,
    };
  } catch (err) {
    console.error("Terjadi kesalahan internal saat penilaian otomatis sesi ujian:", err);
    return {
      success: false,
      message: "Terjadi kesalahan internal saat memproses penilaian sesi ujian.",
    };
  }
}

function revalidateScoringPaths(examId: string) {
  revalidatePath(`/admin/ujian/${examId}/soal`);
  revalidatePath(`/admin/ujian/${examId}/pengaturan`);
  revalidatePath(`/admin/ujian/${examId}/laporan`);
  revalidatePath(`/admin/ujian/${examId}/penilaian`);
  revalidatePath("/admin/dasbor");
}

/**
 * Server Action: Memicu kalkulasi ulang nilai seluruh sesi peserta yang telah selesai (is_completed = true)
 * Dipicu oleh Administrator ketika terjadi revisi kunci jawaban atau butir soal.
 * Menggunakan PostgreSQL RPC untuk latensi <150ms dengan Fallback Batch O(1) kueri di Node.js.
 */
export async function recalculateExamScoresAction(
  examId: string
): Promise<RecalculateScoresResult> {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return {
        success: false,
        processedSessions: 0,
        message: "Akses ditolak. Tindakan ini memerlukan otorisasi administrator.",
      };
    }

    const supabase = createServiceClient();

    // 1. Coba eksekusi melalui PostgreSQL Stored Procedure (RPC) jika tersedia di database
    try {
      if (typeof (supabase as unknown as { rpc?: unknown }).rpc === "function") {
        const { data: rpcData, error: rpcError } = await (supabase as unknown as {
          rpc: (fn: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
        }).rpc("recalculate_exam_scores_batch", { target_exam_id: examId });

        if (!rpcError && rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
          const processedCount = Number(rpcData[0]?.processed_sessions) || 0;
          revalidateScoringPaths(examId);
          return {
            success: true,
            processedSessions: processedCount,
            message: `Kalkulasi ulang nilai berhasil diproses untuk ${processedCount} sesi peserta (via Stored Procedure).`,
          };
        }
      }
    } catch {
      // Beralih ke Batch Query Fallback jika RPC tidak terpasang
    }

    // 2. Batch Query Fallback (Mengeliminasi N+1 loop kueri menjadi O(1) batch query)
    // Kueri 1: Ambil seluruh sesi ujian yang telah berstatus selesai
    const { data: sessions, error: sessionsError } = await supabase
      .from("exam_sessions")
      .select("id")
      .eq("exam_id", examId)
      .eq("is_completed", true);

    if (sessionsError) {
      console.error("Gagal mengambil daftar sesi untuk hitung ulang:", sessionsError.message);
      return {
        success: false,
        processedSessions: 0,
        message: "Gagal memuat sesi ujian untuk kalkulasi ulang.",
      };
    }

    const sessionList = sessions || [];
    if (sessionList.length === 0) {
      return {
        success: true,
        processedSessions: 0,
        message: "Tidak ada sesi ujian selesai yang perlu dihitung ulang.",
      };
    }

    // Kueri 2: Ambil seluruh butir soal ujian SATU KALI SAJA
    const { data: questionsData, error: questionsError } = await supabase
      .from("questions")
      .select("id, question_type, points, correct_answer")
      .eq("exam_id", examId);

    if (questionsError || !questionsData) {
      return {
        success: false,
        processedSessions: 0,
        message: "Gagal memuat butir soal naskah ujian.",
      };
    }

    const questions: QuestionScoringItem[] = questionsData.map((q) => ({
      id: q.id,
      question_type: q.question_type,
      points: Number(q.points) || 0,
      correct_answer: q.correct_answer,
    }));

    // Kueri 3: Ambil seluruh lembar jawaban untuk seluruh sesi sekaligus
    const sessionIds = sessionList.map((s) => s.id);
    const answersTable = supabase.from("session_answers");
    const { data: answersData, error: answersError } = await answersTable
      .select("session_id, question_id, answer_value, is_flagged, awarded_score")
      .in("session_id", sessionIds);

    if (answersError) {
      return {
        success: false,
        processedSessions: 0,
        message: "Gagal memuat lembar jawaban sesi peserta.",
      };
    }

    // Kelompokkan jawaban berdasarkan session_id
    const answersBySession = new Map<string, SessionAnswerScoringItem[]>();
    const rawAnswersBySession = new Map<
      string,
      Map<string, { answer_value: unknown; is_flagged: boolean; awarded_score: number | null }>
    >();

    for (const ans of answersData || []) {
      if (!answersBySession.has(ans.session_id)) {
        answersBySession.set(ans.session_id, []);
        rawAnswersBySession.set(ans.session_id, new Map());
      }
      answersBySession.get(ans.session_id)!.push({
        question_id: ans.question_id,
        answer_value: ans.answer_value,
      });
      rawAnswersBySession.get(ans.session_id)!.set(ans.question_id, {
        answer_value: ans.answer_value,
        is_flagged: ans.is_flagged,
        awarded_score: ans.awarded_score,
      });
    }

    const nowIso = new Date().toISOString();
    const allUpsertRows: Array<{
      session_id: string;
      question_id: string;
      answer_value: import("@/types/database").Json;
      is_flagged: boolean;
      awarded_score: number;
      last_updated_at: string;
    }> = [];

    let successCount = 0;

    for (const s of sessionList) {
      const sessionAnswers = answersBySession.get(s.id) || [];
      const rawMap = rawAnswersBySession.get(s.id) || new Map();
      const calculation = calculateExamSessionScores(questions, sessionAnswers);

      for (const q of questions) {
        const raw = rawMap.get(q.id);
        allUpsertRows.push({
          session_id: s.id,
          question_id: q.id,
          answer_value: raw ? (raw.answer_value as import("@/types/database").Json) : null,
          is_flagged: raw ? raw.is_flagged : false,
          awarded_score: calculation.awardedScores[q.id] ?? 0,
          last_updated_at: nowIso,
        });
      }

      await supabase
        .from("exam_sessions")
        .update({
          total_score: calculation.totalScore,
        })
        .eq("id", s.id);

      successCount++;
    }

    // Batch upsert seluruh nilai jawaban dalam 1 operasi
    if (allUpsertRows.length > 0) {
      await answersTable.upsert(allUpsertRows, {
        onConflict: "session_id,question_id",
      });
    }

    revalidateScoringPaths(examId);

    return {
      success: true,
      processedSessions: successCount,
      message: `Kalkulasi ulang nilai berhasil diproses untuk ${successCount} dari ${sessionList.length} sesi peserta.`,
    };
  } catch (err) {
    console.error("Kesalahan internal saat memproses kalkulasi ulang nilai ujian:", err);
    return {
      success: false,
      processedSessions: 0,
      message: "Terjadi kesalahan internal saat kalkulasi ulang nilai.",
    };
  }
}

/**
 * Server Action: Memicu kalkulasi ulang nilai untuk sesi tertentu oleh Administrator
 */
export async function recalculateSessionScoreAction(
  sessionId: string
): Promise<ScoreExamSessionResult> {
  const admin = await getAdminUser();
  if (!admin) {
    return {
      success: false,
      message: "Akses ditolak. Tindakan ini memerlukan otorisasi administrator.",
    };
  }

  return await scoreExamSession(sessionId);
}

