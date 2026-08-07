export type HiringRecommendation = "" | "strong_hire" | "hire" | "no_hire" | "strong_no_hire";

export interface InterviewReport {
  id: string;
  session: string;
  overall_score: string;
  communication_score: string;
  technical_score: string;
  confidence_score: string;
  body_language_score: string;
  eye_contact_score: string;
  resume_matching_score: string;
  voice_clarity_score: string;
  grammar_score: string;
  problem_solving_score: string;
  strengths: string[];
  weaknesses: string[];
  improvement_tips: string[];
  spoken_summary: string;
  learning_roadmap: string[];
  career_suggestions: string[];
  recommended_courses: string[];
  recommended_certifications: string[];
  recommended_projects: string[];
  hiring_recommendation: HiringRecommendation;
  hiring_recommendation_display: string;
  hiring_recommendation_reason: string;
  pdf_file: string | null;
  generated_at: string;
  emailed_at: string | null;
}
