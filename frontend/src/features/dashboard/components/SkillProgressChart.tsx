import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Activity } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type { InterviewReport } from "@/features/reports/types";
import { useTheme } from "@/hooks/useTheme";
import { seriesColors } from "@/styles/chartPalette";
import { cn } from "@/utils/cn";

// Fixed order = fixed colour per skill, even when some are hidden.
const SKILLS = [
  { key: "communication_score", labelKey: "report.communication", fallback: "Communication" },
  { key: "technical_score", labelKey: "report.technical", fallback: "Technical" },
  { key: "confidence_score", labelKey: "report.confidence", fallback: "Confidence" },
  { key: "grammar_score", labelKey: "report.grammar", fallback: "Grammar" },
] as const;

type SkillKey = (typeof SKILLS)[number]["key"];

/** One line per skill across interviews, so a student sees exactly where they're improving. */
export function SkillProgressChart({ reports }: { reports: InterviewReport[] }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const colors = seriesColors(theme);
  const [hidden, setHidden] = useState<Set<SkillKey>>(new Set());
  const [showTable, setShowTable] = useState(false);

  const gridColor = theme === "dark" ? "#1e293b" : "#e2e8f0";
  const tickColor = theme === "dark" ? "#94a3b8" : "#64748b";

  const ordered = reports.slice().sort((a, b) => new Date(a.generated_at).getTime() - new Date(b.generated_at).getTime());
  const data = ordered.map((r, i) => ({
    label: `#${i + 1}`,
    date: new Date(r.generated_at).toLocaleDateString(undefined, { dateStyle: "medium" }),
    ...Object.fromEntries(SKILLS.map((s) => [s.key, Math.round(Number(r[s.key]))])),
  })) as ({ label: string; date: string } & Record<SkillKey, number>)[];
  const latest = data[data.length - 1];

  const toggle = (key: SkillKey) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else if (next.size < SKILLS.length - 1) next.add(key); // keep at least one line
      return next;
    });

  return (
    <Card className="h-full">
      <CardHeader className="flex-wrap">
        <div>
          <CardTitle>{t("dashboard.skillProgress", "Skill progress")}</CardTitle>
          <CardDescription>{t("dashboard.skillProgressHint", "How each skill has changed across your interviews")}</CardDescription>
        </div>
        {data.length >= 2 && (
          <button
            type="button"
            onClick={() => setShowTable((v) => !v)}
            className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            {showTable ? t("dashboard.showChart", "Show chart") : t("dashboard.showTable", "Show table")}
          </button>
        )}
      </CardHeader>

      {data.length < 2 ? (
        <div className="flex h-56 items-center justify-center">
          <EmptyState
            icon={Activity}
            title={t("dashboard.skillProgressEmpty", "Your skill trends appear after two scored interviews")}
          />
        </div>
      ) : (
        <>
          {/* Legend doubles as the series toggle and carries each skill's latest value. */}
          <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label={t("dashboard.skillToggle", "Show or hide skills")}>
            {SKILLS.map((s, i) => {
              const off = hidden.has(s.key);
              return (
                <button
                  key={s.key}
                  type="button"
                  aria-pressed={!off}
                  onClick={() => toggle(s.key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition",
                    off
                      ? "border-slate-200 text-slate-400 dark:border-slate-700 dark:text-slate-500"
                      : "border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-200"
                  )}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: off ? "transparent" : colors[i], boxShadow: `inset 0 0 0 1.5px ${colors[i]}` }} />
                  {t(s.labelKey, s.fallback)}
                  <span className="tabular-nums text-slate-500 dark:text-slate-400">{latest[s.key]}</span>
                </button>
              );
            })}
          </div>

          {showTable ? (
            <div className="max-h-56 overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="py-1.5 pr-3 font-medium">#</th>
                    {SKILLS.map((s) => (
                      <th key={s.key} className="py-1.5 pr-3 text-right font-medium">
                        {t(s.labelKey, s.fallback)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="tabular-nums text-slate-700 dark:text-slate-300">
                  {data.map((row) => (
                    <tr key={row.label} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="py-1.5 pr-3">
                        {row.label} <span className="text-xs text-slate-400">{row.date}</span>
                      </td>
                      {SKILLS.map((s) => (
                        <td key={s.key} className="py-1.5 pr-3 text-right">
                          {row[s.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: tickColor, fontSize: 12 }} axisLine={{ stroke: gridColor }} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: tickColor, fontSize: 12 }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip
                    cursor={{ stroke: tickColor, strokeDasharray: "3 3" }}
                    labelFormatter={(label, payload) => `${label} · ${payload?.[0]?.payload?.date ?? ""}`}
                    contentStyle={{
                      background: theme === "dark" ? "#0f172a" : "#ffffff",
                      border: `1px solid ${gridColor}`,
                      borderRadius: 10,
                      boxShadow: "0 8px 24px -8px rgba(15, 23, 42, 0.25)",
                      fontSize: 13,
                    }}
                    labelStyle={{ color: tickColor }}
                    itemStyle={{ color: theme === "dark" ? "#e2e8f0" : "#0f172a" }}
                  />
                  {SKILLS.map((s, i) =>
                    hidden.has(s.key) ? null : (
                      <Line
                        key={s.key}
                        type="monotone"
                        dataKey={s.key}
                        name={t(s.labelKey, s.fallback)}
                        stroke={colors[i]}
                        strokeWidth={2}
                        dot={{ r: 4, fill: colors[i], stroke: theme === "dark" ? "#0f172a" : "#ffffff", strokeWidth: 2 }}
                        activeDot={{ r: 6, stroke: theme === "dark" ? "#0f172a" : "#ffffff", strokeWidth: 2 }}
                        animationDuration={700}
                      />
                    )
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
