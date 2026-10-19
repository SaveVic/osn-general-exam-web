import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { useExamSessionStore } from "@/lib/stores/exam-session-store";
import {
  calculateSessionDeadline,
  submitExamSessionAction,
  type RecoverExamSessionData,
  type ClientQuestionItem,
} from "@/actions/exam-session";
import { submitExamSessionSchema } from "@/lib/validations/session";
import { hashSessionToken } from "@/lib/security/session-token";
import { ExamTimer } from "@/components/exam-room/exam-timer";
import { ExamRoomShell } from "@/components/exam-room/exam-room-shell";

// Mock next/headers
const mockCookieGet = vi.fn();
const mockCookieSet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: mockCookieGet,
    set: mockCookieSet,
  })),
}));

// Mock Supabase service client
const mockServiceFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createServiceClient: vi.fn(() => ({
    from: mockServiceFrom,
  })),
}));

const mockQuestions: ClientQuestionItem[] = [
  {
    id: "q-1",
    exam_id: "exam-f403",
    order_index: 1,
    question_type: "single_choice",
    prompt: "Ibu kota Indonesia saat ini adalah:",
    options: [
      { id: "A", text: "Jakarta" },
      { id: "B", text: "Nusantara" },
    ],
    points: 4,
  },
  {
    id: "q-2",
    exam_id: "exam-f403",
    order_index: 2,
    question_type: "short_answer",
    prompt: "Sebutkan lambang sila kelima:",
    options: [],
    points: 2,
  },
];

const mockRecoveryPayload: RecoverExamSessionData = {
  sessionId: "sess-timer-123",
  examId: "exam-f403",
  examTitle: "Simulasi OSN Timer Autoritatif",
  durationMinutes: 90,
  startedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  serverEndTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  serverTime: new Date().toISOString(),
  studentName: "Budi Pratama",
  studentClass: "10-MIPA-2",
  questions: mockQuestions,
  recoveredAnswersMap: {
    "q-1": "A",
  },
  recoveredFlaggedMap: {
    "q-1": false,
  },
  lastSyncedAt: null,
};

