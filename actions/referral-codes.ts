"use server";

import { createClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/actions/auth";
import { referralCodeSchema, type ReferralCodeInput } from "@/lib/validations/referral-code";
import type { ReferralCodeRow } from "@/types/database";
import { revalidatePath } from "next/cache";

export interface ReferralCodeActionState {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  data?: ReferralCodeRow;
}

/**
 * Mengambil seluruh kode rujukan untuk naskah ujian tertentu
 */
export async function getExamReferralCodes(examId: string): Promise<ReferralCodeRow[]> {
  const user = await getAdminUser();
  if (!user) return [];

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("referral_codes")
    .select("*")
    .eq("exam_id", examId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Gagal mengambil kode rujukan:", error.message);
    return [];
  }

  return (data || []) as ReferralCodeRow[];
}

/**
 * Membuat kode rujukan baru
 */
export async function createReferralCodeAction(
  examId: string,
  payload: ReferralCodeInput
): Promise<ReferralCodeActionState> {
  const user = await getAdminUser();
  if (!user) {
    return {
      success: false,
      message: "Sesi telah berakhir. Silakan masuk kembali sebagai administrator.",
    };
  }

  const validation = referralCodeSchema.safeParse(payload);
  if (!validation.success) {
    return {
      success: false,
      errors: validation.error.flatten().fieldErrors,
      message: "Validasi data kode rujukan gagal. Silakan periksa kembali formulir.",
    };
  }

  const supabase = await createClient();

  // Periksa keunikan kode
  const { data: existing } = await supabase
    .from("referral_codes")
    .select("id")
    .eq("code", validation.data.code)
    .maybeSingle();

  if (existing) {
    return {
      success: false,
      errors: {
        code: ["Kode rujukan ini sudah digunakan. Silakan buat kode lain atau klik 'Acak Kode'."],
      },
      message: "Kode rujukan sudah ada dalam sistem. Gunakan kode yang unik.",
    };
  }

  // Tentukan waktu kedaluwarsa
  let finalExpiresAt: string | null = null;
  if (validation.data.expiration_type === "exam_end") {
    // Ambil ends_at dari ujian
    const { data: examData } = await supabase
      .from("exams")
      .select("ends_at")
      .eq("id", examId)
      .single();

    finalExpiresAt = examData?.ends_at || null;
  } else if (validation.data.expiration_type === "custom" && validation.data.expires_at) {
    finalExpiresAt = new Date(validation.data.expires_at).toISOString();
  } else {
    finalExpiresAt = null;
  }

  const finalMaxUses = validation.data.is_unlimited ? null : validation.data.max_uses;

  const { data: newCode, error: insertError } = await supabase
    .from("referral_codes")
    .insert({
      exam_id: examId,
      code: validation.data.code,
      max_uses: finalMaxUses,
      current_uses: 0,
      expires_at: finalExpiresAt,
      is_active: validation.data.is_active,
    })
    .select()
    .single();

  if (insertError) {
    console.error("Gagal membuat kode rujukan:", insertError);
    return {
      success: false,
      message: `Gagal menerbitkan kode rujukan: ${insertError.message}`,
    };
  }

  revalidatePath(`/admin/ujian/${examId}/kode-rujukan`);
  revalidatePath("/admin/dasbor");

  return {
    success: true,
    message: `Kode rujukan "${validation.data.code}" berhasil diterbitkan.`,
    data: newCode as ReferralCodeRow,
  };
}

/**
 * Mengubah status keaktifan kode rujukan (Aktif <-> Nonaktif)
 */
export async function toggleReferralCodeAction(
  codeId: string,
  examId: string,
  currentStatus: boolean
): Promise<ReferralCodeActionState> {
  const user = await getAdminUser();
  if (!user) {
    return {
      success: false,
      message: "Sesi telah berakhir. Silakan masuk kembali.",
    };
  }

  const supabase = await createClient();

  const nextStatus = !currentStatus;

  const { error } = await supabase
    .from("referral_codes")
    .update({ is_active: nextStatus })
    .eq("id", codeId)
    .eq("exam_id", examId);

  if (error) {
    return {
      success: false,
      message: `Gagal mengubah status kode: ${error.message}`,
    };
  }

  revalidatePath(`/admin/ujian/${examId}/kode-rujukan`);

  return {
    success: true,
    message: `Kode rujukan berhasil ${nextStatus ? "diaktifkan" : "dinonaktifkan"}.`,
  };
}

/**
 * Menghapus kode rujukan
 */
export async function deleteReferralCodeAction(
  codeId: string,
  examId: string
): Promise<ReferralCodeActionState> {
  const user = await getAdminUser();
  if (!user) {
    return {
      success: false,
      message: "Sesi telah berakhir. Silakan masuk kembali.",
    };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("referral_codes")
    .delete()
    .eq("id", codeId)
    .eq("exam_id", examId);

  if (error) {
    return {
      success: false,
      message: `Gagal menghapus kode rujukan: ${error.message}`,
    };
  }

  revalidatePath(`/admin/ujian/${examId}/kode-rujukan`);
  revalidatePath("/admin/dasbor");

  return {
    success: true,
    message: "Kode rujukan berhasil dihapus.",
  };
}

