"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Flag, LayoutGrid, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavigationBarProps {
  currentIndex: number;
  totalQuestions: number;
  isFlagged: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToggleFlag: () => void;
  onRequestFinish: () => void;
  onOpenPalette?: () => void;
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
  onOpenPalette,
  className,
}: BottomNavigationBarProps) {
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === totalQuestions - 1;

  return (
    <footer
      className={cn(
        "sticky bottom-0 z-20 border-t border-slate-200 bg-white/95 p-3 shadow-md backdrop-blur-md sm:px-4 sm:py-3.5 dark:border-slate-800 dark:bg-slate-900/95",
        className
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 sm:gap-4">
        {/* Tombol Soal Sebelumnya */}
        <Button
          type="button"
          variant="outline"
          size="default"
          onClick={onPrev}
          disabled={isFirst}
          className="h-10 gap-1.5 border-slate-300 px-3 text-slate-700 hover:bg-slate-100 sm:px-4 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <ChevronLeft className="size-4" />
          <span className="hidden sm:inline">Soal Sebelumnya</span>
          <span className="sm:hidden">Sebelum</span>
        </Button>

        {/* Tengah: Tombol Daftar Soal (Mobile) & Tombol Tandai Ragu-ragu */}
        <div className="flex items-center gap-2">
          {onOpenPalette && (
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={onOpenPalette}
              className="h-10 gap-1.5 border-slate-300 px-3 text-slate-700 hover:bg-slate-100 lg:hidden dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <LayoutGrid className="size-4 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline">Daftar Soal</span>
              <span className="font-mono text-xs sm:hidden">#{currentIndex + 1}</span>
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="default"
            onClick={onToggleFlag}
            className={cn(
              "h-10 gap-1.5 px-3 font-medium transition-all select-none sm:px-5",
              isFlagged
                ? "border-amber-600 bg-amber-500 text-white shadow-xs hover:bg-amber-600 dark:border-amber-500"
                : "border-slate-300 text-slate-700 hover:border-amber-400 hover:bg-amber-50/50 hover:text-amber-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-amber-950/30 dark:hover:text-amber-300"
            )}
          >
            <Flag className={cn("size-4", isFlagged && "fill-white")} />
            <span className="hidden sm:inline">{isFlagged ? "Ragu-ragu (Aktif)" : "Tandai Ragu-ragu"}</span>
            <span className="sm:hidden">{isFlagged ? "Ragu (Aktif)" : "Ragu"}</span>
          </Button>
        </div>

        {/* Tombol Soal Selanjutnya atau Selesaikan Ujian (Kanan) */}
        {isLast ? (
          <Button
            type="button"
            size="default"
            onClick={onRequestFinish}
            className="h-10 gap-1.5 bg-emerald-600 px-3 text-white shadow-xs hover:bg-emerald-700 sm:px-5"
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
            className="h-10 gap-1.5 bg-indigo-600 px-3 text-white shadow-xs hover:bg-indigo-700 sm:px-5"
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
