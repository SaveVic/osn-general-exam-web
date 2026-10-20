import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ExamRoomShell } from "@/components/exam-room/exam-room-shell";
import { QuestionCard } from "@/components/exam-room/question-card";
import { QuestionPaletteGrid } from "@/components/exam-room/palette/question-palette-grid";
import { ShortAnswerInput } from "@/components/exam-room/answers/short-answer-input";
import { useExamSessionStore } from "@/lib/stores/exam-session-store";
import type { ClientQuestionItem, RecoverExamSessionData } from "@/actions/exam-session";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

const mockQuestions: ClientQuestionItem[] = [
  {
    id: "q-single",
    exam_id: "exam-1",
    order_index: 1,
    question_type: "single_choice",
    prompt: "Berapakah $1 + 1$?",
    points: 2,
    options: [
      { id: "A", text: "1" },
      { id: "B", text: "2" },
    ],
  },
  {
    id: "q-multi",
    exam_id: "exam-1",
    order_index: 2,
    question_type: "multiple_choice",
    prompt: "Pilihlah bilangan prima:",
    points: 3,
    options: [
      { id: "A", text: "2" },
      { id: "B", text: "3" },
      { id: "C", text: "4" },
    ],
  },
  {
    id: "q-short",
    exam_id: "exam-1",
    order_index: 3,
    question_type: "short_answer",
    prompt: "Ibukota Indonesia adalah...",
    points: 5,
    options: [],
  },
];

const mockRecoveryData: RecoverExamSessionData = {
  sessionId: "session-test-1",
  examId: "exam-1",
  examTitle: "Simulasi Ujian Sains 2026",
  durationMinutes: 60,
  startedAt: new Date().toISOString(),
  serverEndTime: new Date(Date.now() + 3600000).toISOString(),
  serverTime: new Date().toISOString(),
  studentName: "Budi Santoso",
  studentClass: "XII MIPA 1",
  questions: mockQuestions,
  recoveredAnswersMap: {
    "q-single": { selected: "B" },
    "q-multi": null,
    "q-short": null,
  },
  recoveredFlaggedMap: {},
  lastSyncedAt: null,
};

describe("Exam Room UI Adjustments (/ujian/[id])", () => {
  beforeEach(() => {
    useExamSessionStore.getState().recoverSession(mockRecoveryData);
  });

  it("pada top bar, menghapus 'Sesi Aktif' dan memindahkan sisa waktu ke atas palet kisi nomor soal yang bersifat sticky", () => {
    const { container } = render(<ExamRoomShell sessionId="session-test-1" initialRecoveryData={mockRecoveryData} />);

    // Memverifikasi teks 'Sesi Aktif' tidak lagi dirender
    expect(screen.queryByText("Sesi Aktif")).not.toBeInTheDocument();

    // Memverifikasi Sisa Waktu Ujian tetap ada di dalam DOM
    const timer = screen.getByLabelText("Sisa Waktu Ujian");
    expect(timer).toBeInTheDocument();

    // Timer harus berada dalam wrapper yang berdampingan dengan palet navigasi
    const palette = screen.getByLabelText("Palet Navigasi Soal");
    expect(palette).toBeInTheDocument();

    // Kolom palet memiliki konfigurasi sticky desktop
    const stickySidebar = container.querySelector(".lg\\:sticky");
    expect(stickySidebar).toBeInTheDocument();
    expect(stickySidebar?.className).toContain("lg:top-20");
    expect(stickySidebar?.className).toContain("lg:self-start");
  });

  it("pada palet kisi nomor soal, indikator aktif memiliki padding dan kelas ring yang rapi tanpa scale overflow", () => {
    render(
      <QuestionPaletteGrid
        questions={mockQuestions}
        currentIndex={0}
        answersMap={{}}
        flaggedMap={{}}
        onSelectIndex={vi.fn()}
      />
    );

    const grid = screen.getByRole("grid");
    expect(grid.className).toContain("p-1.5");

    const activeButton = screen.getByRole("gridcell", { name: /Soal nomor 1.*sedang aktif/i });
    expect(activeButton.className).toContain("ring-2");
    expect(activeButton.className).not.toContain("scale-105");
  });

  it("pada tipe pilihan ganda, menampilkan label 'Jawaban' serta info 'Anda dapat memilih salah satu jawaban'", () => {
    render(
      <QuestionCard
        question={mockQuestions[0]}
        questionNumber={1}
        totalQuestions={3}
        isFlagged={false}
      />
    );

    expect(screen.getByText("Jawaban")).toBeInTheDocument();
    expect(screen.getByText("Anda dapat memilih salah satu jawaban")).toBeInTheDocument();
  });

  it("pada tipe pilihan jamak, menampilkan label 'Jawaban' serta info 'Anda dapat memilih satu atau lebih jawaban'", () => {
    render(
      <QuestionCard
        question={mockQuestions[1]}
        questionNumber={2}
        totalQuestions={3}
        isFlagged={false}
      />
    );

    expect(screen.getByText("Jawaban")).toBeInTheDocument();
    expect(screen.getByText("Anda dapat memilih satu atau lebih jawaban")).toBeInTheDocument();
  });

  it("pada tipe isian singkat, tidak menampilkan box terluar dan menampilkan input field serta text status diisi/belum", () => {
    const { rerender } = render(
      <ShortAnswerInput
        questionId="q-short"
        currentText=""
        onChangeText={vi.fn()}
        onClearText={vi.fn()}
      />
    );

    // Memverifikasi teks status belum diisi
    expect(screen.getByText("Belum diisi")).toBeInTheDocument();
    expect(screen.queryByText(/Kolom Jawaban Isian Singkat/i)).not.toBeInTheDocument();

    // Saat diisi
    rerender(
      <ShortAnswerInput
        questionId="q-short"
        currentText="Nusantara"
        onChangeText={vi.fn()}
        onClearText={vi.fn()}
      />
    );

    expect(screen.getByText("Sudah diisi")).toBeInTheDocument();
  });
});

