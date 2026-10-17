export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface ExamRow {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  starts_at: string;
  ends_at: string;
  class_options: string[];
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export type QuestionType = "single_choice" | "multiple_choice" | "short_answer";

export interface QuestionRow {
  id: string;
  exam_id: string;
  order_index: number;
  question_type: QuestionType;
  prompt: string;
  options: Json;
  correct_answer?: Json;
  points: number;
  created_at: string;
}

export interface ReferralCodeRow {
  id: string;
  exam_id: string;
  code: string;
  max_uses: number | null;
  current_uses: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ExamSessionRow {
  id: string;
  exam_id: string;
  referral_code_id: string;
  session_token_hash: string;
  student_name: string;
  student_class: string;
  started_at: string;
  submitted_at: string | null;
  is_completed: boolean;
  total_score: number | null;
  client_metadata?: Json;
  created_at: string;
}

export interface SessionAnswerRow {
  id: string;
  session_id: string;
  question_id: string;
  answer_value: Json;
  is_flagged: boolean;
  awarded_score: number | null;
  last_updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      exams: {
        Row: ExamRow;
        Insert: Omit<ExamRow, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<ExamRow, "id">>;
      };
      questions: {
        Row: QuestionRow;
        Insert: Omit<QuestionRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<QuestionRow, "id">>;
      };
      referral_codes: {
        Row: ReferralCodeRow;
        Insert: Omit<ReferralCodeRow, "id" | "created_at" | "current_uses"> & {
          id?: string;
          created_at?: string;
          current_uses?: number;
        };
        Update: Partial<Omit<ReferralCodeRow, "id">>;
      };
      exam_sessions: {
        Row: ExamSessionRow;
        Insert: Omit<ExamSessionRow, "id" | "created_at" | "is_completed" | "total_score"> & {
          id?: string;
          created_at?: string;
          is_completed?: boolean;
          total_score?: number | null;
        };
        Update: Partial<Omit<ExamSessionRow, "id">>;
      };
      session_answers: {
        Row: SessionAnswerRow;
        Insert: Omit<SessionAnswerRow, "id" | "last_updated_at" | "awarded_score"> & {
          id?: string;
          last_updated_at?: string;
          awarded_score?: number | null;
        };
        Update: Partial<Omit<SessionAnswerRow, "id">>;
      };
    };
  };
}

