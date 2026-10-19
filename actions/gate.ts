"use server";

import { createServiceClient } from "@/lib/supabase/admin";
import { verifyGateCodeSchema } from "@/lib/validations/gate";
import type { ExamRow, ReferralCodeRow } from "@/types/database";

export interface VerifiedExamSummary {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  starts_at: string;
  ends_at: string;
  class_options: string[];
}

export interface VerifiedGateData {
  referralCode: string;
  referralCodeId: string;
  exam: VerifiedExamSummary;
  serverTime: string;
}

export interface VerifyGateResult {
  success: boolean;
  message?: string;
  data?: VerifiedGateData;
}

type ReferralCodeWithExam = ReferralCodeRow & {
  exams: ExamRow | null;
};

/**
 * Server Action untuk memvalidasi kode rujukan di gerbang masuk portal pengerjaan ujian
 */
export async function verifyReferralCodeAction(
  rawCode: string
): Promise<VerifyGateResult> {
  const parseResult = verifyGateCodeSchema.safeParse({ code: rawCode });

  if (!parseResult.success) {
    const errorMsg =
      parseResult.error.flatten().fieldErrors.code?.[0] ||
      "Format kode rujukan tidak valid.";
    return {
      success: false,
      message: errorMsg,
    };
  }

  const normalizedCode = parseResult.data.code;

  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("referral_codes")
      .select("*, exams(*)")
      .eq("code", normalizedCode)
      .maybeSingle();

    if (error) {
      console.error("Gagal memeriksa kode rujukan:", error.message);
      return {
        success: false,
        message: "Terjadi gangguan saat memverifikasi kode. Silakan coba beberapa saat lagi.",
      };
    }

    if (!data) {
      return {
        success: false,
        message: "Kode rujukan tidak ditemukan. Silakan periksa kembali kode Anda.",
      };
    }

    const referral = data as unknown as ReferralCodeWithExam;

    // 1. Periksa status keaktifan kode
    if (!referral.is_active) {
      return {
        success: false,
        message: "Kode rujukan ini telah dinonaktifkan oleh pengawas ujian.",
      };
    }

    const now = new Date();

    // 2. Periksa masa kedaluwarsa kode
    if (referral.expires_at) {
      const expiresAt = new Date(referral.expires_at);
      if (now > expiresAt) {
        return {
          success: false,
          message: "Masa berlaku kode rujukan ini telah berakhir (kedaluwarsa).",
        };
      }
    }

    // 3. Periksa ketersediaan kuota
    if (referral.max_uses !== null && referral.current_uses >= referral.max_uses) {
      return {
        success: false,
        message: "Batas kuota penggunaan untuk kode rujukan ini telah habis.",
      };
    }

    // 4. Periksa naskah ujian terkait
    const exam = referral.exams;
    if (!exam) {
      return {
        success: false,
        message: "Naskah ujian terkait tidak ditemukan atau telah dihapus.",
      };
    }

    // 5. Periksa status publikasi naskah ujian
    if (!exam.is_published) {
      return {
        success: false,
        message: "Naskah ujian ini belum dibuka atau belum dipublikasikan oleh pengawas.",
      };
    }

    // 6. Periksa apakah jadwal ujian telah selesai
    const examEnd = new Date(exam.ends_at);
    if (now > examEnd) {
      return {
        success: false,
        message: "Jadwal pelaksanaan naskah ujian ini telah selesai.",
      };
    }

    // 7. Seluruh verifikasi lolos, kembalikan hanya data yang aman untuk peserta
    return {
      success: true,
      data: {
        referralCode: referral.code,
        referralCodeId: referral.id,
        exam: {
          id: exam.id,
          title: exam.title,
          description: exam.description,
          duration_minutes: exam.duration_minutes,
          starts_at: exam.starts_at,
          ends_at: exam.ends_at,
          class_options: Array.isArray(exam.class_options)
            ? exam.class_options
            : [],
        },
        serverTime: now.toISOString(),
      },
    };
  } catch (err) {
    console.error("Kesalahan internal saat verifikasi kode:", err);
    return {
      success: false,
      message: "Terjadi kesalahan sistem saat memproses verifikasi kode.",
    };
  }
}

