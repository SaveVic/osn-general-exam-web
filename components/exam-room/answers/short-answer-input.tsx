"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, RotateCcw } from "lucide-react";

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
    <div className="space-y-2.5">
      <div className="relative">
        <Input
          id={`input-answer-${questionId}`}
          type="text"
          value={localValue}
          disabled={disabled}
          readOnly={disabled}
          onChange={handleChange}
          placeholder={disabled ? "Waktu ujian telah berakhir (Terkunci)" : "Ketik jawaban akhir Anda di sini..."}
          className="h-12 border-slate-300 bg-white px-4 font-mono text-base focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-900"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
          {hasValue ? (
            <>
              <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="font-medium text-emerald-700 dark:text-emerald-300">Sudah diisi</span>
            </>
          ) : (
            <span>Belum diisi</span>
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

