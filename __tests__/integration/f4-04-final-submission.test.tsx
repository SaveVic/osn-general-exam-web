import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { useExamSessionStore } from "@/lib/stores/exam-session-store";
import {
  submitExamSessionAction,
  type RecoverExamSessionData,
  type ClientQuestionItem,
} from "@/actions/exam-session";
import { hashSessionToken } from "@/lib/security/session-token";
import { FinishExamDialog } from "@/components/exam-room/finish-exam-dialog";
import { ExamRoomShell } from "@/components/exam-room/exam-room-shell";
import ExamFinishedPage from "@/app/ujian/selesai/page";

// Mock next/navigation
const mockRouterReplace = vi.fn();
const mockRouterPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    replace: mockRouterReplace,
    push: mockRouterPush,
  })),
  redirect: vi.fn(),
}));

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
    exam_id: "exam-f404",
    order_index: 1,
    question_type: "single_choice",
    prompt: "Pancasila terdiri dari berapa sila?",
    options: [
      { id: "A", text: "5 Sila" },
      { id: "B", text: "6 Sila" },
    ],
    points: 4,
  },
  {
    id: "q-2",
    exam_id: "exam-f404",
    order_index: 2,
    question_type: "short_answer",
    prompt: "Tuliskan semboyan negara kita:",
    options: [],
    points: 2,
  },
];

const mockRecoveryPayload: RecoverExamSessionData = {
  sessionId: "sess-subm-404",
  examId: "exam-f404",
  examTitle: "Simulasi OSN Pengumpulan Akhir",
  durationMinutes: 60,
  startedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  serverEndTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  serverTime: new Date().toISOString(),
  studentName: "Ahmad Dahlan",
  studentClass: "11-MIPA-1",
  questions: mockQuestions,
  recoveredAnswersMap: {
    "q-1": "A",
  },
  recoveredFlaggedMap: {
    "q-2": true,
  },
  lastSyncedAt: null,
};

