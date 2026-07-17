import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";

export function WelcomeCard() {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <div className="flex flex-col items-start justify-between gap-4 rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-700 p-6 text-white sm:flex-row sm:items-center">
      <div>
        <h1 className="text-xl font-bold">{t("dashboard.welcomeBack", { name: user?.full_name?.split(" ")[0] ?? "" })}</h1>
        <p className="mt-1 text-brand-100">{t("dashboard.welcomeSubtitle")}</p>
      </div>
      <Button
        variant="secondary"
        className="shrink-0"
        disabled
        title="Avatar selection ships in Phase 6"
      >
        <Sparkles className="h-4 w-4" />
        {t("dashboard.startInterview")}
      </Button>
    </div>
  );
}
