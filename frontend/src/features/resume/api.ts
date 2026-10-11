import { apiClient } from "@/services/apiClient";
import type { PaginatedResponse } from "@/types/api";

import type { Resume } from "./types";

export const resumeApi = {
  list: () => apiClient.get<PaginatedResponse<Resume>>("/resumes/"),

  upload: (file: File, onProgress?: (percent: number) => void) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.post<Resume>("/resumes/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      // Parsing runs inline on the free-tier backend, so the response can
      // arrive well after the bytes finish uploading.
      timeout: 180_000,
      onUploadProgress: (event) => {
        if (onProgress && event.total) onProgress(Math.round((event.loaded / event.total) * 100));
      },
    });
  },
};
