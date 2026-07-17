import { useTranslation } from "react-i18next";

import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import type { InterviewSession, InterviewStatus } from "@/features/interviews/types";
import { cn } from "@/utils/cn";

const STATUS_STYLES: Record<InterviewStatus, string> = {
  completed: "bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  in_progress: "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300",
  scheduled: "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  terminated: "bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  abandoned: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

export function RecentInterviews({ sessions }: { sessions: InterviewSession[] }) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("dashboard.recentInterviews")}</CardTitle>
      </CardHeader>

      {sessions.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">{t("dashboard.noInterviewsYet")}</p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {sessions.slice(0, 5).map((session) => (
            <li key={session.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{session.avatar_name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {session.started_at ? new Date(session.started_at).toLocaleDateString() : "—"}
                </p>
              </div>
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium capitalize",
                  STATUS_STYLES[session.status]
                )}
              >
                {session.status.replace("_", " ")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
