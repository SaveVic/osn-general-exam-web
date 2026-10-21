"use server";

import { createServiceClient } from "@/lib/supabase/admin";
import { getAdminUser } from "@/actions/auth";
import { roundToTwoDecimals } from "@/lib/exam/scoring";
import {
  formatAnswerForCsv,
  type ExamReportSessionRow,
  type StudentFullAnswerRow,
} from "@/lib/exam/report-csv";
import type { ExamRow } from "@/types/database";

export interface ExamReportDataResult {
  success: boolean;
  message?: string;
  exam?: ExamRow;
  maxPossibleScore?: number;
  sessions?: ExamReportSessionRow[];
}

export interface QuestionAnswerDetailItem {
  questionId: string;
  orderIndex: number;
  promptPreview: string;
  questionType: string;
  points: number;
  awardedScore: number | null;
  studentAnswer: unknown;
  formattedStudentAnswer: string;
  correctAnswer: unknown;
  formattedCorrectAnswer: string;
  isCorrect: boolean | null;
  isFlagged: boolean;
}

export interface SessionAnswerDetailsResult {
  success: boolean;
  message?: string;
  session?: {
    id: string;
    studentName: string;
    studentClass: string;
    totalScore: number | null;
    isCompleted: boolean;
    startedAt: string;
    submittedAt: string | null;
  };
  exam?: {
    id: string;
    title: string;
  };
  questions?: QuestionAnswerDetailItem[];
}

export interface ExamFullAnswersReportResult {
  success: boolean;
  message?: string;
  examTitle?: string;
  questionsCount?: number;
  rows?: StudentFullAnswerRow[];
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

/**
 * Server Action: Mengambil rincian lembar jawaban siswa per butir soal (kunci vs jawaban siswa)
 */
export async function getSessionAnswerDetailsAction(
  sessionId: string
): Promise<SessionAnswerDetailsResult> {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return {
        success: false,
        message: "Akses ditolak. Silakan masuk sebagai administrator.",
      };
    }

    const supabase = createServiceClient();

    // 1. Ambil data sesi peserta beserta relasi naskah ujian
    const { data: sessionData, error: sessionError } = await supabase
      .from("exam_sessions")
      .select("id, exam_id, student_name, student_class, total_score, is_completed, started_at, submitted_at, exams(*)")
      .eq("id", sessionId)
      .single();

    if (sessionError || !sessionData) {
      return {
        success: false,
        message: "Sesi ujian peserta tidak ditemukan.",
      };
    }

    const examId = sessionData.exam_id;
    const exam = sessionData.exams as unknown as ExamRow | null;

    // 2. Ambil seluruh butir soal naskah ujian
    const { data: questionsData, error: questionsError } = await supabase
      .from("questions")
      .select("id, exam_id, order_index, question_type, prompt, points, correct_answer, options")
      .eq("exam_id", examId)
      .order("order_index", { ascending: true });

    if (questionsError || !questionsData) {
      return {
        success: false,
        message: "Gagal memuat butir soal ujian.",
      };
    }

    // 3. Ambil seluruh lembar jawaban sesi peserta
    const { data: answersData, error: answersError } = await supabase
      .from("session_answers")
      .select("question_id, answer_value, is_flagged, awarded_score")
      .eq("session_id", sessionId);

    if (answersError) {
      return {
        success: false,
        message: "Gagal memuat lembar jawaban peserta.",
      };
    }

    const answersMap = new Map<
      string,
      { answer_value: unknown; is_flagged: boolean; awarded_score: number | null }
    >();
    for (const a of answersData || []) {
      answersMap.set(a.question_id, a);
    }

    const items: QuestionAnswerDetailItem[] = questionsData.map((q) => {
      const ans = answersMap.get(q.id);
      const studentAnswer = ans ? ans.answer_value : null;
      const isFlagged = ans ? Boolean(ans.is_flagged) : false;
      const awardedScore =
        ans?.awarded_score !== undefined && ans?.awarded_score !== null
          ? Number(ans.awarded_score)
          : null;

      const formattedStudent = formatAnswerForCsv(
        q.question_type,
        q.options,
        studentAnswer,
        true
      );
      const formattedCorrect = formatAnswerForCsv(
        q.question_type,
        q.options,
        q.correct_answer,
        true
      );

      // Status penilaian
      let isCorrect: boolean | null = null;
      if (
        studentAnswer === null ||
        studentAnswer === undefined ||
        studentAnswer === "" ||
        (Array.isArray(studentAnswer) && studentAnswer.length === 0)
      ) {
        isCorrect = null; // Tidak dijawab
      } else if (awardedScore !== null) {
        isCorrect = awardedScore > 0;
      } else {
        isCorrect = formattedStudent.toLowerCase() === formattedCorrect.toLowerCase();
      }

      // Potong preview prompt maksimal 120 karakter
      const cleanPrompt = (q.prompt || "").replace(/\s+/g, " ").trim();
      const promptPreview =
        cleanPrompt.length > 120 ? `${cleanPrompt.slice(0, 120)}...` : cleanPrompt;

      return {
        questionId: q.id,
        orderIndex: q.order_index,
        promptPreview: promptPreview || "(Tanpa deskripsi soal)",
        questionType: q.question_type,
        points: Number(q.points) || 0,
        awardedScore,
        studentAnswer,
        formattedStudentAnswer: formattedStudent,
        correctAnswer: q.correct_answer,
        formattedCorrectAnswer: formattedCorrect,
        isCorrect,
        isFlagged,
      };
    });

