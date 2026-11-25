import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Bot, LogOut, Menu, Plus, Search, X } from "lucide-react";

import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { setSidebarOpen, toggleSidebar } from "@/features/ui/uiSlice";
import { CommandPalette } from "@/components/CommandPalette";
import { NotificationBell } from "@/components/NotificationBell";
import { AmbientBackground } from "@/components/fx/AmbientBackground";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/utils/cn";

import { ADMIN_NAV_ITEMS, APP_NAME, NAV_ITEMS, pageTitleFor } from "./navigation";

interface DashboardLayoutProps {
  children: ReactNode;
  /** Skip the ambient animated background, e.g. during a live interview. */
  calm?: boolean;
}

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

export function DashboardLayout({ children, calm = false }: DashboardLayoutProps) {
  const reduceMotion = useReducedMotion();
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen);
  const dispatch = useAppDispatch();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const isAdmin = user?.role === "admin";
  const navItems = isAdmin ? ADMIN_NAV_ITEMS : NAV_ITEMS;
  const sidebarRef = useRef<HTMLElement>(null);
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia("(min-width: 1024px)").matches);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // A closed mobile drawer is only translated off-screen; make it inert so
  // Tab and screen readers skip its links. (React 18 has no `inert` prop.)
  useEffect(() => {
    sidebarRef.current?.toggleAttribute("inert", !isDesktop && !sidebarOpen);
  }, [isDesktop, sidebarOpen]);

  const titleEntry = pageTitleFor(pathname);
  const pageTitle = titleEntry ? t(titleEntry.key, titleEntry.fallback) : "";

  // Browser tab title follows the current page.
  useEffect(() => {
    document.title = pageTitle ? `${pageTitle} · ${APP_NAME}` : APP_NAME;
  }, [pageTitle]);

  // The mobile drawer must close once the user has picked a destination;
  // otherwise it stays open over the new page.
  useEffect(() => {
    dispatch(setSidebarOpen(false));
  }, [pathname, dispatch]);

  // While the mobile drawer is open: Escape closes it and the page behind it doesn't scroll.
  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dispatch(setSidebarOpen(false));
    };
    const previousOverflow = document.body.style.overflow;
    if (!isDesktop) document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [sidebarOpen, isDesktop, dispatch]);

  // Ctrl/⌘+K opens the quick switcher from anywhere in the app.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    // `isolate` makes this a stacking context, so the -z-10 ambient layer
    // paints above this div's own background but below all content.
    <div className="relative isolate flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg"
      >
        {t("shell.skipToContent", "Skip to content")}
      </a>
      {!calm && <AmbientBackground />}

      {/* Mobile overlay */}
      <div
        aria-hidden
        className={cn(
          "fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-[1px] transition-opacity duration-200 lg:hidden",
          sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => dispatch(setSidebarOpen(false))}
      />

      <aside
        ref={sidebarRef}
        id="app-sidebar"
        aria-label={t("shell.mainNavigation", "Main navigation")}
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 transform flex-col border-r border-white/60 bg-white/90 shadow-[8px_0_32px_-16px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-transform duration-300 ease-out dark:border-white/[0.06] dark:bg-slate-900/90 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:bg-white/75 lg:dark:bg-slate-900/75",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Link to="/dashboard" className="flex items-center gap-2.5 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-indigo-700 text-white shadow-sm shadow-brand-600/30">
              <Bot className="h-4.5 w-4.5" />
            </span>
            <span className="text-[15px] font-bold leading-none tracking-tight text-slate-900 dark:text-white">{APP_NAME}</span>
          </Link>
          <button
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 lg:hidden"
            onClick={() => dispatch(setSidebarOpen(false))}
            aria-label={t("shell.closeMenu", "Close menu")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Primary action: always one click away. */}
        {!isAdmin && (
          <div className="px-3 pb-3 pt-1">
            <Button className="w-full" onClick={() => navigate("/avatars")}>
              <Plus className="h-4 w-4" />
              {t("shell.newInterview", "New interview")}
            </Button>
          </div>
        )}

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pt-1">
          {navItems.map(({ to, labelKey, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600",
                  isActive
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
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
                  <Icon className={cn("h-4 w-4 transition-transform", !isActive && "group-hover:scale-110")} />
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
              <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{user?.full_name ?? "—"}</p>
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
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/60 bg-white/60 px-4 backdrop-blur-xl dark:border-white/[0.06] dark:bg-slate-950/60 lg:px-6">
          <button
            className="-ml-1 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 lg:hidden"
            onClick={() => dispatch(toggleSidebar())}
            aria-label={t("shell.openMenu", "Open menu")}
            aria-controls="app-sidebar"
            aria-expanded={sidebarOpen}
          >
            <Menu className="h-5 w-5" />
          </button>

          {pageTitle && (
            <p className="min-w-0 truncate text-sm font-semibold text-slate-900 dark:text-white sm:text-base">{pageTitle}</p>
          )}

          <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label={t("shell.search", "Search or jump to…")}
              aria-keyshortcuts={isMac ? "Meta+K" : "Control+K"}
              className="inline-flex h-9 items-center gap-2 rounded-lg text-sm text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 max-md:w-9 max-md:justify-center md:w-56 md:border md:border-slate-200 md:bg-white/70 md:px-3 md:dark:border-slate-700 md:dark:bg-slate-900/70"
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="hidden flex-1 truncate text-left md:inline">{t("shell.search", "Search or jump to…")}</span>
              <kbd className="hidden rounded border border-slate-200 bg-slate-50 px-1.5 text-[11px] font-medium text-slate-400 dark:border-slate-700 dark:bg-slate-800 md:inline">
                {isMac ? "⌘K" : "Ctrl K"}
              </kbd>
            </button>
            <NotificationBell />
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </header>

        <main id="main-content" tabIndex={-1} className="flex-1 p-4 [perspective:1600px] focus:outline-none lg:p-8">
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

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
