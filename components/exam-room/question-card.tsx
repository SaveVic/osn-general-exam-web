"use client";

import React from "react";
import type { ClientQuestionItem } from "@/actions/exam-session";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { QuestionOptions } from "./answers/question-options";
import { Badge } from "@/components/ui/badge";
import { Flag, HelpCircle, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuestionCardProps {
  question: ClientQuestionItem;
  questionNumber: number;
  totalQuestions: number;
  isFlagged: boolean;
  disabled?: boolean;
  className?: string;
}

export function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  isFlagged,
  disabled = false,
  className,
}: QuestionCardProps) {
  // Label tipe soal dalam Bahasa Indonesia
  const questionTypeLabel =
    question.question_type === "single_choice"
      ? "Pilihan Ganda"
      : question.question_type === "multiple_choice"
      ? "Pilihan Jamak"
      : "Isian Singkat";

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all sm:p-7 md:p-8 dark:border-slate-800 dark:bg-slate-900",
        className
      )}
    >
      {/* Header Kartu Soal */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          {/* Badge Nomor Soal */}
          <div className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 font-mono text-xs font-bold text-white sm:text-sm dark:bg-slate-100 dark:text-slate-900">
            <span>Nomor {questionNumber}</span>
            <span className="font-normal text-slate-400 dark:text-slate-500">/ {totalQuestions}</span>
          </div>

          {/* Badge Tipe Soal */}
          <Badge
            variant="outline"
            className="gap-1 border-slate-300 py-1 text-xs text-slate-700 dark:border-slate-700 dark:text-slate-300"
          >
            <HelpCircle className="size-3 text-indigo-600 dark:text-indigo-400" />
            <span>{questionTypeLabel}</span>
          </Badge>

          {/* Badge Bobot Poin */}
          <Badge
            variant="secondary"
            className="bg-slate-100 py-1 font-mono text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400"
          >
            <Layers className="mr-1 size-3" />
            <span>{question.points} Poin</span>
          </Badge>
        </div>

        {/* Indikator Ragu-ragu (jika aktif) */}
        {isFlagged && (
          <span className="animate-in fade-in inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100/90 px-3 py-1 text-xs font-medium text-amber-800 duration-200 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
            <Flag className="size-3.5 fill-amber-500 text-amber-600 dark:text-amber-400" />
            <span>Ditandai Ragu-ragu</span>
          </span>
        )}
      </div>

      {/* Konten Soal (Markdown & KaTeX) */}
      <div className="space-y-6">
        <div className="prose max-w-none font-sans text-sm leading-relaxed text-slate-900 prose-slate sm:text-base dark:text-slate-100 dark:prose-invert">
          <MarkdownRenderer content={question.prompt} />
        </div>

        {/* Pemisah Halus */}
        <div className="border-t border-slate-200/80 pt-6 dark:border-slate-800">
          <div className="mb-3 text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
            Pilihan / Kolom Jawaban:
          </div>

          {/* Opsi Jawaban Interaktif */}
          <QuestionOptions question={question} disabled={disabled} />
        </div>
      </div>
    </div>
  );
}

