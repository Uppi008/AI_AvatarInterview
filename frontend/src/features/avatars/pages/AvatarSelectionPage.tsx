import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { Spinner } from "@/components/ui/Spinner";
import { interviewsApi } from "@/features/interviews/api";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { getApiErrorMessage } from "@/services/apiClient";
import { cn } from "@/utils/cn";

import { avatarsApi } from "../api";
import { AvatarCard } from "../components/AvatarCard";
import { CustomAvatarPanel } from "../components/CustomAvatarPanel";
import type { Avatar, Difficulty } from "../types";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
const LANGUAGES: { code: "en" | "hi" | "te"; label: string }[] = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "te", label: "Telugu" },
];

export function AvatarSelectionPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [loading, setLoading] = useState(true);
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | null>(null);
  const [language, setLanguage] = useState<"en" | "hi" | "te">("en");
  const [startingId, setStartingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    void avatarsApi
      .list(difficultyFilter ? { difficulty: difficultyFilter } : undefined)
      .then(({ data }) => setAvatars(data.results))
      .finally(() => setLoading(false));
  }, [difficultyFilter]);

  const handleSelect = async (avatar: Avatar) => {
    setError(null);
    setStartingId(avatar.id);
    try {
      const { data: session } = await interviewsApi.start({ avatar_id: avatar.id, language });
      navigate(`/interviews/${session.id}`);
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't start the interview. Please try again."));
      setStartingId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t("avatars.title")}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("avatars.subtitle")}</p>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 dark:text-slate-400">{t("avatars.language")}:</span>
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLanguage(l.code)}
                className={cn(
                  "rounded-full px-3 py-1 text-sm font-medium transition-colors",
                  language === l.code
                    ? "bg-brand-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                )}
              >
                {l.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 dark:text-slate-400">{t("avatars.difficulty")}:</span>
            <button
              type="button"
              onClick={() => setDifficultyFilter(null)}
              className={cn(
                "rounded-full px-3 py-1 text-sm font-medium transition-colors",
                !difficultyFilter
                  ? "bg-brand-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              )}
            >
              {t("avatars.all")}
            </button>
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDifficultyFilter(d)}
                className={cn(
                  "rounded-full px-3 py-1 text-sm font-medium capitalize transition-colors",
                  difficultyFilter === d
                    ? "bg-brand-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Spinner />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {avatars.map((avatar) => (
              <AvatarCard
                key={avatar.id}
                avatar={avatar}
                onSelect={handleSelect}
                isStarting={startingId === avatar.id}
              />
            ))}
          </div>
        )}

        <CustomAvatarPanel />
      </div>
    </DashboardLayout>
  );
}
