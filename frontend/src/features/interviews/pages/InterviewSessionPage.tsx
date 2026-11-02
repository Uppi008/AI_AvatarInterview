import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  Clock3,
  CornerDownRight,
  FileText,
  Languages,
  ListChecks,
  MessageSquareText,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Video,
} from "lucide-react";

import { PageHero } from "@/components/fx/PageHero";
import { Alert } from "@/components/ui/Alert";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { reportsApi } from "@/features/reports/api";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { getApiErrorMessage } from "@/services/apiClient";
import { cn } from "@/utils/cn";
import { LANGUAGE_LABEL, formatDuration, scoreBadgeClasses, scoreBarClass } from "@/utils/score";

import { interviewsApi } from "../api";
import type { InterviewQuestion, InterviewSessionDetail, InterviewStatus } from "../types";

const STATUS_TONE: Record<InterviewStatus, "green" | "brand" | "amber" | "red" | "slate"> = {
  completed: "green",
  in_progress: "brand",
  scheduled: "amber",
  terminated: "red",
  abandoned: "slate",
};

const SCORE_DIMENSIONS = [
  { key: "technical_score", label: "Technical" },
  { key: "communication_score", label: "Communication" },
  { key: "relevance_score", label: "Relevance" },
  { key: "confidence_score", label: "Confidence" },
] as const;

