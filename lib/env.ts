import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_URL wajib disetel.")
    .url("NEXT_PUBLIC_SUPABASE_URL harus berupa URL Supabase valid (contoh: https://xxx.supabase.co)."),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY tidak boleh kosong."),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY tidak boleh kosong."),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

let parsedEnv: Env | null = null;

/**
 * Validasi fail-fast variabel lingkungan aplikasi.
 * Memberikan pesan diagnostik jelas jika terdapat variabel yang belum disetel pada Vercel Dashboard.
 */
export function getEnv(): Env {
  if (parsedEnv) {
    return parsedEnv;
  }

  // Fallback aman untuk lingkungan unit testing Vitest saat database di-mock
  if (process.env.NODE_ENV === "test") {
    return {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mock-test.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "mock-anon-key-test",
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "mock-service-role-key-test",
      NODE_ENV: "test",
    };
  }

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const errorDetails = Object.entries(result.error.flatten().fieldErrors)
      .map(([field, errs]) => `  - ${field}: ${(errs || []).join(", ")}`)
      .join("\n");

    const message = `\n❌ [FATAL CONFIG ERROR] Variabel lingkungan sistem tidak valid:\n${errorDetails}\nPastikan variabel lingkungan telah disetel dengan benar di file .env.local atau di panel Vercel Project Settings.\n`;
    console.error(message);
    throw new Error(message);
  }

  parsedEnv = result.data;
  return parsedEnv;
}
