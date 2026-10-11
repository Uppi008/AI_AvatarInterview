import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Camera, ScanFace, UploadCloud } from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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
    <Card className="flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative h-24 w-24 shrink-0 self-center overflow-hidden rounded-2xl bg-gradient-to-br from-brand-100 to-indigo-100 ring-1 ring-inset ring-brand-600/10 dark:from-brand-900/40 dark:to-indigo-900/30 sm:self-auto">
        {latest?.generated_avatar_image ? (
          <img src={latest.generated_avatar_image} alt="Your custom avatar" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-brand-500 dark:text-brand-300">
            <ScanFace className="h-9 w-9" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t("avatars.customTitle")}</h2>
          {latest && (
            <Badge tone={STATUS_TONE[latest.status]} dot>
              {STATUS_LABEL[latest.status]}
            </Badge>
          )}
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("avatars.customSubtitle")}</p>
        {latest?.status === "failed" && latest.failure_reason && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{latest.failure_reason}</p>
        )}
      </div>
      <div className="shrink-0">
        <Button variant="outline" isLoading={uploading} onClick={() => fileInputRef.current?.click()}>
          {!uploading && (latest ? <Camera className="h-4 w-4" /> : <UploadCloud className="h-4 w-4" />)}
          {latest ? "Try another photo" : t("avatars.uploadPhoto")}
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
      </div>
      {error && (
        <Alert className="sm:basis-full" tone="error">
          {error}
        </Alert>
      )}
    </Card>
  );
}
