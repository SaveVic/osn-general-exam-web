"use client";

import React from "react";
import type { ClientQuestionItem } from "@/actions/exam-session";
import type { Json } from "@/types/database";
import { QuestionPaletteGrid } from "./question-palette-grid";
import { QuestionPaletteLegend } from "./question-palette-legend";
import { Badge } from "@/components/ui/badge";
import { LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuestionPaletteSidebarProps {
  questions: ClientQuestionItem[];
  currentIndex: number;
  answersMap: Record<string, Json>;
  flaggedMap: Record<string, boolean>;
  answeredCount: number;
  unansweredCount: number;
  flaggedCount: number;
  onSelectIndex: (index: number) => void;
  className?: string;
}

export function QuestionPaletteSidebar({
  questions,
  currentIndex,
  answersMap,
  flaggedMap,
  answeredCount,
  unansweredCount,
  flaggedCount,
  onSelectIndex,
  className,
}: QuestionPaletteSidebarProps) {
  return (
    <aside
      aria-label="Palet Navigasi Soal"
      className={cn(
        "rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900",
        "flex max-h-[calc(100vh-10.5rem)] flex-col gap-4",
        className
      )}
    >
      {/* Header Panel Palet */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <LayoutGrid className="size-4 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Nomor Soal
          </h2>
        </div>
        <Badge variant="outline" className="font-mono text-[11px]">
          {answeredCount}/{questions.length} Terjawab
        </Badge>
      </div>

      {/* Grid Tombol Nomor Soal (Scrollable jika butir soal banyak) */}
      <div className="flex-1 overflow-y-auto p-1">
        <QuestionPaletteGrid
          questions={questions}
          currentIndex={currentIndex}
          answersMap={answersMap}
          flaggedMap={flaggedMap}
          onSelectIndex={onSelectIndex}
        />
      </div>

      {/* Legenda & Ringkasan Status */}
      <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
        <QuestionPaletteLegend
          totalQuestions={questions.length}
          answeredCount={answeredCount}
          unansweredCount={unansweredCount}
          flaggedCount={flaggedCount}
        />
      </div>
    </aside>
  );
}

