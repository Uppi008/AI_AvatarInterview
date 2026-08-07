import { useTranslation } from "react-i18next";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { TrendingUp } from "lucide-react";

import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useTheme } from "@/hooks/useTheme";

interface PerformancePoint {
  label: string;
  score: number;
}

export function PerformanceChart({ data }: { data: PerformancePoint[] }) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const lineColor = theme === "dark" ? "#818cf8" : "#4f46e5"; // brand-400 / brand-600
  const gridColor = theme === "dark" ? "#1e293b" : "#e2e8f0"; // slate-800 / slate-200
  const tickColor = theme === "dark" ? "#94a3b8" : "#64748b"; // slate-400 / slate-500

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("dashboard.performance")}</CardTitle>
      </CardHeader>

      {data.length < 2 ? (
        <div className="flex h-56 items-center justify-center">
          <EmptyState icon={TrendingUp} title={t("dashboard.noInterviewsYet")} />
        </div>
      ) : (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
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
                width={32}
              />
              <Tooltip
                contentStyle={{
                  background: theme === "dark" ? "#0f172a" : "#ffffff",
                  border: `1px solid ${gridColor}`,
                  borderRadius: 8,
                  fontSize: 13,
                }}
                labelStyle={{ color: tickColor }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke={lineColor}
                strokeWidth={2}
                dot={{ r: 3, fill: lineColor, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
