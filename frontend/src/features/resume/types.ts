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
  projects: { id: string; title: string; description: string }[];
  experiences: { id: string; company: string; role: string }[];
  education_history: { id: string; institution: string; degree: string }[];
  certifications: { id: string; name: string }[];
  insight: { summary: string; strengths: string[]; weaknesses: string[] } | null;
}
