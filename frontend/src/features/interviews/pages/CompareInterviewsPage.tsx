import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowDownRight, ArrowLeft, ArrowUpRight, GitCompareArrows, Minus } from "lucide-react";

import { PageHero } from "@/components/fx/PageHero";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";
import { reportsApi } from "@/features/reports/api";
import type { InterviewReport } from "@/features/reports/types";
import { useTheme } from "@/hooks/useTheme";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { getApiErrorMessage } from "@/services/apiClient";
import { seriesColors } from "@/styles/chartPalette";
import { cn } from "@/utils/cn";

import { interviewsApi } from "../api";
import type { InterviewSession } from "../types";

const DIMENSIONS: { key: keyof InterviewReport; label: string }[] = [
  { key: "overall_score", label: "Overall" },
  { key: "communication_score", label: "Communication" },
  { key: "technical_score", label: "Technical" },
  { key: "confidence_score", label: "Confidence" },
  { key: "problem_solving_score", label: "Problem solving" },
  { key: "grammar_score", label: "Grammar" },
  { key: "voice_clarity_score", label: "Voice clarity" },
  { key: "eye_contact_score", label: "Eye contact" },
  { key: "body_language_score", label: "Body language" },
];

interface Option {
  report: InterviewReport;
  session: InterviewSession | undefined;
  label: string;
}

function Delta({ value }: { value: number }) {
  if (Math.abs(value) < 1) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
        <Minus className="h-3.5 w-3.5" /> 0
      </span>
    );
  }
  const up = value > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums",
        up ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {up ? "+" : "−"}
      {Math.abs(Math.round(value))}
      <span className="sr-only">{up ? " improved" : " dropped"}</span>
    </span>
  );
}

