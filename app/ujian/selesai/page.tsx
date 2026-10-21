import React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getExamCompletionSummaryAction } from "@/actions/exam-session";
import { CheckCircle2, Home, ShieldCheck, XCircle, Award } from "lucide-react";

export const metadata = {
  title: "Ujian Selesai - Portal Ujian Teknis",
  description: "Konfirmasi penyerahan dan penyelesaian sesi pengerjaan ujian daring resmi.",
};

interface ExamFinishedPageProps {
  searchParams?: Promise<{
    session?: string;
  }>;
}

export default async function ExamFinishedPage({ searchParams }: ExamFinishedPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const sessionId = resolvedSearchParams?.session;

  const summary = sessionId
    ? await getExamCompletionSummaryAction(sessionId)
    : null;

  const showScore = Boolean(summary?.success && summary?.showScore);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50/70 p-4 dark:bg-slate-950">
      <Card className="w-full max-w-lg border-emerald-200/90 shadow-lg dark:border-emerald-900/60">
        <CardHeader className="space-y-3 pb-3 text-center">
          {/* Ikon Sukses Sentral */}
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 shadow-xs dark:bg-emerald-950/60 dark:text-emerald-400">
            <CheckCircle2 className="size-8" />
          </div>

          <div className="space-y-1">
            <div className="flex justify-center pb-1">
              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[11px] font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                <ShieldCheck className="mr-1 size-3" />
                Lembar Jawaban Tersegel Permanen
              </Badge>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Ujian Berhasil Dikirimkan
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
              {summary?.studentName ? (
                <>
                  Terima kasih{" "}
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {summary.studentName}
                  </span>
                  , telah mengikuti ujian dengan tertib.
                </>
              ) : (
                "Terima kasih telah mengikuti ujian dengan tertib."
              )}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 text-center text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          {showScore ? (
            /* Box Hasil Ujian: Skor Total, Soal Benar, dan Soal Salah */
            <div className="space-y-3">
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 text-center dark:border-indigo-950 dark:bg-indigo-950/30">
                <div className="flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                  <Award className="size-4" />
                  <span>Total Skor Perolehan</span>
                </div>
                <div className="mt-1 font-mono text-3xl font-extrabold text-indigo-900 dark:text-indigo-100">
                  {summary?.totalScore ?? 0}
                  {summary?.maxScore ? (
                    <span className="text-sm font-normal text-indigo-600 dark:text-indigo-400">
                      {" "}
                      / {summary.maxScore}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Rincian Jawaban Soal: Benar, Salah, (Kosong jika ada) */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-center dark:border-emerald-900/60 dark:bg-emerald-950/30">
                  <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Jawaban Benar</span>
                  </div>
                  <div className="mt-1 font-mono text-xl font-bold text-emerald-700 dark:text-emerald-300">
                    {summary?.correctCount ?? 0}
                    <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400"> Soal</span>
                  </div>
                </div>

                <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 text-center dark:border-rose-900/60 dark:bg-rose-950/30">
                  <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-rose-800 dark:text-rose-300">
                    <XCircle className="size-3.5 text-rose-600 dark:text-rose-400" />
                    <span>Jawaban Salah</span>
                  </div>
                  <div className="mt-1 font-mono text-xl font-bold text-rose-700 dark:text-rose-300">
                    {summary?.incorrectCount ?? 0}
                    <span className="text-xs font-normal text-rose-600 dark:text-rose-400"> Soal</span>
                  </div>
                </div>
              </div>

              {Number(summary?.unansweredCount) > 0 && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Terdapat {summary?.unansweredCount} soal yang tidak Anda jawab.
                </p>
              )}
            </div>
          ) : (
            /* Pesan Konfirmasi Resmi saat Skor Disembunyikan */
            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <p className="font-medium text-slate-900 dark:text-slate-100">
                Ujian Berhasil Dikirimkan. Terima kasih telah mengikuti ujian dengan tertib.
              </p>
              <p className="mt-2 text-slate-500 dark:text-slate-400">
                Seluruh lembar pengerjaan dan jawaban Anda telah tercatat dan tersimpan secara permanen pada sistem kami.
                Sesi ujian Anda telah ditutup dan lembar jawaban tidak dapat diubah lagi.
              </p>
            </div>
          )}

          {/* Tombol Navigasi Utama */}
          <div className="pt-2">
            <Link href="/" className="block">
              <Button className="h-10 w-full gap-2 bg-indigo-600 font-medium text-white shadow-xs hover:bg-indigo-700">
                <Home className="size-4" />
                <span>Kembali ke Halaman Beranda</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

