import { LayoutDashboard, Mic, Settings, Sparkles, User, type LucideIcon } from "lucide-react";
import { matchPath } from "react-router-dom";

export interface NavItem {
  to: string;
  labelKey: string;
  icon: LucideIcon;
}

/** Primary app sections, shared by the sidebar and the command palette. */
export const NAV_ITEMS: readonly NavItem[] = [
  { to: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { to: "/interviews", labelKey: "nav.interviews", icon: Mic },
  { to: "/resume", labelKey: "nav.resume", icon: User },
  { to: "/career-lab", labelKey: "nav.careerLab", icon: Sparkles },
  { to: "/settings", labelKey: "nav.settings", icon: Settings },
];

/**
 * i18n key (and English fallback) for the page at `pathname`, used for the
 * top-bar heading and the browser tab title. Most specific patterns first.
 */
const PAGE_TITLES: { pattern: string; key: string; fallback: string }[] = [
  { pattern: "/interviews/:id/report", key: "shell.titles.report", fallback: "Interview report" },
  { pattern: "/interviews/:id/live", key: "shell.titles.live", fallback: "Live interview" },
  { pattern: "/interviews/:id", key: "shell.titles.interview", fallback: "Interview details" },
  { pattern: "/avatars", key: "avatars.title", fallback: "Choose your interviewer" },
  ...NAV_ITEMS.map((item) => ({ pattern: item.to, key: item.labelKey, fallback: "" })),
];

export function pageTitleFor(pathname: string): { key: string; fallback: string } | null {
  return PAGE_TITLES.find((entry) => matchPath(entry.pattern, pathname)) ?? null;
}

export const APP_NAME = "AI_AvatarInterview";
