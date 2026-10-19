"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, Edit3, RotateCcw } from "lucide-react";

interface ShortAnswerInputProps {
  questionId: string;
  currentText?: string;
  disabled?: boolean;
  onChangeText: (text: string) => void;
  onClearText: () => void;
}

export function ShortAnswerInput({
  questionId,
  currentText = "",
  disabled = false,
  onChangeText,
  onClearText,
}: ShortAnswerInputProps) {
  const [localValue, setLocalValue] = useState(currentText);

  // Sinkronisasi jika questionId berubah saat navigasi
  useEffect(() => {
    setLocalValue(currentText);
  }, [questionId, currentText]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const val = e.target.value;
    setLocalValue(val);
    onChangeText(val);
  };

  const hasValue = localValue.trim().length > 0;

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/60">
      <div className="space-y-1.5">
        <label
          htmlFor={`input-answer-${questionId}`}
          className="flex items-center gap-2 text-xs font-semibold tracking-wider text-slate-700 uppercase dark:text-slate-300"
        >
          <Edit3 className="size-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Kolom Jawaban Isian Singkat:</span>
        </label>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Tuliskan jawaban akhir Anda sesuai ketentuan naskah soal (tanpa spasi berlebih atau satuan jika tidak diminta).
        </p>
      </div>

      <div className="relative">
        <Input
          id={`input-answer-${questionId}`}
          type="text"
          value={localValue}
          disabled={disabled}
          readOnly={disabled}
          onChange={handleChange}
          placeholder={disabled ? "Waktu ujian telah berakhir (Terkunci)" : "Ketik jawaban akhir Anda di sini..."}
          className="h-12 border-slate-300 bg-slate-50 px-4 font-mono text-base focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-950/60"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <div className="flex items-center justify-between pt-1 text-xs">
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
          {hasValue ? (
            <>
              <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="font-medium text-emerald-700 dark:text-emerald-300">Tersimpan di perangkat</span>
            </>
          ) : (
            <span>Belum ada jawaban yang diisi</span>
          )}
        </div>

        {!disabled && hasValue && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setLocalValue("");
              onClearText();
            }}
            className="h-7 gap-1.5 px-2 text-xs text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400"
          >
            <RotateCcw className="size-3" />
            <span>Hapus Jawaban</span>
          </Button>
        )}
      </div>
    </div>
  );
}

