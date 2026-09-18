import { useTranslation } from "react-i18next";
import { Lightbulb } from "lucide-react";

import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type { InterviewReport } from "@/features/reports/types";

export function AiSuggestions({ latestReport }: { latestReport: InterviewReport | null }) {
  const { t } = useTranslation();
  const tips = latestReport?.improvement_tips ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("dashboard.aiSuggestions")}</CardTitle>
      </CardHeader>

      {tips.length === 0 ? (
        <EmptyState icon={Lightbulb} title={t("dashboard.noInterviewsYet")} />
      ) : (
        <ul className="space-y-1">
          {tips.slice(0, 4).map((tip, i) => (
            <li
              key={i}
              className="-mx-2.5 flex items-start gap-3 rounded-xl p-2.5 text-sm text-slate-700 transition-colors hover:bg-amber-50/60 dark:text-slate-300 dark:hover:bg-amber-400/5"
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-xs font-bold text-white shadow-sm shadow-amber-500/30">
                {i + 1}
              </span>
              <span className="pt-0.5">{tip}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
