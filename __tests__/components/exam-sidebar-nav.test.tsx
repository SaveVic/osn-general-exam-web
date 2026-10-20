import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ExamSidebarNav } from "@/components/admin/exam-sidebar-nav";

const mockUsePathname = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe("ExamSidebarNav Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue("/admin/ujian/exam-123/pengaturan");
  });

  it("merender seluruh 6 menu navigasi ujian dengan tautan href yang benar", () => {
    render(<ExamSidebarNav examId="exam-123" />);

    const pengaturanLink = screen.getByRole("link", { name: /Pengaturan Naskah/i });
    const bankSoalLink = screen.getByRole("link", { name: /Bank Soal/i });
    const kodeRujukanLink = screen.getByRole("link", { name: /Kode Rujukan/i });
    const penilaianLink = screen.getByRole("link", { name: /Penilaian Manual/i });
    const laporanLink = screen.getByRole("link", { name: /Laporan Nilai/i });
    const pemantauanLink = screen.getByRole("link", { name: /Pemantauan Sesi/i });

    expect(pengaturanLink).toHaveAttribute("href", "/admin/ujian/exam-123/pengaturan");
    expect(bankSoalLink).toHaveAttribute("href", "/admin/ujian/exam-123/soal");
    expect(kodeRujukanLink).toHaveAttribute("href", "/admin/ujian/exam-123/kode-rujukan");
    expect(penilaianLink).toHaveAttribute("href", "/admin/ujian/exam-123/penilaian");
    expect(laporanLink).toHaveAttribute("href", "/admin/ujian/exam-123/laporan");
    expect(pemantauanLink).toHaveAttribute("href", "/admin/ujian/exam-123/pemantauan");
  });

  it("memberikan penanda highlight (aria-current='page' & active style) pada menu yang sedang aktif", () => {
    mockUsePathname.mockReturnValue("/admin/ujian/exam-123/soal");

    render(<ExamSidebarNav examId="exam-123" />);

    const bankSoalLink = screen.getByRole("link", { name: /Bank Soal/i });
    const pengaturanLink = screen.getByRole("link", { name: /Pengaturan Naskah/i });

    // Menu Bank Soal harus aktif
    expect(bankSoalLink).toHaveAttribute("aria-current", "page");
    expect(bankSoalLink.className).toContain("bg-indigo-50");
    expect(bankSoalLink.className).toContain("text-indigo-700");

    // Menu lain tidak aktif
    expect(pengaturanLink).not.toHaveAttribute("aria-current");
    expect(pengaturanLink.className).toContain("text-slate-600");
  });

  it("merender tombol kalkulasi ulang nilai di bawah menu navigasi", () => {
    render(<ExamSidebarNav examId="exam-123" />);

    const recalcBtn = screen.getByRole("button", { name: /Kalkulasi Ulang Nilai Ujian/i });
    expect(recalcBtn).toBeInTheDocument();
  });
});
