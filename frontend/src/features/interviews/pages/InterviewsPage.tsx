import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Languages,
  ListChecks,
  Mic,
  Search,
  Sparkles,
  Timer,
  Trophy,
} from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { getApiErrorMessage } from "@/services/apiClient";
import { cn } from "@/utils/cn";
import { LANGUAGE_LABEL, formatDuration, scoreBadgeClasses } from "@/utils/score";

import { interviewsApi } from "../api";
import type { InterviewSession, InterviewStatus } from "../types";

const STATUS_TONE: Record<InterviewStatus, "green" | "brand" | "amber" | "red" | "slate"> = {
  completed: "green",
  in_progress: "brand",
  scheduled: "amber",
  terminated: "red",
  abandoned: "slate",
};

type Filter = "all" | "completed" | "in_progress" | "ended_early";
type Sort = "newest" | "oldest" | "score";

const FILTERS: { key: Filter; label: string; match: (s: InterviewSession) => boolean }[] = [
  { key: "all", label: "All", match: () => true },
  { key: "completed", label: "Completed", match: (s) => s.status === "completed" },
  { key: "in_progress", label: "In progress", match: (s) => s.status === "in_progress" || s.status === "scheduled" },
  { key: "ended_early", label: "Ended early", match: (s) => s.status === "terminated" || s.status === "abandoned" },
];

function sessionDate(s: InterviewSession) {
  return s.started_at ?? s.scheduled_at;
}

export function InterviewsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [query, setQuery] = useState("");

  useEffect(() => {
    void interviewsApi
      .list()
      .then(({ data }) => setSessions(data.results))
      .catch((err) => setError(getApiErrorMessage(err, "Couldn't load your interviews.")))
      .finally(() => setLoading(false));
  }, []);

  const scores = sessions.map((s) => s.report_score).filter((s): s is number => s !== null);
  const stats = [
    { icon: ListChecks, label: "Total interviews", value: String(sessions.length) },
    { icon: CheckCircle2, label: "Completed", value: String(sessions.filter((s) => s.status === "completed").length) },
    {
      icon: Trophy,
      label: "Best score",
      value: scores.length ? String(Math.round(Math.max(...scores))) : "—",
    },
    {
      icon: Timer,
      label: "Practice time",
      value: formatDuration(sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0)) ?? "0 min",
    },
  ];

  const visible = useMemo(() => {
    const match = FILTERS.find((f) => f.key === filter)!.match;
    const q = query.trim().toLowerCase();
    const rows = sessions.filter((s) => match(s) && (!q || s.avatar_name.toLowerCase().includes(q)));
    return rows.sort((a, b) => {
      if (sort === "score") return (b.report_score ?? -1) - (a.report_score ?? -1);
      const diff = new Date(sessionDate(b) ?? 0).getTime() - new Date(sessionDate(a) ?? 0).getTime();
      return sort === "newest" ? diff : -diff;
    });
  }, [sessions, filter, sort, query]);

  return (
    <DashboardLayout>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-indigo-600 to-indigo-800 p-6 text-white shadow-lg shadow-brand-900/20 sm:p-8"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.14)_1px,transparent_0)] bg-[size:22px_22px]" />
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-brand-100">{t("nav.interviews")}</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Your interview history</h1>
              <p className="mt-2 text-brand-100">Review every session, its answers, and your scorecards.</p>
            </div>
            <Button variant="secondary" className="shrink-0 self-start md:self-auto" onClick={() => navigate("/avatars")}>
              <Sparkles className="h-4 w-4" />
              {t("dashboard.startInterview")}
            </Button>
          </div>
        </motion.div>

        {error && <Alert tone="error">{error}</Alert>}

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Spinner />
          </div>
        ) : sessions.length === 0 ? (
          <Card>
            <EmptyState
              icon={Mic}
              title={t("dashboard.noInterviewsYet")}
              description="Pick an AI interviewer and take your first mock interview — it takes about 15 minutes."
              action={
                <Button onClick={() => navigate("/avatars")}>
                  <Sparkles className="h-4 w-4" />
                  {t("dashboard.startInterview")}
                </Button>
              }
            />
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {stats.map(({ icon: Icon, label, value }) => (
                <Card key={label} className="flex items-center gap-3 p-4 sm:p-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-600/10 dark:bg-brand-900/40 dark:text-brand-300">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
                    <p className="truncate text-xl font-bold text-slate-900 dark:text-white">{value}</p>
                  </div>
                </Card>
              ))}
            </div>

            <Card className="p-4 sm:p-6">
              {/* Toolbar */}
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 dark:bg-slate-800/70">
                  {FILTERS.map((f) => {
                    const count = sessions.filter(f.match).length;
                    return (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => setFilter(f.key)}
                        className={cn(
                          "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                          filter === f.key
                            ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                            : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                        )}
                      >
                        {f.label}
                        <span
                          className={cn(
                            "rounded-full px-1.5 text-xs",
                            filter === f.key
                              ? "bg-brand-100 text-brand-700 dark:bg-brand-900/60 dark:text-brand-300"
                              : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                          )}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <label className="relative flex-1 lg:w-64 lg:flex-none">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search by interviewer"
                      aria-label="Search by interviewer"
                      className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </label>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as Sort)}
                    aria-label="Sort interviews"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="score">Highest score</option>
                  </select>
                </div>
              </div>

              {visible.length === 0 ? (
                <EmptyState icon={Search} title="No interviews match" description="Try a different filter or search." />
              ) : (
                <ul className="-mx-2 divide-y divide-slate-100 dark:divide-slate-800">
                  {visible.map((session) => {
                    const date = sessionDate(session);
                    const duration = formatDuration(session.duration_seconds);
                    const finished = session.status === "completed" || session.status === "terminated";
                    const reportMissing = finished && session.report_score === null && session.answered_count > 0;
                    return (
                      <li key={session.id}>
                        <Link
                          to={`/interviews/${session.id}`}
                          className="group flex items-center gap-4 rounded-xl p-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
                        >
                          <Avatar src={session.avatar_image} name={session.avatar_name} size="md" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{session.avatar_name}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                              {date ? (
                                <span className="inline-flex items-center gap-1">
                                  <CalendarDays className="h-3.5 w-3.5" />
                                  {new Date(date).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                                </span>
                              ) : (
                                <span>Not started</span>
                              )}
                              {duration && (
                                <span className="inline-flex items-center gap-1">
                                  <Clock3 className="h-3.5 w-3.5" />
                                  {duration}
                                </span>
                              )}
                              <span className="inline-flex items-center gap-1">
                                <Languages className="h-3.5 w-3.5" />
                                {LANGUAGE_LABEL[session.language] ?? session.language}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <ListChecks className="h-3.5 w-3.5" />
                                {session.answered_count} answered
                              </span>
                            </div>
                          </div>
                          {session.report_score !== null ? (
                            <span
                              className={cn(
                                "hidden shrink-0 rounded-lg px-2.5 py-1 text-sm font-bold ring-1 ring-inset sm:inline-block",
                                scoreBadgeClasses(session.report_score)
                              )}
                            >
                              {Math.round(session.report_score)}
                            </span>
                          ) : (
                            reportMissing && (
                              <span className="hidden shrink-0 text-xs font-medium text-amber-600 dark:text-amber-400 sm:inline">
                                Report pending
                              </span>
                            )
                          )}
                          <Badge tone={STATUS_TONE[session.status]} dot>
                            {session.status.replace("_", " ")}
                          </Badge>
                          <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500 dark:text-slate-600" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
