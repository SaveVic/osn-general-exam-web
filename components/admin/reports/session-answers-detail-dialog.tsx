"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getSessionAnswerDetailsAction,
  type SessionAnswerDetailsResult,
} from "@/actions/exam-report";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Award,
  User,
  GraduationCap,
  Flag,
} from "lucide-react";

interface SessionAnswersDetailDialogProps {
  sessionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SessionAnswersDetailDialog({
  sessionId,
  open,
  onOpenChange,
}: SessionAnswersDetailDialogProps) {
  const [data, setData] = useState<SessionAnswerDetailsResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !sessionId) {
      setData(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    getSessionAnswerDetailsAction(sessionId)
      .then((res) => {
        if (!isMounted) return;
        if (res.success) {
          setData(res);
        } else {
          setError(res.message || "Gagal memuat rincian jawaban peserta.");
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setError("Terjadi kesalahan jaringan saat memuat rincian lembar jawaban.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [open, sessionId]);

  const session = data?.session;
  const questions = data?.questions || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Rincian Lembar Jawaban Peserta
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Pratinjau butir soal, perbandingan jawaban peserta terhadap kunci, dan perolehan skor.
              </DialogDescription>
            </div>
          </div>

          {session && (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1 font-semibold text-slate-900 dark:text-slate-100">
                <User className="size-3.5 text-slate-400" />
                {session.studentName}
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="flex items-center gap-1">
                <GraduationCap className="size-3.5 text-slate-400" />
                Kelas {session.studentClass}
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400">
                <Award className="size-3.5" />
                Skor: {session.totalScore !== null ? session.totalScore : "-"} Poin
              </span>
              <Badge
                variant={session.isCompleted ? "success" : "warning"}
                className="ml-auto text-[10px]"
              >
                {session.isCompleted ? "Selesai" : "Sedang Mengerjakan"}
              </Badge>
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 scrollbar-thin overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
              <Loader2 className="size-8 animate-spin text-indigo-600 dark:text-indigo-400" />
              <p className="mt-2 text-xs">Memuat rincian lembar jawaban...</p>
            </div>
          ) : error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-center text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
              {error}
            </div>
          ) : questions.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              Tidak ada data butir soal yang dapat ditampilkan.
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((q) => {
                const isCorrect = q.isCorrect;
                const isUnanswered =
                  q.studentAnswer === null ||
                  q.studentAnswer === undefined ||
                  q.studentAnswer === "" ||
                  (Array.isArray(q.studentAnswer) && q.studentAnswer.length === 0);

                return (
                  <div
                    key={q.questionId}
                    className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs transition-all dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="flex size-6 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          #{q.orderIndex}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] font-medium tracking-wider text-slate-500 uppercase"
                        >
                          {q.questionType === "single_choice"
                            ? "Pilihan Ganda"
                            : q.questionType === "multiple_choice"
                            ? "Pilihan Jamak"
                            : "Isian Singkat"}
                        </Badge>
                        {q.isFlagged && (
                          <Badge
                            variant="warning"
                            className="flex items-center gap-1 text-[10px]"
                          >
                            <Flag className="size-2.5" />
                            Ragu-ragu
                          </Badge>
                        )}
                      </div>

                      <div>
                        {isUnanswered ? (
                          <Badge
                            variant="outline"
                            className="border-slate-300 bg-slate-100 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          >
                            <HelpCircle className="mr-1 size-3 text-slate-400" />
                            Kosong (0 Poin)
                          </Badge>
                        ) : isCorrect ? (
                          <Badge
                            variant="success"
                            className="text-[11px] font-semibold"
                          >
                            <CheckCircle2 className="mr-1 size-3 text-emerald-600 dark:text-emerald-400" />
                            Benar (+{q.awardedScore ?? q.points} Poin)
                          </Badge>
                        ) : (
                          <Badge
                            variant="destructive"
                            className="text-[11px] font-semibold"
                          >
                            <XCircle className="mr-1 size-3" />
                            Salah (0 Poin)
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Pratinjau Teks Soal */}
                    <div className="mt-2.5 text-xs leading-relaxed font-medium text-slate-700 dark:text-slate-300">
                      {q.promptPreview}
                    </div>

                    {/* Komparasi Jawaban */}
                    <div className="mt-3.5 grid grid-cols-1 gap-2.5 rounded-lg border border-slate-100 bg-slate-50/70 p-3 sm:grid-cols-2 dark:border-slate-800/60 dark:bg-slate-950/40">
                      <div>
                        <div className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                          Jawaban Peserta
                        </div>
                        <div
                          className={`mt-1 font-mono text-xs font-semibold ${
                            isUnanswered
                              ? "text-slate-400 italic"
                              : isCorrect
                              ? "text-emerald-700 dark:text-emerald-300"
                              : "text-rose-700 dark:text-rose-300"
                          }`}
                        >
                          {q.formattedStudentAnswer === "-"
                            ? "(Tidak dijawab)"
                            : q.formattedStudentAnswer}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                          Kunci / Jawaban Benar
                        </div>
                        <div className="mt-1 font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {q.formattedCorrectAnswer}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t border-slate-200 px-6 py-3 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

