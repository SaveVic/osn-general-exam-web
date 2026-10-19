import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  getExamMonitoringData,
  forceSubmitSessionAction,
  type MonitoredSessionRow,
} from "@/actions/session-monitoring";
import { syncBatchAnswersAction } from "@/actions/exam-session";
import { SessionMonitoringView } from "@/components/admin/monitoring/session-monitoring-view";
import { hashSessionToken } from "@/lib/security/session-token";
import type { ExamRow } from "@/types/database";

// Mock auth
const mockGetAdminUser = vi.fn();
vi.mock("@/actions/auth", () => ({
  getAdminUser: () => mockGetAdminUser(),
}));

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock next/headers cookies for student sync check after force submit
const mockCookieGet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: mockCookieGet,
    set: vi.fn(),
  })),
}));

// Mock scoring engine
const mockScoreExamSession = vi.fn();
vi.mock("@/actions/scoring", () => ({
  scoreExamSession: (sessionId: string) => mockScoreExamSession(sessionId),
}));

// Mock Supabase service client
const mockServiceFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createServiceClient: vi.fn(() => ({
    from: mockServiceFrom,
  })),
}));

const mockExam: ExamRow = {
  id: "exam-f504",
  title: "Simulasi OSN Fisika & Astronomi 2026",
  description: "Ujian pengawasan langsung",
  duration_minutes: 90,
  starts_at: "2026-10-20T08:00:00.000Z",
  ends_at: "2026-10-20T12:00:00.000Z",
  class_options: ["11-MIPA-1", "11-MIPA-2"],
  is_published: true,
  created_at: "2026-10-18T00:00:00.000Z",
  updated_at: "2026-10-18T00:00:00.000Z",
};

const mockMonitoredSessions: MonitoredSessionRow[] = [
  {
    id: "sess-active-1",
    studentName: "Rizky Ramadhan",
    studentClass: "11-MIPA-1",
    startedAt: "2026-10-20T08:00:00.000Z",
    submittedAt: null,
    isCompleted: false,
    totalScore: 0,
    answeredCount: 2,
    lastSyncedAt: "2026-10-20T08:25:15.000Z",
  },
  {
    id: "sess-active-2",
    studentName: "Nadia Putri",
    studentClass: "11-MIPA-2",
    startedAt: "2026-10-20T08:10:00.000Z",
    submittedAt: null,
    isCompleted: false,
    totalScore: 0,
    answeredCount: 0,
    lastSyncedAt: null,
  },
  {
    id: "sess-done-1",
    studentName: "Dimas Pratama",
    studentClass: "11-MIPA-1",
    startedAt: "2026-10-20T08:00:00.000Z",
    submittedAt: "2026-10-20T09:05:00.000Z",
    isCompleted: true,
    totalScore: 88,
    answeredCount: 5,
    lastSyncedAt: "2026-10-20T09:04:50.000Z",
  },
];

