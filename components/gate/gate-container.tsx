"use client";

import { Suspense, useEffect, useState } from "react";
import { useExamGateStore } from "@/lib/stores/exam-gate-store";
import { ReferralGateCard } from "@/components/gate/referral-gate-card";
import { ExamLobbyCard } from "@/components/gate/exam-lobby-card";
import { ActiveSessionResumeCard } from "@/components/gate/active-session-resume-card";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import type { ActiveSessionResumeData } from "@/actions/exam-session";

function GateCardSkeleton() {
  return (
    <div className="w-full max-w-md">
      <Card className="border-slate-200 dark:border-slate-800 dark:bg-slate-900">
        <CardContent className="flex flex-col items-center justify-center space-y-3 p-8">
          <Loader2 className="size-6 animate-spin text-indigo-600 dark:text-indigo-400" />
          <p className="text-xs text-slate-400">Menyiapkan gerbang ujian...</p>
        </CardContent>
      </Card>
    </div>
  );
}

interface GateContainerProps {
  activeSession?: ActiveSessionResumeData | null;
}

export function GateContainer({ activeSession }: GateContainerProps) {
  const verifiedData = useExamGateStore((state) => state.verifiedData);
  const resetGate = useExamGateStore((state) => state.resetGate);
  const [showResumeCard, setShowResumeCard] = useState<boolean>(Boolean(activeSession));

  // Reset state gerbang ujian saat keluar dari halaman "/"
  useEffect(() => {
    return () => {
      resetGate();
    };
  }, [resetGate]);

  return (
    <div className="flex w-full items-center justify-center p-4 sm:p-6 md:p-8">
      {verifiedData ? (
        <ExamLobbyCard verifiedData={verifiedData} />
      ) : activeSession && showResumeCard ? (
        <ActiveSessionResumeCard
          session={activeSession}
          onSwitchToCodeInput={() => setShowResumeCard(false)}
        />
      ) : (
        <Suspense fallback={<GateCardSkeleton />}>
          <ReferralGateCard />
        </Suspense>
      )}
    </div>
  );
}
