"use client";

import React, { useState } from "react";
import type { QuestionRow } from "@/types/database";
import {
  deleteQuestionAction,
  duplicateQuestionAction,
  reorderQuestionsAction,
} from "@/actions/questions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Edit,
  FileQuestion,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuestionListProps {
  examId: string;
  questions: QuestionRow[];
  onAddQuestion: () => void;
  onEditQuestion: (question: QuestionRow) => void;
}

export function QuestionList({
  examId,
  questions,
  onAddQuestion,
  onEditQuestion,
}: QuestionListProps) {
  const [isPending, setIsPending] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<QuestionRow | null>(null);

  // Reorder naik
  const handleMoveUp = async (index: number) => {
    if (index <= 0 || isPending) return;
    setIsPending(true);

    const reordered = [...questions];
    const temp = reordered[index - 1];
    reordered[index - 1] = reordered[index];
    reordered[index] = temp;

    const orderedIds = reordered.map((q) => q.id);
    try {
      await reorderQuestionsAction(examId, orderedIds);
    } finally {
      setIsPending(false);
    }
  };

  // Reorder turun
  const handleMoveDown = async (index: number) => {
    if (index >= questions.length - 1 || isPending) return;
    setIsPending(true);

    const reordered = [...questions];
    const temp = reordered[index + 1];
    reordered[index + 1] = reordered[index];
    reordered[index] = temp;

    const orderedIds = reordered.map((q) => q.id);
    try {
      await reorderQuestionsAction(examId, orderedIds);
    } finally {
      setIsPending(false);
    }
  };

  // Duplikasi
  const handleDuplicate = async (questionId: string) => {
    if (isPending) return;
    setIsPending(true);
    try {
      await duplicateQuestionAction(questionId, examId);
    } finally {
      setIsPending(false);
    }
  };

  // Hapus
  const handleConfirmDelete = async () => {
    if (!deleteTarget || isPending) return;
    setIsPending(true);
    try {
      await deleteQuestionAction(deleteTarget.id, examId);
      setDeleteTarget(null);
    } finally {
      setIsPending(false);
    }
  };

  const getQuestionTypeBadge = (type: string) => {
    switch (type) {
      case "single_choice":
        return (
          <Badge variant="outline" className="border-indigo-200 bg-indigo-50/50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-300">
            Pilihan Ganda
          </Badge>
        );
      case "multiple_choice":
        return (
          <Badge variant="outline" className="border-purple-200 bg-purple-50/50 text-purple-700 dark:border-purple-900/60 dark:bg-purple-950/30 dark:text-purple-300">
            Pilihan Jamak
          </Badge>
        );
      case "short_answer":
        return (
          <Badge variant="outline" className="border-amber-200 bg-amber-50/50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
            Isian Singkat
          </Badge>
        );
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  if (questions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
          <FileQuestion className="size-7" />
        </div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Belum Ada Butir Soal
        </h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
          Naskah ujian ini belum memiliki butir pertanyaan. Tambahkan butir soal pertama sekarang.
        </p>
        <div className="mt-6">
          <Button
            onClick={onAddQuestion}
            className="bg-indigo-600 text-white hover:bg-indigo-700"
          >
            <Plus className="mr-1.5 size-4" />
            Tambah Butir Soal Pertama
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tombol Aksi Tambah di Atas */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
          Daftar Soal ({questions.length} Butir)
        </span>
        <Button
          onClick={onAddQuestion}
          size="sm"
          disabled={isPending}
          className="bg-indigo-600 text-white hover:bg-indigo-700"
        >
          <Plus className="mr-1.5 size-4" />
          Tambah Soal
        </Button>
      </div>

      {/* Kartu Daftar Soal */}
      <div className="space-y-3">
        {questions.map((q, index) => (
          <div
            key={q.id}
            className={cn(
              "group relative flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs transition-all hover:border-slate-300 sm:flex-row sm:items-start dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700",
              isPending && "pointer-events-none opacity-60"
            )}
          >
            {/* Sisi Kiri: Nomor, Metadata, dan Teks Soal */}
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 font-mono text-xs font-bold text-white dark:bg-slate-100 dark:text-slate-900">
                  {q.order_index}
                </span>
                {getQuestionTypeBadge(q.question_type)}
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                  {q.points} Poin
                </span>
              </div>

              {/* Cuplikan Teks Soal */}
              <div className="max-h-24 overflow-hidden pt-1">
                <MarkdownRenderer
                  content={q.prompt}
                  className="line-clamp-3 text-sm prose-p:my-0"
                />
              </div>
            </div>

            {/* Sisi Kanan: Tombol Reorder & Aksi */}
            <div className="flex items-center gap-1 self-end sm:self-center">
              {/* Tombol Reorder */}
              <div className="flex items-center rounded-md border border-slate-200 dark:border-slate-800">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={index === 0 || isPending}
                  onClick={() => handleMoveUp(index)}
                  title="Pindah ke atas"
                  className="size-8 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                >
                  <ArrowUp className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={index === questions.length - 1 || isPending}
                  onClick={() => handleMoveDown(index)}
                  title="Pindah ke bawah"
                  className="size-8 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                >
                  <ArrowDown className="size-3.5" />
                </Button>
              </div>

              {/* Tombol Duplikasi */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={isPending}
                onClick={() => handleDuplicate(q.id)}
                title="Duplikasi butir soal ini"
                className="size-8 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              >
                <Copy className="size-3.5" />
              </Button>

              {/* Tombol Edit */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={isPending}
                onClick={() => onEditQuestion(q)}
                title="Sunting butir soal"
                className="size-8 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
              >
                <Edit className="size-3.5" />
              </Button>

              {/* Tombol Hapus */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={isPending}
                onClick={() => setDeleteTarget(q)}
                title="Hapus butir soal"
                className="size-8 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Dialog Konfirmasi Hapus */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Hapus Butir Soal</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus butir soal nomor{" "}
              <strong>#{deleteTarget?.order_index}</strong>? Butir soal yang dihapus tidak dapat
              dipulihkan kembali, dan nomor urut soal tersisa akan dinormalisasi secara otomatis.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isPending}
            >
              {isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              Hapus Soal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

