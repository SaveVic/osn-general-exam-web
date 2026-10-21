import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import { updateSession } from "@/lib/supabase/middleware";
import {
  scoreExamSession,
  recalculateExamScoresAction,
} from "@/actions/scoring";
import { getExamMonitoringData } from "@/actions/session-monitoring";

// Mock Supabase middleware
vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: vi.fn(),
}));

// Mock auth
const mockGetAdminUser = vi.fn();
vi.mock("@/actions/auth", () => ({
  getAdminUser: () => mockGetAdminUser(),
}));

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock Supabase service client
const mockServiceFrom = vi.fn();
const mockServiceRpc = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createServiceClient: vi.fn(() => ({
    from: mockServiceFrom,
    rpc: mockServiceRpc,
  })),
}));

describe("Database Query & API Call Optimization Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Middleware Auth Bypass Optimization", () => {
    it("TIDAK memanggil updateSession (Supabase Auth) pada jalur siswa (/) dan (/ujian/*)", async () => {
      // 1. Jalur gerbang masuk utama (/)
      const reqHome = new NextRequest("http://localhost:3000/");
      const resHome = await middleware(reqHome);
      expect(resHome.status).toBe(200);
      expect(updateSession).not.toHaveBeenCalled();

      // 2. Jalur ruang ujian dengan token (/ujian/session-123)
      const reqExam = new NextRequest("http://localhost:3000/ujian/session-123");
      reqExam.cookies.set("exam_token", "valid-exam-token-abc");
      const resExam = await middleware(reqExam);
      expect(resExam.status).toBe(200);
      expect(updateSession).not.toHaveBeenCalled();
    });

    it("TETAP memanggil updateSession pada seluruh jalur administrator (/admin/*)", async () => {
      vi.mocked(updateSession).mockResolvedValueOnce({
        supabaseResponse: {
          cookies: {
            getAll: () => [],
            set: vi.fn(),
          },
        },
        user: null,
      } as unknown as Awaited<ReturnType<typeof updateSession>>);

      const reqAdmin = new NextRequest("http://localhost:3000/admin/dasbor");
      const resAdmin = await middleware(reqAdmin);

      expect(updateSession).toHaveBeenCalledTimes(1);
      expect(resAdmin.status).toBe(307);
      expect(resAdmin.headers.get("location")).toContain("/admin/masuk");
    });
  });

  describe("2. Recalculate Scores Batch Optimization (Eliminasi N+1)", () => {
    it("menggunakan fungsi Stored Procedure (RPC) jika tersedia di database", async () => {
      mockGetAdminUser.mockResolvedValue({ id: "admin-1", email: "admin@exam.com" });
      mockServiceRpc.mockResolvedValueOnce({
        data: [{ processed_sessions: 25 }],
        error: null,
      });

      const res = await recalculateExamScoresAction("exam-rpc-01");
      expect(res.success).toBe(true);
      expect(res.processedSessions).toBe(25);
      expect(mockServiceRpc).toHaveBeenCalledWith("recalculate_exam_scores_batch", {
        target_exam_id: "exam-rpc-01",
      });
      // Tidak perlu query tabel questions secara manual jika RPC berhasil
      expect(mockServiceFrom).not.toHaveBeenCalled();
    });

    it("menjalankan Batch Query Fallback secara efisien (O(1) database trips) jika RPC tidak tersedia", async () => {
      mockGetAdminUser.mockResolvedValue({ id: "admin-1", email: "admin@exam.com" });
      mockServiceRpc.mockRejectedValueOnce(new Error("RPC not found"));

      const mockCompletedSessions = [{ id: "s-1" }, { id: "s-2" }];
      const mockQuestions = [
        {
          id: "q-1",
          question_type: "single_choice",
          points: 10,
          correct_answer: { selected: "A" },
        },
      ];
      const mockAnswers = [
        {
          session_id: "s-1",
          question_id: "q-1",
          answer_value: { selected: "A" },
          is_flagged: false,
          awarded_score: 0,
        },
        {
          session_id: "s-2",
          question_id: "q-1",
          answer_value: { selected: "B" },
          is_flagged: false,
          awarded_score: 0,
        },
      ];

      let questionsQueryCount = 0;
      let answersQueryCount = 0;
      let batchUpsertCalled = false;

      mockServiceFrom.mockImplementation((table: string) => {
        if (table === "exam_sessions") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(async () => ({ data: mockCompletedSessions, error: null })),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(async () => ({ error: null })),
            })),
          };
        }
        if (table === "questions") {
          return {
            select: vi.fn(() => {
              questionsQueryCount++;
              return {
                eq: vi.fn(async () => ({ data: mockQuestions, error: null })),
              };
            }),
          };
        }
        if (table === "session_answers") {
          return {
            select: vi.fn(() => {
              answersQueryCount++;
              return {
                in: vi.fn(async () => ({ data: mockAnswers, error: null })),
              };
            }),
            upsert: vi.fn(async (rows) => {
              if (Array.isArray(rows) && rows.length === 2) {
                batchUpsertCalled = true;
              }
              return { error: null };
            }),
          };
        }
        return {};
      });

      const res = await recalculateExamScoresAction("exam-batch-01");

      expect(res.success).toBe(true);
      expect(res.processedSessions).toBe(2);
      // Kueri butir soal HANYA dieksekusi 1 kali untuk seluruh sesi (bukan N kali)
      expect(questionsQueryCount).toBe(1);
      // Kueri lembar jawaban HANYA dieksekusi 1 kali (bukan N kali)
      expect(answersQueryCount).toBe(1);
      // Seluruh nilai jawaban di-upsert sekaligus dalam 1 batch
      expect(batchUpsertCalled).toBe(true);
    });
  });

  describe("3. scoreExamSession with Preloaded Questions", () => {
    it("melewati kueri tabel questions jika preloadedQuestions telah disertakan", async () => {
      let questionsQueried = false;

      mockServiceFrom.mockImplementation((table: string) => {
        if (table === "exam_sessions") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(async () => ({
                  data: { id: "sess-preload", exam_id: "exam-preload", is_completed: true },
                  error: null,
                })),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(async () => ({ error: null })),
            })),
          };
        }
        if (table === "questions") {
          questionsQueried = true;
          return {
            select: vi.fn(() => ({
              eq: vi.fn(async () => ({ data: [], error: null })),
            })),
          };
        }
        if (table === "session_answers") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(async () => ({
                data: [{ question_id: "q-p1", answer_value: { selected: "A" }, is_flagged: false }],
                error: null,
              })),
            })),
            upsert: vi.fn(async () => ({ error: null })),
          };
        }
        return {};
      });

      const preloaded = [
        {
          id: "q-p1",
          question_type: "single_choice" as const,
          points: 10,
          correct_answer: { selected: "A" },
        },
      ];

      const res = await scoreExamSession("sess-preload", preloaded);
      expect(res.success).toBe(true);
      expect(res.totalScore).toBe(10);
      expect(questionsQueried).toBe(false);
    });
  });

  describe("4. getExamMonitoringData View & Fallback Optimization", () => {
    it("menggunakan View v_exam_session_monitoring jika tersedia", async () => {
      mockGetAdminUser.mockResolvedValue({ id: "admin-1" });

      let viewQueried = false;
      let rawAnswersQueried = false;

      const mockExam = { id: "ex-mon-1", title: "Ujian Sains" };
      const mockViewRows = [
        {
          id: "sess-mon-1",
          exam_id: "ex-mon-1",
          student_name: "Andi",
          student_class: "XA",
          started_at: "2026-10-21T00:00:00Z",
          submitted_at: null,
          is_completed: false,
          total_score: null,
          answered_count: 5,
          last_synced_at: "2026-10-21T00:10:00Z",
        },
      ];

      mockServiceFrom.mockImplementation((table: string) => {
        if (table === "exams") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(async () => ({ data: mockExam, error: null })),
              })),
            })),
          };
        }
        if (table === "questions") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(async () => ({ data: [{ id: "q1" }, { id: "q2" }], error: null })),
            })),
          };
        }
        if (table === "v_exam_session_monitoring") {
          viewQueried = true;
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(async () => ({ data: mockViewRows, error: null })),
              })),
            })),
          };
        }
        if (table === "session_answers") {
          rawAnswersQueried = true;
          return {};
        }
        return {};
      });

      const res = await getExamMonitoringData("ex-mon-1");
      expect(res.success).toBe(true);
      expect(viewQueried).toBe(true);
      expect(rawAnswersQueried).toBe(false);
      expect(res.sessions?.[0].answeredCount).toBe(5);
    });
  });
});
