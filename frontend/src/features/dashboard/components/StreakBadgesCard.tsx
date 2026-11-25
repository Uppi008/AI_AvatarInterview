import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Award,
  Brain,
  Calendar,
  Crown,
  FileCheck2,
  Flame,
  Lock,
  Mic,
  Rocket,
  Star,
  Target,
  Trophy,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { engagementApi, type ProgressInfo } from "@/features/engagement/api";
import { cn } from "@/utils/cn";

const BADGE_ICONS: Record<string, LucideIcon> = {
  first_interview: Rocket,
  interviews_5: Target,
  interviews_10: Crown,
  score_70: Star,
  score_90: Trophy,
  streak_3: Zap,
  streak_7: Flame,
  coach_5: Mic,
  quiz_ace: Award,
  aptitude_80: Brain,
  gd_debut: Users,
  resume_ready: FileCheck2,
};

/** Practice streak (last 7 days) and the badge collection. */
export function StreakBadgesCard() {
  const { t } = useTranslation();
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const [failed, setFailed] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    engagementApi
      .progress()
      .then(({ data }) => setProgress(data))
      .catch(() => setFailed(true));
  }, []);

  if (failed) return null;

  if (!progress) {
    return (
      <Card className="h-full space-y-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-20 w-full" />
      </Card>
    );
  }

  const { streak, badges } = progress;
  const earned = badges.filter((b) => b.earned).length;
  // Earned first, then the closest to being earned.
  const sorted = badges
    .slice()
    .sort((a, b) => Number(b.earned) - Number(a.earned) || b.progress / b.target - a.progress / a.target);
  const visible = showAll ? sorted : sorted.slice(0, 6);

  return (
    <Card className="h-full">
      <CardHeader>
        <div>
          <CardTitle>{t("engagement.streakTitle", "Your streak")}</CardTitle>
          <CardDescription>
            {streak.active_today
              ? t("engagement.doneToday", "You've practiced today. Nice!")
              : streak.current > 0
                ? t("engagement.keepItAlive", "Practice today to keep your streak alive")
                : t("engagement.startStreak", "Practice today to start a streak")}
          </CardDescription>
        </div>
      </CardHeader>

      <div className="flex items-center gap-4">
        <div
          className={cn(
            "flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl",
            streak.current > 0
              ? "bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-lg shadow-orange-500/30"
              : "bg-slate-100 text-slate-400 dark:bg-slate-800"
          )}
        >
          <Flame className="h-6 w-6" />
          <span className="text-lg font-bold leading-none tabular-nums">{streak.current}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex justify-between gap-1" aria-label={t("engagement.last7", "Last 7 days")}>
            {streak.last_7_days.map((d) => {
              const day = new Date(`${d.date}T00:00:00`);
              return (
                <div key={d.date} className="flex flex-col items-center gap-1">
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold",
                      d.active
                        ? "bg-orange-500 text-white"
                        : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                    )}
                    title={`${day.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })}: ${d.active ? "practiced" : "no practice"}`}
                  >
                    {d.active ? "✓" : ""}
                  </span>
                  <span className="text-[10px] text-slate-400">{day.toLocaleDateString(undefined, { weekday: "narrow" })}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-2 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <Calendar className="h-3.5 w-3.5" />
            {t("engagement.longest", "Longest: {{count}} days", { count: streak.longest })}
          </p>
        </div>
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
        <div className="mb-3 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
            <Award className="h-4 w-4 text-brand-600 dark:text-brand-400" />
            {t("engagement.badges", "Badges")}
            <span className="font-normal text-slate-500">
              {earned}/{badges.length}
            </span>
          </p>
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            {showAll ? t("engagement.showLess", "Show less") : t("engagement.showAll", "See all")}
          </button>
        </div>
        <ul className="grid grid-cols-3 gap-2">
          {visible.map((badge) => {
            const Icon = BADGE_ICONS[badge.id] ?? Award;
            return (
              <li
                key={badge.id}
                title={`${badge.title}: ${badge.description}${badge.earned ? "" : ` (${badge.progress}/${badge.target})`}`}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl p-2 text-center",
                  badge.earned ? "bg-brand-50 dark:bg-brand-900/30" : "bg-slate-50 dark:bg-slate-800/50"
                )}
              >
                <span
                  className={cn(
                    "relative flex h-9 w-9 items-center justify-center rounded-full",
                    badge.earned
                      ? "bg-gradient-to-br from-brand-500 to-indigo-700 text-white shadow-md shadow-brand-600/30"
                      : "bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-500"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {!badge.earned && <Lock className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-white p-px text-slate-500 dark:bg-slate-900" />}
                </span>
                <span className={cn("line-clamp-2 text-[11px] font-medium leading-tight", badge.earned ? "text-slate-800 dark:text-slate-100" : "text-slate-500 dark:text-slate-400")}>
                  {badge.title}
                </span>
                {!badge.earned && (
                  <span className="text-[10px] tabular-nums text-slate-400">
                    {badge.progress}/{badge.target}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </Card>
  );
}
