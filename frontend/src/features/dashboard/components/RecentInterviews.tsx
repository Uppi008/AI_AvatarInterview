import { useTranslation } from "react-i18next";
import { Mic } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type { InterviewSession, InterviewStatus } from "@/features/interviews/types";

const STATUS_TONE: Record<InterviewStatus, "green" | "brand" | "amber" | "red" | "slate"> = {
  completed: "green",
  in_progress: "brand",
  scheduled: "amber",
  terminated: "red",
  abandoned: "slate",
};

export function RecentInterviews({ sessions }: { sessions: InterviewSession[] }) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("dashboard.recentInterviews")}</CardTitle>
      </CardHeader>

      {sessions.length === 0 ? (
        <EmptyState icon={Mic} title={t("dashboard.noInterviewsYet")} />
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {sessions.slice(0, 5).map((session) => (
            <li
              key={session.id}
              className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{session.avatar_name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {session.started_at ? new Date(session.started_at).toLocaleDateString() : "—"}
                </p>
              </div>
              <Badge tone={STATUS_TONE[session.status]}>{session.status.replace("_", " ")}</Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
