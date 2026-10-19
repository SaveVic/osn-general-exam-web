import { z } from "zod";

export const examFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "Judul ujian minimal 3 karakter.")
      .max(150, "Judul ujian maksimal 150 karakter."),
    description: z.string().trim().optional().or(z.literal("")),
    duration_minutes: z.coerce
      .number()
      .int("Durasi harus berupa bilangan bulat.")
      .min(1, "Durasi ujian minimal 1 menit.")
      .max(600, "Durasi ujian maksimal 600 menit (10 jam)."),
    starts_at: z.string().min(1, "Waktu mulai ujian wajib diisi."),
    ends_at: z.string().min(1, "Waktu selesai ujian wajib diisi."),
    class_options: z
      .array(z.string().trim().min(1, "Nama kelas tidak boleh kosong."))
      .min(1, "Minimal harus ada 1 pilihan kelas untuk peserta."),
    is_published: z.boolean().default(false),
  })
  .refine(
    (data) => {
      const start = new Date(data.starts_at).getTime();
      const end = new Date(data.ends_at).getTime();
      return !isNaN(start) && !isNaN(end) && end > start;
    },
    {
      message: "Waktu selesai ujian harus lebih lambat dari waktu mulai ujian.",
      path: ["ends_at"],
    }
  );

export type ExamFormValues = z.infer<typeof examFormSchema>;

