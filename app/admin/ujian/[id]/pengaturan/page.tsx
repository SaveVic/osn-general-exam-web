import { getAdminUser } from "@/actions/auth";
import { getExamById } from "@/actions/exams";
import { AdminHeader } from "@/components/admin/admin-header";
import { ExamForm } from "@/components/admin/exam-form";
import { RecalculateScoresButton } from "@/components/admin/scoring/recalculate-scores-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, BookOpen, FileEdit, KeyRound, Settings } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

interface ExamSettingsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ExamSettingsPage({ params }: ExamSettingsPageProps) {
  const user = await getAdminUser();

  if (!user) {
    redirect("/admin/masuk?pesan=Sesi+berakhir.+Silakan+masuk+kembali.");
  }

  const { id } = await params;
  const exam = await getExamById(id);

  if (!exam) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminHeader userEmail={user.email ?? "admin@exam.local"} />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/admin/dasbor"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
          >
            <ArrowLeft className="size-3.5" />
            Kembali ke Dasbor
          </Link>

          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
              <Link href={`/admin/ujian/${exam.id}/soal`}>
                <BookOpen className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                Kelola Butir Soal
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
              <Link href={`/admin/ujian/${exam.id}/kode-rujukan`}>
                <KeyRound className="size-3.5 text-amber-600 dark:text-amber-400" />
                Kode Rujukan
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
              <Link href={`/admin/ujian/${exam.id}/penilaian`}>
                <FileEdit className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                Penilaian Manual
              </Link>
            </Button>
            <RecalculateScoresButton examId={exam.id} />
          </div>
        </div>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            <Settings className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Pengaturan Naskah Ujian
            </h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              Perbarui judul, durasi pengerjaan, rentang jadwal pelaksanaan, dan daftar pilihan kelas.
            </p>
          </div>
        </div>

        <Card className="border-slate-200 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <CardHeader>
            <CardTitle className="text-base">Metadata & Konfigurasi Naskah</CardTitle>
            <CardDescription>
              Perubahan pada jadwal dan status publikasi akan langsung berlaku secara real-time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ExamForm initialData={exam} mode="edit" />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

