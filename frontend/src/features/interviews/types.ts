export type InterviewStatus = "scheduled" | "in_progress" | "completed" | "terminated" | "abandoned";
export type QuestionType = "resume_based" | "behavioral" | "coding" | "follow_up";
export type InterviewPersonality =
  | ""
  | "friendly"
  | "professional"
  | "strict_hr"
  | "technical"
  | "manager"
  | "ceo"
  | "mentor"
  | "recruiter";

export type InterviewType = "mixed" | "hr" | "technical";

export interface InterviewSession {
  id: string;
  avatar: string;
  avatar_name: string;
  avatar_image: string;
  language: "en" | "hi" | "te";
  personality: InterviewPersonality;
  status: InterviewStatus;
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number;
  violation_count: number;
  /** Questions with a recorded answer. */
  answered_count: number;
  /** The report's overall score, or null if no report exists yet. */
  report_score: number | null;
  target_role: string;
  company: string;
  interview_type: InterviewType;
  question_count: number;
}

export interface InterviewQuestion {
  id: string;
  question_text: string;
  question_type: QuestionType;
  difficulty: "easy" | "medium" | "hard";
  order_index: number;
  asked_at: string | null;
  skipped: boolean;
  answer: InterviewAnswer | null;
  follow_ups: InterviewQuestion[];
}

export interface AnswerEvaluation {
  technical_score: string;
  communication_score: string;
  relevance_score: string;
  confidence_score: string;
  grammar_score?: string;
  feedback_text: string;
  /** A strong example answer to compare against (newer sessions only). */
  model_answer?: string;
}

export interface InterviewAnswer {
  transcript_text: string;
  audio_file: string | null;
  response_time_seconds: number | null;
  answered_at: string;
  evaluation: AnswerEvaluation | null;
}

export interface InterviewSessionDetail extends InterviewSession {
  termination_reason: string;
  resume: string | null;
  job_description: string;
  questions: InterviewQuestion[];
}

export interface StartInterviewPayload {
  avatar_id: string;
  resume_id?: string;
  language: "en" | "hi" | "te";
  personality?: InterviewPersonality;
  target_role?: string;
  company?: string;
  job_description?: string;
  interview_type?: InterviewType;
  question_count?: number;
  /** ISO time: books the interview for later instead of starting now. */
  scheduled_at?: string;
}
