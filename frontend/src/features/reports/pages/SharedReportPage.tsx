import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bot, CheckCircle2, Lightbulb, Link2Off } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";
import { AuthLayout } from "@/layouts/AuthLayout";
import { APP_NAME } from "@/layouts/navigation";
import { scoreBarClass } from "@/utils/score";

import { reportsApi } from "../api";
import type { SharedReport } from "../types";

const SCORES: { key: keyof SharedReport; label: string }[] = [
  { key: "communication_score", label: "Communication" },
  { key: "technical_score", label: "Technical" },
  { key: "confidence_score", label: "Confidence" },
  { key: "problem_solving_score", label: "Problem solving" },
  { key: "grammar_score", label: "Grammar" },
  { key: "voice_clarity_score", label: "Voice clarity" },
  { key: "eye_contact_score", label: "Eye contact" },
  { key: "body_language_score", label: "Body language" },
];

/** Public, read-only view of a report the student chose to share. */
export function SharedReportPage() {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const [report, setReport] = useState<SharedReport | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "missing">("loading");

  useEffect(() => {
    if (!token) return;
    reportsApi
      .getShared(token)
      .then(({ data }) => {
        setReport(data);
        setState("ok");
        document.title = `${data.candidate_name}'s interview result · ${APP_NAME}`;
      })
      .catch(() => setState("missing"));
  }, [token]);

  return (
    <AuthLayout>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 pb-16">
        {state === "loading" && (
          <LoadingRegion label={t("common.loading", "Loading")} className="flex flex-col gap-5">
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </LoadingRegion>
        )}

        {state === "missing" && (
          <Card>
            <EmptyState
              icon={Link2Off}
              title={t("share.missing", "This link isn't available")}
              description={t("share.missingHint", "It may have been turned off by its owner.")}
            />
          </Card>
        )}

        {state === "ok" && report && (
          <>
            <Card className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
              <div className="flex-1">
                <p className="text-sm font-medium text-brand-600 dark:text-brand-400">
                  {t("share.mockResult", "Mock interview result")}
                </p>
                <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                  {report.candidate_name}
                  {report.target_role && <span className="font-normal text-slate-500"> · {report.target_role}</span>}
                </h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {t("share.interviewedBy", "Interviewed by AI interviewer {{name}}", { name: report.avatar_name })}
                  {report.interview_date && ` · ${new Date(report.interview_date).toLocaleDateString(undefined, { dateStyle: "medium" })}`}
                </p>
              </div>
              <div className="text-center">
                <p className="text-5xl font-bold text-brand-600 dark:text-brand-400">
                  {Math.round(Number(report.overall_score))}
                  <span className="text-xl text-slate-400">/100</span>
                </p>
                {report.hiring_recommendation_display && (
                  <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">{report.hiring_recommendation_display}</p>
                )}
              </div>
            </Card>

            <Card>
              <h2 className="mb-4 font-semibold text-slate-900 dark:text-white">{t("report.scoreBreakdown")}</h2>
              <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                {SCORES.map(({ key, label }) => {
                  const value = Math.round(Number(report[key]));
                  return (
                    <div key={key}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-300">{label}</span>
                        <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{value}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div className={`h-full rounded-full ${scoreBarClass(value)}`} style={{ width: `${value}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {[
                { title: t("report.strengths"), items: report.strengths, icon: CheckCircle2, color: "text-green-600" },
                { title: t("report.improvementTips"), items: report.improvement_tips, icon: Lightbulb, color: "text-amber-500" },
              ].map(({ title, items, icon: Icon, color }) => (
                <Card key={title}>
                  <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                    <Icon className={`h-5 w-5 ${color}`} /> {title}
                  </h2>
                  <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                    {items.length ? items.map((item, i) => <li key={i}>• {item}</li>) : <li className="text-slate-400">—</li>}
                  </ul>
                </Card>
              ))}
            </div>
          </>
        )}

        <Card className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-indigo-700 text-white">
            <Bot className="h-5 w-5" />
          </span>
          <p className="flex-1 text-sm text-slate-600 dark:text-slate-300">
            {t("share.cta", "Practice with AI interviewers in English, Hindi and Telugu, and get a scorecard like this one.")}
          </p>
          <Link
            to="/register"
            className="inline-flex items-center rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            {t("share.tryFree", "Try it free")}
          </Link>
        </Card>
      </div>
    </AuthLayout>
  );
}
