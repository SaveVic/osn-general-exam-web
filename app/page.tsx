import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/actions/auth";
import { GateContainer } from "@/components/gate/gate-container";

export const metadata: Metadata = {
  title: "Portal Ujian",
};

export default async function HomePage() {
  const user = await getAdminUser();

  if (user) {
    redirect("/admin/dasbor");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-950">
      <GateContainer />
    </main>
  );
}
