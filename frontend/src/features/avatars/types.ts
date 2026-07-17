export type AvatarCategory =
  | "hr_manager"
  | "technical_interviewer"
  | "senior_manager"
  | "ceo"
  | "female_hr"
  | "male_hr"
  | "friendly_brother"
  | "friendly_sister"
  | "parent_style"
  | "corporate_recruiter";

export type Difficulty = "easy" | "medium" | "hard";

export interface Avatar {
  id: string;
  name: string;
  category: AvatarCategory;
  image: string;
  voice_map: Record<string, string>;
  speaking_style: string;
  interview_style: string;
  difficulty: Difficulty;
  emotion_profile: Record<string, number>;
  supported_languages: string[];
}

export interface CustomAvatar {
  id: string;
  source_photo: string;
  generated_avatar_image: string | null;
  status: "pending" | "processing" | "ready" | "failed";
  failure_reason: string;
  created_at: string;
}
