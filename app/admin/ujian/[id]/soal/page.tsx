import { getAdminUser } from "@/actions/auth";
import { getExamById } from "@/actions/exams";
import { getExamQuestions } from "@/actions/questions";
import { QuestionBankManager } from "@/components/admin/questions/question-bank-manager";
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
    <div className="space-y-6">
      <QuestionBankManager exam={exam} questions={questions} />
    </div>
  );
}
