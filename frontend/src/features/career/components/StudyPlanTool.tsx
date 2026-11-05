import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, CalendarDays, Check, ChevronDown, MessageSquareText, Sparkles, Trash2 } from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PillGroup } from "@/components/ui/PillGroup";
import { Spinner } from "@/components/ui/Spinner";
import { getApiErrorMessage } from "@/services/apiClient";
import { cn } from "@/utils/cn";

import { careerApi } from "../api";
import { formatShortDate } from "../format";
import type { StudyPlan } from "../types";
import { ThinkingState } from "./shared";

const DAY_OPTIONS = ["5", "7", "10", "14"] as const;

export function StudyPlanTool({ onPractice }: { onPractice: (question: string) => void }) {
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [role, setRole] = useState("");
  const [days, setDays] = useState<(typeof DAY_OPTIONS)[number]>("7");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    careerApi
      .listPlans()
      .then(({ data }) => {
        setPlans(data.results);
        setPlan(data.results[0] ?? null);
      })
      .catch(() => {})
      .finally(() => setInitialLoading(false));
  }, []);

  const create = async () => {
    setCreating(true);
    setError(null);
    try {
      const { data } = await careerApi.createPlan({ target_role: role, days: Number(days) });
      setPlans((p) => [data, ...p]);
      setPlan(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't build your plan. Please try again."));
    } finally {
      setCreating(false);
    }
  };

  const toggleTask = async (key: string) => {
    if (!plan) return;
    const previous = plan;
    const completed = plan.completed_tasks.includes(key)
      ? plan.completed_tasks.filter((k) => k !== key)
      : [...plan.completed_tasks, key];
    const optimistic = { ...plan, completed_tasks: completed };
    setPlan(optimistic);
    setPlans((ps) => ps.map((p) => (p.id === plan.id ? optimistic : p)));
    try {
      await careerApi.updatePlanTasks(plan.id, completed);
    } catch {
      setPlan(previous);
      setPlans((ps) => ps.map((p) => (p.id === previous.id ? previous : p)));
    }
  };

  const remove = async (id: string) => {
    await careerApi.deletePlan(id).catch(() => {});
    const rest = plans.filter((p) => p.id !== id);
    setPlans(rest);
    if (plan?.id === id) setPlan(null);
  };

  if (initialLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {!plan && (
        <Card>
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              <CalendarDays className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">Your personal prep plan</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Built from the weak spots in your interview reports and resume, with free resources only.
              </p>
            </div>
          </div>
          {creating ? (
            <ThinkingState steps={["Reading your interview reports", "Finding your weak spots", "Planning each day"]} />
          ) : (
            <div className="flex flex-col gap-4">
              <Input
                label="Target role (optional)"
                placeholder="e.g. Data Analyst"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                maxLength={150}
              />
              <PillGroup
                label="Days"
                options={DAY_OPTIONS.map((d) => ({ value: d, label: `${d} days` }))}
                value={days}
                onChange={setDays}
                className="flex-wrap"
              />
              {error && <Alert tone="error">{error}</Alert>}
              <div className="flex flex-wrap gap-2">
                <Button onClick={create}>
                  <Sparkles className="h-4 w-4" />
                  Build my plan
                </Button>
                {plans.length > 0 && (
                  <Button variant="outline" onClick={() => setPlan(plans[0])}>
                    Back to my plan
                  </Button>
                )}
              </div>
            </div>
          )}
        </Card>
      )}

      {plan && <PlanView key={plan.id} plan={plan} onToggle={toggleTask} onNew={() => setPlan(null)} onPractice={onPractice} />}

      {plans.length > 1 && (
        <Card className="p-4">
          <h3 className="mb-2 px-1 text-sm font-semibold text-slate-900 dark:text-white">Earlier plans</h3>
          <div className="flex flex-col gap-1">
            {plans.map((p) => (
              <div key={p.id} className="group flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60">
                <button type="button" onClick={() => setPlan(p)} className="min-w-0 flex-1 text-left text-sm">
                  <span className="font-medium text-slate-900 dark:text-white">{p.target_role || "General prep"}</span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {" "}
                    · {p.days.length} days · {formatShortDate(p.created_at)} · {progressOf(p)}% done
                  </span>
                </button>
                <button
                  type="button"
                  aria-label="Delete plan"
                  onClick={() => void remove(p.id)}
                  className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function progressOf(plan: StudyPlan) {
  return plan.total_tasks ? Math.round((plan.completed_tasks.length / plan.total_tasks) * 100) : 0;
}

function PlanView({
  plan,
  onToggle,
  onNew,
  onPractice,
}: {
  plan: StudyPlan;
  onToggle: (key: string) => void;
  onNew: () => void;
  onPractice: (question: string) => void;
}) {
  const progress = progressOf(plan);
  // Open the first day that still has unfinished tasks.
  const firstOpen =
    plan.days.find((d) => d.tasks.some((_, i) => !plan.completed_tasks.includes(`${d.day}-${i}`)))?.day ?? null;
  const [openDay, setOpenDay] = useState<number | null>(firstOpen);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-5">
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-300">
              {plan.target_role || "General interview prep"} · {plan.days.length} days
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{plan.summary}</p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Based on {plan.sources.reports} interview report{plan.sources.reports === 1 ? "" : "s"}
              {plan.sources.resume ? " and your resume analysis" : ""}.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={onNew} className="shrink-0 self-start">
            New plan
          </Button>
        </div>
        {plan.focus_areas.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {plan.focus_areas.map((f) => (
              <span key={f} className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
                {f}
              </span>
            ))}
          </div>
        )}
        <div className="mt-5">
          <div className="mb-1.5 flex justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
            <span>Progress</span>
            <span className="tabular-nums">
              {plan.completed_tasks.length}/{plan.total_tasks} tasks · {progress}%
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-emerald-500"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-3">
        {plan.days.map((day) => {
          const keys = day.tasks.map((_, i) => `${day.day}-${i}`);
          const done = keys.filter((k) => plan.completed_tasks.includes(k)).length;
          const complete = done === keys.length && keys.length > 0;
          const open = openDay === day.day;
          return (
            <Card key={day.day} className="p-0">
              <button
                type="button"
                onClick={() => setOpenDay(open ? null : day.day)}
                className="flex w-full items-center gap-3 p-4 text-left"
              >
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold",
                    complete
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  )}
                >
                  {complete ? <Check className="h-5 w-5" /> : day.day}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-slate-900 dark:text-white">{day.title}</span>
                  <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                    {day.focus} · {done}/{keys.length} done
                  </span>
                </span>
                <ChevronDown className={cn("h-5 w-5 shrink-0 text-slate-400 transition", open && "rotate-180")} />
              </button>
              {open && (
                <div className="border-t border-slate-100 px-4 pb-4 pt-3 dark:border-slate-800">
                  <ul className="flex flex-col gap-2">
                    {day.tasks.map((task, i) => {
                      const key = `${day.day}-${i}`;
                      const checked = plan.completed_tasks.includes(key);
                      return (
                        <li key={key}>
                          <label className="flex cursor-pointer items-start gap-3 rounded-lg p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/60">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => onToggle(key)}
                              className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600"
                            />
                            <span className={cn("text-sm text-slate-700 dark:text-slate-300", checked && "text-slate-400 line-through dark:text-slate-500")}>
                              {task}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                  {day.resources.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                      {day.resources.map((r) => (
                        <span key={r} className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {r}
                        </span>
                      ))}
                    </div>
                  )}
                  {day.practice_question && (
                    <div className="mt-3 flex flex-col gap-2 rounded-xl bg-brand-50/70 p-3 sm:flex-row sm:items-center dark:bg-brand-900/20">
                      <MessageSquareText className="hidden h-4 w-4 shrink-0 text-brand-500 sm:block" />
                      <p className="min-w-0 flex-1 text-sm text-slate-700 dark:text-slate-200">{day.practice_question}</p>
                      <Button size="sm" variant="outline" onClick={() => onPractice(day.practice_question)} className="shrink-0">
                        Practice
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </motion.div>
  );
}
