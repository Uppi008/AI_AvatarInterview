import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";

export function WelcomeCard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="relative flex flex-col items-start justify-between gap-4 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-700 p-6 text-white shadow-sm shadow-brand-900/10 sm:flex-row sm:items-center">
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-brand-400/20 blur-3xl" />
      <div className="relative z-10">
        <h1 className="text-xl font-bold">{t("dashboard.welcomeBack", { name: user?.full_name?.split(" ")[0] ?? "" })}</h1>
        <p className="mt-1 text-brand-100">{t("dashboard.welcomeSubtitle")}</p>
      </div>
      <Button variant="secondary" className="relative z-10 shrink-0" onClick={() => navigate("/avatars")}>
        <Sparkles className="h-4 w-4" />
        {t("dashboard.startInterview")}
      </Button>
    </div>
  );
}
