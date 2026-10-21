import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/actions/auth";
import { getActiveSessionFromCookieAction } from "@/actions/exam-session";
import { GateContainer } from "@/components/gate/gate-container";

export const metadata: Metadata = {
  title: "Portal Ujian",
  description: "Masukkan kode rujukan resmi untuk mengakses sesi pengerjaan ujian Anda di ExamLab.",
};

export default async function HomePage() {
  const user = await getAdminUser();

  if (user) {
    redirect("/admin/dasbor");
  }

  const activeSession = await getActiveSessionFromCookieAction();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-950">
      <GateContainer activeSession={activeSession} />
    </main>
  );
}
