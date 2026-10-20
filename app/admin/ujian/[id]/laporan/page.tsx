import { getAdminUser } from "@/actions/auth";
import { getExamReportData } from "@/actions/exam-report";
import { ExamReportView } from "@/components/admin/reports/exam-report-view";
import { BarChart3 } from "lucide-react";
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
    <div className="space-y-6">
      {/* Judul Halaman */}
      <div className="flex items-center gap-3">
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
    </div>
  );
}
