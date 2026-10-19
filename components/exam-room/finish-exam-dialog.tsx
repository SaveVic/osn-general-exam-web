"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Flag,
  HelpCircle,
  Loader2,
  Send,
} from "lucide-react";

interface FinishExamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalQuestions: number;
  answeredCount: number;
  unansweredCount: number;
  flaggedCount: number;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  onConfirmSubmit: () => void;
}

export function FinishExamDialog({
  open,
  onOpenChange,
  totalQuestions,
  answeredCount,
  unansweredCount,
  flaggedCount,
  isSubmitting = false,
  errorMessage = null,
  onConfirmSubmit,
}: FinishExamDialogProps) {
  const hasIncomplete = unansweredCount > 0 || flaggedCount > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        // Cegah penutupan dialog jika sedang dalam proses submit
        if (!isSubmitting) {
          onOpenChange(nextOpen);
        }
      }}
    >
      <DialogContent className="max-w-md p-6">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <Send className="size-5 text-indigo-600 dark:text-indigo-400" />
            <DialogTitle className="text-lg font-bold">
              Konfirmasi Pengumpulan Ujian
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            Pastikan seluruh jawaban Anda telah terisi dengan benar sebelum mengumpulkan lembar ujian.
          </DialogDescription>
        </DialogHeader>

        {/* Ringkasan Status Soal */}
        <div className="grid grid-cols-3 gap-2 py-3 text-center">
          {/* Sudah Dijawab */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/30">
            <div className="mb-1 flex justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4" />
            </div>
            <div className="font-mono text-xl font-bold text-emerald-700 dark:text-emerald-300">
              {answeredCount}
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-400">
              Terjawab
            </div>
          </div>

          {/* Belum Dijawab */}
          <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 dark:border-rose-900/60 dark:bg-rose-950/30">
            <div className="mb-1 flex justify-center text-rose-600 dark:text-rose-400">
              <HelpCircle className="size-4" />
            </div>
            <div className="font-mono text-xl font-bold text-rose-700 dark:text-rose-300">
              {unansweredCount}
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-400">
              Kosong
            </div>
          </div>

          {/* Bertanda Ragu-ragu */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900/60 dark:bg-amber-950/30">
            <div className="mb-1 flex justify-center text-amber-600 dark:text-amber-400">
              <Flag className="size-4 fill-amber-500" />
            </div>
            <div className="font-mono text-xl font-bold text-amber-700 dark:text-amber-300">
              {flaggedCount}
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-400">
              Ragu-ragu
            </div>
          </div>
        </div>

        {/* Kalimat Rekapitulasi Resmi Spesifikasi F4-04 */}
        <p className="rounded-lg bg-slate-100 p-2.5 text-center text-xs text-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
          Anda telah menjawab <strong>{answeredCount}</strong> dari <strong>{totalQuestions}</strong> soal. Terdapat <strong>{unansweredCount}</strong> soal yang belum dijawab dan <strong>{flaggedCount}</strong> soal bertanda ragu-ragu.
        </p>

        {/* Kotak Galat jika Submit Mengalami Masalah */}
        {errorMessage && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <div className="leading-relaxed">
              <strong>Gagal Mengumpulkan:</strong> {errorMessage}
            </div>
          </div>
        )}

        {/* Peringatan Jika Masih Ada Soal Kosong atau Ragu */}
        {hasIncomplete ? (
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="leading-relaxed">
              <strong>Perhatian:</strong> Masih terdapat {unansweredCount} butir belum dijawab dan {flaggedCount} butir bertanda ragu-ragu. Setelah dikumpulkan, sesi ujian akan ditutup secara permanen.
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div className="leading-relaxed">
              Semua {totalQuestions} butir soal telah berhasil Anda jawab! Anda siap mengumpulkan lembar ujian.
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 pt-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Periksa Kembali
          </Button>
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={onConfirmSubmit}
            className="gap-1.5 bg-emerald-600 text-xs text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Mengumpulkan...</span>
              </>
            ) : (
              <>
                <Send className="size-3.5" />
                <span>Ya, Kumpulkan Sekarang</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
