import { getAdminUser } from "@/actions/auth";
import { getExamById } from "@/actions/exams";
import { getExamReferralCodes } from "@/actions/referral-codes";
import { AdminHeader } from "@/components/admin/admin-header";
import { ReferralCodeManager } from "@/components/admin/referral-codes/referral-code-manager";
import { Button } from "@/components/ui/button";
import { BookOpen, Settings } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

interface ReferralCodesPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ReferralCodesPage({ params }: ReferralCodesPageProps) {
  const user = await getAdminUser();

  if (!user) {
    redirect("/admin/masuk?pesan=Sesi+berakhir.+Silakan+masuk+kembali.");
  }

  const { id } = await params;
  const exam = await getExamById(id);

  if (!exam) {
    notFound();
  }

  const codes = await getExamReferralCodes(id);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminHeader userEmail={user.email ?? "admin@exam.local"} />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Navigasi Bar Atas / Breadcrumb */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Link
              href="/admin/dasbor"
              className="hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              Dasbor
            </Link>
            <span>/</span>
            <Link
              href={`/admin/ujian/${exam.id}/pengaturan`}
              className="max-w-50 truncate hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              {exam.title}
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              Kode Rujukan
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="gap-1.5 border-slate-300 text-xs dark:border-slate-700">
              <Link href={`/admin/ujian/${exam.id}/soal`}>
                <BookOpen className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                Bank Soal
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-1.5 border-slate-300 text-xs dark:border-slate-700">
              <Link href={`/admin/ujian/${exam.id}/pengaturan`}>
                <Settings className="size-3.5 text-slate-600 dark:text-slate-400" />
                Pengaturan
              </Link>
            </Button>
          </div>
        </div>

        {/* Manager Kode Rujukan */}
        <ReferralCodeManager exam={exam} codes={codes} />
      </main>
    </div>
  );
}

