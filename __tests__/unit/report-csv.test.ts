import { describe, it, expect } from "vitest";
import {
  formatActualDuration,
  formatReportTimestamp,
  escapeCsvCell,
  generateExamReportCsv,
  EXAM_REPORT_CSV_HEADERS,
  type ExamReportSessionRow,
} from "@/lib/exam/report-csv";

describe("Report CSV & Duration Utilities - Unit Tests (F5-03 / ADM-RECP-01)", () => {
  describe("formatActualDuration", () => {
    it("mengembalikan '-' jika submittedAt bernilai null atau tanggal tidak valid", () => {
      expect(formatActualDuration("2026-10-20T08:00:00Z", null)).toBe("-");
      expect(formatActualDuration("invalid-date", "2026-10-20T08:30:00Z")).toBe("-");
    });

    it("menghitung durasi detik, menit, dan jam secara akurat", () => {
      // 45 detik
      expect(
        formatActualDuration("2026-10-20T08:00:00Z", "2026-10-20T08:00:45Z")
      ).toBe("45d");

      // 42 menit 15 detik
      expect(
        formatActualDuration("2026-10-20T08:00:00Z", "2026-10-20T08:42:15Z")
      ).toBe("42m 15d");

      // 1 jam 15 menit 30 detik
      expect(
        formatActualDuration("2026-10-20T08:00:00Z", "2026-10-20T09:15:30Z")
      ).toBe("1j 15m 30d");
    });
  });

  describe("formatReportTimestamp", () => {
    it("mengembalikan '-' untuk input null atau tidak valid", () => {
      expect(formatReportTimestamp(null)).toBe("-");
      expect(formatReportTimestamp("")).toBe("-");
      expect(formatReportTimestamp("bukan-tanggal")).toBe("-");
    });

    it("memformat tanggal ISO menjadi string tanggal yang terbaca", () => {
      const formatted = formatReportTimestamp("2026-10-20T08:30:00.000Z");
      expect(formatted).not.toBe("-");
      expect(formatted).toContain("2026");
    });
  });

  describe("escapeCsvCell", () => {
    it("mengembalikan string kosong untuk null atau undefined", () => {
      expect(escapeCsvCell(null)).toBe("");
      expect(escapeCsvCell(undefined)).toBe("");
    });

    it("membungkus dengan tanda kutip ganda jika mengandung koma, kutip, atau baris baru", () => {
      expect(escapeCsvCell("Ni'matul Ulfa, S.Pd.")).toBe('"Ni\'matul Ulfa, S.Pd."');
      expect(escapeCsvCell('La Ode "Putra" Ramadhan')).toBe(
        '"La Ode ""Putra"" Ramadhan"'
      );
      expect(escapeCsvCell("Baris 1\nBaris 2")).toBe('"Baris 1\nBaris 2"');
    });

    it("mempertahankan karakter nama Indonesia beraksen dan apostrof tanpa kerusakan", () => {
      expect(escapeCsvCell("Ahmad Syafi'i Ma'arif")).toBe("Ahmad Syafi'i Ma'arif");
      expect(escapeCsvCell("Renée Kartika D'Arcy")).toBe("Renée Kartika D'Arcy");
    });
  });

  describe("generateExamReportCsv", () => {
    it("menghasilkan CSV berformat UTF-8 dengan BOM (\\uFEFF) dan 8 kolom standar", () => {
      const mockRows: ExamReportSessionRow[] = [
        {
          id: "sess-1",
          studentName: "Ahmad Syafi'i Ma'arif",
          studentClass: "11-MIPA-1",
          startedAt: "2026-10-20T08:00:00.000Z",
          submittedAt: "2026-10-20T08:45:12.000Z",
          totalScore: 92.5,
          isCompleted: true,
        },
        {
          id: "sess-2",
          studentName: 'Renée "Putri" Qur\'ani, Jr.',
          studentClass: "11-MIPA-2",
          startedAt: "2026-10-20T08:10:00.000Z",
          submittedAt: null,
          totalScore: null,
          isCompleted: false,
        },
      ];

      const csv = generateExamReportCsv(mockRows);

      // Pastikan diawali dengan UTF-8 BOM
      expect(csv.startsWith("\uFEFF")).toBe(true);

      const lines = csv.slice(1).split("\r\n");
      expect(lines.length).toBe(3); // 1 header + 2 baris data

      // Verifikasi baris header
      expect(lines[0]).toBe(EXAM_REPORT_CSV_HEADERS.join(","));

      // Verifikasi baris pertama (Selesai, nama dengan apostrof)
      expect(lines[1]).toContain("1,Ahmad Syafi'i Ma'arif,11-MIPA-1,");
      expect(lines[1]).toContain(",45m 12d,92.5,Selesai");

      // Verifikasi baris kedua (Sedang Mengerjakan, nama dengan aksen, kutip, dan koma)
      expect(lines[2]).toContain('2,"Renée ""Putri"" Qur\'ani, Jr.",11-MIPA-2,');
      expect(lines[2]).toContain(",-,-,Sedang Mengerjakan");
    });
  });
});

