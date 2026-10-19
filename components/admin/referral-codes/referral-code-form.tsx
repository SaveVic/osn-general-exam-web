"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { createReferralCodeAction } from "@/actions/referral-codes";
import type { ReferralCodeInput } from "@/lib/validations/referral-code";
import {
  AlertCircle,
  Clock,
  Infinity as InfinityIcon,
  KeyRound,
  Loader2,
  Sparkles,
  Users,
} from "lucide-react";
import { cn, generateRandomCode } from "@/lib/utils";

interface ReferralCodeFormProps {
  examId: string;
  examTitle: string;
  examEndsAt: string;
  onSuccess: () => void;
}

function getExamPrefix(title: string): string {
  const words = title
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return "EXAM";
  if (words.length === 1) return words[0].slice(0, 5);

  // Ambil huruf pertama tiap kata, max 4 huruf
  const acronym = words.map((w) => w[0]).join("").slice(0, 4);
  return acronym.length >= 2 ? acronym : words[0].slice(0, 4);
}

export function ReferralCodeForm({
  examId,
  examTitle,
  examEndsAt,
  onSuccess,
}: ReferralCodeFormProps) {
  const prefix = getExamPrefix(examTitle);

  const [code, setCode] = useState(() => generateRandomCode(prefix));
  const [isUnlimited, setIsUnlimited] = useState(false);
  const [maxUses, setMaxUses] = useState<number | string>(30);
  const [expirationType, setExpirationType] = useState<"exam_end" | "custom" | "never">("exam_end");
  const [customExpiresAt, setCustomExpiresAt] = useState<string>(examEndsAt);
  const [isActive, setIsActive] = useState(true);

  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const handleRandomize = () => {
    setCode(generateRandomCode(prefix));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    setErrorMessage(null);
    setFieldErrors({});

    const payload: ReferralCodeInput = {
      code: code.trim().toUpperCase(),
      is_unlimited: isUnlimited,
      max_uses: isUnlimited ? null : Number(maxUses),
      expiration_type: expirationType,
      expires_at: expirationType === "custom" ? customExpiresAt : null,
      is_active: isActive,
    };

    try {
      const result = await createReferralCodeAction(examId, payload);
      if (!result.success) {
        setErrorMessage(result.message || "Gagal menerbitkan kode rujukan.");
        if (result.errors) setFieldErrors(result.errors);
      } else {
        // Berhasil, reset form dengan kode acak baru
        setCode(generateRandomCode(prefix));
        onSuccess();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat menerbitkan kode.";
      setErrorMessage(msg);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
        <KeyRound className="size-4 text-indigo-600 dark:text-indigo-400" />
        <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Terbitkan Kode Rujukan Baru
        </h2>
      </div>

      {errorMessage && (
        <Alert variant="destructive" className="mb-4 text-xs">
          <AlertCircle className="size-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Input Kode Rujukan */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold tracking-wider text-slate-700 uppercase dark:text-slate-300">
            Kode Rujukan Peserta <span className="text-destructive">*</span>
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Contoh: MAT26-X89"
                className="font-mono text-sm uppercase tracking-wider font-bold"
                disabled={isPending}
                required
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleRandomize}
              disabled={isPending}
              title="Buat kombinasi kode acak otomatis"
              className="gap-1.5 text-xs border-slate-300 dark:border-slate-700"
            >
              <Sparkles className="size-3.5 text-amber-500" />
              <span>Acak Kode</span>
            </Button>
          </div>
          {fieldErrors.code && (
            <p className="text-xs text-destructive">{fieldErrors.code[0]}</p>
          )}
          <p className="text-[11px] text-slate-400">
            Hanya boleh huruf kapital, angka, dan tanda hubung (-).
          </p>
        </div>

        {/* Konfigurasi Batas Kuota */}
        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="flex items-center gap-2">
            <Users className="size-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-semibold tracking-wider text-slate-700 uppercase dark:text-slate-300">
              Batas Kuota Pemakaian
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label
              className={cn(
                "flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors",
                !isUnlimited
                  ? "border-indigo-600 bg-white font-medium shadow-2xs dark:border-indigo-500 dark:bg-slate-900"
                  : "border-slate-200 bg-white/50 text-slate-600 hover:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
              )}
            >
              <input
                type="radio"
                name="quota_mode"
                checked={!isUnlimited}
                onChange={() => setIsUnlimited(false)}
                className="mt-0.5 size-4 text-indigo-600 focus:ring-indigo-500"
                disabled={isPending}
              />
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Kuota Terbatas
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Maksimal jumlah peserta yang dapat menggunakan kode ini.
                </p>
                {!isUnlimited && (
                  <div className="pt-1.5">
                    <Input
                      type="number"
                      min={1}
                      max={10000}
                      value={maxUses}
                      onChange={(e) => setMaxUses(e.target.value)}
                      placeholder="Contoh: 30"
                      className="h-8 font-mono text-xs w-32"
                      disabled={isPending}
                      required={!isUnlimited}
                    />
                    {fieldErrors.max_uses && (
                      <p className="text-xs text-destructive pt-1">{fieldErrors.max_uses[0]}</p>
                    )}
                  </div>
                )}
              </div>
            </label>

            <label
              className={cn(
                "flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors",
                isUnlimited
                  ? "border-indigo-600 bg-white font-medium shadow-2xs dark:border-indigo-500 dark:bg-slate-900"
                  : "border-slate-200 bg-white/50 text-slate-600 hover:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
              )}
            >
              <input
                type="radio"
                name="quota_mode"
                checked={isUnlimited}
                onChange={() => setIsUnlimited(true)}
                className="mt-0.5 size-4 text-indigo-600 focus:ring-indigo-500"
                disabled={isPending}
              />
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <InfinityIcon className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Tanpa Batas (Unlimited)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Bebas digunakan oleh berapapun peserta tanpa batasan kuota.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Konfigurasi Batas Waktu Kedaluwarsa */}
        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="flex items-center gap-2">
            <Clock className="size-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-semibold tracking-wider text-slate-700 uppercase dark:text-slate-300">
              Masa Berlaku Kode (Kedaluwarsa)
            </span>
          </div>

          <div className="space-y-2">
            {/* Opsi 1: Selesai bersama ujian */}
            <label className="flex cursor-pointer items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300">
              <input
                type="radio"
                name="expiration_type"
                value="exam_end"
                checked={expirationType === "exam_end"}
                onChange={() => setExpirationType("exam_end")}
                disabled={isPending}
                className="size-4 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Mengikuti waktu selesai ujian (Otomatis)</span>
            </label>

            {/* Opsi 2: Kustom DateTimePicker */}
            <label className="flex cursor-pointer items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300">
              <input
                type="radio"
                name="expiration_type"
                value="custom"
                checked={expirationType === "custom"}
                onChange={() => setExpirationType("custom")}
                disabled={isPending}
                className="size-4 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Tentukan tanggal dan jam kedaluwarsa kustom</span>
            </label>

            {expirationType === "custom" && (
              <div className="pl-6 pt-1 max-w-sm">
                <DateTimePicker
                  id="expires_at"
                  name="expires_at"
                  defaultValue={customExpiresAt}
                  onChange={(val) => setCustomExpiresAt(val)}
                  disabled={isPending}
                />
                {fieldErrors.expires_at && (
                  <p className="text-xs text-destructive pt-1">{fieldErrors.expires_at[0]}</p>
                )}
              </div>
            )}

            {/* Opsi 3: Tanpa batas waktu */}
            <label className="flex cursor-pointer items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300">
              <input
                type="radio"
                name="expiration_type"
                value="never"
                checked={expirationType === "never"}
                onChange={() => setExpirationType("never")}
                disabled={isPending}
                className="size-4 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Tanpa batas waktu (Aktif selamanya sampai dinonaktifkan manual)</span>
            </label>
          </div>
        </div>

        {/* Toggle Keaktifan */}
        <div className="flex items-center gap-2 pt-1">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              disabled={isPending}
              className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>Aktifkan kode rujukan ini seketika setelah diterbitkan</span>
          </label>
        </div>

        {/* Tombol Terbitkan */}
        <div className="pt-2">
          <Button
            type="submit"
            disabled={isPending}
            className="w-full bg-indigo-600 text-white hover:bg-indigo-700 sm:w-auto"
          >
            {isPending ? (
              <Loader2 className="mr-1.5 size-4 animate-spin" />
            ) : (
              <KeyRound className="mr-1.5 size-4" />
            )}
            Terbitkan Kode Rujukan
          </Button>
        </div>
      </form>
    </div>
  );
}

