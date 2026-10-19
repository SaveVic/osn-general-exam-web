import { create } from "zustand";
import type { VerifiedGateData } from "@/actions/gate";

interface ExamGateState {
  code: string;
  isVerifying: boolean;
  error: string | null;
  verifiedData: VerifiedGateData | null;
  studentName: string;
  studentClass: string;
}

interface ExamGateActions {
  setCode: (code: string) => void;
  setVerifying: (isVerifying: boolean) => void;
  setError: (error: string | null) => void;
  setVerifiedData: (data: VerifiedGateData | null) => void;
  setStudentName: (name: string) => void;
  setStudentClass: (studentClass: string) => void;
  resetStudentIdentity: () => void;
  resetGate: () => void;
}

export type ExamGateStore = ExamGateState & ExamGateActions;

export const useExamGateStore = create<ExamGateStore>()((set) => ({
  code: "",
  isVerifying: false,
  error: null,
  verifiedData: null,
  studentName: "",
  studentClass: "",

  setCode: (code) => set({ code, error: null }),
  setVerifying: (isVerifying) => set({ isVerifying }),
  setError: (error) => set({ error, isVerifying: false }),
  setVerifiedData: (verifiedData) =>
    set({
      verifiedData,
      isVerifying: false,
      error: null,
      studentName: "",
      studentClass: "",
    }),
  setStudentName: (studentName) => set({ studentName }),
  setStudentClass: (studentClass) => set({ studentClass }),
  resetStudentIdentity: () => set({ studentName: "", studentClass: "" }),
  resetGate: () =>
    set({
      code: "",
      isVerifying: false,
      error: null,
      verifiedData: null,
      studentName: "",
      studentClass: "",
    }),
}));
