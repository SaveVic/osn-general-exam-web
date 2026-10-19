import { create } from "zustand";
import type { VerifiedGateData } from "@/actions/gate";

interface ExamGateState {
  code: string;
  isVerifying: boolean;
  error: string | null;
  verifiedData: VerifiedGateData | null;
}

interface ExamGateActions {
  setCode: (code: string) => void;
  setVerifying: (isVerifying: boolean) => void;
  setError: (error: string | null) => void;
  setVerifiedData: (data: VerifiedGateData | null) => void;
  resetGate: () => void;
}

export type ExamGateStore = ExamGateState & ExamGateActions;

export const useExamGateStore = create<ExamGateStore>()((set) => ({
  code: "",
  isVerifying: false,
  error: null,
  verifiedData: null,

  setCode: (code) => set({ code, error: null }),
  setVerifying: (isVerifying) => set({ isVerifying }),
  setError: (error) => set({ error, isVerifying: false }),
  setVerifiedData: (verifiedData) =>
    set({
      verifiedData,
      isVerifying: false,
      error: null,
    }),
  resetGate: () =>
    set({
      code: "",
      isVerifying: false,
      error: null,
      verifiedData: null,
    }),
}));

