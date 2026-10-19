"use client";

import React from "react";
import type { ClientQuestionItem } from "@/actions/exam-session";
import type { Json } from "@/types/database";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { QuestionPaletteGrid } from "./question-palette-grid";
import { QuestionPaletteLegend } from "./question-palette-legend";
import { LayoutGrid } from "lucide-react";

interface QuestionPaletteSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questions: ClientQuestionItem[];
  currentIndex: number;
  answersMap: Record<string, Json>;
  flaggedMap: Record<string, boolean>;
  answeredCount: number;
  unansweredCount: number;
  flaggedCount: number;
  onSelectIndex: (index: number) => void;
}

export function QuestionPaletteSheet({
  open,
  onOpenChange,
  questions,
  currentIndex,
  answersMap,
  flaggedMap,
  answeredCount,
  unansweredCount,
  flaggedCount,
  onSelectIndex,
}: QuestionPaletteSheetProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-md flex-col p-5 sm:p-6">
        {/* Header Palet Mobile */}
        <DialogHeader className="border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <LayoutGrid className="size-5 text-indigo-600 dark:text-indigo-400" />
              <DialogTitle className="text-base font-bold">
                Daftar Nomor Soal
              </DialogTitle>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {answeredCount}/{questions.length} Terjawab
            </Badge>
          </div>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            Pilih salah satu nomor untuk langsung berpindah ke butir soal tersebut.
          </DialogDescription>
        </DialogHeader>

        {/* Kisi Tombol Nomor Soal (Scrollable) */}
        <div className="flex-1 overflow-y-auto py-2 pr-1">
          <QuestionPaletteGrid
            questions={questions}
            currentIndex={currentIndex}
            answersMap={answersMap}
            flaggedMap={flaggedMap}
            onSelectIndex={onSelectIndex}
            onItemClick={() => onOpenChange(false)}
          />
        </div>

        {/* Legenda & Status */}
        <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
          <QuestionPaletteLegend
            totalQuestions={questions.length}
            answeredCount={answeredCount}
            unansweredCount={unansweredCount}
            flaggedCount={flaggedCount}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

