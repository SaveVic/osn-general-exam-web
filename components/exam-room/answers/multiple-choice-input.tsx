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
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-xs text-indigo-800 dark:text-indigo-200">
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
                "w-full text-left flex items-start gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-xl border transition-all duration-150 cursor-pointer select-none",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
                isSelected
                  ? "border-indigo-600 bg-indigo-50/70 dark:border-indigo-500 dark:bg-indigo-950/40 shadow-xs ring-1 ring-indigo-600/30 dark:ring-indigo-500/30"
                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-slate-50/60 dark:hover:bg-slate-900"
              )}
            >
              {/* Badge Kotak Centang (A, B, C, D, E) */}
              <div
                className={cn(
                  "size-8 sm:size-9 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 transition-colors",
                  isSelected
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                )}
              >
                {isSelected ? <Check className="size-4 stroke-[3]" /> : option.id}
              </div>

              {/* Teks Opsi Jawaban (Render Markdown & KaTeX) */}
              <div className="flex-1 min-w-0 pt-0.5">
                <MarkdownRenderer
                  content={option.text}
                  className={cn(
                    "prose-p:my-0 text-sm sm:text-base leading-relaxed break-words",
                    isSelected
                      ? "text-indigo-950 dark:text-indigo-100 font-medium"
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
            className="text-xs text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 gap-1.5 h-8 px-2.5"
          >
            <RotateCcw className="size-3.5" />
            <span>Hapus Semua Pilihan ({selectedOptionIds.length} Terpilih)</span>
          </Button>
        </div>
      )}
    </div>
  );
}

