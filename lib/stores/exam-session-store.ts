import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ClientQuestionItem } from "@/actions/exam-session";
import type { Json } from "@/types/database";

export type ExamSyncStatus = "local" | "syncing" | "synced" | "error";

export interface ExamSessionState {
  sessionId: string | null;
  examId: string | null;
  examTitle: string;
  durationMinutes: number;
  startedAt: string | null;
  serverEndTime: string | null;
  studentName: string;
  studentClass: string;
  questions: ClientQuestionItem[];
  currentIndex: number;
  answersMap: Record<string, Json>;
  flaggedMap: Record<string, boolean>;
  dirtyQuestionIds: string[];
  syncStatus: ExamSyncStatus;
  lastSyncedAt: string | null;
  isSubmitted: boolean;
}

export interface ExamSessionActions {
  initSession: (data: {
    sessionId: string;
    examId: string;
    examTitle: string;
    durationMinutes: number;
    startedAt: string;
    serverEndTime: string;
    studentName: string;
    studentClass: string;
    questions: ClientQuestionItem[];
  }) => void;
  setAnswer: (questionId: string, answerValue: Json) => void;
  clearAnswer: (questionId: string) => void;
  toggleFlag: (questionId: string) => void;
  setCurrentIndex: (index: number) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  setSyncStatus: (status: ExamSyncStatus) => void;
  markQuestionsSynced: (questionIds: string[], syncedAt: string) => void;
  setSubmitted: (isSubmitted: boolean) => void;
  clearSession: () => void;
}

export type ExamSessionStore = ExamSessionState & ExamSessionActions;

function addUniqueQuestionId(list: string[], questionId: string): string[] {
  return list.includes(questionId) ? list : [...list, questionId];
}

export const useExamSessionStore = create<ExamSessionStore>()(
  persist(
    (set, get) => ({
      sessionId: null,
      examId: null,
      examTitle: "",
      durationMinutes: 0,
      startedAt: null,
      serverEndTime: null,
      studentName: "",
      studentClass: "",
      questions: [],
      currentIndex: 0,
      answersMap: {},
      flaggedMap: {},
      dirtyQuestionIds: [],
      syncStatus: "synced",
      lastSyncedAt: null,
      isSubmitted: false,

      initSession: (data) =>
        set({
          sessionId: data.sessionId,
          examId: data.examId,
          examTitle: data.examTitle,
          durationMinutes: data.durationMinutes,
          startedAt: data.startedAt,
          serverEndTime: data.serverEndTime,
          studentName: data.studentName,
          studentClass: data.studentClass,
          questions: data.questions,
          currentIndex: 0,
          answersMap: {},
          flaggedMap: {},
          dirtyQuestionIds: [],
          syncStatus: "synced",
          lastSyncedAt: null,
          isSubmitted: false,
        }),

      setAnswer: (questionId, answerValue) =>
        set((state) => ({
          answersMap: {
            ...state.answersMap,
            [questionId]: answerValue,
          },
          dirtyQuestionIds: addUniqueQuestionId(state.dirtyQuestionIds, questionId),
          syncStatus: "local",
        })),

      clearAnswer: (questionId) =>
        set((state) => {
          const nextAnswers = { ...state.answersMap };
          delete nextAnswers[questionId];
          return {
            answersMap: nextAnswers,
            dirtyQuestionIds: addUniqueQuestionId(state.dirtyQuestionIds, questionId),
            syncStatus: "local",
          };
        }),

      toggleFlag: (questionId) =>
        set((state) => ({
          flaggedMap: {
            ...state.flaggedMap,
            [questionId]: !state.flaggedMap[questionId],
          },
          dirtyQuestionIds: addUniqueQuestionId(state.dirtyQuestionIds, questionId),
          syncStatus: "local",
        })),

      setCurrentIndex: (index) => {
        const { questions } = get();
        if (index >= 0 && index < questions.length) {
          set({ currentIndex: index });
        }
      },

      nextQuestion: () => {
        const { currentIndex, questions } = get();
        if (currentIndex < questions.length - 1) {
          set({ currentIndex: currentIndex + 1 });
        }
      },

      prevQuestion: () => {
        const { currentIndex } = get();
        if (currentIndex > 0) {
          set({ currentIndex: currentIndex - 1 });
        }
      },

      setSyncStatus: (syncStatus) => set({ syncStatus }),

      markQuestionsSynced: (questionIds, syncedAt) =>
        set((state) => {
          const remainingDirty = state.dirtyQuestionIds.filter(
            (id) => !questionIds.includes(id)
          );
          return {
            dirtyQuestionIds: remainingDirty,
            lastSyncedAt: syncedAt,
            syncStatus: remainingDirty.length === 0 ? "synced" : "local",
          };
        }),

      setSubmitted: (isSubmitted) => set({ isSubmitted }),

      clearSession: () =>
        set({
          sessionId: null,
          examId: null,
          examTitle: "",
          durationMinutes: 0,
          startedAt: null,
          serverEndTime: null,
          studentName: "",
          studentClass: "",
          questions: [],
          currentIndex: 0,
          answersMap: {},
          flaggedMap: {},
          dirtyQuestionIds: [],
          syncStatus: "synced",
          lastSyncedAt: null,
          isSubmitted: false,
        }),
    }),
    {
      name: "osn_exam_session_storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
