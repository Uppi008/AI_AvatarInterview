import type { HTMLAttributes } from "react";

import { toneDot, toneRingBg } from "@/styles/tone";
import { cn } from "@/utils/cn";

type Tone = "brand" | "green" | "amber" | "red" | "slate";

const toneKeyMap: Record<Tone, keyof typeof toneRingBg> = {
  brand: "brand",
  green: "success",
  amber: "warning",
  red: "error",
  slate: "neutral",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  dot?: boolean;
}

export function Badge({ className, tone = "slate", dot, children, ...props }: BadgeProps) {
  const key = toneKeyMap[tone];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 ring-inset",
        toneRingBg[key],
        className
      )}
      {...props}
    >
      {dot && <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", toneDot[key])} />}
      {children}
    </span>
  );
}
