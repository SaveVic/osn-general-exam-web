import { z } from "zod";

export const lobbyIdentitySchema = z.object({
  studentName: z
    .string()
    .trim()
    .min(3, "Nama lengkap siswa minimal 3 karakter")
    .max(100, "Nama lengkap siswa maksimal 100 karakter"),
  studentClass: z
    .string()
    .trim()
    .min(1, "Silakan pilih kelas peserta terlebih dahulu"),
});

export type LobbyIdentityInput = z.infer<typeof lobbyIdentitySchema>;

