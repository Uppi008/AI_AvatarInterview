export type InterviewStatus = "scheduled" | "in_progress" | "completed" | "terminated" | "abandoned";
export type QuestionType = "resume_based" | "behavioral" | "coding" | "follow_up";

export interface InterviewSession {
  id: string;
  avatar: string;
  avatar_name: string;
  language: "en" | "hi" | "te";
  status: InterviewStatus;
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number;
  violation_count: number;
}

export interface InterviewQuestion {
  id: string;
  question_text: string;
  question_type: QuestionType;
  difficulty: "easy" | "medium" | "hard";
  order_index: number;
  asked_at: string | null;
  skipped: boolean;
  follow_ups: InterviewQuestion[];
}

export interface InterviewSessionDetail extends InterviewSession {
  termination_reason: string;
  resume: string | null;
  questions: InterviewQuestion[];
}

export interface StartInterviewPayload {
  avatar_id: string;
  resume_id?: string;
  language: "en" | "hi" | "te";
}
