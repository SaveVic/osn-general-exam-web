import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuestionBankManager } from "@/components/admin/questions/question-bank-manager";
import { QuestionEditor } from "@/components/admin/questions/question-editor";
import type { ExamRow, QuestionRow } from "@/types/database";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/actions/questions", () => ({
  createQuestionAction: vi.fn(async () => ({ success: true })),
  updateQuestionAction: vi.fn(async () => ({ success: true })),
  deleteQuestionAction: vi.fn(async () => ({ success: true })),
  reorderQuestionsAction: vi.fn(async () => ({ success: true })),
}));

vi.mock("@/actions/storage", () => ({
  uploadExamAssetAction: vi.fn(async () => ({ success: true })),
  listExamAssetsAction: vi.fn(async () => ({ success: true, data: [] })),
}));

const mockExam: ExamRow = {
  id: "exam-99",
  title: "Simulasi OSN Matematika 2026",
  description: "Petunjuk pengerjaan yang tidak perlu tampil di header box",
  duration_minutes: 90,
  starts_at: "2026-10-25T08:00:00.000Z",
  ends_at: "2026-10-25T09:30:00.000Z",
  class_options: ["10-A", "10-B"],
  is_published: true,
  created_at: "2026-10-20T00:00:00.000Z",
  updated_at: "2026-10-20T00:00:00.000Z",
};

const mockQuestions: QuestionRow[] = [
  {
    id: "q-1",
    exam_id: "exam-99",
    order_index: 1,
    question_type: "single_choice",
    prompt: "Berapakah $2 + 2$?",
    points: 4,
    options: [
      { id: "A", text: "3" },
      { id: "B", text: "4" },
    ],
    correct_answer: { selected: "B" },
    created_at: "2026-10-20T00:00:00.000Z",
  },
];

describe("QuestionBankManager Component", () => {
  it("hanya menampilkan title 'Bank Soal Ujian', nama ujian, total soal, total skor, dan durasi pada content box atas", () => {
    render(<QuestionBankManager exam={mockExam} questions={mockQuestions} />);

    // Memverifikasi title "Bank Soal Ujian" dan nama ujian
    expect(screen.getByText("Bank Soal Ujian")).toBeInTheDocument();
    expect(screen.getByText("Simulasi OSN Matematika 2026")).toBeInTheDocument();

    // Memverifikasi metrik: total soal, total skor, dan durasi
    expect(screen.getByText("Total Soal")).toBeInTheDocument();
    expect(screen.getByText("1 Soal")).toBeInTheDocument();

    expect(screen.getByText("Total Skor")).toBeInTheDocument();
    expect(screen.getAllByText("4 Poin").length).toBeGreaterThanOrEqual(1);

    expect(screen.getByText("Durasi")).toBeInTheDocument();
    expect(screen.getByText("90 Menit")).toBeInTheDocument();

    // Komponen lain harus sudah terhapus
    expect(screen.queryByText("Dipublikasikan")).not.toBeInTheDocument();
    expect(screen.queryByText("Draf")).not.toBeInTheDocument();
    expect(screen.queryByText("Pengaturan Naskah")).not.toBeInTheDocument();
    expect(screen.queryByText("Opsi Kelas")).not.toBeInTheDocument();
    expect(screen.queryByText("Petunjuk pengerjaan yang tidak perlu tampil di header box")).not.toBeInTheDocument();
  });
});

describe("QuestionEditor Component", () => {
  it("merender title 'Tambah Soal' tanpa caption pada mode buat baru", () => {
    render(
      <QuestionEditor
        examId="exam-99"
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByRole("heading", { level: 2, name: "Tambah Soal" })).toBeInTheDocument();
    expect(screen.queryByText(/Gunakan format Markdown untuk teks/i)).not.toBeInTheDocument();
  });

  it("merender title 'Edit Soal #1' tanpa caption pada mode edit", () => {
    render(
      <QuestionEditor
        examId="exam-99"
        initialQuestion={mockQuestions[0]}
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByRole("heading", { level: 2, name: "Edit Soal #1" })).toBeInTheDocument();
    expect(screen.queryByText(/Gunakan format Markdown untuk teks/i)).not.toBeInTheDocument();
  });

  it("memiliki cursor-pointer pada tombol tipe pertanyaan", () => {
    render(
      <QuestionEditor
        examId="exam-99"
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const singleChoiceBtn = screen.getByRole("button", { name: /Pilihan Ganda/i });
    const multiChoiceBtn = screen.getByRole("button", { name: /Pilihan Jamak/i });
    const shortAnswerBtn = screen.getByRole("button", { name: /Isian Singkat/i });

    expect(singleChoiceBtn).toHaveClass("cursor-pointer");
    expect(multiChoiceBtn).toHaveClass("cursor-pointer");
    expect(shortAnswerBtn).toHaveClass("cursor-pointer");
  });

  it("menampilkan label 'Deskripsi Soal' tanpa caption di sampingnya", () => {
    render(
      <QuestionEditor
        examId="exam-99"
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText(/^Deskripsi Soal/)).toBeInTheDocument();
    expect(screen.queryByText(/Gunakan \$\.\.\.\$ untuk rumus inline/i)).not.toBeInTheDocument();
  });

  it("menampilkan title 'Pilihan Jawaban' tanpa caption dan tombol tambah opsi hanya ikon '+'", () => {
    render(
      <QuestionEditor
        examId="exam-99"
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText("Pilihan Jawaban")).toBeInTheDocument();
    expect(screen.queryByText(/Pilih radio button pada opsi yang menjadi kunci/i)).not.toBeInTheDocument();

    const addOptionBtn = screen.getByRole("button", { name: /Tambah Opsi/i });
    expect(addOptionBtn).toHaveClass("cursor-pointer");
    // Tombol tidak memiliki child teks
    expect(addOptionBtn.textContent?.trim()).toBe("");
  });

  it("pada pratinjau soal, menghapus label skor di samping title dan menggunakan badge 'BENAR' bukannya 'KUNCI'", () => {
    render(
      <QuestionEditor
        examId="exam-99"
        initialQuestion={mockQuestions[0]}
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText("Pratinjau Tampilan Peserta")).toBeInTheDocument();
    // Tidak ada label skor badge di samping judul pratinjau
    expect(screen.queryByText("4 Poin")).not.toBeInTheDocument();

    // Term kunci diganti menjadi BENAR
    expect(screen.getByText("BENAR")).toBeInTheDocument();
    expect(screen.queryByText("KUNCI")).not.toBeInTheDocument();
  });
});