describe("F5-04: Pemantauan Sesi Aktif / Real-Time Session Monitoring (ADM-MONI-01)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getExamMonitoringData Server Action", () => {
    it("menolak akses jika pengguna bukan administrator", async () => {
      mockGetAdminUser.mockResolvedValue(null);

      const res = await getExamMonitoringData("exam-f504");
      expect(res.success).toBe(false);
      expect(res.message).toMatch(/Akses ditolak/i);
    });

    it("mengembalikan metadata ujian, jumlah soal, progres jawaban, dan waktu sinkronisasi terakhir per sesi", async () => {
      mockGetAdminUser.mockResolvedValue({
        id: "admin-1",
        email: "admin@exam.local",
      });

      mockServiceFrom.mockImplementation((table: string) => {
        if (table === "exams") {
          return {
            select: () => ({
              eq: () => ({
                single: vi
                  .fn()
                  .mockResolvedValue({ data: mockExam, error: null }),
              }),
            }),
          };
        }

        if (table === "questions") {
          return {
            select: () => ({
              eq: vi.fn().mockResolvedValue({
                data: [
                  { id: "q1" },
                  { id: "q2" },
                  { id: "q3" },
                  { id: "q4" },
                  { id: "q5" },
                ],
                error: null,
              }),
            }),
          };
        }

        if (table === "exam_sessions") {
          return {
            select: () => ({
              eq: () => ({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: "sess-active-1",
                      student_name: "Rizky Ramadhan",
                      student_class: "11-MIPA-1",
                      started_at: "2026-10-20T08:00:00.000Z",
                      submitted_at: null,
                      is_completed: false,
                      total_score: 0,
                    },
                    {
                      id: "sess-active-2",
                      student_name: "Nadia Putri",
                      student_class: "11-MIPA-2",
                      started_at: "2026-10-20T08:10:00.000Z",
                      submitted_at: null,
                      is_completed: false,
                      total_score: 0,
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === "session_answers") {
          return {
            select: () => ({
              in: vi.fn().mockResolvedValue({
                data: [
                  {
                    session_id: "sess-active-1",
                    answer_value: "A",
                    last_updated_at: "2026-10-20T08:15:00.000Z",
                  },
                  {
                    session_id: "sess-active-1",
                    answer_value: ["B", "C"],
                    last_updated_at: "2026-10-20T08:25:15.000Z",
                  },
                  {
                    session_id: "sess-active-1",
                    answer_value: "",
                    last_updated_at: "2026-10-20T08:20:00.000Z",
                  },
                ],
                error: null,
              }),
            }),
          };
        }

        return {};
      });

      const res = await getExamMonitoringData("exam-f504");
      expect(res.success).toBe(true);
      expect(res.totalQuestions).toBe(5);
      expect(res.sessions).toHaveLength(2);
      expect(res.sessions?.[0]).toEqual({
        id: "sess-active-1",
        studentName: "Rizky Ramadhan",
        studentClass: "11-MIPA-1",
        startedAt: "2026-10-20T08:00:00.000Z",
        submittedAt: null,
        isCompleted: false,
        totalScore: 0,
        answeredCount: 2,
        lastSyncedAt: "2026-10-20T08:25:15.000Z",
      });
      expect(res.sessions?.[1]?.answeredCount).toBe(0);
      expect(res.sessions?.[1]?.lastSyncedAt).toBeNull();
    });
  });

  describe("forceSubmitSessionAction Server Action & Penghentian Hak Akses Pengisian", () => {
    it("menolak aksi paksa kumpulkan jika bukan administrator", async () => {
      mockGetAdminUser.mockResolvedValue(null);

      const res = await forceSubmitSessionAction("sess-active-1");
      expect(res.success).toBe(false);
      expect(res.message).toMatch(/Akses ditolak/i);
    });

    it("memperbarui sesi menjadi selesai, menilai jawaban otomatis, dan menghentikan hak akses sinkronisasi siswa", async () => {
      mockGetAdminUser.mockResolvedValue({
        id: "admin-1",
        email: "admin@exam.local",
      });

      const rawStudentToken = "student-secret-token-f504";
      const tokenHash = hashSessionToken(rawStudentToken);

      // State sesi di database yang akan berubah setelah forceSubmitSessionAction
      let dbSessionState = {
        id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        exam_id: "exam-f504",
        session_token_hash: tokenHash,
        started_at: "2026-10-20T08:00:00.000Z",
        submitted_at: null as string | null,
        is_completed: false,
        total_score: 0,
        exams: mockExam,
      };

      const mockUpdateEq = vi.fn().mockImplementation(async () => {
        dbSessionState = {
          ...dbSessionState,
          is_completed: true,
          submitted_at: "2026-10-20T08:40:00.000Z",
        };
        return { error: null };
      });

      mockScoreExamSession.mockResolvedValue({
        success: true,
        totalScore: 75,
      });

      mockServiceFrom.mockImplementation((table: string) => {
        if (table === "exam_sessions") {
          return {
            select: () => ({
              eq: () => ({
                single: vi
                  .fn()
                  .mockImplementation(async () => ({
                    data: dbSessionState,
                    error: null,
                  })),
                maybeSingle: vi
                  .fn()
                  .mockImplementation(async () => ({
                    data: dbSessionState,
                    error: null,
                  })),
              }),
            }),
            update: () => ({
              eq: mockUpdateEq,
            }),
          };
        }
        return {};
      });

      // 1. Admin mengeksekusi Paksa Kumpulkan
      const forceRes = await forceSubmitSessionAction(dbSessionState.id);
      expect(forceRes.success).toBe(true);
      expect(forceRes.totalScore).toBe(75);
      expect(mockUpdateEq).toHaveBeenCalledWith("id", dbSessionState.id);
      expect(mockScoreExamSession).toHaveBeenCalledWith(dbSessionState.id);
      expect(dbSessionState.is_completed).toBe(true);

      // 2. Pastikan hak akses pengisian siswa terhenti (syncBatchAnswersAction ditolak)
      mockCookieGet.mockReturnValue({ value: rawStudentToken });

      const syncRes = await syncBatchAnswersAction({
        sessionId: dbSessionState.id,
        answers: [
          {
            questionId: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
            answerValue: "D",
            isFlagged: false,
          },
        ],
      });

      expect(syncRes.success).toBe(false);
      expect(syncRes.message).toMatch(/Sesi ujian ini telah diselesaikan/i);
    });
  });

  describe("SessionMonitoringView Component", () => {
    it("merender 3 kartu indikator metrik, waktu pengerjaan terkini, dan waktu sinkronisasi terakhir", () => {
      render(
        <SessionMonitoringView
          exam={mockExam}
          totalQuestions={5}
          initialSessions={mockMonitoredSessions}
          initialServerTime="2026-10-20T08:30:00.000Z"
        />
      );

      // Kartu metrik ringkas sesuai spesifikasi F5-04
      expect(screen.getByText("Total Peserta Terdaftar")).toBeInTheDocument();
      expect(screen.getByText("Peserta Sedang Mengerjakan")).toBeInTheDocument();
      expect(screen.getByText("Peserta Telah Mengumpulkan")).toBeInTheDocument();

      expect(screen.getByTestId("metric-total-registered")).toHaveTextContent(
        "3"
      );
      expect(screen.getByTestId("metric-active-sessions")).toHaveTextContent(
        "2"
      );
      expect(screen.getByTestId("metric-completed-sessions")).toHaveTextContent(
        "1"
      );

      // Baris peserta dan progres sinkronisasi
      expect(screen.getByText("Rizky Ramadhan")).toBeInTheDocument();
      expect(screen.getByText("Nadia Putri")).toBeInTheDocument();
      expect(screen.getByText("Dimas Pratama")).toBeInTheDocument();

      expect(screen.getByText("Terjawab: 2 / 5 Soal")).toBeInTheDocument();
      expect(screen.getByText("Belum ada sinkronisasi")).toBeInTheDocument();

      // Durasi pengerjaan terkini untuk Rizky (mulai 08:00, server 08:30 -> 00:30:00, Sisa 01:00:00)
      expect(screen.getByText("00:30:00")).toBeInTheDocument();
      expect(screen.getByText("Sisa 01:00:00")).toBeInTheDocument();
    });

    it("menyaring daftar sesi berdasarkan tab status, kelas, dan pencarian nama siswa", () => {
      render(
        <SessionMonitoringView
          exam={mockExam}
          totalQuestions={5}
          initialSessions={mockMonitoredSessions}
          initialServerTime="2026-10-20T08:30:00.000Z"
        />
      );

      // Filter tab Aktif
      fireEvent.click(screen.getByRole("button", { name: /Aktif \(2\)/i }));
      expect(screen.getByText("Rizky Ramadhan")).toBeInTheDocument();
      expect(screen.getByText("Nadia Putri")).toBeInTheDocument();
      expect(screen.queryByText("Dimas Pratama")).not.toBeInTheDocument();

      // Filter kelas 11-MIPA-2
      const classSelect = screen.getByLabelText("Filter Berdasarkan Kelas");
      fireEvent.change(classSelect, { target: { value: "11-MIPA-2" } });
      expect(screen.getByText("Nadia Putri")).toBeInTheDocument();
      expect(screen.queryByText("Rizky Ramadhan")).not.toBeInTheDocument();

      // Kembalikan ke Semua Kelas & Semua Status, lalu cari nama
      fireEvent.change(classSelect, { target: { value: "all" } });
      fireEvent.click(screen.getByRole("button", { name: /Semua \(3\)/i }));

      const searchInput = screen.getByLabelText("Cari nama siswa");
      fireEvent.change(searchInput, { target: { value: "dimas" } });
      expect(screen.getByText("Dimas Pratama")).toBeInTheDocument();
      expect(screen.queryByText("Rizky Ramadhan")).not.toBeInTheDocument();
    });

    it("menampilkan dialog konfirmasi saat tombol Paksa Kumpulkan diklik dan memperbarui status sesi peserta", async () => {
      mockGetAdminUser.mockResolvedValue({
        id: "admin-1",
        email: "admin@exam.local",
      });

      mockScoreExamSession.mockResolvedValue({
        success: true,
        totalScore: 60,
      });

      mockServiceFrom.mockImplementation((table: string) => {
        if (table === "exam_sessions") {
          return {
            select: () => ({
              eq: () => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: "sess-active-1",
                    exam_id: "exam-f504",
                    started_at: "2026-10-20T08:00:00.000Z",
                    submitted_at: null,
                    is_completed: false,
                    total_score: 0,
                  },
                  error: null,
                }),
              }),
            }),
            update: () => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        return {};
      });

      render(
        <SessionMonitoringView
          exam={mockExam}
          totalQuestions={5}
          initialSessions={mockMonitoredSessions}
          initialServerTime="2026-10-20T08:30:00.000Z"
        />
      );

      // Klik tombol Paksa Kumpulkan pertama (untuk Rizky Ramadhan)
      const forceButtons = screen.getAllByRole("button", {
        name: /Paksa Kumpulkan/i,
      });
      expect(forceButtons).toHaveLength(2);
      fireEvent.click(forceButtons[0]);

      // Pastikan dialog konfirmasi muncul
      expect(
        await screen.findByText(/Konfirmasi Paksa Kumpulkan Sesi Peserta/i)
      ).toBeInTheDocument();

      // Klik tombol konfirmasi di dalam modal
      const confirmButton = screen.getByRole("button", {
        name: /Ya, Paksa Kumpulkan/i,
      });
      fireEvent.click(confirmButton);

      // Tunggu pembaruan state sesi dan metrik
      await waitFor(() => {
        expect(screen.getByTestId("metric-active-sessions")).toHaveTextContent(
          "1"
        );
        expect(
          screen.getByTestId("metric-completed-sessions")
        ).toHaveTextContent("2");
      });

      expect(
        screen.getByText(/berhasil dipaksa kumpulkan dan hak akses pengisian telah dihentikan/i)
      ).toBeInTheDocument();
    });
  });
});

