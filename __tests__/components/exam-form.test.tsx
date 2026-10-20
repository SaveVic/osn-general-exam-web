import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ExamForm } from "@/components/admin/exam-form";
import type { ExamRow } from "@/types/database";

vi.mock("@/actions/exams", () => ({
  createExamAction: vi.fn(async () => ({ success: true })),
  updateExamAction: vi.fn(async () => ({ success: true })),
}));

const mockExam: ExamRow = {
  id: "exam-test-1",
  title: "Simulasi OSN Fisika 2026",
  description: "## Petunjuk Penting\nKerjakan soal dengan teliti.",
  duration_minutes: 120,
  starts_at: "2026-10-25T08:00:00.000Z",
  ends_at: "2026-10-25T11:00:00.000Z",
  class_options: ["11-IPA-1", "11-IPA-2"],
  is_published: true,
  created_at: "2026-10-20T00:00:00.000Z",
  updated_at: "2026-10-20T00:00:00.000Z",
};

describe("ExamForm Component with Description Live Preview", () => {
  it("merender box input dan box preview tampilan deskripsi secara berdampingan tanpa judul 'Metadata & Konfigurasi Naskah'", () => {
    render(<ExamForm initialData={mockExam} mode="edit" showPreview={true} />);

    // Tidak boleh ada judul lama "Metadata & Konfigurasi Naskah"
    expect(screen.queryByText("Metadata & Konfigurasi Naskah")).not.toBeInTheDocument();

    // Box preview harus muncul di sebelah kanan
    expect(screen.getByText("Preview Petunjuk Teknis")).toBeInTheDocument();
    expect(screen.getByText("Kerjakan soal dengan teliti.")).toBeInTheDocument();

    // Field Durasi dan Kelas harus tersedia
    const durationInput = screen.getByLabelText(/Durasi \(Menit\)/i);
    expect(durationInput).toHaveValue(120);
    expect(screen.getByText("Daftar Pilihan Kelas")).toBeInTheDocument();
    expect(screen.getByText("11-IPA-1")).toBeInTheDocument();
  });

  it("memperbarui tampilan preview deskripsi secara real-time saat pengguna mengetik di textarea", () => {
    render(<ExamForm initialData={mockExam} mode="edit" showPreview={true} />);

    const textarea = screen.getByLabelText(/Petunjuk Teknis \/ Deskripsi Pengerjaan/i);
    fireEvent.change(textarea, {
      target: { value: "### Aturan Tambahan\nDilarang menggunakan kalkulator." },
    });

    // Preview harus langsung memperbarui konten
    expect(screen.getByText("Aturan Tambahan")).toBeInTheDocument();
    expect(screen.getByText("Dilarang menggunakan kalkulator.")).toBeInTheDocument();
  });

  it("menampilkan placeholder kosong yang informatif ketika deskripsi dikosongkan", () => {
    render(
      <ExamForm
        initialData={{ ...mockExam, description: null }}
        mode="edit"
        showPreview={true}
      />
    );

    expect(screen.getByText("Belum ada petunjuk teknis.")).toBeInTheDocument();
  });
});

