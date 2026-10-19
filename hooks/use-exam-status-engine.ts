"use client";

import { useEffect, useRef, useState } from "react";

export type ExamStatusPhase = "NOT_STARTED" | "IN_PROGRESS" | "ENDED";

export interface ExamStatusEngineResult {
  status: ExamStatusPhase;
  countdownText: string;
  msRemaining: number;
  serverTimeNow: Date;
}

/**
 * Format selisih milidetik ke string waktu tabular "HH:MM:SS" atau "Dh HH:MM:SS"
 */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return "00:00:00";

  const totalSeconds = Math.floor(ms / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const totalHours = Math.floor(totalMinutes / 60);
  const hours = totalHours % 24;
  const days = Math.floor(totalHours / 24);

  const pad = (n: number) => n.toString().padStart(2, "0");

  if (days > 0) {
    return `${days} Hari ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

interface UseExamStatusEngineOptions {
  startsAt: string;
  endsAt: string;
  serverTime: string;
}

/**
 * Hook Mesin Status Waktu Dinamis (Dynamic Status Engine)
 * Menggunakan sinkronisasi delta t (serverTime - clientReceivedTime) untuk presisi anti-tamper.
 */
export function useExamStatusEngine({
  startsAt,
  endsAt,
  serverTime,
}: UseExamStatusEngineOptions): ExamStatusEngineResult {
  // Hitung offset waktu server terhadap waktu lokal klien saat muat awal
  const offsetRef = useRef<number>(0);
  const isOffsetInitialized = useRef<boolean>(false);

  if (!isOffsetInitialized.current) {
    const serverTimestamp = new Date(serverTime).getTime();
    const clientTimestamp = Date.now();
    offsetRef.current = !isNaN(serverTimestamp)
      ? serverTimestamp - clientTimestamp
      : 0;
    isOffsetInitialized.current = true;
  }

  const startMs = new Date(startsAt).getTime();
  const endMs = new Date(endsAt).getTime();

  // Fungsi evaluasi status waktu saat ini
  const evaluateCurrentStatus = (): ExamStatusEngineResult => {
    const currentServerMs = Date.now() + offsetRef.current;
    const serverTimeNow = new Date(currentServerMs);

    if (currentServerMs < startMs) {
      const msRemaining = Math.max(0, startMs - currentServerMs);
      return {
        status: "NOT_STARTED",
        countdownText: formatCountdown(msRemaining),
        msRemaining,
        serverTimeNow,
      };
    }

    if (currentServerMs <= endMs) {
      const msRemaining = Math.max(0, endMs - currentServerMs);
      return {
        status: "IN_PROGRESS",
        countdownText: formatCountdown(msRemaining),
        msRemaining,
        serverTimeNow,
      };
    }

    return {
      status: "ENDED",
      countdownText: "00:00:00",
      msRemaining: 0,
      serverTimeNow,
    };
  };

  const [engineState, setEngineState] = useState<ExamStatusEngineResult>(evaluateCurrentStatus);

  useEffect(() => {
    // Evaluasi awal
    setEngineState(evaluateCurrentStatus());

    // Timer ticker setiap 500ms untuk transisi detik yang mulus dan presisi
    const interval = setInterval(() => {
      setEngineState(evaluateCurrentStatus());
    }, 500);

    return () => clearInterval(interval);
  }, [startsAt, endsAt, serverTime]);

  return engineState;
}

