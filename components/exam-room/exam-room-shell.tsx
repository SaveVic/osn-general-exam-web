"use client";

import { useEffect, useState } from "react";
import { useExamSessionStore } from "@/lib/stores/exam-session-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock, GraduationCap, ShieldCheck, User } from "lucide-react";
import Link from "next/link";

interface ExamRoomShellProps {
  sessionId: string;
}

export function ExamRoomShell({ sessionId }: ExamRoomShellProps) {
  const [isHydrated, setIsHydrated] = useState(false);

  const storeSessionId = useExamSessionStore((state) => state.sessionId);
  const examTitle = useExamSessionStore((state) => state.examTitle);
  const studentName = useExamSessionStore((state) => state.studentName);
  const studentClass = useExamSessionStore((state) => state.studentClass);
  const questions = useExamSessionStore((state) => state.questions);
  const currentIndex = useExamSessionStore((state) => state.currentIndex);
  const serverEndTime = useExamSessionStore((state) => state.serverEndTime);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center space-y-2">
          <div className="size-8 mx-auto border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500">Memuat lembar ruang ujian...</p>
        </div>
      </div>
    );
  }

  // Jika state lokal di localStorage tidak ditemukan atau sessionId tidak cocok
  if (!storeSessionId || storeSessionId !== sessionId) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
        <Card className="max-w-md w-full border-rose-200 dark:border-rose-900/60 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertCircle className="size-5" />
              <CardTitle className="text-lg">Data Sesi Tidak Ditemukan</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
            <p>
              Data lembar soal untuk sesi ujian ini tidak ditemukan pada penyimpanan lokal peramban Anda.
              Hal ini dapat terjadi jika Anda membuka tautan di jendela penyamaran (*incognito*) atau peramban yang berbeda.
            </p>
            <Link href="/" className="block">
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                Kembali ke Gerbang Masuk
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/70 dark:bg-slate-950">
      {/* Bilah Atas Sticky (Header Ruang Ujian) */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xs px-4 py-3 dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          {/* Sisi Kiri: Judul Ujian & Indikator Soal */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-indigo-200 text-indigo-700 dark:border-indigo-800 dark:text-indigo-300 text-xs">
                Sesi Ujian Aktif
              </Badge>
              <h1 className="truncate text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                {examTitle}
              </h1>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span className="flex items-center gap-1">
                <User className="size-3" />
                <span className="truncate max-w-[120px] sm:max-w-none">{studentName}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <GraduationCap className="size-3" />
                <span>Kelas {studentClass}</span>
              </span>
            </div>
          </div>

          {/* Sisi Kanan: Total Soal & Status */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
              <Clock className="size-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Batas Akhir:</span>
              <span className="font-mono tabular-nums font-semibold">
                {serverEndTime
                  ? new Intl.DateTimeFormat("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    }).format(new Date(serverEndTime))
                  : "-"}
              </span>
            </div>

            <Badge variant="secondary" className="font-mono text-xs px-2.5 py-1">
              Soal {questions.length > 0 ? currentIndex + 1 : 0} dari {questions.length}
            </Badge>
          </div>
        </div>
      </header>

      {/* Konten Ruang Ujian Inisialisasi */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Lembar Soal Nomor {currentIndex + 1}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tipe Soal: {currentQuestion?.question_type || "Pilihan Ganda"} • Bobot: {currentQuestion?.points || 0} Poin
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <ShieldCheck className="size-3" />
              <span>Sesi Terautentikasi</span>
            </span>
          </div>
        </div>

        {/* Placeholder Konten Soal untuk F3-02 & F3-03 */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base text-slate-800 dark:text-slate-200">
              Pertanyaan Butir #{currentIndex + 1}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
            <div className="prose prose-slate dark:prose-invert max-w-none">
              <p className="whitespace-pre-line">{currentQuestion?.prompt || "Memuat butir soal..."}</p>
            </div>
            <div className="rounded-lg bg-indigo-50/50 p-3 text-xs text-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-200 border border-indigo-100 dark:border-indigo-900/40">
              Sesi ujian aman telah berhasil diinisialisasi. Antarmuka pengerjaan lengkap dengan tipografi formula KaTeX dan palet navigasi soal akan ditambahkan pada tahap fitur F3-02 & F3-03.
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

