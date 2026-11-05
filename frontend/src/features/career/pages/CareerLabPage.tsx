import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { Brain, CalendarDays, Code2, FileSearch, Mic2, Sparkles } from "lucide-react";

import { PageHero } from "@/components/fx/PageHero";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { cn } from "@/utils/cn";

import { AnswerCoachTool } from "../components/AnswerCoachTool";
import { CodeReviewTool } from "../components/CodeReviewTool";
import { JobMatchTool } from "../components/JobMatchTool";
import { QuizTool } from "../components/QuizTool";
import { StudyPlanTool } from "../components/StudyPlanTool";

const TABS = [
  { id: "job-match", labelKey: "career.tabJobMatch", label: "Job Match", hint: "Resume vs job post", icon: FileSearch },
  { id: "coach", labelKey: "career.tabCoach", label: "Answer Coach", hint: "Practice & rewrite", icon: Mic2 },
  { id: "quiz", labelKey: "career.tabQuiz", label: "Skill Quiz", hint: "Test any topic", icon: Brain },
  { id: "code", labelKey: "career.tabCode", label: "Code Review", hint: "Coding round", icon: Code2 },
  { id: "plan", labelKey: "career.tabPlan", label: "Study Plan", hint: "Day-by-day prep", icon: CalendarDays },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function CareerLabPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const tab: TabId = TABS.some((x) => x.id === params.get("tab")) ? (params.get("tab") as TabId) : "job-match";
  const [practiceQuestion, setPracticeQuestion] = useState<string | undefined>();
  const tabsRef = useRef<HTMLDivElement>(null);

  // On phones the tab bar scrolls sideways; keep the active tab in view.
  useEffect(() => {
    const bar = tabsRef.current;
    const active = bar?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (bar && active && bar.scrollWidth > bar.clientWidth) {
      bar.scrollTo({ left: active.offsetLeft - bar.clientWidth / 2 + active.clientWidth / 2, behavior: "smooth" });
    }
  }, [tab]);

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
            "Match your resume to real jobs, get coached on every answer, quiz yourself, review your code, and follow a study plan built from your own weak spots."
          )}
        />

        <div
          ref={tabsRef}
          role="tablist"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:rounded-2xl lg:bg-slate-100/80 lg:p-1.5 lg:pb-1.5 dark:lg:bg-slate-800/60"
        >
          {TABS.map(({ id, labelKey, label, hint, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              type="button"
              aria-selected={tab === id}
              onClick={() => goTo(id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-left transition lg:gap-3 lg:px-3",
                tab === id
                  ? "bg-white text-brand-700 shadow-sm ring-1 ring-brand-200 lg:ring-0 dark:bg-slate-900 dark:text-brand-300 dark:ring-brand-800"
                  : "bg-slate-100/80 text-slate-600 hover:text-slate-900 lg:bg-transparent dark:bg-slate-800/60 dark:text-slate-400 dark:hover:text-white lg:dark:bg-transparent"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="min-w-0">
                <span className="block whitespace-nowrap text-sm font-semibold">{t(labelKey, label)}</span>
                <span className="hidden truncate text-xs text-slate-500 xl:block dark:text-slate-400">{hint}</span>
              </span>
            </button>
          ))}
        </div>

        {tab === "job-match" && <JobMatchTool onPractice={practice} />}
        {tab === "coach" && <AnswerCoachTool initialQuestion={practiceQuestion} />}
        {tab === "quiz" && <QuizTool />}
        {tab === "code" && <CodeReviewTool onPractice={practice} />}
        {tab === "plan" && <StudyPlanTool onPractice={practice} />}
      </div>
    </DashboardLayout>
  );
}
