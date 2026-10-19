import { z } from "zod";

export const verifyGateCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(3, "Kode rujukan minimal 3 karakter")
    .max(32, "Kode rujukan maksimal 32 karakter")
    .regex(
      /^[A-Z0-9_-]+$/,
      "Format kode rujukan tidak valid. Hanya boleh berisi huruf kapital, angka, garis bawah (_), atau tanda hubung (-)."
    ),
});

export type VerifyGateCodeInput = z.infer<typeof verifyGateCodeSchema>;

