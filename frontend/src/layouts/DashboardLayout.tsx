import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LayoutDashboard, LogOut, Menu, Mic, Settings, User, X } from "lucide-react";

import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { toggleSidebar } from "@/features/ui/uiSlice";
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

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen);
  const dispatch = useAppDispatch();

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => dispatch(toggleSidebar())}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 shrink-0 transform border-r border-slate-200 bg-white transition-transform dark:border-slate-800 dark:bg-slate-900 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <span className="text-lg font-bold text-brand-600">AI_AvatarInterview</span>
          <button className="lg:hidden" onClick={() => dispatch(toggleSidebar())} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {NAV_ITEMS.map(({ to, labelKey, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                )
              }
            >
              <Icon className="h-4 w-4" />
              {t(labelKey)}
            </NavLink>
          ))}
          <button
            onClick={logout}
            className="mt-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            <LogOut className="h-4 w-4" />
            {t("nav.logout")}
          </button>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900 lg:px-6">
          <button className="lg:hidden" onClick={() => dispatch(toggleSidebar())} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <div className="ml-auto flex items-center gap-3">
            <LanguageSwitcher />
            <ThemeToggle />
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
              {user?.full_name?.[0]?.toUpperCase() ?? "?"}
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
