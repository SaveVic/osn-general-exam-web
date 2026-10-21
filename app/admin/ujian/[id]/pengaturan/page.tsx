import { getAdminUser } from "@/actions/auth";
import { getExamById } from "@/actions/exams";
import { ExamForm } from "@/components/admin/exam-form";
import { Settings } from "lucide-react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Pengaturan Naskah",
  description: "Konfigurasi parameter ujian dan visibilitas nilai peserta di ExamLab.",
  robots: {
    index: false,
    follow: false,
  },
};

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
    <div className="space-y-6">
      <div className="flex items-center gap-3">
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

      <ExamForm initialData={exam} mode="edit" showPreview />
    </div>
  );
}
