import { apiClient } from "@/services/apiClient";
import type { PaginatedResponse } from "@/types/api";

import type { Resume } from "./types";

export const resumeApi = {
  list: () => apiClient.get<PaginatedResponse<Resume>>("/resumes/"),

  upload: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.post<Resume>("/resumes/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};
