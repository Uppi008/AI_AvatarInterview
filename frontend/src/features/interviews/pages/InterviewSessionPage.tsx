import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Video } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { DashboardLayout } from "@/layouts/DashboardLayout";

import { interviewsApi } from "../api";
import type { InterviewSessionDetail } from "../types";

export function InterviewSessionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<InterviewSessionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    void interviewsApi
      .retrieve(id)
      .then(({ data }) => setSession(data))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <Spinner />
        </div>
      </DashboardLayout>
    );
  }

  if (!session) {
    return (
      <DashboardLayout>
        <p className="text-sm text-red-600 dark:text-red-400">Interview session not found.</p>
      </DashboardLayout>
    );
  }

  const isLive = session.status === "in_progress";
  const isFinished = session.status === "completed" || session.status === "terminated";

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{session.avatar_name}</CardTitle>
            {isLive && (
              <Button size="sm" onClick={() => navigate(`/interviews/${session.id}/live`)}>
                <Video className="h-4 w-4" />
                Rejoin live interview
              </Button>
            )}
          </CardHeader>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Status: <span className="font-medium capitalize">{session.status.replace("_", " ")}</span>
            {session.termination_reason && (
              <span className="block text-red-500 dark:text-red-400">{session.termination_reason}</span>
            )}
          </p>
          {isFinished && (
            <p className="mt-4 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
              Your full scorecard is being generated and will be emailed to you shortly.
            </p>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Questions ({session.questions.length})</CardTitle>
          </CardHeader>
          {session.questions.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">No questions were generated for this session.</p>
          ) : (
            <ol className="space-y-3">
              {session.questions.map((q, i) => (
                <li key={q.id} className="rounded-lg border border-slate-100 p-3 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="uppercase tracking-wide">{q.question_type.replace("_", " ")}</span>
                    <span className="capitalize">{q.difficulty}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-800 dark:text-slate-200">
                    {i + 1}. {q.question_text}
                  </p>
                  {q.skipped && <p className="mt-1 text-xs italic text-slate-400">Skipped</p>}
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
