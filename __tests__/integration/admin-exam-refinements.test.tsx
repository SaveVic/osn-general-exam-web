import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  formatAnswerForCsv,
  generateExamFullAnswersCsv,
  type StudentFullAnswerRow,
} from "@/lib/exam/report-csv";
import {
  getSessionAnswerDetailsAction,
  getExamFullAnswersReportAction,
} from "@/actions/exam-report";
import { deleteExamSessionAction } from "@/actions/session-monitoring";
import { checkSessionHeartbeatAction, verifyActiveSessionAction } from "@/actions/exam-session";

// Mock auth
const mockGetAdminUser = vi.fn();
vi.mock("@/actions/auth", () => ({
  getAdminUser: () => mockGetAdminUser(),
}));

// Mock Supabase service client
const mockServiceFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createServiceClient: vi.fn(() => ({
    from: mockServiceFrom,
  })),
}));

// Mock revalidatePath
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock cookies
const mockGetCookie = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: mockGetCookie,
    set: vi.fn(),
  })),
}));

describe("Admin Exam Refinements Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("CSV Formatter & Full Answers Generator", () => {
    it("memformat jawaban pilihan tunggal / jamak menjadi alfabet dipisahkan koma", () => {
      const options = [
        { id: "opt-1", label: "Pilihan 1" },
        { id: "opt-2", label: "Pilihan 2" },
        { id: "opt-3", label: "Pilihan 3" },
      ];

      // Single choice
      expect(formatAnswerForCsv("single_choice", options, "opt-1")).toBe("A");
      expect(formatAnswerForCsv("single_choice", options, "opt-3")).toBe("C");
      expect(formatAnswerForCsv("single_choice", options, null)).toBe("-");

      // Multiple choice
      expect(
        formatAnswerForCsv("multiple_choice", options, ["opt-1", "opt-3"])
      ).toBe("A, C");
      expect(
        formatAnswerForCsv("multiple_choice", options, ["opt-2"])
      ).toBe("B");
      expect(
        formatAnswerForCsv("multiple_choice", options, [])
      ).toBe("-");

      // Short answer
      expect(formatAnswerForCsv("short_answer", null, "42")).toBe("42");
      expect(formatAnswerForCsv("short_answer", null, null)).toBe("-");
    });

    it("menghasilkan CSV jawaban lengkap dengan header nomor soal berurutan", () => {
      const rows: StudentFullAnswerRow[] = [
        {
          studentName: "Budi Santoso",
          studentClass: "10-IPA-1",
          totalScore: 80,
          isCompleted: true,
          answers: {
            1: "A",
            2: "B, C",
            3: "Fotosintesis",
          },
        },
      ];

      const csv = generateExamFullAnswersCsv(3, rows);
      expect(csv).toContain("Nomor Urut,Nama Lengkap,Kelas,Skor Total,Status Pengerjaan,Soal 1,Soal 2,Soal 3");
      expect(csv).toContain("Budi Santoso");
      expect(csv).toContain("10-IPA-1");
      expect(csv).toContain("A");
      expect(csv).toContain('"B, C"');
      expect(csv).toContain("Fotosintesis");
    });
  });

  describe("getSessionAnswerDetailsAction", () => {
    it("menolak akses jika bukan admin", async () => {
      mockGetAdminUser.mockResolvedValue(null);

      const res = await getSessionAnswerDetailsAction("sess-1");
      expect(res.success).toBe(false);
      expect(res.message).toMatch(/Akses ditolak/i);
    });

    it("mengembalikan detail jawaban siswa beserta kunci jawaban dan preview soal", async () => {
      mockGetAdminUser.mockResolvedValue({ id: "admin-1" });

      mockServiceFrom.mockImplementation((table: string) => {
        if (table === "exam_sessions") {
          return {
            select: () => ({
              eq: () => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: "sess-1",
                    exam_id: "exam-1",
                    student_name: "Ali Imron",
                    student_class: "12-MIPA-1",
                    total_score: 100,
                    is_completed: true,
                    started_at: "2026-10-21T08:00:00.000Z",
                    submitted_at: "2026-10-21T09:00:00.000Z",
                    exams: { id: "exam-1", title: "Ujian Sains" },
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "questions") {
          return {
            select: () => ({
              eq: () => ({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: "q1",
                      order_index: 1,
                      question_type: "single_choice",
                      prompt: "Berapa 1 + 1?",
                      options: [
                        { id: "o1", label: "2", is_correct: true },
                        { id: "o2", label: "3", is_correct: false },
                      ],
                      correct_answer: "o1",
                      points: 10,
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
              eq: vi.fn().mockResolvedValue({
                data: [
                  {
                    question_id: "q1",
                    answer_value: "o1",
                    awarded_score: 10,
                    is_flagged: false,
                  },
                ],
                error: null,
              }),
            }),
          };
        }
        return {};
      });

      const res = await getSessionAnswerDetailsAction("sess-1");
      expect(res.success).toBe(true);
      expect(res.session?.studentName).toBe("Ali Imron");
      expect(res.questions).toHaveLength(1);
      expect(res.questions?.[0].isCorrect).toBe(true);
      expect(res.questions?.[0].formattedStudentAnswer).toBe("A. 2");
      expect(res.questions?.[0].formattedCorrectAnswer).toBe("A. 2");
    });
  });

  describe("getExamFullAnswersReportAction", () => {
    it("mengembalikan matriks jawaban lengkap seluruh siswa untuk ekspor CSV", async () => {
      mockGetAdminUser.mockResolvedValue({ id: "admin-1" });

      mockServiceFrom.mockImplementation((table: string) => {
        if (table === "exams") {
          return {
            select: () => ({
              eq: () => ({
                single: vi.fn().mockResolvedValue({
                  data: { title: "Ujian Sains" },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "questions") {
          return {
            select: () => ({
              eq: () => ({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: "q1",
                      order_index: 1,
                      question_type: "single_choice",
                      options: [
                        { id: "o1", label: "2" },
                        { id: "o2", label: "3" },
                      ],
                    },
                  ],
                  error: null,
                }),
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
                      id: "sess-1",
                      student_name: "Ali Imron",
                      student_class: "12-MIPA-1",
                      started_at: "2026-10-21T08:00:00.000Z",
                      submitted_at: "2026-10-21T09:00:00.000Z",
                      total_score: 100,
                      is_completed: true,
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
                    session_id: "sess-1",
                    question_id: "q1",
                    answer_value: "o1",
                  },
                ],
                error: null,
              }),
            }),
          };
        }
        return {};
      });

      const res = await getExamFullAnswersReportAction("exam-1");
      expect(res.success).toBe(true);
      expect(res.questionsCount).toBe(1);
      expect(res.rows).toHaveLength(1);
      expect(res.rows?.[0].answers[1]).toBe("A");
    });
  });

  describe("deleteExamSessionAction", () => {
    it("menghapus sesi ujian, mengembalikan kuota referral code, dan merevalidasi cache", async () => {
      mockGetAdminUser.mockResolvedValue({ id: "admin-1" });

      let deletedSessionId = "";
      let updatedReferralId = "";
      let updatedUses = -1;

      mockServiceFrom.mockImplementation((table: string) => {
        if (table === "exam_sessions") {
          return {
            select: () => ({
              eq: () => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: "sess-del",
                    exam_id: "exam-1",
                    referral_code_id: "ref-1",
                  },
                  error: null,
                }),
              }),
            }),
            delete: () => ({
              eq: vi.fn().mockImplementation((col: string, val: string) => {
                if (col === "id") deletedSessionId = val;
                return Promise.resolve({ error: null });
              }),
            }),
          };
        }
        if (table === "referral_codes") {
          return {
            select: () => ({
              eq: () => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: "ref-1",
                    current_uses: 5,
                  },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockImplementation((payload: { current_uses: number }) => {
              updatedUses = payload.current_uses;
              return {
                eq: vi.fn().mockImplementation((col: string, val: string) => {
                  if (col === "id") updatedReferralId = val;
                  return Promise.resolve({ error: null });
                }),
              };
            }),
          };
        }
        return {};
      });

      const res = await deleteExamSessionAction("sess-del");
      expect(res.success).toBe(true);
      expect(deletedSessionId).toBe("sess-del");
      expect(updatedReferralId).toBe("ref-1");
      expect(updatedUses).toBe(4); // decremented from 5 to 4
    });
  });

  describe("checkSessionHeartbeatAction & Session Invalidation", () => {
    it("mengembalikan sessionInvalid: true jika sesi sudah tidak ada di database", async () => {
      mockGetCookie.mockReturnValue({ value: "dummy-token" });

      mockServiceFrom.mockImplementation((table: string) => {
        if (table === "exam_sessions") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      const authRes = await verifyActiveSessionAction("sess-deleted");
      expect(authRes.valid).toBe(false);
      expect(authRes.sessionInvalid).toBe(true);

      const hbRes = await checkSessionHeartbeatAction("sess-deleted");
      expect(hbRes.valid).toBe(false);
      expect(hbRes.sessionInvalid).toBe(true);
      expect(hbRes.message).toMatch(/dihapus oleh pengawas/i);
    });
  });
});

