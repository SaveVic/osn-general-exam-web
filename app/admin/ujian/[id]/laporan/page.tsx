import { getAdminUser } from "@/actions/auth";
import { getExamReportData } from "@/actions/exam-report";
import { AdminHeader } from "@/components/admin/admin-header";
import { ExamReportView } from "@/components/admin/reports/exam-report-view";
import { RecalculateScoresButton } from "@/components/admin/scoring/recalculate-scores-button";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  BookOpen,
  FileEdit,
  KeyRound,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

interface ExamReportPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ExamReportPage({ params }: ExamReportPageProps) {
  const user = await getAdminUser();

  if (!user) {
    redirect("/admin/masuk?pesan=Sesi+berakhir.+Silakan+masuk+kembali.");
  }

  const { id } = await params;
  const result = await getExamReportData(id);

  if (!result.success || !result.exam) {
    notFound();
  }

  const { exam, maxPossibleScore = 0, sessions = [] } = result;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminHeader userEmail={user.email ?? "admin@exam.local"} />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Navigasi Bar Atas / Breadcrumb */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Link
              href="/admin/dasbor"
              className="hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              Dasbor
            </Link>
            <span>/</span>
            <Link
              href={`/admin/ujian/${exam.id}/pengaturan`}
              className="max-w-50 truncate hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              {exam.title}
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              Laporan Nilai
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
              <Link href={`/admin/ujian/${exam.id}/soal`}>
                <BookOpen className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                Bank Soal
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
              <Link href={`/admin/ujian/${exam.id}/pengaturan`}>
                <Settings className="size-3.5 text-slate-600 dark:text-slate-400" />
                Pengaturan
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

        {/* Judul Halaman */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            <BarChart3 className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Rekapitulasi Nilai & Laporan Akademis
            </h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              Pantau ringkasan perolehan skor peserta, saring berdasarkan kelas, dan unduh laporan dalam format CSV.
            </p>
          </div>
        </div>

        {/* View Tabel Rekapitulasi & Ekspor CSV */}
        <ExamReportView
          exam={exam}
          maxPossibleScore={maxPossibleScore}
          sessions={sessions}
        />
      </main>
    </div>
  );
}

