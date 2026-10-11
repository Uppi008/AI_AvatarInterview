import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BrainCircuit,
  Check,
  FileText,
  FileWarning,
  Languages,
  Loader2,
  MessagesSquare,
  Mic,
  Search,
  Sparkles,
  Users,
  X,
} from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { interviewsApi } from "@/features/interviews/api";
import type { InterviewPersonality } from "@/features/interviews/types";
import { resumeApi } from "@/features/resume/api";
import type { Resume } from "@/features/resume/types";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { getApiErrorMessage } from "@/services/apiClient";
import { cn } from "@/utils/cn";

import { avatarsApi } from "../api";
import { AvatarCard } from "../components/AvatarCard";
import { CustomAvatarPanel } from "../components/CustomAvatarPanel";
import type { Avatar, Difficulty } from "../types";

type Language = "en" | "hi" | "te";

const LANGUAGE_OPTIONS: { value: Language; label: string; native: string }[] = [
  { value: "en", label: "English", native: "Aa" },
  { value: "hi", label: "Hindi", native: "हि" },
  { value: "te", label: "Telugu", native: "తె" },
];

// Independent of avatar choice -- overrides that avatar's own default
// interview_style/speaking_style/difficulty (apps.interviews.models.
// PERSONALITY_PROFILES). "" means "use the avatar's own defaults".
// Labels are hand-cased (not derived from the slug) so acronyms like
// "HR"/"CEO" render correctly instead of "Hr"/"Ceo"; hints paraphrase
// each profile's interview_style.
const PERSONALITY_OPTIONS: { value: InterviewPersonality; label: string; hint: string }[] = [
  { value: "", label: "Interviewer's own", hint: "Uses the selected interviewer's natural style." },
  { value: "friendly", label: "Friendly", hint: "Warm and encouraging — puts you at ease." },
  { value: "professional", label: "Professional", hint: "Structured, courteous and businesslike." },
  { value: "strict_hr", label: "Strict HR", hint: "Formal and probing, holds you to a high bar." },
  { value: "technical", label: "Technical", hint: "Deep technical probing that expects precise answers." },
  { value: "manager", label: "Manager", hint: "Ownership, prioritization and leadership under constraints." },
  { value: "ceo", label: "CEO", hint: "Big-picture and strategic — tests vision and judgment." },
  { value: "mentor", label: "Mentor", hint: "Supportive and growth-oriented, room to think out loud." },
  { value: "recruiter", label: "Recruiter", hint: "Broad first-round screen across culture fit and fundamentals." },
];

const DIFFICULTY_TABS: { value: Difficulty | ""; label: string }[] = [
  { value: "", label: "All levels" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

const PREP_STEPS = [
  { icon: FileText, text: "Reading your resume" },
  { icon: BrainCircuit, text: "Generating tailored questions" },
  { icon: Mic, text: "Warming up your interviewer's voice" },
];

function StartingOverlay({ avatar }: { avatar: Avatar }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setStep((s) => Math.min(s + 1, PREP_STEPS.length - 1)), 4000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      role="alertdialog"
      aria-live="polite"
      aria-label="Preparing your interview"
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
      >
        <div className="relative h-36 overflow-hidden">
          <img src={avatar.image} alt="" className="h-full w-full object-cover object-[center_25%]" />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-900/90 to-brand-600/30" />
          <div className="absolute inset-x-0 bottom-0 p-5 text-white">
            <p className="text-xs font-medium uppercase tracking-wide text-brand-100">Preparing your interview</p>
            <p className="text-lg font-semibold">with {avatar.name}</p>
          </div>
        </div>
        <ul className="space-y-3 p-5">
          {PREP_STEPS.map(({ icon: Icon, text }, i) => (
            <li key={text} className="flex items-center gap-3 text-sm">
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors",
                  i < step
                    ? "bg-green-500 text-white"
                    : i === step
                      ? "bg-brand-100 text-brand-600 dark:bg-brand-900/50 dark:text-brand-300"
                      : "bg-slate-100 text-slate-400 dark:bg-slate-800"
                )}
              >
                {i < step ? <Check className="h-4 w-4" /> : i === step ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
              </span>
              <span className={cn(i <= step ? "font-medium text-slate-900 dark:text-white" : "text-slate-400")}>{text}</span>
            </li>
          ))}
        </ul>
        <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          This usually takes 20–60 seconds. Allow camera and microphone access when asked.
        </p>
      </motion.div>
    </motion.div>
  );
}

