"use client";

import React, { useState } from "react";
import type { QuestionRow } from "@/types/database";
import {
  deleteQuestionAction,
  duplicateQuestionAction,
  reorderQuestionsAction,
  resetQuestionsAction,
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
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Copy,
  Edit,
  FileQuestion,
  Loader2,
  Lock,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuestionListProps {
  examId: string;
  questions: QuestionRow[];
  sessionCount?: number;
  onAddQuestion: () => void;
  onEditQuestion: (question: QuestionRow) => void;
  onResetSuccess?: () => void;
}

export function QuestionList({
  examId,
  questions,
  sessionCount = 0,
  onAddQuestion,
  onEditQuestion,
  onResetSuccess,
}: QuestionListProps) {
  const [isPending, setIsPending] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<QuestionRow | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const hasParticipants = sessionCount > 0;

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

  // Reset semua soal
  const handleConfirmReset = async () => {
    if (isPending || hasParticipants) return;
    setResetError(null);
    setIsPending(true);
    try {
      const result = await resetQuestionsAction(examId);
      if (result.success) {
        setResetDialogOpen(false);
        onResetSuccess?.();
      } else {
        setResetError(result.message || "Gagal mereset seluruh butir soal.");
      }
    } catch {
      setResetError("Terjadi kesalahan saat mereset bank soal.");
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
      {/* Tombol Aksi Tambah & Reset di Atas */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
          Daftar Soal ({questions.length} Butir)
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending || hasParticipants}
            onClick={() => {
              setResetError(null);
              setResetDialogOpen(true);
            }}
            title={
              hasParticipants
                ? "Reset soal tidak dapat dilakukan karena sudah ada peserta yang mengikuti ujian"
                : "Hapus seluruh butir soal pada naskah ujian ini"
            }
            className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
          >
            <RotateCcw className="mr-1.5 size-4" />
            Reset Soal
          </Button>
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
      </div>

      {/* Pemberitahuan Penguncian Reset jika Sudah Ada Peserta */}
      {hasParticipants && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/70 px-3.5 py-2.5 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
          <Lock className="size-3.5 shrink-0" />
          <span>
            Tombol <strong>Reset Soal</strong> dinonaktifkan karena sudah terdapat{" "}
            <strong>{sessionCount} peserta</strong> yang mengikuti ujian ini.
          </span>
        </div>
      )}

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

      {/* Dialog Konfirmasi Reset Semua Soal */}
      <Dialog
        open={resetDialogOpen}
        onOpenChange={(open) => {
          if (!open && !isPending) {
            setResetDialogOpen(false);
            setResetError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="size-5" />
              <span>Konfirmasi Reset Semua Soal</span>
            </DialogTitle>
            <DialogDescription className="pt-2 leading-relaxed">
              Apakah Anda yakin ingin mereset bank soal dan menghapus seluruh{" "}
              <strong className="text-slate-900 dark:text-slate-100">
                {questions.length} butir soal
              </strong>{" "}
              pada naskah ujian ini?
              <br />
              <br />
              <span className="font-medium text-rose-600 dark:text-rose-400">
                Perhatian: Tindakan ini permanen dan seluruh soal yang terhapus tidak dapat
                dipulihkan kembali.
              </span>
            </DialogDescription>
          </DialogHeader>

          {resetError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
              <AlertCircle className="size-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{resetError}</span>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setResetDialogOpen(false);
                setResetError(null);
              }}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmReset}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                  Mereset...
                </>
              ) : (
                <>
                  <RotateCcw className="mr-1.5 size-4" />
                  Ya, Reset Semua Soal
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

