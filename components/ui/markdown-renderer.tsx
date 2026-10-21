"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { ImageLightbox } from "./image-lightbox";
import { cn } from "@/lib/utils";
import "highlight.js/styles/github-dark.css";

// Skema sanitasi yang mengizinkan kelas KaTeX, GFM, dan highlight.js secara aman
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    div: [
      ...(defaultSchema.attributes?.div || []),
      ["className", "math", "math-display"],
    ],
    span: [
      ...(defaultSchema.attributes?.span || []),
      ["className", "math", "math-inline"],
    ],
    code: [
      ...(defaultSchema.attributes?.code || []),
      [/^language-./, "hljs"],
    ],
  },
};

interface MarkdownRendererProps {
  content: string;
  className?: string;
  enableLightbox?: boolean;
}

export function MarkdownRenderer({
  content,
  className,
  enableLightbox = true,
}: MarkdownRendererProps) {
  if (!content || !content.trim()) {
    return (
      <div className={cn("text-sm text-slate-400 italic", className)}>
        (Belum ada konten untuk ditampilkan)
      </div>
    );
  }

  return (
    <div
      className={cn(
        "prose max-w-none prose-slate dark:prose-invert",
        "leading-relaxed text-slate-800 dark:text-slate-100",
        "prose-headings:font-semibold prose-headings:tracking-tight",
        "prose-p:my-2 prose-p:leading-relaxed",
        "prose-code:font-mono prose-code:text-xs sm:prose-code:text-sm",
        "prose-code:before:content-none prose-code:after:content-none",
        "prose-code:rounded prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 dark:prose-code:bg-slate-800",
        "prose-pre:rounded-lg prose-pre:border prose-pre:border-slate-800 prose-pre:bg-slate-950 prose-pre:p-4",
        "prose-pre:overflow-x-auto",
        "prose-table:border-collapse prose-table:text-sm",
        "prose-th:border prose-th:border-slate-300 prose-th:bg-slate-100 prose-th:p-2 dark:prose-th:border-slate-700 dark:prose-th:bg-slate-800/60",
        "prose-td:border prose-td:border-slate-200 prose-td:p-2 dark:prose-td:border-slate-800",
        "prose-img:max-h-96 prose-img:rounded-md prose-img:shadow-sm",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[
          [rehypeSanitize, sanitizeSchema],
          [rehypeKatex, { throwOnError: false, errorColor: "#ef4444" }],
          rehypeHighlight,
        ]}
        components={{
          img: ({ src, alt, ...imgProps }) => {
            const imageSrc = typeof src === "string" ? src : undefined;
            if (!imageSrc) return null;

            if (enableLightbox) {
              return <ImageLightbox src={imageSrc} alt={alt} {...imgProps} />;
            }
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageSrc} alt={alt || "Gambar Soal"} {...imgProps} />
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
