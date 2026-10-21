"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlayCircle, ArrowRight, Clock, User, GraduationCap, RotateCcw } from "lucide-react";
import type { ActiveSessionResumeData } from "@/actions/exam-session";

interface ActiveSessionResumeCardProps {
  session: ActiveSessionResumeData;
  onSwitchToCodeInput: () => void;
}

export function ActiveSessionResumeCard({
  session,
  onSwitchToCodeInput,
}: ActiveSessionResumeCardProps) {
  const router = useRouter();

  const handleResume = () => {
    router.push(`/ujian/${session.sessionId}`);
  };

  return (
    <div className="animate-in fade-in zoom-in-95 w-full max-w-lg duration-200">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
          <PlayCircle className="size-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Sesi Ujian Aktif Ditemukan
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Sistem mendeteksi sesi pengerjaan ujian yang belum diselesaikan pada peramban ini.
        </p>
      </div>

      <Card className="border-slate-200 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardDescription className="text-xs font-semibold tracking-wider text-indigo-600 uppercase dark:text-indigo-400">
                Naskah Ujian
              </CardDescription>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {session.examTitle}
              </CardTitle>
            </div>
            <Badge
              variant="outline"
              className="shrink-0 border-emerald-300 bg-emerald-50 text-[10px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
            >
              <span className="mr-1.5 size-1.5 animate-pulse rounded-full bg-emerald-500" />
              SEDANG BERJALAN
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Box Detail Peserta */}
          <div className="space-y-2.5 rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
              <User className="size-4 shrink-0 text-slate-400" />
              <span className="text-xs text-slate-500 dark:text-slate-400">Nama Peserta:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {session.studentName}
              </span>
            </div>

            <div className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
              <GraduationCap className="size-4 shrink-0 text-slate-400" />
              <span className="text-xs text-slate-500 dark:text-slate-400">Kelas:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {session.studentClass}
              </span>
            </div>

            <div className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
              <Clock className="size-4 shrink-0 text-slate-400" />
              <span className="text-xs text-slate-500 dark:text-slate-400">Alokasi Durasi:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {session.durationMinutes} Menit
              </span>
            </div>
          </div>

          {/* Tombol Aksi */}
          <div className="space-y-3 pt-1">
            <Button
              type="button"
              onClick={handleResume}
              className="w-full cursor-pointer bg-emerald-600 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
              size="lg"
            >
              <span>Lanjutkan Pengerjaan Ujian</span>
              <ArrowRight className="ml-2 size-4" />
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onSwitchToCodeInput}
                className="cursor-pointer text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <RotateCcw className="mr-1.5 size-3.5" />
                <span>Gunakan Kode Rujukan Lain</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

