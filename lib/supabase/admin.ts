import { createClient } from "@supabase/supabase-js";
import { getEnv } from "@/lib/env";

function buildServiceClient() {
  const env = getEnv();

  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

let cachedServiceClient: ReturnType<typeof buildServiceClient> | null = null;

/**
 * Membuat klien Supabase dengan Service Role Key berbasis pola Singleton.
 * HANYA boleh dipanggil di lingkungan server (Server Actions / Route Handlers)
 * untuk operasi aman yang membutuhkan bypass RLS terkontrol (misal: verifikasi kode rujukan oleh siswa anonim).
 * Pola Singleton memastikan instans klien dan koneksi HTTP di-reuse antar pemanggilan Server Action pada Vercel.
 */
export function createServiceClient() {
  if (!cachedServiceClient) {
    cachedServiceClient = buildServiceClient();
  }

  return cachedServiceClient;
}

