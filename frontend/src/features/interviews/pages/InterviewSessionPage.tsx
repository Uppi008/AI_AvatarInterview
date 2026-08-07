import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FileText, ListChecks, Video } from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { reportsApi } from "@/features/reports/api";
import { DashboardLayout } from "@/layouts/DashboardLayout";

import { interviewsApi } from "../api";
import type { InterviewSessionDetail, InterviewStatus } from "../types";

const STATUS_TONE: Record<InterviewStatus, "green" | "brand" | "amber" | "red" | "slate"> = {
  completed: "green",
  in_progress: "brand",
  scheduled: "amber",
  terminated: "red",
  abandoned: "slate",
};

export function InterviewSessionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<InterviewSessionDetail | null>(null);
  const [reportReady, setReportReady] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    void interviewsApi
      .retrieve(id)
      .then(({ data }) => {
        setSession(data);
        const isFinished = data.status === "completed" || data.status === "terminated";
        if (isFinished) {
          void reportsApi.retrieveBySession(id).then((report) => setReportReady(report !== null));
        }
      })
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
        <Alert tone="error">Interview session not found.</Alert>
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
            <div className="flex items-center gap-3">
              <CardTitle>{session.avatar_name}</CardTitle>
              <Badge tone={STATUS_TONE[session.status]}>{session.status.replace("_", " ")}</Badge>
            </div>
            {isLive && (
              <Button size="sm" onClick={() => navigate(`/interviews/${session.id}/live`)}>
                <Video className="h-4 w-4" />
                Rejoin live interview
              </Button>
            )}
            {isFinished && reportReady && (
              <Button size="sm" onClick={() => navigate(`/interviews/${session.id}/report`)}>
                <FileText className="h-4 w-4" />
                View report
              </Button>
            )}
          </CardHeader>

          {session.termination_reason && (
            <Alert tone="error" className="mb-2">
              {session.termination_reason}
            </Alert>
          )}
          {isFinished && !reportReady && (
            <Alert tone="info">Your full scorecard is being generated and will be emailed to you shortly.</Alert>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Questions ({session.questions.length})</CardTitle>
          </CardHeader>
          {session.questions.length === 0 ? (
            <EmptyState icon={ListChecks} title="No questions were generated for this session." />
          ) : (
            <ol className="space-y-3">
              {session.questions.map((q, i) => (
                <li
                  key={q.id}
                  className="rounded-lg border border-slate-100 p-3 transition-colors hover:border-slate-200 dark:border-slate-800 dark:hover:border-slate-700"
                >
                  <div className="flex items-center gap-2">
                    <Badge tone="brand">{q.question_type.replace("_", " ")}</Badge>
                    <Badge tone="slate">{q.difficulty}</Badge>
                    {q.skipped && <Badge tone="amber">Skipped</Badge>}
                  </div>
                  <p className="mt-2 text-sm text-slate-800 dark:text-slate-200">
                    {i + 1}. {q.question_text}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
