import type { ButtonHTMLAttributes, HTMLAttributes } from "react";

import { cn } from "@/utils/cn";

type Size = "sm" | "md" | "lg";

const sizeClasses: Record<Size, string> = {
  sm: "h-9 w-9 text-sm",
  md: "h-11 w-11 text-base",
  lg: "h-16 w-16 text-xl",
};

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  name?: string | null;
  size?: Size;
}

function Initial({ name }: { name?: string | null }) {
  return <>{name?.trim()?.[0]?.toUpperCase() ?? "?"}</>;
}

export function Avatar({ className, src, name, size = "md", ...props }: AvatarProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 font-semibold text-brand-700 ring-1 ring-inset ring-brand-600/10 dark:bg-brand-900/50 dark:text-brand-300 dark:ring-brand-400/10",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {src ? <img src={src} alt={name ?? ""} className="h-full w-full object-cover" /> : <Initial name={name} />}
    </div>
  );
}

interface AvatarButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "name"> {
  src?: string | null;
  name?: string | null;
  size?: Size;
}

export function AvatarButton({ className, src, name, size = "lg", ...props }: AvatarButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "group relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 font-semibold text-brand-700 ring-1 ring-inset ring-brand-600/10 transition dark:bg-brand-900/50 dark:text-brand-300 dark:ring-brand-400/10",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {src ? <img src={src} alt={name ?? ""} className="h-full w-full object-cover" /> : <Initial name={name} />}
      <span className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
    </button>
  );
}
