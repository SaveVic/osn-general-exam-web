import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DataTablePagination } from "@/components/admin/data-table-pagination";
import { ExamReportView } from "@/components/admin/reports/exam-report-view";
import { SessionMonitoringView } from "@/components/admin/monitoring/session-monitoring-view";
import type { ExamReportSessionRow } from "@/lib/exam/report-csv";
import type { MonitoredSessionRow } from "@/actions/session-monitoring";
import type { ExamRow } from "@/types/database";

// Mock Supabase admin/client
vi.mock("@/lib/supabase/admin", () => ({
  createServiceClient: vi.fn(() => ({
    from: vi.fn(),
  })),
}));

// Mock exam report server action
vi.mock("@/actions/exam-report", () => ({
  getExamFullAnswersReportAction: vi.fn(),
  getSessionAnswerDetailsAction: vi.fn(),
}));

// Mock session monitoring server action
vi.mock("@/actions/session-monitoring", () => ({
  getExamMonitoringData: vi.fn(),
  forceSubmitSessionAction: vi.fn(),
  deleteExamSessionAction: vi.fn(),
}));

const mockExam: ExamRow = {
  id: "exam-paginated-1",
  title: "Simulasi Ujian Nasional",
  description: "Ujian untuk pengujian paginasi",
  duration_minutes: 90,
  starts_at: "2026-10-21T08:00:00Z",
  ends_at: "2026-10-21T12:00:00Z",
  class_options: ["10-MIPA-1", "10-MIPA-2"],
  is_published: true,
  created_at: "2026-10-20T00:00:00Z",
  updated_at: "2026-10-20T00:00:00Z",
};

