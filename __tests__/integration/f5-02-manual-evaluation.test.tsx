import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  getManualEvaluationData,
  updateManualScoreAction,
  type ManualEvaluationSubmission,
} from "@/actions/manual-evaluation";
import { ManualEvaluationView } from "@/components/admin/evaluation/manual-evaluation-view";
import { EvaluationItemCard } from "@/components/admin/evaluation/evaluation-item-card";
import type { ExamRow, QuestionRow } from "@/types/database";

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
vi.mock("@/lib/supabase/admin", () => ({
  createServiceClient: vi.fn(() => ({
    from: mockServiceFrom,
  })),
}));

const mockExam: ExamRow = {
  id: "exam-f502",
  title: "Simulasi OSN Sains & Biologi",
  description: "Ujian simulasi komprehensif tingkat lanjut",
  duration_minutes: 90,
  starts_at: "2026-10-20T08:00:00Z",
  ends_at: "2026-10-20T12:00:00Z",
  class_options: ["10-MIPA-1", "10-MIPA-2"],
  is_published: true,
  created_at: "2026-10-18T00:00:00Z",
  updated_at: "2026-10-18T00:00:00Z",
};

const mockQuestions: QuestionRow[] = [
  {
    id: "q-essay-1",
    exam_id: "exam-f502",
    order_index: 1,
    question_type: "short_answer",
    prompt: "Jelaskan peran mitokondria dalam respirasi sel!",
    options: [],
    points: 10,
    correct_answer: { text: "Penghasil energi sel (ATP)", case_sensitive: false },
    created_at: "2026-10-18T00:00:00Z",
  },
  {
    id: "q-essay-2",
    exam_id: "exam-f502",
    order_index: 2,
    question_type: "short_answer",
    prompt: "Berapa tetapan gravitasi universal G dalam m3/kg.s2?",
    options: [],
    points: 10,
    correct_answer: { text: "6.674", numeric_tolerance: 0.005 },
    created_at: "2026-10-18T00:00:00Z",
  },
];

const mockSubmissions: ManualEvaluationSubmission[] = [
  {
    sessionId: "sess-1",
    studentName: "Budi Santoso",
    studentClass: "10-MIPA-1",
    isCompleted: true,
    submittedAt: "2026-10-20T09:30:00Z",
    questionId: "q-essay-1",
    questionOrderIndex: 1,
    questionPrompt: "Jelaskan peran mitokondria dalam respirasi sel!",
    questionPoints: 10,
    correctAnswer: { text: "Penghasil energi sel (ATP)", case_sensitive: false },
    answerId: "ans-1",
    studentAnswerText: "Tempat sintesis ATP melalui siklus krebs dan fosforilasi oksidatif.",
    awardedScore: null,
    sessionTotalScore: 0,
  },
  {
    sessionId: "sess-2",
    studentName: "Siti Rahma",
    studentClass: "10-MIPA-2",
    isCompleted: true,
    submittedAt: "2026-10-20T09:40:00Z",
    questionId: "q-essay-1",
    questionOrderIndex: 1,
    questionPrompt: "Jelaskan peran mitokondria dalam respirasi sel!",
    questionPoints: 10,
    correctAnswer: { text: "Penghasil energi sel (ATP)", case_sensitive: false },
    answerId: "ans-2",
    studentAnswerText: "Organel pembangkit energi sel dalam bentuk molekul ATP.",
    awardedScore: 8.5,
    sessionTotalScore: 8.5,
  },
];

