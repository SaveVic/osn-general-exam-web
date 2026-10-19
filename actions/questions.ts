"use server";

import { createClient } from "@/lib/supabase/server";
import { questionInputSchema, type QuestionInput } from "@/lib/validations/question";
import type { QuestionRow } from "@/types/database";
import { revalidatePath } from "next/cache";

export interface QuestionActionState {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  data?: QuestionRow;
}

/**
 * Mengambil seluruh butir soal untuk ujian tertentu, terurut order_index ASC
 */
export async function getExamQuestions(examId: string): Promise<QuestionRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("questions")
    .select("*")
    .eq("exam_id", examId)
    .order("order_index", { ascending: true });

  if (error) {
    console.error("Gagal mengambil daftar soal:", error.message);
    return [];
  }

  return (data || []) as QuestionRow[];
}

/**
 * Mengambil detail butir soal berdasarkan ID
 */
export async function getQuestionById(questionId: string): Promise<QuestionRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("questions")
    .select("*")
    .eq("id", questionId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as QuestionRow;
}

/**
 * Membuat butir soal baru pada naskah ujian
 */
export async function createQuestionAction(
  examId: string,
  payload: QuestionInput
): Promise<QuestionActionState> {
  const validation = questionInputSchema.safeParse(payload);
  if (!validation.success) {
    return {
      success: false,
      errors: validation.error.flatten().fieldErrors,
      message: "Validasi data butir soal gagal. Silakan periksa kembali input Anda.",
    };
  }

  const supabase = await createClient();

  // Hitung order_index berikutnya
  const { data: maxOrderData } = await supabase
    .from("questions")
    .select("order_index")
    .eq("exam_id", examId)
    .order("order_index", { ascending: false })
    .limit(1);

  const nextOrderIndex =
    maxOrderData && maxOrderData.length > 0 ? (maxOrderData[0].order_index || 0) + 1 : 1;

  const { data, error } = await supabase
    .from("questions")
    .insert({
      exam_id: examId,
      order_index: payload.order_index ?? nextOrderIndex,
      question_type: validation.data.question_type,
      prompt: validation.data.prompt,
      options: validation.data.options,
      correct_answer: validation.data.correct_answer,
      points: validation.data.points,
    })
    .select()
    .single();

  if (error) {
    console.error("Gagal menyimpan butir soal:", error.message);
    return {
      success: false,
      message: `Gagal menyimpan butir soal: ${error.message}`,
    };
  }

  revalidatePath(`/admin/ujian/${examId}/soal`);
  revalidatePath("/admin/dasbor");

  return {
    success: true,
    message: "Butir soal berhasil ditambahkan ke bank soal.",
    data: data as QuestionRow,
  };
}

/**
 * Memperbarui butir soal yang sudah ada
 */
export async function updateQuestionAction(
  questionId: string,
  examId: string,
  payload: QuestionInput
): Promise<QuestionActionState> {
  const validation = questionInputSchema.safeParse(payload);
  if (!validation.success) {
    return {
      success: false,
      errors: validation.error.flatten().fieldErrors,
      message: "Validasi data butir soal gagal. Silakan periksa kembali input Anda.",
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("questions")
    .update({
      question_type: validation.data.question_type,
      prompt: validation.data.prompt,
      options: validation.data.options,
      correct_answer: validation.data.correct_answer,
      points: validation.data.points,
      ...(payload.order_index !== undefined ? { order_index: payload.order_index } : {}),
    })
    .eq("id", questionId)
    .eq("exam_id", examId)
    .select()
    .single();

  if (error) {
    console.error("Gagal memperbarui butir soal:", error.message);
    return {
      success: false,
      message: `Gagal memperbarui butir soal: ${error.message}`,
    };
  }

  revalidatePath(`/admin/ujian/${examId}/soal`);
  revalidatePath("/admin/dasbor");

  return {
    success: true,
    message: "Butir soal berhasil diperbarui.",
    data: data as QuestionRow,
  };
}

/**
 * Menghapus butir soal dan menormalisasi ulang nomor urut (order_index) soal tersisa
 */
export async function deleteQuestionAction(
  questionId: string,
  examId: string
): Promise<QuestionActionState> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("questions")
    .delete()
    .eq("id", questionId)
    .eq("exam_id", examId);

  if (error) {
    console.error("Gagal menghapus butir soal:", error.message);
    return {
      success: false,
      message: `Gagal menghapus butir soal: ${error.message}`,
    };
  }

  // Normalisasi urutan soal yang tersisa (1, 2, 3...)
  const { data: remaining } = await supabase
    .from("questions")
    .select("id, order_index")
    .eq("exam_id", examId)
    .order("order_index", { ascending: true });

  if (remaining && remaining.length > 0) {
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].order_index !== i + 1) {
        await supabase
          .from("questions")
          .update({ order_index: i + 1 })
          .eq("id", remaining[i].id);
      }
    }
  }

  revalidatePath(`/admin/ujian/${examId}/soal`);
  revalidatePath("/admin/dasbor");

  return {
    success: true,
    message: "Butir soal berhasil dihapus.",
  };
}

/**
 * Menata ulang urutan soal (reorder)
 */
export async function reorderQuestionsAction(
  examId: string,
  orderedQuestionIds: string[]
): Promise<QuestionActionState> {
  const supabase = await createClient();

  for (let i = 0; i < orderedQuestionIds.length; i++) {
    const qId = orderedQuestionIds[i];
    await supabase
      .from("questions")
      .update({ order_index: i + 1 })
      .eq("id", qId)
      .eq("exam_id", examId);
  }

  revalidatePath(`/admin/ujian/${examId}/soal`);

  return {
    success: true,
    message: "Urutan butir soal berhasil diperbarui.",
  };
}

/**
 * Menduplikasi butir soal
 */
export async function duplicateQuestionAction(
  questionId: string,
  examId: string
): Promise<QuestionActionState> {
  const supabase = await createClient();

  const { data: source, error: fetchErr } = await supabase
    .from("questions")
    .select("*")
    .eq("id", questionId)
    .single();

  if (fetchErr || !source) {
    return {
      success: false,
      message: "Butir soal sumber tidak ditemukan.",
    };
  }

  // Hitung order_index baru
  const { data: maxOrderData } = await supabase
    .from("questions")
    .select("order_index")
    .eq("exam_id", examId)
    .order("order_index", { ascending: false })
    .limit(1);

  const nextOrderIndex =
    maxOrderData && maxOrderData.length > 0 ? (maxOrderData[0].order_index || 0) + 1 : 1;

  const { data, error } = await supabase
    .from("questions")
    .insert({
      exam_id: examId,
      order_index: nextOrderIndex,
      question_type: source.question_type,
      prompt: `${source.prompt} (Salinan)`,
      options: source.options,
      correct_answer: source.correct_answer,
      points: source.points,
    })
    .select()
    .single();

  if (error) {
    return {
      success: false,
      message: `Gagal menduplikasi butir soal: ${error.message}`,
    };
  }

  revalidatePath(`/admin/ujian/${examId}/soal`);
  revalidatePath("/admin/dasbor");

  return {
    success: true,
    message: "Butir soal berhasil diduplikasi.",
    data: data as QuestionRow,
  };
}

