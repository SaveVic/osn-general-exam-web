import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, renderHook, act } from "@testing-library/react";
import { syncBatchAnswersSchema } from "@/lib/validations/session";
import { useExamSessionStore } from "@/lib/stores/exam-session-store";
import { SyncStatusBadge } from "@/components/exam-room/sync-status-badge";
import { useExamSyncEngine, SYNC_INTERVAL_MS } from "@/hooks/use-exam-sync-engine";
import * as examSessionActions from "@/actions/exam-session";
import { generateSessionToken, hashSessionToken } from "@/lib/security/session-token";
import type { ClientQuestionItem } from "@/actions/exam-session";

// Mock next/headers cookies()
const mockCookieGet = vi.fn();
const mockCookieSet = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: mockCookieGet,
    set: mockCookieSet,
  })),
}));

// Mock Supabase Service Client
const mockServiceFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createServiceClient: vi.fn(() => ({
    from: mockServiceFrom,
  })),
}));

const sampleQuestions: ClientQuestionItem[] = [
  {
    id: "q-1",
    exam_id: "exam-1",
    order_index: 1,
    question_type: "single_choice",
    prompt: "Soal 1",
    options: [
      { id: "A", text: "Opsi A" },
      { id: "B", text: "Opsi B" },
    ],
    points: 2,
  },
  {
    id: "q-2",
    exam_id: "exam-1",
    order_index: 2,
    question_type: "multiple_choice",
    prompt: "Soal 2",
    options: [
      { id: "A", text: "Opsi A" },
      { id: "B", text: "Opsi B" },
    ],
    points: 4,
  },
  {
    id: "q-3",
    exam_id: "exam-1",
    order_index: 3,
    question_type: "short_answer",
    prompt: "Soal 3",
    options: [],
    points: 5,
  },
];

describe("F4-01 Unit Tests: Skema Validasi & Pelacakan Selisih (Diff) di Zustand Store", () => {
  beforeEach(() => {
    localStorage.clear();
    useExamSessionStore.getState().clearSession();
  });

  it("syncBatchAnswersSchema memvalidasi payload batch jawaban dan menolak daftar kosong", () => {
    const valid = syncBatchAnswersSchema.safeParse({
      sessionId: "sess-123",
      answers: [
        { questionId: "q-1", answerValue: { selected: "A" }, isFlagged: false },
        { questionId: "q-2", answerValue: null, isFlagged: true },
      ],
    });
    expect(valid.success).toBe(true);

    const emptyAnswers = syncBatchAnswersSchema.safeParse({
      sessionId: "sess-123",
      answers: [],
    });
    expect(emptyAnswers.success).toBe(false);

    const emptySession = syncBatchAnswersSchema.safeParse({
      sessionId: "   ",
      answers: [{ questionId: "q-1", answerValue: { selected: "A" } }],
    });
    expect(emptySession.success).toBe(false);
  });

  it("useExamSessionStore melacak dirtyQuestionIds tanpa duplikat, mengubah syncStatus ke 'local', dan menyimpannya ke localStorage", () => {
    useExamSessionStore.getState().initSession({
      sessionId: "sess-sync-1",
      examId: "exam-1",
      examTitle: "OSN Kimia",
      durationMinutes: 90,
      startedAt: "2026-10-20T08:00:00.000Z",
      serverEndTime: "2026-10-20T09:30:00.000Z",
      studentName: "Rizky Pratama",
      studentClass: "11-IPA-1",
      questions: sampleQuestions,
    });

    expect(useExamSessionStore.getState().syncStatus).toBe("synced");
    expect(useExamSessionStore.getState().dirtyQuestionIds).toEqual([]);

    // 1. Jawab q-1 dua kali -> dirtyQuestionIds hanya menyimpan satu entri 'q-1'
    useExamSessionStore.getState().setAnswer("q-1", { selected: "A" });
    useExamSessionStore.getState().setAnswer("q-1", { selected: "B" });
    expect(useExamSessionStore.getState().dirtyQuestionIds).toEqual(["q-1"]);
    expect(useExamSessionStore.getState().syncStatus).toBe("local");

    // 2. Tandai ragu-ragu pada q-2
    useExamSessionStore.getState().toggleFlag("q-2");
    expect(useExamSessionStore.getState().dirtyQuestionIds).toEqual(["q-1", "q-2"]);

    // 3. Pastikan dirtyQuestionIds tersimpan di localStorage (Tier 1 Persistence)
    const rawStorage = JSON.parse(localStorage.getItem("osn_exam_session_storage")!);
    expect(rawStorage.state.dirtyQuestionIds).toEqual(["q-1", "q-2"]);

    // 4. Tandai q-1 telah tersinkronisasi -> q-2 masih dirty sehingga status tetap 'local'
    useExamSessionStore
      .getState()
      .markQuestionsSynced(["q-1"], "2026-10-20T08:05:00.000Z");
    expect(useExamSessionStore.getState().dirtyQuestionIds).toEqual(["q-2"]);
    expect(useExamSessionStore.getState().syncStatus).toBe("local");

    // 5. Tandai q-2 telah tersinkronisasi -> dirty kosong sehingga status menjadi 'synced'
    useExamSessionStore
      .getState()
      .markQuestionsSynced(["q-2"], "2026-10-20T08:05:10.000Z");
    expect(useExamSessionStore.getState().dirtyQuestionIds).toEqual([]);
    expect(useExamSessionStore.getState().syncStatus).toBe("synced");
    expect(useExamSessionStore.getState().lastSyncedAt).toBe(
      "2026-10-20T08:05:10.000Z"
    );
  });
});

