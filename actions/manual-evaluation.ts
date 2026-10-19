"use server";

import { createServiceClient } from "@/lib/supabase/admin";
import { getAdminUser } from "@/actions/auth";
import {
  roundToTwoDecimals,
  extractShortAnswer,
} from "@/lib/exam/scoring";
import type { ExamRow, QuestionRow } from "@/types/database";
import { revalidatePath } from "next/cache";

export interface ManualEvaluationSubmission {
  sessionId: string;
  studentName: string;
  studentClass: string;
  isCompleted: boolean;
  submittedAt: string | null;
  questionId: string;
  questionOrderIndex: number;
  questionPrompt: string;
  questionPoints: number;
  correctAnswer: unknown;
  answerId: string | null;
  studentAnswerText: string | null;
  awardedScore: number | null;
  sessionTotalScore: number | null;
}

export interface ManualEvaluationDataResult {
  success: boolean;
  message?: string;
  exam?: ExamRow;
  questions?: QuestionRow[];
  submissions?: ManualEvaluationSubmission[];
}

export interface UpdateManualScoreInput {
  sessionId: string;
  questionId: string;
  score: number;
}

export interface UpdateManualScoreResult {
  success: boolean;
  message: string;
  awardedScore?: number;
  sessionTotalScore?: number;
}

/**
 * Mengambil data evaluasi manual butir soal isian singkat / esai (short_answer)
 */
export async function getManualEvaluationData(
  examId: string
): Promise<ManualEvaluationDataResult> {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return {
        success: false,
        message: "Akses ditolak. Silakan masuk sebagai administrator.",
      };
    }

    const supabase = createServiceClient();

    // 1. Ambil detail naskah ujian
    const examTable = supabase.from("exams");
    if (!examTable || typeof examTable.select !== "function") {
      return { success: false, message: "Klien database tidak mendukung kueri ujian." };
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

    // 2. Ambil seluruh butir soal bertipe short_answer
    const questionsTable = supabase.from("questions");
    if (!questionsTable || typeof questionsTable.select !== "function") {
      return { success: false, message: "Klien database tidak mendukung kueri soal." };
    }

    const { data: questionsData, error: questionsError } = await questionsTable
      .select("*")
      .eq("exam_id", examId)
      .eq("question_type", "short_answer")
      .order("order_index", { ascending: true });

    if (questionsError) {
      console.error("Gagal mengambil soal isian untuk penilaian:", questionsError.message);
      return {
        success: false,
        message: "Gagal memuat butir soal isian naskah ujian.",
      };
    }

    const questions = (questionsData || []) as QuestionRow[];

    // Jika tidak ada soal isian dalam ujian ini, kembalikan daftar kosong
    if (questions.length === 0) {
      return {
        success: true,
        exam: exam as ExamRow,
        questions: [],
        submissions: [],
      };
    }

    // 3. Ambil seluruh sesi ujian siswa pada ujian ini
    const sessionTable = supabase.from("exam_sessions");
    if (!sessionTable || typeof sessionTable.select !== "function") {
      return { success: false, message: "Klien database tidak mendukung kueri sesi." };
    }

    const { data: sessionsData, error: sessionsError } = await sessionTable
      .select("id, student_name, student_class, is_completed, submitted_at, total_score")
      .eq("exam_id", examId)
      .order("student_name", { ascending: true });

    if (sessionsError) {
      console.error("Gagal mengambil sesi peserta untuk penilaian:", sessionsError.message);
      return {
        success: false,
        message: "Gagal memuat sesi peserta ujian.",
      };
    }

    const sessions = sessionsData || [];
    const sessionIds = sessions.map((s) => s.id);
    const questionIds = questions.map((q) => q.id);

    // 4. Ambil seluruh session_answers yang relevan
    let answersData: Array<{
      id: string;
      session_id: string;
      question_id: string;
      answer_value: unknown;
      awarded_score: number | null;
    }> = [];

    if (sessionIds.length > 0 && questionIds.length > 0) {
      const answersTable = supabase.from("session_answers");
      if (answersTable && typeof answersTable.select === "function") {
        const { data: rawAnswers, error: answersError } = await answersTable
          .select("id, session_id, question_id, answer_value, awarded_score")
          .in("session_id", sessionIds)
          .in("question_id", questionIds);

        if (!answersError && rawAnswers) {
          answersData = rawAnswers;
        }
      }
    }

    // 5. Petakan jawaban siswa per soal ke dalam array submissions
    const answerLookup = new Map<string, {
      id: string;
      answer_value: unknown;
      awarded_score: number | null;
    }>();

    for (const ans of answersData) {
      const key = `${ans.session_id}_${ans.question_id}`;
      answerLookup.set(key, ans);
    }

    const submissions: ManualEvaluationSubmission[] = [];

    for (const session of sessions) {
      for (const question of questions) {
        const key = `${session.id}_${question.id}`;
        const matched = answerLookup.get(key);
        const textVal = matched ? extractShortAnswer(matched.answer_value) : null;

        submissions.push({
          sessionId: session.id,
          studentName: session.student_name,
          studentClass: session.student_class,
          isCompleted: session.is_completed,
          submittedAt: session.submitted_at,
          questionId: question.id,
          questionOrderIndex: question.order_index,
          questionPrompt: question.prompt,
          questionPoints: Number(question.points) || 0,
          correctAnswer: question.correct_answer,
          answerId: matched ? matched.id : null,
          studentAnswerText: textVal,
          awardedScore: matched && matched.awarded_score !== null ? Number(matched.awarded_score) : null,
          sessionTotalScore: session.total_score !== null ? Number(session.total_score) : null,
        });
      }
    }

    return {
      success: true,
      exam: exam as ExamRow,
      questions,
      submissions,
    };
  } catch (err) {
    console.error("Kesalahan internal saat memuat data penilaian manual:", err);
    return {
      success: false,
      message: "Terjadi kesalahan internal saat memuat data penilaian manual.",
    };
  }
}

