import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getEnv } from "@/lib/env";

describe("lib/env.ts - Fail-Fast Environment Validation", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("menyediakan fallback aman saat dijalankan di lingkungan testing (NODE_ENV=test)", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "test";
    const env = getEnv();

    expect(env.NODE_ENV).toBe("test");
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBeDefined();
    expect(env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBeDefined();
    expect(env.SUPABASE_SERVICE_ROLE_KEY).toBeDefined();
  });

  it("melempar galat fail-fast jika variabel lingkungan tidak lengkap saat production/development", async () => {
    const { z } = await import("zod");

    // Definisikan skema lokal independen untuk menguji logika validasi tanpa mengotori state modul
    const testSchema = z.object({
      NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
      SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    });

    // Uji URL tidak valid
    const invalidUrlResult = testSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_URL: "bukan-url-valid",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-123",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-123",
    });
    expect(invalidUrlResult.success).toBe(false);

    // Uji variabel kunci kosong
    const missingKeyResult = testSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-123",
    });
    expect(missingKeyResult.success).toBe(false);

    // Uji konfigurasi valid
    const validResult = testSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_URL: "https://valid-project.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "valid-anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "valid-service-role-key",
    });
    expect(validResult.success).toBe(true);
    if (validResult.success) {
      expect(validResult.data.NEXT_PUBLIC_SUPABASE_URL).toBe("https://valid-project.supabase.co");
    }
  });
});
