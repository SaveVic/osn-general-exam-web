"use client";

import { useActionState } from "react";
import { createExamAction, updateExamAction, type ExamActionState } from "@/actions/exams";
import type { ExamRow } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ClassOptionsInput } from "@/components/admin/class-options-input";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { AlertCircle, CheckCircle2, Clock, Globe, Loader2, Save } from "lucide-react";
import Link from "next/link";

interface ExamFormProps {
  initialData?: ExamRow;
  mode?: "create" | "edit";
}

const initialState: ExamActionState = {
  success: false,
};

function toLocalInput(dateString?: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export function ExamForm({ initialData, mode = "create" }: ExamFormProps) {
  const isEdit = mode === "edit" && !!initialData;

  const boundUpdateAction = isEdit
    ? updateExamAction.bind(null, initialData.id)
    : createExamAction;

  const [state, formAction, isPending] = useActionState(boundUpdateAction, initialState);

  // Default waktu mulai: sekarang, selesai: 2 jam kemudian
  const now = new Date();
  const defaultStart = toLocalInput(initialData?.starts_at || now.toISOString());
  const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const defaultEnd = toLocalInput(initialData?.ends_at || twoHoursLater.toISOString());

  return (
    <form action={formAction} className="space-y-6">
      {state.message && (
        <Alert
          variant={state.success ? "default" : "destructive"}
          className={
            state.success
              ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
              : undefined
          }
        >
          {state.success ? (
            <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="size-4" />
          )}
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      {/* Field: Judul Ujian */}
      <div className="space-y-2">
        <label
          htmlFor="title"
          className="text-xs font-semibold tracking-wider text-slate-700 uppercase dark:text-slate-300"
        >
          Judul Naskah Ujian <span className="text-destructive">*</span>
        </label>
        <Input
          id="title"
          name="title"
          type="text"
          defaultValue={initialData?.title || ""}
          placeholder="Contoh: Simulasi OSN Bidang Informatika 2026"
          disabled={isPending}
          required
        />
        {state.errors?.title && (
          <p className="text-xs text-destructive">{state.errors.title[0]}</p>
        )}
      </div>

      {/* Field: Petunjuk Teknis & Deskripsi */}
      <div className="space-y-2">
        <label
          htmlFor="description"
          className="text-xs font-semibold tracking-wider text-slate-700 uppercase dark:text-slate-300"
        >
          Petunjuk Teknis / Deskripsi Pengerjaan
        </label>
        <Textarea
          id="description"
          name="description"
          defaultValue={initialData?.description || ""}
          placeholder="Tuliskan petunjuk pengerjaan ujian dalam format teks atau Markdown..."
          rows={4}
          disabled={isPending}
        />
        <p className="text-xs text-slate-400">
          Mendukung format Markdown standar (teks tebal, miring, daftar butir, dan rumus LaTeX).
        </p>
      </div>

      {/* Grid: Durasi & Jadwal Waktu */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {/* Durasi */}
        <div className="space-y-2">
          <label
            htmlFor="duration_minutes"
            className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-slate-700 uppercase dark:text-slate-300"
          >
            <Clock className="size-3.5 text-indigo-600 dark:text-indigo-400" />
            Durasi (Menit) <span className="text-destructive">*</span>
          </label>
          <Input
            id="duration_minutes"
            name="duration_minutes"
            type="number"
            min={1}
            max={600}
            defaultValue={initialData?.duration_minutes ?? 90}
            disabled={isPending}
            required
            className="font-mono"
          />
          {state.errors?.duration_minutes && (
            <p className="text-xs text-destructive">{state.errors.duration_minutes[0]}</p>
          )}
        </div>

        {/* Waktu Mulai */}
        <div className="space-y-2">
          <label
            htmlFor="starts_at"
            className="text-xs font-semibold tracking-wider text-slate-700 uppercase dark:text-slate-300"
          >
            Waktu Mulai <span className="text-destructive">*</span>
          </label>
          <DateTimePicker
            id="starts_at"
            name="starts_at"
            defaultValue={defaultStart}
            disabled={isPending}
          />
          {state.errors?.starts_at && (
            <p className="text-xs text-destructive">{state.errors.starts_at[0]}</p>
          )}
        </div>

        {/* Waktu Selesai */}
        <div className="space-y-2">
          <label
            htmlFor="ends_at"
            className="text-xs font-semibold tracking-wider text-slate-700 uppercase dark:text-slate-300"
          >
            Waktu Selesai <span className="text-destructive">*</span>
          </label>
          <DateTimePicker
            id="ends_at"
            name="ends_at"
            defaultValue={defaultEnd}
            disabled={isPending}
          />
          {state.errors?.ends_at && (
            <p className="text-xs text-destructive">{state.errors.ends_at[0]}</p>
          )}
        </div>
      </div>

      {/* Field: Opsi Pilihan Kelas */}
      <div className="space-y-2">
        <label className="text-xs font-semibold tracking-wider text-slate-700 uppercase dark:text-slate-300">
          Daftar Pilihan Kelas Peserta <span className="text-destructive">*</span>
        </label>
        <ClassOptionsInput
          initialClasses={initialData?.class_options || ["10-A", "10-B"]}
          name="class_options"
          disabled={isPending}
        />
        {state.errors?.class_options && (
          <p className="text-xs text-destructive">{state.errors.class_options[0]}</p>
        )}
      </div>

      {/* Field: Status Publikasi */}
      <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            name="is_published"
            defaultChecked={initialData?.is_published ?? false}
            disabled={isPending}
            className="mt-0.5 size-4 rounded-xs border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950"
          />
          <div className="space-y-0.5">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <Globe className="size-4 text-indigo-600 dark:text-indigo-400" />
              Publikasikan Naskah Ujian Sekarang
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Jika aktif, peserta dapat mengakses informasi ujian menggunakan kode rujukan yang sah.
              Jika nonaktif, ujian berstatus Draf dan hanya dapat dilihat oleh pengelola.
            </p>
          </div>
        </label>
      </div>

      {/* Tombol Aksi */}
      <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
        <Button asChild variant="outline" disabled={isPending}>
          <Link href="/admin/dasbor">Batal</Link>
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          className="gap-2 bg-indigo-600 text-white hover:bg-indigo-700"
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Menyimpan Naskah...
            </>
          ) : (
            <>
              <Save className="size-4" />
              {isEdit ? "Simpan Perubahan" : "Buat Naskah Ujian"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

