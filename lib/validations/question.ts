import { z } from "zod";

export const MAX_IMPORT_QUESTIONS = 200;
export const MAX_IMPORT_FILE_SIZE_BYTES = 2 * 1024 * 1024;
export const MAX_OPTIONS_PER_QUESTION = 10;

export const questionTypeSchema = z.enum(["single_choice", "multiple_choice", "short_answer"]);

export const choiceOptionSchema = z.object({
  id: z.string().trim().min(1, "Label opsi tidak boleh kosong (contoh: A)"),
  text: z.string().trim().min(1, "Isi opsi tidak boleh kosong"),
});

export const singleChoiceAnswerSchema = z.object({
  selected: z.string().trim().min(1, "Pilih satu opsi sebagai kunci jawaban"),
});

export const multipleChoiceAnswerSchema = z.object({
  selected: z
    .array(z.string().trim().min(1))
    .min(1, "Pilih minimal satu opsi kunci jawaban benar"),
});

export const shortAnswerSchema = z.object({
  text: z.string().trim().min(1, "Kunci jawaban isian singkat tidak boleh kosong"),
  numeric_tolerance: z.number().nonnegative().optional().default(0),
  case_sensitive: z.boolean().optional().default(false),
});

const baseQuestionSchema = z.object({
  question_type: questionTypeSchema,
  prompt: z.string().trim().min(3, "Isi soal minimal 3 karakter"),
  points: z.coerce
    .number()
    .refine((val) => Number.isFinite(val), "Bobot poin harus berupa angka valid")
    .min(0, "Bobot poin minimal 0")
    .default(1),
  order_index: z.coerce.number().int().positive().optional(),
  options: z.array(choiceOptionSchema).default([]),
  correct_answer: z.any(),
});

function validateChoiceOptions(
  options: ChoiceOption[],
  ctx: z.RefinementCtx,
  minMessage: string
): boolean {
  if (options.length < 2) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: minMessage,
      path: ["options"],
    });
    return false;
  }

  if (options.length > MAX_OPTIONS_PER_QUESTION) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Maksimal ${MAX_OPTIONS_PER_QUESTION} pilihan opsi per butir soal`,
      path: ["options"],
    });
    return false;
  }

  const seenIds = new Set<string>();
  for (const option of options) {
    const normalizedId = option.id.trim();
    if (seenIds.has(normalizedId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Label opsi "${normalizedId}" duplikat; setiap id opsi harus unik`,
        path: ["options"],
      });
      return false;
    }
    seenIds.add(normalizedId);
  }

  return true;
}

function validateQuestionSuperRefine(
  data: z.infer<typeof baseQuestionSchema>,
  ctx: z.RefinementCtx
): void {
  if (data.question_type === "single_choice") {
    validateChoiceOptions(
      data.options,
      ctx,
      "Soal pilihan ganda minimal harus memiliki 2 pilihan opsi (misal: A dan B)"
    );
    const ansResult = singleChoiceAnswerSchema.safeParse(data.correct_answer);
    if (!ansResult.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: ansResult.error.issues[0]?.message || "Kunci jawaban tidak valid",
        path: ["correct_answer"],
      });
    } else if (!data.options.some((o) => o.id === ansResult.data.selected)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Kunci jawaban harus merupakan salah satu dari opsi yang tersedia",
        path: ["correct_answer"],
      });
    }
  } else if (data.question_type === "multiple_choice") {
    validateChoiceOptions(
      data.options,
      ctx,
      "Soal pilihan jamak minimal harus memiliki 2 pilihan opsi"
    );
    const ansResult = multipleChoiceAnswerSchema.safeParse(data.correct_answer);
    if (!ansResult.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: ansResult.error.issues[0]?.message || "Pilih minimal satu kunci jawaban",
        path: ["correct_answer"],
      });
    } else {
      const optionIds = new Set(data.options.map((o) => o.id));
      const allValid = ansResult.data.selected.every((id) => optionIds.has(id));
      if (!allValid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Seluruh kunci jawaban terpilih harus merupakan opsi yang tersedia",
          path: ["correct_answer"],
        });
      }
    }
  } else if (data.question_type === "short_answer") {
    const ansResult = shortAnswerSchema.safeParse(data.correct_answer);
    if (!ansResult.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: ansResult.error.issues[0]?.message || "Kunci jawaban isian tidak boleh kosong",
        path: ["correct_answer"],
      });
    }
  }
}

export const questionInputSchema = baseQuestionSchema.superRefine(validateQuestionSuperRefine);

/**
 * Skema item soal untuk proses import JSON massal (append mode).
 * Mengabaikan order_index dari file JSON dan menormalisasi opsi/kunci jawaban.
 */
