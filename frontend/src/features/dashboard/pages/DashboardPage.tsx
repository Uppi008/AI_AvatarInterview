import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, FileText, Trophy } from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { DashboardLayout } from "@/layouts/DashboardLayout";

import { AiSuggestions } from "../components/AiSuggestions";
import { PerformanceChart } from "../components/PerformanceChart";
import { RecentInterviews } from "../components/RecentInterviews";
import { StatCard } from "../components/StatCard";
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
        <div className="flex h-64 items-center justify-center">
          <Spinner />
        </div>
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

        <motion.div variants={itemVariants}>
          <RecentInterviews sessions={sessions} scores={scoresBySession} />
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}
