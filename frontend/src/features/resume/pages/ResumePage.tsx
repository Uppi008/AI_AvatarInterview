import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileText, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
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

export function ResumePage() {
  const { t } = useTranslation();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
            className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-300 px-6 py-10 text-center dark:border-slate-700"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) void handleFile(file);
            }}
          >
            <UploadCloud className="h-8 w-8 text-slate-400" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Drag & drop your resume, or
            </p>
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

          {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current resume</CardTitle>
          </CardHeader>
          {loading ? (
            <Spinner />
          ) : !activeResume ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">{t("dashboard.noResume")}</p>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-brand-600" />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {activeResume.original_filename}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(activeResume.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                {STATUS_LABEL[activeResume.parsing_status]}
              </span>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
