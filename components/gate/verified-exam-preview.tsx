"use client";

import { useExamGateStore } from "@/lib/stores/exam-gate-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle2, Clock, RotateCcw, Sparkles, Users } from "lucide-react";

export function VerifiedExamPreview() {
  const verifiedData = useExamGateStore((state) => state.verifiedData);
  const resetGate = useExamGateStore((state) => state.resetGate);

  if (!verifiedData) return null;

  const { exam, referralCode } = verifiedData;

  const formatDateTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jakarta",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      }).format(d);
    } catch {
      return isoString;
    }
  };

  return (
    <div className="animate-in fade-in zoom-in-95 w-full max-w-lg duration-200">
      <div className="mb-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-700 shadow-xs dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Kode Rujukan Terverifikasi</span>
          <span className="font-mono font-bold tracking-wider">({referralCode})</span>
        </div>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Konfirmasi Akses Ujian
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Kode rujukan valid. Rincian naskah ujian ditemukan pada sistem.
        </p>
      </div>

      <Card className="border-slate-200 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <Badge variant="outline" className="border-indigo-200 text-indigo-700 dark:border-indigo-800 dark:text-indigo-300">
                Naskah Ujian Resmi
              </Badge>
              <CardTitle className="text-xl leading-snug font-bold text-slate-900 dark:text-slate-50">
                {exam.title}
              </CardTitle>
            </div>
          </div>
          {exam.description && (
            <CardDescription className="pt-2 text-sm leading-relaxed whitespace-pre-line text-slate-600 dark:text-slate-400">
              {exam.description}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="space-y-4 pt-0">
          <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800/60 dark:bg-slate-800/40">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                <Clock className="size-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-slate-500 dark:text-slate-400">Durasi Pengerjaan</div>
                <div className="font-mono text-sm font-semibold text-slate-800 tabular-nums dark:text-slate-200">
                  {exam.duration_minutes} Menit
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800/60 dark:bg-slate-800/40">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                <Users className="size-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-slate-500 dark:text-slate-400">Sasaran Kelas</div>
                <div className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {exam.class_options.length > 0 ? exam.class_options.join(", ") : "Semua Kelas"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/70 p-3 sm:col-span-2 dark:border-slate-800/60 dark:bg-slate-800/40">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                <Calendar className="size-4" />
              </div>
              <div className="min-w-0 text-xs">
                <div className="text-slate-500 dark:text-slate-400">Jadwal Sesi Ujian</div>
                <div className="font-mono font-medium text-slate-800 tabular-nums dark:text-slate-200">
                  {formatDateTime(exam.starts_at)} — {formatDateTime(exam.ends_at)}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-lg border border-indigo-100 bg-indigo-50/50 p-3 text-xs text-indigo-900 dark:border-indigo-950/60 dark:bg-indigo-950/30 dark:text-indigo-200">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
            <div className="leading-relaxed">
              Silakan periksa kesesuaian judul naskah ujian dengan bidang lomba Anda. Setelah ini Anda akan diarahkan ke lobi persiapan identitas peserta.
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-4 sm:flex-row dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={resetGate}
            className="w-full text-slate-600 hover:text-slate-900 sm:w-auto dark:text-slate-400 dark:hover:text-slate-100"
          >
            <RotateCcw className="mr-1.5 size-3.5" />
            <span>Ganti Kode</span>
          </Button>

          <Button
            type="button"
            className="w-full bg-indigo-600 font-medium text-white hover:bg-indigo-700 sm:w-auto"
            onClick={() => {
              // Wadah interaksi ke Lobi F2-02 (akan diintegrasikan pada fitur selanjutnya)
            }}
          >
            <span>Lanjut ke Lobi Ujian</span>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

