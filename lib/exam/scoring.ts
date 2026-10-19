import type { QuestionRow, SessionAnswerRow } from "@/types/database";

/**
 * Pembulatan angka desimal terstandar 2 digit di belakang koma (NUMERIC(x, 2))
 * Menggunakan Number.EPSILON untuk mencegah galat komputasi floating point IEEE-754.
 */
export function roundToTwoDecimals(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Ekstraksi nilai opsi tunggal dari berbagai format penyimpanan
 */
export function extractSingleChoice(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === "string") {
    const trimmed = val.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof val === "object" && val !== null && "selected" in val) {
    const sel = (val as { selected?: unknown }).selected;
    if (typeof sel === "string") {
      const trimmed = sel.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
  }
  return null;
}

/**
 * Ekstraksi nilai himpunan opsi jamak
 */
export function extractMultipleChoice(val: unknown): string[] {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val
      .filter((x): x is string => typeof x === "string")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  if (typeof val === "object" && val !== null && "selected" in val) {
    const sel = (val as { selected?: unknown }).selected;
    if (Array.isArray(sel)) {
      return sel
        .filter((x): x is string => typeof x === "string")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    }
  }
  return [];
}

/**
 * Ekstraksi teks isian singkat / numerik
 */
export function extractShortAnswer(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "string") {
    const trimmed = val.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof val === "number" || typeof val === "boolean") {
    return String(val).trim();
  }
  if (typeof val === "object" && val !== null && "text" in val) {
    const text = (val as { text?: unknown }).text;
    if (text === null || text === undefined) return null;
    const trimmed = String(text).trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

export interface ShortAnswerConfig {
  text: string;
  numeric_tolerance?: number;
  case_sensitive?: boolean;
}

export function parseShortAnswerConfig(correctAnswer: unknown): ShortAnswerConfig | null {
  if (!correctAnswer) return null;
  if (typeof correctAnswer === "string") {
    const trimmed = correctAnswer.trim();
    return trimmed.length > 0
      ? { text: trimmed, numeric_tolerance: 0, case_sensitive: false }
      : null;
  }
  if (typeof correctAnswer === "object" && correctAnswer !== null) {
    const obj = correctAnswer as Record<string, unknown>;
    const text =
      typeof obj.text === "string"
        ? obj.text.trim()
        : typeof obj.text === "number"
        ? String(obj.text).trim()
        : "";
    if (!text) return null;
    const numeric_tolerance =
      typeof obj.numeric_tolerance === "number" && !isNaN(obj.numeric_tolerance)
        ? Math.max(0, obj.numeric_tolerance)
        : 0;
    const case_sensitive = Boolean(obj.case_sensitive);
    return { text, numeric_tolerance, case_sensitive };
  }
  return null;
}

/**
 * Evaluasi butir soal Pilihan Ganda Tunggal (single_choice)
 * Jika jawaban sama persis dengan kunci -> peroleh nilai penuh, selainnya 0.
 */
export function evaluateSingleChoice(
  studentAnswer: unknown,
  correctAnswer: unknown,
  points: number
): number {
  if (points <= 0) return 0;
  const student = extractSingleChoice(studentAnswer);
  const correct = extractSingleChoice(correctAnswer);
  if (!student || !correct) return 0;

  return student.toLowerCase() === correct.toLowerCase() ? points : 0;
}

export interface MultipleChoiceOptions {
  mode?: "exact" | "partial";
}

/**
 * Evaluasi butir soal Pilihan Jamak (multiple_choice)
 * - mode "exact" (Default): Himpunan pilihan siswa harus identik dengan kunci jawaban.
 * - mode "partial": Skor proporsional terhitung (jumlah benar - jumlah salah) / total kunci * bobot.
 */
export function evaluateMultipleChoice(
  studentAnswer: unknown,
  correctAnswer: unknown,
  points: number,
  options: MultipleChoiceOptions = { mode: "exact" }
): number {
  if (points <= 0) return 0;
  const student = extractMultipleChoice(studentAnswer).map((s) => s.toLowerCase());
  const correct = extractMultipleChoice(correctAnswer).map((s) => s.toLowerCase());

  if (correct.length === 0 || student.length === 0) return 0;

  const studentSet = new Set(student);
  const correctSet = new Set(correct);

  if (options.mode === "partial") {
    let correctCount = 0;
    let wrongCount = 0;

    for (const item of studentSet) {
      if (correctSet.has(item)) {
        correctCount++;
      } else {
        wrongCount++;
      }
    }

    const ratio = Math.max(0, (correctCount - wrongCount) / correctSet.size);
    return roundToTwoDecimals(ratio * points);
  }

  // Exact set match
  if (studentSet.size !== correctSet.size) return 0;
  for (const item of studentSet) {
    if (!correctSet.has(item)) return 0;
  }

  return points;
}

/**
 * Evaluasi butir soal Isian Singkat & Isian Numerik (short_answer)
 * - Normalisasi spasi berlebih
 * - Pengenalan koma desimal khas Indonesia (misal "3,14" -> 3.14)
 * - Pemeriksaan batas toleransi numerik (|v_siswa - v_kunci| <= tolerance)
 * - Komparasi teks case-sensitive atau case-insensitive
 */
export function evaluateShortAnswer(
  studentAnswer: unknown,
  correctAnswer: unknown,
  points: number
): number {
  if (points <= 0) return 0;
  const studentText = extractShortAnswer(studentAnswer);
  const config = parseShortAnswerConfig(correctAnswer);

  if (!studentText || !config || !config.text) return 0;

  // Normalisasi karakter numerik dan separator desimal (koma -> titik)
  const normalizedCorrect = config.text.replace(/\s+/g, "").replace(",", ".");
  const normalizedStudent = studentText.replace(/\s+/g, "").replace(",", ".");

  const numCorrect = Number(normalizedCorrect);
  const numStudent = Number(normalizedStudent);

  const isCorrectNumeric = normalizedCorrect.length > 0 && !isNaN(numCorrect);
  const isStudentNumeric = normalizedStudent.length > 0 && !isNaN(numStudent);

  if (isCorrectNumeric && isStudentNumeric) {
    const tolerance = config.numeric_tolerance ?? 0;
    const diff = Math.abs(numStudent - numCorrect);
    // Batas toleransi dengan margin 1e-9 untuk kestabilan floating-point
    if (diff <= tolerance + 1e-9) {
      return points;
    }
    return 0;
  }

  // Komparasi teks non-numerik
  if (config.case_sensitive) {
    return studentText === config.text ? points : 0;
  } else {
    return studentText.toLowerCase() === config.text.toLowerCase() ? points : 0;
  }
}

/**
 * Router evaluasi butir soal berdasarkan question_type
 */
export function evaluateQuestionAnswer(
  questionType: string,
  studentAnswer: unknown,
  correctAnswer: unknown,
  points: number,
  options?: MultipleChoiceOptions
): number {
  if (!points || points <= 0) return 0;

  switch (questionType) {
    case "single_choice":
      return evaluateSingleChoice(studentAnswer, correctAnswer, points);
    case "multiple_choice":
      return evaluateMultipleChoice(studentAnswer, correctAnswer, points, options);
    case "short_answer":
      return evaluateShortAnswer(studentAnswer, correctAnswer, points);
    default:
      return 0;
  }
}

export type QuestionScoringItem = Pick<
  QuestionRow,
  "id" | "question_type" | "points"
> & {
  correct_answer?: unknown;
};

export type SessionAnswerScoringItem = Pick<
  SessionAnswerRow,
  "question_id"
> & {
  answer_value: unknown;
};

export interface SessionScoreCalculationResult {
  totalScore: number;
  awardedScores: Record<string, number>;
}

/**
 * Menghitung seluruh perolehan skor untuk satu sesi ujian
 */
export function calculateExamSessionScores(
  questions: QuestionScoringItem[],
  answers: SessionAnswerScoringItem[],
  options?: MultipleChoiceOptions
): SessionScoreCalculationResult {
  const answerMap = new Map<string, unknown>();
  for (const ans of answers) {
    answerMap.set(ans.question_id, ans.answer_value);
  }

  const awardedScores: Record<string, number> = {};
  let total = 0;

  for (const q of questions) {
    const studentAns = answerMap.get(q.id);
    const score = evaluateQuestionAnswer(
      q.question_type,
      studentAns,
      q.correct_answer,
      q.points,
      options
    );
    const roundedScore = roundToTwoDecimals(score);
    awardedScores[q.id] = roundedScore;
    total += roundedScore;
  }

  return {
    totalScore: roundToTwoDecimals(total),
    awardedScores,
  };
}