export const questionImportItemSchema = baseQuestionSchema
  .superRefine(validateQuestionSuperRefine)
  .transform((data) => {
    if (data.question_type === "single_choice") {
      return {
        question_type: data.question_type,
        prompt: data.prompt,
        points: data.points,
        options: data.options,
        correct_answer: singleChoiceAnswerSchema.parse(data.correct_answer),
      };
    }
    if (data.question_type === "multiple_choice") {
      const parsedAns = multipleChoiceAnswerSchema.parse(data.correct_answer);
      return {
        question_type: data.question_type,
        prompt: data.prompt,
        points: data.points,
        options: data.options,
        correct_answer: {
          selected: Array.from(new Set(parsedAns.selected)),
        },
      };
    }
    return {
      question_type: data.question_type,
      prompt: data.prompt,
      points: data.points,
      options: [] as ChoiceOption[],
      correct_answer: shortAnswerSchema.parse(data.correct_answer),
    };
  });

export type QuestionInput = z.infer<typeof questionInputSchema>;
export type ImportedQuestionItem = z.infer<typeof questionImportItemSchema>;
export type ChoiceOption = z.infer<typeof choiceOptionSchema>;
export type SingleChoiceAnswer = z.infer<typeof singleChoiceAnswerSchema>;
export type MultipleChoiceAnswer = z.infer<typeof multipleChoiceAnswerSchema>;
export type ShortAnswer = z.infer<typeof shortAnswerSchema>;

export type ParseImportQuestionsResult =
  | { success: true; data: ImportedQuestionItem[] }
  | { success: false; errors: string[] };

/**
 * Mem-parse dan memvalidasi payload JSON import soal secara menyeluruh (all-or-nothing).
 * Menerima format root array `[...]` atau objek pembungkus `{ "questions": [...] }`.
 */
export function parseAndValidateQuestionsJson(rawInput: unknown): ParseImportQuestionsResult {
  let rawItems: unknown;

  if (Array.isArray(rawInput)) {
    rawItems = rawInput;
  } else if (
    typeof rawInput === "object" &&
    rawInput !== null &&
    "questions" in rawInput &&
    Array.isArray((rawInput as { questions: unknown }).questions)
  ) {
    rawItems = (rawInput as { questions: unknown[] }).questions;
  } else {
    return {
      success: false,
      errors: [
        'Struktur root JSON tidak valid. Gunakan array objek soal `[ ... ]` atau objek `{ "questions": [ ... ] }`.',
      ],
    };
  }

  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return {
      success: false,
      errors: ["Berkas JSON tidak berisi butir soal (minimal 1 butir soal)."],
    };
  }

  if (rawItems.length > MAX_IMPORT_QUESTIONS) {
    return {
      success: false,
      errors: [
        `Jumlah soal melebihi batas maksimal ${MAX_IMPORT_QUESTIONS} soal per impor (ditemukan ${rawItems.length} soal).`,
      ],
    };
  }

  const parsedItems: ImportedQuestionItem[] = [];
  const errors: string[] = [];

  for (let i = 0; i < rawItems.length; i++) {
    const result = questionImportItemSchema.safeParse(rawItems[i]);
    if (!result.success) {
      const seenMessages = new Set<string>();
      for (const issue of result.error.issues) {
        if (!seenMessages.has(issue.message)) {
          seenMessages.add(issue.message);
          errors.push(`Soal #${i + 1}: ${issue.message}`);
        }
      }
    } else {
      parsedItems.push(result.data);
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true, data: parsedItems };
}

export const EXAMPLE_IMPORT_QUESTIONS = [
  {
    question_type: "single_choice",
    prompt: "Berapakah hasil dari $\\frac{12}{3} + 2^3$?",
    points: 2,
    options: [
      { id: "A", text: "10" },
      { id: "B", text: "12" },
      { id: "C", text: "14" },
      { id: "D", text: "16" },
    ],
    correct_answer: { selected: "B" },
  },
  {
    question_type: "multiple_choice",
    prompt: "Manakah di antara bilangan berikut yang merupakan **bilangan prima**?",
    points: 3,
    options: [
      { id: "A", text: "2" },
      { id: "B", text: "9" },
      { id: "C", text: "13" },
      { id: "D", text: "15" },
    ],
    correct_answer: { selected: ["A", "C"] },
  },
  {
    question_type: "short_answer",
    prompt: "Hitunglah nilai $x$ jika diketahui $3x - 7 = 14$.",
    points: 5,
    options: [],
    correct_answer: {
      text: "7",
      numeric_tolerance: 0,
      case_sensitive: false,
    },
  },
] as const;

