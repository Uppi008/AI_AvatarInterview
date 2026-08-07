import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { UploadCloud } from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { getApiErrorMessage } from "@/services/apiClient";

import { avatarsApi } from "../api";
import type { CustomAvatar } from "../types";

const STATUS_LABEL: Record<CustomAvatar["status"], string> = {
  pending: "Queued",
  processing: "Generating...",
  ready: "Ready",
  failed: "Failed",
};

const STATUS_TONE: Record<CustomAvatar["status"], "slate" | "brand" | "green" | "red"> = {
  pending: "slate",
  processing: "brand",
  ready: "green",
  failed: "red",
};

export function CustomAvatarPanel() {
  const { t } = useTranslation();
  const [customAvatars, setCustomAvatars] = useState<CustomAvatar[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    void avatarsApi.listCustom().then(({ data }) => setCustomAvatars(data.results));
  };

  useEffect(() => {
    load();
  }, []);

  const handleFile = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      await avatarsApi.uploadCustom(file);
      load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't process that photo."));
    } finally {
      setUploading(false);
    }
  };

  const latest = customAvatars[0] ?? null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("avatars.customTitle")}</CardTitle>
      </CardHeader>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">{t("avatars.customSubtitle")}</p>

      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          {latest?.generated_avatar_image ? (
            <img src={latest.generated_avatar_image} alt="Your custom avatar" className="h-full w-full object-cover" />
          ) : (
            <UploadCloud className="h-6 w-6 text-slate-400" />
          )}
        </div>
        <div>
          <Button variant="outline" size="sm" isLoading={uploading} onClick={() => fileInputRef.current?.click()}>
            {t("avatars.uploadPhoto")}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = "";
            }}
          />
          {latest && (
            <div className="mt-2 flex items-center gap-2">
              <Badge tone={STATUS_TONE[latest.status]} dot>
                {STATUS_LABEL[latest.status]}
              </Badge>
              {latest.status === "failed" && latest.failure_reason && (
                <span className="text-xs text-slate-500 dark:text-slate-400">{latest.failure_reason}</span>
              )}
            </div>
          )}
        </div>
      </div>
      {error && (
        <Alert className="mt-3" tone="error">
          {error}
        </Alert>
      )}
    </Card>
  );
}
