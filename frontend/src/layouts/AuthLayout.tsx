import type { ReactNode } from "react";

import { AmbientBackground } from "@/components/fx/AmbientBackground";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate min-h-screen bg-slate-50 dark:bg-slate-950">
      <AmbientBackground />
      <header className="relative z-20 flex items-center justify-end gap-2 p-4">
        <LanguageSwitcher />
        <ThemeToggle />
      </header>
      <main>{children}</main>
    </div>
  );
}
