import { getAdminUser } from "@/actions/auth";
import { getExamById } from "@/actions/exams";
import { getExamQuestions } from "@/actions/questions";
import { QuestionBankManager } from "@/components/admin/questions/question-bank-manager";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Bank Soal",
  description: "Pengelolaan butir soal, stimulus markdown, dan formula KaTeX di ExamLab.",
  robots: {
    index: false,
    follow: false,
  },
};

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
    <div className="space-y-6">
      <QuestionBankManager exam={exam} questions={questions} />
    </div>
  );
}
