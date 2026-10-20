"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  BookOpen,
  FileEdit,
  KeyRound,
  Settings,
} from "lucide-react";
import { RecalculateScoresButton } from "@/components/admin/scoring/recalculate-scores-button";

interface ExamSidebarNavProps {
  examId: string;
  examTitle?: string;
  isPublished?: boolean;
}

export function ExamSidebarNav({ examId }: ExamSidebarNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      title: "Pengaturan Naskah",
      href: `/admin/ujian/${examId}/pengaturan`,
      icon: Settings,
    },
    {
      title: "Bank Soal",
      href: `/admin/ujian/${examId}/soal`,
      icon: BookOpen,
    },
    {
      title: "Kode Rujukan",
      href: `/admin/ujian/${examId}/kode-rujukan`,
      icon: KeyRound,
    },
    {
      title: "Penilaian Manual",
      href: `/admin/ujian/${examId}/penilaian`,
      icon: FileEdit,
    },
    {
      title: "Laporan Nilai",
      href: `/admin/ujian/${examId}/laporan`,
      icon: BarChart3,
    },
    {
      title: "Pemantauan Sesi",
      href: `/admin/ujian/${examId}/pemantauan`,
      icon: Activity,
    },
  ];

  return (
    <div className="lg:sticky lg:top-24">
      {/* Navigasi Side Menu */}
      <nav
        aria-label="Navigasi Menu Ujian"
        className="rounded-xl border border-slate-200 bg-white p-2 shadow-2xs dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex scrollbar-none gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`group flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-xs whitespace-nowrap transition-all ${
                  isActive
                    ? "border border-indigo-200/80 bg-indigo-50 font-semibold text-indigo-700 shadow-2xs dark:border-indigo-800/80 dark:bg-indigo-950/60 dark:text-indigo-300"
                    : "border border-transparent font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100"
                }`}
              >
                <Icon
                  className={`size-4 shrink-0 transition-colors ${
                    isActive
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300"
                  }`}
                />
                <span className="truncate">{item.title}</span>
              </Link>
            );
          })}
        </div>

        {/* Tombol Aksi Tambahan */}
        <div className="mt-2 border-t border-slate-100 pt-2 dark:border-slate-800">
          <RecalculateScoresButton
            examId={examId}
            className="w-full justify-center gap-2 text-xs lg:justify-start"
          />
        </div>
      </nav>
    </div>
  );
}
