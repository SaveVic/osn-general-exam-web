"use client";

import React, { useState } from "react";
import type { ExamRow, ReferralCodeRow } from "@/types/database";
import { ReferralCodeForm } from "./referral-code-form";
import { ReferralCodeList } from "./referral-code-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  KeyRound,
  Plus,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ReferralCodeManagerProps {
  exam: ExamRow;
  codes: ReferralCodeRow[];
}

export function ReferralCodeManager({ exam, codes }: ReferralCodeManagerProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(codes.length === 0);

  const now = new Date();
  const activeCodes = codes.filter(
    (c) => c.is_active && (!c.expires_at || new Date(c.expires_at) > now)
  );
  const totalUses = codes.reduce((sum, c) => sum + (c.current_uses || 0), 0);

  const handleFormSuccess = () => {
    setShowForm(false);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Header Naskah Ujian & Ringkasan */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                Distribusi & Akses Peserta
              </span>
              {exam.is_published ? (
                <Badge className="bg-emerald-600 text-white dark:bg-emerald-500">
                  Dipublikasikan
                </Badge>
              ) : (
                <Badge variant="outline" className="border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-400">
                  Draf
                </Badge>
              )}
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-50">
              Kode Rujukan: {exam.title}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Bagikan kode rujukan kepada peserta ujian atau gunakan tautan langsung untuk pengerjaan instan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/admin/ujian/${exam.id}/soal`}>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-slate-300 text-xs dark:border-slate-700"
              >
                <BookOpen className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                Bank Soal
              </Button>
            </Link>
            <Link href={`/admin/ujian/${exam.id}/pengaturan`}>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-slate-300 text-xs dark:border-slate-700"
              >
                <ArrowLeft className="size-3.5" />
                Pengaturan
              </Button>
            </Link>
          </div>
        </div>

        {/* Metrik Statistik Kode */}
        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5 sm:grid-cols-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <KeyRound className="size-4" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Total Kode
              </p>
              <p className="font-mono text-base font-bold text-slate-900 dark:text-slate-50">
                {codes.length} Kode
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <ShieldCheck className="size-4" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Kode Aktif
              </p>
              <p className="font-mono text-base font-bold text-slate-900 dark:text-slate-50">
                {activeCodes.length} Aktif
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
              <Users className="size-4" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Total Penggunaan
              </p>
              <p className="font-mono text-base font-bold text-slate-900 dark:text-slate-50">
                {totalUses} Sesi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <CheckCircle2 className="size-4" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Pilihan Kelas
              </p>
              <p className="truncate font-mono text-xs font-semibold text-slate-900 dark:text-slate-50">
                {exam.class_options.join(", ") || "-"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tombol Toggle Buka Form Penerbitan */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
          Kelola Distribusi Kode
        </h2>
        <Button
          type="button"
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700"
        >
          <Plus className="size-3.5" />
          <span>{showForm ? "Tutup Formulir" : "Terbitkan Kode Baru"}</span>
        </Button>
      </div>

      {/* Formulir Penerbitan (Kondisional) */}
      {showForm && (
        <ReferralCodeForm
          examId={exam.id}
          examTitle={exam.title}
          examEndsAt={exam.ends_at}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Tabel Kode Rujukan */}
      <ReferralCodeList examId={exam.id} codes={codes} />
    </div>
  );
}

