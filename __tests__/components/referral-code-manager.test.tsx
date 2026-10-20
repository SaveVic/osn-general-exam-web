import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ReferralCodeManager } from "@/components/admin/referral-codes/referral-code-manager";
import type { ExamRow, ReferralCodeRow } from "@/types/database";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock child components to isolate ReferralCodeManager top box testing
vi.mock("@/components/admin/referral-codes/referral-code-form", () => ({
  ReferralCodeForm: () => <div data-testid="mock-referral-form" />,
}));

vi.mock("@/components/admin/referral-codes/referral-code-list", () => ({
  ReferralCodeList: () => <div data-testid="mock-referral-list" />,
}));

const mockExam: ExamRow = {
  id: "exam-test-1",
  title: "Simulasi OSN Komputer 2026",
  description: "Deskripsi simulasi ujian komputer.",
  duration_minutes: 120,
  starts_at: "2026-10-20T08:00:00.000Z",
  ends_at: "2026-10-20T17:00:00.000Z",
  class_options: ["X-1", "X-2"],
  is_published: true,
  created_at: "2026-10-20T00:00:00.000Z",
  updated_at: "2026-10-20T00:00:00.000Z",
};

const mockCodes: ReferralCodeRow[] = [
  {
    id: "ref-1",
    exam_id: "exam-test-1",
    code: "KOMP26-A1",
    is_active: true,
    max_uses: 50,
    current_uses: 12,
    expires_at: null,
    created_at: "2026-10-20T00:00:00.000Z",
  },
  {
    id: "ref-2",
    exam_id: "exam-test-1",
    code: "KOMP26-B2",
    is_active: false,
    max_uses: null,
    current_uses: 8,
    expires_at: null,
    created_at: "2026-10-20T00:00:00.000Z",
  },
];

describe("ReferralCodeManager Component", () => {
  it("hanya menampilkan title 'Kode Rujukan', nama ujian, total kode, kode aktif, dan total penggunaan sesi pada content box atas", () => {
    render(<ReferralCodeManager exam={mockExam} codes={mockCodes} />);

    // Memverifikasi title "Kode Rujukan" dan nama ujian
    expect(screen.getByText("Kode Rujukan")).toBeInTheDocument();
    expect(screen.getByText("Simulasi OSN Komputer 2026")).toBeInTheDocument();

    // Memverifikasi metrik: total kode, kode aktif, total penggunaan sesi
    expect(screen.getByText("Total Kode")).toBeInTheDocument();
    expect(screen.getByText("2 Kode")).toBeInTheDocument();

    expect(screen.getByText("Kode Aktif")).toBeInTheDocument();
    expect(screen.getByText("1 Aktif")).toBeInTheDocument();

    expect(screen.getByText("Total Penggunaan Sesi")).toBeInTheDocument();
    expect(screen.getByText("20 Sesi")).toBeInTheDocument();

    // Komponen lain harus sudah terhapus dari box atas
    expect(screen.queryByText("Dipublikasikan")).not.toBeInTheDocument();
    expect(screen.queryByText("Draf")).not.toBeInTheDocument();
    expect(screen.queryByText(/Bagikan kode rujukan kepada peserta ujian/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Bank Soal/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Pengaturan/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Pilihan Kelas")).not.toBeInTheDocument();
  });
});

