"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useExamGateStore } from "@/lib/stores/exam-gate-store";
import { verifyReferralCodeAction } from "@/actions/gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AlertCircle, ArrowRight, Clipboard, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";

export function ReferralGateCard() {
  const searchParams = useSearchParams();
  const hasAutoCheckedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const code = useExamGateStore((state) => state.code);
  const isVerifying = useExamGateStore((state) => state.isVerifying);
  const error = useExamGateStore((state) => state.error);
  const setCode = useExamGateStore((state) => state.setCode);
  const setVerifying = useExamGateStore((state) => state.setVerifying);
  const setError = useExamGateStore((state) => state.setError);
  const setVerifiedData = useExamGateStore((state) => state.setVerifiedData);

  // Fungsi verifikasi kode
  const handleVerify = useCallback(async (targetCode: string) => {
    const trimmed = targetCode.trim().toUpperCase();
    if (!trimmed) {
      setError("Silakan masukkan kode rujukan terlebih dahulu.");
      return;
    }

    setVerifying(true);
    try {
      const res = await verifyReferralCodeAction(trimmed);
      if (res.success && res.data) {
        setVerifiedData(res.data);
      } else {
        setError(res.message || "Kode rujukan tidak valid atau kuota pengerjaan telah habis.");
      }
    } catch {
      setError("Terjadi kesalahan koneksi saat memeriksa kode rujukan.");
    }
  }, [setError, setVerifying, setVerifiedData]);

  // Deteksi otomatis parameter URL `?ref=KODE`
  useEffect(() => {
    const refParam = searchParams.get("ref");
    if (refParam && !hasAutoCheckedRef.current) {
      hasAutoCheckedRef.current = true;
      const cleanRef = refParam.trim().toUpperCase();
      setCode(cleanRef);
      handleVerify(cleanRef);
    }
  }, [searchParams, setCode, handleVerify]);

  // Tempel kode dari clipboard jika didukung
  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          const upper = text.trim().toUpperCase();
          setCode(upper);
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }
      }
    } catch {
      // Abaikan jika peramban menolak izin clipboard
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isVerifying) {
      handleVerify(code);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
          <ShieldCheck className="size-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Portal Ujian Teknis
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Platform ujian presisi dengan integritas waktu dan tipografi terstandar.
        </p>
      </div>

      <Card className="border-slate-200 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg">Masuk Sesi Ujian</CardTitle>
          <CardDescription>
            Masukkan kode rujukan yang Anda terima dari pengawas ujian untuk membuka akses naskah.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="referral-code"
                  className="text-xs font-semibold tracking-wider text-slate-600 uppercase dark:text-slate-300"
                >
                  Kode Rujukan Ujian
                </label>
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                  title="Tempel dari Clipboard"
                >
                  <Clipboard className="size-3" />
                  <span>Tempel</span>
                </button>
              </div>

              <div className="relative">
                <Input
                  ref={inputRef}
                  id="referral-code"
                  name="referralCode"
                  placeholder="Contoh: MAT2026-X89"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="pr-10 font-mono text-base tracking-widest uppercase"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck="false"
                  disabled={isVerifying}
                  autoFocus
                />
                <KeyRound className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <div className="flex-1 leading-relaxed">
                  {error}
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={isVerifying || !code.trim()}
              className="w-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  <span>Memeriksa Kode...</span>
                </>
              ) : (
                <>
                  <span>Periksa Kode</span>
                  <ArrowRight className="ml-2 size-4" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <footer className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500">
        <p>
          Memerlukan akses pengelola?{" "}
          <Link
            href="/admin/masuk"
            className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Masuk Administrator
          </Link>
        </p>
      </footer>
    </div>
  );
}

