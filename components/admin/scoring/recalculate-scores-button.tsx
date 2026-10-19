"use client";

import React, { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Calculator, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { recalculateExamScoresAction } from "@/actions/scoring";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface RecalculateScoresButtonProps {
  examId: string;
  variant?: "outline" | "default" | "secondary";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function RecalculateScoresButton({
  examId,
  variant = "outline",
  size = "sm",
  className,
}: RecalculateScoresButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleRecalculate = () => {
    setStatusMessage(null);
    startTransition(async () => {
      try {
        const result = await recalculateExamScoresAction(examId);
        if (result.success) {
          setStatusMessage({
            type: "success",
            text: result.message,
          });
          setTimeout(() => {
            setIsOpen(false);
            setStatusMessage(null);
          }, 1500);
        } else {
          setStatusMessage({
            type: "error",
            text: result.message || "Gagal mengalkulasi ulang nilai.",
          });
        }
      } catch (err) {
        setStatusMessage({
          type: "error",
          text: err instanceof Error ? err.message : "Terjadi kesalahan internal.",
        });
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={className}
          aria-label="Kalkulasi Ulang Nilai Ujian"
        >
          <Calculator className="size-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Hitung Ulang Nilai</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex size-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
            <Calculator className="size-5" />
          </div>
          <DialogTitle className="text-base font-semibold">
            Kalkulasi Ulang Nilai Peserta
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
            Tindakan ini akan mengevaluasi kembali seluruh lembar jawaban peserta yang telah selesai
            berdasarkan kunci jawaban terkini dan memperbarui akumulasi total nilai secara otomatis.
          </DialogDescription>
        </DialogHeader>

        {statusMessage && (
          <div
            className={`flex items-start gap-2.5 rounded-lg border p-3 text-xs ${
              statusMessage.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
                : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300"
            }`}
          >
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="size-4 shrink-0 text-rose-600 dark:text-rose-400" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => setIsOpen(false)}
          >
            Batal
          </Button>
          <Button
            type="button"
            className="bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            disabled={isPending}
            onClick={handleRecalculate}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Menghitung...
              </>
            ) : (
              "Mulai Kalkulasi Ulang"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

