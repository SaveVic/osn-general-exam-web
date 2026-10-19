"use client";

import React, { useState, useRef } from "react";
import type { QuestionRow, QuestionType } from "@/types/database";
import type { ChoiceOption, QuestionInput } from "@/lib/validations/question";
import { createQuestionAction, updateQuestionAction } from "@/actions/questions";
import { uploadExamAssetAction } from "@/actions/storage";
import { QuestionToolbar } from "./question-toolbar";
import { ImageUploadModal } from "./image-upload-modal";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  CheckCircle2,
  CheckSquare,
  HelpCircle,
  Loader2,
  Plus,
  Radio,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuestionEditorProps {
  examId: string;
  initialQuestion?: QuestionRow | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

interface StoredCorrectAnswer {
  selected?: string | string[];
  text?: string;
  numeric_tolerance?: number;
  case_sensitive?: boolean;
}

function getNextOptionId(options: ChoiceOption[]): string {
  const used = new Set(options.map((o) => o.id.toUpperCase()));
  for (let i = 0; i < ALPHABET.length; i++) {
    if (!used.has(ALPHABET[i])) return ALPHABET[i];
  }
  return `O${options.length + 1}`;
}

export function QuestionEditor({
  examId,
  initialQuestion,
  onSuccess,
  onCancel,
}: QuestionEditorProps) {
  const isEdit = Boolean(initialQuestion);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Parsing data awal jika mode edit
  const initialType: QuestionType = initialQuestion?.question_type || "single_choice";
  const initialOptions: ChoiceOption[] = Array.isArray(initialQuestion?.options)
    ? (initialQuestion.options as ChoiceOption[])
    : [
        { id: "A", text: "" },
        { id: "B", text: "" },
        { id: "C", text: "" },
        { id: "D", text: "" },
      ];

  const initialCorrect = initialQuestion?.correct_answer as StoredCorrectAnswer | undefined;

  // State form
  const [questionType, setQuestionType] = useState<QuestionType>(initialType);
  const [prompt, setPrompt] = useState<string>(
    initialQuestion?.prompt || "Diberikan persamaan kuadrat $x^2 - 5x + 6 = 0$.\n\nTentukan nilai dari akar-akar persamaan tersebut!"
  );
  const [points, setPoints] = useState<number>(initialQuestion?.points ?? 1);
  const [options, setOptions] = useState<ChoiceOption[]>(initialOptions);

  // Kunci jawaban state
  const [singleCorrect, setSingleCorrect] = useState<string>(
    initialType === "single_choice" && typeof initialCorrect?.selected === "string"
      ? initialCorrect.selected
      : "A"
  );
  const [multiCorrect, setMultiCorrect] = useState<string[]>(
    initialType === "multiple_choice" && Array.isArray(initialCorrect?.selected)
      ? initialCorrect.selected
      : ["A"]
  );
  const [shortAnswer, setShortAnswer] = useState<{
    text: string;
    numeric_tolerance: number;
    case_sensitive: boolean;
  }>({
    text: initialType === "short_answer" && initialCorrect?.text ? initialCorrect.text : "",
    numeric_tolerance: initialCorrect?.numeric_tolerance ?? 0,
    case_sensitive: initialCorrect?.case_sensitive ?? false,
  });

  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Handler Toolbar Insert ke posisi kursor textarea
  const handleInsert = (prefix: string, suffix = "", defaultPlaceholder = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = prompt.substring(start, end);
    const textToInsert = selectedText || defaultPlaceholder;
    const newContent =
      prompt.substring(0, start) + prefix + textToInsert + suffix + prompt.substring(end);

    setPrompt(newContent);

    setTimeout(() => {
      textarea.focus();
      const cursorStart = start + prefix.length;
      const cursorEnd = cursorStart + textToInsert.length;
      textarea.setSelectionRange(cursorStart, cursorEnd);
    }, 0);
  };

  // State untuk modal gambar & drag-and-drop
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isTextareaDragging, setIsTextareaDragging] = useState(false);
  const [isUploadingDroppedFile, setIsUploadingDroppedFile] = useState(false);

  // Injeksi sintaks gambar markdown
  const handleInsertImage = (url: string, altText: string) => {
    handleInsert(`\n![${altText || "Diagram"}](${url})\n`, "", "");
  };

  // Drag and drop gambar langsung ke textarea
  const handleTextareaDragOver = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    setIsTextareaDragging(true);
  };

  const handleTextareaDragLeave = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    setIsTextareaDragging(false);
  };

  const handleTextareaDrop = async (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    setIsTextareaDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"];
      if (!allowed.includes(droppedFile.type)) {
        setErrorMessage("Format berkas tidak didukung. Harap seret gambar PNG, JPG, WebP, atau SVG.");
        return;
      }
      if (droppedFile.size > 2 * 1024 * 1024) {
        setErrorMessage("Ukuran berkas melebihi batas maksimal 2 MB.");
        return;
      }

      setIsUploadingDroppedFile(true);
      setErrorMessage(null);

      const formData = new FormData();
      formData.append("file", droppedFile);
      formData.append("alt_text", droppedFile.name.replace(/\.[^/.]+$/, ""));

      try {
        const result = await uploadExamAssetAction(examId, formData);
        if (result.success && result.url) {
          handleInsertImage(result.url, result.altText || "Diagram");
        } else {
          setErrorMessage(result.message || "Gagal mengunggah berkas gambar yang diseret.");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Gagal mengunggah berkas gambar.";
        setErrorMessage(msg);
      } finally {
        setIsUploadingDroppedFile(false);
      }
    }
  };

  // Handler Opsi Jawaban
  const handleAddOption = () => {
    if (options.length >= 10) return;
    const newId = getNextOptionId(options);
    setOptions([...options, { id: newId, text: "" }]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) return;
    const removedId = options[index].id;
    const nextOptions = options.filter((_, i) => i !== index);
    setOptions(nextOptions);

    // Bersihkan kunci jika terhapus
    if (singleCorrect === removedId) {
      setSingleCorrect(nextOptions[0]?.id || "A");
    }
    if (multiCorrect.includes(removedId)) {
      setMultiCorrect(multiCorrect.filter((id) => id !== removedId));
    }
  };

  const handleOptionTextChange = (index: number, text: string) => {
    const nextOptions = [...options];
    nextOptions[index] = { ...nextOptions[index], text };
    setOptions(nextOptions);
  };

  const handleToggleMultiCorrect = (optionId: string) => {
    if (multiCorrect.includes(optionId)) {
      if (multiCorrect.length <= 1) return; // minimal 1 kunci
      setMultiCorrect(multiCorrect.filter((id) => id !== optionId));
    } else {
      setMultiCorrect([...multiCorrect, optionId]);
    }
  };

  // Submit Handler
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    setErrorMessage(null);
    setFieldErrors({});

    let correctAnswerPayload: StoredCorrectAnswer;
    if (questionType === "single_choice") {
      correctAnswerPayload = { selected: singleCorrect };
    } else if (questionType === "multiple_choice") {
      correctAnswerPayload = { selected: multiCorrect };
    } else {
      correctAnswerPayload = {
        text: shortAnswer.text.trim(),
        numeric_tolerance: shortAnswer.numeric_tolerance,
        case_sensitive: shortAnswer.case_sensitive,
      };
    }

    const payload: QuestionInput = {
      question_type: questionType,
      prompt: prompt.trim(),
      points: Number(points),
      options: questionType === "short_answer" ? [] : options,
      correct_answer: correctAnswerPayload,
    };

    try {
      const result = isEdit && initialQuestion
        ? await updateQuestionAction(initialQuestion.id, examId, payload)
        : await createQuestionAction(examId, payload);

      if (!result.success) {
        setErrorMessage(result.message || "Gagal menyimpan butir soal.");
        if (result.errors) setFieldErrors(result.errors);
      } else {
        onSuccess();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan sistem saat menyimpan soal.";
      setErrorMessage(msg);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
      {/* Header Editor */}
      <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
            {isEdit
              ? `Sunting Butir Soal #${initialQuestion?.order_index}`
              : "Tambah Butir Soal Baru"}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Gunakan format Markdown untuk teks dan $\LaTeX$ untuk rumus matematika.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isPending}
            className="border-slate-300 dark:border-slate-700"
          >
            <X className="mr-1.5 size-3.5" />
            Batal
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={isPending}
            className="bg-indigo-600 text-white hover:bg-indigo-700"
          >
            {isPending ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <Save className="mr-1.5 size-3.5" />
            )}
            Simpan Soal
          </Button>
        </div>
      </div>

      {errorMessage && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="size-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Baris Konfigurasi: Tipe Soal & Bobot Poin */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Pilihan Tipe Pertanyaan */}
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-xs font-semibold tracking-wider text-slate-700 uppercase dark:text-slate-300">
            Tipe Pertanyaan <span className="text-destructive">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setQuestionType("single_choice")}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg border p-2.5 text-xs font-medium transition-colors",
                questionType === "single_choice"
                  ? "border-indigo-600 bg-indigo-50/70 font-semibold text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-300"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
              )}
            >
              <Radio className="size-3.5" />
              <span>Pilihan Ganda</span>
            </button>
            <button
              type="button"
              onClick={() => setQuestionType("multiple_choice")}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg border p-2.5 text-xs font-medium transition-colors",
                questionType === "multiple_choice"
                  ? "border-indigo-600 bg-indigo-50/70 font-semibold text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-300"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
              )}
            >
              <CheckSquare className="size-3.5" />
              <span>Pilihan Jamak</span>
            </button>
            <button
              type="button"
              onClick={() => setQuestionType("short_answer")}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg border p-2.5 text-xs font-medium transition-colors",
                questionType === "short_answer"
                  ? "border-indigo-600 bg-indigo-50/70 font-semibold text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-300"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
              )}
            >
              <HelpCircle className="size-3.5" />
              <span>Isian Singkat</span>
            </button>
          </div>
        </div>

        {/* Bobot Nilai / Poin */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold tracking-wider text-slate-700 uppercase dark:text-slate-300">
            Bobot Nilai (Poin) <span className="text-destructive">*</span>
          </label>
          <Input
            type="number"
            min={0}
            step={0.5}
            value={points}
            onChange={(e) => setPoints(parseFloat(e.target.value) || 0)}
            className="font-mono"
            disabled={isPending}
            required
          />
          {fieldErrors.points && (
            <p className="text-xs text-destructive">{fieldErrors.points[0]}</p>
          )}
        </div>
      </div>

      {/* Workspace Layar Ganda (Split-Pane) */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        {/* PANEL KIRI: Input Editor */}
        <div className="space-y-5">
          {/* Textarea Soal */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold tracking-wider text-slate-700 uppercase dark:text-slate-300">
                Naskah Pertanyaan (Markdown & $\LaTeX$) <span className="text-destructive">*</span>
              </label>
              <span className="text-[11px] text-slate-400">
                Gunakan $...$ untuk rumus inline dan $$...$$ untuk display
              </span>
            </div>

            <div className="rounded-lg shadow-xs">
              <QuestionToolbar
                onInsert={handleInsert}
                onOpenImageModal={() => setIsImageModalOpen(true)}
                disabled={isPending || isUploadingDroppedFile}
              />
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onDragOver={handleTextareaDragOver}
                  onDragLeave={handleTextareaDragLeave}
                  onDrop={handleTextareaDrop}
                  rows={9}
                  disabled={isPending || isUploadingDroppedFile}
                  placeholder="Tuliskan butir soal di sini (seret & lepas gambar langsung ke sini untuk unggah otomatis)..."
                  className={cn(
                    "w-full rounded-b-lg border border-slate-200 bg-white p-3 font-mono text-sm leading-relaxed text-slate-900 transition-colors placeholder:text-slate-400 focus:border-indigo-600 focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50",
                    isTextareaDragging &&
                      "border-indigo-500 bg-indigo-50/40 ring-2 ring-indigo-500/30 dark:bg-indigo-950/30"
                  )}
                />

                {isUploadingDroppedFile && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-b-lg bg-white/80 backdrop-blur-xs dark:bg-slate-950/80">
                    <div className="flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-lg dark:bg-slate-100 dark:text-slate-900">
                      <Loader2 className="size-3.5 animate-spin text-indigo-400" />
                      <span>Mengunggah diagram ke Supabase Storage...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {fieldErrors.prompt && (
              <p className="text-xs text-destructive">{fieldErrors.prompt[0]}</p>
            )}
          </div>

          {/* Editor Opsi & Kunci Jawaban */}
          {questionType === "short_answer" ? (
            /* Input Isian Singkat */
            <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40">
              <div className="flex items-center gap-2">
                <HelpCircle className="size-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-xs font-semibold tracking-wider text-slate-700 uppercase dark:text-slate-300">
                  Konfigurasi Kunci Jawaban Isian
                </h3>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Kunci Jawaban yang Diharapkan <span className="text-destructive">*</span>
                </label>
                <Input
                  type="text"
                  value={shortAnswer.text}
                  onChange={(e) => setShortAnswer({ ...shortAnswer, text: e.target.value })}
                  placeholder="Contoh: 3.14 atau Fotosintesis"
                  disabled={isPending}
                  className="font-mono"
                  required
                />
                {fieldErrors.correct_answer && (
                  <p className="text-xs text-destructive">{fieldErrors.correct_answer[0]}</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Toleransi Nilai Numerik (±)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={shortAnswer.numeric_tolerance}
                    onChange={(e) =>
                      setShortAnswer({
                        ...shortAnswer,
                        numeric_tolerance: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="0 (Eksak)"
                    className="font-mono text-xs"
                    disabled={isPending}
                  />
                  <p className="text-[10px] text-slate-400">
                    Contoh: 0.05 untuk menerima rentang $[x - 0.05, x + 0.05]$.
                  </p>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={shortAnswer.case_sensitive}
                      onChange={(e) =>
                        setShortAnswer({ ...shortAnswer, case_sensitive: e.target.checked })
                      }
                      disabled={isPending}
                      className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Sensitif Huruf Besar/Kecil</span>
                  </label>
                </div>
              </div>
            </div>
          ) : (
            /* Input Pilihan Ganda & Jamak */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold tracking-wider text-slate-700 uppercase dark:text-slate-300">
                    Daftar Opsi Pilihan Jawaban
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {questionType === "single_choice"
                      ? "Pilih radio button pada opsi yang menjadi kunci jawaban benar."
                      : "Centang checkbox pada opsi yang menjadi kunci jawaban benar."}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddOption}
                  disabled={isPending || options.length >= 10}
                  className="h-7 border-slate-300 text-xs dark:border-slate-700"
                >
                  <Plus className="mr-1 size-3" />
                  Tambah Opsi
                </Button>
              </div>

              {fieldErrors.options && (
                <p className="text-xs text-destructive">{fieldErrors.options[0]}</p>
              )}
              {fieldErrors.correct_answer && (
                <p className="text-xs text-destructive">{fieldErrors.correct_answer[0]}</p>
              )}

              <div className="space-y-2">
                {options.map((opt, index) => {
                  const isCorrect =
                    questionType === "single_choice"
                      ? singleCorrect === opt.id
                      : multiCorrect.includes(opt.id);

                  return (
                    <div
                      key={opt.id}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border p-2 transition-colors",
                        isCorrect
                          ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-900/60 dark:bg-emerald-950/20"
                          : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                      )}
                    >
                      {/* Pemicu Kunci Jawaban */}
                      {questionType === "single_choice" ? (
                        <button
                          type="button"
                          onClick={() => setSingleCorrect(opt.id)}
                          title="Tandai sebagai kunci jawaban benar"
                          className={cn(
                            "flex size-7 shrink-0 items-center justify-center rounded-full border transition-all",
                            isCorrect
                              ? "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500"
                              : "border-slate-300 bg-white text-slate-500 hover:border-emerald-500 dark:border-slate-700 dark:bg-slate-800"
                          )}
                        >
                          {opt.id}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleMultiCorrect(opt.id)}
                          title="Tandai sebagai salah satu kunci jawaban benar"
                          className={cn(
                            "flex size-7 shrink-0 items-center justify-center rounded-md border font-mono text-xs font-bold transition-all",
                            isCorrect
                              ? "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500"
                              : "border-slate-300 bg-white text-slate-500 hover:border-emerald-500 dark:border-slate-700 dark:bg-slate-800"
                          )}
                        >
                          {opt.id}
                        </button>
                      )}

                      {/* Input Teks Opsi */}
                      <Input
                        type="text"
                        value={opt.text}
                        onChange={(e) => handleOptionTextChange(index, e.target.value)}
                        placeholder={`Isi pilihan ${opt.id} (mendukung formula $...$)`}
                        disabled={isPending}
                        className="h-9 font-sans text-xs sm:text-sm"
                        required
                      />

                      {/* Hapus Opsi */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveOption(index)}
                        disabled={isPending || options.length <= 2}
                        className="size-8 text-slate-400 hover:text-destructive"
                        title="Hapus opsi ini"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* PANEL KANAN: Pratinjau Presisi (Live Preview) */}
        <div className="space-y-3 lg:sticky lg:top-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-700 uppercase dark:text-slate-300">
              Pratinjau Tampilan Peserta
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {points} Poin
            </span>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            {/* Kartu Soal Pratinjau */}
            <div className="mb-4">
              <MarkdownRenderer content={prompt} />
            </div>

            {/* Pratinjau Opsi Jawaban */}
            {questionType === "short_answer" ? (
              <div className="mt-6 space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Jawaban Anda:
                </label>
                <div className="rounded-md border border-slate-300 bg-slate-50 p-2.5 font-mono text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-950">
                  (Peserta akan mengetikkan teks/angka di sini)
                </div>
                {shortAnswer.text && (
                  <div className="flex items-center gap-1.5 pt-1 text-xs text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="size-3.5" />
                    <span>
                      Kunci: <strong>{shortAnswer.text}</strong>
                      {shortAnswer.numeric_tolerance > 0 &&
                        ` (±${shortAnswer.numeric_tolerance})`}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-6 space-y-2.5 border-t border-slate-100 pt-4 dark:border-slate-800">
                {options.map((opt) => {
                  const isCorrect =
                    questionType === "single_choice"
                      ? singleCorrect === opt.id
                      : multiCorrect.includes(opt.id);

                  return (
                    <div
                      key={opt.id}
                      className={cn(
                        "flex items-start gap-3 rounded-lg border p-3 transition-colors",
                        isCorrect
                          ? "border-emerald-300 bg-emerald-50/30 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                          : "border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50"
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded font-mono text-xs font-bold",
                          isCorrect
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        )}
                      >
                        {opt.id}
                      </span>
                      <div className="flex-1 pt-0.5">
                        <MarkdownRenderer
                          content={opt.text || `*(Pilihan ${opt.id} kosong)*`}
                          className="text-sm prose-p:my-0"
                        />
                      </div>
                      {isCorrect && (
                        <span className="shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          KUNCI
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Unggah & Galeri Diagram Visual */}
      <ImageUploadModal
        open={isImageModalOpen}
        onOpenChange={setIsImageModalOpen}
        examId={examId}
        onInsertImage={handleInsertImage}
      />
    </div>
  );
}

