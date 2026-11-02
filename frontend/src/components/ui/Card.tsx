import type { HTMLAttributes } from "react";

import { cn } from "@/utils/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export function Card({ className, interactive, ...props }: CardProps) {
  return (
    <div
      className={cn(
        // Frosted glass over the ambient background, with a top highlight and
        // a soft layered drop shadow for depth.
        "rounded-2xl border border-white/70 bg-white/80 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-14px_rgba(15,23,42,0.18)] backdrop-blur-xl",
        "dark:border-white/[0.07] dark:bg-slate-900/70 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_12px_32px_-14px_rgba(0,0,0,0.7)]",
        interactive &&
          "transition-all duration-300 hover:-translate-y-1 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_24px_48px_-18px_rgba(79,70,229,0.35)] dark:hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_24px_48px_-18px_rgba(79,70,229,0.45)]",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4 flex items-center justify-between gap-3", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-base font-semibold text-slate-900 dark:text-slate-100", className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-0.5 text-sm text-slate-500 dark:text-slate-400", className)} {...props} />;
}
