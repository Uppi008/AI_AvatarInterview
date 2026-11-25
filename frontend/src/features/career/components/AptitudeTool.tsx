import { useEffect, useState } from "react";
import { BookText, Calculator, Clock, Puzzle, Shuffle, Sparkles, Timer } from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PillGroup } from "@/components/ui/PillGroup";
import { getApiErrorMessage } from "@/services/apiClient";
import { cn } from "@/utils/cn";

import { careerApi } from "../api";
import { formatShortDate } from "../format";
import type { Quiz, QuizCategory } from "../types";
import { QuizResults, QuizRunner } from "./QuizTool";
import { HistoryItem, ThinkingState } from "./shared";

const SECTIONS: { value: Exclude<QuizCategory, "general">; label: string; hint: string; icon: typeof Calculator }[] = [
  { value: "quantitative", label: "Quantitative", hint: "Percentages, ratios, time & work, speed", icon: Calculator },
  { value: "logical", label: "Logical reasoning", hint: "Arrangements, relations, coding-decoding", icon: Puzzle },
  { value: "verbal", label: "Verbal ability", hint: "Grammar, vocabulary, comprehension", icon: BookText },
  { value: "mixed", label: "Mixed mock test", hint: "All three, like a real placement test", icon: Shuffle },
];
const DIFFICULTIES = ["easy", "medium", "hard"] as const;
const COUNTS = ["10", "15", "20"] as const;

/** Timed campus-placement style aptitude sections (1 minute per question). */
export function AptitudeTool() {
  const [history, setHistory] = useState<Quiz[]>([]);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [section, setSection] = useState<(typeof SECTIONS)[number]["value"]>("quantitative");
  const [difficulty, setDifficulty] = useState<(typeof DIFFICULTIES)[number]>("medium");
  const [count, setCount] = useState<(typeof COUNTS)[number]>("10");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    careerApi
      .listQuizzes()
      .then(({ data }) => setHistory(data.results.filter((q) => q.category !== "general")))
      .catch(() => {});
  }, []);

  const replace = (q: Quiz) => {
    setQuiz(q);
    setHistory((h) => [q, ...h.filter((x) => x.id !== q.id)]);
  };

  const start = async (category = section) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await careerApi.createQuiz({ category, difficulty, count: Number(count) });
      replace(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't create the test. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    await careerApi.deleteQuiz(id).catch(() => {});
    setHistory((h) => h.filter((q) => q.id !== id));
    if (quiz?.id === id) setQuiz(null);
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="flex min-w-0 flex-col gap-5">
        {!quiz && (
          <Card>
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                <Timer className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-semibold text-slate-900 dark:text-white">Aptitude test</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Timed practice like TCS, Infosys and Wipro placement tests, with worked solutions.
                </p>
              </div>
            </div>
            {loading ? (
              <ThinkingState steps={["Choosing the questions", "Solving each one", "Writing the solutions"]} />
            ) : (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Test section">
                  {SECTIONS.map(({ value, label, hint, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={section === value}
                      onClick={() => setSection(value)}
                      className={cn(
                        "flex items-start gap-3 rounded-xl border p-3 text-left transition",
                        section === value
                          ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500/20 dark:border-brand-400 dark:bg-brand-900/30"
                          : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
                      )}
                    >
                      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", section === value ? "text-brand-600 dark:text-brand-300" : "text-slate-400")} />
                      <span>
                        <span className="block text-sm font-semibold text-slate-900 dark:text-white">{label}</span>
                        <span className="block text-xs text-slate-500 dark:text-slate-400">{hint}</span>
                      </span>
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-3">
                  <PillGroup label="Level" options={DIFFICULTIES.map((d) => ({ value: d, label: d }))} value={difficulty} onChange={setDifficulty} />
                  <PillGroup label="Questions" options={COUNTS.map((c) => ({ value: c, label: c }))} value={count} onChange={setCount} />
                </div>
                <p className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                  <Clock className="h-4 w-4" />
                  {count} minutes · submits automatically when time is up
                </p>
                {error && <Alert tone="error">{error}</Alert>}
                <Button onClick={() => void start()} className="self-start">
                  <Sparkles className="h-4 w-4" />
                  Start test
                </Button>
              </div>
            )}
          </Card>
        )}

        {quiz && !quiz.submitted_at && <QuizRunner key={quiz.id} quiz={quiz} onSubmitted={replace} onExit={() => setQuiz(null)} />}
        {quiz?.submitted_at && (
          <QuizResults quiz={quiz} onNew={() => setQuiz(null)} onRetake={() => void start(quiz.category as typeof section)} />
        )}
      </div>

      <Card className="h-fit p-4">
        <h3 className="mb-2 px-1 text-sm font-semibold text-slate-900 dark:text-white">Your tests</h3>
        {history.length === 0 ? (
          <p className="px-1 text-sm text-slate-500 dark:text-slate-400">Finished tests and scores appear here.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {history.map((q) => (
              <HistoryItem
                key={q.id}
                title={q.topic}
                subtitle={`${q.difficulty} · ${q.submitted_at ? formatShortDate(q.created_at) : "Not finished"}`}
                score={q.score !== null ? Number(q.score) : undefined}
                active={quiz?.id === q.id}
                onSelect={() => setQuiz(q)}
                onDelete={() => void remove(q.id)}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
