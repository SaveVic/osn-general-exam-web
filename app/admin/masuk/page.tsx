import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";

interface LoginPageProps {
  searchParams: Promise<{
    pesan?: string;
  }>;
}

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            <ShieldCheck className="size-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Portal Pengelola Ujian
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kawasan terbatas untuk penyusunan dan pengawasan naskah ujian.
          </p>
        </div>

        <Card className="border-slate-200 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">Masuk Administrator</CardTitle>
            <CardDescription>
              Silakan masukkan kredensial pengelola untuk mengakses dasbor.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AdminLoginForm initialMessage={params.pesan} />
          </CardContent>
        </Card>

        <footer className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500">
          <p>
            Bukan pengelola ujian?{" "}
            <Link
              href="/"
              className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            >
              Kembali ke Lobi Peserta
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}

