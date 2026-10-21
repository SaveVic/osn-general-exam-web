"use client";

import { useCallback, useEffect, useRef } from "react";
import { useExamSessionStore, type ExamSyncStatus } from "@/lib/stores/exam-session-store";
import { syncBatchAnswersAction, checkSessionHeartbeatAction } from "@/actions/exam-session";

export const SYNC_INTERVAL_MS = 30_000; // 30 detik sesuai spesifikasi F4-01

export interface UseExamSyncEngineResult {
  syncStatus: ExamSyncStatus;
  lastSyncedAt: string | null;
  dirtyCount: number;
  flushSync: () => Promise<boolean>;
}

/**
 * Custom Hook F4-01 (EXM-SYNC-01): Mesin Sinkronisasi Latar Belakang Dua Lapis (Tier 2)
 * Mengirimkan selisih jawaban (dirtyQuestionIds) ke Server Action melalui:
 * 1. Interval berkala setiap 30 detik
 * 2. Pemicu perpindahan nomor soal (navigation trigger)
 * 3. Peristiwa visibilitychange (tab diminimalkan/ditutup) & pemulihan jaringan (online)
 */
export function useExamSyncEngine(
  sessionId: string,
  enabled: boolean = true
): UseExamSyncEngineResult {
  const syncStatus = useExamSessionStore((state) => state.syncStatus);
  const lastSyncedAt = useExamSessionStore((state) => state.lastSyncedAt);
  const dirtyQuestionIds = useExamSessionStore((state) => state.dirtyQuestionIds);
  const currentIndex = useExamSessionStore((state) => state.currentIndex);
  const isSubmitted = useExamSessionStore((state) => state.isSubmitted);

  const isSyncingRef = useRef(false);
  const prevIndexRef = useRef<number>(currentIndex);

  const flushSync = useCallback(async (): Promise<boolean> => {
    if (!enabled || isSyncingRef.current) return false;

    const state = useExamSessionStore.getState();
    if (
      state.isSubmitted ||
      !state.sessionId ||
      state.sessionId !== sessionId ||
      state.dirtyQuestionIds.length === 0
    ) {
      return false;
    }

    isSyncingRef.current = true;
    const dirtyIdsToSync = [...state.dirtyQuestionIds];

    // Rekam snapshot nilai saat pengiriman dimulai agar perubahan baru selama request berjalan tidak tertimpa
    const snapshotMap = new Map<string, string>();
    const payloadAnswers = dirtyIdsToSync.map((qId) => {
      const answerValue = state.answersMap[qId] ?? null;
      const isFlagged = Boolean(state.flaggedMap[qId]);
      snapshotMap.set(qId, JSON.stringify({ answerValue, isFlagged }));
      return {
        questionId: qId,
        answerValue,
        isFlagged,
      };
    });

    state.setSyncStatus("syncing");

    try {
      const result = await syncBatchAnswersAction({
        sessionId,
        answers: payloadAnswers,
      });

      if (result.success) {
        const latestState = useExamSessionStore.getState();
        // Hanya hapus questionId dari dirtyQuestionIds jika nilainya belum diubah lagi selama request berlangsung
        const unchangedIds = dirtyIdsToSync.filter((qId) => {
          const currentAnswerValue = latestState.answersMap[qId] ?? null;
          const currentFlagged = Boolean(latestState.flaggedMap[qId]);
          const currentSerialized = JSON.stringify({
            answerValue: currentAnswerValue,
            isFlagged: currentFlagged,
          });
          return snapshotMap.get(qId) === currentSerialized;
        });

        latestState.markQuestionsSynced(
          unchangedIds,
          result.syncedAt || new Date().toISOString()
        );
        return true;
      } else {
        if (result.sessionInvalid) {
          useExamSessionStore.getState().setSessionTerminated(result.message);
        }
        useExamSessionStore.getState().setSyncStatus("error");
        return false;
      }
    } catch {
      useExamSessionStore.getState().setSyncStatus("error");
      return false;
    } finally {
      isSyncingRef.current = false;
    }
  }, [enabled, sessionId]);

  // Pemicu 1: Interval otomatis setiap 30 detik (Sinkronisasi perubahan atau Heartbeat keabsahan sesi)
  useEffect(() => {
    if (!enabled || isSubmitted) return;

    const interval = setInterval(async () => {
      const state = useExamSessionStore.getState();
      if (state.isTerminated) return;

      if (state.dirtyQuestionIds.length > 0) {
        void flushSync();
      } else {
        try {
          const hb = await checkSessionHeartbeatAction(sessionId);
          if (!hb.valid && hb.sessionInvalid) {
            useExamSessionStore.getState().setSessionTerminated(hb.message);
          }
        } catch {
          // Abaikan kegagalan jaringan sementara pada detak heartbeat
        }
      }
    }, SYNC_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [enabled, isSubmitted, flushSync, sessionId]);

  // Pemicu 2: Perpindahan nomor soal (navigation trigger)
  useEffect(() => {
    if (!enabled || isSubmitted) return;

    if (prevIndexRef.current !== currentIndex) {
      prevIndexRef.current = currentIndex;
      if (useExamSessionStore.getState().dirtyQuestionIds.length > 0) {
        void flushSync();
      }
    }
  }, [currentIndex, enabled, isSubmitted, flushSync]);

  // Pemicu 3: Peristiwa visibilitychange (tab diminimalkan/berpindah) & online reconnect
  useEffect(() => {
    if (!enabled || isSubmitted) return;

    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "hidden" &&
        useExamSessionStore.getState().dirtyQuestionIds.length > 0
      ) {
        void flushSync();
      }
    };

    const handleOnline = () => {
      if (useExamSessionStore.getState().dirtyQuestionIds.length > 0) {
        void flushSync();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
    };
  }, [enabled, isSubmitted, flushSync]);

  return {
    syncStatus,
    lastSyncedAt,
    dirtyCount: dirtyQuestionIds.length,
    flushSync,
  };
}

