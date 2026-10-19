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
  className?: string;
}

export function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  isFlagged,
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
        "rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-7 md:p-8 shadow-xs transition-all",
        className
      )}
    >
      {/* Header Kartu Soal */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          {/* Badge Nomor Soal */}
          <div className="flex items-center gap-1.5 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold font-mono">
            <span>Nomor {questionNumber}</span>
            <span className="text-slate-400 dark:text-slate-500 font-normal">/ {totalQuestions}</span>
          </div>

          {/* Badge Tipe Soal */}
          <Badge
            variant="outline"
            className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs gap-1 py-1"
          >
            <HelpCircle className="size-3 text-indigo-600 dark:text-indigo-400" />
            <span>{questionTypeLabel}</span>
          </Badge>

          {/* Badge Bobot Poin */}
          <Badge
            variant="secondary"
            className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-mono py-1"
          >
            <Layers className="size-3 mr-1" />
            <span>{question.points} Poin</span>
          </Badge>
        </div>

        {/* Indikator Ragu-ragu (jika aktif) */}
        {isFlagged && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100/90 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 px-3 py-1 text-xs font-medium text-amber-800 dark:text-amber-200 animate-in fade-in duration-200">
            <Flag className="size-3.5 fill-amber-500 text-amber-600 dark:text-amber-400" />
            <span>Ditandai Ragu-ragu</span>
          </span>
        )}
      </div>

      {/* Konten Soal (Markdown & KaTeX) */}
      <div className="space-y-6">
        <div className="prose prose-slate dark:prose-invert max-w-none text-slate-900 dark:text-slate-100 leading-relaxed font-sans text-sm sm:text-base">
          <MarkdownRenderer content={question.prompt} />
        </div>

        {/* Pemisah Halus */}
        <div className="border-t border-slate-200/80 dark:border-slate-800 pt-6">
          <div className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Pilihan / Kolom Jawaban:
          </div>

          {/* Opsi Jawaban Interaktif */}
          <QuestionOptions question={question} />
        </div>
      </div>
    </div>
  );
}

