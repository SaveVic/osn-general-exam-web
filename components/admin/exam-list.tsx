"use client";

import { useState, useTransition } from "react";
import type { AdminExamItem } from "@/actions/exams";
import { deleteExamAction, togglePublishAction } from "@/actions/exams";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BookOpen,
  Calendar,
  Clock,
  FileEdit,
  Globe,
  KeyRound,
  Layers,
  Loader2,
  Lock,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";

interface ExamListProps {
  exams: AdminExamItem[];
}

function formatExamDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return dateStr;
  }
}

export function ExamList({ exams }: ExamListProps) {
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [examToDelete, setExamToDelete] = useState<AdminExamItem | null>(null);
  const [isPending, startTransition] = useTransition();

  // Filter daftar ujian
  const filteredExams = exams.filter((exam) => {
    const matchesFilter =
      filter === "all"
        ? true
        : filter === "published"
        ? exam.is_published
        : !exam.is_published;

    const matchesSearch =
      searchQuery.trim() === "" ||
      exam.title.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const handleDelete = () => {
    if (!examToDelete) return;
    startTransition(async () => {
      await deleteExamAction(examToDelete.id);
      setExamToDelete(null);
    });
  };

  const handleTogglePublish = (id: string, currentStatus: boolean) => {
    startTransition(async () => {
      await togglePublishAction(id, currentStatus);
    });
  };

  return (
    <div className="space-y-4">
      {/* Kontrol Filter & Pencarian */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        {/* Tab Filter */}
        <div className="flex rounded-lg border border-slate-200 bg-white p-1 text-xs font-medium dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-md px-3 py-1.5 transition-colors ${
              filter === "all"
                ? "bg-slate-900 font-semibold text-white dark:bg-slate-100 dark:text-slate-900"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            Semua ({exams.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("published")}
            className={`rounded-md px-3 py-1.5 transition-colors ${
              filter === "published"
                ? "bg-slate-900 font-semibold text-white dark:bg-slate-100 dark:text-slate-900"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            Dipublikasikan ({exams.filter((e) => e.is_published).length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("draft")}
            className={`rounded-md px-3 py-1.5 transition-colors ${
              filter === "draft"
                ? "bg-slate-900 font-semibold text-white dark:bg-slate-100 dark:text-slate-900"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            Draf ({exams.filter((e) => !e.is_published).length})
          </button>
        </div>

        {/* Input Pencarian */}
        <div className="relative w-full sm:w-64">
          <Input
            type="text"
            placeholder="Cari naskah ujian..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs sm:text-sm"
          />
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      {/* Daftar Naskah Ujian */}
      {filteredExams.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white py-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <BookOpen className="size-10 text-slate-300 dark:text-slate-600" />
          <h3 className="mt-3 text-sm font-medium text-slate-900 dark:text-slate-100">
            Tidak ada naskah ujian ditemukan
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {searchQuery
              ? `Tidak ada hasil pencarian untuk "${searchQuery}".`
              : "Belum ada naskah ujian pada kategori filter ini."}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {filteredExams.map((exam) => (
            <div
              key={exam.id}
              className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center"
            >
              {/* Kolom Informasi Ujian */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                    {exam.title}
                  </h3>
                  {exam.is_published ? (
                    <Badge variant="success" className="gap-1 text-xs">
                      <Globe className="size-3" />
                      Dipublikasikan
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <Lock className="size-3" />
                      Draf
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3.5 text-slate-400" />
                    {exam.duration_minutes} Menit
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3.5 text-slate-400" />
                    {formatExamDate(exam.starts_at)} s.d. {formatExamDate(exam.ends_at)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Layers className="size-3.5 text-slate-400" />
                    {exam.class_options.length} Kelas (
                    {exam.class_options.slice(0, 2).join(", ")}
                    {exam.class_options.length > 2 && ` +${exam.class_options.length - 2}`})
                  </span>
                </div>

                <div className="flex items-center gap-3 pt-1 text-xs">
                  <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                    <BookOpen className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                    {exam.question_count} Butir Soal
                  </span>
                  <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                    <Users className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                    {exam.session_count} Peserta
                  </span>
                </div>
              </div>

              {/* Kolom Aksi */}
              <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
                  <Link href={`/admin/ujian/${exam.id}/soal`}>
                    <BookOpen className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                    Soal
                  </Link>
                </Button>

                <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
                  <Link href={`/admin/ujian/${exam.id}/kode-rujukan`}>
                    <KeyRound className="size-3.5 text-amber-600 dark:text-amber-400" />
                    Kode
                  </Link>
                </Button>

                <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
                  <Link href={`/admin/ujian/${exam.id}/pengaturan`}>
                    <FileEdit className="size-3.5" />
                    Sunting
                  </Link>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTogglePublish(exam.id, exam.is_published)}
                  disabled={isPending}
                  className="gap-1.5 text-xs"
                >
                  {exam.is_published ? (
                    <>
                      <Lock className="size-3.5 text-slate-500" />
                      Jadikan Draf
                    </>
                  ) : (
                    <>
                      <Globe className="size-3.5 text-emerald-600" />
                      Terbitkan
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExamToDelete(exam)}
                  disabled={isPending}
                  className="gap-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive dark:hover:bg-destructive/20"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog Konfirmasi Hapus */}
      <Dialog open={!!examToDelete} onOpenChange={(open) => !open && setExamToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Penghapusan Naskah Ujian</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus naskah ujian{" "}
              <strong className="text-slate-900 dark:text-slate-100">
                &ldquo;{examToDelete?.title}&rdquo;
              </strong>
              ? Seluruh butir soal, kode rujukan, dan data pengerjaan sesi siswa yang terkait akan
              dihapus secara permanen dari basis data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button variant="outline" disabled={isPending}>
                Batal
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
              className="gap-1.5"
            >
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Menghapus...
                </>
              ) : (
                <>
                  <Trash2 className="size-4" />
                  Ya, Hapus Ujian
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

