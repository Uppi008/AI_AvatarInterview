import { type KeyboardEvent, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bug, Check, Code2, Copy, Cpu, Gauge, MessageSquareText, Sparkles } from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getApiErrorMessage } from "@/services/apiClient";
import { cn } from "@/utils/cn";

import { careerApi } from "../api";
import { formatShortDate } from "../format";
import { CODE_LANGUAGES, type CodeLanguage, type CodeReview } from "../types";
import { BulletList, HistoryItem, ScoreBar, ScoreRing, TextArea, ThinkingState } from "./shared";

const SAMPLE_PROBLEMS = [
  "Two Sum: given an array of integers and a target, return the indices of the two numbers that add up to the target.",
  "Reverse a linked list and return the new head.",
  "Check whether a string of brackets like '([]{})' is balanced.",
  "Find the first non-repeating character in a string.",
];

/** Tab inserts 4 spaces instead of leaving the field (it's a code box). */
function handleTab(e: KeyboardEvent<HTMLTextAreaElement>, setCode: (v: string) => void) {
  if (e.key !== "Tab") return;
  e.preventDefault();
  const el = e.currentTarget;
  const { selectionStart: start, selectionEnd: end, value } = el;
  setCode(`${value.slice(0, start)}    ${value.slice(end)}`);
  requestAnimationFrame(() => el.setSelectionRange(start + 4, start + 4));
}

