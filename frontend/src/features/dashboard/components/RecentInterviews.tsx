import { useTranslation } from "react-i18next";
import { Mic } from "lucide-react";

import { Avatar } from "@/components/ui/Avatar";
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
        <ul className="space-y-1">
          {sessions.slice(0, 5).map((session) => (
            <li
              key={session.id}
              className="-mx-2.5 flex items-center justify-between gap-3 rounded-xl p-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={session.avatar_name} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                    {session.avatar_name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {session.started_at ? new Date(session.started_at).toLocaleDateString() : "—"}
                  </p>
                </div>
              </div>
              <Badge tone={STATUS_TONE[session.status]} dot>
                {session.status.replace("_", " ")}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
