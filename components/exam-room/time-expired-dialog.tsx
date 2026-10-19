"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, Clock, Loader2, RotateCcw } from "lucide-react";

interface TimeExpiredDialogProps {
  open: boolean;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
}

export function TimeExpiredDialog({
  open,
  isSubmitting = true,
  errorMessage = null,
  onRetry,
}: TimeExpiredDialogProps) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="max-w-md p-6 text-center sm:p-8 [&>button]:hidden"
      >
        <DialogHeader className="flex flex-col items-center space-y-3">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
            <Clock className="size-7" />
          </div>
          <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Waktu Pengerjaan Telah Habis
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Waktu Pengerjaan Telah Habis. Sistem sedang mengumpulkan lembar jawaban Anda secara otomatis.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {errorMessage ? (
            <div className="space-y-4">
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-left text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <div className="flex-1 leading-relaxed">
                  <strong>Galat Pengumpulan:</strong> {errorMessage}
                </div>
              </div>

              {onRetry && (
                <Button
                  type="button"
                  onClick={onRetry}
                  className="w-full gap-2 bg-indigo-600 text-xs text-white hover:bg-indigo-700"
                >
                  <RotateCcw className="size-3.5" />
                  <span>Coba Kirim Ulang Sekarang</span>
                </Button>
              )}
            </div>
          ) : isSubmitting ? (
            <div className="flex flex-col items-center justify-center space-y-2.5 py-2">
              <Loader2 className="size-6 animate-spin text-indigo-600 dark:text-indigo-400" />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Menyinkronkan dan mengumpulkan lembar jawaban ke server...
              </p>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

