import type { HTMLAttributes } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

import { toneSoftBorderBg } from "@/styles/tone";
import { cn } from "@/utils/cn";

type Tone = "error" | "success" | "warning" | "info";

const toneKeyMap: Record<Tone, keyof typeof toneSoftBorderBg> = {
  error: "error",
  success: "success",
  warning: "warning",
  info: "brand",
};

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  tone?: Tone;
}

const icons: Record<Tone, typeof AlertTriangle> = {
  error: XCircle,
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
};

export function Alert({ className, tone = "error", children, ...props }: AlertProps) {
  const Icon = icons[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium",
        toneSoftBorderBg[toneKeyMap[tone]],
        className
      )}
      {...props}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
