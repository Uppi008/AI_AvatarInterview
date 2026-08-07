import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { PillGroup } from "@/components/ui/PillGroup";
import { Spinner } from "@/components/ui/Spinner";
import { interviewsApi } from "@/features/interviews/api";
import type { InterviewPersonality } from "@/features/interviews/types";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { getApiErrorMessage } from "@/services/apiClient";

import { avatarsApi } from "../api";
import { AvatarCard } from "../components/AvatarCard";
import { CustomAvatarPanel } from "../components/CustomAvatarPanel";
import type { Avatar, Difficulty } from "../types";

const DIFFICULTY_VALUES: Difficulty[] = ["easy", "medium", "hard"];
const LANGUAGE_OPTIONS: { value: "en" | "hi" | "te"; label: string }[] = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "te", label: "Telugu" },
];
// Independent of avatar choice -- overrides that avatar's own default
// interview_style/speaking_style/difficulty (apps.interviews.models.
// PERSONALITY_PROFILES). "" means "use the avatar's own defaults".
// Labels are hand-cased (not derived from the slug) so acronyms like
// "HR"/"CEO" render correctly instead of "Hr"/"Ceo".
const PERSONALITY_OPTIONS_LIST: { value: Exclude<InterviewPersonality, "">; label: string }[] = [
  { value: "friendly", label: "Friendly" },
  { value: "professional", label: "Professional" },
  { value: "strict_hr", label: "Strict HR" },
  { value: "technical", label: "Technical" },
  { value: "manager", label: "Manager" },
  { value: "ceo", label: "CEO" },
  { value: "mentor", label: "Mentor" },
  { value: "recruiter", label: "Recruiter" },
];

export function AvatarSelectionPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const difficultyOptions = [
    { value: "" as const, label: t("avatars.all") },
    ...DIFFICULTY_VALUES.map((d) => ({ value: d, label: d })),
  ];
  const personalityOptions = [
    { value: "" as const, label: t("avatars.personalityDefault") },
    ...PERSONALITY_OPTIONS_LIST,
  ];
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [loading, setLoading] = useState(true);
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | "">("");
  const [language, setLanguage] = useState<"en" | "hi" | "te">("en");
  const [personality, setPersonality] = useState<InterviewPersonality>("");
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
      const { data: session } = await interviewsApi.start({ avatar_id: avatar.id, language, personality });
      navigate(`/interviews/${session.id}/live`);
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
          <PillGroup label={t("avatars.language")} options={LANGUAGE_OPTIONS} value={language} onChange={setLanguage} />
          <PillGroup
            label={t("avatars.difficulty")}
            options={difficultyOptions}
            value={difficultyFilter}
            onChange={setDifficultyFilter}
          />
          <PillGroup
            label={t("avatars.personality")}
            options={personalityOptions}
            value={personality}
            onChange={setPersonality}
          />
        </div>

        {error && <Alert>{error}</Alert>}

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Spinner />
          </div>
        ) : avatars.length === 0 ? (
          <EmptyState icon={Users} title={t("avatars.none")} />
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
