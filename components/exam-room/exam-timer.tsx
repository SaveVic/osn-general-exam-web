"use client";

import { useEffect, useState, useRef } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExamTimerProps {
  serverEndTime: string | null;
  onExpire?: () => void;
  className?: string;
}

export function ExamTimer({ serverEndTime, onExpire, className }: ExamTimerProps) {
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const hasExpiredRef = useRef(false);

  useEffect(() => {
    if (!serverEndTime) {
      setSecondsRemaining(null);
      return;
    }

    const targetTime = new Date(serverEndTime).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((targetTime - now) / 1000));
      setSecondsRemaining(diff);

      if (diff === 0 && !hasExpiredRef.current) {
        hasExpiredRef.current = true;
        onExpire?.();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [serverEndTime, onExpire]);

  if (secondsRemaining === null) {
    return (
      <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-500", className)}>
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

  // Status visual penunjuk waktu
  const isCritical = secondsRemaining > 0 && secondsRemaining <= 120; // <= 2 menit
  const isWarning = secondsRemaining > 120 && secondsRemaining <= 600; // <= 10 menit
  const isEnded = secondsRemaining === 0;

  return (
    <div
      aria-label="Sisa Waktu Ujian"
      className={cn(
        "flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border transition-colors",
        isEnded && "bg-rose-100 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300",
        isCritical && "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-900 text-rose-600 dark:text-rose-400 animate-pulse",
        isWarning && "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-900 text-amber-700 dark:text-amber-300",
        !isCritical && !isWarning && !isEnded && "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100",
        className
      )}
    >
      {isCritical || isEnded ? (
        <AlertTriangle className="size-4 shrink-0 text-rose-600 dark:text-rose-400" />
      ) : (
        <Clock className={cn("size-4 shrink-0", isWarning ? "text-amber-600 dark:text-amber-400" : "text-indigo-600 dark:text-indigo-400")} />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 leading-tight">
        <span className="hidden sm:inline text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Sisa Waktu:
        </span>
        <span className="font-mono text-base sm:text-lg font-bold tabular-nums tracking-tight">
          {formattedTime}
        </span>
      </div>
    </div>
  );
}

