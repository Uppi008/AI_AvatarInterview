import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

import type { Avatar } from "../types";

const DIFFICULTY_TONE: Record<Avatar["difficulty"], "green" | "amber" | "red"> = {
  easy: "green",
  medium: "amber",
  hard: "red",
};

interface AvatarCardProps {
  avatar: Avatar;
  onSelect: (avatar: Avatar) => void;
  isStarting: boolean;
}

export function AvatarCard({ avatar, onSelect, isStarting }: AvatarCardProps) {
  const { t } = useTranslation();

  return (
    <Card interactive className="group flex flex-col overflow-hidden p-0">
      <div className="relative h-40 w-full overflow-hidden">
        <img
          src={avatar.image}
          alt={avatar.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        <Badge tone={DIFFICULTY_TONE[avatar.difficulty]} className="absolute right-3 top-3 shadow-sm">
          {avatar.difficulty}
        </Badge>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-semibold text-slate-900 dark:text-white">{avatar.name}</h3>
        <p className="-mt-1 text-xs font-medium uppercase tracking-wide text-brand-600 dark:text-brand-400">
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
