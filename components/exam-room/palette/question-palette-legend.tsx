"use client";

import React from "react";
import { Flag } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuestionPaletteLegendProps {
  totalQuestions: number;
  answeredCount: number;
  unansweredCount: number;
  flaggedCount: number;
  className?: string;
}

export function QuestionPaletteLegend({
  totalQuestions,
  answeredCount,
  unansweredCount,
  flaggedCount,
  className,
}: QuestionPaletteLegendProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {/* Baris Ringkasan Angka Statistik */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {/* Sudah Dijawab */}
        <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 p-2 dark:border-indigo-900/50 dark:bg-indigo-950/30">
          <div className="font-mono text-base font-bold text-indigo-700 dark:text-indigo-300">
            {answeredCount}
          </div>
          <div className="text-[10px] font-medium text-slate-600 dark:text-slate-400">
            Dijawab
          </div>
        </div>

        {/* Belum Dijawab / Kosong */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="font-mono text-base font-bold text-slate-700 dark:text-slate-300">
            {unansweredCount}
          </div>
          <div className="text-[10px] font-medium text-slate-600 dark:text-slate-400">
            Kosong
          </div>
        </div>

        {/* Ragu-ragu */}
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-2 dark:border-amber-900/50 dark:bg-amber-950/30">
          <div className="font-mono text-base font-bold text-amber-700 dark:text-amber-300">
            {flaggedCount}
          </div>
          <div className="text-[10px] font-medium text-slate-600 dark:text-slate-400">
            Ragu
          </div>
        </div>
      </div>

      {/* Legenda Keterangan Visual */}
      <div className="border-t border-slate-100 pt-2.5 dark:border-slate-800/80">
        <div className="mb-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
          Keterangan Status ({totalQuestions} Soal):
        </div>

        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs text-slate-600 dark:text-slate-400">
          {/* Sudah Dijawab */}
          <div className="flex items-center gap-2">
            <span className="size-3.5 shrink-0 rounded bg-indigo-600 shadow-2xs" />
            <span className="truncate">Sudah Dijawab</span>
          </div>

          {/* Belum Dijawab */}
          <div className="flex items-center gap-2">
            <span className="size-3.5 shrink-0 rounded border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900" />
            <span className="truncate">Belum Dijawab</span>
          </div>

          {/* Ragu-ragu */}
          <div className="flex items-center gap-2">
            <span className="relative flex size-3.5 shrink-0 items-center justify-center rounded bg-amber-500 shadow-2xs">
              <Flag className="size-2 fill-white text-white" />
            </span>
            <span className="truncate">Ragu-ragu</span>
          </div>

          {/* Sedang Aktif */}
          <div className="flex items-center gap-2">
            <span className="size-3.5 shrink-0 rounded border border-slate-300 bg-white ring-2 ring-indigo-500 ring-offset-1 dark:border-slate-700 dark:bg-slate-900 dark:ring-offset-slate-950" />
            <span className="truncate">Sedang Aktif</span>
          </div>
        </div>
      </div>
    </div>
  );
}

