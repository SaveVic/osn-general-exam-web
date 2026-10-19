"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Maximize2, RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageLightboxProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  alt?: string;
  className?: string;
}

export function ImageLightbox({ src, alt, className, ...props }: ImageLightboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Kunci scrolling halaman utama saat lightbox terbuka
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Handler tombol Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setScale(1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(3, Math.round((prev + 0.25) * 100) / 100));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => Math.max(0.5, Math.round((prev - 0.25) * 100) / 100));
  }, []);

  const handleResetZoom = useCallback(() => {
    setScale(1);
  }, []);

  const handleToggleZoom = useCallback(() => {
    setScale((prev) => (prev === 1 ? 2 : 1));
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setScale(1);
  }, []);

  if (!src) return null;

  return (
    <>
      {/* Thumbnail Gambar Inline */}
      <figure className="group relative my-3 inline-block max-w-full">
        <div
          role="button"
          tabIndex={0}
          aria-label={`Perbesar diagram: ${alt || "Diagram soal"}`}
          onClick={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setIsOpen(true);
            }
          }}
          className={cn(
            "relative cursor-zoom-in overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-2xs transition-all duration-150",
            "hover:border-indigo-400 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-600",
            "focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none dark:focus-visible:ring-offset-slate-950"
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt || "Diagram Soal"}
            className={cn(
              "max-h-96 w-auto object-contain transition-transform duration-200 group-hover:scale-105",
              className
            )}
            loading="lazy"
            {...props}
          />

          {/* Badge Petunjuk Hover */}
          <div className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-slate-900/80 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-md backdrop-blur-xs transition-opacity duration-150 group-hover:opacity-100 dark:bg-slate-100 dark:text-slate-900">
            <ZoomIn className="size-3 text-indigo-400 dark:text-indigo-600" />
            <span>Perbesar</span>
          </div>
        </div>

        {/* Caption Gambar Alt jika tersedia */}
        {alt && (
          <figcaption className="mt-1.5 text-center text-xs text-slate-500 italic dark:text-slate-400">
            {alt}
          </figcaption>
        )}
      </figure>

      {/* Modal Lightbox Layar Penuh (Portal ke document.body) */}
      {isOpen && mounted &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Pratinjau perbesar: ${alt || "Diagram"}`}
            onClick={handleClose}
            className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-black/85 p-3 backdrop-blur-sm sm:p-6"
          >
            {/* Toolbar Atas */}
            <div
              className="z-10 flex w-full max-w-5xl items-center justify-between gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Indikator Persentase Zoom */}
              <div className="flex items-center gap-1.5 rounded-full border border-slate-700/60 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-200 backdrop-blur-md">
                <Maximize2 className="size-3.5 text-indigo-400" />
                <span className="font-mono text-xs">{Math.round(scale * 100)}%</span>
              </div>

              {/* Kontrol Zoom In / Zoom Out / Reset */}
              <div className="flex items-center gap-1.5 rounded-full border border-slate-700/60 bg-slate-900/80 p-1 text-slate-200 backdrop-blur-md">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomOut}
                  disabled={scale <= 0.5}
                  className="size-8 rounded-full p-0 text-slate-300 hover:bg-slate-800 hover:text-white"
                  aria-label="Perkecil gambar"
                >
                  <ZoomOut className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetZoom}
                  className="h-8 rounded-full px-2 font-mono text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
                  aria-label="Reset ukuran zoom"
                >
                  <RotateCcw className="mr-1 size-3.5" />
                  <span>Reset</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomIn}
                  disabled={scale >= 3}
                  className="size-8 rounded-full p-0 text-slate-300 hover:bg-slate-800 hover:text-white"
                  aria-label="Perbesar gambar"
                >
                  <ZoomIn className="size-4" />
                </Button>
              </div>

              {/* Tombol Tutup */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="size-9 rounded-full border border-slate-700/60 bg-slate-900/80 p-0 text-slate-200 backdrop-blur-md hover:bg-slate-800 hover:text-white"
                aria-label="Tutup pratinjau gambar (Escape)"
              >
                <X className="size-5" />
              </Button>
            </div>

            {/* Area Gambar Utama Terpusat */}
            <div
              className="relative flex w-full flex-1 items-center justify-center overflow-auto p-2"
              onClick={handleClose}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={alt || "Diagram Soal"}
                style={{ transform: `scale(${scale})` }}
                onDoubleClick={handleToggleZoom}
                onClick={(e) => e.stopPropagation()}
                className="max-h-[78vh] max-w-full cursor-pointer rounded-lg object-contain shadow-2xl transition-transform duration-200 select-none"
                title="Klik ganda untuk memperbesar/memperkecil"
              />
            </div>

            {/* Keterangan Teks Alt di Bawah */}
            {alt && (
              <div
                className="z-10 max-w-xl truncate rounded-full border border-slate-700/60 bg-slate-900/80 px-4 py-1.5 text-center text-xs text-slate-200 backdrop-blur-md"
                onClick={(e) => e.stopPropagation()}
              >
                {alt}
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
}

