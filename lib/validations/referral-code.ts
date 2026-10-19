import { z } from "zod";

export const referralCodeSchema = z
  .object({
    code: z
      .string()
      .min(3, "Kode rujukan minimal 3 karakter")
      .max(32, "Kode rujukan maksimal 32 karakter")
      .regex(/^[A-Z0-9_-]+$/, "Kode hanya boleh berisi huruf kapital, angka, garis bawah (_), atau tanda hubung (-)"),
    is_unlimited: z.boolean().default(false),
    max_uses: z.coerce.number().int().positive("Batas kuota harus berupa angka bulat minimal 1").optional().nullable(),
    expiration_type: z.enum(["exam_end", "custom", "never"]).default("exam_end"),
    expires_at: z.string().optional().nullable(),
    is_active: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (!data.is_unlimited && (!data.max_uses || data.max_uses <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Tentukan batas kuota peserta jika tidak memilih opsi 'Tanpa Batas'",
        path: ["max_uses"],
      });
    }

    if (data.expiration_type === "custom") {
      if (!data.expires_at || !data.expires_at.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Tentukan tanggal dan jam kedaluwarsa untuk opsi kustom",
          path: ["expires_at"],
        });
      } else {
        const d = new Date(data.expires_at);
        if (isNaN(d.getTime())) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Format tanggal kedaluwarsa tidak valid",
            path: ["expires_at"],
          });
        }
      }
    }
  });

export type ReferralCodeInput = z.infer<typeof referralCodeSchema>;

