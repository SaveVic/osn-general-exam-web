import type { QuestionType } from "./database";

export type ExamStatus = "upcoming" | "ongoing" | "ended";

export interface QuestionChoice {
  id: string; // e.g. "A", "B", "C", "D", "E"
  text: string;
}

/**
 * Butir soal aman untuk sisi klien (bebas dari properti correct_answer / rubrik)
 */
export interface PublicQuestion {
  id: string;
  exam_id: string;
  order_index: number;
  question_type: QuestionType;
  prompt: string;
  options: QuestionChoice[] | null;
  points: number;
}

export interface ExamDetail {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  starts_at: string;
  ends_at: string;
  class_options: string[];
  is_published: boolean;
}

export interface ReferralValidationResult {
  valid: boolean;
  message?: string;
  exam?: ExamDetail;
  referral_code_id?: string;
}

