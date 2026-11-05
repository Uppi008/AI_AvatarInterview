import { type ReactNode, type TextareaHTMLAttributes, forwardRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff, Sparkles, Trash2 } from "lucide-react";

import { cn } from "@/utils/cn";
import { scoreBarClass } from "@/utils/score";

import { useDictation } from "../useDictation";

export function ScoreRing({ score, size = 88, label }: { score: number; size?: number; label?: string }) {
  const r = 15.5;
  const circumference = 2 * Math.PI * r;
  const stroke = score >= 75 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
          <circle cx="18" cy="18" r={r} fill="none" strokeWidth="3.5" className="stroke-slate-200 dark:stroke-slate-700" />
          <motion.circle
            cx="18"
            cy="18"
            r={r}
            fill="none"
            stroke={stroke}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference * (1 - Math.min(100, Math.max(0, score)) / 100) }}
            transition={{ duration: 1.1, ease: "easeOut" }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xl font-bold tabular-nums text-slate-900 dark:text-white">
          {Math.round(score)}
        </span>
      </div>
      {label && <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>}
    </div>
  );
}

export function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="font-medium text-slate-600 dark:text-slate-300">{label}</span>
        <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{Math.round(score)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <motion.div
          className={cn("h-full rounded-full", scoreBarClass(score))}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

export const TextArea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: ReactNode }
>(({ label, hint, className, id, ...props }, ref) => (
  <div className="flex flex-col gap-1.5">
    <div className="flex items-end justify-between gap-2">
      <label htmlFor={id} className="text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      {hint}
    </div>
    <textarea
      ref={ref}
      id={id}
      className={cn(
        "min-h-32 w-full resize-y rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm leading-relaxed text-slate-900",
        "placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20",
        "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
        className
      )}
      {...props}
    />
  </div>
));
TextArea.displayName = "TextArea";

/** Mic button that dictates into a text field via the browser's speech recognition. */
export function DictateButton({ onText, language }: { onText: (text: string) => void; language: string }) {
  const { supported, listening, interim, error, start, stop } = useDictation(onText, language);
  if (!supported) return null;
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={listening ? stop : start}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition",
          listening
            ? "bg-red-500 text-white shadow-md shadow-red-500/30"
            : "bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-900/40 dark:text-brand-200"
        )}
      >
        {listening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
        {listening ? "Stop" : "Speak"}
        {listening && <span className="h-1.5 w-1.5 animate-ping rounded-full bg-white" />}
      </button>
      {interim && <span className="max-w-56 truncate text-[11px] italic text-slate-400">{interim}</span>}
      {error && <span className="max-w-56 text-right text-[11px] text-red-500">{error}</span>}
    </div>
  );
}

export function BulletList({ items, tone }: { items: string[]; tone: "green" | "amber" | "brand" | "red" }) {
  const dot = { green: "bg-green-500", amber: "bg-amber-500", brand: "bg-brand-500", red: "bg-red-500" }[tone];
  if (!items.length) return <p className="text-sm text-slate-400">--</p>;
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <span className={cn("mt-2 h-1.5 w-1.5 shrink-0 rounded-full", dot)} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

const THINKING_STEPS = ["Reading your input", "Thinking like a recruiter", "Writing your feedback"];

/** Shown while the LLM works -- these calls take 5-30s on the free tier. */
export function ThinkingState({ steps = THINKING_STEPS }: { steps?: string[] }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, steps.length - 1)), 3500);
    return () => clearInterval(timer);
  }, [steps.length]);
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <div className="relative h-16 w-16">
        <span className="absolute inset-0 animate-ping rounded-full bg-brand-400/30" />
        <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-indigo-700 text-white shadow-lg shadow-brand-600/40">
          <Sparkles className="h-7 w-7" />
        </span>
      </div>
      <div>
        <p className="font-semibold text-slate-900 dark:text-white">{steps[step]}...</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">This usually takes 10-30 seconds.</p>
      </div>
    </div>
  );
}

export function HistoryItem({
  title,
  subtitle,
  score,
  active,
  onSelect,
  onDelete,
}: {
  title: string;
  subtitle: string;
  score?: number;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-xl border px-3 py-2.5 transition",
        active
          ? "border-brand-300 bg-brand-50/70 dark:border-brand-700 dark:bg-brand-900/30"
          : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60"
      )}
    >
      <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{title}</p>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
      </button>
      {score !== undefined && (
        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {Math.round(score)}
        </span>
      )}
      <button
        type="button"
        onClick={onDelete}
        aria-label="Delete"
        className="rounded-md p-1 text-slate-400 opacity-100 transition hover:bg-red-50 hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100 dark:hover:bg-red-900/30"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
