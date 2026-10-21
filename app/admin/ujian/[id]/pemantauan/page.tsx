import { getAdminUser } from "@/actions/auth";
import { getExamMonitoringData } from "@/actions/session-monitoring";
import { SessionMonitoringView } from "@/components/admin/monitoring/session-monitoring-view";
import { Activity } from "lucide-react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Pemantauan Sesi",
  description: "Pemantauan progres dan sinkronisasi sesi peserta secara real-time di ExamLab.",
  robots: {
    index: false,
    follow: false,
  },
};

interface ExamMonitoringPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ExamMonitoringPage({
  params,
}: ExamMonitoringPageProps) {
  const user = await getAdminUser();

  if (!user) {
    redirect("/admin/masuk?pesan=Sesi+berakhir.+Silakan+masuk+kembali.");
  }

  const { id } = await params;
  const result = await getExamMonitoringData(id);

  if (!result.success || !result.exam) {
    notFound();
  }

  const {
    exam,
    totalQuestions = 0,
    sessions = [],
    serverTime = new Date().toISOString(),
  } = result;

  return (
    <div className="space-y-6">
      {/* Judul Halaman */}
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
          <Activity className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Pemantauan Sesi Aktif
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Pantau status pengerjaan peserta secara langsung, waktu sinkronisasi terakhir, dan lakukan tindakan darurat paksa kumpulkan.
          </p>
        </div>
      </div>

      {/* Komponen Utama Pemantauan Sesi */}
      <SessionMonitoringView
        exam={exam}
        totalQuestions={totalQuestions}
        initialSessions={sessions}
        initialServerTime={serverTime}
      />
    </div>
  );
}
