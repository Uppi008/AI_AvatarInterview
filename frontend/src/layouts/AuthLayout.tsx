import type { ReactNode } from "react";

import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <header className="flex items-center justify-end gap-2 p-4">
        <LanguageSwitcher />
        <ThemeToggle />
      </header>
      <main>{children}</main>
    </div>
  );
}
