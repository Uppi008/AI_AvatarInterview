import { apiClient } from "@/services/apiClient";
import type { PaginatedResponse } from "@/types/api";

import type { InterviewReport, SharedReport } from "./types";

export const reportsApi = {
  list: () => apiClient.get<PaginatedResponse<InterviewReport>>("/reports/"),

  retrieveBySession: (sessionId: string) =>
    apiClient
      .get<PaginatedResponse<InterviewReport>>("/reports/", { params: { session: sessionId } })
      .then(({ data }) => data.results[0] ?? null),

  share: (reportId: string) => apiClient.post<{ share_token: string }>(`/reports/${reportId}/share/`),

  unshare: (reportId: string) => apiClient.delete(`/reports/${reportId}/share/`),

  /** Public: no login needed. */
  getShared: (token: string) => apiClient.get<SharedReport>(`/reports/shared/${token}/`),
};
