import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { useExamSessionStore } from "@/lib/stores/exam-session-store";
import {
  recoverExamSessionAction,
  type RecoverExamSessionData,
  type ClientQuestionItem,
} from "@/actions/exam-session";
import { hashSessionToken } from "@/lib/security/session-token";
import { ExamTimer } from "@/components/exam-room/exam-timer";
import { ExamRoomShell } from "@/components/exam-room/exam-room-shell";
import { middleware } from "@/middleware";
import { NextRequest } from "next/server";

// Mock next/headers
const mockCookieGet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: mockCookieGet,
    set: vi.fn(),
  })),
}));

// Mock Supabase service client
const mockServiceFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createServiceClient: vi.fn(() => ({
    from: mockServiceFrom,
  })),
}));

// Mock Supabase middleware
vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: vi.fn(async () => ({
    supabaseResponse: {
      cookies: {
        getAll: () => [],
        set: vi.fn(),
      },
    },
    user: null,
  })),
}));

const mockQuestions: ClientQuestionItem[] = [
  {
    id: "q-1",
    exam_id: "exam-f402",
    order_index: 1,
    question_type: "single_choice",
    prompt: "Berapa akar dari 144?",
    options: [
      { id: "A", text: "12" },
      { id: "B", text: "14" },
    ],
    points: 4,
  },
  {
    id: "q-2",
    exam_id: "exam-f402",
    order_index: 2,
    question_type: "multiple_choice",
    prompt: "Pilih bilangan prima:",
    options: [
      { id: "A", text: "2" },
      { id: "B", text: "3" },
      { id: "C", text: "4" },
    ],
    points: 4,
  },
  {
    id: "q-3",
    exam_id: "exam-f402",
    order_index: 3,
    question_type: "short_answer",
    prompt: "Tuliskan ibu kota Jawa Tengah:",
    options: [],
    points: 2,
  },
];

const mockRecoveryPayload: RecoverExamSessionData = {
  sessionId: "sess-recover-123",
  examId: "exam-f402",
  examTitle: "Simulasi OSN Pemulihan Sesi",
  durationMinutes: 90,
  startedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  serverEndTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  serverTime: new Date().toISOString(),
  studentName: "Dian Permata",
  studentClass: "12-MIPA-1",
  questions: mockQuestions,
  recoveredAnswersMap: {
    "q-1": "A",
    "q-2": ["A", "B"],
  },
  recoveredFlaggedMap: {
    "q-2": true,
  },
  lastSyncedAt: new Date(Date.now() - 5000).toISOString(),
};