/** Two interviews side by side: every score, and how much it moved. */
export function CompareInterviewsPage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [params, setParams] = useSearchParams();
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([reportsApi.list(), interviewsApi.list()])
      .then(([reports, sessions]) => {
        const byId = new Map(sessions.data.results.map((s) => [s.id, s]));
        setOptions(
          reports.data.results
            .slice()
            .sort((a, b) => new Date(a.generated_at).getTime() - new Date(b.generated_at).getTime())
            .map((report) => {
              const session = byId.get(report.session);
              const date = new Date(session?.started_at ?? report.generated_at).toLocaleDateString(undefined, {
                dateStyle: "medium",
              });
              return {
                report,
                session,
                label: `${date} · ${session?.avatar_name ?? "Interview"} · ${Math.round(Number(report.overall_score))}`,
              };
            })
        );
      })
      .catch((err) => setError(getApiErrorMessage(err, "Couldn't load your interviews.")))
      .finally(() => setLoading(false));
  }, []);

  // Default: the two most recent interviews, older on the left.
  const aId = params.get("a") ?? options[options.length - 2]?.report.id;
  const bId = params.get("b") ?? options[options.length - 1]?.report.id;
  const a = options.find((o) => o.report.id === aId);
  const b = options.find((o) => o.report.id === bId);
  const [colorA, colorB] = seriesColors(theme);

  const rows = useMemo(
    () =>
      a && b
        ? DIMENSIONS.map(({ key, label }) => {
            const va = Number(a.report[key]);
            const vb = Number(b.report[key]);
            return { label, va, vb, delta: vb - va };
          })
        : [],
    [a, b]
  );
  const biggestGain = rows.slice(1).reduce((best, r) => (r.delta > (best?.delta ?? 0) ? r : best), undefined as (typeof rows)[number] | undefined);
  const biggestDrop = rows.slice(1).reduce((worst, r) => (r.delta < (worst?.delta ?? 0) ? r : worst), undefined as (typeof rows)[number] | undefined);

  const select = (slot: "a" | "b", id: string) => {
    const next = new URLSearchParams(params);
    next.set(slot, id);
    if (slot === "a" && !next.get("b") && bId) next.set("b", bId);
    if (slot === "b" && !next.get("a") && aId) next.set("a", aId);
    setParams(next, { replace: true });
  };

  return (
    <DashboardLayout>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <Link
          to="/interviews"
          className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("nav.interviews")}
        </Link>

        <PageHero
          eyebrow={
            <span className="inline-flex items-center gap-1.5">
              <GitCompareArrows className="h-4 w-4" /> {t("interviews.compare", "Compare")}
            </span>
          }
          title={t("compare.title", "How much have you improved?")}
          subtitle={t("compare.subtitle", "Pick any two interviews to see every score side by side.")}
        />

        {error && <Alert tone="error">{error}</Alert>}

        {loading ? (
          <LoadingRegion label={t("common.loading", "Loading")}>
            <Card className="space-y-4">
              <Skeleton className="h-10 w-full" />
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </Card>
          </LoadingRegion>
        ) : options.length < 2 ? (
          <Card>
            <EmptyState
              icon={GitCompareArrows}
              title={t("compare.needTwo", "You need at least two scored interviews to compare")}
              description={t("compare.needTwoHint", "Finish another interview and come back here.")}
            />
          </Card>
        ) : (
          <>
            <Card className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {(["a", "b"] as const).map((slot) => {
                const current = slot === "a" ? a : b;
                return (
                  <label key={slot} className="flex flex-col gap-1.5">
                    <span className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                      <span className="h-3 w-3 rounded-sm" style={{ background: slot === "a" ? colorA : colorB }} aria-hidden />
                      {slot === "a" ? t("compare.before", "Before") : t("compare.after", "After")}
                    </span>
                    <select
                      value={current?.report.id ?? ""}
                      onChange={(e) => select(slot, e.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    >
                      {options.map((o) => (
                        <option key={o.report.id} value={o.report.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              })}
            </Card>

            {a && b && a.report.id === b.report.id && (
              <Alert tone="info">{t("compare.same", "Pick two different interviews to see a difference.")}</Alert>
            )}

            {a && b && (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Card className="p-5">
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t("compare.overallChange", "Overall change")}</p>
                    <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900 dark:text-white">
                      {rows[0].delta > 0 ? "+" : rows[0].delta < 0 ? "−" : ""}
                      {Math.abs(Math.round(rows[0].delta))}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {Math.round(rows[0].va)} → {Math.round(rows[0].vb)}
                    </p>
                  </Card>
                  <Card className="p-5">
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t("compare.biggestGain", "Biggest gain")}</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{biggestGain?.label ?? "—"}</p>
                    {biggestGain && <Delta value={biggestGain.delta} />}
                  </Card>
                  <Card className="p-5">
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t("compare.needsWork", "Needs work")}</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{biggestDrop?.label ?? "—"}</p>
                    {biggestDrop && <Delta value={biggestDrop.delta} />}
                  </Card>
                </div>

                <Card>
                  <div className="mb-4 flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: colorA }} aria-hidden />
                      {t("compare.before", "Before")}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: colorB }} aria-hidden />
                      {t("compare.after", "After")}
                    </span>
                  </div>
                  <table className="w-full text-sm">
                    <caption className="sr-only">Score comparison between the two interviews</caption>
                    <thead>
                      <tr className="text-left text-xs text-slate-500 dark:text-slate-400">
                        <th className="pb-2 font-medium">{t("compare.skill", "Skill")}</th>
                        <th className="pb-2 font-medium">{t("compare.scores", "Scores")}</th>
                        <th className="w-14 pb-2 text-right font-medium">{t("compare.change", "Change")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.label} className="border-t border-slate-100 dark:border-slate-800">
                          <th scope="row" className="w-32 py-2.5 pr-3 text-left font-medium text-slate-700 sm:w-40 dark:text-slate-200">
                            {r.label}
                          </th>
                          <td className="py-2.5">
                            <div className="flex flex-col gap-0.5">
                              {[
                                { v: r.va, color: colorA, name: "Before" },
                                { v: r.vb, color: colorB, name: "After" },
                              ].map(({ v, color, name }) => (
                                <div key={name} className="flex items-center gap-2" title={`${name}: ${Math.round(v)}`}>
                                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                    <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, v))}%`, background: color }} />
                                  </div>
                                  <span className="w-7 text-right text-xs tabular-nums text-slate-600 dark:text-slate-300">
                                    <span className="sr-only">{name} </span>
                                    {Math.round(v)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="py-2.5 text-right">
                            <Delta value={r.delta} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              </>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