describe("F4-03: Server-Authoritative Timer & Auto-Lock (EXM-TIME-01)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useExamSessionStore.setState({
      sessionId: null,
      examId: null,
      examTitle: "",
      durationMinutes: 0,
      startedAt: null,
      serverEndTime: null,
      studentName: "",
      studentClass: "",
      questions: [],
      currentIndex: 0,
      answersMap: {},
      flaggedMap: {},
      isSubmitted: false,
      serverTimeOffsetMs: 0,
    });
  });

  // =========================================================================
  // 1. Unit Tests: calculateSessionDeadline
  // =========================================================================
  describe("calculateSessionDeadline (Authoritative Time Calculation)", () => {
    it("should return startedAt + duration when schedule end time is after duration deadline", () => {
      // Sesi mulai 08:00, durasi 60m => batas durasi 09:00. Jadwal selesai 10:00.
      const startedAt = "2026-10-20T08:00:00.000Z";
      const durationMinutes = 60;
      const scheduleEndTime = "2026-10-20T10:00:00.000Z";

      const deadline = calculateSessionDeadline(startedAt, durationMinutes, scheduleEndTime);
      expect(deadline).toBe("2026-10-20T09:00:00.000Z");
    });

    it("should return scheduleEndTime when schedule ends before session duration finishes (capped)", () => {
      // Sesi mulai 09:30, durasi 60m => durasi 10:30. Tapi jadwal tutup pukul 10:00.
      const startedAt = "2026-10-20T09:30:00.000Z";
      const durationMinutes = 60;
      const scheduleEndTime = "2026-10-20T10:00:00.000Z";

      const deadline = calculateSessionDeadline(startedAt, durationMinutes, scheduleEndTime);
      expect(deadline).toBe("2026-10-20T10:00:00.000Z");
    });

    it("should return startedAt + duration when scheduleEndTime is undefined or null", () => {
      const startedAt = "2026-10-20T08:00:00.000Z";
      const durationMinutes = 45;

      const deadlineWithoutSchedule = calculateSessionDeadline(startedAt, durationMinutes, null);
      expect(deadlineWithoutSchedule).toBe("2026-10-20T08:45:00.000Z");

      const deadlineUndefined = calculateSessionDeadline(startedAt, durationMinutes, undefined);
      expect(deadlineUndefined).toBe("2026-10-20T08:45:00.000Z");
    });
  });

  // =========================================================================
  // 2. Unit Tests: submitExamSessionSchema
  // =========================================================================
  describe("submitExamSessionSchema Validation", () => {
    it("should pass validation with valid sessionId and finalAnswers array", () => {
      const validPayload = {
        sessionId: "sess-12345",
        finalAnswers: [
          { questionId: "q-1", answerValue: "A", isFlagged: false },
          { questionId: "q-2", answerValue: ["B", "C"], isFlagged: true },
          { questionId: "q-3", answerValue: null, isFlagged: false },
        ],
      };

      const result = submitExamSessionSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it("should fail validation if sessionId is empty or omitted", () => {
      const invalidPayload = {
        sessionId: "",
        finalAnswers: [],
      };

      const result = submitExamSessionSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // 3. Component Tests: ExamTimer Visual Indicators & Anti-Tamper Clock
  // =========================================================================
  describe("ExamTimer 3-Stage Visual Warning & Anti-Tamper Clock", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should show default styling when remaining time is > 5 minutes", () => {
      const now = new Date("2026-10-20T10:00:00.000Z").getTime();
      vi.setSystemTime(now);

      // Sisa 10 menit
      const serverEndTime = new Date(now + 10 * 60 * 1000).toISOString();

      render(
        <ExamTimer
          serverEndTime={serverEndTime}
          serverTimeOffsetMs={0}
          onExpire={vi.fn()}
        />
      );

      const timerBadge = screen.getByLabelText("Sisa Waktu Ujian");
      expect(timerBadge).toBeInTheDocument();
      // Harus menggunakan style neutral/slate
      expect(timerBadge).toHaveClass("border-slate-200");
      expect(timerBadge).not.toHaveClass("border-amber-300");
      expect(timerBadge).not.toHaveClass("animate-pulse");
    });

    it("should transition to warning stage (amber border & bg) when remaining time <= 5 minutes", () => {
      const now = new Date("2026-10-20T10:00:00.000Z").getTime();
      vi.setSystemTime(now);

      // Sisa 4 menit 30 detik (270 detik <= 300 detik)
      const serverEndTime = new Date(now + 270 * 1000).toISOString();

      render(
        <ExamTimer
          serverEndTime={serverEndTime}
          serverTimeOffsetMs={0}
          onExpire={vi.fn()}
        />
      );

      const timerBadge = screen.getByLabelText("Sisa Waktu Ujian");
      expect(timerBadge).toBeInTheDocument();
      expect(timerBadge).toHaveClass("border-amber-300");
      expect(timerBadge).toHaveClass("bg-amber-50");
      expect(timerBadge).not.toHaveClass("animate-pulse");
    });

    it("should transition to critical stage (rose pulse) when remaining time <= 1 minute", () => {
      const now = new Date("2026-10-20T10:00:00.000Z").getTime();
      vi.setSystemTime(now);

      // Sisa 45 detik (<= 60 detik)
      const serverEndTime = new Date(now + 45 * 1000).toISOString();

      render(
        <ExamTimer
          serverEndTime={serverEndTime}
          serverTimeOffsetMs={0}
          onExpire={vi.fn()}
        />
      );

      const timerBadge = screen.getByLabelText("Sisa Waktu Ujian");
      expect(timerBadge).toBeInTheDocument();
      expect(timerBadge).toHaveClass("animate-pulse");
      expect(timerBadge).toHaveClass("border-rose-300");
      expect(timerBadge).toHaveClass("bg-rose-50");
    });

    it("should display 00:00:00 and trigger onExpire exactly once when countdown reaches 0", () => {
      const now = new Date("2026-10-20T10:00:00.000Z").getTime();
      vi.setSystemTime(now);

      const onExpireMock = vi.fn();
      // Sisa 2 detik
      const serverEndTime = new Date(now + 2 * 1000).toISOString();

      render(
        <ExamTimer
          serverEndTime={serverEndTime}
          serverTimeOffsetMs={0}
          onExpire={onExpireMock}
        />
      );

      expect(screen.getByText("00:00:02")).toBeInTheDocument();
      expect(onExpireMock).not.toHaveBeenCalled();

      // Majukan 2 detik hingga 00:00:00
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(screen.getByText("00:00:00")).toBeInTheDocument();
      expect(onExpireMock).toHaveBeenCalledTimes(1);

      // Majukan 5 detik lagi — onExpire tidak boleh dipanggil ulang (idempotent lock)
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(screen.getByText("00:00:00")).toBeInTheDocument();
      expect(onExpireMock).toHaveBeenCalledTimes(1);
    });

    it("should be resilient against client system clock tampering using serverTimeOffsetMs", () => {
      // Jam server aktual: 10:10:00. Selesai: 10:15:00 (sisa 5 menit = 300s)
      // Client memanipulasi jam lokal menjadi 09:10:00 (1 jam lebih lambat)
      const clientNow = new Date("2026-10-20T09:10:00.000Z").getTime();
      vi.setSystemTime(clientNow);

      const serverOffsetMs = 60 * 60 * 1000; // Server 1 jam di depan client
      const serverEndTime = new Date("2026-10-20T10:15:00.000Z").toISOString();

      render(
        <ExamTimer
          serverEndTime={serverEndTime}
          serverTimeOffsetMs={serverOffsetMs}
          onExpire={vi.fn()}
        />
      );

      // Jam server sekarang = 09:10 + 1 jam = 10:10.
      // Sisa waktu seharusnya 5 menit (00:05:00), BUKAN 1 jam 5 menit (01:05:00)
      expect(screen.getByText("00:05:00")).toBeInTheDocument();
      // Pada 5 menit, masuk ke status warning
      const timerBadge = screen.getByLabelText("Sisa Waktu Ujian");
      expect(timerBadge).toHaveClass("border-amber-300");
    });
  });

  // =========================================================================
  // 4. Component & Integration: ExamRoomShell Instant Read-Only Lock & Auto-Submit
  // =========================================================================
  describe("ExamRoomShell Instant Lock & Auto-Submission on Expiry", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should lock all input options and display TimeExpiredDialog upon timer expiration", async () => {
      const now = new Date("2026-10-20T10:00:00.000Z").getTime();
      vi.setSystemTime(now);

      // Sesi dengan sisa 2 detik
      const recoveryDataWithEndingTimer: RecoverExamSessionData = {
        ...mockRecoveryPayload,
        serverEndTime: new Date(now + 2 * 1000).toISOString(),
        serverTime: new Date(now).toISOString(),
      };

      // Mock mockCookieGet untuk submitExamSessionAction
      const rawToken = "tok-valid-timer-321";
      mockCookieGet.mockReturnValue({ value: rawToken });

      let resolveUpdate: (val: { error: null }) => void;
      const updatePromise = new Promise<{ error: null }>((resolve) => {
        resolveUpdate = resolve;
      });

      // Mock Supabase service client
      mockServiceFrom.mockImplementation((table: string) => {
        if (table === "exam_sessions") {
          const sessionData = {
            id: "sess-timer-123",
            exam_id: "exam-f403",
            session_token_hash: hashSessionToken(rawToken),
            is_completed: false,
            started_at: recoveryDataWithEndingTimer.startedAt,
            exams: {
              duration_minutes: 90,
              end_time: recoveryDataWithEndingTimer.serverEndTime,
            },
          };
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: sessionData,
              error: null,
            }),
            maybeSingle: vi.fn().mockResolvedValue({
              data: sessionData,
              error: null,
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue(updatePromise),
            }),
          };
        }
        if (table === "session_answers") {
          return {
            upsert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return {};
      });

      render(
        <ExamRoomShell
          sessionId="sess-timer-123"
          initialRecoveryData={recoveryDataWithEndingTimer}
        />
      );

      // Verifikasi soal aktif muncul sebelum waktu habis
      expect(screen.getByText("Ibu kota Indonesia saat ini adalah:")).toBeInTheDocument();
      const optionA = screen.getByRole("radio", { name: /Jakarta/i });
      expect(optionA).not.toBeDisabled();

      // Majukan timer 2 detik hingga waktu habis (00:00:00)
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      // 1. Verifikasi dialog modal tak dapat ditutup (non-dismissible) muncul dengan copy spesifikasi F4-03
      expect(screen.getByText("Waktu Pengerjaan Telah Habis")).toBeInTheDocument();
      expect(
        screen.getByText(
          /Sistem sedang mengumpulkan lembar jawaban Anda secara otomatis/i
        )
      ).toBeInTheDocument();

      // 2. Verifikasi Instant Read-Only Lock: opsi jawaban dan aksi tombol terkunci (disabled)
      expect(screen.getByRole("radio", { name: /Jakarta/i, hidden: true })).toBeDisabled();
      const flagButton = screen.getByRole("button", { name: /Ragu/i, hidden: true });
      expect(flagButton).toBeDisabled();

      // 3. Selesaikan proses submit server action
      await act(async () => {
        resolveUpdate!({ error: null });
      });

      // 4. Verifikasi setelah submit sukses, layar beralih ke tampilan Ujian Selesai / Terkumpul
      expect(screen.getByText("Ujian Berhasil Diselesaikan")).toBeInTheDocument();
      expect(screen.getByText(/Seluruh lembar pengerjaan untuk ujian/i)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 5. Server Action Integration Tests: submitExamSessionAction
  // =========================================================================
  describe("submitExamSessionAction Server Action", () => {
    it("should successfully finalize exam session, upsert answers, and clear cookie", async () => {
      const rawToken = "raw-session-token-secret-123";
      mockCookieGet.mockReturnValue({ value: rawToken });

      const mockUpsert = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      mockServiceFrom.mockImplementation((table: string) => {
        if (table === "exam_sessions") {
          const sessionData = {
            id: "sess-submit-101",
            exam_id: "exam-f403",
            session_token_hash: hashSessionToken(rawToken),
            is_completed: false,
            started_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            exams: {
              duration_minutes: 60,
              end_time: null,
            },
          };
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: sessionData,
              error: null,
            }),
            maybeSingle: vi.fn().mockResolvedValue({
              data: sessionData,
              error: null,
            }),
            update: mockUpdate,
          };
        }
        if (table === "session_answers") {
          return {
            upsert: mockUpsert,
          };
        }
        return {};
      });

      const res = await submitExamSessionAction({
        sessionId: "sess-submit-101",
        finalAnswers: [
          { questionId: "q-1", answerValue: "A", isFlagged: false },
          { questionId: "q-2", answerValue: "Keadilan sosial", isFlagged: false },
        ],
      });

      expect(res.success).toBe(true);
      expect(res.message).toBe("Ujian berhasil diselesaikan dan lembar jawaban tersimpan.");

      // Verifikasi session_answers diupsert dengan format data yang tepat
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            session_id: "sess-submit-101",
            question_id: "q-1",
            answer_value: "A",
            is_flagged: false,
          }),
        ]),
        { onConflict: "session_id,question_id" }
      );

      // Verifikasi exam_sessions ditandai is_completed: true
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          is_completed: true,
          submitted_at: expect.any(String),
        })
      );

      // Verifikasi cookie exam_token dihapus (maxAge: 0)
      expect(mockCookieSet).toHaveBeenCalledWith("exam_token", "", {
        maxAge: 0,
        path: "/",
      });
    });

    it("should be idempotent when session is already completed", async () => {
      const rawToken = "raw-session-token-secret-123";
      mockCookieGet.mockReturnValue({ value: rawToken });

      mockServiceFrom.mockImplementation((table: string) => {
        if (table === "exam_sessions") {
          const sessionData = {
            id: "sess-already-done",
            exam_id: "exam-f403",
            session_token_hash: hashSessionToken(rawToken),
            is_completed: true,
            started_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
            exams: {
              duration_minutes: 60,
              end_time: null,
            },
          };
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: sessionData,
              error: null,
            }),
            maybeSingle: vi.fn().mockResolvedValue({
              data: sessionData,
              error: null,
            }),
          };
        }
        return {};
      });

      const res = await submitExamSessionAction({
        sessionId: "sess-already-done",
        finalAnswers: [],
      });

      expect(res.success).toBe(true);
      expect(res.alreadyCompleted).toBe(true);
      expect(res.message).toBe("Sesi ujian ini telah diselesaikan sebelumnya.");

      // Cookie tetap dibersihkan untuk memastikan token tidak menggantung
      expect(mockCookieSet).toHaveBeenCalledWith("exam_token", "", {
        maxAge: 0,
        path: "/",
      });
    });

    it("should reject submission if session token hash does not match (tampered)", async () => {
      const rawToken = "fake-unauthorized-token";
      mockCookieGet.mockReturnValue({ value: rawToken });

      mockServiceFrom.mockImplementation((table: string) => {
        if (table === "exam_sessions") {
          const sessionData = {
            id: "sess-tampered",
            exam_id: "exam-f403",
            session_token_hash: hashSessionToken("real-original-token"),
            is_completed: false,
            started_at: new Date().toISOString(),
            exams: {
              duration_minutes: 60,
              end_time: null,
            },
          };
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: sessionData,
              error: null,
            }),
            maybeSingle: vi.fn().mockResolvedValue({
              data: sessionData,
              error: null,
            }),
          };
        }
        return {};
      });

      const res = await submitExamSessionAction({
        sessionId: "sess-tampered",
        finalAnswers: [],
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe("UNAUTHORIZED");
      expect(res.message).toBe("Token autentikasi sesi tidak cocok dengan catatan sistem.");
    });
  });
});

