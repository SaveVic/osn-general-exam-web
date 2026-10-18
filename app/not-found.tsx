import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <FileQuestion className="size-6" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
        404 - Halaman Tidak Ditemukan
      </h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
        Halaman yang Anda tuju tidak tersedia atau telah dipindahkan.
      </p>
      <div className="mt-6">
        <Button asChild className="bg-indigo-600 text-white hover:bg-indigo-700">
          <Link href="/">Kembali ke Beranda</Link>
        </Button>
      </div>
    </div>
  );
}

