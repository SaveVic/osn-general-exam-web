"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft, ShieldAlert } from "lucide-react";

interface SessionTerminatedDialogProps {
  open: boolean;
  message?: string | null;
  onConfirmRedirect?: () => void;
}

export function SessionTerminatedDialog({
  open,
  message,
  onConfirmRedirect,
}: SessionTerminatedDialogProps) {
  const handleRedirect = () => {
    if (onConfirmRedirect) {
      onConfirmRedirect();
    } else {
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem("osn_exam_session_storage");
        } catch {}
        window.location.href = "/";
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="max-w-md p-6 text-center sm:p-8 [&>button]:hidden"
      >
        <DialogHeader className="flex flex-col items-center space-y-3">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
            <ShieldAlert className="size-7" />
          </div>
          <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Sesi Ujian Telah Dihapus
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {message ||
              "Sesi ujian Anda telah dihapus atau dibatalkan oleh pengawas ujian. Segala perubahan jawaban tidak dapat lagi disimpan ke server."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-left text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="flex-1 leading-relaxed">
              Hak akses pengerjaan untuk sesi ini telah dinonaktifkan. Silakan hubungi
              pengawas ujian jika Anda merasa ini adalah sebuah kekeliruan.
            </div>
          </div>

          <Button
            type="button"
            onClick={handleRedirect}
            className="w-full gap-2 bg-indigo-600 text-xs text-white hover:bg-indigo-700"
          >
            <ArrowLeft className="size-3.5" />
            <span>Kembali ke Halaman Utama</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

