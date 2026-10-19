import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ExamTimer } from "@/components/exam-room/exam-timer";
import { SingleChoiceInput } from "@/components/exam-room/answers/single-choice-input";
import { MultipleChoiceInput } from "@/components/exam-room/answers/multiple-choice-input";
import { ShortAnswerInput } from "@/components/exam-room/answers/short-answer-input";
import { QuestionPaletteGrid } from "@/components/exam-room/palette/question-palette-grid";
import { QuestionPaletteLegend } from "@/components/exam-room/palette/question-palette-legend";
import { BottomNavigationBar } from "@/components/exam-room/bottom-navigation-bar";
import { FinishExamDialog } from "@/components/exam-room/finish-exam-dialog";
import type { ClientQuestionItem } from "@/actions/exam-session";

describe("F3-02: Komponen Penghitung Waktu Riil (ExamTimer)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("menampilkan sisa waktu format HH:MM:SS, indikator kritis, dan memicu onExpire tepat sekali saat habis", () => {
    const now = new Date("2026-10-20T08:00:00.000Z");
    vi.setSystemTime(now);

    const onExpire = vi.fn();
    // Sisa 65 detik (masuk zona peringatan <= 300 detik)
    const serverEndTime = new Date(now.getTime() + 65 * 1000).toISOString();

    render(<ExamTimer serverEndTime={serverEndTime} onExpire={onExpire} />);

    expect(screen.getByText("00:01:05")).toBeInTheDocument();
    const timerBox = screen.getByLabelText("Sisa Waktu Ujian");
    expect(timerBox.className).toContain("border-amber-300");

    // Majukan 5 detik (masuk zona kritis <= 60 detik)
    act(() => {
      vi.advanceTimersByTime(5 * 1000);
    });

    expect(screen.getByText("00:01:00")).toBeInTheDocument();
    expect(timerBox.className).toContain("animate-pulse");

    // Majukan 60 detik hingga waktu habis
    act(() => {
      vi.advanceTimersByTime(60 * 1000);
    });

    expect(screen.getByText("00:00:00")).toBeInTheDocument();
    expect(onExpire).toHaveBeenCalledTimes(1);

    // Majukan lagi 5 detik untuk memastikan onExpire tidak dipanggil berulang kali
    act(() => {
      vi.advanceTimersByTime(5 * 1000);
    });
    expect(onExpire).toHaveBeenCalledTimes(1);
  });
});

