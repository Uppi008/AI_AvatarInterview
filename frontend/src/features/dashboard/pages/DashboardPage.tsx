import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, FileText, Trophy } from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { LoadingRegion, Skeleton, SkeletonRow } from "@/components/ui/Skeleton";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/layouts/DashboardLayout";

import { AiSuggestions } from "../components/AiSuggestions";
import { DailyQuestionCard } from "../components/DailyQuestionCard";
import { PerformanceChart } from "../components/PerformanceChart";
import { RecentInterviews } from "../components/RecentInterviews";
import { SkillProgressChart } from "../components/SkillProgressChart";
import { StatCard } from "../components/StatCard";
import { StreakBadgesCard } from "../components/StreakBadgesCard";
import { WelcomeCard } from "../components/WelcomeCard";
import { useDashboardData } from "../useDashboardData";

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

/** Admins (placement officers) have their own home page. */
export function DashboardPage() {
  const { user } = useAuth();
  if (user?.role === "admin") return <Navigate to="/admin" replace />;
  return <StudentDashboard />;
}

function StudentDashboard() {
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
  const bestScore = reports.length > 0 ? Math.round(Math.max(...reports.map((r) => parseFloat(r.overall_score)))) : null;
  const scoresBySession = Object.fromEntries(reports.map((r) => [r.session, parseFloat(r.overall_score)]));

  const resumeValue = !activeResume
    ? t("dashboard.resumeNone", "Not uploaded")
    : {
        completed: t("dashboard.resumeReady", "Ready"),
        pending: t("dashboard.resumeProcessing", "Processing…"),
        processing: t("dashboard.resumeProcessing", "Processing…"),
        failed: t("dashboard.resumeFailed", "Parsing failed"),
      }[activeResume.parsing_status];
  const resumeHint = !activeResume
    ? t("dashboard.resumeHintNone", "Upload one for tailored questions")
    : activeResume.parsing_status === "completed"
      ? t("dashboard.resumeSkills", "{{count}} skills detected", { count: activeResume.skills.length })
      : activeResume.original_filename;

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingRegion label={t("common.loading", "Loading")} className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          <Skeleton className="h-48 rounded-3xl sm:h-52" />
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Card key={i} className="flex flex-col gap-4 p-4 sm:p-6">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-6 w-2/3" />
                </div>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <Skeleton className="mb-6 h-4 w-40" />
              <Skeleton className="h-56 w-full" />
            </Card>
            <Card className="space-y-3">
              <Skeleton className="mb-3 h-4 w-32" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </Card>
          </div>
          <Card className="p-4 sm:p-6">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </Card>
        </LoadingRegion>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="mx-auto flex w-full max-w-7xl flex-col gap-6"
      >
        <WelcomeCard completedCount={completedCount} averageScore={averageScore} hasResume={activeResume !== null} />

        {error && <Alert>{error}</Alert>}

        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <motion.div variants={itemVariants} className="h-full">
            <StatCard
              label={t("dashboard.stats.completed")}
              value={String(completedCount)}
              hint={
                sessions.length === 1
                  ? t("dashboard.oneSession", "1 session in total")
                  : t("dashboard.totalSessions", "{{count}} sessions in total", { count: sessions.length })
              }
              icon={CheckCircle2}
              tone="green"
              to="/interviews"
            />
          </motion.div>
          <motion.div variants={itemVariants} className="h-full">
            <StatCard
              label={t("dashboard.stats.upcoming")}
              value={String(upcomingCount)}
              hint={upcomingCount > 0 ? t("dashboard.upcomingHint", "Scheduled and waiting") : t("dashboard.nothingScheduled", "Nothing scheduled")}
              icon={Clock}
              tone="amber"
              to="/interviews"
            />
          </motion.div>
          <motion.div variants={itemVariants} className="h-full">
            <StatCard
              label={t("dashboard.stats.resumeStatus")}
              value={resumeValue}
              hint={resumeHint}
              icon={FileText}
              tone="slate"
              to="/resume"
            />
          </motion.div>
          <motion.div variants={itemVariants} className="h-full">
            <StatCard
              label={t("dashboard.stats.averageScore")}
              value={averageScore !== null ? `${averageScore}/100` : "—"}
              hint={
                bestScore !== null
                  ? t("dashboard.bestScore", "Best: {{score}}/100", { score: bestScore })
                  : t("dashboard.noScoresYet", "No scored interviews yet")
              }
              icon={Trophy}
              tone="brand"
            />
          </motion.div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <motion.div variants={itemVariants} className="h-full lg:col-span-2">
            <PerformanceChart data={performanceData} completedCount={completedCount} />
          </motion.div>
          <motion.div variants={itemVariants} className="h-full">
            <AiSuggestions latestReport={latestReport} completedCount={completedCount} hasResume={activeResume !== null} />
          </motion.div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <motion.div variants={itemVariants} className="h-full lg:col-span-2">
            <DailyQuestionCard />
          </motion.div>
          <motion.div variants={itemVariants} className="h-full">
            <StreakBadgesCard />
          </motion.div>
        </div>

        {reports.length >= 2 && (
          <motion.div variants={itemVariants}>
            <SkillProgressChart reports={reports} />
          </motion.div>
        )}

        <motion.div variants={itemVariants}>
          <RecentInterviews sessions={sessions} scores={scoresBySession} />
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}
