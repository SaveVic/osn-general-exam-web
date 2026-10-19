"use client";

import React from "react";
import type { ClientQuestionItem } from "@/actions/exam-session";
import type { Json } from "@/types/database";
import { Flag } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuestionPaletteGridProps {
  questions: ClientQuestionItem[];
  currentIndex: number;
  answersMap: Record<string, Json>;
  flaggedMap: Record<string, boolean>;
  onSelectIndex: (index: number) => void;
  onItemClick?: () => void;
  className?: string;
}

export function isQuestionAnswered(answer: Json | undefined): boolean {
  if (!answer) return false;
  if (typeof answer === "object") {
    if ("selected" in answer) {
      const sel = (answer as { selected?: unknown }).selected;
      return Array.isArray(sel) ? sel.length > 0 : Boolean(sel);
    }
    if ("text" in answer) {
      const txt = (answer as { text?: unknown }).text;
      return typeof txt === "string" && txt.trim().length > 0;
    }
  }
  return Boolean(answer);
}

export function QuestionPaletteGrid({
  questions,
  currentIndex,
  answersMap,
  flaggedMap,
  onSelectIndex,
  onItemClick,
  className,
}: QuestionPaletteGridProps) {
  return (
    <div
      role="grid"
      aria-label="Palet Kisi Nomor Soal"
      className={cn("grid grid-cols-5 gap-2 sm:gap-2.5", className)}
    >
      {questions.map((q, idx) => {
        const isCurrent = idx === currentIndex;
        const isFlagged = Boolean(flaggedMap[q.id]);
        const isAnswered = isQuestionAnswered(answersMap[q.id]);

        let statusText = "Belum Dijawab";
        if (isFlagged) {
          statusText = isAnswered ? "Ragu-ragu (Terjawab)" : "Ragu-ragu (Kosong)";
        } else if (isAnswered) {
          statusText = "Sudah Dijawab";
        }

        return (
          <button
            key={q.id}
            type="button"
            role="gridcell"
            aria-label={`Soal nomor ${idx + 1}, ${statusText}${isCurrent ? ", sedang aktif" : ""}`}
            aria-current={isCurrent ? "true" : undefined}
            onClick={() => {
              onSelectIndex(idx);
              onItemClick?.();
            }}
            className={cn(
              "relative flex size-10 cursor-pointer items-center justify-center rounded-xl font-mono text-sm font-bold transition-all duration-150 select-none sm:size-11",
              "focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none dark:focus-visible:ring-offset-slate-900",
              isCurrent && "z-10 scale-105 font-extrabold ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-950",
              isFlagged
                ? "border border-amber-600 bg-amber-500 text-white shadow-2xs hover:bg-amber-600"
                : isAnswered
                ? "border border-indigo-600 bg-indigo-600 text-white shadow-2xs hover:bg-indigo-700"
                : "border border-slate-300 bg-white text-slate-700 hover:border-indigo-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            )}
          >
            <span>{idx + 1}</span>

            {/* Ikon bendera kecil di sudut kanan atas jika ragu-ragu */}
            {isFlagged && (
              <span className="absolute top-1 right-1 flex items-center justify-center">
                <Flag className="size-2.5 fill-white text-white" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

