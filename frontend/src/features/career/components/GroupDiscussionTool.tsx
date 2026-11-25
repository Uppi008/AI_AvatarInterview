import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Flag, Loader2, MessagesSquare, Send, Sparkles, Users } from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { getApiErrorMessage } from "@/services/apiClient";
import { cn } from "@/utils/cn";

import { careerApi } from "../api";
import { formatShortDate } from "../format";
import type { GroupDiscussion } from "../types";
import { BulletList, DictateButton, HistoryItem, ScoreBar, ScoreRing, ThinkingState } from "./shared";

const SUGGESTED_TOPICS = [
  "Should AI replace human interviewers?",
  "Work from home vs office",
  "Is social media doing more harm than good?",
  "Electric vehicles in India: ready or not?",
  "Should coding be compulsory in schools?",
];

// Avatar colours for the three AI participants (by position, never by name).
const PARTICIPANT_STYLES = [
  "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200",
  "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
  "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200",
];

/** Group discussion practice with three AI participants, then panel-style scoring. */
export function GroupDiscussionTool() {
  const [history, setHistory] = useState<GroupDiscussion[]>([]);
  const [gd, setGd] = useState<GroupDiscussion | null>(null);
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    careerApi
      .listDiscussions()
      .then(({ data }) => setHistory(data.results))
      .catch(() => {});
  }, []);

  const replace = (d: GroupDiscussion) => {
    setGd(d);
    setHistory((h) => [d, ...h.filter((x) => x.id !== d.id)]);
  };

  const start = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await careerApi.createDiscussion({ topic: topic.trim() });
      replace(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't start the discussion. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    await careerApi.deleteDiscussion(id).catch(() => {});
    setHistory((h) => h.filter((d) => d.id !== id));
    if (gd?.id === id) setGd(null);
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="flex min-w-0 flex-col gap-5">
        {!gd && (
          <Card>
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                <Users className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-semibold text-slate-900 dark:text-white">Group discussion</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Debate a topic with three AI participants, then get scored like a GD panel would score you.
                </p>
              </div>
            </div>
            {loading ? (
              <ThinkingState steps={["Picking the topic", "Bringing in the participants", "Opening the discussion"]} />
            ) : (
              <div className="flex flex-col gap-4">
                <Input
                  id="gd-topic"
                  label="Topic (leave empty for a surprise)"
                  placeholder="e.g. Should AI replace human interviewers?"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void start()}
                  maxLength={300}
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
                <ul className="space-y-1 text-sm text-slate-500 dark:text-slate-400">
                  <li>• Make clear points, give examples, and respond to what others say.</li>
                  <li>• Up to 10 turns. Finish whenever you like to get your feedback.</li>
                </ul>
                {error && <Alert tone="error">{error}</Alert>}
                <Button onClick={() => void start()} className="self-start">
                  <Sparkles className="h-4 w-4" />
                  Start discussion
                </Button>
              </div>
            )}
          </Card>
        )}

        {gd && !gd.finished_at && <DiscussionRoom key={gd.id} gd={gd} onUpdate={replace} onExit={() => setGd(null)} />}
        {gd?.finished_at && <DiscussionResults gd={gd} onNew={() => setGd(null)} />}
      </div>

      <Card className="h-fit p-4">
        <h3 className="mb-2 px-1 text-sm font-semibold text-slate-900 dark:text-white">Your discussions</h3>
        {history.length === 0 ? (
          <p className="px-1 text-sm text-slate-500 dark:text-slate-400">Finished discussions and scores appear here.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {history.map((d) => (
              <HistoryItem
                key={d.id}
                title={d.topic}
                subtitle={d.finished_at ? formatShortDate(d.created_at) : "In progress"}
                score={d.overall_score !== null ? Number(d.overall_score) : undefined}
                active={gd?.id === d.id}
                onSelect={() => setGd(d)}
                onDelete={() => void remove(d.id)}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function DiscussionRoom({ gd, onUpdate, onExit }: { gd: GroupDiscussion; onUpdate: (d: GroupDiscussion) => void; onExit: () => void }) {
  const { i18n } = useTranslation();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const turnsLeft = gd.max_user_turns - gd.user_turns;
  const styleFor = (speaker: string) => {
    const i = gd.participants.findIndex((p) => p.name === speaker);
    return PARTICIPANT_STYLES[i >= 0 ? i % PARTICIPANT_STYLES.length : 0];
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [gd.transcript.length, sending]);

  const send = async () => {
    const text = message.trim();
    if (text.length < 2 || sending) return;
    setSending(true);
    setError(null);
    try {
      const { data } = await careerApi.respondDiscussion(gd.id, text);
      setMessage("");
      onUpdate(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't send. Please try again."));
    } finally {
      setSending(false);
    }
  };

  const finish = async () => {
    setFinishing(true);
    setError(null);
    try {
      const { data } = await careerApi.finishDiscussion(gd.id);
      onUpdate(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't score the discussion. Please try again."));
      setFinishing(false);
    }
  };

  if (finishing) {
    return (
      <Card>
        <ThinkingState steps={["Reading the discussion", "Scoring your contribution", "Writing your feedback"]} />
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-300">Topic</p>
          <p className="font-semibold text-slate-900 dark:text-white">{gd.topic}</p>
        </div>
        <Button size="sm" variant="ghost" onClick={onExit}>
          Exit
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {gd.participants.map((p) => (
          <span key={p.name} className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", styleFor(p.name))}>
            <span className="font-semibold">{p.name}</span>
            <span className="opacity-75">· {p.stance}</span>
          </span>
        ))}
      </div>

      <div className="flex max-h-[28rem] min-h-48 flex-col gap-3 overflow-y-auto rounded-xl bg-slate-50 p-3 dark:bg-slate-800/40" aria-live="polite">
        {gd.transcript.map((line, i) =>
          line.is_user ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-brand-600 px-3.5 py-2 text-sm text-white">
                <p className="mb-0.5 text-[11px] font-semibold text-brand-100">You</p>
                {line.text}
              </div>
            </div>
          ) : (
            <div key={i} className="flex items-start gap-2">
              <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold", styleFor(line.speaker))}>
                {line.speaker.slice(0, 1)}
              </span>
              <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-white px-3.5 py-2 text-sm text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200">
                <p className="mb-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">{line.speaker}</p>
                {line.text}
              </div>
            </div>
          )
        )}
        {sending && (
          <p className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Others are responding…
          </p>
        )}
        <div ref={endRef} />
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {turnsLeft > 0 ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {turnsLeft} turn{turnsLeft === 1 ? "" : "s"} left
            </span>
            <DictateButton language={i18n.language} onText={(text) => setMessage((m) => (m ? `${m} ${text}` : text))} />
          </div>
          <div className="flex gap-2">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={2}
              maxLength={1500}
              aria-label="Your point"
              placeholder="Make your point… (Enter to send, Shift+Enter for a new line)"
              className="min-w-0 flex-1 resize-none rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
            <Button onClick={() => void send()} disabled={message.trim().length < 2 || sending} aria-label="Send" className="self-end">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">You've used all your turns. Finish to see your feedback.</p>
      )}

      <Button variant="outline" onClick={() => void finish()} disabled={gd.user_turns === 0 || sending} className="self-start">
        <Flag className="h-4 w-4" />
        Finish & get feedback
      </Button>
    </Card>
  );
}

function DiscussionResults({ gd, onNew }: { gd: GroupDiscussion; onNew: () => void }) {
  const scores = [
    { label: "Content", value: Number(gd.content_score ?? 0) },
    { label: "Communication", value: Number(gd.communication_score ?? 0) },
    { label: "Leadership", value: Number(gd.leadership_score ?? 0) },
    { label: "Listening", value: Number(gd.listening_score ?? 0) },
  ];
  return (
    <div className="flex flex-col gap-5">
      <Card className="flex flex-col items-center gap-5 sm:flex-row">
        <ScoreRing score={Number(gd.overall_score ?? 0)} size={104} label="Overall" />
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-300">{gd.topic}</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{gd.summary}</p>
        </div>
        <Button size="sm" variant="outline" onClick={onNew}>
          <MessagesSquare className="h-3.5 w-3.5" /> New discussion
        </Button>
      </Card>
      <Card className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {scores.map((s) => (
          <ScoreBar key={s.label} label={s.label} score={s.value} />
        ))}
      </Card>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-semibold text-slate-900 dark:text-white">What went well</h3>
          <BulletList items={gd.strengths} tone="green" />
        </Card>
        <Card>
          <h3 className="mb-3 font-semibold text-slate-900 dark:text-white">To improve</h3>
          <BulletList items={gd.improvements} tone="amber" />
        </Card>
      </div>
    </div>
  );
}
