"use client";

import React from "react";
import type { ChoiceOption } from "@/lib/validations/question";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { Button } from "@/components/ui/button";
import { Check, Info, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface MultipleChoiceInputProps {
  questionId: string;
  options: ChoiceOption[];
  selectedOptionIds?: string[];
  onToggleOption: (optionId: string) => void;
  onClearOptions: () => void;
}

export function MultipleChoiceInput({
  options,
  selectedOptionIds = [],
  onToggleOption,
  onClearOptions,
}: MultipleChoiceInputProps) {
  const hasSelected = selectedOptionIds.length > 0;

  return (
    <div className="space-y-3">
      {/* Petunjuk Pilihan Jamak */}
      <div className="flex items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-xs text-indigo-800 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-200">
        <Info className="size-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
        <span>Pilihan Jamak: Anda dapat memilih satu atau lebih jawaban yang menurut Anda benar.</span>
      </div>

      <div className="space-y-2.5" role="group" aria-label="Daftar Opsi Pilihan Jamak">
        {options.map((option) => {
          const isSelected = selectedOptionIds.includes(option.id);

          return (
            <button
              key={option.id}
              type="button"
              role="checkbox"
              aria-checked={isSelected}
              onClick={() => onToggleOption(option.id)}
              className={cn(
                "flex w-full cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-left transition-all duration-150 select-none sm:gap-4 sm:p-4",
                "focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none",
                isSelected
                  ? "border-indigo-600 bg-indigo-50/70 shadow-xs ring-1 ring-indigo-600/30 dark:border-indigo-500 dark:bg-indigo-950/40 dark:ring-indigo-500/30"
                  : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-indigo-700 dark:hover:bg-slate-900"
              )}
            >
              {/* Badge Kotak Centang (A, B, C, D, E) */}
              <div
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition-colors sm:size-9",
                  isSelected
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "border border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                )}
              >
                {isSelected ? <Check className="size-4 stroke-3" /> : option.id}
              </div>

              {/* Teks Opsi Jawaban (Render Markdown & KaTeX) */}
              <div className="min-w-0 flex-1 pt-0.5">
                <MarkdownRenderer
                  content={option.text}
                  className={cn(
                    "text-sm leading-relaxed wrap-break-word sm:text-base prose-p:my-0",
                    isSelected
                      ? "font-medium text-indigo-950 dark:text-indigo-100"
                      : "text-slate-800 dark:text-slate-200"
                  )}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Tombol Hapus Seluruh Centang Pilihan */}
      {hasSelected && (
        <div className="flex justify-end pt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearOptions}
            className="h-8 gap-1.5 px-2.5 text-xs text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400"
          >
            <RotateCcw className="size-3.5" />
            <span>Hapus Semua Pilihan ({selectedOptionIds.length} Terpilih)</span>
          </Button>
        </div>
      )}
    </div>
  );
}

