import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FileUp, Flame, ListChecks, Sparkles } from "lucide-react";

import { PageHero } from "@/components/fx/PageHero";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";

interface WelcomeCardProps {
  completedCount: number;
  averageScore: number | null;
  hasResume: boolean;
}

function greetingKey(hour: number) {
  if (hour < 12) return { key: "dashboard.goodMorning", fallback: "Good morning" };
  if (hour < 17) return { key: "dashboard.goodAfternoon", fallback: "Good afternoon" };
  return { key: "dashboard.goodEvening", fallback: "Good evening" };
}

/** Circular score gauge drawn on the gradient, so it uses white strokes. */
function ScoreRing({ score }: { score: number | null }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const progress = score === null ? 0 : Math.min(Math.max(score, 0), 100) / 100;

  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-white/15" />
        <motion.circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          className="text-white"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - progress) }}
          transition={{ duration: 1.1, ease: "easeOut", delay: 0.2 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold leading-none">{score ?? "—"}</span>
        <span className="mt-1 text-[11px] font-medium uppercase tracking-wide text-brand-100">
          {score === null ? "No score" : "Avg score"}
        </span>
      </div>
    </div>
  );
}

export function WelcomeCard({ completedCount, averageScore, hasResume }: WelcomeCardProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const greeting = greetingKey(new Date().getHours());
  const firstName = user?.full_name?.split(" ")[0] ?? "";

  return (
    <PageHero
      eyebrow={
        completedCount > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium ring-1 ring-inset ring-white/25 backdrop-blur-sm">
            <Flame className="h-3.5 w-3.5 text-amber-300" />
            {completedCount === 1
              ? t("dashboard.oneCompleted", "1 interview completed")
              : t("dashboard.manyCompleted", "{{count}} interviews completed", { count: completedCount })}
          </span>
        ) : undefined
      }
      title={
        <>
          {t(greeting.key, greeting.fallback)}, {firstName} 👋
        </>
      }
      subtitle={
        completedCount === 0
          ? t("dashboard.welcomeSubtitleNew", "Ready for your first mock interview? It takes about 15 minutes.")
          : t("dashboard.welcomeSubtitle")
      }
      aside={
        <div className="hidden sm:block">
          <ScoreRing score={averageScore} />
        </div>
      }
    >
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={() => navigate("/avatars")}>
          <Sparkles className="h-4 w-4" />
          {t("dashboard.startInterview")}
        </Button>
        <Button
          variant="ghost"
          className="bg-white/10 text-white ring-1 ring-inset ring-white/25 backdrop-blur-sm hover:bg-white/20 dark:text-white dark:hover:bg-white/20"
          onClick={() => navigate(hasResume ? "/interviews" : "/resume")}
        >
          {hasResume ? <ListChecks className="h-4 w-4" /> : <FileUp className="h-4 w-4" />}
          {hasResume ? t("dashboard.viewInterviews", "View my interviews") : t("dashboard.uploadResume")}
        </Button>
      </div>
    </PageHero>
  );
}
