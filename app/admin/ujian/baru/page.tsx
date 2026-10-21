import { getAdminUser } from "@/actions/auth";
import { AdminHeader } from "@/components/admin/admin-header";
import { ExamForm } from "@/components/admin/exam-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, BookPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Buat Naskah Baru",
  description: "Penyusunan paket naskah ujian baru di ExamLab.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function NewExamPage() {
  const user = await getAdminUser();

  if (!user) {
    redirect("/admin/masuk?pesan=Sesi+berakhir.+Silakan+masuk+kembali.");
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminHeader userEmail={user.email ?? "admin@exam.local"} />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href="/admin/dasbor"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
          >
            <ArrowLeft className="size-3.5" />
            Kembali ke Dasbor
          </Link>
        </div>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            <BookPlus className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Buat Naskah Ujian Baru
            </h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              Atur judul, durasi pengerjaan, rentang jadwal pelaksanaan, dan daftar pilihan kelas.
            </p>
          </div>
        </div>

        <Card className="border-slate-200 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <CardHeader>
            <CardTitle className="text-base">Informasi & Konfigurasi Ujian</CardTitle>
            <CardDescription>
              Pastikan rentang waktu selesai lebih lambat dari waktu mulai ujian.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ExamForm mode="create" />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