describe("F3-02: Komponen Input Opsi Jawaban Interaktif (SingleChoice, MultipleChoice, ShortAnswer)", () => {
  const sampleOptions = [
    { id: "A", text: "Opsi Pertama" },
    { id: "B", text: "Opsi Kedua" },
    { id: "C", text: "Opsi Ketiga" },
  ];

  it("SingleChoiceInput memilih opsi radio dan menampilkan tombol Hapus Pilihan Jawaban", () => {
    const onSelect = vi.fn();
    const onClear = vi.fn();

    const { rerender } = render(
      <SingleChoiceInput
        questionId="q1"
        options={sampleOptions}
        selectedOptionId={null}
        onSelectOption={onSelect}
        onClearOption={onClear}
      />
    );

    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(3);
    fireEvent.click(radios[1]); // Klik opsi B
    expect(onSelect).toHaveBeenCalledWith("B");

    rerender(
      <SingleChoiceInput
        questionId="q1"
        options={sampleOptions}
        selectedOptionId="B"
        onSelectOption={onSelect}
        onClearOption={onClear}
      />
    );

    expect(radios[1]).toHaveAttribute("aria-checked", "true");
    const clearBtn = screen.getByRole("button", {
      name: /Hapus Pilihan Jawaban/i,
    });
    fireEvent.click(clearBtn);
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("MultipleChoiceInput mendukung multi-seleksi checkbox dan menghapus seluruh pilihan", () => {
    const onToggle = vi.fn();
    const onClear = vi.fn();

    render(
      <MultipleChoiceInput
        questionId="q2"
        options={sampleOptions}
        selectedOptionIds={["A", "C"]}
        onToggleOption={onToggle}
        onClearOptions={onClear}
      />
    );

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes[0]).toHaveAttribute("aria-checked", "true");
    expect(checkboxes[1]).toHaveAttribute("aria-checked", "false");
    expect(checkboxes[2]).toHaveAttribute("aria-checked", "true");

    fireEvent.click(checkboxes[1]);
    expect(onToggle).toHaveBeenCalledWith("B");

    const clearAllBtn = screen.getByRole("button", {
      name: /Hapus Semua Pilihan \(2 Terpilih\)/i,
    });
    fireEvent.click(clearAllBtn);
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("ShortAnswerInput memperbarui teks isian dan menampilkan badge Tersimpan di perangkat", () => {
    const onChangeText = vi.fn();
    const onClearText = vi.fn();

    render(
      <ShortAnswerInput
        questionId="q3"
        currentText=""
        onChangeText={onChangeText}
        onClearText={onClearText}
      />
    );

    expect(
      screen.getByText(/Belum ada jawaban yang diisi/i)
    ).toBeInTheDocument();

    const input = screen.getByPlaceholderText(
      /Ketik jawaban akhir Anda di sini/i
    );
    fireEvent.change(input, { target: { value: "1024" } });

    expect(onChangeText).toHaveBeenCalledWith("1024");
    expect(screen.getByText(/Tersimpan di perangkat/i)).toBeInTheDocument();

    const clearBtn = screen.getByRole("button", { name: /Hapus Jawaban/i });
    fireEvent.click(clearBtn);
    expect(onClearText).toHaveBeenCalledTimes(1);
  });
});

describe("F3-03: Palet Navigasi Nomor Soal & Legenda Status (QuestionPaletteGrid & Legend)", () => {
  const paletteQuestions: ClientQuestionItem[] = [
    {
      id: "q1",
      exam_id: "e1",
      order_index: 1,
      question_type: "single_choice",
      prompt: "S1",
      options: [],
      points: 1,
    },
    {
      id: "q2",
      exam_id: "e1",
      order_index: 2,
      question_type: "single_choice",
      prompt: "S2",
      options: [],
      points: 1,
    },
    {
      id: "q3",
      exam_id: "e1",
      order_index: 3,
      question_type: "short_answer",
      prompt: "S3",
      options: [],
      points: 1,
    },
  ];

  it("merender 4 status warna pada tombol kisi soal dan melakukan lompatan instan saat diklik", () => {
    const onSelectIndex = vi.fn();
    const onItemClick = vi.fn();

    render(
      <>
        <QuestionPaletteGrid
          questions={paletteQuestions}
          currentIndex={0}
          answersMap={{ q1: { selected: "A" } }}
          flaggedMap={{ q2: true }}
          onSelectIndex={onSelectIndex}
          onItemClick={onItemClick}
        />
        <QuestionPaletteLegend
          totalQuestions={3}
          answeredCount={1}
          unansweredCount={2}
          flaggedCount={1}
        />
      </>
    );

    // Soal 1: Sudah Dijawab & Sedang Aktif
    const btn1 = screen.getByRole("gridcell", {
      name: /Soal nomor 1, Sudah Dijawab, sedang aktif/i,
    });
    expect(btn1).toHaveAttribute("aria-current", "true");
    expect(btn1.className).toContain("bg-indigo-600");

    // Soal 2: Ragu-ragu (Kosong) -> warna amber
    const btn2 = screen.getByRole("gridcell", {
      name: /Soal nomor 2, Ragu-ragu \(Kosong\)/i,
    });
    expect(btn2.className).toContain("bg-amber-500");

    // Soal 3: Belum Dijawab
    const btn3 = screen.getByRole("gridcell", {
      name: /Soal nomor 3, Belum Dijawab/i,
    });
    fireEvent.click(btn3);
    expect(onSelectIndex).toHaveBeenCalledWith(2);
    expect(onItemClick).toHaveBeenCalledTimes(1);

    // Verifikasi keterangan legenda
    expect(screen.getByText(/Keterangan Status \(3 Soal\)/i)).toBeInTheDocument();
  });
});

describe("F3-02 & F3-03: Bilah Navigasi Bawah & Dialog Penyelesaian Ujian", () => {
  it("BottomNavigationBar menonaktifkan Soal Sebelumnya di indeks 0 dan menampilkan Selesaikan Ujian di indeks terakhir", () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    const onToggleFlag = vi.fn();
    const onRequestFinish = vi.fn();

    const { rerender } = render(
      <BottomNavigationBar
        currentIndex={0}
        totalQuestions={2}
        isFlagged={false}
        onPrev={onPrev}
        onNext={onNext}
        onToggleFlag={onToggleFlag}
        onRequestFinish={onRequestFinish}
      />
    );

    const prevBtn = screen.getByRole("button", { name: /Soal Sebelumnya/i });
    expect(prevBtn).toBeDisabled();

    const nextBtn = screen.getByRole("button", { name: /Soal Selanjutnya/i });
    fireEvent.click(nextBtn);
    expect(onNext).toHaveBeenCalledTimes(1);

    // Rerender di soal terakhir (indeks 1 dari 2) dengan status ragu-ragu aktif
    rerender(
      <BottomNavigationBar
        currentIndex={1}
        totalQuestions={2}
        isFlagged={true}
        onPrev={onPrev}
        onNext={onNext}
        onToggleFlag={onToggleFlag}
        onRequestFinish={onRequestFinish}
      />
    );

    expect(
      screen.getByRole("button", { name: /Ragu-ragu \(Aktif\)/i })
    ).toBeInTheDocument();

    const finishBtn = screen.getByRole("button", {
      name: /Selesaikan Ujian/i,
    });
    fireEvent.click(finishBtn);
    expect(onRequestFinish).toHaveBeenCalledTimes(1);
  });

  it("FinishExamDialog menampilkan peringatan jika masih ada soal kosong atau ragu-ragu", () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <FinishExamDialog
        open={true}
        onOpenChange={onOpenChange}
        totalQuestions={10}
        answeredCount={8}
        unansweredCount={2}
        flaggedCount={1}
        onConfirmSubmit={onConfirm}
      />
    );

    expect(
      screen.getByText(/Konfirmasi Pengumpulan Ujian/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Masih terdapat 2 butir belum dijawab dan 1 butir bertanda ragu-ragu/i)
    ).toBeInTheDocument();

    const submitBtn = screen.getByRole("button", {
      name: /Ya, Kumpulkan Sekarang/i,
    });
    fireEvent.click(submitBtn);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

