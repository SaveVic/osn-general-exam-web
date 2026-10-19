import { z } from "zod";

export const questionTypeSchema = z.enum(["single_choice", "multiple_choice", "short_answer"]);

export const choiceOptionSchema = z.object({
  id: z.string().min(1, "Label opsi tidak boleh kosong (contoh: A)"),
  text: z.string().min(1, "Isi opsi tidak boleh kosong"),
});

export const singleChoiceAnswerSchema = z.object({
  selected: z.string().min(1, "Pilih satu opsi sebagai kunci jawaban"),
});

export const multipleChoiceAnswerSchema = z.object({
  selected: z.array(z.string()).min(1, "Pilih minimal satu opsi kunci jawaban benar"),
});

export const shortAnswerSchema = z.object({
  text: z.string().min(1, "Kunci jawaban isian singkat tidak boleh kosong"),
  numeric_tolerance: z.number().nonnegative().optional().default(0),
  case_sensitive: z.boolean().optional().default(false),
});

export const questionInputSchema = z
  .object({
    question_type: questionTypeSchema,
    prompt: z.string().min(3, "Isi soal minimal 3 karakter"),
    points: z.coerce.number().min(0, "Bobot poin minimal 0").default(1),
    order_index: z.coerce.number().int().positive().optional(),
    options: z.array(choiceOptionSchema).default([]),
    correct_answer: z.any(),
  })
  .superRefine((data, ctx) => {
    if (data.question_type === "single_choice") {
      if (data.options.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Soal pilihan ganda minimal harus memiliki 2 pilihan opsi (misal: A dan B)",
          path: ["options"],
        });
      }
      const ansResult = singleChoiceAnswerSchema.safeParse(data.correct_answer);
      if (!ansResult.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: ansResult.error.issues[0]?.message || "Kunci jawaban tidak valid",
          path: ["correct_answer"],
        });
      } else {
        const optionIds = data.options.map((o) => o.id);
        if (!optionIds.includes(ansResult.data.selected)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Kunci jawaban harus merupakan salah satu dari opsi yang tersedia",
            path: ["correct_answer"],
          });
        }
      }
    } else if (data.question_type === "multiple_choice") {
      if (data.options.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Soal pilihan jamak minimal harus memiliki 2 pilihan opsi",
          path: ["options"],
        });
      }
      const ansResult = multipleChoiceAnswerSchema.safeParse(data.correct_answer);
      if (!ansResult.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: ansResult.error.issues[0]?.message || "Pilih minimal satu kunci jawaban",
          path: ["correct_answer"],
        });
      } else {
        const optionIds = data.options.map((o) => o.id);
        const allValid = ansResult.data.selected.every((id) => optionIds.includes(id));
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
  });

export type QuestionInput = z.infer<typeof questionInputSchema>;
export type ChoiceOption = z.infer<typeof choiceOptionSchema>;
export type SingleChoiceAnswer = z.infer<typeof singleChoiceAnswerSchema>;
export type MultipleChoiceAnswer = z.infer<typeof multipleChoiceAnswerSchema>;
export type ShortAnswer = z.infer<typeof shortAnswerSchema>;

