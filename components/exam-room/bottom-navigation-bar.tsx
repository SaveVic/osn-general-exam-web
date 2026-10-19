"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Flag, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavigationBarProps {
  currentIndex: number;
  totalQuestions: number;
  isFlagged: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToggleFlag: () => void;
  onRequestFinish: () => void;
  className?: string;
}

export function BottomNavigationBar({
  currentIndex,
  totalQuestions,
  isFlagged,
  onPrev,
  onNext,
  onToggleFlag,
  onRequestFinish,
  className,
}: BottomNavigationBarProps) {
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === totalQuestions - 1;

  return (
    <footer
      className={cn(
        "sticky bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur-md px-4 py-3 sm:py-3.5 dark:border-slate-800 dark:bg-slate-900/95 shadow-md",
        className
      )}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 sm:gap-4">
        {/* Tombol Soal Sebelumnya */}
        <Button
          type="button"
          variant="outline"
          size="default"
          onClick={onPrev}
          disabled={isFirst}
          className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 gap-1.5 h-10 px-3 sm:px-4"
        >
          <ChevronLeft className="size-4" />
          <span className="hidden sm:inline">Soal Sebelumnya</span>
          <span className="sm:hidden">Sebelum</span>
        </Button>

        {/* Tombol Tandai Ragu-ragu (Tengah) */}
        <Button
          type="button"
          variant="outline"
          size="default"
          onClick={onToggleFlag}
          className={cn(
            "transition-all gap-1.5 h-10 px-3 sm:px-5 font-medium select-none",
            isFlagged
              ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-600 dark:border-amber-500 shadow-xs"
              : "border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-amber-400 hover:bg-amber-50/50 hover:text-amber-700 dark:hover:bg-amber-950/30 dark:hover:text-amber-300"
          )}
        >
          <Flag className={cn("size-4", isFlagged && "fill-white")} />
          <span className="hidden sm:inline">{isFlagged ? "Ragu-ragu (Aktif)" : "Tandai Ragu-ragu"}</span>
          <span className="sm:hidden">{isFlagged ? "Ragu (Aktif)" : "Ragu"}</span>
        </Button>

        {/* Tombol Soal Selanjutnya atau Selesaikan Ujian (Kanan) */}
        {isLast ? (
          <Button
            type="button"
            size="default"
            onClick={onRequestFinish}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-10 px-3 sm:px-5 shadow-xs"
          >
            <span className="hidden sm:inline">Selesaikan Ujian</span>
            <span className="sm:hidden">Selesai</span>
            <Send className="size-3.5" />
          </Button>
        ) : (
          <Button
            type="button"
            size="default"
            onClick={onNext}
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 h-10 px-3 sm:px-5 shadow-xs"
          >
            <span className="hidden sm:inline">Soal Selanjutnya</span>
            <span className="sm:hidden">Lanjut</span>
            <ChevronRight className="size-4" />
          </Button>
        )}
      </div>
    </footer>
  );
}

