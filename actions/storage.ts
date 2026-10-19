"use server";

import { createClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/actions/auth";

export interface StorageUploadResult {
  success: boolean;
  message?: string;
  url?: string;
  altText?: string;
  fileName?: string;
  path?: string;
}

export interface ExamAssetItem {
  name: string;
  path: string;
  url: string;
  size?: number;
  createdAt?: string | null;
}

const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/svg+xml",
];

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

function sanitizeFilename(originalName: string): string {
  // Ambil nama tanpa ekstensi dan ekstensinya
  const lastDotIndex = originalName.lastIndexOf(".");
  const namePart = lastDotIndex !== -1 ? originalName.slice(0, lastDotIndex) : originalName;
  const extPart = lastDotIndex !== -1 ? originalName.slice(lastDotIndex).toLowerCase() : "";

  // Bersihkan karakter non-alphanumeric menjadi tanda hubung
  const cleanName = namePart
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);

  return `${cleanName || "diagram"}${extPart}`;
}

/**
 * Server Action: Mengunggah berkas diagram ujian ke Supabase Storage (exam-assets)
 */
export async function uploadExamAssetAction(
  examId: string,
  formData: FormData
): Promise<StorageUploadResult> {
  const user = await getAdminUser();
  if (!user) {
    return {
      success: false,
      message: "Sesi telah berakhir. Silakan masuk kembali sebagai administrator.",
    };
  }

  const file = formData.get("file");
  const rawAltText = formData.get("alt_text")?.toString().trim();

  if (!file || !(file instanceof File)) {
    return {
      success: false,
      message: "Tidak ada berkas gambar yang dipilih untuk diunggah.",
    };
  }

  // Validasi tipe MIME
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      success: false,
      message: "Format berkas tidak didukung. Harap pilih gambar bertipe PNG, JPG, JPEG, WebP, atau SVG.",
    };
  }

  // Validasi ukuran berkas (maksimal 2 MB)
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      success: false,
      message: `Ukuran berkas (${(file.size / (1024 * 1024)).toFixed(2)} MB) melebihi batas maksimal 2 MB.`,
    };
  }

  const sanitized = sanitizeFilename(file.name);
  const timestamp = Date.now();
  const filePath = `exams/${examId}/${timestamp}_${sanitized}`;

  const supabase = await createClient();

  const fileBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("exam-assets")
    .upload(filePath, fileBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("Gagal mengunggah ke Supabase Storage:", uploadError);

    // Deteksi bucket belum ada
    const errMessage = uploadError.message.toLowerCase();
    const isBucketNotFound =
      errMessage.includes("bucket not found") ||
      errMessage.includes("not_found") ||
      ("statusCode" in uploadError &&
        (uploadError as { statusCode?: string | number }).statusCode === "404");

    if (isBucketNotFound) {
      return {
        success: false,
        message:
          "Bucket penyimpanan 'exam-assets' belum dibuat di Supabase Storage. Silakan buka dasbor Supabase > Storage > New bucket dan buat bucket publik bernama 'exam-assets'.",
      };
    }

    return {
      success: false,
      message: `Gagal mengunggah gambar: ${uploadError.message}`,
    };
  }

  // Ambil URL Publik
  const { data: publicUrlData } = supabase.storage
    .from("exam-assets")
    .getPublicUrl(filePath);

  const finalAltText = rawAltText || file.name.replace(/\.[^/.]+$/, "");

  return {
    success: true,
    message: "Diagram berhasil diunggah.",
    url: publicUrlData.publicUrl,
    altText: finalAltText,
    fileName: file.name,
    path: filePath,
  };
}

/**
 * Server Action: Mengambil daftar diagram yang pernah diunggah untuk naskah ujian ini
 */
export async function getExamAssetsAction(examId: string): Promise<ExamAssetItem[]> {
  const user = await getAdminUser();
  if (!user) return [];

  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from("exam-assets")
    .list(`exams/${examId}`, {
      limit: 100,
      sortBy: { column: "created_at", order: "desc" },
    });

  if (error || !data) {
    return [];
  }

  return data
    .filter((item) => item.name !== ".emptyFolderPlaceholder")
    .map((item) => {
      const fullPath = `exams/${examId}/${item.name}`;
      const { data: urlData } = supabase.storage
        .from("exam-assets")
        .getPublicUrl(fullPath);

      return {
        name: item.name,
        path: fullPath,
        url: urlData.publicUrl,
        size: item.metadata?.size,
        createdAt: item.created_at,
      };
    });
}

/**
 * Server Action: Menghapus diagram dari Supabase Storage
 */
export async function deleteExamAssetAction(
  filePath: string
): Promise<{ success: boolean; message: string }> {
  const user = await getAdminUser();
  if (!user) {
    return {
      success: false,
      message: "Sesi telah berakhir. Silakan masuk kembali.",
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.storage.from("exam-assets").remove([filePath]);

  if (error) {
    return {
      success: false,
      message: `Gagal menghapus berkas: ${error.message}`,
    };
  }

  return {
    success: true,
    message: "Berkas diagram berhasil dihapus dari penyimpanan.",
  };
}
