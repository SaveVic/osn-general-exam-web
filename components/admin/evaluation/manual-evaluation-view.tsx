"use client";

import React, { useState, useMemo } from "react";
import type { ExamRow, QuestionRow } from "@/types/database";
import type { ManualEvaluationSubmission } from "@/actions/manual-evaluation";
import { EvaluationItemCard } from "./evaluation-item-card";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Filter,
  Search,
  CheckCircle2,
  Clock,
  HelpCircle,
  BarChart3,
} from "lucide-react";

interface ManualEvaluationViewProps {
  exam: ExamRow;
  questions: QuestionRow[];
  initialSubmissions: ManualEvaluationSubmission[];
}

export function ManualEvaluationView({
  exam,
  questions,
  initialSubmissions,
}: ManualEvaluationViewProps) {
  const [submissions, setSubmissions] = useState<ManualEvaluationSubmission[]>(initialSubmissions);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>("all");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [evaluationStatusFilter, setEvaluationStatusFilter] = useState<"all" | "evaluated" | "unevaluated">("all");

  // Ekstraksi daftar kelas unik
  const uniqueClasses = useMemo(() => {
    const set = new Set<string>();
    for (const sub of initialSubmissions) {
      if (sub.studentClass) {
        set.add(sub.studentClass);
      }
    }
    return Array.from(set).sort();
  }, [initialSubmissions]);

  // Handler saat nilai berhasil disimpan pada salah satu kartu
  const handleScoreSaved = (
    sessionId: string,
    questionId: string,
    newScore: number,
    newTotalScore: number
  ) => {
    setSubmissions((prev) =>
      prev.map((sub) => {
        if (sub.sessionId === sessionId && sub.questionId === questionId) {
          return {
            ...sub,
            awardedScore: newScore,
            sessionTotalScore: newTotalScore,
          };
        }
        if (sub.sessionId === sessionId) {
          return {
            ...sub,
            sessionTotalScore: newTotalScore,
          };
        }
        return sub;
      })
    );
  };

  // Kalkulasi statistik penilaian
  const stats = useMemo(() => {
    const total = submissions.length;
    const evaluated = submissions.filter((s) => s.awardedScore !== null).length;
    const unevaluated = total - evaluated;
    const totalScoreAccum = submissions.reduce((acc, s) => acc + (s.awardedScore ?? 0), 0);
    const avgScore = evaluated > 0 ? (totalScoreAccum / evaluated).toFixed(1) : "0";

    return { total, evaluated, unevaluated, avgScore };
  }, [submissions]);

  // Filter daftar submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      // Filter butir soal
      if (selectedQuestionId !== "all" && sub.questionId !== selectedQuestionId) {
        return false;
      }

      // Filter kelas
      if (selectedClass !== "all" && sub.studentClass !== selectedClass) {
        return false;
      }

      // Filter status penilaian
      if (evaluationStatusFilter === "evaluated" && sub.awardedScore === null) {
        return false;
      }
      if (evaluationStatusFilter === "unevaluated" && sub.awardedScore !== null) {
        return false;
      }

      // Filter pencarian nama siswa
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase();
        const nameMatch = sub.studentName.toLowerCase().includes(query);
        const classMatch = sub.studentClass.toLowerCase().includes(query);
        if (!nameMatch && !classMatch) {
          return false;
        }
      }

      return true;
    });
  }, [submissions, selectedQuestionId, selectedClass, evaluationStatusFilter, searchQuery]);

  if (questions.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
          <HelpCircle className="size-7" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-slate-100">
          Tidak Ada Butir Soal Isian Singkat / Esai
        </h3>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500 dark:text-slate-400">
          Naskah ujian <strong>&ldquo;{exam.title}&rdquo;</strong> saat ini tidak memiliki butir soal bertipe
          isian (`short_answer`). Seluruh butir pilihan ganda dan jamak telah dinilai secara otomatis oleh mesin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistik Ringkas */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <FileText className="size-3.5" />
            <span>Total Lembar Jawaban</span>
          </div>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {stats.total}
          </p>
        </div>

        <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/40 p-4 shadow-xs dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="size-3.5" />
            <span>Telah Dinilai</span>
          </div>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-emerald-700 dark:text-emerald-300">
            {stats.evaluated}
          </p>
        </div>

        <div className="rounded-xl border border-amber-200/70 bg-amber-50/40 p-4 shadow-xs dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="flex items-center gap-2 text-xs font-medium text-amber-800 dark:text-amber-300">
            <Clock className="size-3.5" />
            <span>Belum Dinilai</span>
          </div>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-amber-700 dark:text-amber-300">
            {stats.unevaluated}
          </p>
        </div>

        <div className="rounded-xl border border-indigo-200/70 bg-indigo-50/40 p-4 shadow-xs dark:border-indigo-900/40 dark:bg-indigo-950/20">
          <div className="flex items-center gap-2 text-xs font-medium text-indigo-800 dark:text-indigo-300">
            <BarChart3 className="size-3.5" />
            <span>Rata-Rata Nilai</span>
          </div>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-indigo-700 dark:text-indigo-300">
            {stats.avgScore}
          </p>
        </div>
      </div>

      {/* Kontrol Filter & Pencarian */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3">
          {/* Filter Butir Soal */}
          <div className="flex items-center gap-2">
            <Filter className="size-3.5 text-slate-400" />
            <select
              aria-label="Pilih Butir Soal Isian"
              value={selectedQuestionId}
              onChange={(e) => setSelectedQuestionId(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="all">Semua Soal Isian ({questions.length})</option>
              {questions.map((q) => (
                <option key={q.id} value={q.id}>
                  Soal #{q.order_index} (Maks {q.points} Poin)
                </option>
              ))}
            </select>
          </div>

          {/* Filter Kelas */}
          {uniqueClasses.length > 0 && (
            <select
              aria-label="Pilih Kelas Peserta"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="all">Semua Kelas</option>
              {uniqueClasses.map((cls) => (
                <option key={cls} value={cls}>
                  Kelas {cls}
                </option>
              ))}
            </select>
          )}

          {/* Filter Status Penilaian */}
          <div className="flex rounded-lg border border-slate-200 p-0.5 text-xs dark:border-slate-700">
            <button
              type="button"
              onClick={() => setEvaluationStatusFilter("all")}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                evaluationStatusFilter === "all"
                  ? "bg-indigo-600 text-white dark:bg-indigo-500"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setEvaluationStatusFilter("unevaluated")}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                evaluationStatusFilter === "unevaluated"
                  ? "bg-amber-600 text-white dark:bg-amber-500"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              Belum Dinilai
            </button>
            <button
              type="button"
              onClick={() => setEvaluationStatusFilter("evaluated")}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                evaluationStatusFilter === "evaluated"
                  ? "bg-emerald-600 text-white dark:bg-emerald-500"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              Sudah Dinilai
            </button>
          </div>
        </div>

        {/* Pencarian Nama Siswa */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute top-2.5 left-2.5 size-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Cari nama peserta..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-8 text-xs"
            aria-label="Cari nama peserta"
          />
        </div>
      </div>

      {/* Daftar Kartu Jawaban */}
      {filteredSubmissions.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Tidak ada jawaban yang sesuai dengan kriteria filter saat ini.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1 text-xs text-slate-500 dark:text-slate-400">
            <span>
              Menampilkan <strong>{filteredSubmissions.length}</strong> lembar jawaban
            </span>
          </div>

          {filteredSubmissions.map((sub) => (
            <EvaluationItemCard
              key={`${sub.sessionId}_${sub.questionId}`}
              submission={sub}
              onScoreSaved={handleScoreSaved}
            />
          ))}
        </div>
      )}
    </div>
  );
}

