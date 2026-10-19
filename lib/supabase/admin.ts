import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Membuat klien Supabase dengan Service Role Key.
 * HANYA boleh dipanggil di lingkungan server (Server Actions / Route Handlers)
 * untuk operasi aman yang membutuhkan bypass RLS terkontrol (misal: verifikasi kode rujukan oleh siswa anonim).
 */
export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Konfigurasi Supabase Service Role tidak lengkap pada environment variables."
    );
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

