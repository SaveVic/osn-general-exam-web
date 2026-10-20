"use client";

import React, { useState } from "react";
import type { ExamRow, QuestionRow } from "@/types/database";
import { QuestionList } from "./question-list";
import { QuestionEditor } from "./question-editor";
import { BookOpen, Calculator, Clock } from "lucide-react";
import { useRouter } from "next/navigation";

interface QuestionBankManagerProps {
  exam: ExamRow;
  questions: QuestionRow[];
}

export function QuestionBankManager({ exam, questions }: QuestionBankManagerProps) {
  const router = useRouter();
  const [activeEditor, setActiveEditor] = useState<boolean>(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionRow | null>(null);

  const totalPoints = questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);

  const handleStartAdd = () => {
    setEditingQuestion(null);
    setActiveEditor(true);
  };

  const handleStartEdit = (question: QuestionRow) => {
    setEditingQuestion(question);
    setActiveEditor(true);
  };

  const handleCancelEditor = () => {
    setActiveEditor(false);
    setEditingQuestion(null);
  };

  const handleSuccessEditor = () => {
    setActiveEditor(false);
    setEditingQuestion(null);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Kartu Ringkasan Naskah Ujian & Statistik Bank Soal */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
            Bank Soal Ujian
          </span>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-50">
            {exam.title}
          </h1>
        </div>

        {/* Metrik Statistik Bank Soal */}
        <div className="mt-6 grid grid-cols-1 gap-3 border-t border-slate-100 pt-5 sm:grid-cols-3 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <BookOpen className="size-4" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Total Soal
              </p>
              <p className="font-mono text-base font-bold text-slate-900 dark:text-slate-50">
                {questions.length} Soal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <Calculator className="size-4" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Total Skor
              </p>
              <p className="font-mono text-base font-bold text-slate-900 dark:text-slate-50">
                {totalPoints} Poin
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <Clock className="size-4" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Durasi
              </p>
              <p className="font-mono text-base font-bold text-slate-900 dark:text-slate-50">
                {exam.duration_minutes} Menit
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tampilan Kondisional: Editor Soal vs Daftar Soal */}
      {activeEditor ? (
        <QuestionEditor
          examId={exam.id}
          initialQuestion={editingQuestion}
          onSuccess={handleSuccessEditor}
          onCancel={handleCancelEditor}
        />
      ) : (
        <QuestionList
          examId={exam.id}
          questions={questions}
          onAddQuestion={handleStartAdd}
          onEditQuestion={handleStartEdit}
        />
      )}
    </div>
  );
}

