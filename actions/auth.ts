"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export interface AuthState {
  success: boolean;
  error?: string;
}

export async function loginAdmin(
  prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const username = formData.get("username")?.toString().trim();
  const password = formData.get("password")?.toString();

  if (!username || !password) {
    return {
      success: false,
      error: "Nama pengguna dan kata sandi wajib diisi.",
    };
  }

  // Pemetaan nama pengguna ke email sintetis internal jika belum berformat email
  const email = username.includes("@")
    ? username.toLowerCase()
    : `${username.toLowerCase()}@exam.local`;

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Pesan galat ramah dalam Bahasa Indonesia
    if (error.message.toLowerCase().includes("invalid login credentials")) {
      return {
        success: false,
        error: "Nama pengguna atau kata sandi tidak valid.",
      };
    }

    if (error.message.toLowerCase().includes("rate limit")) {
      return {
        success: false,
        error: "Terlalu banyak percobaan masuk yang gagal. Silakan coba lagi beberapa saat lagi.",
      };
    }

    return {
      success: false,
      error: "Gagal memverifikasi akun pengelola: " + error.message,
    };
  }

  redirect("/admin/dasbor");
}

export async function logoutAdmin(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/masuk");
}

export async function getAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

