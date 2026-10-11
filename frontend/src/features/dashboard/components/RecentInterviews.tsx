import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, CalendarDays, ChevronRight, Clock3, Languages, Mic, Sparkles } from "lucide-react";

import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type { InterviewSession, InterviewStatus } from "@/features/interviews/types";
import { cn } from "@/utils/cn";
import { LANGUAGE_LABEL, formatDuration, scoreBadgeClasses } from "@/utils/score";

const STATUS_TONE: Record<InterviewStatus, "green" | "brand" | "amber" | "red" | "slate"> = {
  completed: "green",
  in_progress: "brand",
  scheduled: "amber",
  terminated: "red",
  abandoned: "slate",
};

interface RecentInterviewsProps {
  sessions: InterviewSession[];
  /** Overall score per session id, for sessions that have a report. */
  scores: Record<string, number>;
}

export function RecentInterviews({ sessions, scores }: RecentInterviewsProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="items-start">
        <div>
          <CardTitle>{t("dashboard.recentInterviews")}</CardTitle>
          <CardDescription>{t("dashboard.recentHint", "Open any interview to see its details and report")}</CardDescription>
        </div>
        {sessions.length > 0 && (
          <Link
            to="/interviews"
            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
          >
            {t("dashboard.viewAll", "View all")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </CardHeader>

      {sessions.length === 0 ? (
        <EmptyState
          icon={Mic}
          title={t("dashboard.noInterviewsYet")}
          description={t("dashboard.recentEmptyHint", "Your interviews will show up here.")}
          action={
            <Button size="sm" onClick={() => navigate("/avatars")}>
              <Sparkles className="h-4 w-4" />
              {t("dashboard.startInterview")}
            </Button>
          }
        />
      ) : (
        <ul className="-mx-2.5 divide-y divide-slate-100 dark:divide-slate-800">
          {sessions.slice(0, 5).map((session) => {
            const score = scores[session.id];
            const duration = formatDuration(session.duration_seconds);
            const date = session.started_at ?? session.scheduled_at;
            const to =
              session.status === "completed" && score !== undefined
                ? `/interviews/${session.id}/report`
                : `/interviews/${session.id}`;
            return (
              <li key={session.id}>
                <Link
                  to={to}
                  className="group flex items-center gap-4 rounded-xl p-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
                >
                  <Avatar src={session.avatar_image} name={session.avatar_name} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{session.avatar_name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      {date && (
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {new Date(date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                        </span>
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
                    </div>
                  </div>
                  {score !== undefined && (
                    <span
                      className={cn(
                        "hidden shrink-0 rounded-lg px-2.5 py-1 text-sm font-bold ring-1 ring-inset sm:inline-block",
                        scoreBadgeClasses(score)
                      )}
                    >
                      {Math.round(score)}
                    </span>
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
  );
}
