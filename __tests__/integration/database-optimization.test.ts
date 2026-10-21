import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import { updateSession } from "@/lib/supabase/middleware";
import {
  scoreExamSession,
  recalculateExamScoresAction,
} from "@/actions/scoring";
import { getExamMonitoringData } from "@/actions/session-monitoring";
import {
  submitExamSessionAction,
  verifyActiveSessionAction,
  startExamSessionAction,
} from "@/actions/exam-session";
import { hashSessionToken } from "@/lib/security/session-token";

// Mock next/headers
const mockCookieGet = vi.fn();
const mockCookieSet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: mockCookieGet,
    set: mockCookieSet,
  })),
}));

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
    mockCookieGet.mockReturnValue(undefined);
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

  describe("5. Strategi 4: Single-Pass Submit & Score Mutation (submitExamSessionAction)", () => {
    it("mengevaluasi skor dan mengumpulkan ujian dalam satu pass mutasi tanpa roundtrip ganda", async () => {
      const rawToken = "raw-opt-token-123";
      const tokenHash = hashSessionToken(rawToken);
      mockCookieGet.mockReturnValue({ value: rawToken });

      const mockSession = {
        id: "sess-opt-subm",
        exam_id: "exam-opt-subm",
        session_token_hash: tokenHash,
        started_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        is_completed: false,
        exams: {
          id: "exam-opt-subm",
          title: "Simulasi Single-Pass",
          duration_minutes: 60,
          ends_at: new Date(Date.now() + 50 * 60 * 1000).toISOString(),
        },
      };

      const mockQuestions = [
        {
          id: "q-single-1",
          question_type: "single_choice",
          points: 50,
          correct_answer: { selected: "B" },
        },
      ];

      let sessionUpdatedWithScore = false;
      let sessionUpdatedWithCompleted = false;
      let answersUpsertedWithAwardedScore = false;
      let sessionUpdateCallCount = 0;

      mockServiceFrom.mockImplementation((table: string) => {
        if (table === "exam_sessions") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({ data: mockSession, error: null })),
              })),
            })),
            update: vi.fn((payload) => {
              sessionUpdateCallCount++;
              if (payload.is_completed === true) {
                sessionUpdatedWithCompleted = true;
              }
              if (payload.total_score === 50) {
                sessionUpdatedWithScore = true;
              }
              return {
                eq: vi.fn(async () => ({ error: null })),
              };
            }),
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
              eq: vi.fn(async () => ({ data: [], error: null })),
            })),
            upsert: vi.fn(async (rows: Array<{ awarded_score?: number }>) => {
              if (rows.length > 0 && rows[0].awarded_score === 50) {
                answersUpsertedWithAwardedScore = true;
              }
              return { error: null };
            }),
          };
        }
        return {};
      });

      const res = await submitExamSessionAction({
        sessionId: "sess-opt-subm",
        finalAnswers: [
          { questionId: "q-single-1", answerValue: { selected: "B" }, isFlagged: false },
        ],
      });

      expect(res.success).toBe(true);
      // Single-Pass Mutation: Skor dan status selesai disimpan dalam 1 kali update ke exam_sessions
      expect(sessionUpdateCallCount).toBe(1);
      expect(sessionUpdatedWithCompleted).toBe(true);
      expect(sessionUpdatedWithScore).toBe(true);
      // Jawaban di-upsert langsung dengan awarded_score terhitung
      expect(answersUpsertedWithAwardedScore).toBe(true);
    });
  });

  describe("6. Strategi 5: Minimal Column Projection (verifyActiveSessionAction)", () => {
    it("memproyeksikan kolom seminimal mungkin tanpa wildcard select * dan exams(*)", async () => {
      const rawToken = "raw-tok-verify-opt";
      const tokenHash = hashSessionToken(rawToken);
      mockCookieGet.mockReturnValue({ value: rawToken });

      let capturedSelectString = "";

      mockServiceFrom.mockImplementation((table: string) => {
        if (table === "exam_sessions") {
          return {
            select: vi.fn((cols: string) => {
              capturedSelectString = cols;
              return {
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn(async () => ({
                    data: {
                      id: "sess-min-proj",
                      exam_id: "ex-1",
                      student_name: "Budi",
                      student_class: "12-IPA",
                      session_token_hash: tokenHash,
                      is_completed: false,
                      started_at: new Date().toISOString(),
                      submitted_at: null,
                      exams: {
                        id: "ex-1",
                        title: "Fisika Modern",
                        duration_minutes: 90,
                        ends_at: new Date(Date.now() + 3600000).toISOString(),
                      },
                    },
                    error: null,
                  })),
                })),
              };
            }),
          };
        }
        return {};
      });

      const res = await verifyActiveSessionAction("sess-min-proj");
      expect(res.valid).toBe(true);
      // Verifikasi proyeksi kolom tidak menggunakan wildcard
      expect(capturedSelectString).not.toContain("*, exams(*)");
      expect(capturedSelectString).toBe(
        "id, exam_id, student_name, student_class, session_token_hash, is_completed, started_at, submitted_at, exams(id, title, duration_minutes, ends_at)"
      );
    });
  });

  describe("7. Skenario 2: Optimistic Concurrency Control (startExamSessionAction)", () => {
    it("menerapkan pengecekan kuota kondisional OCC saat menambah current_uses", async () => {
      mockCookieGet.mockReturnValue(undefined);
      const now = Date.now();
      const endsAt = new Date(now + 3600_000).toISOString();

      let occConditionChecked = false;

      mockServiceFrom.mockImplementation((table: string) => {
        if (table === "referral_codes") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({
                  data: {
                    id: "ref-occ-1",
                    code: "OSN-OCC",
                    is_active: true,
                    expires_at: endsAt,
                    max_uses: 10,
                    current_uses: 3,
                    exams: {
                      id: "ex-occ-1",
                      title: "Ujian Concurrency",
                      duration_minutes: 60,
                      starts_at: new Date(now - 60000).toISOString(),
                      ends_at: endsAt,
                      is_published: true,
                    },
                  },
                  error: null,
                })),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn((col1: string) => {
                if (col1 === "id") {
                  return {
                    eq: vi.fn((col2: string, val2: unknown) => {
                      if (col2 === "current_uses" && val2 === 3) {
                        occConditionChecked = true;
                      }
                      return {
                        select: vi.fn(async () => ({
                          data: [{ id: "ref-occ-1", current_uses: 4, max_uses: 10 }],
                          error: null,
                        })),
                      };
                    }),
                  };
                }
                return {};
              }),
            })),
          };
        }
        if (table === "exam_sessions") {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(async () => ({
                  data: {
                    id: "sess-occ-created",
                    started_at: new Date().toISOString(),
                    student_name: "Citra",
                    student_class: "11-B",
                  },
                  error: null,
                })),
              })),
            })),
          };
        }
        if (table === "questions") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(async () => ({ data: [], error: null })),
              })),
            })),
          };
        }
        return {};
      });

      const res = await startExamSessionAction({
        referralCode: "OSN-OCC",
        studentName: "Citra Lestari",
        studentClass: "11-B",
      });

      expect(res.success).toBe(true);
      expect(occConditionChecked).toBe(true);
    });
  });
});
