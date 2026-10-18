import { getAdminUser } from "@/actions/auth";
import { AdminHeader } from "@/components/admin/admin-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, FileCheck2, PlusCircle, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

export default async function AdminDashboardPage() {
  const user = await getAdminUser();

  if (!user) {
    redirect("/admin/masuk?pesan=Sesi+berakhir.+Silakan+masuk+kembali.");
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminHeader userEmail={user.email ?? "admin@exam.local"} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Ikhtisar Dasbor
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Kelola naskah ujian, bank soal, dan pantau hasil pengerjaan peserta.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button className="gap-2 bg-indigo-600 text-white hover:bg-indigo-700">
              <PlusCircle className="size-4" />
              Buat Ujian Baru
            </Button>
          </div>
        </div>

        {/* Kartu Status Metrik Ringkas */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border-slate-200 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Total Naskah Ujian
              </CardTitle>
              <BookOpen className="size-4 text-indigo-600 dark:text-indigo-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">0</div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Belum ada naskah ujian aktif
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Sesi Siswa Terdaftar
              </CardTitle>
              <Users className="size-4 text-indigo-600 dark:text-indigo-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">0</div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Total pengerjaan dari seluruh ujian
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Status Sistem
              </CardTitle>
              <FileCheck2 className="size-4 text-emerald-600 dark:text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Badge variant="success" className="text-xs">
                  Aktif & Terproteksi
                </Badge>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Sesi autentikasi aman di sisi server
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Kartu Status Selamat Datang & Langkah Selanjutnya */}
        <Card className="mt-8 border-slate-200 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Daftar Naskah Ujian
              </CardTitle>
              <Badge variant="outline">Fase 1: ADM-EXAM-01 Berikutnya</Badge>
            </div>
            <CardDescription>
              Naskah ujian yang telah dipublikasikan akan tampil di tabel ini.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 py-12 text-center dark:border-slate-800">
              <BookOpen className="size-10 text-slate-300 dark:text-slate-600" />
              <h3 className="mt-3 text-sm font-medium text-slate-900 dark:text-slate-100">
                Belum ada naskah ujian
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Mulai dengan membuat naskah ujian baru pada fitur manajemen ujian berikutnya.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

