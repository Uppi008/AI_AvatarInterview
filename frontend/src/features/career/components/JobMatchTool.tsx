import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, CheckCircle2, Copy, FileSearch, Lightbulb, Mail, MessageSquareText, RefreshCw, Sparkles, XCircle } from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { getApiErrorMessage } from "@/services/apiClient";

import { careerApi } from "../api";
import { formatShortDate } from "../format";
import type { JobMatch } from "../types";
import { BulletList, HistoryItem, ScoreRing, TextArea, ThinkingState } from "./shared";

const MIN_JD = 80;

export function JobMatchTool({ onPractice }: { onPractice: (question: string) => void }) {
  const [history, setHistory] = useState<JobMatch[]>([]);
  const [selected, setSelected] = useState<JobMatch | null>(null);
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [jd, setJd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    careerApi
      .listJobMatches()
      .then(({ data }) => setHistory(data.results))
      .catch(() => {});
  }, []);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await careerApi.createJobMatch({ job_description: jd.trim(), job_title: jobTitle, company });
      setHistory((h) => [data, ...h]);
      setSelected(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't analyze this job. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    await careerApi.deleteJobMatch(id).catch(() => {});
    setHistory((h) => h.filter((m) => m.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="flex min-w-0 flex-col gap-5">
        {!selected && (
          <Card>
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                <FileSearch className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-semibold text-slate-900 dark:text-white">Match your resume to a job</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Paste any job post. AI compares it with your latest resume.
                </p>
              </div>
            </div>
            {loading ? (
              <ThinkingState steps={["Reading the job post", "Comparing with your resume", "Predicting their questions"]} />
            ) : (
              <div className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Job title" placeholder="e.g. Python Developer" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} maxLength={150} />
                  <Input label="Company (optional)" placeholder="e.g. Infosys" value={company} onChange={(e) => setCompany(e.target.value)} maxLength={150} />
                </div>
                <TextArea
                  id="jd"
                  label="Job description"
                  placeholder="Paste the full job description: responsibilities, required skills, experience..."
                  value={jd}
                  onChange={(e) => setJd(e.target.value)}
                  maxLength={8000}
                  className="min-h-48"
                  hint={
                    <span className="text-xs tabular-nums text-slate-400">
                      {jd.trim().length < MIN_JD ? `${MIN_JD - jd.trim().length} more characters` : `${jd.length}/8000`}
                    </span>
                  }
                />
                {error && <Alert tone="error">{error}</Alert>}
                <Button onClick={submit} disabled={jd.trim().length < MIN_JD} className="self-start">
                  <Sparkles className="h-4 w-4" />
                  Analyze match
                </Button>
              </div>
            )}
          </Card>
        )}

        {selected && (
          <JobMatchResult
            match={selected}
            onBack={() => setSelected(null)}
            onPractice={onPractice}
            onUpdate={(m) => {
              setSelected(m);
              setHistory((h) => h.map((x) => (x.id === m.id ? m : x)));
            }}
          />
        )}
      </div>

      <Card className="h-fit p-4">
        <h3 className="mb-2 px-1 text-sm font-semibold text-slate-900 dark:text-white">Past matches</h3>
        {history.length === 0 ? (
          <p className="px-1 text-sm text-slate-500 dark:text-slate-400">Your analyzed jobs will appear here.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {history.map((m) => (
              <HistoryItem
                key={m.id}
                title={m.job_title || "Untitled job"}
                subtitle={[m.company, formatShortDate(m.created_at)].filter(Boolean).join(" · ")}
                score={Number(m.match_score)}
                active={selected?.id === m.id}
                onSelect={() => setSelected(m)}
                onDelete={() => void remove(m.id)}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function JobMatchResult({
  match,
  onBack,
  onPractice,
  onUpdate,
}: {
  match: JobMatch;
  onBack: () => void;
  onPractice: (question: string) => void;
  onUpdate: (match: JobMatch) => void;
}) {
  const score = Number(match.match_score);
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-5">
      <Card className="flex flex-col items-center gap-5 sm:flex-row">
        <ScoreRing score={score} size={104} label="Match score" />
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-300">
            {[match.job_title, match.company].filter(Boolean).join(" · ") || "Job match"}
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{match.verdict}</p>
          {!match.resume && (
            <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
              No parsed resume found, so this is judged from the job alone. Upload your resume for a real match.
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={onBack}>
          New match
        </Button>
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
            <CheckCircle2 className="h-4 w-4 text-green-500" /> Skills you have
          </h3>
          <Chips items={match.matched_skills} tone="green" />
        </Card>
        <Card>
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
            <XCircle className="h-4 w-4 text-red-500" /> Skills to add
          </h3>
          <Chips items={match.missing_skills} tone="red" />
        </Card>
        <Card>
          <h3 className="mb-3 font-semibold text-slate-900 dark:text-white">Why you stand out</h3>
          <BulletList items={match.strengths} tone="green" />
        </Card>
        <Card>
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
            <Lightbulb className="h-4 w-4 text-amber-500" /> Tailor your resume
          </h3>
          <BulletList items={match.resume_tips} tone="amber" />
        </Card>
      </div>

      <Card>
        <h3 className="mb-1 flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
          <MessageSquareText className="h-4 w-4 text-brand-500" /> Questions they'll likely ask you
        </h3>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">Practice each one with the AI Answer Coach.</p>
        <div className="flex flex-col gap-3">
          {match.likely_questions.map((q, i) => (
            <div
              key={i}
              className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center dark:border-slate-800"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900 dark:text-white">{q.question}</p>
                {q.why_asked && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{q.why_asked}</p>}
              </div>
              <Button size="sm" variant="outline" onClick={() => onPractice(q.question)} className="shrink-0">
                Practice
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <CoverLetterCard match={match} onUpdate={onUpdate} />
    </motion.div>
  );
}

function CoverLetterCard({ match, onUpdate }: { match: JobMatch; onUpdate: (match: JobMatch) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const write = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await careerApi.writeCoverLetter(match.id);
      onUpdate(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't write the cover letter. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`Subject: ${match.cover_letter_subject}

${match.cover_letter}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked -- nothing to do.
    }
  };

  return (
    <Card className="border-brand-200 dark:border-brand-800">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
          <Mail className="h-4 w-4 text-brand-500" /> Cover letter
        </h3>
        {match.cover_letter && !loading && (
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => void copy()}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => void write()}>
              <RefreshCw className="h-4 w-4" /> Rewrite
            </Button>
          </div>
        )}
      </div>
      {loading ? (
        <ThinkingState steps={["Reading your resume", "Matching it to the job", "Writing your letter"]} />
      ) : match.cover_letter ? (
        <>
          <p className="mb-3 text-sm">
            <span className="font-medium text-slate-500 dark:text-slate-400">Subject: </span>
            <span className="font-semibold text-slate-900 dark:text-white">{match.cover_letter_subject}</span>
          </p>
          <p className="whitespace-pre-line rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
            {match.cover_letter}
          </p>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Read it through and adjust anything before sending.</p>
        </>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <p className="min-w-0 flex-1 text-sm text-slate-500 dark:text-slate-400">
            Get a cover letter for this job, written from the real experience in your resume.
          </p>
          <Button size="sm" onClick={() => void write()} className="shrink-0">
            <Sparkles className="h-4 w-4" /> Write cover letter
          </Button>
        </div>
      )}
      {error && (
        <Alert tone="error" className="mt-3">
          {error}
        </Alert>
      )}
    </Card>
  );
}

function Chips({ items, tone }: { items: string[]; tone: "green" | "red" }) {
  if (!items.length) return <p className="text-sm text-slate-400">None</p>;
  const cls =
    tone === "green"
      ? "bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/30 dark:text-green-300"
      : "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/30 dark:text-red-300";
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((s) => (
        <span key={s} className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${cls}`}>
          {s}
        </span>
      ))}
    </div>
  );
}
