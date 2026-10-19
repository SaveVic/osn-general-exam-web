"use client";

import React, { useState, useMemo } from "react";
import type { ExamRow } from "@/types/database";
import {
  formatActualDuration,
  formatReportTimestamp,
  generateExamReportCsv,
  type ExamReportSessionRow,
} from "@/lib/exam/report-csv";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Search,
  Filter,
  Users,
  CheckCircle2,
  Clock,
  Award,
  FileSpreadsheet,
} from "lucide-react";

interface ExamReportViewProps {
  exam: ExamRow;
  maxPossibleScore: number;
  sessions: ExamReportSessionRow[];
  onExportCsv?: (csvContent: string, filename: string) => void;
}

export function ExamReportView({
  exam,
  maxPossibleScore,
  sessions,
  onExportCsv,
}: ExamReportViewProps) {
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Gabungkan daftar opsi kelas dari konfigurasi ujian dan sesi aktual
  const availableClasses = useMemo(() => {
    const classSet = new Set<string>(exam.class_options || []);
    for (const s of sessions) {
      if (s.studentClass) {
        classSet.add(s.studentClass);
      }
    }
    return Array.from(classSet).sort();
  }, [exam.class_options, sessions]);

  // Filter baris berdasarkan kelas dan pencarian nama siswa real-time
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (selectedClass !== "all" && s.studentClass !== selectedClass) {
        return false;
      }

      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase();
        const matchesName = s.studentName.toLowerCase().includes(query);
        const matchesClass = s.studentClass.toLowerCase().includes(query);
        if (!matchesName && !matchesClass) {
          return false;
        }
      }

      return true;
    });
  }, [sessions, selectedClass, searchQuery]);

  // Statistik ringkas
  const stats = useMemo(() => {
    const total = sessions.length;
    const completed = sessions.filter((s) => s.isCompleted).length;
    const inProgress = total - completed;

    const scoredSessions = sessions.filter(
      (s) => s.totalScore !== null && s.totalScore !== undefined
    );
    const sumScores = scoredSessions.reduce(
      (acc, s) => acc + (s.totalScore ?? 0),
      0
    );
    const avgScore =
      scoredSessions.length > 0
        ? (sumScores / scoredSessions.length).toFixed(2)
        : "0.00";

    return { total, completed, inProgress, avgScore };
  }, [sessions]);

  // Handler unduh berkas CSV UTF-8
  const handleExportCsv = () => {
    const csvContent = generateExamReportCsv(filteredSessions);
    const safeSlug = exam.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const filename = `rekap-nilai-${safeSlug || exam.id}.csv`;

    if (onExportCsv) {
      onExportCsv(csvContent, filename);
      return;
    }

    if (typeof window !== "undefined") {
      const blob = new Blob([csvContent], {
        type: "text/csv;charset=utf-8;",
      });

      if (typeof URL.createObjectURL === "function") {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        if (typeof URL.revokeObjectURL === "function") {
          URL.revokeObjectURL(url);
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Kartu Metrik Statistik Akademis */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Users className="size-3.5" />
            <span>Total Peserta</span>
          </div>
          <p className="mt-1.5 font-mono text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {stats.total}
          </p>
        </div>

        <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/40 p-4 shadow-xs dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="size-3.5" />
            <span>Selesai Mengumpulkan</span>
          </div>
          <p className="mt-1.5 font-mono text-2xl font-bold tracking-tight text-emerald-700 dark:text-emerald-300">
            {stats.completed}
          </p>
        </div>

        <div className="rounded-xl border border-amber-200/70 bg-amber-50/40 p-4 shadow-xs dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="flex items-center gap-2 text-xs font-medium text-amber-800 dark:text-amber-300">
            <Clock className="size-3.5" />
            <span>Sedang Mengerjakan</span>
          </div>
          <p className="mt-1.5 font-mono text-2xl font-bold tracking-tight text-amber-700 dark:text-amber-300">
            {stats.inProgress}
          </p>
        </div>

        <div className="rounded-xl border border-indigo-200/70 bg-indigo-50/40 p-4 shadow-xs dark:border-indigo-900/40 dark:bg-indigo-950/20">
          <div className="flex items-center gap-2 text-xs font-medium text-indigo-800 dark:text-indigo-300">
            <Award className="size-3.5" />
            <span>Rata-Rata Skor (Maks {maxPossibleScore})</span>
          </div>
          <p className="mt-1.5 font-mono text-2xl font-bold tracking-tight text-indigo-700 dark:text-indigo-300">
            {stats.avgScore}
          </p>
        </div>
      </div>

      {/* Bilah Kontrol Filter, Pencarian & Tombol Ekspor CSV */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3">
          {/* Dropdown Filter Kelas */}
          <div className="flex items-center gap-2">
            <Filter className="size-3.5 text-slate-400" />
            <select
              aria-label="Filter Berdasarkan Kelas"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="all">Semua Kelas</option>
              {availableClasses.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>

          {/* Kotak Pencarian Nama Siswa Real-Time */}
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Cari nama siswa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-8 text-xs"
              aria-label="Cari nama siswa"
            />
          </div>
        </div>

        {/* Tombol Ekspor Nilai (CSV) */}
        <Button
          type="button"
          onClick={handleExportCsv}
          disabled={filteredSessions.length === 0}
          className="h-9 gap-2 bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700"
        >
          <Download className="size-3.5" />
          <span>Ekspor Nilai (CSV)</span>
        </Button>
      </div>

      {/* Tabel Ringkasan Siswa */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        {filteredSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
              <FileSpreadsheet className="size-6" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
              Data Rekapitulasi Tidak Ditemukan
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {sessions.length === 0
                ? "Belum ada peserta yang mengikuti naskah ujian ini."
                : "Tidak ada data peserta yang cocok dengan filter kelas atau kata kunci pencarian."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
                  <th className="px-4 py-3.5 text-center">Nomor Urut</th>
                  <th className="px-4 py-3.5">Nama Lengkap</th>
                  <th className="px-4 py-3.5">Kelas</th>
                  <th className="px-4 py-3.5">Waktu Mulai</th>
                  <th className="px-4 py-3.5">Waktu Selesai</th>
                  <th className="px-4 py-3.5">Durasi Aktual</th>
                  <th className="px-4 py-3.5 text-right">Skor Total</th>
                  <th className="px-4 py-3.5 text-center">Status Pengerjaan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                {filteredSessions.map((session, index) => (
                  <tr
                    key={session.id}
                    className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
                  >
                    <td className="px-4 py-3 text-center font-mono text-slate-500 dark:text-slate-400">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                      {session.studentName}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      <Badge variant="outline" className="text-[11px] font-medium">
                        {session.studentClass}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                      {formatReportTimestamp(session.startedAt)}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                      {formatReportTimestamp(session.submittedAt)}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                      {formatActualDuration(session.startedAt, session.submittedAt)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                      {session.totalScore !== null &&
                      session.totalScore !== undefined
                        ? session.totalScore
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {session.isCompleted ? (
                        <Badge
                          variant="success"
                          className="text-[11px] font-medium"
                        >
                          Selesai
                        </Badge>
                      ) : (
                        <Badge
                          variant="warning"
                          className="text-[11px] font-medium"
                        >
                          Sedang Mengerjakan
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

