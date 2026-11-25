import { apiClient } from "@/services/apiClient";
import type { PaginatedResponse } from "@/types/api";

import type { AnswerPractice } from "@/features/career/types";

export interface StreakInfo {
  current: number;
  longest: number;
  active_today: boolean;
  total_active_days: number;
  last_7_days: { date: string; active: boolean }[];
}

export interface BadgeInfo {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  earned: boolean;
}

export interface ProgressInfo {
  streak: StreakInfo;
  badges: BadgeInfo[];
}

export interface DailyQuestion {
  date: string;
  question: string;
  practice: AnswerPractice | null;
}

export type NotificationKind = "report_ready" | "reminder" | "scheduled" | "badge" | "general";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  link: string;
  read_at: string | null;
  created_at: string;
}

export interface StudentProgressRow {
  id: string;
  full_name: string;
  email: string;
  institution: string;
  graduation_year: number | null;
  interviews_completed: number;
  average_score: number | null;
  best_score: number | null;
  last_interview_at: string | null;
  joined_at: string;
}

export interface PlatformAnalytics {
  total_students: number;
  total_interviews: number;
  completed_interviews: number;
  terminated_interviews: number;
  average_overall_score: number;
}

export const engagementApi = {
  progress: () => apiClient.get<ProgressInfo>("/engagement/progress/"),
  dailyQuestion: () => apiClient.get<DailyQuestion>("/engagement/daily-question/"),
};

export const notificationsApi = {
  list: () => apiClient.get<PaginatedResponse<AppNotification> & { unread_count: number }>("/notifications/"),
  markRead: (id: string) => apiClient.post<AppNotification>(`/notifications/${id}/read/`),
  markAllRead: () => apiClient.post<{ updated: number }>("/notifications/read-all/"),
};

export const adminApi = {
  analytics: () => apiClient.get<PlatformAnalytics>("/admin/analytics/"),
  students: (params: { institution?: string; search?: string }) =>
    apiClient.get<{ count: number; institutions: string[]; results: StudentProgressRow[] }>("/admin/students/", {
      params,
    }),
};
