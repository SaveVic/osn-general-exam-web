"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";

interface ClassOptionsInputProps {
  initialClasses?: string[];
  name?: string;
  disabled?: boolean;
}

export function ClassOptionsInput({
  initialClasses = [],
  name = "class_options",
  disabled = false,
}: ClassOptionsInputProps) {
  const [classes, setClasses] = useState<string[]>(initialClasses);
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleAddClass = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    if (classes.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      setError(`Kelas "${trimmed}" sudah ada di dalam daftar.`);
      return;
    }

    setClasses((prev) => [...prev, trimmed]);
    setInputValue("");
    setError(null);
  };

  const handleRemoveClass = (indexToRemove: number) => {
    setClasses((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddClass();
    }
  };

  return (
    <div className="space-y-3">
      {/* Hidden input untuk menyertakan data array sebagai JSON string pada FormData */}
      <input type="hidden" name={name} value={JSON.stringify(classes)} />

      <div className="flex gap-2">
        <Input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Contoh: 10-IPA-1, 12-MIPA-2"
          disabled={disabled}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleAddClass}
          disabled={disabled || !inputValue.trim()}
          className="shrink-0"
          aria-label="Tambah"
          title="Tambah"
        >
          <Plus className="size-4" />
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* Chip/Tags Container */}
      <div className="flex flex-wrap gap-2">
        {classes.length === 0 ? (
          <p className="text-xs text-slate-400 italic dark:text-slate-500">
            Belum ada opsi kelas. Tambahkan minimal 1 kelas agar peserta dapat memilih.
          </p>
        ) : (
          classes.map((cls, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1.5 rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
            >
              {cls}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveClass(index)}
                  className="rounded-xs text-indigo-500 hover:bg-indigo-200/50 hover:text-indigo-900 dark:hover:bg-indigo-900 dark:hover:text-indigo-100"
                  aria-label={`Hapus kelas ${cls}`}
                >
                  <X className="size-3" />
                </button>
              )}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

