import type { PublicQuestion } from "./exam";

export type AnswerValue = string | string[] | number | null;

export type AnswersMap = Record<string, AnswerValue>; // questionId -> answer
export type FlaggedMap = Record<string, boolean>;     // questionId -> isFlagged

export type SyncStatus = "idle" | "saving" | "synced" | "error";

export interface ExamSessionState {
  sessionId: string | null;
  examId: string | null;
  studentName: string | null;
  studentClass: string | null;
  questions: PublicQuestion[];
  currentIndex: number;
  answers: AnswersMap;
  flagged: FlaggedMap;
  startedAt: string | null;
  serverEndTime: string | null;
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
  isCompleted: boolean;
}

export interface ExamSessionActions {
  initSession: (data: Partial<ExamSessionState>) => void;
  setAnswer: (questionId: string, answer: AnswerValue) => void;
  toggleFlag: (questionId: string) => void;
  setCurrentIndex: (index: number) => void;
  setSyncStatus: (status: SyncStatus) => void;
  setCompleted: () => void;
  resetSession: () => void;
}

