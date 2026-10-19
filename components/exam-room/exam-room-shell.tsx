"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useExamSessionStore } from "@/lib/stores/exam-session-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExamTimer } from "./exam-timer";
import { QuestionCard } from "./question-card";
import { BottomNavigationBar } from "./bottom-navigation-bar";
import { FinishExamDialog } from "./finish-exam-dialog";
import { AlertCircle, CheckCircle2, GraduationCap, Send, User } from "lucide-react";
import Link from "next/link";

interface ExamRoomShellProps {
  sessionId: string;
}

export function ExamRoomShell({ sessionId }: ExamRoomShellProps) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [isFinishDialogOpen, setIsFinishDialogOpen] = useState(false);

  const storeSessionId = useExamSessionStore((state) => state.sessionId);
  const examTitle = useExamSessionStore((state) => state.examTitle);
  const studentName = useExamSessionStore((state) => state.studentName);
  const studentClass = useExamSessionStore((state) => state.studentClass);
  const questions = useExamSessionStore((state) => state.questions);
  const currentIndex = useExamSessionStore((state) => state.currentIndex);
  const serverEndTime = useExamSessionStore((state) => state.serverEndTime);
  const answersMap = useExamSessionStore((state) => state.answersMap);
  const flaggedMap = useExamSessionStore((state) => state.flaggedMap);
  const isSubmitted = useExamSessionStore((state) => state.isSubmitted);

  const prevQuestion = useExamSessionStore((state) => state.prevQuestion);
  const nextQuestion = useExamSessionStore((state) => state.nextQuestion);
  const toggleFlag = useExamSessionStore((state) => state.toggleFlag);
  const setSubmitted = useExamSessionStore((state) => state.setSubmitted);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Perhitungan statistik pengerjaan
  const totalQuestions = questions.length;

  const answeredCount = useMemo(() => {
    return questions.filter((q) => {
      const ans = answersMap[q.id];
      if (!ans) return false;
      if (typeof ans === "object") {
        if ("selected" in ans) {
          const sel = (ans as { selected?: unknown }).selected;
          return Array.isArray(sel) ? sel.length > 0 : Boolean(sel);
        }
        if ("text" in ans) {
          const txt = (ans as { text?: unknown }).text;
          return typeof txt === "string" && txt.trim().length > 0;
        }
      }
      return Boolean(ans);
    }).length;
  }, [questions, answersMap]);

  const unansweredCount = Math.max(0, totalQuestions - answeredCount);

  const flaggedCount = useMemo(() => {
    return questions.filter((q) => Boolean(flaggedMap[q.id])).length;
  }, [questions, flaggedMap]);

  // Handler navigasi keyboard (ArrowLeft / ArrowRight)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Abaikan jika fokus sedang berada pada input atau textarea
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prevQuestion();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        nextQuestion();
      }
    },
    [prevQuestion, nextQuestion]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

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

  // Jika ujian sudah berstatus dikumpulkan / selesai
  if (isSubmitted) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
        <Card className="max-w-md w-full border-emerald-200 dark:border-emerald-900/60 shadow-md">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 mb-2">
              <CheckCircle2 className="size-6" />
            </div>
            <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Ujian Berhasil Diselesaikan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center text-xs text-slate-600 dark:text-slate-300">
            <p className="leading-relaxed">
              Terima kasih, <strong>{studentName}</strong> ({studentClass}). Seluruh lembar pengerjaan untuk ujian <strong>{examTitle}</strong> telah tercatat dan diserahkan.
            </p>
            <div className="rounded-lg bg-slate-100 dark:bg-slate-800/80 p-3 text-xs space-y-1">
              <div>Total Soal: <strong>{totalQuestions}</strong> butir</div>
              <div>Soal Terjawab: <strong className="text-emerald-600 dark:text-emerald-400">{answeredCount}</strong> butir</div>
            </div>
            <Link href="/" className="block pt-2">
              <Button variant="outline" className="w-full">
                Kembali ke Halaman Utama
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
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 py-2.5 sm:py-3 dark:border-slate-800 dark:bg-slate-900/95 shadow-2xs">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 sm:gap-6">
          {/* Sisi Kiri: Judul Ujian & Identitas Siswa */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-indigo-200 text-indigo-700 dark:border-indigo-800 dark:text-indigo-300 text-xs hidden sm:inline-flex">
                Sesi Aktif
              </Badge>
              <h1 className="truncate text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                {examTitle}
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span className="flex items-center gap-1">
                <User className="size-3" />
                <span className="truncate max-w-[100px] sm:max-w-none">{studentName}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <GraduationCap className="size-3" />
                <span>Kelas {studentClass}</span>
              </span>
            </div>
          </div>

          {/* Tengah: Penghitung Waktu Riil */}
          <div className="shrink-0">
            <ExamTimer
              serverEndTime={serverEndTime}
              onExpire={() => setIsFinishDialogOpen(true)}
            />
          </div>

          {/* Sisi Kanan: Aksi Selesaikan Ujian */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              size="sm"
              onClick={() => setIsFinishDialogOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 h-9 px-3 sm:px-4 shadow-xs"
            >
              <Send className="size-3.5" />
              <span className="hidden md:inline">Selesaikan Ujian</span>
              <span className="md:hidden">Selesai</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Konten Lembar Soal Aktif */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-3.5 sm:p-6 md:p-8 space-y-6">
        {currentQuestion ? (
          <QuestionCard
            question={currentQuestion}
            questionNumber={currentIndex + 1}
            totalQuestions={totalQuestions}
            isFlagged={Boolean(flaggedMap[currentQuestion.id])}
          />
        ) : (
          <div className="text-center py-12 text-slate-500 text-sm">
            Tidak ada butir soal yang dapat ditampilkan pada nomor ini.
          </div>
        )}
      </main>

      {/* Bilah Navigasi Bawah Sticky */}
      {totalQuestions > 0 && (
        <BottomNavigationBar
          currentIndex={currentIndex}
          totalQuestions={totalQuestions}
          isFlagged={Boolean(currentQuestion && flaggedMap[currentQuestion.id])}
          onPrev={prevQuestion}
          onNext={nextQuestion}
          onToggleFlag={() => {
            if (currentQuestion) {
              toggleFlag(currentQuestion.id);
            }
          }}
          onRequestFinish={() => setIsFinishDialogOpen(true)}
        />
      )}

      {/* Dialog Konfirmasi Penyerahan Ujian */}
      <FinishExamDialog
        open={isFinishDialogOpen}
        onOpenChange={setIsFinishDialogOpen}
        totalQuestions={totalQuestions}
        answeredCount={answeredCount}
        unansweredCount={unansweredCount}
        flaggedCount={flaggedCount}
        onConfirmSubmit={() => {
          setSubmitted(true);
        }}
      />
    </div>
  );
}
