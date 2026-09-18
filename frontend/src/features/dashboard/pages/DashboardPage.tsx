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
        className="flex flex-col gap-6"
      >
        <WelcomeCard completedCount={completedCount} />

        {error && <Alert>{error}</Alert>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <motion.div variants={itemVariants}>
            <StatCard label={t("dashboard.stats.completed")} value={String(completedCount)} icon={CheckCircle2} tone="green" />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard label={t("dashboard.stats.upcoming")} value={String(upcomingCount)} icon={Clock} tone="amber" />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard
              label={t("dashboard.stats.resumeStatus")}
              value={activeResume ? activeResume.parsing_status : t("dashboard.noResume")}
              icon={FileText}
              tone="slate"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard
              label={t("dashboard.stats.averageScore")}
              value={averageScore !== null ? `${averageScore}/100` : "—"}
              icon={Trophy}
              tone="brand"
            />
          </motion.div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <PerformanceChart data={performanceData} />
          </motion.div>
          <motion.div variants={itemVariants}>
            <AiSuggestions latestReport={latestReport} />
          </motion.div>
        </div>

        <motion.div variants={itemVariants}>
          <RecentInterviews sessions={sessions} />
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}
