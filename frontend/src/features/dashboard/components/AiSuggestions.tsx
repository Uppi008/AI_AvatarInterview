import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Lightbulb } from "lucide-react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import type { InterviewReport } from "@/features/reports/types";
import { cn } from "@/utils/cn";

interface AiSuggestionsProps {
  latestReport: InterviewReport | null;
  completedCount: number;
  hasResume: boolean;
}

/** Shown until the first report with tips exists, so the card is never a dead end. */
function GettingStarted({ completedCount, hasResume, hasReport }: { completedCount: number; hasResume: boolean; hasReport: boolean }) {
  const { t } = useTranslation();
  const steps = [
    { done: hasResume, label: t("dashboard.stepResume", "Upload your resume"), to: "/resume" },
    { done: completedCount > 0, label: t("dashboard.stepInterview", "Complete your first interview"), to: "/avatars" },
    { done: hasReport, label: t("dashboard.stepReport", "Review your scored report"), to: "/interviews" },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
        <span>{t("dashboard.gettingStarted", "Getting started")}</span>
        <span>
          {doneCount}/{steps.length}
        </span>
      </div>
      <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-indigo-600 transition-all duration-700"
          style={{ width: `${(doneCount / steps.length) * 100}%` }}
        />
      </div>
      <ul className="space-y-1">
        {steps.map((step, i) => (
          <li key={step.label}>
            <Link
              to={step.to}
              className="group -mx-2.5 flex items-center gap-3 rounded-xl p-2.5 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  step.done
                    ? "bg-green-500 text-white"
                    : "bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700"
                )}
              >
                {step.done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  "flex-1",
                  step.done ? "text-slate-400 line-through dark:text-slate-500" : "font-medium text-slate-700 dark:text-slate-200"
                )}
              >
                {step.label}
              </span>
              {!step.done && (
                <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600 dark:text-slate-600" />
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AiSuggestions({ latestReport, completedCount, hasResume }: AiSuggestionsProps) {
  const { t } = useTranslation();
  const tips = latestReport?.improvement_tips ?? [];

  return (
    <Card className="h-full">
      <CardHeader className="items-start">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm shadow-amber-500/30">
            <Lightbulb className="h-4.5 w-4.5" />
          </span>
          <div>
            <CardTitle>{t("dashboard.aiSuggestions")}</CardTitle>
            <CardDescription>
              {tips.length > 0
                ? t("dashboard.fromLatestReport", "From your latest interview")
                : t("dashboard.tipsAppearHere", "Personalized tips appear after your first report")}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      {tips.length === 0 ? (
        <GettingStarted completedCount={completedCount} hasResume={hasResume} hasReport={latestReport !== null} />
      ) : (
        <>
          <ul className="space-y-1">
            {tips.slice(0, 4).map((tip, i) => (
              <li
                key={i}
                className="-mx-2.5 flex items-start gap-3 rounded-xl p-2.5 text-sm text-slate-700 transition-colors hover:bg-amber-50/60 dark:text-slate-300 dark:hover:bg-amber-400/5"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">
                  {i + 1}
                </span>
                <span className="pt-0.5">{tip}</span>
              </li>
            ))}
          </ul>
          {latestReport && (
            <Link
              to={`/interviews/${latestReport.session}/report`}
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
            >
              {t("dashboard.viewFullReport", "View full report")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </>
      )}
    </Card>
  );
}
