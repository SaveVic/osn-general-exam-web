"use client";

import React, { useState } from "react";
import type { ReferralCodeRow } from "@/types/database";
import {
  deleteReferralCodeAction,
  toggleReferralCodeAction,
} from "@/actions/referral-codes";
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
  Calendar,
  Check,
  Copy,
  ExternalLink,
  Infinity as InfinityIcon,
  KeyRound,
  Loader2,
  Power,
  Trash2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ReferralCodeListProps {
  examId: string;
  codes: ReferralCodeRow[];
}

function formatDateIndo(dateStr?: string | null): string {
  if (!dateStr) return "Selamanya (Tanpa Batas)";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function ReferralCodeList({ examId, codes }: ReferralCodeListProps) {
  const [isPending, setIsPending] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ReferralCodeRow | null>(null);

  const handleCopyCode = async (id: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCodeId(id);
      setTimeout(() => setCopiedCodeId(null), 2000);
    } catch (err) {
      console.error("Gagal menyalin kode:", err);
    }
  };

  const handleCopyLink = async (id: string, code: string) => {
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const directUrl = `${origin}/?ref=${encodeURIComponent(code)}`;
      await navigator.clipboard.writeText(directUrl);
      setCopiedLinkId(id);
      setTimeout(() => setCopiedLinkId(null), 2000);
    } catch (err) {
      console.error("Gagal menyalin tautan:", err);
    }
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    if (isPending) return;
    setIsPending(true);
    try {
      await toggleReferralCodeAction(id, examId, currentStatus);
    } finally {
      setIsPending(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || isPending) return;
    setIsPending(true);
    try {
      await deleteReferralCodeAction(deleteTarget.id, examId);
      setDeleteTarget(null);
    } finally {
      setIsPending(false);
    }
  };

  const now = new Date();

  if (codes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
          <KeyRound className="size-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Belum Ada Kode Rujukan
        </h3>
        <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
          Gunakan formulir di atas untuk menerbitkan kode rujukan pertama agar peserta dapat mulai
          mengakses naskah ujian ini.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
          Daftar Kode Rujukan ({codes.length} Kode)
        </span>
      </div>

      <div className="space-y-3">
        {codes.map((item) => {
          const isExpired = item.expires_at ? now > new Date(item.expires_at) : false;
          const isQuotaFull = item.max_uses !== null && item.current_uses >= item.max_uses;
          const quotaPercent =
            item.max_uses !== null
              ? Math.min(100, Math.round((item.current_uses / item.max_uses) * 100))
              : null;

          return (
            <div
              key={item.id}
              className={cn(
                "group relative flex flex-col justify-between gap-4 rounded-xl border bg-white p-4 shadow-2xs transition-all sm:flex-row sm:items-center dark:bg-slate-900",
                item.is_active && !isExpired && !isQuotaFull
                  ? "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
                  : "border-slate-200/60 bg-slate-50/50 opacity-80 dark:border-slate-800/60 dark:bg-slate-950/40"
              )}
            >
              {/* Kolom Kiri: Kode & Badges */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-base font-extrabold tracking-wider text-slate-900 dark:text-slate-50">
                    {item.code}
                  </span>

                  {/* Tombol Salin Kode */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyCode(item.id, item.code)}
                    className="h-7 gap-1 px-2 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                    title="Salin kode ini"
                  >
                    {copiedCodeId === item.id ? (
                      <>
                        <Check className="size-3 text-emerald-600" />
                        <span className="text-[11px] font-semibold text-emerald-600">Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3" />
                        <span className="text-[11px]">Salin Kode</span>
                      </>
                    )}
                  </Button>

                  {/* Tombol Salin Tautan Langsung */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyLink(item.id, item.code)}
                    className="h-7 gap-1 px-2 text-xs text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
                    title="Salin tautan masuk langsung (/?ref=...)"
                  >
                    {copiedLinkId === item.id ? (
                      <>
                        <Check className="size-3 text-emerald-600" />
                        <span className="text-[11px] font-semibold text-emerald-600">Tautan Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <ExternalLink className="size-3" />
                        <span className="text-[11px]">Salin Tautan</span>
                      </>
                    )}
                  </Button>
                </div>

                {/* Badge Status */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {item.is_active ? (
                    <Badge className="bg-emerald-600 text-white dark:bg-emerald-500">
                      Aktif
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-slate-300 text-slate-500 dark:border-slate-700">
                      Nonaktif
                    </Badge>
                  )}

                  {isExpired && (
                    <Badge variant="destructive">
                      Kedaluwarsa
                    </Badge>
                  )}

                  {isQuotaFull && (
                    <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                      Kuota Habis
                    </Badge>
                  )}
                </div>

                {/* Info Kuota & Masa Berlaku */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-slate-500 dark:text-slate-400">
                  {/* Pemakaian Kuota */}
                  <div className="flex items-center gap-1.5">
                    <Users className="size-3.5 text-slate-400" />
                    <span>
                      Kuota:{" "}
                      <strong className="font-mono text-slate-800 dark:text-slate-200">
                        {item.current_uses}
                      </strong>
                      {" / "}
                      {item.max_uses !== null ? (
                        <span className="font-mono">{item.max_uses} Peserta</span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5">
                          <InfinityIcon className="inline size-3" />
                          <span>(Tanpa Batas)</span>
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Masa Berlaku */}
                  <div className="flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-slate-400" />
                    <span suppressHydrationWarning>
                      Berlaku: {formatDateIndo(item.expires_at)}
                    </span>
                  </div>
                </div>

                {/* Mini Bar Kuota */}
                {quotaPercent !== null && (
                  <div className="w-full max-w-xs pt-0.5">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className={cn(
                          "h-full transition-all",
                          quotaPercent >= 100
                            ? "bg-red-500"
                            : quotaPercent >= 80
                            ? "bg-amber-500"
                            : "bg-indigo-600 dark:bg-indigo-400"
                        )}
                        style={{ width: `${quotaPercent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Kolom Kanan: Tombol Aksi */}
              <div className="flex items-center gap-1.5 self-end sm:self-center">
                {/* Toggle Aktif / Nonaktif */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggle(item.id, item.is_active)}
                  disabled={isPending}
                  className={cn(
                    "h-8 gap-1 border-slate-300 text-xs dark:border-slate-700",
                    item.is_active
                      ? "text-slate-600 hover:text-red-600"
                      : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                  )}
                  title={item.is_active ? "Nonaktifkan kode ini" : "Aktifkan kembali kode ini"}
                >
                  <Power className="size-3" />
                  <span>{item.is_active ? "Nonaktifkan" : "Aktifkan"}</span>
                </Button>

                {/* Hapus */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteTarget(item)}
                  disabled={isPending}
                  className="size-8 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                  title="Hapus kode rujukan"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dialog Konfirmasi Hapus */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Hapus Kode Rujukan</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus kode rujukan{" "}
              <strong className="font-mono text-slate-900 dark:text-slate-100">
                {deleteTarget?.code}
              </strong>
              ?
              {deleteTarget && deleteTarget.current_uses > 0 && (
                <span className="block pt-2 font-medium text-destructive">
                  Perhatian: Kode ini telah digunakan oleh {deleteTarget.current_uses} sesi peserta.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isPending}
            >
              {isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              Hapus Kode
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

