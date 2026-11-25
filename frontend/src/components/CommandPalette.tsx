import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CornerDownLeft, LogOut, Moon, Search, Sparkles, Sun, type LucideIcon } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { NAV_ITEMS } from "@/layouts/navigation";
import { cn } from "@/utils/cn";

interface Command {
  id: string;
  label: string;
  group: "pages" | "actions";
  icon: LucideIcon;
  run: () => void;
  /** Extra words that should match the search, e.g. synonyms. */
  keywords?: string;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

/** Ctrl/⌘+K quick switcher: jump to any page or run a common action by keyboard. */
export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const reduceMotion = useReducedMotion();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const commands = useMemo<Command[]>(
    () => [
      {
        id: "new-interview",
        label: t("shell.newInterview", "New interview"),
        group: "actions",
        icon: Sparkles,
        keywords: "start practice avatar interviewer",
        run: () => navigate("/avatars"),
      },
      ...NAV_ITEMS.map((item) => ({
        id: item.to,
        label: t(item.labelKey),
        group: "pages" as const,
        icon: item.icon,
        keywords: item.to.replace(/[/-]/g, " "),
        run: () => navigate(item.to),
      })),
      {
        id: "theme",
        label: t("shell.toggleTheme", "Toggle dark mode"),
        group: "actions",
        icon: theme === "dark" ? Sun : Moon,
        keywords: "theme light dark appearance",
        run: toggleTheme,
      },
      {
        id: "logout",
        label: t("nav.logout"),
        group: "actions",
        icon: LogOut,
        keywords: "sign out exit",
        run: logout,
      },
    ],
    [t, navigate, theme, toggleTheme, logout]
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => `${c.label} ${c.keywords ?? ""}`.toLowerCase().includes(q));
  }, [commands, query]);

  // Reset on open; restore focus to whatever opened the palette on close.
  useEffect(() => {
    if (open) {
      returnFocusRef.current = document.activeElement as HTMLElement | null;
      setQuery("");
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      returnFocusRef.current?.focus?.();
    }
  }, [open]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const runCommand = (command: Command | undefined) => {
    if (!command) return;
    onClose();
    command.run();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (results.length ? (i + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      runCommand(results[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      // Don't let the same keypress also close the mobile sidebar behind us.
      e.stopPropagation();
      onClose();
    } else if (e.key === "Tab") {
      // The input is the only focusable element; keep focus inside the dialog.
      e.preventDefault();
    }
  };

  const groups: { key: Command["group"]; label: string }[] = [
    { key: "actions", label: t("shell.actions", "Actions") },
    { key: "pages", label: t("shell.pages", "Pages") },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-950/50 p-4 pt-[12vh] backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t("shell.search", "Search or jump to…")}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/25 dark:border-slate-700 dark:bg-slate-900"
            onKeyDown={onKeyDown}
          >
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 dark:border-slate-800">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("shell.search", "Search or jump to…")}
                role="combobox"
                aria-expanded="true"
                aria-controls="command-palette-list"
                aria-activedescendant={results[active] ? `cmd-${results[active].id}` : undefined}
                aria-autocomplete="list"
                className="h-14 w-full bg-transparent text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white"
              />
              <kbd className="hidden rounded-md border border-slate-200 px-1.5 py-0.5 text-[11px] font-medium text-slate-400 dark:border-slate-700 sm:inline">
                Esc
              </kbd>
            </div>

            <ul ref={listRef} id="command-palette-list" role="listbox" className="max-h-80 overflow-y-auto p-2">
              {results.length === 0 && (
                <li className="px-3 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                  {t("shell.noResults", "No matches")}
                </li>
              )}
              {groups.map(({ key, label }) => {
                const items = results.filter((c) => c.group === key);
                if (items.length === 0) return null;
                return (
                  <li key={key} role="presentation">
                    <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {label}
                    </p>
                    <ul role="group" aria-label={label}>
                      {items.map((command) => {
                        const index = results.indexOf(command);
                        const isActive = index === active;
                        const Icon = command.icon;
                        return (
                          <li
                            key={command.id}
                            id={`cmd-${command.id}`}
                            data-index={index}
                            role="option"
                            aria-selected={isActive}
                            onMouseMove={() => setActive(index)}
                            onClick={() => runCommand(command)}
                            className={cn(
                              "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm",
                              isActive
                                ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
                                : "text-slate-700 dark:text-slate-300"
                            )}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="flex-1 truncate font-medium">{command.label}</span>
                            {isActive && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 opacity-60" />}
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                );
              })}
            </ul>

            <p className="hidden border-t border-slate-100 px-4 py-2.5 text-xs text-slate-400 dark:border-slate-800 sm:block">
              {t("shell.paletteHint", "↑↓ to move · Enter to open · Esc to close")}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