describe("F4-02: Unit Tests Mesin Pemulihan Sesi (recoverSession & serverTimeOffsetMs)", () => {
  beforeEach(() => {
    useExamSessionStore.getState().clearSession();
    localStorage.clear();
  });

  it("Skenario A (Data Lokal Ada & Cocok): mempertahankan currentIndex, jawaban lokal belum tersinkronisasi, dan memperbarui serverTimeOffsetMs", () => {
    // 1. Setup kondisi pengerjaan lokal peserta sebelum refresh/crash
    const store = useExamSessionStore.getState();
    store.initSession({
      sessionId: "sess-recover-123",
      examId: "exam-f402",
      examTitle: "Simulasi OSN Pemulihan Sesi",
      durationMinutes: 90,
      startedAt: mockRecoveryPayload.startedAt,
      serverEndTime: mockRecoveryPayload.serverEndTime,
      serverTime: mockRecoveryPayload.serverTime,
      studentName: "Dian Permata",
      studentClass: "12-MIPA-1",
      questions: mockQuestions,
    });

    // Peserta berpindah ke soal nomor 3 dan menjawab isian lokal baru (berada di dirtyQuestionIds)
    store.setCurrentIndex(2);
    store.setAnswer("q-3", "Semarang");
    store.toggleFlag("q-1"); // Ditandai ragu-ragu di lokal

    expect(useExamSessionStore.getState().currentIndex).toBe(2);
    expect(useExamSessionStore.getState().dirtyQuestionIds).toContain("q-3");
    expect(useExamSessionStore.getState().answersMap["q-3"]).toBe("Semarang");

    // 2. Eksekusi recoverSession dengan payload sinkronisasi server
    const result = useExamSessionStore.getState().recoverSession(mockRecoveryPayload);

    expect(result).toBe("local_merged");

    const recoveredState = useExamSessionStore.getState();
    // A. Nomor soal aktif tidak terlempar kembali ke nomor 1
    expect(recoveredState.currentIndex).toBe(2);

    // B. Jawaban lokal q-3 yang belum tersinkronisasi tetap dipertahankan
    expect(recoveredState.answersMap["q-3"]).toBe("Semarang");

    // C. Jawaban server q-1 & q-2 berhasil digabungkan
    expect(recoveredState.answersMap["q-1"]).toBe("A");
    expect(recoveredState.answersMap["q-2"]).toEqual(["A", "B"]);

    // D. Penanda ragu-ragu lokal q-1 dan server q-2 keduanya aktif
    expect(recoveredState.flaggedMap["q-1"]).toBe(true);
    expect(recoveredState.flaggedMap["q-2"]).toBe(true);

    // E. Sisa antrean dirtyQuestionIds tetap terjaga untuk disinkronkan kemudian
    expect(recoveredState.dirtyQuestionIds).toContain("q-3");
  });

  it("Skenario B (Data Lokal Hilang / Mode Samaran): memulihkan 100% data soal dan jawaban dari session_answers Supabase", () => {
    // Pastikan store dan localStorage benar-benar kosong (simulasi mode penyamaran atau ganti peramban)
    useExamSessionStore.getState().clearSession();
    expect(useExamSessionStore.getState().sessionId).toBeNull();
    expect(useExamSessionStore.getState().questions.length).toBe(0);

    // Eksekusi pemulihan sesi
    const result = useExamSessionStore.getState().recoverSession(mockRecoveryPayload);

    expect(result).toBe("remote_restored");

    const state = useExamSessionStore.getState();
    expect(state.sessionId).toBe("sess-recover-123");
    expect(state.studentName).toBe("Dian Permata");
    expect(state.questions.length).toBe(3);
    expect(state.answersMap["q-1"]).toBe("A");
    expect(state.answersMap["q-2"]).toEqual(["A", "B"]);
    expect(state.flaggedMap["q-2"]).toBe(true);
    expect(state.syncStatus).toBe("synced");
    expect(state.dirtyQuestionIds).toEqual([]);
    expect(state.currentIndex).toBe(0);
  });
});

describe("F4-02: Component Tests Penyelarasan Waktu Server & Ketahanan Reload", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("ExamTimer mengompensasi selisih waktu klien (anti-tamper) melalui serverTimeOffsetMs", () => {
    const realServerNow = new Date("2026-10-19T10:00:00.000Z").getTime();
    const serverEndTime = new Date("2026-10-19T10:15:00.000Z").toISOString(); // 15 menit (900 detik) tersisa

    // Simulasikan jam komputer lokal klien dimundurkan 2 jam dari waktu server aktual
    const tamperedClientNow = realServerNow - 2 * 60 * 60 * 1000;
    vi.setSystemTime(new Date(tamperedClientNow));

    // Offset waktu server terhadap jam klien yang dimundurkan: serverTime - clientNow = +2 jam
    const serverTimeOffsetMs = realServerNow - tamperedClientNow;

    render(
      <ExamTimer
        serverEndTime={serverEndTime}
        serverTimeOffsetMs={serverTimeOffsetMs}
      />
    );

    // Tanpa serverTimeOffsetMs, jam lokal akan menampilkan 02:15:00 (salah)
    // Dengan serverTimeOffsetMs, jam menampilkan 00:15:00 (presisi sesuai server)
    expect(screen.getByText("00:15:00")).toBeInTheDocument();

    // Jalankan timer 10 detik
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(screen.getByText("00:14:50")).toBeInTheDocument();
  });

  it("ExamRoomShell memulihkan sesi saat data lokal kosong dan tahan terhadap refresh berulang", async () => {
    vi.useRealTimers();
    useExamSessionStore.getState().clearSession();

    // Render ExamRoomShell dengan data pemulihan server ketika localStorage kosong
    const { unmount } = render(
      <ExamRoomShell
        sessionId="sess-recover-123"
        initialRecoveryData={mockRecoveryPayload}
      />
    );

    // Verifikasi bahwa layar galat TIDAK muncul, melainkan ruang ujian langsung aktif
    expect(screen.queryByText("Data Sesi Tidak Ditemukan")).not.toBeInTheDocument();
    expect(screen.getByText("Simulasi OSN Pemulihan Sesi")).toBeInTheDocument();
    expect(screen.getByText("Dian Permata")).toBeInTheDocument();

    // Verifikasi jawaban q-1 terpilih sesuai data yang dipulihkan (Opsi A)
    const radioA = screen.getByRole("radio", { name: /12/i });
    expect(radioA).toBeChecked();

    // Simulasikan reload/remount halaman berulang kali
    unmount();

    render(
      <ExamRoomShell
        sessionId="sess-recover-123"
        initialRecoveryData={mockRecoveryPayload}
      />
    );

    // Kondisi pengerjaan tetap pulih 100% tanpa reset
    expect(screen.getByText("Simulasi OSN Pemulihan Sesi")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /12/i })).toBeChecked();
  });
});

