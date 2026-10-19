import { verifyActiveSessionAction } from "@/actions/exam-session";
import { ExamRoomShell } from "@/components/exam-room/exam-room-shell";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

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

  const auth = await verifyActiveSessionAction(sessionId);

  if (!auth.valid) {
    if (auth.session?.is_completed) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
          <Card className="w-full max-w-md border-slate-200 text-center shadow-sm dark:border-slate-800">
            <CardHeader className="flex flex-col items-center">
              <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <CheckCircle2 className="size-6" />
              </div>
              <CardTitle className="text-xl">Ujian Telah Diselesaikan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
              <p>
                Sesi ujian untuk peserta <strong>{auth.session.student_name}</strong> telah berhasil dikumpulkan dan ditutup.
              </p>
              <Link href="/" className="block">
                <Button className="w-full bg-indigo-600 text-white hover:bg-indigo-700">
                  Kembali ke Halaman Beranda
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Jika token tidak valid atau tidak cocok
    redirect("/");
  }

  return <ExamRoomShell sessionId={sessionId} />;
}

