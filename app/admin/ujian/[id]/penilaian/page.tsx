import { getAdminUser } from "@/actions/auth";
import { getManualEvaluationData } from "@/actions/manual-evaluation";
import { ManualEvaluationView } from "@/components/admin/evaluation/manual-evaluation-view";
import { FileEdit } from "lucide-react";
import { notFound, redirect } from "next/navigation";

interface ExamEvaluationPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ExamEvaluationPage({ params }: ExamEvaluationPageProps) {
  const user = await getAdminUser();

  if (!user) {
    redirect("/admin/masuk?pesan=Sesi+berakhir.+Silakan+masuk+kembali.");
  }

  const { id } = await params;
  const result = await getManualEvaluationData(id);

  if (!result.success || !result.exam) {
    notFound();
  }

  const { exam, questions = [], submissions = [] } = result;

  return (
    <div className="space-y-6">
      {/* Judul Halaman */}
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
          <FileEdit className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Penilaian Manual Soal Isian
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Periksa lembar jawaban peserta khusus butir isian singkat / esai dan tetapkan perolehan nilai berdasarkan rubrik.
          </p>
        </div>
      </div>

      {/* View Utama Penilaian Manual */}
      <ManualEvaluationView
        exam={exam}
        questions={questions}
        initialSubmissions={submissions}
      />
    </div>
  );
}
