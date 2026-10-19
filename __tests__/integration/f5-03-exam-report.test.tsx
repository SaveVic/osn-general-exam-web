import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { getExamReportData } from "@/actions/exam-report";
import { ExamReportView } from "@/components/admin/reports/exam-report-view";
import type { ExamReportSessionRow } from "@/lib/exam/report-csv";
import type { ExamRow } from "@/types/database";

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

const mockExam: ExamRow = {
  id: "exam-f503",
  title: "Simulasi OSN Matematika & Sains 2026",
  description: "Evaluasi seleksi tingkat sekolah",
  duration_minutes: 90,
  starts_at: "2026-10-20T08:00:00Z",
  ends_at: "2026-10-20T12:00:00Z",
  class_options: ["10-MIPA-1", "10-MIPA-2"],
  is_published: true,
  created_at: "2026-10-18T00:00:00Z",
  updated_at: "2026-10-18T00:00:00Z",
};

const mockReportSessions: ExamReportSessionRow[] = [
  {
    id: "sess-1",
    studentName: "Ahmad Syafi'i",
    studentClass: "10-MIPA-1",
    startedAt: "2026-10-20T08:00:00.000Z",
    submittedAt: "2026-10-20T09:15:30.000Z",
    totalScore: 87.5,
    isCompleted: true,
  },
  {
    id: "sess-2",
    studentName: "Siti Qur'ani",
    studentClass: "10-MIPA-2",
    startedAt: "2026-10-20T08:05:00.000Z",
    submittedAt: null,
    totalScore: 40,
    isCompleted: false,
  },
  {
    id: "sess-3",
    studentName: 'Budi "Al-Faruq", Jr.',
    studentClass: "10-MIPA-1",
    startedAt: "2026-10-20T08:10:00.000Z",
    submittedAt: "2026-10-20T09:00:00.000Z",
    totalScore: 95,
    isCompleted: true,
  },
];

