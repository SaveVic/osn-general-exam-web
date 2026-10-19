"use server";

import { createClient } from "@/lib/supabase/server";
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
    starts_at: new Date(validation.data.starts_at).toISOString(),
    ends_at: new Date(validation.data.ends_at).toISOString(),
    class_options: validation.data.class_options,
    is_published: validation.data.is_published,
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
      starts_at: new Date(validation.data.starts_at).toISOString(),
      ends_at: new Date(validation.data.ends_at).toISOString(),
      class_options: validation.data.class_options,
      is_published: validation.data.is_published,
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

  return {
    success: true,
    message: "Perubahan naskah ujian berhasil disimpan.",
  };
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

