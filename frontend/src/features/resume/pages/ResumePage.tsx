import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileText, UploadCloud } from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { getApiErrorMessage } from "@/services/apiClient";

import { resumeApi } from "../api";
import type { Resume } from "../types";

const STATUS_LABEL: Record<Resume["parsing_status"], string> = {
  pending: "Queued",
  processing: "Analyzing...",
  completed: "Ready",
  failed: "Failed",
};

const STATUS_TONE: Record<Resume["parsing_status"], "slate" | "brand" | "green" | "red"> = {
  pending: "slate",
  processing: "brand",
  completed: "green",
  failed: "red",
};

export function ResumePage() {
  const { t } = useTranslation();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await resumeApi.list();
      setResumes(data.results);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleFile = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      await resumeApi.upload(file);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't upload that resume."));
    } finally {
      setUploading(false);
    }
  };

  const activeResume = resumes.find((r) => r.is_active) ?? null;

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("nav.resume")}</CardTitle>
          </CardHeader>

          <div
            className={
              "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors " +
              (dragActive
                ? "border-brand-500 bg-brand-50 dark:bg-brand-950/20"
                : "border-slate-300 dark:border-slate-700")
            }
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              const file = e.dataTransfer.files[0];
              if (file) void handleFile(file);
            }}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
              <UploadCloud className="h-6 w-6" />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Drag & drop your resume, or</p>
            <Button variant="outline" size="sm" isLoading={uploading} onClick={() => fileInputRef.current?.click()}>
              {t("dashboard.uploadResume")}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
                e.target.value = "";
              }}
            />
            <p className="text-xs text-slate-400">PDF or DOCX, up to 10MB</p>
          </div>

          {error && (
            <Alert tone="error" className="mt-3">
              {error}
            </Alert>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current resume</CardTitle>
          </CardHeader>
          {loading ? (
            <div className="flex h-24 items-center justify-center">
              <Spinner />
            </div>
          ) : !activeResume ? (
            <EmptyState icon={FileText} title={t("dashboard.noResume")} />
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                    {activeResume.original_filename}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(activeResume.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <Badge tone={STATUS_TONE[activeResume.parsing_status]} dot>
                {STATUS_LABEL[activeResume.parsing_status]}
              </Badge>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
