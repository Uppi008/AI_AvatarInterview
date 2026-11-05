import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Brain, Check, RotateCcw, Sparkles, X } from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PillGroup } from "@/components/ui/PillGroup";
import { getApiErrorMessage } from "@/services/apiClient";
import { cn } from "@/utils/cn";

import { careerApi } from "../api";
import { formatShortDate } from "../format";
import type { Quiz } from "../types";
import { HistoryItem, ScoreRing, ThinkingState } from "./shared";

const SUGGESTED_TOPICS = ["Python", "Django", "React", "SQL joins", "JavaScript", "Data structures", "OOP", "REST APIs", "Git"];
const DIFFICULTIES = ["easy", "medium", "hard"] as const;
const COUNTS = ["5", "10", "15"] as const;
const LETTERS = ["A", "B", "C", "D"];

export function QuizTool() {
  const [history, setHistory] = useState<Quiz[]>([]);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<(typeof DIFFICULTIES)[number]>("medium");
  const [count, setCount] = useState<(typeof COUNTS)[number]>("10");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    careerApi
      .listQuizzes()
      .then(({ data }) => setHistory(data.results))
      .catch(() => {});
  }, []);

  const replace = (q: Quiz) => {
    setQuiz(q);
    setHistory((h) => [q, ...h.filter((x) => x.id !== q.id)]);
  };

  const create = async (overrideTopic?: string) => {
    const t = (overrideTopic ?? topic).trim();
    if (t.length < 2) return;
    setTopic(t);
    setLoading(true);
    setError(null);
    try {
      const { data } = await careerApi.createQuiz({ topic: t, difficulty, count: Number(count) });
      replace(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't create the quiz. Please try again."));
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
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                <Brain className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-semibold text-slate-900 dark:text-white">Test yourself</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  AI writes a fresh interview-style quiz on any topic, with explanations.
                </p>
              </div>
            </div>
            {loading ? (
              <ThinkingState steps={["Picking the key concepts", "Writing the questions", "Checking the answers"]} />
            ) : (
              <div className="flex flex-col gap-4">
                <Input
                  label="Topic"
                  placeholder="e.g. Django ORM, Python decorators, SQL joins"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void create()}
                  maxLength={200}
                />
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_TOPICS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTopic(t)}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-medium transition",
                        topic === t
                          ? "bg-brand-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-3">
                  <PillGroup
                    label="Level"
                    options={DIFFICULTIES.map((d) => ({ value: d, label: d }))}
                    value={difficulty}
                    onChange={setDifficulty}
                  />
                  <PillGroup
                    label="Questions"
                    options={COUNTS.map((c) => ({ value: c, label: c }))}
                    value={count}
                    onChange={setCount}
                  />
                </div>
                {error && <Alert tone="error">{error}</Alert>}
                <Button onClick={() => void create()} disabled={topic.trim().length < 2} className="self-start">
                  <Sparkles className="h-4 w-4" />
                  Start quiz
                </Button>
              </div>
            )}
          </Card>
        )}

        {quiz && !quiz.submitted_at && <QuizRunner key={quiz.id} quiz={quiz} onSubmitted={replace} onExit={() => setQuiz(null)} />}
        {quiz?.submitted_at && (
          <QuizResults quiz={quiz} onNew={() => setQuiz(null)} onRetake={() => void create(quiz.topic)} />
        )}
      </div>

      <Card className="h-fit p-4">
        <h3 className="mb-2 px-1 text-sm font-semibold text-slate-900 dark:text-white">Your quizzes</h3>
        {history.length === 0 ? (
          <p className="px-1 text-sm text-slate-500 dark:text-slate-400">Finished quizzes and scores appear here.</p>
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

function QuizRunner({ quiz, onSubmitted, onExit }: { quiz: Quiz; onSubmitted: (q: Quiz) => void; onExit: () => void }) {
  const total = quiz.questions.length;
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => Array(total).fill(null));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const q = quiz.questions[index];
  const answered = answers.filter((a) => a !== null).length;

  const choose = (option: number) => {
    setAnswers((a) => a.map((v, i) => (i === index ? option : v)));
    // Move on automatically, but let the selection register visually first.
    if (index < total - 1) setTimeout(() => setIndex((i) => Math.min(i + 1, total - 1)), 250);
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const { data } = await careerApi.submitQuiz(quiz.id, answers);
      onSubmitted(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't submit. Please try again."));
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-300">
            {quiz.topic} · {quiz.difficulty}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Question {index + 1} of {total} · {answered} answered
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={onExit}>
          Exit
        </Button>
      </div>

      <div className="mb-5 flex gap-1">
        {quiz.questions.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Go to question ${i + 1}`}
            onClick={() => setIndex(i)}
            className={cn(
              "h-1.5 flex-1 rounded-full transition",
              i === index ? "bg-brand-600" : answers[i] !== null ? "bg-brand-300 dark:bg-brand-700" : "bg-slate-200 dark:bg-slate-700"
            )}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.18 }}
        >
          <p className="mb-4 text-lg font-semibold leading-snug text-slate-900 dark:text-white">{q.question}</p>
          <div className="flex flex-col gap-2.5">
            {q.options.map((option, i) => {
              const selected = answers[index] === i;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => choose(i)}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-3.5 text-left text-sm transition",
                    selected
                      ? "border-brand-500 bg-brand-50 text-brand-900 ring-2 ring-brand-500/20 dark:bg-brand-900/30 dark:text-white"
                      : "border-slate-200 text-slate-700 hover:border-brand-300 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/60"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold",
                      selected ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    )}
                  >
                    {LETTERS[i]}
                  </span>
                  <span className="min-w-0 break-words pt-0.5">{option}</span>
                </button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {error && (
        <Alert tone="error" className="mt-4">
          {error}
        </Alert>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <Button size="sm" variant="outline" onClick={() => setIndex((i) => i - 1)} disabled={index === 0}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        {index < total - 1 ? (
          <Button size="sm" variant="outline" onClick={() => setIndex((i) => i + 1)}>
            Next <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="sm" onClick={() => void submit()} isLoading={submitting}>
            Submit {answered < total ? `(${total - answered} unanswered)` : ""}
          </Button>
        )}
      </div>
    </Card>
  );
}

function QuizResults({ quiz, onNew, onRetake }: { quiz: Quiz; onNew: () => void; onRetake: () => void }) {
  const score = Number(quiz.score ?? 0);
  const correct = quiz.questions.filter((q, i) => quiz.answers[i] === q.correct_index).length;
  const message =
    score >= 80 ? "Excellent! You're interview-ready on this." : score >= 50 ? "Good base. Review the misses below." : "Keep going. Study the explanations and retake it.";

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-5">
      <Card className="flex flex-col items-center gap-5 sm:flex-row">
        <ScoreRing score={score} size={104} label={`${correct}/${quiz.questions.length} correct`} />
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-300">
            {quiz.topic} · {quiz.difficulty}
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{message}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onRetake}>
            <RotateCcw className="h-3.5 w-3.5" /> New set
          </Button>
          <Button size="sm" variant="outline" onClick={onNew}>
            Other topic
          </Button>
        </div>
      </Card>

      {quiz.questions.map((q, i) => {
        const chosen = quiz.answers[i];
        const right = chosen === q.correct_index;
        return (
          <Card key={i} className="p-5">
            <div className="mb-3 flex items-start gap-3">
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white",
                  right ? "bg-green-500" : "bg-red-500"
                )}
              >
                {right ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
              </span>
              <p className="font-medium text-slate-900 dark:text-white">
                {i + 1}. {q.question}
              </p>
            </div>
            <div className="flex flex-col gap-1.5 pl-10">
              {q.options.map((option, oi) => (
                <div
                  key={oi}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm",
                    oi === q.correct_index
                      ? "bg-green-50 font-medium text-green-800 dark:bg-green-900/30 dark:text-green-200"
                      : oi === chosen
                        ? "bg-red-50 text-red-700 line-through dark:bg-red-900/30 dark:text-red-300"
                        : "text-slate-500 dark:text-slate-400"
                  )}
                >
                  {LETTERS[oi]}. {option}
                </div>
              ))}
              {chosen === null && <p className="text-xs text-amber-600 dark:text-amber-400">Skipped</p>}
              {q.explanation && (
                <p className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                  {q.explanation}
                </p>
              )}
            </div>
          </Card>
        );
      })}
    </motion.div>
  );
}
