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
    timeZone: "Asia/Jakarta",
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

export interface StudentFullAnswerRow {
  studentName: string;
  studentClass: string;
  totalScore: number | null;
  isCompleted: boolean;
  answers: Record<number, string>; // orderIndex (1-indexed) -> formatted string
}

/**
 * Format jawaban untuk tampilan tabel atau ekspor CSV
 * Pilihan ganda: "A"
 * Pilihan jamak: "A, B"
 * Isian singkat: teks / angka
 * Kosong: "-"
 */
export function formatAnswerForCsv(
  questionType: string,
  options: unknown,
  answerValue: unknown,
  includeLabel: boolean = false
): string {
  if (answerValue === null || answerValue === undefined || answerValue === "") {
    return "-";
  }

  interface OptionItem {
    id?: string;
    label?: string;
    [key: string]: unknown;
  }

  const optionList: OptionItem[] = Array.isArray(options) ? options : [];

  if (questionType === "single_choice") {
    const rawVal =
      typeof answerValue === "object" &&
      answerValue !== null &&
      "selected" in answerValue
        ? (answerValue as { selected: unknown }).selected
        : answerValue;

    if (!rawVal) return "-";
    const selectedId = String(rawVal).trim();

    const optIndex = optionList.findIndex(
      (opt) => opt && typeof opt === "object" && String(opt.id) === selectedId
    );

    if (optIndex >= 0) {
      const letter = String.fromCharCode(65 + optIndex);
      const optLabel = optionList[optIndex]?.label;
      if (includeLabel && optLabel) {
        return `${letter}. ${optLabel}`;
      }
      return letter;
    }

    return selectedId || "-";
  }

  if (questionType === "multiple_choice") {
    let selectedIds: string[] = [];
    if (Array.isArray(answerValue)) {
      selectedIds = answerValue.map(String);
    } else if (
      typeof answerValue === "object" &&
      answerValue !== null &&
      "selected" in answerValue &&
      Array.isArray((answerValue as { selected: unknown }).selected)
    ) {
      selectedIds = (
        (answerValue as { selected: unknown[] }).selected
      ).map(String);
    }

    if (selectedIds.length === 0) return "-";

    const formattedList: Array<{ letter: string; text: string; index: number }> =
      [];

    selectedIds.forEach((id) => {
      const optIndex = optionList.findIndex(
        (opt) => opt && typeof opt === "object" && String(opt.id) === id
      );
      if (optIndex >= 0) {
        const letter = String.fromCharCode(65 + optIndex);
        const optLabel = optionList[optIndex]?.label;
        formattedList.push({
          letter,
          text: includeLabel && optLabel ? `${letter}. ${optLabel}` : letter,
          index: optIndex,
        });
      } else {
        formattedList.push({ letter: id, text: id, index: 999 });
      }
    });

    formattedList.sort((a, b) => a.index - b.index);
    return formattedList.map((item) => item.text).join(", ") || "-";
  }

  if (questionType === "short_answer") {
    if (
      typeof answerValue === "object" &&
      answerValue !== null &&
      "text" in answerValue
    ) {
      const txt = (answerValue as { text: unknown }).text;
      return txt !== null && txt !== undefined
        ? String(txt).trim() || "-"
        : "-";
    }
    return String(answerValue).trim() || "-";
  }

  if (typeof answerValue === "string" || typeof answerValue === "number") {
    return String(answerValue).trim() || "-";
  }

  return "-";
}

/**
 * Menghasilkan konten berkas CSV untuk seluruh jawaban siswa (Jawaban Lengkap)
 * Kolom: Nomor Urut, Nama Lengkap, Kelas, Skor Total, Status Pengerjaan, Soal 1, Soal 2, ..., Soal N
 */
export function generateExamFullAnswersCsv(
  questionsCount: number,
  rows: StudentFullAnswerRow[]
): string {
  const baseHeaders = [
    "Nomor Urut",
    "Nama Lengkap",
    "Kelas",
    "Skor Total",
    "Status Pengerjaan",
  ];

  const questionHeaders: string[] = [];
  for (let i = 1; i <= questionsCount; i++) {
    questionHeaders.push(`Soal ${i}`);
  }

  const allHeaders = [...baseHeaders, ...questionHeaders];
  const headerLine = allHeaders.map((h) => escapeCsvCell(h)).join(",");

  const dataLines = rows.map((row, index) => {
    const baseCells = [
      index + 1,
      row.studentName,
      row.studentClass,
      row.totalScore !== null && row.totalScore !== undefined
        ? row.totalScore
        : "-",
      row.isCompleted ? "Selesai" : "Sedang Mengerjakan",
    ];

    const answerCells: string[] = [];
    for (let i = 1; i <= questionsCount; i++) {
      answerCells.push(row.answers[i] ?? "-");
    }

    const allCells = [...baseCells, ...answerCells];
    return allCells.map((cell) => escapeCsvCell(cell)).join(",");
  });

  const csvBody = [headerLine, ...dataLines].join("\r\n");
  return `\uFEFF${csvBody}`;
}