describe("Fitur Paginasi Tabel Admin (DataTablePagination)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Komponen DataTablePagination", () => {
    it("merender informasi rentang data, nomor halaman, dan dropdown ukuran baris", () => {
      const mockPageChange = vi.fn();
      const mockPageSizeChange = vi.fn();

      render(
        <DataTablePagination
          currentPage={1}
          totalPages={4}
          pageSize={25}
          totalItems={95}
          onPageChange={mockPageChange}
          onPageSizeChange={mockPageSizeChange}
        />
      );

      expect(screen.getByTestId("pagination-range-info")).toHaveTextContent("Menampilkan 1–25 dari 95 data");
      expect(screen.getByTestId("pagination-page-info")).toHaveTextContent("Halaman 1 dari 4");

      // Tombol pertama dan sebelumnya harus dinonaktifkan di halaman 1
      const firstBtn = screen.getByRole("button", { name: /Ke halaman pertama/i });
      const prevBtn = screen.getByRole("button", { name: /Ke halaman sebelumnya/i });
      const nextBtn = screen.getByRole("button", { name: /Ke halaman berikutnya/i });
      const lastBtn = screen.getByRole("button", { name: /Ke halaman terakhir/i });

      expect(firstBtn).toBeDisabled();
      expect(prevBtn).toBeDisabled();
      expect(nextBtn).toBeEnabled();
      expect(lastBtn).toBeEnabled();
    });

    it("memanggil onPageChange saat tombol navigasi diklik", () => {
      const mockPageChange = vi.fn();
      const mockPageSizeChange = vi.fn();

      render(
        <DataTablePagination
          currentPage={2}
          totalPages={4}
          pageSize={25}
          totalItems={95}
          onPageChange={mockPageChange}
          onPageSizeChange={mockPageSizeChange}
        />
      );

      const nextBtn = screen.getByRole("button", { name: /Ke halaman berikutnya/i });
      fireEvent.click(nextBtn);
      expect(mockPageChange).toHaveBeenCalledWith(3);

      const prevBtn = screen.getByRole("button", { name: /Ke halaman sebelumnya/i });
      fireEvent.click(prevBtn);
      expect(mockPageChange).toHaveBeenCalledWith(1);

      const lastBtn = screen.getByRole("button", { name: /Ke halaman terakhir/i });
      fireEvent.click(lastBtn);
      expect(mockPageChange).toHaveBeenCalledWith(4);

      const firstBtn = screen.getByRole("button", { name: /Ke halaman pertama/i });
      fireEvent.click(firstBtn);
      expect(mockPageChange).toHaveBeenCalledWith(1);
    });

    it("memanggil onPageSizeChange saat opsi jumlah baris diubah", () => {
      const mockPageChange = vi.fn();
      const mockPageSizeChange = vi.fn();

      render(
        <DataTablePagination
          currentPage={1}
          totalPages={4}
          pageSize={25}
          totalItems={95}
          onPageChange={mockPageChange}
          onPageSizeChange={mockPageSizeChange}
        />
      );

      const select = screen.getByRole("combobox", { name: /Pilih jumlah baris/i });
      fireEvent.change(select, { target: { value: "50" } });
      expect(mockPageSizeChange).toHaveBeenCalledWith(50);
    });
  });

  describe("Paginasi pada ExamReportView (/admin/ujian/[id]/laporan)", () => {
    // Buat 60 baris data dummy
    const mockSessions: ExamReportSessionRow[] = Array.from({ length: 60 }, (_, i) => ({
      id: `session-${i + 1}`,
      studentName: `Siswa Ke-${String(i + 1).padStart(2, "0")}`,
      studentClass: i % 2 === 0 ? "10-MIPA-1" : "10-MIPA-2",
      startedAt: "2026-10-21T08:00:00.000Z",
      submittedAt: i < 40 ? "2026-10-21T09:15:00.000Z" : null,
      totalScore: i < 40 ? 70 + (i % 30) : 0,
      isCompleted: i < 40,
    }));

    it("merender 25 baris pertama pada halaman 1 dan menyajikan info paginasi akurat", () => {
      render(
        <ExamReportView
          exam={mockExam}
          maxPossibleScore={100}
          sessions={mockSessions}
        />
      );

      // Siswa pertama ada, siswa ke-25 ada, tapi siswa ke-26 tidak dirender di DOM halaman 1
      expect(screen.getByText("Siswa Ke-01")).toBeInTheDocument();
      expect(screen.getByText("Siswa Ke-25")).toBeInTheDocument();
      expect(screen.queryByText("Siswa Ke-26")).not.toBeInTheDocument();

      // Info baris paginasi
      expect(screen.getByTestId("pagination-range-info")).toHaveTextContent("Menampilkan 1–25 dari 60 data");
      expect(screen.getByTestId("pagination-page-info")).toHaveTextContent("Halaman 1 dari 3");
    });

    it("berpindah ke halaman 2 dan melanjutkan penomoran urut (26 s/d 50)", () => {
      render(
        <ExamReportView
          exam={mockExam}
          maxPossibleScore={100}
          sessions={mockSessions}
        />
      );

      const nextBtn = screen.getByRole("button", { name: /Ke halaman berikutnya/i });
      fireEvent.click(nextBtn);

      // Pada halaman 2, Siswa Ke-26 ada dan Siswa Ke-01 tidak ada
      expect(screen.queryByText("Siswa Ke-01")).not.toBeInTheDocument();
      expect(screen.getByText("Siswa Ke-26")).toBeInTheDocument();
      expect(screen.getByText("Siswa Ke-50")).toBeInTheDocument();
      expect(screen.queryByText("Siswa Ke-51")).not.toBeInTheDocument();

      // Indikator halaman
      expect(screen.getByTestId("pagination-range-info")).toHaveTextContent("Menampilkan 26–50 dari 60 data");
      expect(screen.getByTestId("pagination-page-info")).toHaveTextContent("Halaman 2 dari 3");
    });

    it("mengubah ukuran baris per halaman menjadi 50 dan memperbarui total halaman menjadi 2", () => {
      render(
        <ExamReportView
          exam={mockExam}
          maxPossibleScore={100}
          sessions={mockSessions}
        />
      );

      const select = screen.getByRole("combobox", { name: /Pilih jumlah baris/i });
      fireEvent.change(select, { target: { value: "50" } });

      // Menampilkan 50 siswa sekaligus
      expect(screen.getByText("Siswa Ke-01")).toBeInTheDocument();
      expect(screen.getByText("Siswa Ke-50")).toBeInTheDocument();
      expect(screen.queryByText("Siswa Ke-51")).not.toBeInTheDocument();

      expect(screen.getByTestId("pagination-range-info")).toHaveTextContent("Menampilkan 1–50 dari 60 data");
      expect(screen.getByTestId("pagination-page-info")).toHaveTextContent("Halaman 1 dari 2");
    });

    it("me-reset halaman ke 1 saat pencarian nama dilakukan", () => {
      render(
        <ExamReportView
          exam={mockExam}
          maxPossibleScore={100}
          sessions={mockSessions}
        />
      );

      // Navigasi ke halaman 2
      const nextBtn = screen.getByRole("button", { name: /Ke halaman berikutnya/i });
      fireEvent.click(nextBtn);
      expect(screen.getByText("Siswa Ke-26")).toBeInTheDocument();

      // Lakukan pencarian nama
      const searchInput = screen.getByRole("textbox", { name: /Cari nama siswa/i });
      fireEvent.change(searchInput, { target: { value: "Ke-05" } });

      // Halaman harus kembali ke 1 dan menampilkan hasil pencarian
      expect(screen.getByText("Siswa Ke-05")).toBeInTheDocument();
      expect(screen.queryByText("Siswa Ke-26")).not.toBeInTheDocument();
      expect(screen.getByTestId("pagination-range-info")).toHaveTextContent("Menampilkan 1–1 dari 1 data");
      expect(screen.getByTestId("pagination-page-info")).toHaveTextContent("Halaman 1 dari 1");
    });

    it("tetap mengekspor seluruh data yang sesuai filter (bukan hanya halaman aktif) saat tombol ekspor CSV diklik", () => {
      const mockExportCsv = vi.fn();

      render(
        <ExamReportView
          exam={mockExam}
          maxPossibleScore={100}
          sessions={mockSessions}
          onExportCsv={mockExportCsv}
        />
      );

      const exportBtn = screen.getByRole("button", { name: /Ekspor Nilai \(CSV\)/i });
      fireEvent.click(exportBtn);

      expect(mockExportCsv).toHaveBeenCalled();
      const csvContent = mockExportCsv.mock.calls[0][0];

      // Baris pertama dan baris terakhir (ke-60) harus ada dalam CSV meski yang terlihat di layar hanya 25
      expect(csvContent).toContain("Siswa Ke-01");
      expect(csvContent).toContain("Siswa Ke-60");
    });
  });

  describe("Paginasi pada SessionMonitoringView (/admin/ujian/[id]/pemantauan)", () => {
    // Buat 55 data sesi termonitor
    const mockMonitoredSessions: MonitoredSessionRow[] = Array.from(
      { length: 55 },
      (_, i) => ({
        id: `sess-moni-${i + 1}`,
        studentName: `Peserta Sesi-${String(i + 1).padStart(2, "0")}`,
        studentClass: i % 2 === 0 ? "11-MIPA-1" : "11-MIPA-2",
        startedAt: "2026-10-21T08:00:00.000Z",
        submittedAt: i < 25 ? "2026-10-21T09:00:00.000Z" : null,
        isCompleted: i < 25,
        totalScore: i < 25 ? 85 : 0,
        answeredCount: i < 25 ? 20 : 5,
        lastSyncedAt: "2026-10-21T08:30:00.000Z",
      })
    );

    it("merender 25 baris pertama pada halaman 1 dan kartu metrik tetap menghitung seluruh 55 peserta", () => {
      render(
        <SessionMonitoringView
          exam={mockExam}
          totalQuestions={20}
          initialSessions={mockMonitoredSessions}
          initialServerTime="2026-10-21T08:45:00.000Z"
        />
      );

      // Kartu metrik atas menghitung total data: 55 Total, 30 Aktif, 25 Selesai
      expect(screen.getByTestId("metric-total-registered")).toHaveTextContent("55");
      expect(screen.getByTestId("metric-active-sessions")).toHaveTextContent("30");
      expect(screen.getByTestId("metric-completed-sessions")).toHaveTextContent("25");

      // Baris tabel hanya merender 1 s/d 25
      expect(screen.getByText("Peserta Sesi-01")).toBeInTheDocument();
      expect(screen.getByText("Peserta Sesi-25")).toBeInTheDocument();
      expect(screen.queryByText("Peserta Sesi-26")).not.toBeInTheDocument();

      expect(screen.getByTestId("pagination-range-info")).toHaveTextContent("Menampilkan 1–25 dari 55 data");
      expect(screen.getByTestId("pagination-page-info")).toHaveTextContent("Halaman 1 dari 3");
    });

    it("me-reset halaman ke 1 saat tab filter status diganti", () => {
      render(
        <SessionMonitoringView
          exam={mockExam}
          totalQuestions={20}
          initialSessions={mockMonitoredSessions}
          initialServerTime="2026-10-21T08:45:00.000Z"
        />
      );

      // Klik halaman berikutnya
      const nextBtn = screen.getByRole("button", { name: /Ke halaman berikutnya/i });
      fireEvent.click(nextBtn);
      expect(screen.getByText("Peserta Sesi-26")).toBeInTheDocument();

      // Klik tab "Aktif (30)"
      const activeTab = screen.getByRole("button", { name: /^Aktif \(/i });
      fireEvent.click(activeTab);

      // Paginasi harus kembali ke halaman 1
      expect(screen.getByTestId("pagination-page-info")).toHaveTextContent("Halaman 1 dari 2");
      expect(screen.getByTestId("pagination-range-info")).toHaveTextContent("Menampilkan 1–25 dari 30 data");
    });
  });
});
