import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { DashboardLayout } from "@/layouts/DashboardLayout";

import { interviewsApi } from "../api";
import type { InterviewSession } from "../types";

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
          <Spinner />
        ) : sessions.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">{t("dashboard.noInterviewsYet")}</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {sessions.map((session) => (
              <li key={session.id}>
                <Link
                  to={`/interviews/${session.id}`}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0 hover:opacity-80"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{session.avatar_name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {session.started_at ? new Date(session.started_at).toLocaleString() : "Not started"}
                    </p>
                  </div>
                  <span className="text-xs font-medium capitalize text-slate-500 dark:text-slate-400">
                    {session.status.replace("_", " ")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </DashboardLayout>
  );
}
