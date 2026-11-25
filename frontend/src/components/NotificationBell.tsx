import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Award, Bell, CalendarClock, CheckCheck, FileText, Info, type LucideIcon } from "lucide-react";

import { notificationsApi, type AppNotification, type NotificationKind } from "@/features/engagement/api";
import { cn } from "@/utils/cn";

const KIND_ICON: Record<NotificationKind, LucideIcon> = {
  report_ready: FileText,
  reminder: Bell,
  scheduled: CalendarClock,
  badge: Award,
  general: Info,
};

const POLL_MS = 60_000;

function timeAgo(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** Bell with unread badge; opens a list of the latest notifications. */
export function NotificationBell() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    notificationsApi
      .list()
      .then(({ data }) => {
        setItems(data.results);
        setUnread(data.unread_count);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const openItem = (n: AppNotification) => {
    if (!n.read_at) {
      setItems((list) => list.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
      setUnread((c) => Math.max(0, c - 1));
      void notificationsApi.markRead(n.id).catch(() => {});
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const markAll = () => {
    setItems((list) => list.map((x) => ({ ...x, read_at: x.read_at ?? new Date().toISOString() })));
    setUnread(0);
    void notificationsApi.markAllRead().catch(() => {});
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread ? t("notifications.labelUnread", "Notifications, {{count}} unread", { count: unread }) : t("notifications.label", "Notifications")}
        aria-expanded={open}
        aria-haspopup="true"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white dark:ring-slate-950">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{t("notifications.title", "Notifications")}</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAll}
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                {t("notifications.markAll", "Mark all read")}
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              {t("notifications.empty", "You're all caught up.")}
            </p>
          ) : (
            <ul className="max-h-96 overflow-y-auto py-1">
              {items.map((n) => {
                const Icon = KIND_ICON[n.kind] ?? Info;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => openItem(n)}
                      className={cn(
                        "flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60",
                        !n.read_at && "bg-brand-50/50 dark:bg-brand-900/20"
                      )}
                    >
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className={cn("text-sm text-slate-900 dark:text-white", !n.read_at && "font-semibold")}>{n.title}</span>
                          {!n.read_at && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-600" aria-label="unread" />}
                        </span>
                        {n.body && <span className="mt-0.5 line-clamp-2 block text-xs text-slate-500 dark:text-slate-400">{n.body}</span>}
                        <span className="mt-1 block text-[11px] text-slate-400">{timeAgo(n.created_at)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
