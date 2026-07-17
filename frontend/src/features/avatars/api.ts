import { apiClient } from "@/services/apiClient";
import type { PaginatedResponse } from "@/types/api";

import type { Avatar, CustomAvatar } from "./types";

export const avatarsApi = {
  list: (params?: { category?: string; difficulty?: string }) =>
    apiClient.get<PaginatedResponse<Avatar>>("/avatars/", { params }),

  listCustom: () => apiClient.get<PaginatedResponse<CustomAvatar>>("/avatars/custom/"),

  uploadCustom: (file: File) => {
    const formData = new FormData();
    formData.append("source_photo", file);
    return apiClient.post<CustomAvatar>("/avatars/custom/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};
