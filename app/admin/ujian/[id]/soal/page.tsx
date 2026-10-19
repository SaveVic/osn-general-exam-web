import { getAdminUser } from "@/actions/auth";
import { getExamById } from "@/actions/exams";
import { getExamQuestions } from "@/actions/questions";
import { AdminHeader } from "@/components/admin/admin-header";
import { QuestionBankManager } from "@/components/admin/questions/question-bank-manager";
import { RecalculateScoresButton } from "@/components/admin/scoring/recalculate-scores-button";
import { Button } from "@/components/ui/button";
import { BarChart3, FileEdit, KeyRound, Settings } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

interface ExamQuestionsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ExamQuestionsPage({ params }: ExamQuestionsPageProps) {
  const user = await getAdminUser();

  if (!user) {
    redirect("/admin/masuk?pesan=Sesi+berakhir.+Silakan+masuk+kembali.");
  }

  const { id } = await params;
  const exam = await getExamById(id);

  if (!exam) {
    notFound();
  }

  const questions = await getExamQuestions(id);

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
              Bank Soal
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
              <Link href={`/admin/ujian/${exam.id}/pengaturan`}>
                <Settings className="size-3.5 text-slate-600 dark:text-slate-400" />
                Pengaturan Naskah
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
            <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
              <Link href={`/admin/ujian/${exam.id}/laporan`}>
                <BarChart3 className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                Laporan Nilai
              </Link>
            </Button>
            <RecalculateScoresButton examId={exam.id} />
          </div>
        </div>

        {/* Manager Bank Soal & Editor */}
        <QuestionBankManager exam={exam} questions={questions} />
      </main>
    </div>
  );
}

