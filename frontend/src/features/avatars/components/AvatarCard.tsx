import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/utils/cn";

import type { Avatar } from "../types";

const DIFFICULTY_STYLES: Record<Avatar["difficulty"], string> = {
  easy: "bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  medium: "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  hard: "bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

interface AvatarCardProps {
  avatar: Avatar;
  onSelect: (avatar: Avatar) => void;
  isStarting: boolean;
}

export function AvatarCard({ avatar, onSelect, isStarting }: AvatarCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="flex flex-col overflow-hidden p-0">
      <img src={avatar.image} alt={avatar.name} className="h-40 w-full object-cover" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-slate-900 dark:text-white">{avatar.name}</h3>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize",
              DIFFICULTY_STYLES[avatar.difficulty]
            )}
          >
            {avatar.difficulty}
          </span>
        </div>
        <p className="text-xs font-medium uppercase tracking-wide text-brand-600 dark:text-brand-400">
          {avatar.category.replace(/_/g, " ")}
        </p>
        <p className="line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{avatar.interview_style}</p>
        <Button size="sm" className="mt-auto" isLoading={isStarting} onClick={() => onSelect(avatar)}>
          {t("avatars.selectAndStart")}
        </Button>
      </div>
    </Card>
  );
}
