"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import { cn } from "@/lib/utils";
import "highlight.js/styles/github-dark.css";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
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
        "prose prose-slate dark:prose-invert max-w-none",
        "text-slate-800 dark:text-slate-100 leading-relaxed",
        "prose-headings:font-semibold prose-headings:tracking-tight",
        "prose-p:my-2 prose-p:leading-relaxed",
        "prose-code:font-mono prose-code:text-xs sm:prose-code:text-sm",
        "prose-code:before:content-none prose-code:after:content-none",
        "prose-code:bg-slate-100 dark:prose-code:bg-slate-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded",
        "prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-800 prose-pre:rounded-lg prose-pre:p-4",
        "prose-pre:overflow-x-auto",
        "prose-table:border-collapse prose-table:text-sm",
        "prose-th:border prose-th:border-slate-300 dark:prose-th:border-slate-700 prose-th:p-2 prose-th:bg-slate-100 dark:prose-th:bg-slate-800/60",
        "prose-td:border prose-td:border-slate-200 dark:prose-td:border-slate-800 prose-td:p-2",
        "prose-img:rounded-md prose-img:shadow-sm prose-img:max-h-96",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[
          [rehypeKatex, { throwOnError: false, errorColor: "#ef4444" }],
          rehypeHighlight,
        ]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

