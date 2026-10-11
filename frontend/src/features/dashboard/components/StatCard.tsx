import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";

import { Card } from "@/components/ui/Card";
import { toneGradientBg } from "@/styles/tone";
import { cn } from "@/utils/cn";

type Tone = "brand" | "green" | "amber" | "slate";

const toneKeyMap: Record<Tone, keyof typeof toneGradientBg> = {
  brand: "brand",
  green: "success",
  amber: "warning",
  slate: "neutral",
};

function AnimatedNumber({ value }: { value: number }) {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (v) => Math.round(v).toString());

  useEffect(() => {
    const controls = animate(motionValue, value, { duration: 0.8, ease: "easeOut" });
    return controls.stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <motion.span>{rounded}</motion.span>;
}

/** Animates a leading integer (e.g. "9" or "72/100") and renders any suffix statically. */
function StatValue({ value }: { value: string }) {
  const match = value.match(/^(\d+)(.*)$/);
  if (!match) return <>{value}</>;
  const [, numStr, suffix] = match;
  return (
    <>
      <AnimatedNumber value={Number(numStr)} />
      {suffix}
    </>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: Tone;
  /** Small secondary line under the value, e.g. "Last: 72/100". */
  hint?: string;
  /** Makes the whole card a link. */
  to?: string;
}

export function StatCard({ label, value, icon: Icon, tone = "brand", hint, to }: StatCardProps) {
  const card = (
    <Card interactive className="group flex h-full flex-col gap-3 p-4 sm:gap-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11",
            toneGradientBg[toneKeyMap[tone]]
          )}
        >
          <Icon className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
        </div>
        {to && (
          <ArrowUpRight className="h-4 w-4 text-slate-300 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-600 dark:text-slate-600 dark:group-hover:text-brand-400" />
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-slate-500 sm:text-sm dark:text-slate-400">{label}</p>
        <p className="mt-1 truncate text-xl font-bold sm:text-2xl tracking-tight text-slate-900 dark:text-white">
          <StatValue value={value} />
        </p>
        {hint && <p className="mt-1 truncate text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
      </div>
    </Card>
  );

  return to ? (
    <Link to={to} className="block h-full rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600">
      {card}
    </Link>
  ) : (
    card
  );
}
