"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Catat galat ke log konsol untuk diagnosa pengembang
    console.error("Terjadi error tertangkap pada boundary:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
          <AlertTriangle className="size-7" aria-hidden="true" />
        </div>

        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Terjadi Gangguan pada Sistem
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Sistem mendeteksi kendala saat memproses permintaan Anda. Jangan khawatir, progres jawaban dan data ujian yang tersimpan pada perangkat Anda tetap aman.
        </p>

        {error.digest && (
          <div className="mt-4 rounded-md bg-slate-100 px-3 py-1.5 font-mono text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            ID Referensi: {error.digest}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-95"
          >
            <RefreshCw className="size-4" />
            Coba Lagi
          </button>

          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/60"
          >
            <Home className="size-4" />
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}