describe("F4-04: Final Submission Flow & Confirmation Page (EXM-SUBM-01)", () => {
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
  // 1. Server Action: Grace Period & Keterlambatan Pengumpulan
  // =========================================================================
  describe("submitExamSessionAction Server Validation & 60s Grace Period", () => {
    it("should accept submission on-time (within nominal duration)", async () => {
      const rawToken = "tok-ontime-123";
      mockCookieGet.mockReturnValue({ value: rawToken });

      const mockUpsert = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      // Sesi mulai 45 menit lalu, durasi 60m => sisa 15m (on-time)
      const startedAt = new Date(Date.now() - 45 * 60 * 1000).toISOString();

      mockServiceFrom.mockImplementation((table: string) => {
        if (table === "exam_sessions") {
          const sessionData = {
            id: "sess-ontime",
            exam_id: "exam-f404",
            session_token_hash: hashSessionToken(rawToken),
            is_completed: false,
            started_at: startedAt,
            exams: {
              duration_minutes: 60,
              end_time: null,
            },
          };
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: sessionData, error: null }),
            maybeSingle: vi.fn().mockResolvedValue({ data: sessionData, error: null }),
            update: mockUpdate,
          };
        }
        if (table === "session_answers") {
          return { upsert: mockUpsert };
        }
        return {};
      });

      const res = await submitExamSessionAction({
        sessionId: "sess-ontime",
        finalAnswers: [
          { questionId: "q-1", answerValue: "A", isFlagged: false },
        ],
      });

      expect(res.success).toBe(true);
      expect(res.message).toBe("Ujian berhasil diselesaikan dan lembar jawaban tersimpan.");
      expect(mockUpsert).toHaveBeenCalledTimes(1);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ is_completed: true })
      );
      expect(mockCookieSet).toHaveBeenCalledWith("exam_token", "", { maxAge: 0, path: "/" });
    });

    it("should accept submission within 60-second grace period after duration expired", async () => {
      const rawToken = "tok-grace-123";
      mockCookieGet.mockReturnValue({ value: rawToken });

      const mockUpsert = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      // Durasi 60m. Sesi mulai 60 menit + 30 detik lalu (terlambat 30 detik <= 60 detik toleransi)
      const startedAt = new Date(Date.now() - (60 * 60 * 1000 + 30 * 1000)).toISOString();

      mockServiceFrom.mockImplementation((table: string) => {
        if (table === "exam_sessions") {
          const sessionData = {
            id: "sess-grace",
            exam_id: "exam-f404",
            session_token_hash: hashSessionToken(rawToken),
            is_completed: false,
            started_at: startedAt,
            exams: {
              duration_minutes: 60,
              end_time: null,
            },
          };
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: sessionData, error: null }),
            maybeSingle: vi.fn().mockResolvedValue({ data: sessionData, error: null }),
            update: mockUpdate,
          };
        }
        if (table === "session_answers") {
          return { upsert: mockUpsert };
        }
        return {};
      });

      const res = await submitExamSessionAction({
        sessionId: "sess-grace",
        finalAnswers: [],
      });

      expect(res.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ is_completed: true })
      );
      expect(mockCookieSet).toHaveBeenCalledWith("exam_token", "", { maxAge: 0, path: "/" });
    });

    it("should reject submission and seal session when exceeding 60-second grace period", async () => {
      const rawToken = "tok-overdue-123";
      mockCookieGet.mockReturnValue({ value: rawToken });

      const mockUpsert = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      // Durasi 60m. Sesi mulai 60 menit + 90 detik lalu (terlambat 90 detik > 60 detik toleransi)
      const startedAt = new Date(Date.now() - (60 * 60 * 1000 + 90 * 1000)).toISOString();

      mockServiceFrom.mockImplementation((table: string) => {
        if (table === "exam_sessions") {
          const sessionData = {
            id: "sess-overdue",
            exam_id: "exam-f404",
            session_token_hash: hashSessionToken(rawToken),
            is_completed: false,
            started_at: startedAt,
            exams: {
              duration_minutes: 60,
              end_time: null,
            },
          };
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: sessionData, error: null }),
            maybeSingle: vi.fn().mockResolvedValue({ data: sessionData, error: null }),
            update: mockUpdate,
          };
        }
        if (table === "session_answers") {
          return { upsert: mockUpsert };
        }
        return {};
      });

      const res = await submitExamSessionAction({
        sessionId: "sess-overdue",
        finalAnswers: [
          { questionId: "q-1", answerValue: "B", isFlagged: false },
        ],
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe("SUBMISSION_OVERDUE");
      expect(res.message).toBe("Batas toleransi waktu pengumpulan ujian telah berakhir (lewat dari 60 detik).");

      // Jawaban baru tidak boleh di-upsert karena telah kadaluwarsa
      expect(mockUpsert).not.toHaveBeenCalled();

      // Sesi tetap disegel agar tidak dapat diakses ulang
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ is_completed: true })
      );
      // Cookie tetap dibersihkan
      expect(mockCookieSet).toHaveBeenCalledWith("exam_token", "", { maxAge: 0, path: "/" });
    });
  });

  // =========================================================================
  // 2. Component Tests: FinishExamDialog
  // =========================================================================
  describe("FinishExamDialog Component", () => {
    it("renders official title, exact recap sentence, and standard action buttons", () => {
      const onConfirm = vi.fn();
      const onOpenChange = vi.fn();

      render(
        <FinishExamDialog
          open={true}
          onOpenChange={onOpenChange}
          totalQuestions={10}
          answeredCount={3}
          unansweredCount={7}
          flaggedCount={2}
          onConfirmSubmit={onConfirm}
        />
      );

      // Judul resmi
      expect(screen.getByText("Konfirmasi Pengumpulan Ujian")).toBeInTheDocument();

      // Ringkasan status 3 counter box
      expect(screen.getByText("Terjawab")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("Kosong")).toBeInTheDocument();
      expect(screen.getByText("7")).toBeInTheDocument();
      expect(screen.getByText("Ragu-ragu")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();

      // Memastikan pesan redundan "Anda telah menjawab..." sudah dihapus
      expect(
        screen.queryByText(/Anda telah menjawab/i)
      ).not.toBeInTheDocument();

      // Tombol tindakan
      const cancelBtn = screen.getByRole("button", { name: "Periksa Kembali" });
      const confirmBtn = screen.getByRole("button", { name: "Ya, Kumpulkan Sekarang" });
      expect(cancelBtn).toBeInTheDocument();
      expect(confirmBtn).toBeInTheDocument();

      // Klik batal
      fireEvent.click(cancelBtn);
      expect(onOpenChange).toHaveBeenCalledWith(false);

      // Klik konfirmasi
      fireEvent.click(confirmBtn);
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it("displays spinner and disables buttons during submission (isSubmitting = true)", () => {
      render(
        <FinishExamDialog
          open={true}
          onOpenChange={vi.fn()}
          totalQuestions={5}
          answeredCount={5}
          unansweredCount={0}
          flaggedCount={0}
          isSubmitting={true}
          onConfirmSubmit={vi.fn()}
        />
      );

      expect(screen.getByText("Mengumpulkan...")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Periksa Kembali" })).toBeDisabled();
      expect(screen.getByRole("button", { name: /Mengumpulkan\.\.\./i })).toBeDisabled();
    });

    it("displays error alert banner when errorMessage prop is provided", () => {
      render(
        <FinishExamDialog
          open={true}
          onOpenChange={vi.fn()}
          totalQuestions={5}
          answeredCount={4}
          unansweredCount={1}
          flaggedCount={0}
          errorMessage="Koneksi terputus saat menghubungi server."
          onConfirmSubmit={vi.fn()}
        />
      );

      const alertEl = screen.getByRole("alert");
      expect(alertEl).toBeInTheDocument();
      expect(alertEl).toHaveTextContent("Koneksi terputus saat menghubungi server.");
    });
  });

  // =========================================================================
  // 3. Integration Tests: ExamRoomShell Manual Submission & LocalStorage Cleanup
  // =========================================================================
  describe("ExamRoomShell Manual Submission Flow", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("executes full manual submission flow: opens modal, submits, removes localStorage, and redirects to /ujian/selesai", async () => {
      const now = new Date("2026-10-20T10:00:00.000Z").getTime();
      vi.setSystemTime(now);

      const startedAt = new Date(now - 30 * 60 * 1000).toISOString();
      const testRecoveryPayload: RecoverExamSessionData = {
        ...mockRecoveryPayload,
        startedAt,
        serverEndTime: new Date(now + 30 * 60 * 1000).toISOString(),
        serverTime: new Date(now).toISOString(),
      };

      const rawToken = "raw-manual-submit-tok";
      mockCookieGet.mockReturnValue({ value: rawToken });

      const mockUpsert = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      mockServiceFrom.mockImplementation((table: string) => {
        if (table === "exam_sessions") {
          const sessionData = {
            id: "sess-subm-404",
            exam_id: "exam-f404",
            session_token_hash: hashSessionToken(rawToken),
            is_completed: false,
            started_at: startedAt,
            exams: {
              duration_minutes: 60,
              end_time: null,
            },
          };
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: sessionData, error: null }),
            maybeSingle: vi.fn().mockResolvedValue({ data: sessionData, error: null }),
            update: mockUpdate,
          };
        }
        if (table === "session_answers") {
          return { upsert: mockUpsert };
        }
        return {};
      });

      // Simulasikan data di localStorage
      localStorage.setItem("osn_exam_session_storage", JSON.stringify({ state: { sessionId: "sess-subm-404" } }));

      render(
        <ExamRoomShell
          sessionId="sess-subm-404"
          initialRecoveryData={testRecoveryPayload}
        />
      );

      // Klik tombol "Selesaikan Ujian" di header
      const headerFinishBtn = screen.getByRole("button", { name: /Selesaikan Ujian/i });
      fireEvent.click(headerFinishBtn);

      // Modal konfirmasi terbuka
      expect(screen.getByText("Konfirmasi Pengumpulan Ujian")).toBeInTheDocument();

      // Klik "Ya, Kumpulkan Sekarang"
      const confirmSubmitBtn = screen.getByRole("button", { name: "Ya, Kumpulkan Sekarang" });
      await act(async () => {
        fireEvent.click(confirmSubmitBtn);
      });

      // Verifikasi jawaban di-upsert dan sesi diselesaikan
      expect(mockUpsert).toHaveBeenCalledTimes(1);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ is_completed: true })
      );

      // Verifikasi localStorage dibersihkan
      expect(localStorage.getItem("osn_exam_session_storage")).toBeNull();

      // Verifikasi dialihkan ke rute /ujian/selesai
      expect(mockRouterReplace).toHaveBeenCalledWith(
        expect.stringContaining("/ujian/selesai")
      );
    });
  });

  // =========================================================================
  // 4. Confirmation Page Component: /ujian/selesai
  // =========================================================================
  describe("ExamFinishedPage (/ujian/selesai)", () => {
    it("renders friendly confirmation message and return home link", async () => {
      const page = await ExamFinishedPage({});
      render(page);

      // Pesan resmi sesuai spesifikasi F4-04
      expect(screen.getByText("Ujian Berhasil Dikirimkan")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Ujian Berhasil Dikirimkan. Terima kasih telah mengikuti ujian dengan tertib."
        )
      ).toBeInTheDocument();

      // Tombol kembali ke beranda
      const homeLink = screen.getByRole("link", { name: /Kembali ke Halaman Beranda/i });
      expect(homeLink).toHaveAttribute("href", "/");
    });
  });
});

