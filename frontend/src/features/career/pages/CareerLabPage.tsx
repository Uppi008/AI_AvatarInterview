import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { CalendarDays, FileSearch, Mic2, Sparkles } from "lucide-react";

import { PageHero } from "@/components/fx/PageHero";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { cn } from "@/utils/cn";

import { AnswerCoachTool } from "../components/AnswerCoachTool";
import { JobMatchTool } from "../components/JobMatchTool";
import { StudyPlanTool } from "../components/StudyPlanTool";

const TABS = [
  { id: "job-match", labelKey: "career.tabJobMatch", label: "Job Match", hint: "Resume vs job post", icon: FileSearch },
  { id: "coach", labelKey: "career.tabCoach", label: "Answer Coach", hint: "Practice & rewrite", icon: Mic2 },
  { id: "plan", labelKey: "career.tabPlan", label: "Study Plan", hint: "Day-by-day prep", icon: CalendarDays },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function CareerLabPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const tab: TabId = TABS.some((x) => x.id === params.get("tab")) ? (params.get("tab") as TabId) : "job-match";
  const [practiceQuestion, setPracticeQuestion] = useState<string | undefined>();

  const goTo = (id: TabId) => setParams({ tab: id }, { replace: true });
  // "Practice" buttons in Job Match / Study Plan hand their question to the coach.
  const practice = (question: string) => {
    setPracticeQuestion(question);
    goTo("coach");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <PageHero
          eyebrow={
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> {t("nav.careerLab", "AI Career Lab")}
            </span>
          }
          title={t("career.heroTitle", "Prepare smarter between interviews")}
          subtitle={t(
            "career.heroSubtitle",
            "Match your resume to real jobs, get coached on every answer, and follow a study plan built from your own weak spots."
          )}
        />

        <div role="tablist" className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-100/80 p-1.5 dark:bg-slate-800/60">
          {TABS.map(({ id, labelKey, label, hint, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              type="button"
              aria-selected={tab === id}
              onClick={() => goTo(id)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-center transition sm:flex-row sm:gap-3 sm:px-4 sm:text-left",
                tab === id
                  ? "bg-white text-brand-700 shadow-sm dark:bg-slate-900 dark:text-brand-300"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="min-w-0">
                <span className="block text-xs font-semibold sm:text-sm">{t(labelKey, label)}</span>
                <span className="hidden truncate text-xs text-slate-500 sm:block dark:text-slate-400">{hint}</span>
              </span>
            </button>
          ))}
        </div>

        {tab === "job-match" && <JobMatchTool onPractice={practice} />}
        {tab === "coach" && <AnswerCoachTool initialQuestion={practiceQuestion} />}
        {tab === "plan" && <StudyPlanTool onPractice={practice} />}
      </div>
    </DashboardLayout>
  );
}
