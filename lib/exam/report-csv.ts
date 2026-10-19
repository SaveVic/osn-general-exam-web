export interface ExamReportSessionRow {
  id: string;
  studentName: string;
  studentClass: string;
  startedAt: string;
  submittedAt: string | null;
  totalScore: number | null;
  isCompleted: boolean;
}

/**
 * Menghitung durasi pengerjaan aktual dari selisih started_at dan submitted_at.
 * Mengembalikan "-" jika sesi belum diselesaikan (submittedAt === null).
 */
export function formatActualDuration(
  startedAt: string,
  submittedAt: string | null
): string {
  if (!submittedAt) return "-";

  const startMs = new Date(startedAt).getTime();
  const endMs = new Date(submittedAt).getTime();

  if (isNaN(startMs) || isNaN(endMs)) return "-";

  const diffSeconds = Math.max(0, Math.floor((endMs - startMs) / 1000));
  const hours = Math.floor(diffSeconds / 3600);
  const minutes = Math.floor((diffSeconds % 3600) / 60);
  const seconds = diffSeconds % 60;

  if (hours > 0) {
    return `${hours}j ${minutes}m ${seconds}d`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}d`;
  }
  return `${seconds}d`;
}

/**
 * Memformat string waktu ISO menjadi tampilan tanggal & waktu lokal Indonesia.
 * Mengembalikan "-" jika nilai waktu kosong atau tidak valid.
 */
export function formatReportTimestamp(isoString: string | null): string {
  if (!isoString) return "-";

  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

/**
 * Melakukan escaping nilai sel CSV sesuai standar RFC 4180.
 * Menjaga keutuhan karakter nama Indonesia (apostrof, kutip, koma, aksen).
 */
export function escapeCsvCell(
  value: string | number | null | undefined
): string {
  if (value === null || value === undefined) return "";

  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export const EXAM_REPORT_CSV_HEADERS = [
  "Nomor Urut",
  "Nama Lengkap",
  "Kelas",
  "Waktu Mulai",
  "Waktu Selesai",
  "Durasi Aktual",
  "Skor Total",
  "Status Pengerjaan",
] as const;

/**
 * Menghasilkan konten berkas CSV berformat UTF-8 (dengan UTF-8 BOM \uFEFF)
 * untuk kemudahan pengolahan di Microsoft Excel dan Google Sheets.
 */
export function generateExamReportCsv(rows: ExamReportSessionRow[]): string {
  const headerLine = EXAM_REPORT_CSV_HEADERS.map((h) => escapeCsvCell(h)).join(
    ","
  );

  const dataLines = rows.map((row, index) => {
    const cells = [
      index + 1,
      row.studentName,
      row.studentClass,
      formatReportTimestamp(row.startedAt),
      formatReportTimestamp(row.submittedAt),
      formatActualDuration(row.startedAt, row.submittedAt),
      row.totalScore !== null && row.totalScore !== undefined
        ? row.totalScore
        : "-",
      row.isCompleted ? "Selesai" : "Sedang Mengerjakan",
    ];

    return cells.map((cell) => escapeCsvCell(cell)).join(",");
  });

  const csvBody = [headerLine, ...dataLines].join("\r\n");
  return `\uFEFF${csvBody}`;
}