describe("F5-03: Rekapitulasi Nilai & Ekspor Laporan Akademis (ADM-RECP-01)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getExamReportData Server Action", () => {
    it("menolak akses jika pengguna bukan administrator", async () => {
      mockGetAdminUser.mockResolvedValue(null);

      const res = await getExamReportData("exam-f503");
      expect(res.success).toBe(false);
      expect(res.message).toMatch(/Akses ditolak/i);
    });

    it("mengembalikan galat jika naskah ujian tidak ditemukan", async () => {
      mockGetAdminUser.mockResolvedValue({ id: "admin-1", email: "admin@exam.local" });

      mockServiceFrom.mockImplementation((table: string) => {
        if (table === "exams") {
          return {
            select: () => ({
              eq: () => ({
                single: vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
              }),
            }),
          };
        }
        return {};
      });

      const res = await getExamReportData("exam-unknown");
      expect(res.success).toBe(false);
      expect(res.message).toMatch(/Naskah ujian tidak ditemukan/i);
    });

    it("mengembalikan metadata ujian, maksimum skor soal, dan daftar sesi peserta", async () => {
      mockGetAdminUser.mockResolvedValue({ id: "admin-1", email: "admin@exam.local" });

      mockServiceFrom.mockImplementation((table: string) => {
        if (table === "exams") {
          return {
            select: () => ({
              eq: () => ({
                single: vi.fn().mockResolvedValue({ data: mockExam, error: null }),
              }),
            }),
          };
        }

        if (table === "questions") {
          return {
            select: () => ({
              eq: vi.fn().mockResolvedValue({
                data: [{ points: 40 }, { points: 35 }, { points: 25 }],
                error: null,
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
                      student_name: "Ahmad Syafi'i",
                      student_class: "10-MIPA-1",
                      started_at: "2026-10-20T08:00:00.000Z",
                      submitted_at: "2026-10-20T09:15:30.000Z",
                      total_score: 87.5,
                      is_completed: true,
                    },
                    {
                      id: "sess-2",
                      student_name: "Siti Qur'ani",
                      student_class: "10-MIPA-2",
                      started_at: "2026-10-20T08:05:00.000Z",
                      submitted_at: null,
                      total_score: 40,
                      is_completed: false,
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }

        return {};
      });

      const res = await getExamReportData("exam-f503");
      expect(res.success).toBe(true);
      expect(res.exam?.title).toBe("Simulasi OSN Matematika & Sains 2026");
      expect(res.maxPossibleScore).toBe(100);
      expect(res.sessions).toHaveLength(2);
      expect(res.sessions?.[0]).toEqual({
        id: "sess-1",
        studentName: "Ahmad Syafi'i",
        studentClass: "10-MIPA-1",
        startedAt: "2026-10-20T08:00:00.000Z",
        submittedAt: "2026-10-20T09:15:30.000Z",
        totalScore: 87.5,
        isCompleted: true,
      });
    });
  });

  describe("ExamReportView Component", () => {
    it("merender tabel 8 kolom, lencana status pengerjaan, dan durasi aktual dengan akurat", () => {
      render(
        <ExamReportView
          exam={mockExam}
          maxPossibleScore={100}
          sessions={mockReportSessions}
        />
      );

      // Pastikan seluruh 8 header kolom tabel hadir
      expect(screen.getByRole("columnheader", { name: /Nomor Urut/i })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: /Nama Lengkap/i })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: /Kelas/i })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: /Waktu Mulai/i })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: /Waktu Selesai/i })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: /Durasi Aktual/i })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: /Skor Total/i })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: /Status Pengerjaan/i })).toBeInTheDocument();

      // Pastikan data baris peserta tampil
      expect(screen.getByText("Ahmad Syafi'i")).toBeInTheDocument();
      expect(screen.getByText("Siti Qur'ani")).toBeInTheDocument();
      expect(screen.getByText('Budi "Al-Faruq", Jr.')).toBeInTheDocument();

      // Durasi aktual untuk sess-1 (1 jam 15 menit 30 detik) dan sess-3 (50 menit 0 detik)
      expect(screen.getByText("1j 15m 30d")).toBeInTheDocument();
      expect(screen.getByText("50m 0d")).toBeInTheDocument();

      // Status pengerjaan
      expect(screen.getAllByText("Selesai").length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText("Sedang Mengerjakan").length).toBeGreaterThanOrEqual(1);
    });

    it("menyaring daftar peserta berdasarkan filter dropdown kelas", () => {
      render(
        <ExamReportView
          exam={mockExam}
          maxPossibleScore={100}
          sessions={mockReportSessions}
        />
      );

      const classSelect = screen.getByLabelText("Filter Berdasarkan Kelas");

      // Pilih kelas 10-MIPA-2
      fireEvent.change(classSelect, { target: { value: "10-MIPA-2" } });

      expect(screen.getByText("Siti Qur'ani")).toBeInTheDocument();
      expect(screen.queryByText("Ahmad Syafi'i")).not.toBeInTheDocument();
      expect(screen.queryByText('Budi "Al-Faruq", Jr.')).not.toBeInTheDocument();

      // Kembali ke semua kelas
      fireEvent.change(classSelect, { target: { value: "all" } });
      expect(screen.getByText("Ahmad Syafi'i")).toBeInTheDocument();
    });

    it("menyaring daftar peserta secara real-time berdasarkan pencarian nama", () => {
      render(
        <ExamReportView
          exam={mockExam}
          maxPossibleScore={100}
          sessions={mockReportSessions}
        />
      );

      const searchInput = screen.getByLabelText("Cari nama siswa");

      fireEvent.change(searchInput, { target: { value: "syafi'i" } });

      expect(screen.getByText("Ahmad Syafi'i")).toBeInTheDocument();
      expect(screen.queryByText("Siti Qur'ani")).not.toBeInTheDocument();
      expect(screen.queryByText('Budi "Al-Faruq", Jr.')).not.toBeInTheDocument();
    });

    it("menghasilkan dan mengunduh berkas CSV berformat UTF-8 BOM saat tombol Ekspor Nilai (CSV) diklik", () => {
      const handleExportCsv = vi.fn();

      render(
        <ExamReportView
          exam={mockExam}
          maxPossibleScore={100}
          sessions={mockReportSessions}
          onExportCsv={handleExportCsv}
        />
      );

      const exportButton = screen.getByRole("button", { name: /Ekspor Nilai \(CSV\)/i });
      fireEvent.click(exportButton);

      expect(handleExportCsv).toHaveBeenCalledTimes(1);

      const [csvContent, filename] = handleExportCsv.mock.calls[0] as [string, string];
      expect(filename).toBe("rekap-nilai-simulasi-osn-matematika-sains-2026.csv");

      // Harus diawali UTF-8 BOM agar karakter Indonesia aman di Excel
      expect(csvContent.startsWith("\uFEFF")).toBe(true);

      // Harus memuat header dan karakter khusus yang di-escape RFC 4180
      expect(csvContent).toContain(
        "Nomor Urut,Nama Lengkap,Kelas,Waktu Mulai,Waktu Selesai,Durasi Aktual,Skor Total,Status Pengerjaan"
      );
      expect(csvContent).toContain("Ahmad Syafi'i");
      expect(csvContent).toContain("Siti Qur'ani");
      expect(csvContent).toContain('"Budi ""Al-Faruq"", Jr."');
    });
  });
});