function answerScore(q: InterviewQuestion): number | null {
  const ev = q.answer?.evaluation;
  if (!ev) return null;
  const values = SCORE_DIMENSIONS.map((d) => parseFloat(ev[d.key]));
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function QuestionItem({ question, index, isFollowUp }: { question: InterviewQuestion; index: string; isFollowUp?: boolean }) {
  const [open, setOpen] = useState(false);
  const answer = question.answer;
  const evaluation = answer?.evaluation ?? null;
  const score = answerScore(question);
  const hasDetails = Boolean(answer);

  return (
    <li className={cn(isFollowUp && "ml-6 sm:ml-10")}>
      <div
        className={cn(
          "rounded-xl border transition-colors",
          open
            ? "border-brand-200 bg-brand-50/30 dark:border-brand-900/60 dark:bg-brand-900/10"
            : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
        )}
      >
        <button
          type="button"
          disabled={!hasDetails}
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex w-full items-start gap-4 p-4 text-left disabled:cursor-default"
        >
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
              isFollowUp
                ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                : "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
            )}
          >
            {isFollowUp ? <CornerDownRight className="h-4 w-4" /> : index}
          </span>
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <Badge tone="brand">{question.question_type.replace("_", " ")}</Badge>
              <Badge tone="slate">{question.difficulty}</Badge>
              {question.skipped && <Badge tone="amber">Skipped</Badge>}
              {!question.skipped && !answer && <Badge tone="slate">Not answered</Badge>}
            </div>
            <p className="text-sm font-medium leading-relaxed text-slate-900 dark:text-slate-100">{question.question_text}</p>
          </div>
          {score !== null && (
            <span className={cn("shrink-0 rounded-lg px-2.5 py-1 text-sm font-bold ring-1 ring-inset", scoreBadgeClasses(score))}>
              {score}
            </span>
          )}
          {hasDetails && (
            <ChevronDown className={cn("mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform", open && "rotate-180")} />
          )}
        </button>

        {open && answer && (
          <div className="space-y-4 border-t border-slate-100 px-4 pb-4 pt-4 dark:border-slate-800 sm:pl-16">
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <MessageSquareText className="h-3.5 w-3.5" />
                Your answer
                {answer.response_time_seconds ? (
                  <span className="font-normal normal-case tracking-normal text-slate-400">
                    · answered in {answer.response_time_seconds}s
                  </span>
                ) : null}
              </p>
              <p className="whitespace-pre-line rounded-lg bg-white p-3 text-sm leading-relaxed text-slate-700 ring-1 ring-inset ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800">
                {answer.transcript_text || <span className="italic text-slate-400">No transcript was recorded.</span>}
              </p>
            </div>

            {evaluation && (
              <>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                  {SCORE_DIMENSIONS.map(({ key, label }) => {
                    const value = Math.round(parseFloat(evaluation[key]));
                    return (
                      <div key={key}>
                        <div className="mb-1 flex justify-between text-xs">
                          <span className="text-slate-500 dark:text-slate-400">{label}</span>
                          <span className="font-semibold text-slate-900 dark:text-white">{value}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                          <div className={cn("h-full rounded-full", scoreBarClass(value))} style={{ width: `${value}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {evaluation.feedback_text && (
                  <div className="flex gap-3 rounded-lg bg-amber-50/70 p-3 ring-1 ring-inset ring-amber-200/70 dark:bg-amber-900/10 dark:ring-amber-800/40">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{evaluation.feedback_text}</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {question.follow_ups.length > 0 && (
        <ol className="mt-2 space-y-2">
          {question.follow_ups.map((fu, i) => (
            <QuestionItem key={fu.id} question={fu} index={`${index}.${i + 1}`} isFollowUp />
          ))}
        </ol>
      )}
    </li>
  );
}

export function InterviewSessionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<InterviewSessionDetail | null>(null);
  const [reportScore, setReportScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    void interviewsApi
      .retrieve(id)
      .then(({ data }) => {
        setSession(data);
        if (data.status === "completed" || data.status === "terminated") {
          void reportsApi
            .retrieveBySession(id)
            .then((report) => setReportScore(report ? Math.round(parseFloat(report.overall_score)) : null));
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const onGenerateReport = async () => {
    if (!session) return;
    setGenerating(true);
    setGenerateError(null);
    try {
      await interviewsApi.generateReport(session.id);
      navigate(`/interviews/${session.id}/report`);
    } catch (err) {
      setGenerateError(getApiErrorMessage(err, "Couldn't generate the report."));
    } finally {
      setGenerating(false);
    }
  };

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
  const answeredCount = session.answered_count ?? session.questions.filter((q) => q.answer).length;
  const date = session.started_at ?? session.scheduled_at;
  const duration = formatDuration(session.duration_seconds);
  // The API lists follow-ups both at top level and nested under their parent;
  // show each once, nested.
  const followUpIds = new Set(session.questions.flatMap((q) => q.follow_ups.map((f) => f.id)));
  const topLevel = session.questions.filter((q) => !followUpIds.has(q.id));
  const scored = session.questions.map(answerScore).filter((s): s is number => s !== null);

  return (
    <DashboardLayout>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <Link
          to="/interviews"
          className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          All interviews
        </Link>

        {/* Hero */}
        <PageHero
          leading={
            <Avatar src={session.avatar_image} name={session.avatar_name} className="h-16 w-16 text-2xl ring-4 ring-white/25" />
          }
          title={
            <span className="inline-flex flex-wrap items-center gap-2">
              Interview with {session.avatar_name}
              <Badge tone={STATUS_TONE[session.status]} dot>
                {session.status.replace("_", " ")}
              </Badge>
            </span>
          }
          subtitle={
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              {date && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" />
                  {new Date(date).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                </span>
              )}
              {duration && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="h-4 w-4" />
                  {duration}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Languages className="h-4 w-4" />
                {LANGUAGE_LABEL[session.language] ?? session.language}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ListChecks className="h-4 w-4" />
                {answeredCount}/{session.questions.length} answered
              </span>
              {session.violation_count > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4" />
                  {session.violation_count} proctoring alert{session.violation_count === 1 ? "" : "s"}
                </span>
              )}
            </div>
          }
          aside={
            reportScore !== null && (
              <div className="flex flex-col items-center rounded-2xl bg-white/15 px-5 py-3 ring-1 ring-inset ring-white/25 backdrop-blur-sm">
                <span className="text-3xl font-bold leading-none">{reportScore}</span>
                <span className="mt-1 text-[11px] font-medium uppercase tracking-wide text-brand-100">Overall</span>
              </div>
            )
          }
        />

        {session.termination_reason && (
          <Alert tone="error">
            <span className="font-semibold">Interview ended early:</span> {session.termination_reason}
          </Alert>
        )}

        {/* What to do next */}
        {isLive && (
          <Card className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">This interview is still in progress</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Jump back in where you left off.</p>
            </div>
            <Button onClick={() => navigate(`/interviews/${session.id}/live`)}>
              <Video className="h-4 w-4" />
              Rejoin live interview
            </Button>
          </Card>
        )}

        {isFinished && reportScore !== null && (
          <Card className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/30">
                <FileText className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Your scorecard is ready</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Full breakdown, strengths, improvement tips and a learning roadmap.
                </p>
              </div>
            </div>
            <Button onClick={() => navigate(`/interviews/${session.id}/report`)}>
              <FileText className="h-4 w-4" />
              View full report
            </Button>
          </Card>
        )}

        {isFinished && reportScore === null && answeredCount > 0 && (
          <Card className="flex flex-col gap-4">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Your report hasn't been generated yet</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  You answered {answeredCount} question{answeredCount === 1 ? "" : "s"}. Generate your scorecard now — it
                  takes up to a minute.
                </p>
              </div>
              <Button onClick={() => void onGenerateReport()} isLoading={generating} className="shrink-0">
                {!generating && <RefreshCw className="h-4 w-4" />}
                {generating ? "Scoring your answers…" : "Generate report"}
              </Button>
            </div>
            {generateError && <Alert tone="error">{generateError}</Alert>}
          </Card>
        )}

        {isFinished && answeredCount === 0 && (
          <Card className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">No score for this interview</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                It ended before any question was answered, so there was nothing to evaluate.
              </p>
            </div>
            <Button onClick={() => navigate("/avatars")} className="shrink-0">
              <Sparkles className="h-4 w-4" />
              Start a new interview
            </Button>
          </Card>
        )}

        {/* Questions */}
        <Card>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Questions & answers</h2>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                {scored.length > 0
                  ? "Click an answered question to see your answer, scores and AI feedback."
                  : `${topLevel.length} question${topLevel.length === 1 ? "" : "s"} in this interview.`}
              </p>
            </div>
            {scored.length > 0 && (
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Avg. answer score{" "}
                <span className="font-semibold text-slate-900 dark:text-white">
                  {Math.round(scored.reduce((a, b) => a + b, 0) / scored.length)}
                </span>
              </span>
            )}
          </div>
          {session.questions.length === 0 ? (
            <EmptyState icon={ListChecks} title="No questions were generated for this session." />
          ) : (
            <ol className="space-y-3">
              {topLevel.map((q, i) => (
                <QuestionItem key={q.id} question={q} index={String(i + 1)} />
              ))}
            </ol>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
