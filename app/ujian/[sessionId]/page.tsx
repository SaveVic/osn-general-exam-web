import { recoverExamSessionAction } from "@/actions/exam-session";
import { ExamRoomShell } from "@/components/exam-room/exam-room-shell";
import { redirect } from "next/navigation";

interface ExamSessionPageProps {
  params: Promise<{
    sessionId: string;
  }>;
}

export const metadata = {
  title: "Ruang Pelaksanaan Ujian - Portal Ujian Teknis",
  description: "Antarmuka pelaksanaan pengerjaan ujian daring resmi.",
};

export default async function ExamSessionPage({ params }: ExamSessionPageProps) {
  const { sessionId } = await params;

  const recovery = await recoverExamSessionAction(sessionId);

  if (!recovery.success || !recovery.data) {
    if (recovery.isCompleted) {
      redirect(`/ujian/selesai?session=${sessionId}`);
    }

    // Jika token tidak valid, sesi tidak ditemukan, atau kedaluwarsa
    redirect("/");
  }

  return <ExamRoomShell sessionId={sessionId} initialRecoveryData={recovery.data} />;
}

