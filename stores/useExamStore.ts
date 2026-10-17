import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ExamSessionState, ExamSessionActions } from "@/types/session";

const initialState: ExamSessionState = {
  sessionId: null,
  examId: null,
  studentName: null,
  studentClass: null,
  questions: [],
  currentIndex: 0,
  answers: {},
  flagged: {},
  startedAt: null,
  serverEndTime: null,
  syncStatus: "idle",
  lastSyncedAt: null,
  isCompleted: false,
};

export const useExamStore = create<ExamSessionState & ExamSessionActions>()(
  persist(
    (set) => ({
      ...initialState,

      initSession: (data) =>
        set((state) => ({
          ...state,
          ...data,
          isCompleted: false,
        })),

      setAnswer: (questionId, answer) =>
        set((state) => ({
          answers: {
            ...state.answers,
            [questionId]: answer,
          },
          syncStatus: "saving",
        })),

      toggleFlag: (questionId) =>
        set((state) => ({
          flagged: {
            ...state.flagged,
            [questionId]: !state.flagged[questionId],
          },
        })),

      setCurrentIndex: (index) =>
        set({
          currentIndex: index,
        }),

      setSyncStatus: (syncStatus) =>
        set({
          syncStatus,
          lastSyncedAt: syncStatus === "synced" ? new Date().toISOString() : undefined,
        }),

      setCompleted: () =>
        set({
          isCompleted: true,
        }),

      resetSession: () =>
        set(initialState),
    }),
    {
      name: "osn-exam-session-storage",
      storage: createJSONStorage(() => localStorage),
      // Hanya simpan field state penting ke localStorage
      partialize: (state) => ({
        sessionId: state.sessionId,
        examId: state.examId,
        studentName: state.studentName,
        studentClass: state.studentClass,
        questions: state.questions,
        currentIndex: state.currentIndex,
        answers: state.answers,
        flagged: state.flagged,
        startedAt: state.startedAt,
        serverEndTime: state.serverEndTime,
        isCompleted: state.isCompleted,
      }),
    }
  )
);

