import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Copy, Link2, Linkedin, Share2, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { getApiErrorMessage } from "@/services/apiClient";

import { reportsApi } from "../api";
import type { InterviewReport } from "../types";

function sharedReportUrl(token: string) {
  return `${window.location.origin}/shared/report/${token}`;
}

/** Create, copy, post to LinkedIn, or revoke a public read-only report link. */
export function ShareReportPanel({ report, onChange }: { report: InterviewReport; onChange: (r: InterviewReport) => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const url = report.share_token ? sharedReportUrl(report.share_token) : null;

  const createLink = async () => {
    setBusy(true);
    setError(null);
    try {
      const { data } = await reportsApi.share(report.id);
      onChange({ ...report, share_token: data.share_token });
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't create the link."));
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    setBusy(true);
    try {
      await reportsApi.unshare(report.id);
      onChange({ ...report, share_token: null });
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't turn off the link."));
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(t("share.copyManually", "Copy this link:"), url);
    }
  };

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Share2 className="h-4 w-4" />
        {t("share.share", "Share")}
      </Button>
    );
  }

  return (
    <div className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm sm:w-96 dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
          <Link2 className="h-4 w-4 text-brand-600 dark:text-brand-400" />
          {t("share.title", "Share your result")}
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={t("common.close", "Close")}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
        {t(
          "share.privacy",
          "Anyone with the link sees your scores, strengths and tips with your first name only. Your answers and email stay private."
        )}
      </p>
      {url ? (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              readOnly
              value={url}
              aria-label={t("share.link", "Share link")}
              onFocus={(e) => e.target.select()}
              className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
            <Button size="sm" onClick={() => void copy()}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? t("share.copied", "Copied") : t("share.copy", "Copy")}
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0a66c2] hover:underline dark:text-sky-400"
            >
              <Linkedin className="h-4 w-4" />
              {t("share.linkedin", "Post on LinkedIn")}
            </a>
            <button
              type="button"
              onClick={() => void revoke()}
              disabled={busy}
              className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
            >
              {t("share.revoke", "Turn off link")}
            </button>
          </div>
        </div>
      ) : (
        <Button size="sm" onClick={() => void createLink()} isLoading={busy}>
          <Link2 className="h-4 w-4" />
          {t("share.create", "Create share link")}
        </Button>
      )}
      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
