import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { supabaseResponse, user } = await updateSession(request);

  // Proteksi rute admin (seluruh /admin/* kecuali /admin/masuk)
  if (pathname.startsWith("/admin") && pathname !== "/admin/masuk") {
    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/admin/masuk";
      loginUrl.searchParams.set("pesan", "Sesi berakhir. Silakan masuk kembali.");

      const redirectResponse = NextResponse.redirect(loginUrl);
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
      });
      return redirectResponse;
    }
  }

  // Jika admin sudah login dan mengakses /admin/masuk, alihkan ke /admin/dasbor
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

