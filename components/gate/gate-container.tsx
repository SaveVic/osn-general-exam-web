"use client";

import { Suspense } from "react";
import { useExamGateStore } from "@/lib/stores/exam-gate-store";
import { ReferralGateCard } from "@/components/gate/referral-gate-card";
import { VerifiedExamPreview } from "@/components/gate/verified-exam-preview";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

function GateCardSkeleton() {
  return (
    <div className="w-full max-w-md">
      <Card className="border-slate-200 dark:border-slate-800 dark:bg-slate-900">
        <CardContent className="flex flex-col items-center justify-center p-8 space-y-3">
          <Loader2 className="size-6 animate-spin text-indigo-600 dark:text-indigo-400" />
          <p className="text-xs text-slate-400">Menyiapkan gerbang ujian...</p>
        </CardContent>
      </Card>
    </div>
  );
}

export function GateContainer() {
  const verifiedData = useExamGateStore((state) => state.verifiedData);

  return (
    <div className="flex w-full items-center justify-center p-4 sm:p-6 md:p-8">
      {verifiedData ? (
        <VerifiedExamPreview />
      ) : (
        <Suspense fallback={<GateCardSkeleton />}>
          <ReferralGateCard />
        </Suspense>
      )}
    </div>
  );
}

