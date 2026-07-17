export type UserRole = "student" | "admin";
export type LanguageCode = "en" | "hi" | "te";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  preferred_language: LanguageCode;
  dark_mode_enabled: boolean;
  is_email_verified: boolean;
  created_at: string;
}

export interface StudentProfile {
  id: string;
  user: User;
  phone_number: string;
  profile_photo: string | null;
  bio: string;
  date_of_birth: string | null;
  institution: string;
  graduation_year: number | null;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  full_name: string;
  password: string;
  password_confirm: string;
  preferred_language?: LanguageCode;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginResponse extends AuthTokens {
  user: User;
}