    return {
      success: true,
      session: {
        id: sessionData.id,
        studentName: sessionData.student_name,
        studentClass: sessionData.student_class,
        totalScore:
          sessionData.total_score !== null ? Number(sessionData.total_score) : null,
        isCompleted: Boolean(sessionData.is_completed),
        startedAt: sessionData.started_at,
        submittedAt: sessionData.submitted_at ?? null,
      },
      exam: {
        id: examId,
        title: exam?.title || "Ujian",
      },
      questions: items,
    };
  } catch (err) {
    console.error("Gagal mengambil detail jawaban peserta:", err);
    return {
      success: false,
      message: "Terjadi gangguan saat memuat lembar jawaban peserta.",
    };
  }
}

/**
 * Server Action: Mengambil data jawaban lengkap seluruh siswa untuk ekspor CSV
 */
export async function getExamFullAnswersReportAction(
  examId: string
): Promise<ExamFullAnswersReportResult> {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return {
        success: false,
        message: "Akses ditolak. Silakan masuk sebagai administrator.",
      };
    }

    const supabase = createServiceClient();

    // 1. Ambil judul naskah ujian
    const { data: exam } = await supabase
      .from("exams")
      .select("title")
      .eq("id", examId)
      .single();

    // 2. Ambil daftar soal terurut
    const { data: questionsData, error: questionsError } = await supabase
      .from("questions")
      .select("id, order_index, question_type, options")
      .eq("exam_id", examId)
      .order("order_index", { ascending: true });

    if (questionsError || !questionsData) {
      return {
        success: false,
        message: "Gagal memuat butir soal ujian.",
      };
    }

    // 3. Ambil seluruh sesi peserta
    const { data: sessionsData, error: sessionsError } = await supabase
      .from("exam_sessions")
      .select("id, student_name, student_class, total_score, is_completed")
      .eq("exam_id", examId)
      .order("started_at", { ascending: true });

    if (sessionsError || !sessionsData) {
      return {
        success: false,
        message: "Gagal memuat sesi peserta ujian.",
      };
    }

    // 4. Ambil seluruh jawaban untuk seluruh sesi sekaligus
    const sessionIds = sessionsData.map((s) => s.id);
    let answersData: Array<{ session_id: string; question_id: string; answer_value: unknown }> = [];

    if (sessionIds.length > 0) {
      const { data: answers } = await supabase
        .from("session_answers")
        .select("session_id, question_id, answer_value")
        .in("session_id", sessionIds);
      if (answers) {
        answersData = answers;
      }
    }

    // Petakan jawaban per session_id dan question_id
    const answersBySession = new Map<string, Map<string, unknown>>();
    for (const ans of answersData) {
      if (!answersBySession.has(ans.session_id)) {
        answersBySession.set(ans.session_id, new Map());
      }
      answersBySession.get(ans.session_id)!.set(ans.question_id, ans.answer_value);
    }

    const rows: StudentFullAnswerRow[] = sessionsData.map((session) => {
      const sessionMap = answersBySession.get(session.id);
      const answers: Record<number, string> = {};

      questionsData.forEach((q, idx) => {
        const orderNumber = idx + 1;
        const rawAns = sessionMap ? sessionMap.get(q.id) : null;
        answers[orderNumber] = formatAnswerForCsv(
          q.question_type,
          q.options,
          rawAns,
          false
        );
      });

      return {
        studentName: session.student_name,
        studentClass: session.student_class,
        totalScore:
          session.total_score !== null ? Number(session.total_score) : null,
        isCompleted: Boolean(session.is_completed),
        answers,
      };
    });

    return {
      success: true,
      examTitle: exam?.title || "Ujian",
      questionsCount: questionsData.length,
      rows,
    };
  } catch (err) {
    console.error("Gagal memuat laporan jawaban lengkap:", err);
    return {
      success: false,
      message: "Terjadi kesalahan internal saat memuat laporan jawaban lengkap.",
    };
  }
}

