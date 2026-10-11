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
  feedback_text: string;
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
  questions: InterviewQuestion[];
}

export interface StartInterviewPayload {
  avatar_id: string;
  resume_id?: string;
  language: "en" | "hi" | "te";
  personality?: InterviewPersonality;
}
