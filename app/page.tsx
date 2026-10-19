import { GateContainer } from "@/components/gate/gate-container";

export const metadata = {
  title: "Portal Ujian Teknis - Masuk Sesi Ujian",
  description: "Platform ujian presisi dengan integritas waktu dan tipografi terstandar.",
};

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-950">
      <GateContainer />
    </main>
  );
}
