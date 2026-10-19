"use client";

import React from "react";
import type { ExamSyncStatus } from "@/lib/stores/exam-session-store";
import { Check, Cloud, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SyncStatusBadgeProps {
  syncStatus: ExamSyncStatus;
  className?: string;
}

/**
 * Komponen F4-01 (EXM-SYNC-01): Indikator Status Sinkronisasi di Bilah Atas Ruang Ujian
 * - "Tersimpan di perangkat" (ikon ceklis abu-abu)
 * - "Menyinkronkan ke server..." (ikon putar halus)
 * - "Tersinkronisasi aman" (ikon awan tercentang hijau)
 */
export function SyncStatusBadge({ syncStatus, className }: SyncStatusBadgeProps) {
  if (syncStatus === "syncing") {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label="Status Sinkronisasi: Menyinkronkan ke server"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50/70 px-2.5 py-1 text-[11px] font-medium text-indigo-700 transition-colors dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300",
          className
        )}
      >
        <Loader2 className="size-3.5 shrink-0 animate-spin text-indigo-600 dark:text-indigo-400" />
        <span>Menyinkronkan ke server...</span>
      </div>
    );
  }

  if (syncStatus === "synced") {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label="Status Sinkronisasi: Tersinkronisasi aman"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/70 px-2.5 py-1 text-[11px] font-medium text-emerald-700 transition-colors dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
          className
        )}
      >
        <span className="relative flex items-center justify-center text-emerald-600 dark:text-emerald-400">
          <Cloud className="size-3.5 shrink-0" />
          <Check className=" -ml-1 size-2.5 shrink-0 stroke-3" />
        </span>
        <span>Tersinkronisasi aman</span>
      </div>
    );
  }

  // Default untuk "local" maupun "error" (saat offline/menunggu jadwal sinkronisasi berikutnya)
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Status Sinkronisasi: Tersimpan di perangkat"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 transition-colors dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300",
        className
      )}
    >
      <Check className="size-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
      <span>Tersimpan di perangkat</span>
    </div>
  );
}