describe("F4-02: Integration Tests (recoverExamSessionAction & Middleware Route Guard)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("recoverExamSessionAction memverifikasi token sesi, menyaring questions (Zero Leak), dan memetakan session_answers", async () => {
    const rawToken = "tok-1234567890abcdef1234567890abcdef";
    mockCookieGet.mockReturnValue({ value: rawToken });

    // Mock verifyActiveSessionAction database call (SELECT exam_sessions + exams)
    mockServiceFrom.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValueOnce({
            data: {
              id: "sess-rec-xyz",
              exam_id: "exam-99",
              session_token_hash: hashSessionToken(rawToken),
              student_name: "Rizky Ramadhan",
              student_class: "11-IPA-2",
              started_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
              is_completed: false,
              exams: {
                id: "exam-99",
                title: "Ujian Terpadu Fisika",
                duration_minutes: 60,
                ends_at: new Date(Date.now() + 50 * 60 * 1000).toISOString(),
              },
            },
            error: null,
          }),
        })),
      })),
    });

    // Mock questions select query (memverifikasi tidak ada correct_answer)
    let requestedQuestionColumns = "";
    mockServiceFrom.mockReturnValueOnce({
      select: vi.fn((cols: string) => {
        requestedQuestionColumns = cols;
        return {
          eq: vi.fn(() => ({
            order: vi.fn().mockResolvedValueOnce({
              data: [
                {
                  id: "q-phys-1",
                  exam_id: "exam-99",
                  order_index: 1,
                  question_type: "single_choice",
                  prompt: "Hukum II Newton adalah...",
                  options: [{ id: "A", text: "$F = m \\cdot a$" }],
                  points: 5,
                },
              ],
              error: null,
            }),
          })),
        };
      }),
    });

    // Mock session_answers select query
    mockServiceFrom.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn().mockResolvedValueOnce({
          data: [
            {
              question_id: "q-phys-1",
              answer_value: "A",
              is_flagged: true,
              last_updated_at: new Date().toISOString(),
            },
          ],
          error: null,
        }),
      })),
    });

    // Jalankan Server Action
    const result = await recoverExamSessionAction("sess-rec-xyz");

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();

    // Zero Answer Leakage Verification
    expect(requestedQuestionColumns).not.toContain("correct_answer");
    expect(result.data?.questions[0]).not.toHaveProperty("correct_answer");

    // Pemetaan jawaban tersinkronisasi
    expect(result.data?.recoveredAnswersMap["q-phys-1"]).toBe("A");
    expect(result.data?.recoveredFlaggedMap["q-phys-1"]).toBe(true);
    expect(result.data?.studentName).toBe("Rizky Ramadhan");
  });

  it("middleware.ts mengalihkan rute /ujian/[sessionId] ke / jika cookie exam_token absen", async () => {
    // 1. Permintaan tanpa cookie exam_token
    const reqWithoutToken = new NextRequest("http://localhost:3000/ujian/session-123");
    const responseNoToken = await middleware(reqWithoutToken);

    // Harus diarahkan ke halaman beranda (/)
    expect(responseNoToken.status).toBe(307);
    expect(responseNoToken.headers.get("location")).toBe("http://localhost:3000/");

    // 2. Permintaan dengan cookie exam_token
    const reqWithToken = new NextRequest("http://localhost:3000/ujian/session-123");
    reqWithToken.cookies.set("exam_token", "valid-token-xyz");
    const responseWithToken = await middleware(reqWithToken);

    // Diizinkan lewat (bukan redirect ke /)
    expect(responseWithToken.status).not.toBe(307);
  });
});

