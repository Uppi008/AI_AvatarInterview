export type ParsingStatus = "pending" | "processing" | "completed" | "failed";

export interface Resume {
  id: string;
  file: string;
  original_filename: string;
  file_type: "pdf" | "docx";
  parsing_status: ParsingStatus;
  parsing_error: string;
  is_active: boolean;
  created_at: string;
  skills: { id: string; name: string; category: string }[];
  projects: { id: string; title: string; description: string; technologies?: string[]; duration?: string }[];
  experiences: {
    id: string;
    company: string;
    role: string;
    start_date?: string | null;
    end_date?: string | null;
    is_current?: boolean;
    description?: string;
  }[];
  education_history: {
    id: string;
    institution: string;
    degree: string;
    field_of_study?: string;
    start_date?: string | null;
    end_date?: string | null;
    grade?: string;
  }[];
  certifications: { id: string; name: string; issuer?: string; issue_date?: string | null }[];
  insight: {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    suggested_focus_areas?: string[];
  } | null;
}
