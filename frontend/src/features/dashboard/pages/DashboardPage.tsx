import { useTranslation } from "react-i18next";
import { CheckCircle2, Clock, FileText, Trophy } from "lucide-react";

import { Spinner } from "@/components/ui/Spinner";
import { DashboardLayout } from "@/layouts/DashboardLayout";

import { AiSuggestions } from "../components/AiSuggestions";
import { PerformanceChart } from "../components/PerformanceChart";
import { RecentInterviews } from "../components/RecentInterviews";
import { StatCard } from "../components/StatCard";
import { WelcomeCard } from "../components/WelcomeCard";
import { useDashboardData } from "../useDashboardData";

export function DashboardPage() {
  const { t } = useTranslation();
  const { sessions, reports, activeResume, loading, error } = useDashboardData();

  const completedCount = sessions.filter((s) => s.status === "completed").length;
  const upcomingCount = sessions.filter((s) => s.status === "scheduled").length;
  const averageScore =
    reports.length > 0
      ? Math.round(reports.reduce((sum, r) => sum + parseFloat(r.overall_score), 0) / reports.length)
      : null;

  const performanceData = reports
    .slice()
    .reverse()
    .map((r, i) => ({ label: `#${i + 1}`, score: parseFloat(r.overall_score) }));

  const latestReport = reports[0] ?? null;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <Spinner />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <WelcomeCard />

        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label={t("dashboard.stats.completed")} value={String(completedCount)} icon={CheckCircle2} tone="green" />
          <StatCard label={t("dashboard.stats.upcoming")} value={String(upcomingCount)} icon={Clock} tone="amber" />
          <StatCard
            label={t("dashboard.stats.resumeStatus")}
            value={activeResume ? activeResume.parsing_status : t("dashboard.noResume")}
            icon={FileText}
            tone="slate"
          />
          <StatCard
            label={t("dashboard.stats.averageScore")}
            value={averageScore !== null ? `${averageScore}/100` : "—"}
            icon={Trophy}
            tone="brand"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <PerformanceChart data={performanceData} />
          </div>
          <AiSuggestions latestReport={latestReport} />
        </div>

        <RecentInterviews sessions={sessions} />
      </div>
    </DashboardLayout>
  );
}
