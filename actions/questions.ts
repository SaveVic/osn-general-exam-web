"use server";

import { getAdminUser } from "@/actions/auth";
import { createClient } from "@/lib/supabase/server";
import {
  parseAndValidateQuestionsJson,
  questionInputSchema,
  type QuestionInput,
} from "@/lib/validations/question";
import type { QuestionRow } from "@/types/database";
import { revalidatePath } from "next/cache";

export interface QuestionActionState {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  data?: QuestionRow;
}

export interface ImportQuestionsActionState {
  success: boolean;
  message?: string;
  importedCount?: number;
  errors?: string[];
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

/**
 * Menghitung jumlah sesi peserta pada naskah ujian tertentu
 */
export async function getExamSessionCount(examId: string): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("exam_sessions")
    .select("id", { count: "exact", head: true })
    .eq("exam_id", examId);

  if (error) {
    console.error("Gagal memeriksa jumlah sesi ujian:", error.message);
    return 0;
  }

  return count ?? 0;
}

/**
 * Menghapus seluruh butir soal pada naskah ujian (Reset Bank Soal).
 * Ditolak apabila sudah terdapat peserta yang mengikuti ujian (exam_sessions > 0).
 */
export async function resetQuestionsAction(
  examId: string
): Promise<QuestionActionState> {
  const user = await getAdminUser();
  if (!user) {
    return {
      success: false,
      message: "Akses ditolak. Silakan masuk kembali sebagai administrator.",
    };
  }

  if (!examId) {
    return {
      success: false,
      message: "ID naskah ujian tidak valid.",
    };
  }

  const supabase = await createClient();

  // Pastikan belum ada peserta yang mengikuti ujian ini (fail-closed jika query error)
  const { count: sessionCount, error: sessionError } = await supabase
    .from("exam_sessions")
    .select("id", { count: "exact", head: true })
    .eq("exam_id", examId);

  if (sessionError) {
    console.error("Gagal memverifikasi sesi peserta sebelum reset:", sessionError.message);
    return {
      success: false,
      message: `Gagal memverifikasi status peserta ujian: ${sessionError.message}`,
    };
  }

  if ((sessionCount ?? 0) > 0) {
    return {
      success: false,
      message: `Reset soal tidak dapat dilakukan karena sudah ada ${sessionCount} peserta yang mengikuti ujian ini.`,
    };
  }

  const { error: deleteError } = await supabase
    .from("questions")
    .delete()
    .eq("exam_id", examId);

  if (deleteError) {
    console.error("Gagal mereset seluruh butir soal:", deleteError.message);
    return {
      success: false,
      message: `Gagal mereset butir soal: ${deleteError.message}`,
    };
  }

  revalidatePath(`/admin/ujian/${examId}/soal`);
  revalidatePath("/admin/dasbor");

  return {
    success: true,
    message: "Seluruh butir soal berhasil direset.",
  };
}

/**
 * Mengimpor beberapa butir soal sekaligus dari payload JSON dan menempatkannya
 * secara berurutan di nomor paling belakang (append).
 */
export async function importQuestionsAction(
  examId: string,
  rawPayload: unknown
): Promise<ImportQuestionsActionState> {
  const user = await getAdminUser();
  if (!user) {
    return {
      success: false,
      message: "Akses ditolak. Silakan masuk kembali sebagai administrator.",
    };
  }

  if (!examId) {
    return {
      success: false,
      message: "ID naskah ujian tidak valid.",
    };
  }

  const parsed = parseAndValidateQuestionsJson(rawPayload);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.errors[0] || "Validasi format JSON soal gagal.",
      errors: parsed.errors,
    };
  }

  const supabase = await createClient();

  const { data: examData, error: examError } = await supabase
    .from("exams")
    .select("id")
    .eq("id", examId)
    .single();

  if (examError || !examData) {
    return {
      success: false,
      message: "Naskah ujian tidak ditemukan.",
    };
  }

  // Ambil order_index maksimum agar soal baru selalu diletakkan di belakang (append)
  const { data: maxOrderData, error: maxOrderError } = await supabase
    .from("questions")
    .select("order_index")
    .eq("exam_id", examId)
    .order("order_index", { ascending: false })
    .limit(1);

  if (maxOrderError) {
    console.error("Gagal memeriksa nomor urut soal terakhir:", maxOrderError.message);
    return {
      success: false,
      message: `Gagal menentukan urutan soal berikutnya: ${maxOrderError.message}`,
    };
  }

  const baseOrderIndex =
    maxOrderData && maxOrderData.length > 0 ? maxOrderData[0].order_index || 0 : 0;

  const rowsToInsert = parsed.data.map((item, idx) => ({
    exam_id: examId,
    order_index: baseOrderIndex + idx + 1,
    question_type: item.question_type,
    prompt: item.prompt,
    options: item.options,
    correct_answer: item.correct_answer,
    points: item.points,
  }));

  const { data: insertedRows, error: insertError } = await supabase
    .from("questions")
    .insert(rowsToInsert)
    .select("id");

  if (insertError) {
    console.error("Gagal mengimpor butir soal:", insertError.message);
    return {
      success: false,
      message: `Gagal menyimpan butir soal hasil import: ${insertError.message}`,
    };
  }

  const importedCount = insertedRows?.length ?? rowsToInsert.length;

  revalidatePath(`/admin/ujian/${examId}/soal`);
  revalidatePath("/admin/dasbor");

  return {
    success: true,
    importedCount,
    message: `${importedCount} butir soal berhasil diimpor ke urutan #${baseOrderIndex + 1} s.d. #${baseOrderIndex + importedCount}.`,
  };
}


