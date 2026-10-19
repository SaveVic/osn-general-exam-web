import { getAdminUser } from "@/actions/auth";
import { getAdminExams } from "@/actions/exams";
import { AdminHeader } from "@/components/admin/admin-header";
import { ExamList } from "@/components/admin/exam-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Globe, PlusCircle, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AdminDashboardPage() {
  const user = await getAdminUser();

  if (!user) {
    redirect("/admin/masuk?pesan=Sesi+berakhir.+Silakan+masuk+kembali.");
  }

  const exams = await getAdminExams("all");

  const totalExams = exams.length;
  const publishedExams = exams.filter((e) => e.is_published).length;
  const totalSessions = exams.reduce((acc, curr) => acc + (curr.session_count ?? 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminHeader userEmail={user.email ?? "admin@exam.local"} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header Dasbor */}
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Ikhtisar Dasbor
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Kelola naskah ujian, susun bank soal, dan pantau aktivitas peserta ujian.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button asChild className="gap-2 bg-indigo-600 text-white hover:bg-indigo-700">
              <Link href="/admin/ujian/baru">
                <PlusCircle className="size-4" />
                Buat Ujian Baru
              </Link>
            </Button>
          </div>
        </div>

        {/* Kartu Status Metrik Real-Time */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border-slate-200 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Total Naskah Ujian
              </CardTitle>
              <BookOpen className="size-4 text-indigo-600 dark:text-indigo-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-50">
                {totalExams}
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {publishedExams} naskah sedang dipublikasikan
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Sesi Peserta Terdaftar
              </CardTitle>
              <Users className="size-4 text-indigo-600 dark:text-indigo-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-50">
                {totalSessions}
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Total partisipasi siswa di seluruh ujian
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Status Publikasi
              </CardTitle>
              <Globe className="size-4 text-emerald-600 dark:text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Badge variant={publishedExams > 0 ? "success" : "secondary"} className="text-xs">
                  {publishedExams > 0 ? "Ujian Aktif Siap Diakses" : "Menunggu Publikasi"}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Akses peserta terkontrol via kode rujukan
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabel Naskah Ujian Dinamis */}
        <div className="mt-8">
          <ExamList exams={exams} />
        </div>
      </main>
    </div>
  );
}
