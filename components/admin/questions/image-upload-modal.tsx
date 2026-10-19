"use client";

/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  Check,
  FileImage,
  ImageIcon,
  Loader2,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import {
  uploadExamAssetAction,
  getExamAssetsAction,
  deleteExamAssetAction,
  type ExamAssetItem,
} from "@/actions/storage";
import { cn } from "@/lib/utils";

interface ImageUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examId: string;
  onInsertImage: (url: string, altText: string) => void;
}

export function ImageUploadModal({
  open,
  onOpenChange,
  examId,
  onInsertImage,
}: ImageUploadModalProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "gallery">("upload");

  // Tab Upload States
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [altText, setAltText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tab Gallery States
  const [assets, setAssets] = useState<ExamAssetItem[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);

  // Buat preview lokal saat berkas dipilih
  const handleFileSelect = (selectedFile: File) => {
    setUploadError(null);

    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"];
    if (!allowed.includes(selectedFile.type)) {
      setUploadError("Format berkas tidak didukung. Harap pilih gambar PNG, JPG, WebP, atau SVG.");
      return;
    }

    if (selectedFile.size > 2 * 1024 * 1024) {
      setUploadError(
        `Ukuran berkas (${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB) melebihi batas maksimal 2 MB.`
      );
      return;
    }

    setFile(selectedFile);
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);

    // Default keterangan gambar dari nama berkas tanpa ekstensi
    if (!altText) {
      const defaultName = selectedFile.name.replace(/\.[^/.]+$/, "");
      setAltText(defaultName);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleResetUpload = () => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setAltText("");
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("alt_text", altText);

    try {
      const result = await uploadExamAssetAction(examId, formData);
      if (!result.success || !result.url) {
        setUploadError(result.message || "Gagal mengunggah gambar ke server.");
      } else {
        // Berhasil, sisipkan sintaks dan tutup modal
        onInsertImage(result.url, result.altText || "Diagram");
        handleResetUpload();
        onOpenChange(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat mengunggah berkas.";
      setUploadError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  // Muat galeri diagram
  const loadGallery = React.useCallback(async () => {
    setIsLoadingAssets(true);
    try {
      const items = await getExamAssetsAction(examId);
      setAssets(items);
    } catch (err) {
      console.error("Gagal memuat galeri:", err);
    } finally {
      setIsLoadingAssets(false);
    }
  }, [examId]);

  useEffect(() => {
    if (open && activeTab === "gallery") {
      loadGallery();
    }
  }, [open, activeTab, loadGallery]);

  const handleDeleteAsset = async (path: string) => {
    setDeletingPath(path);
    try {
      const res = await deleteExamAssetAction(path);
      if (res.success) {
        setAssets((prev) => prev.filter((a) => a.path !== path));
      }
    } finally {
      setDeletingPath(null);
    }
  };

  const handleSelectFromGallery = (asset: ExamAssetItem) => {
    const defaultAlt = asset.name.replace(/\.[^/.]+$/, "");
    onInsertImage(asset.url, defaultAlt);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <ImageIcon className="size-5 text-indigo-600 dark:text-indigo-400" />
            Diagram & Gambar Naskah Soal
          </DialogTitle>
          <DialogDescription className="text-xs">
            Unggah diagram, grafik teknis, atau rumus bergambar ke Supabase Storage untuk disematkan
            ke dalam naskah soal Markdown.
          </DialogDescription>
        </DialogHeader>

        {/* Tab Pemilih */}
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={cn(
              "px-4 py-2 text-xs font-semibold transition-colors border-b-2 -mb-px",
              activeTab === "upload"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            )}
          >
            Unggah Berkas Baru
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("gallery")}
            className={cn(
              "px-4 py-2 text-xs font-semibold transition-colors border-b-2 -mb-px",
              activeTab === "gallery"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            )}
          >
            Galeri Diagram Ujian
          </button>
        </div>

        {uploadError && (
          <Alert variant="destructive" className="mt-2 text-xs">
            <AlertCircle className="size-4" />
            <AlertDescription>{uploadError}</AlertDescription>
          </Alert>
        )}

        {/* TAB 1: UNGGAH BARU */}
        {activeTab === "upload" && (
          <form onSubmit={handleUploadSubmit} className="space-y-4 pt-2">
            {!file ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all",
                  isDragging
                    ? "border-indigo-500 bg-indigo-50/50 dark:border-indigo-400 dark:bg-indigo-950/30"
                    : "border-slate-300 hover:border-slate-400 dark:border-slate-700 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-900/40"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-white shadow-xs dark:bg-slate-800">
                  <UploadCloud className="size-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Klik untuk memilih atau seret gambar ke sini
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Mendukung PNG, JPG, WebP, SVG (Maksimal 2 MB)
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Pratinjau Gambar Terpilih */}
                <div className="relative rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 mb-2">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                      <FileImage className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                      {file.name} ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleResetUpload}
                      disabled={isUploading}
                      className="size-6 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>

                  {previewUrl && (
                    <div className="flex max-h-48 items-center justify-center overflow-hidden rounded bg-slate-100 dark:bg-slate-950">
                      <img
                        src={previewUrl}
                        alt="Pratinjau"
                        className="max-h-44 object-contain"
                      />
                    </div>
                  )}
                </div>

                {/* Input Keterangan Gambar (Alt Text) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold tracking-wider text-slate-700 uppercase dark:text-slate-300">
                    Keterangan Gambar / Alt Text <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="text"
                    value={altText}
                    onChange={(e) => setAltText(e.target.value)}
                    placeholder="Contoh: Diagram Rangkaian Listrik RLC"
                    disabled={isUploading}
                    required
                  />
                  <p className="text-[11px] text-slate-400">
                    Teks ini akan muncul sebagai keterangan diagram di bawah gambar.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResetUpload}
                    disabled={isUploading}
                  >
                    Ganti Gambar
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isUploading}
                    className="bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    {isUploading ? (
                      <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                    ) : (
                      <Check className="mr-1.5 size-3.5" />
                    )}
                    Unggah & Sisipkan ke Soal
                  </Button>
                </div>
              </div>
            )}
          </form>
        )}

        {/* TAB 2: GALERI DIAGRAM */}
        {activeTab === "gallery" && (
          <div className="space-y-3 pt-2">
            {isLoadingAssets ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Loader2 className="size-6 animate-spin text-indigo-600 mb-2" />
                <p className="text-xs">Memuat galeri diagram ujian...</p>
              </div>
            ) : assets.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center dark:border-slate-800">
                <FileImage className="mx-auto size-8 text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Belum Ada Diagram yang Diunggah
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Gunakan tab &quot;Unggah Berkas Baru&quot; untuk mengunggah diagram pertama Anda.
                </p>
              </div>
            ) : (
              <div className="grid max-h-72 grid-cols-2 gap-3 overflow-y-auto p-1 sm:grid-cols-3">
                {assets.map((item) => (
                  <div
                    key={item.path}
                    className="group relative flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xs transition-all hover:border-indigo-400 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex h-28 items-center justify-center bg-slate-100 p-2 dark:bg-slate-950">
                      <img
                        src={item.url}
                        alt={item.name}
                        className="max-h-24 max-w-full object-contain"
                      />
                    </div>

                    <div className="flex items-center justify-between p-2 text-[11px]">
                      <span className="truncate max-w-[100px] text-slate-700 dark:text-slate-300 font-mono" title={item.name}>
                        {item.name}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteAsset(item.path)}
                        disabled={deletingPath === item.path}
                        className="size-6 text-slate-400 hover:text-red-600"
                        title="Hapus diagram dari penyimpanan"
                      >
                        {deletingPath === item.path ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Trash2 className="size-3" />
                        )}
                      </Button>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleSelectFromGallery(item)}
                      className="w-full rounded-none border-t border-slate-200 bg-slate-50 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 dark:border-slate-800 dark:bg-slate-800 dark:text-indigo-400 dark:hover:bg-slate-700 h-7"
                    >
                      Sisipkan ke Soal
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
