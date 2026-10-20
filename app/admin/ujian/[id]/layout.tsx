import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getAdminUser } from "@/actions/auth";
import { getExamById } from "@/actions/exams";
import { AdminHeader } from "@/components/admin/admin-header";
import { ExamSidebarNav } from "@/components/admin/exam-sidebar-nav";

interface ExamLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    id: string;
  }>;
}

export default async function ExamLayout({
  children,
  params,
}: ExamLayoutProps) {
  const user = await getAdminUser();

  if (!user) {
    redirect("/admin/masuk?pesan=Sesi+berakhir.+Silakan+masuk+kembali.");
  }

  const { id } = await params;
  const exam = await getExamById(id);

  if (!exam) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminHeader userEmail={user.email ?? "admin@exam.local"} />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb Global Halaman Ujian */}
        <div className="mb-6 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Link
            href="/admin/dasbor"
            className="transition-colors hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            Dasbor
          </Link>
          <span>/</span>
          <span className="max-w-75 truncate font-medium text-slate-700 dark:text-slate-300">
            {exam.title}
          </span>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Side Menu di Bagian Kiri */}
          <aside className="w-full shrink-0 lg:w-64">
            <ExamSidebarNav examId={exam.id} />
          </aside>

          {/* Area Konten Utama */}
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
    </div>
  );
}
