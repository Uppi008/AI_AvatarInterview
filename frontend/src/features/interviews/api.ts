import { apiClient } from "@/services/apiClient";
import type { PaginatedResponse } from "@/types/api";

import type { InterviewSession, InterviewSessionDetail, StartInterviewPayload } from "./types";

export const interviewsApi = {
  list: () => apiClient.get<PaginatedResponse<InterviewSession>>("/interviews/"),

  retrieve: (id: string) => apiClient.get<InterviewSessionDetail>(`/interviews/${id}/`),

  start: (payload: StartInterviewPayload) =>
    apiClient.post<InterviewSessionDetail>("/interviews/", payload),

  end: (id: string) => apiClient.post<InterviewSessionDetail>(`/interviews/${id}/end/`),
};
