import { getAdminUser } from "@/actions/auth";
import { getExamById } from "@/actions/exams";
import { getExamReferralCodes } from "@/actions/referral-codes";
import { ReferralCodeManager } from "@/components/admin/referral-codes/referral-code-manager";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Kode Rujukan",
  description: "Penerbitan dan kontrol kuota kode rujukan peserta di ExamLab.",
  robots: {
    index: false,
    follow: false,
  },
};

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
    <div className="space-y-6">
      <ReferralCodeManager exam={exam} codes={codes} />
    </div>
  );
}
