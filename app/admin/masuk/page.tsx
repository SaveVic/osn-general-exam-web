import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/actions/auth";
import { Card, CardContent } from "@/components/ui/card";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Portal Admin",
};

interface LoginPageProps {
  searchParams: Promise<{
    pesan?: string;
  }>;
}

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const user = await getAdminUser();

  if (user) {
    redirect("/admin/dasbor");
  }

  const params = await searchParams;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            <ShieldCheck className="size-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Portal Admin
          </h1>
        </div>

        <Card className="border-slate-200 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <CardContent className="pt-6">
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
