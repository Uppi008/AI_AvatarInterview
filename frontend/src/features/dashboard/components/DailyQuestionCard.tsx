import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarCheck, Send, Sparkles } from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { careerApi } from "@/features/career/api";
import { DictateButton } from "@/features/career/components/shared";
import { engagementApi, type DailyQuestion } from "@/features/engagement/api";
import { getApiErrorMessage } from "@/services/apiClient";
import { scoreBadgeClasses } from "@/utils/score";
import { cn } from "@/utils/cn";

/** One interview question a day; answered and scored by the Answer Coach. */
export function DailyQuestionCard() {
  const { t, i18n } = useTranslation();
  const [daily, setDaily] = useState<DailyQuestion | null>(null);
  const [failed, setFailed] = useState(false);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    engagementApi
      .dailyQuestion()
      .then(({ data }) => setDaily(data))
      .catch(() => setFailed(true));
  }, []);

  if (failed) return null;

  if (!daily) {
    return (
      <Card className="h-full space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-24 w-full" />
      </Card>
    );
  }

  const submit = async () => {
    if (answer.trim().length < 20) {
      setError(t("daily.tooShort", "Write at least a couple of sentences (20+ characters)."));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { data } = await careerApi.createPractice({ question: daily.question, answer: answer.trim() });
      setDaily({ ...daily, practice: data });
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't score your answer. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const practice = daily.practice;
  const score = practice ? Math.round(Number(practice.overall_score)) : null;

  return (
    <Card className="h-full">
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-brand-600 dark:text-brand-400" />
            {t("daily.title", "Question of the day")}
          </CardTitle>
          <CardDescription>{t("daily.subtitle", "Two minutes a day keeps you interview-ready")}</CardDescription>
        </div>
      </CardHeader>

      <p className="mb-3 text-base font-semibold leading-snug text-slate-900 dark:text-white">“{daily.question}”</p>

      {practice ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className={cn("rounded-lg px-2.5 py-1 text-lg font-bold ring-1 ring-inset", scoreBadgeClasses(score ?? 0))}>{score}</span>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {t("daily.done", "Done for today! Come back tomorrow for a new question.")}
            </p>
          </div>
          {practice.improvements[0] && (
            <p className="rounded-lg bg-amber-50/70 p-3 text-sm text-slate-700 ring-1 ring-inset ring-amber-200/70 dark:bg-amber-900/10 dark:text-slate-300 dark:ring-amber-800/40">
              <Sparkles className="mr-1 inline h-3.5 w-3.5 text-amber-600" />
              {practice.improvements[0]}
            </p>
          )}
          <Link
            to="/career-lab?tab=coach"
            className="inline-flex items-center gap-1 self-start text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            {t("daily.fullFeedback", "See full feedback in Answer Coach")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex justify-end">
            <DictateButton language={i18n.language} onText={(text) => setAnswer((a) => (a ? `${a} ${text}` : text))} />
          </div>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={4}
            maxLength={4000}
            aria-label={t("daily.yourAnswer", "Your answer")}
            placeholder={t("daily.placeholder", "Type or speak your answer…")}
            className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          {error && <Alert tone="error">{error}</Alert>}
          <Button onClick={() => void submit()} isLoading={submitting} className="self-start">
            <Send className="h-4 w-4" />
            {submitting ? t("daily.scoring", "Scoring…") : t("daily.submit", "Get my score")}
          </Button>
        </div>
      )}
    </Card>
  );
}
