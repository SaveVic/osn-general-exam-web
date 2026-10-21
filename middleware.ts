import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Proteksi & manajemen sesi rute admin (hanya dieksekusi untuk /admin/*)
  // Menghindarkan pemanggilan Supabase Auth pada rute peserta (/ dan /ujian/*)
  if (pathname.startsWith("/admin")) {
    const { supabaseResponse, user } = await updateSession(request);

    // Jika belum login dan mencoba mengakses area terproteksi /admin/*
    if (pathname !== "/admin/masuk" && !user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/admin/masuk";
      loginUrl.searchParams.set("pesan", "Sesi berakhir. Silakan masuk kembali.");

      const redirectResponse = NextResponse.redirect(loginUrl);
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
      });
      return redirectResponse;
    }

    // Jika sudah login dan membuka halaman masuk /admin/masuk
    if (pathname === "/admin/masuk" && user) {
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = "/admin/dasbor";
      dashboardUrl.searchParams.delete("pesan");

      const redirectResponse = NextResponse.redirect(dashboardUrl);
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
      });
      return redirectResponse;
    }

    return supabaseResponse;
  }

  // 2. Proteksi rute ruang ujian peserta (/ujian/* selain /ujian/selesai)
  // Cukup verifikasi keberadaan cookie exam_token tanpa memanggil Supabase Auth
  if (pathname.startsWith("/ujian") && pathname !== "/ujian/selesai") {
    const examToken = request.cookies.get("exam_token")?.value;
    if (!examToken) {
      const gateUrl = request.nextUrl.clone();
      gateUrl.pathname = "/";
      return NextResponse.redirect(gateUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Cocokkan semua jalur permintaan kecuali:
     * - _next/static (berkas statis Next.js)
     * - _next/image (berkas optimasi gambar)
     * - favicon.ico (berkas favicon)
     * - berkas ekstensi media umum (svg, png, jpg, jpeg, gif, webp)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

