export interface WSQuestion {
  id: string;
  text: string;
  question_type: "resume_based" | "behavioral" | "coding" | "follow_up";
  difficulty: "easy" | "medium" | "hard";
  order_index: number;
  audio_base64: string | null;
}

export interface WSProgress {
  answered: number;
  total: number;
}

export interface WSScores {
  technical: number;
  communication: number;
  relevance: number;
  confidence: number;
}

export type ServerMessage =
  | { type: "question"; question: WSQuestion; progress: WSProgress }
  | { type: "evaluation"; question_id: string; feedback: string; scores: WSScores }
  | { type: "interview_complete" }
  | { type: "interview_terminated"; reason: string; violation_count: number }
  | { type: "interview_ended"; session_id: string }
  | { type: "violation_warning"; event_type: string; violation_count: number; max_violations: number }
  | { type: "monitoring_notice"; event_type: string }
  | { type: "error"; detail: string };

export type ClientMessage =
  | { type: "answer_audio"; audio_base64: string; mime_type: string }
  | { type: "answer_text"; text: string }
  | { type: "skip_question" }
  | { type: "repeat_question" }
  | { type: "end_interview" }
  | { type: "proctoring_event"; event_type: string; metadata?: Record<string, unknown> };

/** Proctoring event types the backend recognizes (apps.monitoring.models.ProctoringEvent.EventType). */
export type ProctoringEventType =
  | "no_face"
  | "multiple_faces"
  | "looking_away"
  | "head_rotation"
  | "lip_movement_anomaly"
  | "mobile_usage"
  | "tab_switch"
  | "window_minimized"
  | "browser_refresh"
  | "mic_disabled"
  | "camera_disabled"
  | "internet_disconnected";
