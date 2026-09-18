import { useEffect } from "react";
import type { LucideIcon } from "lucide-react";
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
}

export function StatCard({ label, value, icon: Icon, tone = "brand" }: StatCardProps) {
  return (
    <Card interactive className="flex items-center gap-4">
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
          toneGradientBg[toneKeyMap[tone]]
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm leading-snug text-slate-500 dark:text-slate-400">{label}</p>
        <p className="truncate text-xl font-bold text-slate-900 dark:text-white">
          <StatValue value={value} />
        </p>
      </div>
    </Card>
  );
}
