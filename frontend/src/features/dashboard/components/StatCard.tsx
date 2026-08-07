import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { toneSoftBg } from "@/styles/tone";
import { cn } from "@/utils/cn";

type Tone = "brand" | "green" | "amber" | "slate";

const toneKeyMap: Record<Tone, keyof typeof toneSoftBg> = {
  brand: "brand",
  green: "success",
  amber: "warning",
  slate: "neutral",
};

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: Tone;
}

export function StatCard({ label, value, icon: Icon, tone = "brand" }: StatCardProps) {
  return (
    <Card interactive className="flex items-center gap-4">
      <div
        className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", toneSoftBg[toneKeyMap[tone]])}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm leading-snug text-slate-500 dark:text-slate-400">{label}</p>
        <p className="truncate text-xl font-bold text-slate-900 dark:text-white">{value}</p>
      </div>
    </Card>
  );
}
