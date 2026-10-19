import { z } from "zod";

export const startExamSessionSchema = z.object({
  referralCode: z
    .string()
    .trim()
    .toUpperCase()
    .min(3, "Kode rujukan minimal 3 karakter")
    .max(32, "Kode rujukan maksimal 32 karakter"),
  studentName: z
    .string()
    .trim()
    .min(3, "Nama lengkap siswa minimal 3 karakter")
    .max(100, "Nama lengkap siswa maksimal 100 karakter"),
  studentClass: z
    .string()
    .trim()
    .min(1, "Silakan pilih kelas peserta Anda"),
});

export type StartExamSessionInput = z.infer<typeof startExamSessionSchema>;

