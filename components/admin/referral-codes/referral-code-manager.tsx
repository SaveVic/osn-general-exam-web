"use client";

import React, { useState } from "react";
import type { ExamRow, ReferralCodeRow } from "@/types/database";
import { ReferralCodeForm } from "./referral-code-form";
import { ReferralCodeList } from "./referral-code-list";
import { Button } from "@/components/ui/button";
import {
  KeyRound,
  Plus,
  ShieldCheck,
  Users,
} from "lucide-react";
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
      {/* Header Kode Rujukan & Ringkasan */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
            Kode Rujukan
          </span>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-50">
            {exam.title}
          </h1>
        </div>

        {/* Metrik Statistik Kode */}
        <div className="mt-6 grid grid-cols-1 gap-3 border-t border-slate-100 pt-5 sm:grid-cols-3 dark:border-slate-800">
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
                Total Penggunaan Sesi
              </p>
              <p className="font-mono text-base font-bold text-slate-900 dark:text-slate-50">
                {totalUses} Sesi
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

