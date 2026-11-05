import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Check, Clock, Copy, MessageCircleWarning, Mic2, RotateCcw, Sparkles, Volume2, X } from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { getApiErrorMessage } from "@/services/apiClient";
import { cn } from "@/utils/cn";

import { careerApi } from "../api";
import { formatShortDate, speak } from "../format";
import type { AnswerPractice } from "../types";
import { BulletList, DictateButton, HistoryItem, ScoreBar, ScoreRing, TextArea, ThinkingState } from "./shared";

const STAR_LABELS = [
  ["situation", "Situation"],
  ["task", "Task"],
  ["action", "Action"],
  ["result", "Result"],
] as const;

const LENGTH_TEXT = {
  too_short: "Too short: aim for 1-2 minutes",
  good: "Good length",
  too_long: "Long: try to tighten it",
} as const;

export function AnswerCoachTool({ initialQuestion }: { initialQuestion?: string }) {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? "en";
  const [history, setHistory] = useState<AnswerPractice[]>([]);
  const [selected, setSelected] = useState<AnswerPractice | null>(null);
  const [question, setQuestion] = useState(initialQuestion ?? "");
  const [role, setRole] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    careerApi
      .listPractices()
      .then(({ data }) => setHistory(data.results))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (initialQuestion) {
      setQuestion(initialQuestion);
      setSelected(null);
    }
  }, [initialQuestion]);

  const words = answer.trim() ? answer.trim().split(/\s+/).length : 0;
  const canSubmit = question.trim().length >= 10 && answer.trim().length >= 20;

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await careerApi.createPractice({ question: question.trim(), answer: answer.trim(), target_role: role });
      setHistory((h) => [data, ...h]);
      setSelected(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't review this answer. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const retry = (p: AnswerPractice, useImproved: boolean) => {
    setQuestion(p.question);
    setRole(p.target_role);
    setAnswer(useImproved ? p.improved_answer : p.answer);
    setSelected(null);
  };

  const remove = async (id: string) => {
    await careerApi.deletePractice(id).catch(() => {});
    setHistory((h) => h.filter((p) => p.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="flex min-w-0 flex-col gap-5">
        {!selected && (
          <Card>
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                <Mic2 className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-semibold text-slate-900 dark:text-white">Practice an answer</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Type or speak your answer. AI coaches it like a real interviewer.</p>
              </div>
            </div>
            {loading ? (
              <ThinkingState steps={["Reading your answer", "Checking the STAR structure", "Writing a stronger version"]} />
            ) : (
              <div className="flex flex-col gap-4">
                <Input
                  label="Interview question"
                  placeholder="e.g. Tell me about a time you solved a difficult problem."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  maxLength={1000}
                />
                <Input
                  label="Target role (optional)"
                  placeholder="e.g. Frontend Developer"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  maxLength={150}
                />
                <TextArea
                  id="answer"
                  label="Your answer"
                  placeholder="Answer as you would in the interview..."
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  maxLength={6000}
                  className="min-h-44"
                  hint={
                    <DictateButton
                      language={language}
                      onText={(text) => setAnswer((a) => (a.trim() ? `${a.trimEnd()} ${text}` : text))}
                    />
                  }
                />
                <p className="-mt-2 text-xs tabular-nums text-slate-400">
                  {words
                    ? `${words} words · about ${Math.max(1, Math.round((words / 140) * 60))}s spoken`
                    : "Aim for 120-300 words (1-2 minutes spoken)."}
                </p>
                {error && <Alert tone="error">{error}</Alert>}
                <Button onClick={submit} disabled={!canSubmit} className="self-start">
                  <Sparkles className="h-4 w-4" />
                  Coach my answer
                </Button>
              </div>
            )}
          </Card>
        )}

        {selected && (
          <PracticeResult practice={selected} language={language} onRetry={retry} onNew={() => setSelected(null)} />
        )}
      </div>

      <Card className="h-fit p-4">
        <h3 className="mb-2 px-1 text-sm font-semibold text-slate-900 dark:text-white">Practice history</h3>
        {history.length === 0 ? (
          <p className="px-1 text-sm text-slate-500 dark:text-slate-400">Your coached answers will appear here.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {history.map((p) => (
              <HistoryItem
                key={p.id}
                title={p.question}
                subtitle={formatShortDate(p.created_at)}
                score={Number(p.overall_score)}
                active={selected?.id === p.id}
                onSelect={() => setSelected(p)}
                onDelete={() => void remove(p.id)}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function PracticeResult({
  practice: p,
  language,
  onRetry,
  onNew,
}: {
  practice: AnswerPractice;
  language: string;
  onRetry: (p: AnswerPractice, useImproved: boolean) => void;
  onNew: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const d = p.delivery;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(p.improved_answer);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked (e.g. insecure context) -- nothing to do.
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-5">
      <Card>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-300">Question</p>
        <p className="mt-1 font-medium text-slate-900 dark:text-white">{p.question}</p>
        <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row">
          <ScoreRing score={Number(p.overall_score)} size={104} label="Overall" />
          <div className="flex w-full flex-1 flex-col gap-3">
            <ScoreBar label="Clarity" score={Number(p.clarity_score)} />
            <ScoreBar label="Relevance" score={Number(p.relevance_score)} />
            <ScoreBar label="Impact (results, numbers, ownership)" score={Number(p.impact_score)} />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={onNew}>
            New question
          </Button>
          <Button size="sm" variant="outline" onClick={() => onRetry(p, false)}>
            <RotateCcw className="h-3.5 w-3.5" /> Try again
          </Button>
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 font-semibold text-slate-900 dark:text-white">STAR structure</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {STAR_LABELS.map(([key, label]) => {
            const part = p.star[key];
            return (
              <div
                key={key}
                className={cn(
                  "rounded-xl border p-3",
                  part?.present
                    ? "border-green-200 bg-green-50/60 dark:border-green-900/60 dark:bg-green-900/20"
                    : "border-amber-200 bg-amber-50/60 dark:border-amber-900/60 dark:bg-amber-900/20"
                )}
              >
                <p className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-white",
                      part?.present ? "bg-green-500" : "bg-amber-500"
                    )}
                  >
                    {part?.present ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                  </span>
                  {label}
                </p>
                {part?.comment && <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{part.comment}</p>}
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
          <Clock className="h-4 w-4 text-sky-500" /> Delivery
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Words" value={d.word_count} />
          <Stat label="Spoken time" value={`~${d.speaking_seconds}s`} />
          <Stat label="Filler words" value={d.filler_count} warn={d.filler_rate > 3} />
          <Stat label="Words / sentence" value={d.avg_sentence_words} warn={d.avg_sentence_words > 28} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span
            className={cn(
              "rounded-full px-2.5 py-1 font-medium",
              d.length_verdict === "good"
                ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
            )}
          >
            {LENGTH_TEXT[d.length_verdict]}
          </span>
          {!d.uses_numbers && (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              Add a number (%, time, users) to show impact
            </span>
          )}
          {Object.entries(d.fillers).map(([word, count]) => (
            <span key={word} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <MessageCircleWarning className="h-3 w-3" />"{word}" x{count}
            </span>
          ))}
        </div>
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-semibold text-slate-900 dark:text-white">What worked</h3>
          <BulletList items={p.strengths} tone="green" />
        </Card>
        <Card>
          <h3 className="mb-3 font-semibold text-slate-900 dark:text-white">Improve this</h3>
          <BulletList items={p.improvements} tone="amber" />
        </Card>
      </div>

      <Card className="border-brand-200 dark:border-brand-800">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
            <Sparkles className="h-4 w-4 text-brand-500" /> Stronger version
          </h3>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => speak(p.improved_answer, language)}>
              <Volume2 className="h-4 w-4" /> Listen
            </Button>
            <Button size="sm" variant="ghost" onClick={() => void copy()}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
        <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-300">{p.improved_answer}</p>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Replace any [placeholders] with your real details, then practice saying it out loud.
        </p>
        <Button size="sm" className="mt-4" onClick={() => onRetry(p, true)}>
          Practice this version
        </Button>
      </Card>
    </motion.div>
  );
}

function Stat({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
      <p className={cn("text-xl font-bold tabular-nums", warn ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white")}>
        {value}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}
