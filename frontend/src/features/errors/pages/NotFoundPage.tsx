import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Compass, Home } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { AuthLayout } from "@/layouts/AuthLayout";
import { APP_NAME } from "@/layouts/navigation";

/** Shown for unknown URLs, instead of silently bouncing the user elsewhere. */
export function NotFoundPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = `${t("notFound.title", "Page not found")} · ${APP_NAME}`;
  }, [t]);

  return (
    <AuthLayout>
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <span className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-700 text-white shadow-lg shadow-brand-600/30">
          <Compass className="h-8 w-8" />
        </span>
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">404</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          {t("notFound.title", "Page not found")}
        </h1>
        <p className="mt-3 text-slate-500 dark:text-slate-400">
          {t("notFound.body", "The page you're looking for doesn't exist or has moved.")}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
            {t("notFound.back", "Go back")}
          </Button>
          <Button onClick={() => navigate("/dashboard")}>
            <Home className="h-4 w-4" />
            {t("notFound.home", "Back to dashboard")}
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
}
