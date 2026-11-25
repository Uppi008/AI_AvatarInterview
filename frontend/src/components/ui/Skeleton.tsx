import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/utils/cn";

/**
 * Placeholder block shown while content loads. Mirrors the shape of the real
 * content so the page doesn't jump when data arrives.
 */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-lg bg-slate-200/80 motion-reduce:animate-none dark:bg-slate-800/80", className)}
      {...props}
    />
  );
}

/** Screen-reader-only announcement that accompanies a group of skeletons. */
export function LoadingRegion({ label = "Loading", children, className }: { label?: string; children: ReactNode; className?: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** A list row: avatar circle, two text lines, trailing badge. */
export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-3">
      <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-1/3" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <Skeleton className="h-6 w-20 rounded-full" />
    </div>
  );
}
