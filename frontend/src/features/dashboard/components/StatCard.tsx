import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { cn } from "@/utils/cn";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: "brand" | "green" | "amber" | "slate";
}

const toneClasses: Record<NonNullable<StatCardProps["tone"]>, string> = {
  brand: "bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300",
  green: "bg-green-50 text-green-600 dark:bg-green-900/40 dark:text-green-300",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300",
  slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

export function StatCard({ label, value, icon: Icon, tone = "brand" }: StatCardProps) {
  return (
    <Card className="flex items-center gap-4">
      <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", toneClasses[tone])}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm leading-snug text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-xl font-bold text-slate-900 dark:text-white">{value}</p>
      </div>
    </Card>
  );
}
