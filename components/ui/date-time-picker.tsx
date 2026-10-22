"use client";

import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock } from "lucide-react";

interface DateTimePickerProps {
  id?: string;
  name: string;
  defaultValue?: string;
  value?: string;
  onChange?: (val: string) => void;
  disabled?: boolean;
  className?: string;
}

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const DAY_NAMES = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

const TIME_PRESETS = ["07:30", "08:00", "09:00", "10:00", "13:00", "14:00", "15:30", "16:00"];

function parseInitialDate(dateStr?: string): Date {
  if (!dateStr) return new Date();
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date() : d;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function formatToInputString(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function formatDisplayDate(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function DateTimePicker({
  id,
  name,
  defaultValue,
  value,
  onChange,
  disabled = false,
  className,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);

  // Nilai tanggal dan waktu terpilih
  const [selectedDate, setSelectedDate] = React.useState<Date>(() =>
    parseInitialDate(value || defaultValue)
  );

  // Bulan dan tahun yang sedang ditampilkan di kalender
  const [viewYear, setViewYear] = React.useState<number>(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = React.useState<number>(selectedDate.getMonth());

  // Sinkronisasi jika prop value berubah
  React.useEffect(() => {
    if (value) {
      const d = parseInitialDate(value);
      setSelectedDate(d);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [value]);

  const updateDate = (newDate: Date) => {
    setSelectedDate(newDate);
    const formatted = formatToInputString(newDate);
    if (onChange) onChange(formatted);
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const next = new Date(selectedDate);
    next.setFullYear(viewYear);
    next.setMonth(viewMonth);
    next.setDate(day);
    updateDate(next);
  };

  const handleHourChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = new Date(selectedDate);
    next.setHours(parseInt(e.target.value, 10));
    updateDate(next);
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = new Date(selectedDate);
    next.setMinutes(parseInt(e.target.value, 10));
    updateDate(next);
  };

  const handlePresetTime = (preset: string) => {
    const [h, m] = preset.split(":").map((v) => parseInt(v, 10));
    const next = new Date(selectedDate);
    next.setHours(h);
    next.setMinutes(m);
    updateDate(next);
  };

  const handlePresetDate = (daysFromNow: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysFromNow);
    const next = new Date(selectedDate);
    next.setFullYear(target.getFullYear());
    next.setMonth(target.getMonth());
    next.setDate(target.getDate());
    setViewYear(target.getFullYear());
    setViewMonth(target.getMonth());
    updateDate(next);
  };

  // Kalkulasi hari dalam bulan untuk kalender
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // Mulai Senin (0=Senin, 6=Minggu)

  const today = new Date();
  const isToday = (day: number) =>
    today.getDate() === day &&
    today.getMonth() === viewMonth &&
    today.getFullYear() === viewYear;

  const isSelected = (day: number) =>
    selectedDate.getDate() === day &&
    selectedDate.getMonth() === viewMonth &&
    selectedDate.getFullYear() === viewYear;

  const formattedFormValue = formatToInputString(selectedDate);

  return (
    <div className={cn("relative", className)}>
      {/* Hidden input yang disubmit bersama form */}
      <input type="hidden" id={id} name={name} value={formattedFormValue} />

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="w-full justify-between border-slate-300 bg-white font-normal text-slate-900 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:hover:bg-slate-900"
          >
            <span className="flex items-center gap-2 truncate">
              <CalendarIcon className="size-4 text-indigo-600 dark:text-indigo-400" />
              <span className="font-mono text-xs sm:text-sm" suppressHydrationWarning>
                {formatDisplayDate(selectedDate)}
              </span>
            </span>
            <Clock className="size-4 shrink-0 text-slate-400" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          className="w-auto border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex flex-col gap-4 sm:flex-row">
            {/* Sisi Kiri: Kalender Tanggal */}
            <div className="w-64 space-y-3">
              {/* Header Kalender */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 text-slate-600 dark:text-slate-400"
                    onClick={handlePrevMonth}
                  >
                    <ChevronLeft className="size-4" />
                    <span className="sr-only">Bulan sebelumnya</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 text-slate-600 dark:text-slate-400"
                    onClick={handleNextMonth}
                  >
                    <ChevronRight className="size-4" />
                    <span className="sr-only">Bulan selanjutnya</span>
                  </Button>
                </div>
              </div>

              {/* Pintasan Tanggal Cepat */}
              <div className="flex gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => handlePresetDate(0)}
                  className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Hari Ini
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetDate(1)}
                  className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Besok
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetDate(7)}
                  className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  +1 Minggu
                </button>
              </div>

              {/* Grid Nama Hari */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400 dark:text-slate-500">
                {DAY_NAMES.map((name) => (
                  <div key={name} className="py-0.5">
                    {name}
                  </div>
                ))}
              </div>

              {/* Grid Angka Tanggal */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {/* Spasi kosong sebelum hari pertama */}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}

                {/* Butir hari */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const selected = isSelected(day);
                  const currentToday = isToday(day);

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleSelectDay(day)}
                      className={cn(
                        "flex size-8 items-center justify-center rounded-md font-mono transition-colors",
                        selected
                          ? "bg-indigo-600 font-bold text-white shadow-xs"
                          : currentToday
                          ? "border border-indigo-400 font-semibold text-indigo-600 hover:bg-indigo-50 dark:border-indigo-500 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
                          : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      )}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Garis Pemisah Responsif */}
            <div className="hidden border-l border-slate-200 sm:block dark:border-slate-800" />
            <div className="border-t border-slate-200 sm:hidden dark:border-slate-800" />

            {/* Sisi Kanan: Pemilih Jam & Menit */}
            <div className="w-52 space-y-3">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Waktu Pelaksanaan
              </span>

              {/* Pilihan Jam dan Menit */}
              <div className="flex items-center gap-2">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase dark:text-slate-400">
                    Jam
                  </label>
                  <select
                    value={selectedDate.getHours()}
                    onChange={handleHourChange}
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 font-mono text-sm text-slate-900 shadow-xs focus:border-indigo-600 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
                  >
                    {Array.from({ length: 24 }).map((_, h) => (
                      <option key={h} value={h}>
                        {pad(h)}:00
                      </option>
                    ))}
                  </select>
                </div>

                <span className="mt-4 font-bold text-slate-400">:</span>

                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase dark:text-slate-400">
                    Menit
                  </label>
                  <select
                    value={selectedDate.getMinutes()}
                    onChange={handleMinuteChange}
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 font-mono text-sm text-slate-900 shadow-xs focus:border-indigo-600 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
                  >
                    {Array.from({ length: 60 }).map((_, m) => (
                      <option key={m} value={m}>
                        {pad(m)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pintasan Jam Cepat */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold text-slate-500 uppercase dark:text-slate-400">
                  Preset Jam Ujian
                </span>
                <div className="grid grid-cols-4 gap-1">
                  {TIME_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handlePresetTime(preset)}
                      className={cn(
                        "rounded-md border px-1.5 py-1 text-center font-mono text-xs transition-colors",
                        pad(selectedDate.getHours()) + ":" + pad(selectedDate.getMinutes()) === preset
                          ? "border-indigo-600 bg-indigo-50 font-bold text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/50 dark:text-indigo-300"
                          : "border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
                      )}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tombol Konfirmasi Selesai */}
              <div className="pt-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setOpen(false)}
                  className="w-full bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  Pilih Waktu Ini
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
