export type InterviewStatus = "scheduled" | "in_progress" | "completed" | "terminated" | "abandoned";

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
