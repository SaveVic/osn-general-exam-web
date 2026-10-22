"use server";

import { createClient } from "@/lib/supabase/server";
import { getNowWIBIsoString, parseDateTimeInputWIB } from "@/lib/time";
import { examFormSchema } from "@/lib/validations/exam";
import type { ExamRow } from "@/types/database";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export interface ExamActionState {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface AdminExamItem extends ExamRow {
  question_count?: number;
  session_count?: number;
}

/**
 * Mengambil daftar seluruh naskah ujian untuk dasbor admin
 */
export async function getAdminExams(
  filterStatus: "all" | "published" | "draft" = "all"
): Promise<AdminExamItem[]> {
  const supabase = await createClient();

  let query = supabase
    .from("exams")
    .select("*, questions(count), exam_sessions(count)")
    .order("created_at", { ascending: false });

  if (filterStatus === "published") {
    query = query.eq("is_published", true);
  } else if (filterStatus === "draft") {
    query = query.eq("is_published", false);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Gagal mengambil data ujian:", error.message);
    return [];
  }

  return (data || []).map((item) => ({
    ...item,
    question_count: item.questions?.[0]?.count ?? 0,
    session_count: item.exam_sessions?.[0]?.count ?? 0,
  }));
}

/**
 * Mengambil rincian naskah ujian berdasarkan ID
 */
export async function getExamById(id: string): Promise<ExamRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("exams")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Server Action: Membuat naskah ujian baru
 */
export async function createExamAction(
  prevState: ExamActionState | null,
  formData: FormData
): Promise<ExamActionState> {
  let rawClassOptions: string[] = [];
  try {
    const classOptionsStr = formData.get("class_options")?.toString();
    if (classOptionsStr) {
      rawClassOptions = JSON.parse(classOptionsStr);
    }
  } catch {
    rawClassOptions = [];
  }

  const rawData = {
    title: formData.get("title")?.toString() || "",
    description: formData.get("description")?.toString() || "",
    duration_minutes: formData.get("duration_minutes"),
    starts_at: formData.get("starts_at")?.toString() || "",
    ends_at: formData.get("ends_at")?.toString() || "",
    class_options: rawClassOptions,
    is_published: formData.get("is_published") === "on" || formData.get("is_published") === "true",
    show_score: formData.get("show_score") === "on" || formData.get("show_score") === "true",
  };

  const validation = examFormSchema.safeParse(rawData);

  if (!validation.success) {
    return {
      success: false,
      errors: validation.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("exams").insert({
    title: validation.data.title,
    description: validation.data.description || null,
    duration_minutes: validation.data.duration_minutes,
    starts_at: parseDateTimeInputWIB(validation.data.starts_at),
    ends_at: parseDateTimeInputWIB(validation.data.ends_at),
    class_options: validation.data.class_options,
    is_published: validation.data.is_published,
    show_score: validation.data.show_score,
  });

  if (error) {
    return {
      success: false,
      message: "Gagal menyimpan naskah ujian ke basis data: " + error.message,
    };
  }

  revalidatePath("/admin/dasbor");
  redirect("/admin/dasbor");
}

/**
 * Server Action: Memperbarui metadata naskah ujian yang ada
 */
export async function updateExamAction(
  id: string,
  prevState: ExamActionState | null,
  formData: FormData
): Promise<ExamActionState> {
  let rawClassOptions: string[] = [];
  try {
    const classOptionsStr = formData.get("class_options")?.toString();
    if (classOptionsStr) {
      rawClassOptions = JSON.parse(classOptionsStr);
    }
  } catch {
    rawClassOptions = [];
  }

  const rawData = {
    title: formData.get("title")?.toString() || "",
    description: formData.get("description")?.toString() || "",
    duration_minutes: formData.get("duration_minutes"),
    starts_at: formData.get("starts_at")?.toString() || "",
    ends_at: formData.get("ends_at")?.toString() || "",
    class_options: rawClassOptions,
    is_published: formData.get("is_published") === "on" || formData.get("is_published") === "true",
    show_score: formData.get("show_score") === "on" || formData.get("show_score") === "true",
  };

  const validation = examFormSchema.safeParse(rawData);

  if (!validation.success) {
    return {
      success: false,
      errors: validation.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("exams")
    .update({
      title: validation.data.title,
      description: validation.data.description || null,
      duration_minutes: validation.data.duration_minutes,
      starts_at: parseDateTimeInputWIB(validation.data.starts_at),
      ends_at: parseDateTimeInputWIB(validation.data.ends_at),
      class_options: validation.data.class_options,
      is_published: validation.data.is_published,
      show_score: validation.data.show_score,
      updated_at: getNowWIBIsoString(),
    })
    .eq("id", id);

  if (error) {
    return {
      success: false,
      message: "Gagal memperbarui naskah ujian: " + error.message,
    };
  }

  revalidatePath("/admin/dasbor");
  revalidatePath(`/admin/ujian/${id}/pengaturan`);
  revalidatePath(`/admin/ujian/${id}/soal`);

  return {
    success: true,
    message: "Perubahan naskah ujian berhasil disimpan.",
  };
}

/**
 * Server Action: Mengubah pengaturan visibilitas skor naskah ujian secara instan
 */
export async function toggleExamShowScoreAction(
  id: string,
  showScore: boolean
): Promise<{ success: boolean; message?: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("exams")
      .update({
        show_score: showScore,
        updated_at: getNowWIBIsoString(),
      })
      .eq("id", id);

    if (error) {
      return {
        success: false,
        message: "Gagal memperbarui visibilitas skor: " + error.message,
      };
    }

    revalidatePath("/admin/dasbor");
    revalidatePath(`/admin/ujian/${id}`);
    revalidatePath(`/admin/ujian/${id}/pengaturan`);
    revalidatePath(`/admin/ujian/${id}/soal`);

    return {
      success: true,
      message: showScore
        ? "Skor ujian sekarang akan ditampilkan ke peserta setelah selesai."
        : "Skor ujian sekarang disembunyikan dari peserta.",
    };
  } catch {
    return {
      success: false,
      message: "Terjadi kesalahan saat memperbarui status visibilitas skor.",
    };
  }
}

/**
 * Server Action: Menghapus naskah ujian
 */
export async function deleteExamAction(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from("exams").delete().eq("id", id);

  if (error) {
    throw new Error("Gagal menghapus naskah ujian: " + error.message);
  }

  revalidatePath("/admin/dasbor");
  redirect("/admin/dasbor");
}

/**
 * Server Action: Mengubah status publikasi ujian secara instan
 */
export async function togglePublishAction(id: string, currentStatus: boolean): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("exams")
    .update({ is_published: !currentStatus })
    .eq("id", id);

  if (error) {
    console.error("Gagal mengubah status publikasi:", error.message);
    return;
  }

  revalidatePath("/admin/dasbor");
}

