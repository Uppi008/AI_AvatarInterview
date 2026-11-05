export type Language = "en" | "hi" | "te";

export interface LikelyQuestion {
  question: string;
  why_asked: string;
}

export interface JobMatch {
  id: string;
  resume: string | null;
  job_title: string;
  company: string;
  job_description: string;
  language: Language;
  match_score: string;
  verdict: string;
  matched_skills: string[];
  missing_skills: string[];
  strengths: string[];
  resume_tips: string[];
  likely_questions: LikelyQuestion[];
  created_at: string;
}

export interface StarPart {
  present: boolean;
  comment: string;
}

export interface Delivery {
  word_count: number;
  speaking_seconds: number;
  filler_count: number;
  filler_rate: number;
  fillers: Record<string, number>;
  avg_sentence_words: number;
  length_verdict: "too_short" | "good" | "too_long";
  uses_numbers: boolean;
}

export interface AnswerPractice {
  id: string;
  question: string;
  answer: string;
  target_role: string;
  language: Language;
  overall_score: string;
  clarity_score: string;
  relevance_score: string;
  impact_score: string;
  star: Record<"situation" | "task" | "action" | "result", StarPart>;
  strengths: string[];
  improvements: string[];
  improved_answer: string;
  delivery: Delivery;
  created_at: string;
}

export interface StudyDay {
  day: number;
  title: string;
  focus: string;
  tasks: string[];
  practice_question: string;
  resources: string[];
}

export interface StudyPlan {
  id: string;
  target_role: string;
  language: Language;
  summary: string;
  focus_areas: string[];
  days: StudyDay[];
  completed_tasks: string[];
  total_tasks: number;
  sources: { reports: number; resume: boolean };
  created_at: string;
}
