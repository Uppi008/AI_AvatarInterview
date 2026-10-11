import { useTranslation } from "react-i18next";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Hourglass, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/utils/cn";

interface PerformancePoint {
  label: string;
  score: number;
}

interface PerformanceChartProps {
  data: PerformancePoint[];
  /** Completed sessions, which can exceed `data.length` while reports are still generating. */
  completedCount: number;
}

export function PerformanceChart({ data, completedCount }: PerformanceChartProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const delta = data.length >= 2 ? Math.round(data[data.length - 1].score - data[data.length - 2].score) : null;

  const lineColor = theme === "dark" ? "#818cf8" : "#4f46e5"; // brand-400 / brand-600
  const gridColor = theme === "dark" ? "#1e293b" : "#e2e8f0"; // slate-800 / slate-200
  const tickColor = theme === "dark" ? "#94a3b8" : "#64748b"; // slate-400 / slate-500

  return (
    <Card className="h-full">
      <CardHeader className="items-start">
        <div>
          <CardTitle>{t("dashboard.performance")}</CardTitle>
          <CardDescription>{t("dashboard.performanceHint", "Overall score for each completed interview")}</CardDescription>
        </div>
        {delta !== null && (
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
              delta >= 0
                ? "bg-green-50 text-green-700 ring-green-600/15 dark:bg-green-900/30 dark:text-green-300"
                : "bg-red-50 text-red-700 ring-red-600/15 dark:bg-red-900/30 dark:text-red-300"
            )}
          >
            {delta >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {delta >= 0 ? "+" : ""}
            {delta} {t("dashboard.vsLast", "vs last")}
          </span>
        )}
      </CardHeader>

      {data.length === 0 ? (
        <div className="flex h-64 items-center justify-center">
          {completedCount > 0 ? (
            <EmptyState
              icon={Hourglass}
              title={t("dashboard.reportPending", "Your report is being prepared")}
              description={t("dashboard.reportPendingHint", "Scores appear here once your interview report is ready.")}
            />
          ) : (
            <EmptyState
              icon={TrendingUp}
              title={t("dashboard.noInterviewsYet")}
              description={t("dashboard.chartEmptyHint", "Complete interviews to track how your score improves.")}
              action={
                <Button size="sm" onClick={() => navigate("/avatars")}>
                  <Sparkles className="h-4 w-4" />
                  {t("dashboard.startInterview")}
                </Button>
              }
            />
          )}
        </div>
      ) : data.length === 1 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
          <p className="text-5xl font-bold tracking-tight text-slate-900 dark:text-white">
            {Math.round(data[0].score)}
            <span className="text-xl font-semibold text-slate-400">/100</span>
          </p>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {t("dashboard.firstScore", "Your first interview score")}
          </p>
          <p className="max-w-xs text-sm text-slate-400 dark:text-slate-500">
            {t("dashboard.oneMoreForTrend", "Complete one more interview to see your progress over time.")}
          </p>
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="performanceFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={lineColor} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: tickColor, fontSize: 12 }}
                axisLine={{ stroke: gridColor }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: tickColor, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Tooltip
                contentStyle={{
                  background: theme === "dark" ? "#0f172a" : "#ffffff",
                  border: `1px solid ${gridColor}`,
                  borderRadius: 10,
                  boxShadow: "0 8px 24px -8px rgba(15, 23, 42, 0.25)",
                  fontSize: 13,
                }}
                labelStyle={{ color: tickColor }}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke={lineColor}
                strokeWidth={2.5}
                fill="url(#performanceFill)"
                dot={{ r: 3, fill: lineColor, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                animationDuration={900}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
