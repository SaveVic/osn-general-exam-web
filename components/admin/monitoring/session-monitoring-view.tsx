"use client";

import React, { useState, useEffect, useMemo } from "react";
import type { ExamRow } from "@/types/database";
import {
  getExamMonitoringData,
  forceSubmitSessionAction,
  deleteExamSessionAction,
  type MonitoredSessionRow,
} from "@/actions/session-monitoring";
import {
  formatActualDuration,
  formatReportTimestamp,
} from "@/lib/exam/report-csv";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Activity,
  Users,
  Clock,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  ShieldAlert,
  Loader2,
  AlertCircle,
  Trash2,
} from "lucide-react";

interface SessionMonitoringViewProps {
  exam: ExamRow;
  totalQuestions: number;
  initialSessions: MonitoredSessionRow[];
  initialServerTime: string;
}

type StatusFilter = "all" | "active" | "completed";

function formatClockHMS(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return [hours, minutes, seconds]
    .map((val) => String(val).padStart(2, "0"))
    .join(":");
}

export function SessionMonitoringView({
  exam,
  totalQuestions,
  initialSessions,
  initialServerTime,
}: SessionMonitoringViewProps) {
  const [sessions, setSessions] =
    useState<MonitoredSessionRow[]>(initialSessions);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Dialog konfirmasi paksa kumpulkan
  const [targetForceSession, setTargetForceSession] =
    useState<MonitoredSessionRow | null>(null);
  const [isForceSubmitting, setIsForceSubmitting] = useState<boolean>(false);

  // Dialog konfirmasi hapus sesi
  const [targetDeleteSession, setTargetDeleteSession] =
    useState<MonitoredSessionRow | null>(null);
  const [isDeletingSession, setIsDeletingSession] = useState<boolean>(false);

  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Offset waktu server untuk perhitungan durasi pengerjaan terkini secara akurat
  const [serverOffsetMs, setServerOffsetMs] = useState<number>(() => {
    const parsedServer = new Date(initialServerTime).getTime();
    if (Number.isNaN(parsedServer)) {
      return 0;
    }
    return parsedServer - Date.now();
  });

  const [nowMs, setNowMs] = useState<number>(() => {
    const parsedServer = new Date(initialServerTime).getTime();
    return Number.isNaN(parsedServer) ? Date.now() : parsedServer;
  });

  // Ticker 1 detik untuk memperbarui tampilan waktu pengerjaan terkini secara langsung
  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now() + serverOffsetMs);
    }, 1000);

    return () => clearInterval(interval);
  }, [serverOffsetMs]);

  const handleRefreshData = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const result = await getExamMonitoringData(exam.id);
      if (result.success && result.sessions) {
        setSessions(result.sessions);
        if (result.serverTime) {
          const parsedServer = new Date(result.serverTime).getTime();
          if (!Number.isNaN(parsedServer)) {
            const newOffset = parsedServer - Date.now();
            setServerOffsetMs(newOffset);
            setNowMs(parsedServer);
          }
        }
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Pembaruan otomatis berkala setiap 15 detik jika diaktifkan
  useEffect(() => {
    if (!autoRefresh) return;

    const pollInterval = setInterval(() => {
      void handleRefreshData();
    }, 15000);

    return () => clearInterval(pollInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, exam.id]);

  // Daftar kelas unik
  const availableClasses = useMemo(() => {
    const classSet = new Set<string>(exam.class_options || []);
    for (const s of sessions) {
      if (s.studentClass) {
        classSet.add(s.studentClass);
      }
    }
    return Array.from(classSet).sort();
  }, [exam.class_options, sessions]);

  // Statistik metrik utama sesuai spesifikasi F5-04
  const metrics = useMemo(() => {
    const totalRegistered = sessions.length;
    const completedCount = sessions.filter((s) => s.isCompleted).length;
    const activeCount = totalRegistered - completedCount;

    return {
      totalRegistered,
      activeCount,
      completedCount,
    };
  }, [sessions]);

  // Penyaringan baris tabel
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (statusFilter === "active" && s.isCompleted) {
        return false;
      }
      if (statusFilter === "completed" && !s.isCompleted) {
        return false;
      }
      if (selectedClass !== "all" && s.studentClass !== selectedClass) {
        return false;
      }
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const matchName = s.studentName.toLowerCase().includes(q);
        const matchClass = s.studentClass.toLowerCase().includes(q);
        if (!matchName && !matchClass) {
          return false;
        }
      }
      return true;
    });
  }, [sessions, statusFilter, selectedClass, searchQuery]);

  // Eksekusi aksi darurat Paksa Kumpulkan (Force Submit)
  const handleConfirmForceSubmit = async () => {
    if (!targetForceSession || isForceSubmitting) return;

    setIsForceSubmitting(true);
    setFeedbackBanner(null);

    try {
      const result = await forceSubmitSessionAction(targetForceSession.id);

      if (!result.success) {
        setFeedbackBanner({
          type: "error",
          text:
            result.message ||
            "Gagal memaksa pengumpulan sesi peserta. Silakan coba kembali.",
        });
        setIsForceSubmitting(false);
        return;
      }

      const finalSubmittedAt = result.submittedAt ?? new Date().toISOString();

      setSessions((prev) =>
        prev.map((item) =>
          item.id === targetForceSession.id
            ? {
                ...item,
                isCompleted: true,
                submittedAt: finalSubmittedAt,
                totalScore:
                  result.totalScore !== undefined
                    ? result.totalScore
                    : item.totalScore,
              }
            : item
        )
      );

      setFeedbackBanner({
        type: "success",
        text: `Sesi peserta "${targetForceSession.studentName}" berhasil dipaksa kumpulkan dan hak akses pengisian telah dihentikan.`,
      });
      setTargetForceSession(null);
    } catch {
      setFeedbackBanner({
        type: "error",
        text: "Terjadi gangguan jaringan saat memproses pengumpulan paksa.",
      });
    } finally {
      setIsForceSubmitting(false);
    }
  };

  // Eksekusi aksi hapus sesi ujian peserta
  const handleConfirmDeleteSession = async () => {
    if (!targetDeleteSession || isDeletingSession) return;

    setIsDeletingSession(true);
    setFeedbackBanner(null);

    try {
      const result = await deleteExamSessionAction(targetDeleteSession.id);

      if (!result.success) {
        setFeedbackBanner({
          type: "error",
          text:
            result.message ||
            "Gagal menghapus sesi peserta. Silakan coba kembali.",
        });
        setIsDeletingSession(false);
        return;
      }

      setSessions((prev) =>
        prev.filter((item) => item.id !== targetDeleteSession.id)
      );

      setFeedbackBanner({
        type: "success",
        text: `Sesi peserta "${targetDeleteSession.studentName}" dan seluruh riwayat jawabannya berhasil dihapus.`,
      });
      setTargetDeleteSession(null);
    } catch {
      setFeedbackBanner({
        type: "error",
        text: "Terjadi gangguan jaringan saat menghapus sesi peserta.",
      });
    } finally {
      setIsDeletingSession(false);
    }
  };

  // Hitung waktu pengerjaan terkini dan sisa waktu untuk sesi aktif
  const getLiveTimingInfo = (session: MonitoredSessionRow) => {
    const startMs = new Date(session.startedAt).getTime();
    if (Number.isNaN(startMs)) {
      return { elapsedLabel: "-", remainingLabel: "-" };
    }

    if (session.isCompleted) {
      return {
        elapsedLabel: formatActualDuration(
          session.startedAt,
          session.submittedAt
        ),
        remainingLabel: "Selesai",
      };
    }

    const elapsedSeconds = Math.max(0, Math.floor((nowMs - startMs) / 1000));
    const durationLimitMs = startMs + exam.duration_minutes * 60 * 1000;
    const scheduleEndMs = exam.ends_at
      ? new Date(exam.ends_at).getTime()
      : durationLimitMs;
    const effectiveEndMs = Number.isNaN(scheduleEndMs)
      ? durationLimitMs
      : Math.min(durationLimitMs, scheduleEndMs);

    const remainingSeconds = Math.max(
      0,
      Math.floor((effectiveEndMs - nowMs) / 1000)
    );

    return {
      elapsedLabel: formatClockHMS(elapsedSeconds),
      remainingLabel:
        remainingSeconds > 0
          ? `Sisa ${formatClockHMS(remainingSeconds)}`
          : "Waktu Habis",
    };
  };

  return (
    <div className="space-y-6">
      {/* Kartu Metrik Indikator Ringkas (F5-04) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Users className="size-4 text-indigo-600 dark:text-indigo-400" />
            <span>Total Peserta Terdaftar</span>
          </div>
          <p
            data-testid="metric-total-registered"
            className="mt-2 font-mono text-2xl font-bold tracking-tight text-slate-900 tabular-nums dark:text-slate-100"
          >
            {metrics.totalRegistered}
          </p>
        </div>

        <div className="rounded-xl border border-amber-200/70 bg-amber-50/40 p-4 shadow-xs dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="flex items-center gap-2 text-xs font-medium text-amber-800 dark:text-amber-300">
            <Clock className="size-4" />
            <span>Peserta Sedang Mengerjakan</span>
          </div>
          <p
            data-testid="metric-active-sessions"
            className="mt-2 font-mono text-2xl font-bold tracking-tight text-amber-700 tabular-nums dark:text-amber-300"
          >
            {metrics.activeCount}
          </p>
        </div>

        <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/40 p-4 shadow-xs dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="size-4" />
            <span>Peserta Telah Mengumpulkan</span>
          </div>
          <p
            data-testid="metric-completed-sessions"
            className="mt-2 font-mono text-2xl font-bold tracking-tight text-emerald-700 tabular-nums dark:text-emerald-300"
          >
            {metrics.completedCount}
          </p>
        </div>
      </div>

      {/* Notifikasi Status Aksi Paksa Kumpulkan */}
      {feedbackBanner ? (
        <div
          role="status"
          className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-xs font-medium ${
            feedbackBanner.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
              : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300"
          }`}
        >
          {feedbackBanner.type === "success" ? (
            <CheckCircle2 className="size-4 shrink-0" />
          ) : (
            <AlertCircle className="size-4 shrink-0" />
          )}
          <span>{feedbackBanner.text}</span>
        </div>
      ) : null}

      {/* Bilah Filter, Pencarian, dan Kontrol Pembaruan */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs lg:flex-row lg:items-center lg:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3">
          {/* Tab Filter Status Sesi */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100/80 p-1 text-xs dark:border-slate-800 dark:bg-slate-800/70">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                statusFilter === "all"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              Semua ({metrics.totalRegistered})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("active")}
              className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                statusFilter === "active"
                  ? "bg-white text-amber-700 shadow-xs dark:bg-slate-900 dark:text-amber-300"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              Aktif ({metrics.activeCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("completed")}
              className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                statusFilter === "completed"
                  ? "bg-white text-emerald-700 shadow-xs dark:bg-slate-900 dark:text-emerald-300"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              Selesai ({metrics.completedCount})
            </button>
          </div>

          {/* Filter Kelas */}
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

          {/* Pencarian Nama Peserta */}
          <div className="relative w-full sm:w-60">
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

        {/* Kontrol Pembaruan Otomatis & Segarkan Manual */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh((prev) => !prev)}
            className="h-9 gap-1.5 text-xs"
          >
            <Activity
              className={`size-3.5 ${
                autoRefresh
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-slate-400"
              }`}
            />
            <span>
              {autoRefresh ? "Pantau Otomatis: Aktif" : "Pantau Otomatis: Nonaktif"}
            </span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleRefreshData()}
            disabled={isRefreshing}
            className="h-9 gap-1.5 text-xs"
          >
            <RefreshCw
              className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span>Segarkan Data</span>
          </Button>
        </div>
      </div>

      {/* Tabel Peserta Aktif & Riwayat Sinkronisasi */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        {filteredSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
              <Activity className="size-6" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
              Tidak Ada Sesi Peserta yang Ditampilkan
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {sessions.length === 0
                ? "Belum ada peserta yang memulai pengerjaan pada naskah ujian ini."
                : "Tidak ada sesi peserta yang cocok dengan filter status, kelas, atau pencarian nama."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
                  <th className="px-4 py-3.5 text-center">No.</th>
                  <th className="px-4 py-3.5">Peserta & Kelas</th>
                  <th className="px-4 py-3.5">Waktu Mulai</th>
                  <th className="px-4 py-3.5">Waktu Pengerjaan Terkini</th>
                  <th className="px-4 py-3.5">Sinkronisasi Terakhir</th>
                  <th className="px-4 py-3.5 text-center">Status Sesi</th>
                  <th className="px-4 py-3.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                {filteredSessions.map((session, index) => {
                  const timing = getLiveTimingInfo(session);

                  return (
                    <tr
                      key={session.id}
                      className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
                    >
                      <td className="px-4 py-3.5 text-center font-mono text-slate-500 tabular-nums dark:text-slate-400">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {session.studentName}
                        </div>
                        <div className="mt-1">
                          <Badge
                            variant="outline"
                            className="text-[11px] font-medium"
                          >
                            {session.studentClass}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-600 tabular-nums dark:text-slate-400">
                        {formatReportTimestamp(session.startedAt)}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-mono font-semibold text-slate-900 tabular-nums dark:text-slate-100">
                          {timing.elapsedLabel}
                        </div>
                        <div className="mt-0.5 font-mono text-[11px] text-slate-500 tabular-nums dark:text-slate-400">
                          {timing.remainingLabel}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-mono text-slate-700 tabular-nums dark:text-slate-300">
                          {session.lastSyncedAt
                            ? formatReportTimestamp(session.lastSyncedAt)
                            : "Belum ada sinkronisasi"}
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                          Terjawab: {session.answeredCount} / {totalQuestions} Soal
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {session.isCompleted ? (
                          <Badge variant="success">Selesai</Badge>
                        ) : (
                          <Badge variant="warning">Aktif</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {!session.isCompleted ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => setTargetForceSession(session)}
                              title="Paksa Kumpulkan"
                              aria-label={`Paksa Kumpulkan ${session.studentName}`}
                              className="size-8 text-amber-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 dark:border-amber-900/50 dark:text-amber-400 dark:hover:bg-amber-950/40"
                            >
                              <ShieldAlert className="size-4" />
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setTargetDeleteSession(session)}
                            title="Hapus Sesi Peserta"
                            aria-label={`Hapus Sesi ${session.studentName}`}
                            className="size-8 text-rose-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Dialog Konfirmasi Paksa Kumpulkan (Force Submit) */}
      <Dialog
        open={!!targetForceSession}
        onOpenChange={(open) => {
          if (!open && !isForceSubmitting) {
            setTargetForceSession(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-50">
              <ShieldAlert className="size-5 text-rose-600 dark:text-rose-400" />
              <span>Konfirmasi Paksa Kumpulkan Sesi Peserta</span>
            </DialogTitle>
            <DialogDescription className="pt-2 leading-relaxed">
              Apakah Anda yakin ingin mengakhiri secara paksa sesi ujian untuk
              peserta{" "}
              <strong className="text-slate-900 dark:text-slate-100">
                {targetForceSession?.studentName}
              </strong>{" "}
              ({targetForceSession?.studentClass})? Tindakan ini akan segera
              menghentikan hak akses pengisian peserta dan menghitung nilai
              akhir dari jawaban terakhir yang tersimpan di server.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                disabled={isForceSubmitting}
              >
                Batal
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleConfirmForceSubmit()}
              disabled={isForceSubmitting}
              className="gap-1.5"
            >
              {isForceSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="size-4" />
                  <span>Ya, Paksa Kumpulkan</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Dialog Konfirmasi Hapus Sesi Ujian */}
      <Dialog
        open={!!targetDeleteSession}
        onOpenChange={(open) => {
          if (!open && !isDeletingSession) {
            setTargetDeleteSession(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <Trash2 className="size-5" />
              <span>Hapus Sesi Ujian Peserta</span>
            </DialogTitle>
            <DialogDescription className="pt-2 leading-relaxed">
              Apakah Anda yakin ingin menghapus seluruh sesi ujian dan riwayat jawaban untuk peserta{" "}
              <strong className="text-slate-900 dark:text-slate-100">
                {targetDeleteSession?.studentName}
              </strong>{" "}
              ({targetDeleteSession?.studentClass})?
              <br />
              <br />
              <span className="font-medium text-rose-600 dark:text-rose-400">
                Perhatian: Tindakan ini permanen dan tidak dapat dibatalkan.
              </span>{" "}
              Sesi aktif pada browser peserta akan segera diinvalidasi dan peserta akan dikeluarkan ke halaman utama. Kuota kode rujukan juga akan dipulihkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                disabled={isDeletingSession}
              >
                Batal
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleConfirmDeleteSession()}
              disabled={isDeletingSession}
              className="gap-1.5"
            >
              {isDeletingSession ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Menghapus...</span>
                </>
              ) : (
                <>
                  <Trash2 className="size-4" />
                  <span>Ya, Hapus Sesi</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

