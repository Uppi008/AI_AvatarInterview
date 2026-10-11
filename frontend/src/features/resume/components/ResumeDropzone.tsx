import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileUp, Loader2, ScanSearch, UploadCloud } from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/cn";

import { ACCEPTED_RESUME_EXTENSIONS, MAX_RESUME_MB } from "../validation";

interface ResumeDropzoneProps {
  /** null = idle; 0-99 = uploading; 100 = uploaded, waiting for analysis. */
  progress: number | null;
  fileName: string | null;
  error: string | null;
  onFile: (file: File) => void;
  compact?: boolean;
}

export function ResumeDropzone({ progress, fileName, error, onFile, compact }: ResumeDropzoneProps) {
  const { t } = useTranslation();
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = progress !== null;
  const analyzing = progress === 100;

  return (
    <div className="flex h-full flex-col gap-3">
      <div
        role="button"
        tabIndex={busy ? -1 : 0}
        aria-disabled={busy}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (!busy && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          const file = e.dataTransfer.files[0];
          if (file && !busy) onFile(file);
        }}
        className={cn(
          "group relative flex flex-1 flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border-2 border-dashed px-6 text-center transition-all",
          compact ? "py-8" : "py-14",
          busy ? "cursor-default" : "cursor-pointer",
          dragActive
            ? "scale-[1.01] border-brand-500 bg-brand-50 dark:bg-brand-900/20"
            : "border-slate-300 bg-slate-50/50 hover:border-brand-400 hover:bg-brand-50/40 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:border-brand-500/60 dark:hover:bg-brand-900/20"
        )}
      >
        {busy ? (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-600 dark:bg-brand-900/50 dark:text-brand-300">
              {analyzing ? <ScanSearch className="h-7 w-7 animate-pulse" /> : <Loader2 className="h-7 w-7 animate-spin" />}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {analyzing
                  ? t("resume.analyzing", "Analyzing your resume…")
                  : t("resume.uploading", "Uploading {{name}}", { name: fileName ?? "" })}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {analyzing
                  ? t("resume.analyzingHint", "Extracting skills, projects and experience. This can take up to a minute.")
                  : `${progress}%`}
              </p>
            </div>
            <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className={cn(
                  "h-full rounded-full bg-gradient-to-r from-brand-500 to-indigo-600 transition-all duration-300",
                  analyzing && "animate-pulse"
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </>
        ) : (
          <>
            <div
              className={cn(
                "flex items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 text-white shadow-lg shadow-brand-500/30 transition-transform group-hover:-translate-y-0.5",
                compact ? "h-12 w-12" : "h-16 w-16"
              )}
            >
              <UploadCloud className={compact ? "h-6 w-6" : "h-8 w-8"} />
            </div>
            <div>
              <p className={cn("font-semibold text-slate-900 dark:text-white", compact ? "text-sm" : "text-base")}>
                {dragActive
                  ? t("resume.dropNow", "Drop it here")
                  : t("resume.dropTitle", "Drag & drop your resume here")}
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {t("resume.orBrowse", "or click to browse your files")}
              </p>
            </div>
            <Button
              type="button"
              size={compact ? "sm" : "md"}
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
            >
              <FileUp className="h-4 w-4" />
              {t("resume.chooseFile", "Choose file")}
            </Button>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="rounded-md bg-white px-1.5 py-0.5 font-semibold text-red-500 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">PDF</span>
              <span className="rounded-md bg-white px-1.5 py-0.5 font-semibold text-blue-500 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">DOCX</span>
              <span>· {t("resume.upTo", "up to {{mb}}MB", { mb: MAX_RESUME_MB })}</span>
            </div>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_RESUME_EXTENSIONS.join(",")}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            e.target.value = "";
          }}
        />
      </div>
      {error && <Alert tone="error">{error}</Alert>}
    </div>
  );
}
