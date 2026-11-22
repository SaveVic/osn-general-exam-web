"use client";

import React, { useState } from "react";
import type {
  ExportHeaderFormat,
  ExportReportOptions,
} from "@/lib/exam/report-csv";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  Download,
  FileSpreadsheet,
  Info,
  Loader2,
} from "lucide-react";

interface ExportReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  completedCount: number;
  excludedInProgressCount: number;
  isExporting: boolean;
  errorMessage: string | null;
  onConfirmExport: (options: ExportReportOptions) => Promise<void> | void;
}

const OPTIONAL_COLUMNS: Array<{
  key: keyof Pick<
    ExportReportOptions,
    | "includeStartedAt"
    | "includeSubmittedAt"
    | "includeAnswersPerQuestion"
    | "includeStatusPerQuestion"
  >;
  label: string;
  description: string;
  snakeExample: string;
}> = [
  {
    key: "includeStartedAt",
    label: "Waktu Mulai",
    description: "Timestamp saat peserta memulai sesi ujian (WIB).",
    snakeExample: "waktu_mulai",
  },
  {
    key: "includeSubmittedAt",
    label: "Waktu Selesai",
    description: "Timestamp saat peserta mengumpulkan jawaban (WIB).",
    snakeExample: "waktu_selesai",
  },
  {
    key: "includeAnswersPerQuestion",
    label: "Jawaban Tiap Nomor",
    description: "Menampilkan pilihan atau isi jawaban peserta per nomor soal.",
    snakeExample: "jawaban_no_1, ...",
  },
  {
    key: "includeStatusPerQuestion",
    label: "Status Jawaban Tiap Nomor",
    description: "Status kebenaran per nomor soal (Benar, Salah, Tidak Dijawab).",
    snakeExample: "status_no_1, ...",
  },
];

export function ExportReportDialog({
  open,
  onOpenChange,
  completedCount,
  excludedInProgressCount,
  isExporting,
  errorMessage,
  onConfirmExport,
}: ExportReportDialogProps) {
  const [options, setOptions] = useState<ExportReportOptions>({
    includeStartedAt: false,
    includeSubmittedAt: false,
    includeAnswersPerQuestion: false,
    includeStatusPerQuestion: false,
    headerFormat: "normal",
  });

  const handleToggleOption = (
    key: keyof Pick<
      ExportReportOptions,
      | "includeStartedAt"
      | "includeSubmittedAt"
      | "includeAnswersPerQuestion"
      | "includeStatusPerQuestion"
    >
  ) => {
    setOptions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleFormatChange = (headerFormat: ExportHeaderFormat) => {
    setOptions((prev) => ({
      ...prev,
      headerFormat,
    }));
  };

  const isSnake = options.headerFormat === "snake_case";

  const mandatoryLabels = isSnake
    ? ["nomor_urut", "nama_lengkap", "kelas", "durasi_detik", "total_skor"]
    : ["Nomor Urut", "Nama Lengkap", "Kelas", "Durasi (Detik)", "Total Skor"];

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && isExporting) return;
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-lg overflow-x-hidden overflow-y-auto">
        <DialogHeader className="min-w-0">
          <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-50">
            <FileSpreadsheet className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>Kustomisasi Ekspor Nilai (CSV)</span>
          </DialogTitle>
          <DialogDescription>
            Pilih kolom opsional dan format nama kolom yang ingin disertakan. Hanya peserta yang{" "}
            <strong className="text-slate-900 dark:text-slate-100">sudah selesai</strong> (
            {completedCount} peserta) yang akan diekspor.
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-4">
          {/* Peringatan Peserta Masih Mengerjakan (Jika Ada) */}
          {excludedInProgressCount > 0 && (
            <div className="flex min-w-0 items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2.5 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
              <Info className="mt-0.5 size-4 shrink-0" />
              <span className="min-w-0 wrap-break-word">
                Sebanyak <strong>{excludedInProgressCount} peserta</strong> yang masih mengerjakan
                tidak akan dimasukkan ke hasil ekspor.
              </span>
            </div>
          )}

          {/* Daftar Kolom Wajib */}
          <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/50">
            <p className="mb-2 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              Kolom Wajib (Otomatis Disertakan)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {mandatoryLabels.map((label) => (
                <Badge
                  key={label}
                  variant="outline"
                  className="bg-white font-mono text-[11px] text-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  {label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Pilihan Kolom Opsional */}
          <div className="min-w-0 space-y-2">
            <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              Kolom Opsional
            </p>
            <div className="space-y-2">
              {OPTIONAL_COLUMNS.map((item) => {
                const checked = options[item.key];
                const inputId = `export-opt-${item.key}`;
                return (
                  <label
                    key={item.key}
                    htmlFor={inputId}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 transition-colors hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800"
                  >
                    <input
                      id={inputId}
                      type="checkbox"
                      checked={checked}
                      disabled={isExporting}
                      onChange={() => handleToggleOption(item.key)}
                      className="mt-0.5 size-4 cursor-pointer rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {item.label}
                        </span>
                        {isSnake && (
                          <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {item.snakeExample}
                          </code>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                        {item.description}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Pilihan Format Nama Kolom */}
          <div className="min-w-0 space-y-2">
            <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              Format Nama Kolom
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label
                htmlFor="export-header-normal"
                className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 bg-white p-2.5 transition-colors hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800"
              >
                <input
                  id="export-header-normal"
                  type="radio"
                  name="exportHeaderFormat"
                  value="normal"
                  checked={options.headerFormat !== "snake_case"}
                  disabled={isExporting}
                  onChange={() => handleFormatChange("normal")}
                  className="mt-0.5 size-4 cursor-pointer text-indigo-600 focus:ring-indigo-500"
                />
                <div className="min-w-0">
                  <span className="block text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Biasa (Judul Rapi)
                  </span>
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                    Misal: <code>Nama Lengkap</code>
                  </span>
                </div>
              </label>

              <label
                htmlFor="export-header-snake"
                className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 bg-white p-2.5 transition-colors hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800"
              >
                <input
                  id="export-header-snake"
                  type="radio"
                  name="exportHeaderFormat"
                  value="snake_case"
                  checked={options.headerFormat === "snake_case"}
                  disabled={isExporting}
                  onChange={() => handleFormatChange("snake_case")}
                  className="mt-0.5 size-4 cursor-pointer text-indigo-600 focus:ring-indigo-500"
                />
                <div className="min-w-0">
                  <span className="block text-xs font-semibold text-slate-900 dark:text-slate-100">
                    snake_case
                  </span>
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                    Misal: <code>nama_lengkap</code>
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Pesan Error Ekspor */}
          {errorMessage && (
            <div className="flex min-w-0 items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span className="min-w-0 wrap-break-word">{errorMessage}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={() => onConfirmExport(options)}
            disabled={isExporting || completedCount === 0}
            className="cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-1.5 size-4 animate-spin" />
                Menyiapkan CSV...
              </>
            ) : (
              <>
                <Download className="mr-1.5 size-4" />
                Unduh CSV ({completedCount} Peserta)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
