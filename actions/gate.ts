"use server";

import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/admin";
import { hashSessionToken } from "@/lib/security/session-token";
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
  resumableSessionId?: string;
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

    // 3. Periksa naskah ujian terkait
    const exam = referral.exams;
    if (!exam) {
      return {
        success: false,
        message: "Naskah ujian terkait tidak ditemukan atau telah dihapus.",
      };
    }

    // 4. Periksa apakah pemanggil adalah pemilik sesi aktif untuk naskah ujian ini
    let examToken: string | undefined;
    try {
      const cookieStore = await cookies();
      examToken = cookieStore.get("exam_token")?.value;
    } catch {
      examToken = undefined;
    }
    let isCurrentSessionOwner = false;
    let existingSessionId: string | undefined = undefined;

    if (examToken) {
      const tokenHash = hashSessionToken(examToken);
      const { data: existingSession } = await supabase
        .from("exam_sessions")
        .select("id, is_completed, exam_id, started_at")
        .eq("session_token_hash", tokenHash)
        .eq("exam_id", exam.id)
        .eq("is_completed", false)
        .maybeSingle();

      if (existingSession) {
        const durationMs = exam.duration_minutes * 60 * 1000;
        const examEndMs = new Date(exam.ends_at).getTime();
        const startedMs = new Date(existingSession.started_at).getTime();
        const sessionEndMs = Math.min(startedMs + durationMs, examEndMs);

        if (now.getTime() < sessionEndMs) {
          isCurrentSessionOwner = true;
          existingSessionId = existingSession.id;
        }
      }
    }

    // 5. Periksa ketersediaan kuota (dikecualikan jika pemanggil sedang memulihkan sesi aktif miliknya)
    if (!isCurrentSessionOwner && referral.max_uses !== null && referral.current_uses >= referral.max_uses) {
      return {
        success: false,
        message: "Batas kuota penggunaan untuk kode rujukan ini telah habis.",
      };
    }

    // 6. Periksa status publikasi naskah ujian
    if (!exam.is_published) {
      return {
        success: false,
        message: "Naskah ujian ini belum dibuka atau belum dipublikasikan oleh pengawas.",
      };
    }

    // 7. Periksa apakah jadwal ujian telah selesai
    const examEnd = new Date(exam.ends_at);
    if (now > examEnd) {
      return {
        success: false,
        message: "Jadwal pelaksanaan naskah ujian ini telah selesai.",
      };
    }

    // 8. Seluruh verifikasi lolos, kembalikan hanya data yang aman untuk peserta
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
        resumableSessionId: existingSessionId,
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

