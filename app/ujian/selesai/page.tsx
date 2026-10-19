import React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Home, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Ujian Selesai - Portal Ujian Teknis",
  description: "Konfirmasi penyerahan dan penyelesaian sesi pengerjaan ujian daring resmi.",
};

export default function ExamFinishedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50/70 p-4 dark:bg-slate-950">
      <Card className="w-full max-w-lg border-emerald-200/90 shadow-lg dark:border-emerald-900/60">
        <CardHeader className="space-y-3 pb-3 text-center">
          {/* Ikon Sukses Sentral */}
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 shadow-xs dark:bg-emerald-950/60 dark:text-emerald-400">
            <CheckCircle2 className="size-8" />
          </div>

          <div className="space-y-1">
            <div className="flex justify-center pb-1">
              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[11px] font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                <ShieldCheck className="mr-1 size-3" />
                Lembar Jawaban Tersegel Permanen
              </Badge>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Ujian Berhasil Dikirimkan
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
              Terima kasih telah mengikuti ujian dengan tertib.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 text-center text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          {/* Pesan Konfirmasi Resmi F4-04 */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <p className="font-medium text-slate-900 dark:text-slate-100">
              Ujian Berhasil Dikirimkan. Terima kasih telah mengikuti ujian dengan tertib.
            </p>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              Seluruh lembar pengerjaan dan jawaban Anda telah tercatat dan tersimpan secara permanen pada sistem kami.
              Sesi ujian Anda telah ditutup dan lembar jawaban tidak dapat diubah lagi.
            </p>
          </div>

          {/* Tombol Navigasi Utama */}
          <div className="pt-2">
            <Link href="/" className="block">
              <Button className="h-10 w-full gap-2 bg-indigo-600 font-medium text-white shadow-xs hover:bg-indigo-700">
                <Home className="size-4" />
                <span>Kembali ke Halaman Beranda</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

