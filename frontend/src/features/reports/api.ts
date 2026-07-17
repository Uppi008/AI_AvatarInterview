import { apiClient } from "@/services/apiClient";
import type { PaginatedResponse } from "@/types/api";

import type { InterviewReport } from "./types";

export const reportsApi = {
  list: () => apiClient.get<PaginatedResponse<InterviewReport>>("/reports/"),
};
