import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ClientQuestionItem, RecoverExamSessionData } from "@/actions/exam-session";
import type { Json } from "@/types/database";

export type ExamSyncStatus = "local" | "syncing" | "synced" | "error";

export interface ExamSessionState {
  sessionId: string | null;
  examId: string | null;
  examTitle: string;
  durationMinutes: number;
  startedAt: string | null;
  serverEndTime: string | null;
  serverTimeOffsetMs: number;
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
  isTerminated: boolean;
  terminationMessage: string | null;
}

export interface ExamSessionActions {
  initSession: (data: {
    sessionId: string;
    examId: string;
    examTitle: string;
    durationMinutes: number;
    startedAt: string;
    serverEndTime: string;
    serverTime?: string;
    studentName: string;
    studentClass: string;
    questions: ClientQuestionItem[];
  }) => void;
  recoverSession: (data: RecoverExamSessionData) => "local_merged" | "remote_restored";
  setAnswer: (questionId: string, answerValue: Json) => void;
  clearAnswer: (questionId: string) => void;
  toggleFlag: (questionId: string) => void;
  setCurrentIndex: (index: number) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  setSyncStatus: (status: ExamSyncStatus) => void;
  markQuestionsSynced: (questionIds: string[], syncedAt: string) => void;
  setSubmitted: (isSubmitted: boolean) => void;
  setSessionTerminated: (message?: string) => void;
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
      serverTimeOffsetMs: 0,
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
      isTerminated: false,
      terminationMessage: null,

      initSession: (data) => {
        const offset = data.serverTime
          ? new Date(data.serverTime).getTime() - Date.now()
          : 0;

        set({
          sessionId: data.sessionId,
          examId: data.examId,
          examTitle: data.examTitle,
          durationMinutes: data.durationMinutes,
          startedAt: data.startedAt,
          serverEndTime: data.serverEndTime,
          serverTimeOffsetMs: isNaN(offset) ? 0 : offset,
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
          isTerminated: false,
          terminationMessage: null,
        });
      },

      recoverSession: (data) => {
        const state = get();
        const offset = data.serverTime
          ? new Date(data.serverTime).getTime() - Date.now()
          : 0;
        const serverTimeOffsetMs = isNaN(offset) ? 0 : offset;

        // Skenario A: Data lokal di localStorage ada dan cocok dengan sesi ini
        const hasMatchingLocalSession =
          state.sessionId === data.sessionId &&
          (state.questions.length > 0 ||
            Object.keys(state.answersMap).length > 0 ||
            Object.keys(state.flaggedMap).length > 0);

        if (hasMatchingLocalSession) {
          // Gabungkan jawaban dari server untuk soal yang belum ada di lokal,
          // namun jangan timpa jawaban lokal yang ada / baru / dikosongkan
          const mergedAnswers: Record<string, Json> = {
            ...data.recoveredAnswersMap,
            ...state.answersMap,
          };

          const mergedFlagged: Record<string, boolean> = {
            ...data.recoveredFlaggedMap,
            ...state.flaggedMap,
          };

          // Batasi currentIndex agar tetap valid
          const safeQuestions =
            data.questions.length > 0 ? data.questions : state.questions;
          const safeIndex = Math.min(
            Math.max(0, state.currentIndex),
            Math.max(0, safeQuestions.length - 1)
          );

          set({
            questions: safeQuestions,
            currentIndex: safeIndex,
            answersMap: mergedAnswers,
            flaggedMap: mergedFlagged,
            serverEndTime: data.serverEndTime,
            serverTimeOffsetMs,
            lastSyncedAt: data.lastSyncedAt || state.lastSyncedAt,
            isTerminated: false,
            terminationMessage: null,
          });

          return "local_merged";
        }

        // Skenario B: Data lokal hilang / ganti browser / mode samaran / sesi berbeda
        set({
          sessionId: data.sessionId,
          examId: data.examId,
          examTitle: data.examTitle,
          durationMinutes: data.durationMinutes,
          startedAt: data.startedAt,
          serverEndTime: data.serverEndTime,
          serverTimeOffsetMs,
          studentName: data.studentName,
          studentClass: data.studentClass,
          questions: data.questions,
          currentIndex: 0,
          answersMap: { ...data.recoveredAnswersMap },
          flaggedMap: { ...data.recoveredFlaggedMap },
          dirtyQuestionIds: [],
          syncStatus: "synced",
          lastSyncedAt: data.lastSyncedAt,
          isSubmitted: false,
          isTerminated: false,
          terminationMessage: null,
        });

        return "remote_restored";
      },

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

      setSessionTerminated: (message) =>
        set({
          isTerminated: true,
          terminationMessage:
            message ||
            "Sesi ujian Anda telah dihapus atau dibatalkan oleh pengawas ujian.",
        }),

      clearSession: () =>
        set({
          sessionId: null,
          examId: null,
          examTitle: "",
          durationMinutes: 0,
          startedAt: null,
          serverEndTime: null,
          serverTimeOffsetMs: 0,
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
          isTerminated: false,
          terminationMessage: null,
        }),
    }),
    {
      name: "osn_exam_session_storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