/**
 * Server Action: Menyimpan nilai manual untuk butir soal isian dan menghitung ulang total_score sesi
 */
export async function updateManualScoreAction(
  payload: UpdateManualScoreInput
): Promise<UpdateManualScoreResult> {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return {
        success: false,
        message: "Akses ditolak. Tindakan ini memerlukan otorisasi administrator.",
      };
    }

    const { sessionId, questionId, score } = payload;

    if (typeof score !== "number" || isNaN(score) || score < 0) {
      return {
        success: false,
        message: "Nilai perolehan harus berupa angka lebih besar atau sama dengan 0.",
      };
    }

    const supabase = createServiceClient();

    // 1. Ambil detail butir soal untuk memastikan batas maksimal poin
    const questionsTable = supabase.from("questions");
    const { data: question, error: questionError } = await questionsTable
      .select("id, exam_id, points")
      .eq("id", questionId)
      .single();

    if (questionError || !question) {
      return {
        success: false,
        message: "Butir soal tidak ditemukan.",
      };
    }

    const maxPoints = Number(question.points) || 0;
    if (score > maxPoints) {
      return {
        success: false,
        message: `Nilai perolehan (${score}) tidak boleh melebihi bobot maksimal butir soal (${maxPoints} poin).`,
      };
    }

    const roundedScore = roundToTwoDecimals(score);
    const nowIso = new Date().toISOString();

    // 2. Ambil session_answers yang ada saat ini
    const answersTable = supabase.from("session_answers");
    const { data: existingAnswer } = await answersTable
      .select("id, answer_value, is_flagged")
      .eq("session_id", sessionId)
      .eq("question_id", questionId)
      .maybeSingle();

    // 3. Upsert session_answers dengan nilai baru
    const { error: upsertError } = await answersTable.upsert(
      {
        session_id: sessionId,
        question_id: questionId,
        answer_value: existingAnswer ? existingAnswer.answer_value : null,
        is_flagged: existingAnswer ? existingAnswer.is_flagged : false,
        awarded_score: roundedScore,
        last_updated_at: nowIso,
      },
      {
        onConflict: "session_id,question_id",
      }
    );

    if (upsertError) {
      console.error("Gagal memperbarui awarded_score pada session_answers:", upsertError.message);
      return {
        success: false,
        message: "Gagal menyimpan nilai butir soal ke database.",
      };
    }

    // 4. Hitung ulang total_score untuk sesi tersebut
    const { data: allAnswers, error: allAnswersError } = await answersTable
      .select("awarded_score")
      .eq("session_id", sessionId);

    let totalScore = 0;
    if (!allAnswersError && allAnswers) {
      for (const ans of allAnswers) {
        totalScore += Number(ans.awarded_score) || 0;
      }
    }
    const roundedTotalScore = roundToTwoDecimals(totalScore);

    // 5. Perbarui total_score pada exam_sessions
    const sessionTable = supabase.from("exam_sessions");
    const { error: sessionUpdateError } = await sessionTable
      .update({
        total_score: roundedTotalScore,
      })
      .eq("id", sessionId);

    if (sessionUpdateError) {
      console.error("Gagal memperbarui total_score pada exam_sessions:", sessionUpdateError.message);
      return {
        success: false,
        message: "Nilai butir soal tersimpan, namun gagal memperbarui akumulasi total nilai sesi.",
      };
    }

    revalidatePath(`/admin/ujian/${question.exam_id}/penilaian`);
    revalidatePath(`/admin/ujian/${question.exam_id}/laporan`);
    revalidatePath("/admin/dasbor");

    return {
      success: true,
      message: `Nilai berhasil disimpan. Total nilai sesi kini: ${roundedTotalScore}.`,
      awardedScore: roundedScore,
      sessionTotalScore: roundedTotalScore,
    };
  } catch (err) {
    console.error("Kesalahan internal saat pembaruan nilai manual:", err);
    return {
      success: false,
      message: "Terjadi kesalahan internal saat memperbarui nilai.",
    };
  }
}

