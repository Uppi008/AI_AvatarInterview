import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Briefcase,
  CheckCircle2,
  Code2,
  ExternalLink,
  FileText,
  FolderGit2,
  History,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Target,
  XCircle,
} from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { getApiErrorMessage } from "@/services/apiClient";
import { cn } from "@/utils/cn";

import { resumeApi } from "../api";
import { ResumeAnalysis } from "../components/ResumeAnalysis";
import { ResumeDropzone } from "../components/ResumeDropzone";
import type { Resume } from "../types";
import { validateResumeFile } from "../validation";

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

const POLL_MS = 4000;

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: "easeOut" as const, delay },
});

function formatDate(date: string) {
  return new Date(date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function FileBadge({ type, className }: { type: Resume["file_type"]; className?: string }) {
  return (
    <div
      className={cn(
        "relative flex h-14 w-12 shrink-0 items-end justify-center rounded-lg pb-1.5 text-[10px] font-bold text-white shadow-md",
        type === "pdf" ? "bg-gradient-to-br from-red-400 to-rose-600 shadow-red-500/20" : "bg-gradient-to-br from-sky-400 to-blue-600 shadow-blue-500/20",
        className
      )}
    >
      <span className="absolute right-0 top-0 h-3.5 w-3.5 rounded-bl-md bg-white/30" />
      {type.toUpperCase()}
    </div>
  );
}

export function ResumePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [uploadName, setUploadName] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await resumeApi.list();
      setResumes(data.results);
      setLoadError(null);
    } catch (err) {
      setLoadError(getApiErrorMessage(err, "Couldn't load your resume."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activeResume = resumes.find((r) => r.is_active) ?? null;
  const previousResumes = resumes.filter((r) => !r.is_active);
  const isParsing = activeResume?.parsing_status === "pending" || activeResume?.parsing_status === "processing";

  // Keep checking while the backend is still parsing, so the page fills in by itself.
  useEffect(() => {
    if (!isParsing) return;
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(id);
  }, [isParsing, load]);

  const handleFile = async (file: File) => {
    const invalid = validateResumeFile(file);
    if (invalid) {
      setUploadError(invalid);
      return;
    }
    setUploadError(null);
    setUploadName(file.name);
    setProgress(0);
    try {
      await resumeApi.upload(file, setProgress);
      await load();
    } catch (err) {
      setUploadError(getApiErrorMessage(err, "Couldn't upload that resume."));
    } finally {
      setProgress(null);
      setUploadName(null);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <Spinner />
        </div>
      </DashboardLayout>
    );
  }

  const stats = activeResume
    ? [
        { icon: Code2, label: t("resume.skills", "Skills"), value: activeResume.skills.length },
        { icon: FolderGit2, label: t("resume.projects", "Projects"), value: activeResume.projects.length },
        { icon: Briefcase, label: t("resume.experience", "Experience"), value: activeResume.experiences.length },
      ]
    : [];

  // Project titles first (the interviewer leans on them), then technical skills.
  const interviewTopics = activeResume
    ? [
        ...activeResume.projects.map((p) => p.title),
        ...activeResume.skills.filter((s) => s.category === "technical").map((s) => s.name),
      ].slice(0, 8)
    : [];

  return (
    <DashboardLayout>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        {/* Hero */}
        <motion.div
          {...fadeUp()}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-indigo-600 to-indigo-800 p-6 text-white shadow-lg shadow-brand-900/20 sm:p-8"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.14)_1px,transparent_0)] bg-[size:22px_22px]" />
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-brand-100">{t("nav.resume")}</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                {activeResume
                  ? t("resume.heroTitleHas", "Your resume, decoded")
                  : t("resume.heroTitleNone", "Get interview questions made for you")}
              </h1>
              <p className="mt-2 text-brand-100">
                {t(
                  "resume.heroSubtitle",
                  "We read your resume so the AI interviewer can ask about your real projects, skills and experience."
                )}
              </p>
            </div>
            {activeResume?.parsing_status === "completed" && (
              <Button variant="secondary" className="shrink-0 self-start md:self-auto" onClick={() => navigate("/avatars")}>
                <Sparkles className="h-4 w-4" />
                {t("dashboard.startInterview")}
              </Button>
            )}
          </div>
        </motion.div>

        {loadError && <Alert tone="error">{loadError}</Alert>}

        {!activeResume ? (
          <>
            <motion.div {...fadeUp(0.05)}>
              <Card className="p-4 sm:p-6">
                <ResumeDropzone progress={progress} fileName={uploadName} error={uploadError} onFile={(f) => void handleFile(f)} />
              </Card>
            </motion.div>

            <motion.div {...fadeUp(0.1)} className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[
                {
                  icon: ScanSearch,
                  title: t("resume.featExtractTitle", "Smart extraction"),
                  text: t("resume.featExtract", "Skills, projects, experience and education are pulled out automatically."),
                },
                {
                  icon: Target,
                  title: t("resume.featQuestionsTitle", "Tailored questions"),
                  text: t("resume.featQuestions", "Your interviewer asks about what you've actually built and done."),
                },
                {
                  icon: ShieldCheck,
                  title: t("resume.featPrivateTitle", "Private to you"),
                  text: t("resume.featPrivate", "Only you can see your resume. Upload a new one anytime to replace it."),
                },
              ].map(({ icon: Icon, title, text }) => (
                <Card key={title} className="flex gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-600/10 dark:bg-brand-900/40 dark:text-brand-300">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{text}</p>
                  </div>
                </Card>
              ))}
            </motion.div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Current resume */}
              <motion.div {...fadeUp(0.05)} className="lg:col-span-2">
                <Card className="flex h-full flex-col">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <FileBadge type={activeResume.file_type} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-lg font-semibold text-slate-900 dark:text-white">
                          {activeResume.original_filename}
                        </h2>
                        <Badge tone={STATUS_TONE[activeResume.parsing_status]} dot>
                          {STATUS_LABEL[activeResume.parsing_status]}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {t("resume.uploadedOn", "Uploaded {{date}}", { date: formatDate(activeResume.created_at) })} ·{" "}
                        {t("resume.activeHint", "Used for your next interview")}
                      </p>
                    </div>
                    {activeResume.file && (
                      <a
                        href={activeResume.file}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <ExternalLink className="h-4 w-4" />
                        {t("resume.viewFile", "View file")}
                      </a>
                    )}
                  </div>

                  <div className="mt-6 flex-1">
                    {(activeResume.parsing_status === "completed" || isParsing) && (
                      <div className={cn("grid grid-cols-3 gap-3", isParsing && "mb-4 animate-pulse")}>
                        {stats.map(({ icon: Icon, label, value }) => (
                          <div
                            key={label}
                            className="rounded-xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200/70 dark:bg-slate-800/50 dark:ring-slate-700/60"
                          >
                            <Icon className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{isParsing ? "–" : value}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {isParsing && (
                      <div className="flex items-center gap-4 rounded-xl bg-brand-50 p-4 ring-1 ring-inset ring-brand-200/60 dark:bg-brand-900/20 dark:ring-brand-900/50">
                        <Spinner />
                        <div>
                          <p className="text-sm font-semibold text-brand-900 dark:text-brand-200">
                            {t("resume.analyzing", "Analyzing your resume…")}
                          </p>
                          <p className="text-sm text-brand-700/80 dark:text-brand-300/80">
                            {t("resume.autoRefresh", "This page updates automatically when it's done.")}
                          </p>
                        </div>
                      </div>
                    )}
                    {activeResume.parsing_status === "failed" && (
                      <div className="flex items-start gap-3 rounded-xl bg-red-50 p-4 ring-1 ring-inset ring-red-200 dark:bg-red-950/30 dark:ring-red-900/50">
                        <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                        <div>
                          <p className="text-sm font-semibold text-red-900 dark:text-red-200">
                            {t("resume.failedTitle", "We couldn't read this resume")}
                          </p>
                          <p className="mt-0.5 text-sm text-red-700/90 dark:text-red-300/90">
                            {activeResume.parsing_error ||
                              t("resume.failedHint", "Try a text-based PDF or DOCX (not a scanned image).")}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {activeResume.parsing_status === "completed" && interviewTopics.length > 0 && (
                    <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
                      <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        <Target className="h-3.5 w-3.5" />
                        {t("resume.expectQuestions", "Your interviewer will likely ask about")}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {interviewTopics.map((topic) => (
                          <span
                            key={topic}
                            className="rounded-full bg-gradient-to-r from-brand-50 to-indigo-50 px-3 py-1 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-600/15 dark:from-brand-900/40 dark:to-indigo-900/30 dark:text-brand-300"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeResume.parsing_status === "failed" && (
                    <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {t("resume.tipsTitle", "Tips for a resume we can read")}
                      </p>
                      <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                        {[
                          t("resume.tip1", "Export from Word or Google Docs instead of scanning or photographing it."),
                          t("resume.tip2", "Make sure you can select and copy the text in your PDF."),
                          t("resume.tip3", "Use clear headings like Experience, Projects, Skills and Education."),
                        ].map((tip) => (
                          <li key={tip} className="flex gap-2">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>
              </motion.div>

              {/* Replace */}
              <motion.div {...fadeUp(0.1)}>
                <Card className="flex h-full flex-col">
                  <p className="mb-1 text-base font-semibold text-slate-900 dark:text-white">
                    {t("resume.replaceTitle", "Upload a new version")}
                  </p>
                  <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                    {t("resume.replaceHint", "Your newest upload becomes the active resume.")}
                  </p>
                  <div className="flex-1">
                    <ResumeDropzone
                      compact
                      progress={progress}
                      fileName={uploadName}
                      error={uploadError}
                      onFile={(f) => void handleFile(f)}
                    />
                  </div>
                </Card>
              </motion.div>
            </div>

            {activeResume.parsing_status === "completed" && <ResumeAnalysis resume={activeResume} />}

            {previousResumes.length > 0 && (
              <motion.div {...fadeUp(0.2)}>
                <Card>
                  <div className="mb-4 flex items-center gap-2">
                    <History className="h-4 w-4 text-slate-400" />
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      {t("resume.history", "Previous uploads")}
                    </h3>
                  </div>
                  <ul className="-mx-2.5 divide-y divide-slate-100 dark:divide-slate-800">
                    {previousResumes.map((r) => (
                      <li key={r.id} className="flex items-center gap-3 rounded-xl p-2.5">
                        <FileText className="h-5 w-5 shrink-0 text-slate-400" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{r.original_filename}</p>
                          <p className="text-xs text-slate-400">{formatDate(r.created_at)}</p>
                        </div>
                        {r.file && (
                          <a
                            href={r.file}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
                          >
                            {t("resume.view", "View")}
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </Card>
              </motion.div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
