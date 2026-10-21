import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  scoreExamSession,
  recalculateExamScoresAction,
  recalculateSessionScoreAction,
} from "@/actions/scoring";
import { submitExamSessionAction } from "@/actions/exam-session";
import { RecalculateScoresButton } from "@/components/admin/scoring/recalculate-scores-button";
import { hashSessionToken } from "@/lib/security/session-token";

interface MockUpsertRow {
  session_id: string;
  question_id: string;
  answer_value: unknown;
  is_flagged: boolean;
  awarded_score: number;
  last_updated_at: string;
}

// Mock auth
const mockGetAdminUser = vi.fn();
vi.mock("@/actions/auth", () => ({
  getAdminUser: () => mockGetAdminUser(),
}));

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
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

describe("F5-01: Auto-Scoring Engine (ADM-SCOR-01)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("scoreExamSession - Evaluasi Otomatis Sesi Ujian", () => {
    it("mengevaluasi seluruh tipe soal (PG, Jamak, Numerik, Teks) dan menyimpan total_score secara presisi", async () => {
      const mockSession = {
        id: "sess-01",
        exam_id: "exam-01",
        is_completed: true,
      };

      const mockQuestions = [
        {
          id: "q-single",
          question_type: "single_choice",
          points: 25,
          correct_answer: { selected: "B" },
        },
        {
          id: "q-multi",
          question_type: "multiple_choice",
          points: 25,
          correct_answer: { selected: ["A", "C"] },
        },
        {
          id: "q-numeric",
          question_type: "short_answer",
          points: 25,
          correct_answer: { text: "3.14", numeric_tolerance: 0.01 },
        },
        {
          id: "q-text",
          question_type: "short_answer",
          points: 25,
          correct_answer: { text: "Fotosintesis", case_sensitive: false },
        },
      ];

      const mockAnswers = [
        { question_id: "q-single", answer_value: { selected: "B" }, is_flagged: false },
        { question_id: "q-multi", answer_value: { selected: ["C", "A"] }, is_flagged: false },
        // Menggunakan koma khas Indonesia "3,14" yang harus dinormalisasi
        { question_id: "q-numeric", answer_value: { text: " 3,14 " }, is_flagged: false },
        // Menggunakan huruf kecil yang cocok karena case_sensitive = false
        { question_id: "q-text", answer_value: "fotosintesis", is_flagged: true },
      ];

      let savedUpsertRows: MockUpsertRow[] = [];
      let savedSessionUpdate: { total_score?: number } | null = null;

      mockServiceFrom.mockImplementation((table: string) => {
        if (table === "exam_sessions") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(async () => ({ data: mockSession, error: null })),
              })),
            })),
            update: vi.fn((payload) => ({
              eq: vi.fn(async () => {
                savedSessionUpdate = payload;
                return { error: null };
              }),
            })),
          };
        }
        if (table === "questions") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(async () => ({ data: mockQuestions, error: null })),
            })),
          };
        }
        if (table === "session_answers") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(async () => ({ data: mockAnswers, error: null })),
            })),
            upsert: vi.fn(async (rows) => {
              savedUpsertRows = rows;
              return { error: null };
            }),
          };
        }
        return {};
      });

      const result = await scoreExamSession("sess-01");

      expect(result.success).toBe(true);
      expect(result.totalScore).toBe(100.0);
      expect(result.awardedCount).toBe(4);

      // Verifikasi awarded_score pada setiap butir soal
      const singleRow = savedUpsertRows.find((r) => r.question_id === "q-single");
      const multiRow = savedUpsertRows.find((r) => r.question_id === "q-multi");
      const numericRow = savedUpsertRows.find((r) => r.question_id === "q-numeric");
      const textRow = savedUpsertRows.find((r) => r.question_id === "q-text");

      expect(singleRow?.awarded_score).toBe(25);
      expect(multiRow?.awarded_score).toBe(25);
      expect(numericRow?.awarded_score).toBe(25);
      expect(textRow?.awarded_score).toBe(25);

      // Verifikasi pembaruan total_score pada exam_sessions
      expect(savedSessionUpdate).toEqual({
        total_score: 100.0,
      });
    });

    it("memberikan skor 0 pada butir soal yang salah atau tidak diisi", async () => {
      const mockSession = { id: "sess-02", exam_id: "exam-02", is_completed: true };
      const mockQuestions = [
        {
          id: "q-1",
          question_type: "single_choice",
          points: 50,
          correct_answer: { selected: "A" },
        },
        {
          id: "q-2",
          question_type: "short_answer",
          points: 50,
          correct_answer: { text: "100", numeric_tolerance: 1 },
        },
      ];

      // Siswa menjawab q-1 salah ('B'), dan q-2 tidak dijawab
      const mockAnswers = [
        { question_id: "q-1", answer_value: { selected: "B" }, is_flagged: false },
      ];

      let savedUpsertRows: MockUpsertRow[] = [];
      let savedSessionUpdate: { total_score?: number } | null = null;

      mockServiceFrom.mockImplementation((table: string) => {
        if (table === "exam_sessions") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(async () => ({ data: mockSession, error: null })),
              })),
            })),
            update: vi.fn((payload) => ({
              eq: vi.fn(async () => {
                savedSessionUpdate = payload;
                return { error: null };
              }),
            })),
          };
        }
        if (table === "questions") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(async () => ({ data: mockQuestions, error: null })),
            })),
          };
        }
        if (table === "session_answers") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(async () => ({ data: mockAnswers, error: null })),
            })),
            upsert: vi.fn(async (rows) => {
              savedUpsertRows = rows;
              return { error: null };
            }),
          };
        }
        return {};
      });

      const result = await scoreExamSession("sess-02");

      expect(result.success).toBe(true);
      expect(result.totalScore).toBe(0);
      expect(savedUpsertRows.find((r) => r.question_id === "q-1")?.awarded_score).toBe(0);
      expect(savedUpsertRows.find((r) => r.question_id === "q-2")?.awarded_score).toBe(0);
      expect(savedSessionUpdate).toEqual({ total_score: 0 });
    });
  });

  describe("Pemicu Otomatis saat Pengumpulan Ujian (submitExamSessionAction)", () => {
    it("memanggil scoreExamSession secara otomatis setelah ujian berhasil disubmit", async () => {
      const rawToken = "token-auto-score-12345";
      const tokenHash = hashSessionToken(rawToken);

      mockCookieGet.mockReturnValue({ value: rawToken });

      const mockSession = {
        id: "sess-auto-01",
        exam_id: "exam-auto-01",
        session_token_hash: tokenHash,
        started_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        is_completed: false,
        exams: {
          duration_minutes: 60,
          ends_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        },
      };

      const mockQuestions = [
        {
          id: "q-auto-1",
          question_type: "single_choice",
          points: 50,
          correct_answer: { selected: "A" },
        },
      ];

      let scoreExecuted = false;

      mockServiceFrom.mockImplementation((table: string) => {
        if (table === "exam_sessions") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(async () => ({ data: mockSession, error: null })),
                maybeSingle: vi.fn(async () => ({ data: mockSession, error: null })),
              })),
            })),
            update: vi.fn((payload) => ({
              eq: vi.fn(async () => {
                if (payload.total_score !== undefined) {
                  scoreExecuted = true;
                }
                return { error: null };
              }),
            })),
          };
        }
        if (table === "questions") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(async () => ({ data: mockQuestions, error: null })),
            })),
          };
        }
        if (table === "session_answers") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(async () => ({
                data: [{ question_id: "q-auto-1", answer_value: { selected: "A" }, is_flagged: false }],
                error: null,
              })),
            })),
            upsert: vi.fn(async () => ({ error: null })),
          };
        }
        return {};
      });

      const submitRes = await submitExamSessionAction({
        sessionId: "sess-auto-01",
        finalAnswers: [{ questionId: "q-auto-1", answerValue: { selected: "A" }, isFlagged: false }],
      });

      expect(submitRes.success).toBe(true);
      expect(scoreExecuted).toBe(true);
    });
  });

  describe("Server Action: recalculateExamScoresAction & recalculateSessionScoreAction", () => {
    it("menolak kalkulasi ulang jika bukan administrator", async () => {
      mockGetAdminUser.mockResolvedValue(null);

      const res = await recalculateExamScoresAction("exam-01");
      expect(res.success).toBe(false);
      expect(res.message).toMatch(/Akses ditolak/i);

      const singleRes = await recalculateSessionScoreAction("sess-01");
      expect(singleRes.success).toBe(false);
      expect(singleRes.message).toMatch(/Akses ditolak/i);
    });

    it("memproses seluruh sesi yang telah selesai saat dipanggil administrator", async () => {
      mockGetAdminUser.mockResolvedValue({ id: "admin-1", email: "admin@exam.com" });

      const mockCompletedSessions = [{ id: "sess-101" }, { id: "sess-102" }];

      mockServiceFrom.mockImplementation((table: string) => {
        if (table === "exam_sessions") {
          return {
            select: vi.fn((fields) => {
              if (fields === "id") {
                return {
                  eq: vi.fn(() => ({
                    eq: vi.fn(async () => ({ data: mockCompletedSessions, error: null })),
                  })),
                };
              }
              return {
                eq: vi.fn(() => ({
                  single: vi.fn(async () => ({
                    data: { id: "sess-101", exam_id: "exam-10", is_completed: true },
                    error: null,
                  })),
                })),
              };
            }),
            update: vi.fn(() => ({
              eq: vi.fn(async () => ({ error: null })),
            })),
          };
        }
        if (table === "questions") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(async () => ({
                data: [{ id: "q-1", question_type: "single_choice", points: 10, correct_answer: "A" }],
                error: null,
              })),
            })),
          };
        }
        if (table === "session_answers") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(async () => ({ data: [], error: null })),
              in: vi.fn(async () => ({ data: [], error: null })),
            })),
            upsert: vi.fn(async () => ({ error: null })),
          };
        }
        return {};
      });

      const res = await recalculateExamScoresAction("exam-10");

      expect(res.success).toBe(true);
      expect(res.processedSessions).toBe(2);
      expect(res.message).toMatch(/Kalkulasi ulang nilai berhasil/i);
    });
  });

  describe("RecalculateScoresButton Component", () => {
    it("menampilkan tombol dan modal konfirmasi saat diklik", async () => {
      mockGetAdminUser.mockResolvedValue({ id: "admin-1", email: "admin@exam.com" });

      render(<RecalculateScoresButton examId="exam-ui-01" />);

      const triggerBtn = screen.getByRole("button", { name: /Kalkulasi Ulang Nilai Ujian/i });
      expect(triggerBtn).toBeInTheDocument();

      fireEvent.click(triggerBtn);

      expect(screen.getByText("Kalkulasi Ulang Nilai Peserta")).toBeInTheDocument();
      expect(screen.getByText("Mulai Kalkulasi Ulang")).toBeInTheDocument();
    });
  });
});

