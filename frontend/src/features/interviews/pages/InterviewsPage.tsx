import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { Mic, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { DashboardLayout } from "@/layouts/DashboardLayout";

import { interviewsApi } from "../api";
import type { InterviewSession, InterviewStatus } from "../types";

const STATUS_TONE: Record<InterviewStatus, "green" | "brand" | "amber" | "red" | "slate"> = {
  completed: "green",
  in_progress: "brand",
  scheduled: "amber",
  terminated: "red",
  abandoned: "slate",
};

export function InterviewsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void interviewsApi
      .list()
      .then(({ data }) => setSessions(data.results))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <Card>
        <CardHeader>
          <CardTitle>{t("nav.interviews")}</CardTitle>
          <Button size="sm" onClick={() => navigate("/avatars")}>
            <Sparkles className="h-4 w-4" />
            {t("dashboard.startInterview")}
          </Button>
        </CardHeader>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Spinner />
          </div>
        ) : sessions.length === 0 ? (
          <EmptyState
            icon={Mic}
            title={t("dashboard.noInterviewsYet")}
            action={
              <Button size="sm" onClick={() => navigate("/avatars")}>
                {t("dashboard.startInterview")}
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {sessions.map((session) => (
              <li key={session.id}>
                <Link
                  to={`/interviews/${session.id}`}
                  className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3 transition-colors first:pt-2 last:pb-2 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                      {session.avatar_name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {session.started_at ? new Date(session.started_at).toLocaleString() : "Not started"}
                    </p>
                  </div>
                  <Badge tone={STATUS_TONE[session.status]}>{session.status.replace("_", " ")}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </DashboardLayout>
  );
}
