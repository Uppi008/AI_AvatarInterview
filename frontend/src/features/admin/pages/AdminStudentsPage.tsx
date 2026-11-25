import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, GraduationCap, Search, ShieldCheck, Trophy, Users } from "lucide-react";

import { PageHero } from "@/components/fx/PageHero";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingRegion, SkeletonRow } from "@/components/ui/Skeleton";
import { adminApi, type PlatformAnalytics, type StudentProgressRow } from "@/features/engagement/api";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { getApiErrorMessage } from "@/services/apiClient";
import { cn } from "@/utils/cn";
import { scoreBadgeClasses } from "@/utils/score";

type SortKey = "full_name" | "interviews_completed" | "average_score" | "last_interview_at";

function toCsv(rows: StudentProgressRow[]) {
  const header = ["Name", "Email", "Institution", "Graduation year", "Interviews completed", "Average score", "Best score", "Last interview"];
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [r.full_name, r.email, r.institution, r.graduation_year, r.interviews_completed, r.average_score, r.best_score, r.last_interview_at?.slice(0, 10)]
      .map(escape)
      .join(",")
  );
  return [header.map(escape).join(","), ...lines].join("\n");
}

/** Placement-officer view: every student's practice progress, filterable by institution. */
export function AdminStudentsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [rows, setRows] = useState<StudentProgressRow[]>([]);
  const [institutions, setInstitutions] = useState<string[]>([]);
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [institution, setInstitution] = useState("");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [sort, setSort] = useState<SortKey>("last_interview_at");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(search.trim()), 300);
    return () => window.clearTimeout(id);
  }, [search]);

  useEffect(() => {
    if (!isAdmin) return;
    adminApi.analytics().then(({ data }) => setAnalytics(data)).catch(() => {});
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    adminApi
      .students({ institution: institution || undefined, search: debounced || undefined })
      .then(({ data }) => {
        setRows(data.results);
        setInstitutions(data.institutions);
        setError(null);
      })
      .catch((err) => setError(getApiErrorMessage(err, "Couldn't load students.")))
      .finally(() => setLoading(false));
  }, [isAdmin, institution, debounced]);

  const sorted = useMemo(() => {
    const copy = rows.slice();
    copy.sort((a, b) => {
      if (sort === "full_name") return a.full_name.localeCompare(b.full_name);
      if (sort === "last_interview_at") return (b.last_interview_at ?? "").localeCompare(a.last_interview_at ?? "");
      return (b[sort] ?? -1) - (a[sort] ?? -1);
    });
    return copy;
  }, [rows, sort]);

  const active = rows.filter((r) => r.interviews_completed > 0).length;
  const scored = rows.filter((r) => r.average_score !== null);
  const cohortAverage = scored.length ? Math.round(scored.reduce((s, r) => s + (r.average_score ?? 0), 0) / scored.length) : null;

  const exportCsv = () => {
    const blob = new Blob([toCsv(sorted)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `student-progress${institution ? `-${institution}` : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <Card>
          <EmptyState icon={ShieldCheck} title={t("admin.onlyAdmins", "This page is only for placement officers and admins.")} />
        </Card>
      </DashboardLayout>
    );
  }

  const stats = [
    { icon: Users, label: t("admin.students", "Students"), value: String(rows.length) },
    { icon: GraduationCap, label: t("admin.active", "Practiced at least once"), value: String(active) },
    { icon: Trophy, label: t("admin.cohortAverage", "Average score"), value: cohortAverage !== null ? String(cohortAverage) : "—" },
    {
      icon: ShieldCheck,
      label: t("admin.totalInterviews", "Interviews on platform"),
      value: analytics ? String(analytics.completed_interviews) : "—",
    },
  ];

  return (
    <DashboardLayout>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <PageHero
          eyebrow={t("admin.eyebrow", "Placement dashboard")}
          title={t("admin.title", "Student progress")}
          subtitle={t("admin.subtitle", "See who is practicing, how they're scoring, and who needs a nudge.")}
          aside={
            <Button variant="secondary" onClick={exportCsv} disabled={rows.length === 0}>
              <Download className="h-4 w-4" />
              {t("admin.export", "Export CSV")}
            </Button>
          }
        />

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {stats.map(({ icon: Icon, label, value }) => (
            <Card key={label} className="flex items-center gap-3 p-4 sm:p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
                <p className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">{value}</p>
              </div>
            </Card>
          ))}
        </div>

        {error && <Alert tone="error">{error}</Alert>}

        <Card className="p-4 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <label className="relative md:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("admin.search", "Search name or email")}
                aria-label={t("admin.search", "Search name or email")}
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <select
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                aria-label={t("admin.institution", "Institution")}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="">{t("admin.allInstitutions", "All institutions")}</option>
                {institutions.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                aria-label={t("admin.sort", "Sort students")}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="last_interview_at">{t("admin.sortRecent", "Most recent activity")}</option>
                <option value="average_score">{t("admin.sortScore", "Highest average score")}</option>
                <option value="interviews_completed">{t("admin.sortCount", "Most interviews")}</option>
                <option value="full_name">{t("admin.sortName", "Name (A–Z)")}</option>
              </select>
            </div>
          </div>

          {loading ? (
            <LoadingRegion label={t("common.loading", "Loading")}>
              {Array.from({ length: 5 }, (_, i) => (
                <SkeletonRow key={i} />
              ))}
            </LoadingRegion>
          ) : sorted.length === 0 ? (
            <EmptyState icon={Users} title={t("admin.none", "No students match")} />
          ) : (
            <div className="-mx-4 overflow-x-auto sm:mx-0">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 dark:text-slate-400">
                    <th className="px-4 py-2 font-medium sm:px-2">{t("admin.colStudent", "Student")}</th>
                    <th className="px-2 py-2 font-medium">{t("admin.institution", "Institution")}</th>
                    <th className="px-2 py-2 text-right font-medium">{t("admin.colInterviews", "Interviews")}</th>
                    <th className="px-2 py-2 text-right font-medium">{t("admin.colAverage", "Avg")}</th>
                    <th className="px-2 py-2 text-right font-medium">{t("admin.colBest", "Best")}</th>
                    <th className="px-4 py-2 text-right font-medium sm:px-2">{t("admin.colLast", "Last active")}</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-4 py-2.5 sm:px-2">
                        <p className="font-medium text-slate-900 dark:text-white">{r.full_name || "—"}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{r.email}</p>
                      </td>
                      <td className="px-2 py-2.5 text-slate-600 dark:text-slate-300">
                        {r.institution || "—"}
                        {r.graduation_year && <span className="text-xs text-slate-400"> · {r.graduation_year}</span>}
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-200">{r.interviews_completed}</td>
                      <td className="px-2 py-2.5 text-right">
                        {r.average_score !== null ? (
                          <span className={cn("rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums ring-1 ring-inset", scoreBadgeClasses(r.average_score))}>
                            {Math.round(r.average_score)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-200">
                        {r.best_score !== null ? Math.round(r.best_score) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-slate-500 sm:px-2 dark:text-slate-400">
                        {r.last_interview_at ? new Date(r.last_interview_at).toLocaleDateString(undefined, { dateStyle: "medium" }) : t("admin.never", "Never")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
