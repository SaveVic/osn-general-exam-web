"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

export interface DataTablePaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function DataTablePagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  pageSizeOptions = [10, 25, 50, 100],
  onPageChange,
  onPageSizeChange,
}: DataTablePaginationProps) {
  const safeTotalPages = Math.max(1, totalPages);
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 px-4 py-3 sm:flex-row dark:border-slate-800">
      {/* Informasi Baris & Pilihan Ukuran Halaman */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <span>Baris per halaman:</span>
          <select
            aria-label="Pilih jumlah baris per halaman"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-8 cursor-pointer rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 shadow-2xs focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <span>•</span>

        <p data-testid="pagination-range-info">
          Menampilkan{" "}
          <strong className="font-semibold text-slate-700 dark:text-slate-200">
            {startItem}–{endItem}
          </strong>{" "}
          dari{" "}
          <strong className="font-semibold text-slate-700 dark:text-slate-200">
            {totalItems}
          </strong>{" "}
          data
        </p>
      </div>

      {/* Kontrol Navigasi Halaman */}
      <div className="flex items-center gap-1.5">
        <span
          data-testid="pagination-page-info"
          className="mr-2 text-xs text-slate-500 dark:text-slate-400"
        >
          Halaman{" "}
          <strong className="font-semibold text-slate-700 dark:text-slate-200">
            {currentPage}
          </strong>{" "}
          dari{" "}
          <strong className="font-semibold text-slate-700 dark:text-slate-200">
            {safeTotalPages}
          </strong>
        </span>

        {/* Tombol Halaman Pertama */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          aria-label="Ke halaman pertama"
          className="size-8 cursor-pointer p-0 disabled:cursor-not-allowed"
        >
          <ChevronsLeft className="size-4" />
        </Button>

        {/* Tombol Halaman Sebelumnya */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Ke halaman sebelumnya"
          className="size-8 cursor-pointer p-0 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="size-4" />
        </Button>

        {/* Tombol Halaman Berikutnya */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= safeTotalPages}
          aria-label="Ke halaman berikutnya"
          className="size-8 cursor-pointer p-0 disabled:cursor-not-allowed"
        >
          <ChevronRight className="size-4" />
        </Button>

        {/* Tombol Halaman Terakhir */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(safeTotalPages)}
          disabled={currentPage >= safeTotalPages}
          aria-label="Ke halaman terakhir"
          className="size-8 cursor-pointer p-0 disabled:cursor-not-allowed"
        >
          <ChevronsRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