export function CodeReviewTool({ onPractice }: { onPractice: (question: string) => void }) {
  const [history, setHistory] = useState<CodeReview[]>([]);
  const [selected, setSelected] = useState<CodeReview | null>(null);
  const [problem, setProblem] = useState("");
  const [code, setCode] = useState("");
  const [lang, setLang] = useState<CodeLanguage>("Python");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    careerApi
      .listCodeReviews()
      .then(({ data }) => setHistory(data.results))
      .catch(() => {});
  }, []);

  const canSubmit = problem.trim().length >= 10 && code.trim().length >= 10;

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await careerApi.createCodeReview({ problem: problem.trim(), code, code_language: lang });
      setHistory((h) => [data, ...h]);
      setSelected(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't review this code. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const retry = (r: CodeReview, useImproved: boolean) => {
    setProblem(r.problem);
    setLang(r.code_language);
    setCode(useImproved ? r.improved_code : r.code);
    setSelected(null);
  };

  const remove = async (id: string) => {
    await careerApi.deleteCodeReview(id).catch(() => {});
    setHistory((h) => h.filter((r) => r.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="flex min-w-0 flex-col gap-5">
        {!selected && (
          <Card>
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                <Code2 className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-semibold text-slate-900 dark:text-white">Coding round review</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Paste a problem and your solution. AI reviews it like an interviewer would.
                </p>
              </div>
            </div>
            {loading ? (
              <ThinkingState steps={["Running through your code", "Checking edge cases", "Writing a cleaner version"]} />
            ) : (
              <div className="flex flex-col gap-4">
                <TextArea
                  id="problem"
                  label="Problem"
                  placeholder="Describe the coding problem..."
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                  maxLength={3000}
                  className="min-h-20"
                />
                <div className="-mt-2 flex flex-wrap gap-2">
                  {SAMPLE_PROBLEMS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setProblem(p)}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      {p.split(":")[0].split(" and")[0].slice(0, 34)}
                    </button>
                  ))}
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-end justify-between gap-2">
                    <label htmlFor="code" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Your code
                    </label>
                    <select
                      value={lang}
                      onChange={(e) => setLang(e.target.value as CodeLanguage)}
                      className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      aria-label="Programming language"
                    >
                      {CODE_LANGUAGES.map((l) => (
                        <option key={l}>{l}</option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    id="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onKeyDown={(e) => handleTab(e, setCode)}
                    spellCheck={false}
                    maxLength={8000}
                    placeholder={"def solve(nums, target):\n    ..."}
                    className="min-h-64 w-full resize-y rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 font-mono text-[13px] leading-relaxed text-slate-100 placeholder:text-slate-600 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  />
                </div>
                {error && <Alert tone="error">{error}</Alert>}
                <Button onClick={submit} disabled={!canSubmit} className="self-start">
                  <Sparkles className="h-4 w-4" />
                  Review my code
                </Button>
              </div>
            )}
          </Card>
        )}

        {selected && (
          <ReviewResult review={selected} onRetry={retry} onNew={() => setSelected(null)} onPractice={onPractice} />
        )}
      </div>

      <Card className="h-fit p-4">
        <h3 className="mb-2 px-1 text-sm font-semibold text-slate-900 dark:text-white">Past reviews</h3>
        {history.length === 0 ? (
          <p className="px-1 text-sm text-slate-500 dark:text-slate-400">Your reviewed solutions appear here.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {history.map((r) => (
              <HistoryItem
                key={r.id}
                title={r.problem}
                subtitle={`${r.code_language} · ${formatShortDate(r.created_at)}`}
                score={Number(r.correctness_score)}
                active={selected?.id === r.id}
                onSelect={() => setSelected(r)}
                onDelete={() => void remove(r.id)}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function ReviewResult({
  review: r,
  onRetry,
  onNew,
  onPractice,
}: {
  review: CodeReview;
  onRetry: (r: CodeReview, useImproved: boolean) => void;
  onNew: () => void;
  onPractice: (question: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(r.improved_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked -- nothing to do.
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-5">
      <Card>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-300">
          {r.code_language} · Problem
        </p>
        <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{r.problem}</p>
        <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row">
          <ScoreRing score={Number(r.correctness_score)} size={104} label="Correctness" />
          <div className="flex w-full flex-1 flex-col gap-3">
            <p className="font-semibold text-slate-900 dark:text-white">{r.verdict}</p>
            <ScoreBar label="Readability" score={Number(r.readability_score)} />
            <ScoreBar label="Efficiency" score={Number(r.efficiency_score)} />
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Complexity icon={Gauge} label="Time" value={r.time_complexity} />
          <Complexity icon={Cpu} label="Space" value={r.space_complexity} />
        </div>
        {r.analysis && <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{r.analysis}</p>}
        <div className="mt-5 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={onNew}>
            New problem
          </Button>
          <Button size="sm" variant="outline" onClick={() => onRetry(r, false)}>
            Edit my code
          </Button>
        </div>
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
            <Bug className="h-4 w-4 text-red-500" /> Bugs & edge cases
          </h3>
          {r.bugs.length ? (
            <BulletList items={r.bugs} tone="red" />
          ) : (
            <p className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <Check className="h-4 w-4" /> No bugs found
            </p>
          )}
        </Card>
        <Card>
          <h3 className="mb-3 font-semibold text-slate-900 dark:text-white">Improvements</h3>
          <BulletList items={r.improvements} tone="amber" />
        </Card>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
            <Sparkles className="h-4 w-4 text-brand-500" /> Improved solution
          </h3>
          <Button size="sm" variant="ghost" onClick={() => void copy()}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <pre className="max-h-[28rem] overflow-auto rounded-xl bg-slate-950 p-4 font-mono text-[13px] leading-relaxed text-slate-100">
          <code>{r.improved_code}</code>
        </pre>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => onRetry(r, true)}>
            Review this version
          </Button>
        </div>
      </Card>

      {r.follow_up_question && (
        <Card className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <MessageSquareText className="hidden h-5 w-5 shrink-0 text-brand-500 sm:block" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              The interviewer's follow-up
            </p>
            <p className="mt-0.5 text-sm font-medium text-slate-900 dark:text-white">{r.follow_up_question}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => onPractice(r.follow_up_question)} className="shrink-0">
            Practice answer
          </Button>
        </Card>
      )}
    </motion.div>
  );
}

function Complexity({ icon: Icon, label, value }: { icon: typeof Gauge; label: string; value: string }) {
  const slow = /n\^?2|n²|2\^n|n!|n\^3/i.test(value);
  return (
    <div className={cn("rounded-xl p-3", slow ? "bg-amber-50 dark:bg-amber-900/20" : "bg-slate-50 dark:bg-slate-800/60")}>
      <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <Icon className="h-3.5 w-3.5" /> {label} complexity
      </p>
      <p className={cn("mt-0.5 font-mono text-lg font-bold", slow ? "text-amber-700 dark:text-amber-300" : "text-slate-900 dark:text-white")}>
        {value || "--"}
      </p>
    </div>
  );
}
