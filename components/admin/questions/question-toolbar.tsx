"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Strikethrough,
  Quote,
  Code2,
  Table,
  Sigma,
  FunctionSquare,
  Divide,
  ChevronDown,
  ImageIcon,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface QuestionToolbarProps {
  onInsert: (prefix: string, suffix?: string, defaultPlaceholder?: string) => void;
  onOpenImageModal?: () => void;
  disabled?: boolean;
}

const MATH_SYMBOLS = [
  { label: "≤", tex: "\\le " },
  { label: "≥", tex: "\\ge " },
  { label: "≠", tex: "\\ne " },
  { label: "≈", tex: "\\approx " },
  { label: "±", tex: "\\pm " },
  { label: "×", tex: "\\times " },
  { label: "÷", tex: "\\div " },
  { label: "∞", tex: "\\infty " },
  { label: "π", tex: "\\pi " },
  { label: "α", tex: "\\alpha " },
  { label: "β", tex: "\\beta " },
  { label: "θ", tex: "\\theta " },
  { label: "Δ", tex: "\\Delta " },
  { label: "λ", tex: "\\lambda " },
  { label: "∑", tex: "\\sum_{i=1}^{n} " },
  { label: "∏", tex: "\\prod_{i=1}^{n} " },
  { label: "∫", tex: "\\int_{a}^{b} f(x) dx " },
  { label: "lim", tex: "\\lim_{x \\to \\infty} " },
  { label: "O(1)", tex: "O(1)" },
  { label: "O(N)", tex: "O(N)" },
  { label: "O(N log N)", tex: "O(N \\log N)" },
  { label: "O(N²)", tex: "O(N^2)" },
];

export function QuestionToolbar({
  onInsert,
  onOpenImageModal,
  disabled = false,
}: QuestionToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-t-lg border border-b-0 border-slate-200 bg-slate-50 p-1.5 dark:border-slate-800 dark:bg-slate-900/60">
      {/* Format Teks */}
      <div className="flex items-center gap-0.5 border-r border-slate-200 pr-1.5 dark:border-slate-800">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          onClick={() => onInsert("**", "**", "teks tebal")}
          title="Tebal (Bold) - **teks**"
          className="size-8 text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Bold className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          onClick={() => onInsert("*", "*", "teks miring")}
          title="Miring (Italic) - *teks*"
          className="size-8 text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Italic className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          onClick={() => onInsert("~~", "~~", "teks coret")}
          title="Coret (Strikethrough) - ~~teks~~"
          className="size-8 text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Strikethrough className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          onClick={() => onInsert("> ", "", "kutipan atau catatan penting")}
          title="Kutipan (Quote) - >"
          className="size-8 text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Quote className="size-4" />
        </Button>
      </div>

      {/* Formula Matematika LaTeX */}
      <div className="flex items-center gap-0.5 border-r border-slate-200 pr-1.5 dark:border-slate-800">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={() => onInsert("$", "$", "E = mc^2")}
          title="Formula Inline - $...$"
          className="h-8 px-2 font-mono text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
        >
          $x$
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={() => onInsert("$$\n", "\n$$", "\\sum_{i=1}^n i = \\frac{n(n+1)}{2}")}
          title="Formula Display - $$...$$"
          className="h-8 px-2 font-mono text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
        >
          $$X$$
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          onClick={() => onInsert("\\frac{", "}{penyebut}", "pembilang")}
          title="Pecahan - \\frac{a}{b}"
          className="size-8 text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Divide className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          onClick={() => onInsert("\\sqrt{", "}", "x")}
          title="Akar Kuadrat - \\sqrt{x}"
          className="size-8 text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <FunctionSquare className="size-4" />
        </Button>

        {/* Popover Simbol Matematika */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              className="h-8 gap-1 px-1.5 text-xs text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Sigma className="size-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Simbol</span>
              <ChevronDown className="size-3 opacity-60" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2">
            <div className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
              Pintasan Simbol & Notasi Matematika
            </div>
            <div className="grid grid-cols-4 gap-1">
              {MATH_SYMBOLS.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => onInsert(s.tex, "", "")}
                  className="rounded-md border border-slate-200 p-1 font-mono text-xs text-slate-800 hover:border-indigo-500 hover:bg-indigo-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-indigo-950/40"
                  title={s.tex}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Blok Kode Pemrograman */}
      <div className="flex items-center gap-0.5 border-r border-slate-200 pr-1.5 dark:border-slate-800">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              className="h-8 gap-1 px-1.5 text-xs text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Code2 className="size-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Kode</span>
              <ChevronDown className="size-3 opacity-60" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-52 p-2">
            <div className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
              Sisipkan Templat Bahasa
            </div>
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() =>
                  onInsert(
                    "```cpp\n#include <iostream>\nusing namespace std;\n\nint main() {\n    ",
                    "\n    return 0;\n}\n```",
                    "// Tulis kode C++ di sini"
                  )
                }
                className="rounded-md px-2 py-1 text-left font-mono text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                C++ (OSN Informatika)
              </button>
              <button
                type="button"
                onClick={() =>
                  onInsert("```python\ndef solve():\n    ", "\n\nsolve()\n```", "pass")
                }
                className="rounded-md px-2 py-1 text-left font-mono text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Python
              </button>
              <button
                type="button"
                onClick={() =>
                  onInsert(
                    "```pascal\nprogram Solusi;\nbegin\n    ",
                    "\nend.\n```",
                    "writeln('Halo');"
                  )
                }
                className="rounded-md px-2 py-1 text-left font-mono text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Pascal
              </button>
              <button
                type="button"
                onClick={() => onInsert("```\n", "\n```", "// teks kode bebas")}
                className="rounded-md px-2 py-1 text-left font-mono text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cuplikan Umum (Plain)
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Tabel Markdown */}
      <div className="flex items-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={() =>
            onInsert(
              "\n| No | Variabel | Nilai |\n| :--- | :--- | :--- |\n| 1 | ",
              " | 100 |\n| 2 | Data B | 200 |\n",
              "Data A"
            )
          }
          title="Sisipkan Tabel Markdown 3x3"
          className="h-8 gap-1 px-1.5 text-xs text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Table className="size-3.5" />
          <span className="hidden sm:inline">Tabel</span>
        </Button>
      </div>

      {/* Unggah Diagram Gambar */}
      {onOpenImageModal && (
        <div className="flex items-center gap-0.5 border-l border-slate-200 pl-1.5 dark:border-slate-800">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={onOpenImageModal}
            title="Unggah / Pilih Diagram Gambar"
            className="h-8 gap-1 px-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
          >
            <ImageIcon className="size-3.5" />
            <span>Diagram</span>
          </Button>
        </div>
      )}
    </div>
  );
}

