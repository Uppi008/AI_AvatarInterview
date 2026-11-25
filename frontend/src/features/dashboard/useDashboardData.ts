import { useCallback, useEffect, useState } from "react";

import { interviewsApi } from "@/features/interviews/api";
import type { InterviewSession } from "@/features/interviews/types";
import { reportsApi } from "@/features/reports/api";
import type { InterviewReport } from "@/features/reports/types";
import { resumeApi } from "@/features/resume/api";
import type { Resume } from "@/features/resume/types";
import { getApiErrorMessage } from "@/services/apiClient";

interface DashboardData {
  sessions: InterviewSession[];
  reports: InterviewReport[];
  activeResume: Resume | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

export function useDashboardData(): DashboardData {
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [reports, setReports] = useState<InterviewReport[]>([]);
  const [activeResume, setActiveResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Each part loads on its own: one failing request shouldn't blank the
      // whole dashboard, and the message says which part is missing.
      const [sessionsRes, reportsRes, resumesRes] = await Promise.allSettled([
        interviewsApi.list(),
        reportsApi.list(),
        resumeApi.list(),
      ]);
      if (cancelled) return;

      const failed: string[] = [];
      let firstError: unknown = null;
      const fail = (part: string, reason: unknown) => {
        failed.push(part);
        firstError ??= reason;
      };
      if (sessionsRes.status === "fulfilled") setSessions(sessionsRes.value.data.results);
      else fail("interviews", sessionsRes.reason);
      if (reportsRes.status === "fulfilled") setReports(reportsRes.value.data.results);
      else fail("scores", reportsRes.reason);
      if (resumesRes.status === "fulfilled") setActiveResume(resumesRes.value.data.results.find((r) => r.is_active) ?? null);
      else fail("resume", resumesRes.reason);

      setError(
        failed.length
          ? `Couldn't load your ${failed.join(", ")}. ${getApiErrorMessage(firstError, "Please try again.")}`
          : null
      );
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setLoading(true);
    setAttempt((n) => n + 1);
  }, []);

  return { sessions, reports, activeResume, loading, error, retry };
}
