import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Flame, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";

interface WelcomeCardProps {
  completedCount: number;
}

export function WelcomeCard({ completedCount }: WelcomeCardProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="relative flex flex-col items-start justify-between gap-5 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-indigo-600 to-indigo-800 p-6 text-white shadow-lg shadow-brand-900/20 sm:flex-row sm:items-center"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.14)_1px,transparent_0)] bg-[size:22px_22px]" />
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/4 h-52 w-52 rounded-full bg-brand-400/20 blur-3xl" />

      <div className="relative z-10">
        {completedCount > 0 && (
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium ring-1 ring-inset ring-white/25 backdrop-blur-sm">
            <Flame className="h-3.5 w-3.5 text-amber-300" />
            {completedCount} {t("dashboard.stats.completed").toLowerCase()}
          </div>
        )}
        <h1 className="text-xl font-bold sm:text-2xl">{t("dashboard.welcomeBack", { name: user?.full_name?.split(" ")[0] ?? "" })}</h1>
        <p className="mt-1.5 text-brand-100">{t("dashboard.welcomeSubtitle")}</p>
      </div>
      <Button variant="secondary" className="relative z-10 shrink-0" onClick={() => navigate("/avatars")}>
        <Sparkles className="h-4 w-4" />
        {t("dashboard.startInterview")}
      </Button>
    </motion.div>
  );
}
