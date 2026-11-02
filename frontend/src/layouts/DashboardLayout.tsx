import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Bot, LayoutDashboard, LogOut, Menu, Mic, Settings, User, X } from "lucide-react";

import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { toggleSidebar } from "@/features/ui/uiSlice";
import { AmbientBackground } from "@/components/fx/AmbientBackground";
import { Avatar } from "@/components/ui/Avatar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/utils/cn";

const NAV_ITEMS = [
  { to: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { to: "/interviews", labelKey: "nav.interviews", icon: Mic },
  { to: "/resume", labelKey: "nav.resume", icon: User },
  { to: "/settings", labelKey: "nav.settings", icon: Settings },
] as const;

interface DashboardLayoutProps {
  children: ReactNode;
  /** Skip the ambient animated background, e.g. during a live interview. */
  calm?: boolean;
}

export function DashboardLayout({ children, calm = false }: DashboardLayoutProps) {
  const reduceMotion = useReducedMotion();
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen);
  const dispatch = useAppDispatch();

  return (
    // `isolate` makes this a stacking context, so the -z-10 ambient layer
    // paints above this div's own background but below all content.
    <div className="relative isolate flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {!calm && <AmbientBackground />}
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-[1px] lg:hidden"
          onClick={() => dispatch(toggleSidebar())}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 transform flex-col border-r border-white/60 bg-white/75 shadow-[8px_0_32px_-16px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-transform dark:border-white/[0.06] dark:bg-slate-900/75 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-indigo-700 text-white shadow-sm shadow-brand-600/30">
              <Bot className="h-4.5 w-4.5" />
            </span>
            <span className="text-[15px] font-bold leading-none tracking-tight text-slate-900 dark:text-white">
              AI_AvatarInterview
            </span>
          </Link>
          <button
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 lg:hidden"
            onClick={() => dispatch(toggleSidebar())}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 px-3 pt-2">
          {NAV_ITEMS.map(({ to, labelKey, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand-600 transition-opacity dark:bg-brand-400",
                      isActive ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <Icon className="h-4 w-4" />
                  {t(labelKey)}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-3 dark:border-slate-800">
          <Link
            to="/settings"
            className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Avatar name={user?.full_name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                {user?.full_name ?? "—"}
              </p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
            </div>
          </Link>
          <button
            onClick={logout}
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            <LogOut className="h-4 w-4" />
            {t("nav.logout")}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/60 bg-white/60 px-4 backdrop-blur-xl dark:border-white/[0.06] dark:bg-slate-950/60 lg:px-6">
          <button
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 lg:hidden"
            onClick={() => dispatch(toggleSidebar())}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="ml-auto flex items-center gap-3">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 p-4 [perspective:1600px] lg:p-8">
          {/* Each page mounts its own layout, so this plays on every navigation. */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 16, rotateX: 4 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="origin-top"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
