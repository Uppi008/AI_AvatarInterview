import { useTranslation } from "react-i18next";
import { Lightbulb } from "lucide-react";

import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
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
        <p className="text-sm text-slate-400 dark:text-slate-500">{t("dashboard.noInterviewsYet")}</p>
      ) : (
        <ul className="space-y-3">
          {tips.slice(0, 4).map((tip, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              {tip}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