describe("F5-02: Manual Evaluation Interface for Short Answer (ADM-EVAL-01)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getManualEvaluationData Server Action", () => {
    it("menolak akses jika bukan administrator", async () => {
      mockGetAdminUser.mockResolvedValue(null);

      const res = await getManualEvaluationData("exam-f502");
      expect(res.success).toBe(false);
      expect(res.message).toMatch(/Akses ditolak/i);
    });

    it("mengembalikan naskah ujian, butir soal isian, dan pemetaan jawaban siswa", async () => {
      mockGetAdminUser.mockResolvedValue({ id: "admin-1", email: "admin@exam.com" });

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
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  order: vi.fn(async () => ({ data: mockQuestions, error: null })),
                })),
              })),
            })),
          };
        }
        if (table === "exam_sessions") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(async () => ({
                  data: [
                    {
                      id: "sess-1",
                      student_name: "Budi Santoso",
                      student_class: "10-MIPA-1",
                      is_completed: true,
                      submitted_at: "2026-10-20T09:30:00Z",
                      total_score: 50,
                    },
                  ],
                  error: null,
                })),
              })),
            })),
          };
        }
        if (table === "session_answers") {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => ({
                in: vi.fn(async () => ({
                  data: [
                    {
                      id: "ans-1",
                      session_id: "sess-1",
                      question_id: "q-essay-1",
                      answer_value: { text: "Tempat pembuatan energi ATP" },
                      awarded_score: 9.0,
                    },
                  ],
                  error: null,
                })),
              })),
            })),
          };
        }
        return {};
      });

      const res = await getManualEvaluationData("exam-f502");

      expect(res.success).toBe(true);
      expect(res.exam?.id).toBe("exam-f502");
      expect(res.questions?.length).toBe(2);
      expect(res.submissions?.length).toBe(2); // 1 sesi x 2 soal isian

      const sub1 = res.submissions?.find((s) => s.questionId === "q-essay-1");
      expect(sub1?.studentName).toBe("Budi Santoso");
      expect(sub1?.studentAnswerText).toBe("Tempat pembuatan energi ATP");
      expect(sub1?.awardedScore).toBe(9.0);

      const sub2 = res.submissions?.find((s) => s.questionId === "q-essay-2");
      expect(sub2?.studentAnswerText).toBeNull(); // belum dijawab
      expect(sub2?.awardedScore).toBeNull();
    });

    it("menangani kondisi ujian tanpa butir soal isian dengan daftar kosong", async () => {
      mockGetAdminUser.mockResolvedValue({ id: "admin-1", email: "admin@exam.com" });

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
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  order: vi.fn(async () => ({ data: [], error: null })),
                })),
              })),
            })),
          };
        }
        return {};
      });

      const res = await getManualEvaluationData("exam-f502");

      expect(res.success).toBe(true);
      expect(res.questions).toEqual([]);
      expect(res.submissions).toEqual([]);
    });
  });

  describe("updateManualScoreAction Server Action", () => {
    it("menolak nilai jika bukan administrator", async () => {
      mockGetAdminUser.mockResolvedValue(null);

      const res = await updateManualScoreAction({
        sessionId: "sess-1",
        questionId: "q-essay-1",
        score: 10,
      });

      expect(res.success).toBe(false);
      expect(res.message).toMatch(/Akses ditolak/i);
    });

    it("menolak nilai negatif", async () => {
      mockGetAdminUser.mockResolvedValue({ id: "admin-1", email: "admin@exam.com" });

      const res = await updateManualScoreAction({
        sessionId: "sess-1",
        questionId: "q-essay-1",
        score: -5,
      });

      expect(res.success).toBe(false);
      expect(res.message).toMatch(/lebih besar atau sama dengan 0/i);
    });

    it("menolak nilai yang melebihi bobot poin maksimal butir soal", async () => {
      mockGetAdminUser.mockResolvedValue({ id: "admin-1", email: "admin@exam.com" });

      mockServiceFrom.mockImplementation((table: string) => {
        if (table === "questions") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(async () => ({
                  data: { id: "q-essay-1", exam_id: "exam-f502", points: 10 },
                  error: null,
                })),
              })),
            })),
          };
        }
        return {};
      });

      const res = await updateManualScoreAction({
        sessionId: "sess-1",
        questionId: "q-essay-1",
        score: 15, // Max is 10
      });

      expect(res.success).toBe(false);
      expect(res.message).toMatch(/tidak boleh melebihi bobot maksimal/i);
    });

    it("menyimpan awarded_score dan menghitung ulang total_score sesi secara akurat", async () => {
      mockGetAdminUser.mockResolvedValue({ id: "admin-1", email: "admin@exam.com" });

      let savedAnswerUpsert: Record<string, unknown> | null = null;
      let savedSessionTotalScore: number | null = null;

      mockServiceFrom.mockImplementation((table: string) => {
        if (table === "questions") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(async () => ({
                  data: { id: "q-essay-1", exam_id: "exam-f502", points: 10 },
                  error: null,
                })),
              })),
            })),
          };
        }
        if (table === "session_answers") {
          return {
            select: vi.fn((fields: string) => {
              if (fields === "awarded_score") {
                return {
                  eq: vi.fn(async () => ({
                    data: [
                      { awarded_score: 8.5 }, // Soal yang baru dinilai
                      { awarded_score: 10.0 }, // Soal lain
                    ],
                    error: null,
                  })),
                };
              }
              return {
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    maybeSingle: vi.fn(async () => ({
                      data: { id: "ans-1", answer_value: { text: "Jawaban" }, is_flagged: false },
                      error: null,
                    })),
                  })),
                })),
              };
            }),
            upsert: vi.fn(async (payload) => {
              savedAnswerUpsert = payload;
              return { error: null };
            }),
          };
        }
        if (table === "exam_sessions") {
          return {
            update: vi.fn((payload) => ({
              eq: vi.fn(async () => {
                savedSessionTotalScore = payload.total_score;
                return { error: null };
              }),
            })),
          };
        }
        return {};
      });

      const res = await updateManualScoreAction({
        sessionId: "sess-1",
        questionId: "q-essay-1",
        score: 8.5,
      });

      expect(res.success).toBe(true);
      expect(res.awardedScore).toBe(8.5);
      expect(savedAnswerUpsert).toMatchObject({
        session_id: "sess-1",
        question_id: "q-essay-1",
        awarded_score: 8.5,
      });

      // Total score terakumulasi: 8.5 + 10.0 = 18.5
      expect(res.sessionTotalScore).toBe(18.5);
      expect(savedSessionTotalScore).toBe(18.5);
      expect(res.message).toMatch(/Nilai berhasil disimpan/i);
    });
  });

  describe("Komponen EvaluationItemCard", () => {
    it("merender informasi siswa, stimulus soal, rubrik referensi, dan teks jawaban", () => {
      render(<EvaluationItemCard submission={mockSubmissions[0]} />);

      expect(screen.getByText("Budi Santoso")).toBeInTheDocument();
      expect(screen.getByText("10-MIPA-1")).toBeInTheDocument();
      expect(screen.getByText(/Jelaskan peran mitokondria/i)).toBeInTheDocument();
      expect(screen.getByText(/Penghasil energi sel \(ATP\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Tempat sintesis ATP melalui siklus krebs/i)).toBeInTheDocument();
      expect(screen.getByText("Maks: 10 Poin")).toBeInTheDocument();
    });

    it("memvalidasi input dan memanggil updateManualScoreAction saat tombol ditekan", async () => {
      mockGetAdminUser.mockResolvedValue({ id: "admin-1", email: "admin@exam.com" });

      mockServiceFrom.mockImplementation((table: string) => {
        if (table === "questions") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(async () => ({
                  data: { id: "q-essay-1", exam_id: "exam-f502", points: 10 },
                  error: null,
                })),
              })),
            })),
          };
        }
        if (table === "session_answers") {
          return {
            select: vi.fn((fields: string) => {
              if (fields === "awarded_score") {
                return {
                  eq: vi.fn(async () => ({
                    data: [{ awarded_score: 9.0 }],
                    error: null,
                  })),
                };
              }
              return {
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    maybeSingle: vi.fn(async () => ({ data: null, error: null })),
                  })),
                })),
              };
            }),
            upsert: vi.fn(async () => ({ error: null })),
          };
        }
        if (table === "exam_sessions") {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(async () => ({ error: null })),
            })),
          };
        }
        return {};
      });

      const onScoreSaved = vi.fn();
      render(
        <EvaluationItemCard
          submission={mockSubmissions[0]}
          onScoreSaved={onScoreSaved}
        />
      );

      const input = screen.getByLabelText(/Nilai untuk Budi Santoso/i);
      fireEvent.change(input, { target: { value: "9.0" } });

      const saveBtn = screen.getByRole("button", { name: /Simpan Nilai/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(onScoreSaved).toHaveBeenCalledWith(
          "sess-1",
          "q-essay-1",
          9.0,
          9.0
        );
      });
    });
  });

  describe("Komponen ManualEvaluationView", () => {
    it("menampilkan empty state jika tidak ada butir soal isian", () => {
      render(
        <ManualEvaluationView
          exam={mockExam}
          questions={[]}
          initialSubmissions={[]}
        />
      );

      expect(screen.getByText(/Tidak Ada Butir Soal Isian Singkat \/ Esai/i)).toBeInTheDocument();
    });

    it("memfilter daftar jawaban berdasarkan pencarian nama peserta", () => {
      render(
        <ManualEvaluationView
          exam={mockExam}
          questions={mockQuestions}
          initialSubmissions={mockSubmissions}
        />
      );

      expect(screen.getByText("Budi Santoso")).toBeInTheDocument();
      expect(screen.getByText("Siti Rahma")).toBeInTheDocument();

      const searchInput = screen.getByLabelText(/Cari nama peserta/i);
      fireEvent.change(searchInput, { target: { value: "Siti" } });

      expect(screen.queryByText("Budi Santoso")).not.toBeInTheDocument();
      expect(screen.getByText("Siti Rahma")).toBeInTheDocument();
    });

    it("memfilter daftar jawaban berdasarkan status penilaian (Sudah / Belum)", () => {
      render(
        <ManualEvaluationView
          exam={mockExam}
          questions={mockQuestions}
          initialSubmissions={mockSubmissions}
        />
      );

      const unEvaluatedBtn = screen.getByRole("button", { name: /Belum Dinilai/i });
      fireEvent.click(unEvaluatedBtn);

      // Budi belum dinilai (awardedScore: null), Siti sudah (8.5)
      expect(screen.getByText("Budi Santoso")).toBeInTheDocument();
      expect(screen.queryByText("Siti Rahma")).not.toBeInTheDocument();

      const evaluatedBtn = screen.getByRole("button", { name: /Sudah Dinilai/i });
      fireEvent.click(evaluatedBtn);

      expect(screen.queryByText("Budi Santoso")).not.toBeInTheDocument();
      expect(screen.getByText("Siti Rahma")).toBeInTheDocument();
    });
  });
});

