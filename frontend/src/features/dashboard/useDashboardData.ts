import { useEffect, useState } from "react";

import { interviewsApi } from "@/features/interviews/api";
import type { InterviewSession } from "@/features/interviews/types";
import { reportsApi } from "@/features/reports/api";
import type { InterviewReport } from "@/features/reports/types";
import { resumeApi } from "@/features/resume/api";
import type { Resume } from "@/features/resume/types";

interface DashboardData {
  sessions: InterviewSession[];
  reports: InterviewReport[];
  activeResume: Resume | null;
  loading: boolean;
  error: string | null;
}

export function useDashboardData(): DashboardData {
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [reports, setReports] = useState<InterviewReport[]>([]);
  const [activeResume, setActiveResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [sessionsRes, reportsRes, resumesRes] = await Promise.all([
          interviewsApi.list(),
          reportsApi.list(),
          resumeApi.list(),
        ]);
        if (cancelled) return;
        setSessions(sessionsRes.data.results);
        setReports(reportsRes.data.results);
        setActiveResume(resumesRes.data.results.find((r) => r.is_active) ?? null);
      } catch {
        if (!cancelled) setError("Couldn't load your dashboard right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { sessions, reports, activeResume, loading, error };
}
