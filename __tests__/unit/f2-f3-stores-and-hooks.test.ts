import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useExamGateStore } from "@/lib/stores/exam-gate-store";
import { useExamSessionStore } from "@/lib/stores/exam-session-store";
import {
  useExamStatusEngine,
  formatCountdown,
} from "@/hooks/use-exam-status-engine";
import { isQuestionAnswered } from "@/components/exam-room/palette/question-palette-grid";
import type { ClientQuestionItem } from "@/actions/exam-session";

const mockQuestions: ClientQuestionItem[] = [
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

describe("F2-01 & F2-02: Zustand Gate Store (lib/stores/exam-gate-store.ts)", () => {
  beforeEach(() => {
    useExamGateStore.getState().resetGate();
  });

  it("mengelola state kode, menghapus galat saat kode diubah, dan mereset identitas saat verifikasi baru", () => {
    const store = useExamGateStore.getState();

    store.setError("Kode tidak ditemukan");
    expect(useExamGateStore.getState().error).toBe("Kode tidak ditemukan");

    store.setCode("OSN26-ABCD");
    expect(useExamGateStore.getState().code).toBe("OSN26-ABCD");
    expect(useExamGateStore.getState().error).toBeNull();

    store.setStudentName("Andi Wijaya");
    store.setStudentClass("11-IPA-1");

    store.setVerifiedData({
      referralCode: "OSN26-ABCD",
      referralCodeId: "ref-1",
      serverTime: "2026-10-20T08:00:00.000Z",
      exam: {
        id: "exam-1",
        title: "Simulasi OSN",
        description: null,
        duration_minutes: 90,
        starts_at: "2026-10-20T08:00:00.000Z",
        ends_at: "2026-10-20T10:00:00.000Z",
        class_options: ["10-A", "11-IPA-1"],
      },
    });

    const updated = useExamGateStore.getState();
    expect(updated.verifiedData?.exam.title).toBe("Simulasi OSN");
    expect(updated.studentName).toBe("");
    expect(updated.studentClass).toBe("");
    expect(updated.isVerifying).toBe(false);
  });
});

describe("F3-01, F3-02, F3-03: Zustand Exam Session Store & Persistensi LocalStorage", () => {
  beforeEach(() => {
    localStorage.clear();
    useExamSessionStore.getState().clearSession();
  });

  it("menginisialisasi sesi, menyimpan jawaban, menghapus jawaban, menandai ragu-ragu, dan membatasi indeks navigasi", () => {
    useExamSessionStore.getState().initSession({
      sessionId: "sess-123",
      examId: "exam-1",
      examTitle: "OSN Fisika",
      durationMinutes: 120,
      startedAt: "2026-10-20T08:00:00.000Z",
      serverEndTime: "2026-10-20T10:00:00.000Z",
      studentName: "Rina Kusuma",
      studentClass: "12-IPA-1",
      questions: mockQuestions,
    });

    expect(useExamSessionStore.getState().sessionId).toBe("sess-123");
    expect(useExamSessionStore.getState().currentIndex).toBe(0);

    // Uji batas bawah prevQuestion di indeks 0
    useExamSessionStore.getState().prevQuestion();
    expect(useExamSessionStore.getState().currentIndex).toBe(0);

    // Uji nextQuestion dan batas atas
    useExamSessionStore.getState().nextQuestion();
    expect(useExamSessionStore.getState().currentIndex).toBe(1);
    useExamSessionStore.getState().nextQuestion();
    expect(useExamSessionStore.getState().currentIndex).toBe(2);
    useExamSessionStore.getState().nextQuestion();
    expect(useExamSessionStore.getState().currentIndex).toBe(2); // Tidak melebihi indeks terakhir

    // Uji lompatan indeks valid & di luar batas
    useExamSessionStore.getState().setCurrentIndex(0);
    expect(useExamSessionStore.getState().currentIndex).toBe(0);
    useExamSessionStore.getState().setCurrentIndex(99);
    expect(useExamSessionStore.getState().currentIndex).toBe(0);

    // Uji penyimpanan jawaban & hapus jawaban
    useExamSessionStore.getState().setAnswer("q-1", { selected: "B" });
    expect(useExamSessionStore.getState().answersMap["q-1"]).toEqual({
      selected: "B",
    });

    useExamSessionStore.getState().clearAnswer("q-1");
    expect(useExamSessionStore.getState().answersMap["q-1"]).toBeUndefined();

    // Uji toggle ragu-ragu
    useExamSessionStore.getState().toggleFlag("q-2");
    expect(useExamSessionStore.getState().flaggedMap["q-2"]).toBe(true);
    useExamSessionStore.getState().toggleFlag("q-2");
    expect(useExamSessionStore.getState().flaggedMap["q-2"]).toBe(false);
  });

  it("Skenario Ketahanan (Power Loss / Refresh): menyerialisasi state jawaban ke localStorage seketika (0ms)", () => {
    useExamSessionStore.getState().initSession({
      sessionId: "sess-persist-1",
      examId: "exam-1",
      examTitle: "OSN Matematika",
      durationMinutes: 90,
      startedAt: "2026-10-20T08:00:00.000Z",
      serverEndTime: "2026-10-20T09:30:00.000Z",
      studentName: "Dimas Pratama",
      studentClass: "11-IPA-2",
      questions: mockQuestions,
    });

    useExamSessionStore.getState().setAnswer("q-1", { selected: "A" });
    useExamSessionStore.getState().setAnswer("q-3", { text: "3.14" });
    useExamSessionStore.getState().toggleFlag("q-2");
    useExamSessionStore.getState().setCurrentIndex(2);

    const rawStored = localStorage.getItem("osn_exam_session_storage");
    expect(rawStored).toBeTruthy();

    const parsed = JSON.parse(rawStored!);
    expect(parsed.state.sessionId).toBe("sess-persist-1");
    expect(parsed.state.currentIndex).toBe(2);
    expect(parsed.state.answersMap["q-1"]).toEqual({ selected: "A" });
    expect(parsed.state.answersMap["q-3"]).toEqual({ text: "3.14" });
    expect(parsed.state.flaggedMap["q-2"]).toBe(true);
  });
});

describe("F2-02: Mesin Status Waktu Dinamis & Anti-Tamper Jam Klien (useExamStatusEngine)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("formatCountdown() memformat durasi menjadi HH:MM:SS dan X Hari HH:MM:SS", () => {
    expect(formatCountdown(0)).toBe("00:00:00");
    expect(formatCountdown(-5000)).toBe("00:00:00");
    expect(formatCountdown(65 * 1000)).toBe("00:01:05");
    expect(formatCountdown(3661 * 1000)).toBe("01:01:01");
    expect(formatCountdown((2 * 86400 + 3600) * 1000)).toBe("2 Hari 01:00:00");
  });

  it("bertransisi otomatis dari NOT_STARTED -> IN_PROGRESS -> ENDED tanpa reload", () => {
    const baseServerTime = new Date("2026-10-20T07:59:50.000Z"); // 10 detik sebelum mulai
    vi.setSystemTime(baseServerTime);

    const startsAt = "2026-10-20T08:00:00.000Z";
    const endsAt = "2026-10-20T08:01:00.000Z"; // durasi 60 detik

    const { result } = renderHook(() =>
      useExamStatusEngine({
        startsAt,
        endsAt,
        serverTime: baseServerTime.toISOString(),
      })
    );

    // Fase 1: Belum Dimulai (sisa 10 detik)
    expect(result.current.status).toBe("NOT_STARTED");
    expect(result.current.countdownText).toBe("00:00:10");

    // Majukan waktu 11 detik -> masuk fase IN_PROGRESS
    act(() => {
      vi.advanceTimersByTime(11000);
    });
    expect(result.current.status).toBe("IN_PROGRESS");
    expect(result.current.countdownText).toBe("00:00:59");

    // Majukan waktu 60 detik lagi -> masuk fase ENDED
    act(() => {
      vi.advanceTimersByTime(60000);
    });
    expect(result.current.status).toBe("ENDED");
    expect(result.current.countdownText).toBe("00:00:00");
  });

  it("Skenario Keamanan (Client Clock Tampering): kebal terhadap jam lokal klien yang dimajukan/dimundurkan", () => {
    // Jam lokal klien sengaja dimajukan 5 jam ke masa depan (pukul 13:00),
    // padahal waktu server yang sebenarnya baru pukul 07:55 (5 menit sebelum mulai pukul 08:00)
    const tamperedClientDate = new Date("2026-10-20T13:00:00.000Z");
    vi.setSystemTime(tamperedClientDate);

    const trueServerTime = "2026-10-20T07:55:00.000Z";
    const startsAt = "2026-10-20T08:00:00.000Z";
    const endsAt = "2026-10-20T09:30:00.000Z";

    const { result } = renderHook(() =>
      useExamStatusEngine({
        startsAt,
        endsAt,
        serverTime: trueServerTime,
      })
    );

    // Meskipun jam PC siswa pukul 13:00, sistem tetap mengenali status NOT_STARTED (sisa 5 menit)
    expect(result.current.status).toBe("NOT_STARTED");
    expect(result.current.countdownText).toBe("00:05:00");
  });
});

describe("F3-03: Evaluasi Status Jawaban Palet (isQuestionAnswered)", () => {
  it("mengevaluasi status jawaban single_choice, multiple_choice, dan short_answer secara akurat", () => {
    expect(isQuestionAnswered(undefined)).toBe(false);
    expect(isQuestionAnswered({ selected: "" })).toBe(false);
    expect(isQuestionAnswered({ selected: "C" })).toBe(true);

    expect(isQuestionAnswered({ selected: [] })).toBe(false);
    expect(isQuestionAnswered({ selected: ["A", "D"] })).toBe(true);

    expect(isQuestionAnswered({ text: "" })).toBe(false);
    expect(isQuestionAnswered({ text: "    " })).toBe(false);
    expect(isQuestionAnswered({ text: "42" })).toBe(true);
  });
});

