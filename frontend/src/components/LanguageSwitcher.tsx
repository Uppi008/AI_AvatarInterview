import { useTranslation } from "react-i18next";

import { cn } from "@/utils/cn";

const LANGUAGES: { code: "en" | "hi" | "te"; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "hi", label: "हिं" },
  { code: "te", label: "తె" },
];

export function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n } = useTranslation();

  return (
    <div className={cn("inline-flex items-center gap-1 rounded-lg border border-slate-200 p-1 dark:border-slate-800", className)}>
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          type="button"
          onClick={() => void i18n.changeLanguage(lang.code)}
          className={cn(
            "rounded-md px-2.5 py-1 text-sm font-medium transition-colors",
            i18n.resolvedLanguage === lang.code
              ? "bg-brand-600 text-white"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          )}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}