describe("F4-01 Component Tests: Indikator Status Sinkronisasi (SyncStatusBadge)", () => {
  it("merender 'Tersimpan di perangkat' untuk status 'local' maupun 'error'", () => {
    const { rerender } = render(<SyncStatusBadge syncStatus="local" />);
    expect(screen.getByRole("status")).toHaveTextContent("Tersimpan di perangkat");

    rerender(<SyncStatusBadge syncStatus="error" />);
    expect(screen.getByRole("status")).toHaveTextContent("Tersimpan di perangkat");
  });

  it("merender 'Menyinkronkan ke server...' dengan ikon putar untuk status 'syncing'", () => {
    render(<SyncStatusBadge syncStatus="syncing" />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Menyinkronkan ke server..."
    );
  });

  it("merender 'Tersinkronisasi aman' dengan aksen hijau untuk status 'synced'", () => {
    render(<SyncStatusBadge syncStatus="synced" />);
    expect(screen.getByRole("status")).toHaveTextContent("Tersinkronisasi aman");
  });
});

describe("F4-01 Integration Tests: Server Action syncBatchAnswersAction & Mesin Sinkronisasi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useExamSessionStore.getState().clearSession();
  });

  it("syncBatchAnswersAction memverifikasi token cookie sesi dan melakukan UPSERT ke tabel session_answers", async () => {
    const rawToken = generateSessionToken();
    const tokenHash = hashSessionToken(rawToken);
    const now = Date.now();

    mockCookieGet.mockReturnValueOnce({ value: rawToken });

    // 1. Mock select exam_sessions di dalam verifyActiveSessionAction
    mockServiceFrom.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValueOnce({
            data: {
              id: "sess-upsert-1",
              session_token_hash: tokenHash,
              started_at: new Date(now - 300_000).toISOString(),
              is_completed: false,
              exams: {
                id: "exam-1",
                duration_minutes: 90,
                ends_at: new Date(now + 3600_000).toISOString(),
              },
            },
            error: null,
          }),
        })),
      })),
    });

    // 2. Mock upsert ke session_answers
    const mockUpsert = vi.fn().mockResolvedValueOnce({ error: null });
    mockServiceFrom.mockReturnValueOnce({
      upsert: mockUpsert,
    });

    const result = await examSessionActions.syncBatchAnswersAction({
      sessionId: "sess-upsert-1",
      answers: [
        { questionId: "q-1", answerValue: { selected: "B" }, isFlagged: false },
        { questionId: "q-3", answerValue: { text: "42" }, isFlagged: true },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.syncedCount).toBe(2);
    expect(mockServiceFrom).toHaveBeenCalledWith("session_answers");
    expect(mockUpsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          session_id: "sess-upsert-1",
          question_id: "q-1",
          answer_value: { selected: "B" },
          is_flagged: false,
        }),
        expect.objectContaining({
          session_id: "sess-upsert-1",
          question_id: "q-3",
          answer_value: { text: "42" },
          is_flagged: true,
        }),
      ],
      { onConflict: "session_id,question_id" }
    );
  });

  it("syncBatchAnswersAction menolak sinkronisasi jika batas waktu ujian + toleransi 60 detik telah terlampaui", async () => {
    const rawToken = generateSessionToken();
    const tokenHash = hashSessionToken(rawToken);
    const now = Date.now();

    mockCookieGet.mockReturnValueOnce({ value: rawToken });

    // Sesi dimulai 100 menit yang lalu untuk ujian berdurasi 60 menit (sudah lewat > 60s grace period)
    mockServiceFrom.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValueOnce({
            data: {
              id: "sess-expired",
              session_token_hash: tokenHash,
              started_at: new Date(now - 100 * 60_000).toISOString(),
              is_completed: false,
              exams: {
                id: "exam-1",
                duration_minutes: 60,
                ends_at: new Date(now + 3600_000).toISOString(),
              },
            },
            error: null,
          }),
        })),
      })),
    });

    const result = await examSessionActions.syncBatchAnswersAction({
      sessionId: "sess-expired",
      answers: [{ questionId: "q-1", answerValue: { selected: "A" }, isFlagged: false }],
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain("Batas waktu pengerjaan ujian telah berakhir");
  });

  describe("useExamSyncEngine: 3 Pemicu Otomatis & Ketahanan Offline", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      useExamSessionStore.getState().initSession({
        sessionId: "sess-engine-1",
        examId: "exam-1",
        examTitle: "OSN Informatika",
        durationMinutes: 90,
        startedAt: "2026-10-20T08:00:00.000Z",
        serverEndTime: "2026-10-20T09:30:00.000Z",
        studentName: "Siti Rahma",
        studentClass: "12-IPA-1",
        questions: sampleQuestions,
      });
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it("memicu sinkronisasi otomatis pada: (1) Interval 30 detik, (2) Perpindahan Nomor Soal, dan (3) visibilitychange, serta tahan putus koneksi", async () => {
      const syncSpy = vi
        .spyOn(examSessionActions, "syncBatchAnswersAction")
        .mockResolvedValue({
          success: true,
          syncedAt: "2026-10-20T08:00:30.000Z",
          syncedCount: 1,
        });

      renderHook(() => useExamSyncEngine("sess-engine-1", true));

      // --- UJI PEMICU 1: Interval 30 Detik ---
      act(() => {
        useExamSessionStore.getState().setAnswer("q-1", { selected: "A" });
      });
      expect(useExamSessionStore.getState().syncStatus).toBe("local");

      await act(async () => {
        await vi.advanceTimersByTimeAsync(SYNC_INTERVAL_MS);
      });

      expect(syncSpy).toHaveBeenCalledTimes(1);
      expect(syncSpy).toHaveBeenLastCalledWith({
        sessionId: "sess-engine-1",
        answers: [
          { questionId: "q-1", answerValue: { selected: "A" }, isFlagged: false },
        ],
      });
      expect(useExamSessionStore.getState().dirtyQuestionIds).toEqual([]);
      expect(useExamSessionStore.getState().syncStatus).toBe("synced");

      // --- UJI PEMICU 2: Perpindahan Nomor Soal (Navigation Trigger) ---
      // Siswa menjawab q-2 lalu berpindah dari indeks 0 ke indeks 1
      act(() => {
        useExamSessionStore.getState().setAnswer("q-2", { selected: ["A", "B"] });
      });
      expect(useExamSessionStore.getState().dirtyQuestionIds).toEqual(["q-2"]);

      await act(async () => {
        useExamSessionStore.getState().setCurrentIndex(1);
      });

      // Pastikan hanya selisih (q-2) yang dikirim, bukan q-1 yang sudah tersinkronisasi
      expect(syncSpy).toHaveBeenCalledTimes(2);
      expect(syncSpy).toHaveBeenLastCalledWith({
        sessionId: "sess-engine-1",
        answers: [
          {
            questionId: "q-2",
            answerValue: { selected: ["A", "B"] },
            isFlagged: false,
          },
        ],
      });
      expect(useExamSessionStore.getState().dirtyQuestionIds).toEqual([]);
      expect(useExamSessionStore.getState().syncStatus).toBe("synced");

      // --- UJI KETAHANAN OFFLINE & PEMICU 3 (visibilitychange / online) ---
      // Simulasikan koneksi terputus saat tab diminimalkan
      syncSpy.mockResolvedValueOnce({
        success: false,
        message: "Gangguan jaringan",
      });

      act(() => {
        useExamSessionStore.getState().toggleFlag("q-3");
      });

      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => "hidden",
      });

      await act(async () => {
        document.dispatchEvent(new Event("visibilitychange"));
      });

      expect(syncSpy).toHaveBeenCalledTimes(3);
      // Karena gagal jaringan, q-3 tetap berada di dirtyQuestionIds & localStorage
      expect(useExamSessionStore.getState().dirtyQuestionIds).toEqual(["q-3"]);
      expect(useExamSessionStore.getState().syncStatus).toBe("error");

      // Saat jaringan kembali pulih (event 'online'), otomatis menyinkronkan ulang dan sukses!
      await act(async () => {
        window.dispatchEvent(new Event("online"));
      });

      expect(syncSpy).toHaveBeenCalledTimes(4);
      expect(useExamSessionStore.getState().dirtyQuestionIds).toEqual([]);
      expect(useExamSessionStore.getState().syncStatus).toBe("synced");
    });
  });
});

