import { Check, Gauge } from "lucide-react";

import { cn } from "@/utils/cn";

import type { Avatar } from "../types";

const DIFFICULTY_STYLE: Record<Avatar["difficulty"], string> = {
  easy: "bg-emerald-500/90 text-white",
  medium: "bg-amber-500/90 text-white",
  hard: "bg-rose-500/90 text-white",
};

interface AvatarCardProps {
  avatar: Avatar;
  selected: boolean;
  onSelect: (avatar: Avatar) => void;
}

export function AvatarCard({ avatar, selected, onSelect }: AvatarCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(avatar)}
      aria-pressed={selected}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 dark:bg-slate-900",
        selected
          ? "border-brand-500 ring-4 ring-brand-500/20 dark:border-brand-400"
          : "border-slate-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg dark:border-slate-800 dark:hover:border-slate-700"
      )}
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
        <img
          src={avatar.image}
          alt={avatar.name}
          loading="lazy"
          className="h-full w-full object-cover object-[center_25%] transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/10 to-transparent" />

        <span
          className={cn(
            "absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize shadow-sm backdrop-blur-sm",
            DIFFICULTY_STYLE[avatar.difficulty]
          )}
        >
          <Gauge className="h-3 w-3" />
          {avatar.difficulty}
        </span>

        <span
          className={cn(
            "absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all",
            selected
              ? "scale-100 border-white bg-brand-600 text-white"
              : "scale-90 border-white/70 bg-black/20 text-transparent opacity-0 group-hover:opacity-100"
          )}
        >
          <Check className="h-4 w-4" />
        </span>

        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          <h3 className="text-lg font-semibold leading-tight">{avatar.name}</h3>
          <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-white/75">
            {avatar.category.replace(/_/g, " ")}
          </p>
        </div>
      </div>
      {/* Wrapped in a block: -webkit-line-clamp is unreliable on a flex child of <button>. */}
      <div className="w-full px-4 py-3">
        <p className="line-clamp-2 h-10 text-sm leading-5 text-slate-600 dark:text-slate-400">{avatar.interview_style}</p>
      </div>
    </button>
  );
}
