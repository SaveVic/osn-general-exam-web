import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { examFormSchema } from "@/lib/validations/exam";
import {
  createExamAction,
  updateExamAction,
  toggleExamShowScoreAction,
} from "@/actions/exams";
import { getExamCompletionSummaryAction } from "@/actions/exam-session";
import ExamFinishedPage from "@/app/ujian/selesai/page";

// Mock Supabase service client
const mockServiceFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createServiceClient: vi.fn(() => ({
    from: mockServiceFrom,
  })),
}));

// Mock Supabase server client
const mockServerFrom = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: mockServerFrom,
  })),
}));

// Mock revalidatePath & redirect
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));

describe("Fitur Pengaturan Visibilitas Skor Ujian", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Validasi Zod: examFormSchema", () => {
    it("menetapkan default show_score ke false jika tidak disediakan", () => {
      const parsed = examFormSchema.parse({
        title: "Ujian Matematika",
        duration_minutes: 90,
        starts_at: "2026-10-21T08:00:00.000Z",
        ends_at: "2026-10-21T10:00:00.000Z",
        class_options: ["10-A"],
        is_published: true,
      });

      expect(parsed.show_score).toBe(false);
    });

    it("menerima show_score true saat diaktifkan", () => {
      const parsed = examFormSchema.parse({
        title: "Ujian Matematika",
        duration_minutes: 90,
        starts_at: "2026-10-21T08:00:00.000Z",
        ends_at: "2026-10-21T10:00:00.000Z",
        class_options: ["10-A"],
        is_published: true,
        show_score: true,
      });

      expect(parsed.show_score).toBe(true);
    });
  });

  describe("Server Actions Admin: createExamAction, updateExamAction, toggleExamShowScoreAction", () => {
    it("menyimpan field show_score saat membuat naskah ujian baru", async () => {
      let insertedPayload: Record<string, unknown> = {};

      mockServerFrom.mockImplementation((table: string) => {
        if (table === "exams") {
          return {
            insert: vi.fn().mockImplementation((payload: Record<string, unknown>) => {
              insertedPayload = payload;
              return Promise.resolve({ error: null });
            }),
          };
        }
        return {};
      });

      const formData = new FormData();
      formData.append("title", "Ujian Fisika 2026");
      formData.append("duration_minutes", "60");
      formData.append("starts_at", "2026-10-21T08:00:00.000Z");
      formData.append("ends_at", "2026-10-21T10:00:00.000Z");
      formData.append("class_options", JSON.stringify(["10-IPA"]));
      formData.append("is_published", "on");
      formData.append("show_score", "on");

      await createExamAction(null, formData);
      expect(insertedPayload.show_score).toBe(true);
    });

    it("memperbarui field show_score pada naskah ujian yang ada", async () => {
      let updatedPayload: Record<string, unknown> = {};

      mockServerFrom.mockImplementation((table: string) => {
        if (table === "exams") {
          return {
            update: vi.fn().mockImplementation((payload: Record<string, unknown>) => {
              updatedPayload = payload;
              return {
                eq: vi.fn().mockResolvedValue({ error: null }),
              };
            }),
          };
        }
        return {};
      });

      const formData = new FormData();
      formData.append("title", "Ujian Fisika 2026");
      formData.append("duration_minutes", "60");
      formData.append("starts_at", "2026-10-21T08:00:00.000Z");
      formData.append("ends_at", "2026-10-21T10:00:00.000Z");
      formData.append("class_options", JSON.stringify(["10-IPA"]));
      // show_score tidak disertakan (uncheck)

      const result = await updateExamAction("exam-1", null, formData);
      expect(result.success).toBe(true);
      expect(updatedPayload.show_score).toBe(false);
    });

    it("mengubah status show_score secara instan melalui toggleExamShowScoreAction", async () => {
      let updatedPayload: Record<string, unknown> = {};

      mockServerFrom.mockImplementation((table: string) => {
        if (table === "exams") {
          return {
            update: vi.fn().mockImplementation((payload: Record<string, unknown>) => {
              updatedPayload = payload;
              return {
                eq: vi.fn().mockResolvedValue({ error: null }),
              };
            }),
          };
        }
        return {};
      });

      const res = await toggleExamShowScoreAction("exam-1", true);
      expect(res.success).toBe(true);
      expect(updatedPayload.show_score).toBe(true);
    });
  });

  describe("Server Action: getExamCompletionSummaryAction", () => {
    it("menyembunyikan skor dan rincian jika naskah ujian memiliki show_score: false", async () => {
      mockServiceFrom.mockImplementation((table: string) => {
        if (table === "exam_sessions") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: "sess-1",
                    exam_id: "exam-1",
                    student_name: "Farhan Maulana",
                    student_class: "12-IPA-1",
                    total_score: 90,
                    is_completed: true,
                    exams: {
                      id: "exam-1",
                      title: "Simulasi OSN",
                      show_score: false,
                    },
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      const res = await getExamCompletionSummaryAction("sess-1");
      expect(res.success).toBe(true);
      expect(res.showScore).toBe(false);
      expect(res.studentName).toBe("Farhan Maulana");
      expect(res.totalScore).toBeUndefined();
      expect(res.correctCount).toBeUndefined();
      expect(res.incorrectCount).toBeUndefined();
    });

    it("menampilkan skor total, jumlah benar dan salah jika show_score: true", async () => {
      mockServiceFrom.mockImplementation((table: string) => {
        if (table === "exam_sessions") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: "sess-2",
                    exam_id: "exam-2",
                    student_name: "Dewi Lestari",
                    student_class: "12-IPA-2",
                    total_score: 75,
                    is_completed: true,
                    exams: {
                      id: "exam-2",
                      title: "Ujian Biologi",
                      show_score: true,
                    },
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
              eq: vi.fn().mockResolvedValue({
                data: [
                  { id: "q1", points: 25 },
                  { id: "q2", points: 25 },
                  { id: "q3", points: 25 },
                  { id: "q4", points: 25 },
                ],
                error: null,
              }),
            }),
          };
        }
        if (table === "session_answers") {
          return {
            select: () => ({
              eq: vi.fn().mockResolvedValue({
                data: [
                  { question_id: "q1", answer_value: "A", awarded_score: 25 },
                  { question_id: "q2", answer_value: "B", awarded_score: 25 },
                  { question_id: "q3", answer_value: "C", awarded_score: 25 },
                  { question_id: "q4", answer_value: "D", awarded_score: 0 },
                ],
                error: null,
              }),
            }),
          };
        }
        return {};
      });

      const res = await getExamCompletionSummaryAction("sess-2");
      expect(res.success).toBe(true);
      expect(res.showScore).toBe(true);
      expect(res.totalScore).toBe(75);
      expect(res.maxScore).toBe(100);
      expect(res.correctCount).toBe(3);
      expect(res.incorrectCount).toBe(1);
      expect(res.unansweredCount).toBe(0);
      expect(res.totalQuestions).toBe(4);
    });
  });

  describe("Tampilan Layar Selesai: ExamFinishedPage", () => {
    it("merender box total skor serta badge benar dan salah saat showScore = true", async () => {
      mockServiceFrom.mockImplementation((table: string) => {
        if (table === "exam_sessions") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: "sess-score",
                    exam_id: "exam-1",
                    student_name: "Indah Permata",
                    student_class: "11-MIPA-3",
                    total_score: 85,
                    is_completed: true,
                    exams: {
                      id: "exam-1",
                      title: "Ujian Kimia",
                      show_score: true,
                    },
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
              eq: vi.fn().mockResolvedValue({
                data: [
                  { id: "q1", points: 50 },
                  { id: "q2", points: 50 },
                ],
                error: null,
              }),
            }),
          };
        }
        if (table === "session_answers") {
          return {
            select: () => ({
              eq: vi.fn().mockResolvedValue({
                data: [
                  { question_id: "q1", answer_value: "A", awarded_score: 50 },
                  { question_id: "q2", answer_value: "B", awarded_score: 35 },
                ],
                error: null,
              }),
            }),
          };
        }
        return {};
      });

      const page = await ExamFinishedPage({
        searchParams: Promise.resolve({ session: "sess-score" }),
      });
      render(page);

      expect(screen.getByText("Indah Permata")).toBeInTheDocument();
      expect(screen.queryByText("11-MIPA-3")).not.toBeInTheDocument();
      expect(screen.getByText("Total Skor Perolehan")).toBeInTheDocument();
      expect(screen.getByText("85")).toBeInTheDocument();
      expect(screen.getByText("Jawaban Benar")).toBeInTheDocument();
      expect(screen.getByText("Jawaban Salah")).toBeInTheDocument();
    });

    it("tidak menampilkan box skor saat showScore = false", async () => {
      mockServiceFrom.mockImplementation((table: string) => {
        if (table === "exam_sessions") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: "sess-hidden",
                    exam_id: "exam-1",
                    student_name: "Rudi Hartono",
                    student_class: "11-MIPA-1",
                    total_score: 95,
                    is_completed: true,
                    exams: {
                      id: "exam-1",
                      title: "Ujian Geografi",
                      show_score: false,
                    },
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      const page = await ExamFinishedPage({
        searchParams: Promise.resolve({ session: "sess-hidden" }),
      });
      render(page);

      expect(screen.getByText("Ujian Berhasil Dikirimkan")).toBeInTheDocument();
      expect(screen.queryByText("Total Skor Perolehan")).not.toBeInTheDocument();
      expect(screen.queryByText("Jawaban Benar")).not.toBeInTheDocument();
      expect(screen.queryByText("Jawaban Salah")).not.toBeInTheDocument();
    });
  });
});

