import { redirect } from "next/navigation";

interface ExamEvaluationPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ExamEvaluationPage({ params }: ExamEvaluationPageProps) {
  const { id } = await params;
  redirect(`/admin/ujian/${id}/laporan`);
}