export function AvatarSelectionPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeResume, setActiveResume] = useState<Resume | null | undefined>(undefined);
  const [difficulty, setDifficulty] = useState<Difficulty | "">("");
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState<Language>("en");
  const [personality, setPersonality] = useState<InterviewPersonality>("");
  const [selected, setSelected] = useState<Avatar | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch the whole catalog once; difficulty is filtered client-side so
    // the tab counts stay accurate.
    void avatarsApi
      .list()
      .then(({ data }) => setAvatars(data.results))
      .catch((err) => setError(getApiErrorMessage(err, "Couldn't load interviewers.")))
      .finally(() => setLoading(false));
    void resumeApi
      .list()
      .then(({ data }) => setActiveResume(data.results.find((r) => r.is_active) ?? null))
      .catch(() => setActiveResume(null));
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return avatars.filter(
      (a) =>
        (!difficulty || a.difficulty === difficulty) &&
        (!q || a.name.toLowerCase().includes(q) || a.category.replace(/_/g, " ").includes(q))
    );
  }, [avatars, difficulty, query]);

  const handleStart = async () => {
    if (!selected) return;
    setError(null);
    setStarting(true);
    try {
      const { data: session } = await interviewsApi.start({ avatar_id: selected.id, language, personality });
      navigate(`/interviews/${session.id}/live`);
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't start the interview. Please try again."));
      setStarting(false);
    }
  };

  const personalityHint = PERSONALITY_OPTIONS.find((p) => p.value === personality)?.hint;
  const resumeReady = activeResume?.parsing_status === "completed";

  return (
    <DashboardLayout>
      <div className={cn("mx-auto flex w-full max-w-7xl flex-col gap-6", selected && "pb-28")}>
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-indigo-600 to-indigo-800 p-6 text-white shadow-lg shadow-brand-900/20 sm:p-8"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.14)_1px,transparent_0)] bg-[size:22px_22px]" />
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-brand-100">New interview</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{t("avatars.title")}</h1>
              <p className="mt-2 text-brand-100">
                Pick who interviews you, set the language and style, then start when you're ready.
              </p>
            </div>
            {activeResume !== undefined &&
              (resumeReady ? (
                <span className="inline-flex max-w-full items-center gap-2 self-start rounded-full bg-white/15 px-3.5 py-1.5 text-sm font-medium ring-1 ring-inset ring-white/25 backdrop-blur-sm md:self-auto">
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="truncate">Questions tailored to {activeResume!.original_filename}</span>
                </span>
              ) : (
                <Link
                  to="/resume"
                  className="inline-flex items-center gap-2 self-start rounded-full bg-amber-400/20 px-3.5 py-1.5 text-sm font-medium text-amber-50 ring-1 ring-inset ring-amber-300/40 backdrop-blur-sm transition-colors hover:bg-amber-400/30 md:self-auto"
                >
                  <FileWarning className="h-4 w-4 shrink-0" />
                  {activeResume ? "Resume still processing" : "No resume — questions will be general"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ))}
          </div>
        </motion.div>

        {/* Setup */}
        <Card className="grid grid-cols-1 gap-6 lg:grid-cols-[auto_1fr]">
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
              <Languages className="h-4 w-4 text-brand-600 dark:text-brand-400" />
              {t("avatars.language")}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {LANGUAGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setLanguage(opt.value)}
                  aria-pressed={language === opt.value}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-xl border px-4 py-2.5 transition-all",
                    language === opt.value
                      ? "border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-500/20 dark:border-brand-400 dark:bg-brand-900/30 dark:text-brand-200"
                      : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
                  )}
                >
                  <span className="text-lg font-bold leading-none">{opt.native}</span>
                  <span className="text-xs font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="min-w-0 lg:border-l lg:border-slate-100 lg:pl-6 dark:lg:border-slate-800">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
              <MessagesSquare className="h-4 w-4 text-brand-600 dark:text-brand-400" />
              {t("avatars.personality")}
            </p>
            <div className="flex flex-wrap gap-2">
              {PERSONALITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value || "default"}
                  type="button"
                  onClick={() => setPersonality(opt.value)}
                  aria-pressed={personality === opt.value}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                    personality === opt.value
                      ? "bg-brand-600 text-white shadow-sm shadow-brand-600/30"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {personalityHint && <p className="mt-2.5 text-sm text-slate-500 dark:text-slate-400">{personalityHint}</p>}
          </div>
        </Card>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 dark:bg-slate-800/70">
            {DIFFICULTY_TABS.map((tab) => {
              const count = tab.value ? avatars.filter((a) => a.difficulty === tab.value).length : avatars.length;
              return (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => setDifficulty(tab.value)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    difficulty === tab.value
                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  )}
                >
                  {tab.label}
                  <span className="text-xs text-slate-400">{count}</span>
                </button>
              );
            })}
          </div>
          <label className="relative sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or role"
              aria-label="Search interviewers"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
        </div>

        {error && <Alert tone="error">{error}</Alert>}

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Spinner />
          </div>
        ) : visible.length === 0 ? (
          <Card>
            <EmptyState icon={Users} title={t("avatars.none")} />
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-5">
            {visible.map((avatar, i) => (
              <motion.div
                key={avatar.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(i, 10) * 0.03 }}
              >
                <AvatarCard
                  avatar={avatar}
                  selected={selected?.id === avatar.id}
                  onSelect={(a) => setSelected((cur) => (cur?.id === a.id ? null : a))}
                />
              </motion.div>
            ))}
          </div>
        )}

        <CustomAvatarPanel />
      </div>

      {/* Sticky start bar */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-40 p-3 sm:p-4 lg:left-64"
          >
            <div className="mx-auto flex max-w-4xl items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-2xl shadow-slate-900/20 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 sm:gap-4 sm:p-4">
              <img
                src={selected.image}
                alt=""
                className="h-12 w-12 shrink-0 rounded-xl object-cover object-[center_25%] ring-2 ring-brand-500/30"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{selected.name}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {LANGUAGE_OPTIONS.find((l) => l.value === language)?.label} ·{" "}
                  {PERSONALITY_OPTIONS.find((p) => p.value === personality)?.label} style ·{" "}
                  <span className="capitalize">{selected.difficulty}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Clear selection"
                className="hidden rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 sm:block"
              >
                <X className="h-4 w-4" />
              </button>
              <Button onClick={() => void handleStart()} disabled={starting} className="shrink-0">
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">Start interview</span>
                <span className="sm:hidden">Start</span>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>{starting && selected && <StartingOverlay avatar={selected} />}</AnimatePresence>
    </DashboardLayout>
  );
}
