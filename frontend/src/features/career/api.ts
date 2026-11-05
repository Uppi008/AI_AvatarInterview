import { apiClient } from "@/services/apiClient";
import type { PaginatedResponse } from "@/types/api";

import type { AnswerPractice, JobMatch, StudyPlan } from "./types";

// LLM calls on the free-tier backend can take a while (plus a cold start).
const AI_TIMEOUT = 120_000;

export const careerApi = {
  listJobMatches: () => apiClient.get<PaginatedResponse<JobMatch>>("/career/job-matches/"),
  createJobMatch: (body: { job_description: string; job_title?: string; company?: string }) =>
    apiClient.post<JobMatch>("/career/job-matches/", body, { timeout: AI_TIMEOUT }),
  deleteJobMatch: (id: string) => apiClient.delete(`/career/job-matches/${id}/`),

  listPractices: () => apiClient.get<PaginatedResponse<AnswerPractice>>("/career/answer-practices/"),
  createPractice: (body: { question: string; answer: string; target_role?: string }) =>
    apiClient.post<AnswerPractice>("/career/answer-practices/", body, { timeout: AI_TIMEOUT }),
  deletePractice: (id: string) => apiClient.delete(`/career/answer-practices/${id}/`),

  listPlans: () => apiClient.get<PaginatedResponse<StudyPlan>>("/career/study-plans/"),
  createPlan: (body: { target_role?: string; days: number }) =>
    apiClient.post<StudyPlan>("/career/study-plans/", body, { timeout: AI_TIMEOUT }),
  updatePlanTasks: (id: string, completed_tasks: string[]) =>
    apiClient.patch<StudyPlan>(`/career/study-plans/${id}/`, { completed_tasks }),
  deletePlan: (id: string) => apiClient.delete(`/career/study-plans/${id}/`),
};
