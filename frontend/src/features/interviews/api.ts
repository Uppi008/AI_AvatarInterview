import { apiClient } from "@/services/apiClient";
import type { PaginatedResponse } from "@/types/api";

import type { InterviewSession } from "./types";

export const interviewsApi = {
  list: () => apiClient.get<PaginatedResponse<InterviewSession>>("/interviews/"),
};
