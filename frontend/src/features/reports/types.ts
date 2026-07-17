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
  strengths: string[];
  weaknesses: string[];
  improvement_tips: string[];
  pdf_file: string | null;
  generated_at: string;
  emailed_at: string | null;
}
