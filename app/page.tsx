import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { KeyRound, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 md:p-8">
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
              Masukkan kode rujukan yang Anda terima dari pengawas ujian.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="referral-code"
                className="text-xs font-semibold tracking-wider text-slate-600 uppercase dark:text-slate-300"
              >
                Kode Rujukan Ujian
              </label>
              <div className="relative">
                <Input
                  id="referral-code"
                  placeholder="Contoh: MAT2026-X89"
                  className="font-mono text-base tracking-wider uppercase"
                  autoComplete="off"
                  spellCheck="false"
                />
                <KeyRound className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <Button className="w-full bg-indigo-600 text-white hover:bg-indigo-700">
              Periksa Kode
            </Button>
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
    </main>
  );
}

