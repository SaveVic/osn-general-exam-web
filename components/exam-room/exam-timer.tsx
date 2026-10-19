"use client";

import { useEffect, useState, useRef } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExamTimerProps {
  serverEndTime: string | null;
  serverTimeOffsetMs?: number;
  onExpire?: () => void;
  className?: string;
}

export function ExamTimer({
  serverEndTime,
  serverTimeOffsetMs = 0,
  onExpire,
  className,
}: ExamTimerProps) {
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const hasExpiredRef = useRef(false);

  useEffect(() => {
    if (!serverEndTime) {
      setSecondsRemaining(null);
      return;
    }

    const targetTime = new Date(serverEndTime).getTime();

    const updateTimer = () => {
      const syncedNow = Date.now() + serverTimeOffsetMs;
      const diff = Math.max(0, Math.floor((targetTime - syncedNow) / 1000));
      setSecondsRemaining(diff);

      if (diff === 0 && !hasExpiredRef.current) {
        hasExpiredRef.current = true;
        onExpire?.();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [serverEndTime, serverTimeOffsetMs, onExpire]);

  if (secondsRemaining === null) {
    return (
      <div className={cn("flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-500 dark:bg-slate-800", className)}>
        <Clock className="size-4 animate-spin text-indigo-600 dark:text-indigo-400" />
        <span>Menghitung waktu...</span>
      </div>
    );
  }

  const hours = Math.floor(secondsRemaining / 3600);
  const minutes = Math.floor((secondsRemaining % 3600) / 60);
  const seconds = secondsRemaining % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  const formattedTime = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  // Status visual penunjuk waktu sesuai spesifikasi F4-03:
  // <= 1 menit (60 detik): merah berkedip lembut (animate-pulse)
  // <= 5 menit (300 detik): kuning peringatan
  const isCritical = secondsRemaining > 0 && secondsRemaining <= 60;
  const isWarning = secondsRemaining > 60 && secondsRemaining <= 300;
  const isEnded = secondsRemaining === 0;

  return (
    <div
      aria-label="Sisa Waktu Ujian"
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-1.5 transition-colors sm:px-4 sm:py-2",
        isEnded && "border-rose-300 bg-rose-100 text-rose-700 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300",
        isCritical && "animate-pulse border-rose-300 bg-rose-50 text-rose-600 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400",
        isWarning && "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
        !isCritical && !isWarning && !isEnded && "border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100",
        className
      )}
    >
      {isCritical || isEnded ? (
        <AlertTriangle className="size-4 shrink-0 text-rose-600 dark:text-rose-400" />
      ) : (
        <Clock className={cn("size-4 shrink-0", isWarning ? "text-amber-600 dark:text-amber-400" : "text-indigo-600 dark:text-indigo-400")} />
      )}

      <div className="flex flex-col leading-tight sm:flex-row sm:items-center sm:gap-2">
        <span className="hidden text-[11px] font-medium tracking-wider text-slate-500 uppercase sm:inline dark:text-slate-400">
          Sisa Waktu:
        </span>
        <span className="font-mono text-base font-bold tracking-tight tabular-nums sm:text-lg">
          {formattedTime}
        </span>
      </div>
    </div>
  );
}

