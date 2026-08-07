/**
 * Canonical status-color tokens for the five semantic tones used across the
 * app (brand/success/warning/error/neutral). Each UI component keeps its
 * own public `tone` prop vocabulary (Alert's "success"/"info", Badge's
 * "green"/"brand") to avoid a breaking rename across call sites -- this
 * module is the single place the actual Tailwind color classes live, so a
 * palette tweak happens in one file instead of five near-identical copies.
 */
export type ToneKey = "brand" | "success" | "warning" | "error" | "neutral";

/** Soft background + text, no border -- icon chips (StatCard, InterviewEndScreen). */
export const toneSoftBg: Record<ToneKey, string> = {
  brand: "bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300",
  success: "bg-green-50 text-green-600 dark:bg-green-900/40 dark:text-green-300",
  warning: "bg-amber-50 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300",
  error: "bg-red-50 text-red-600 dark:bg-red-900/40 dark:text-red-300",
  neutral: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

/** Soft background + border + text -- banners (Alert, ViolationBanner). */
export const toneSoftBorderBg: Record<ToneKey, string> = {
  brand: "border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-900/50 dark:bg-brand-950/40 dark:text-brand-300",
  success:
    "border-green-200 bg-green-50 text-green-700 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-300",
  warning:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
  error: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300",
  neutral:
    "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
};

/** Soft background + text + inset ring -- pill badges (Badge). */
export const toneRingBg: Record<ToneKey, string> = {
  brand:
    "bg-brand-50 text-brand-700 ring-brand-600/10 dark:bg-brand-900/40 dark:text-brand-300 dark:ring-brand-400/20",
  success:
    "bg-green-50 text-green-700 ring-green-600/10 dark:bg-green-900/40 dark:text-green-300 dark:ring-green-400/20",
  warning:
    "bg-amber-50 text-amber-700 ring-amber-600/10 dark:bg-amber-900/40 dark:text-amber-300 dark:ring-amber-400/20",
  error: "bg-red-50 text-red-700 ring-red-600/10 dark:bg-red-900/40 dark:text-red-300 dark:ring-red-400/20",
  neutral:
    "bg-slate-100 text-slate-600 ring-slate-500/10 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-400/10",
};

/** Solid dot/indicator color -- Badge's `dot` prop. */
export const toneDot: Record<ToneKey, string> = {
  brand: "bg-brand-600 dark:bg-brand-400",
  success: "bg-green-600 dark:bg-green-400",
  warning: "bg-amber-600 dark:bg-amber-400",
  error: "bg-red-600 dark:bg-red-400",
  neutral: "bg-slate-500 dark:bg-slate-400",
};

/** Text-only color, no background -- standalone icons/labels. */
export const toneText: Record<ToneKey, string> = {
  brand: "text-brand-600 dark:text-brand-400",
  success: "text-green-600 dark:text-green-400",
  warning: "text-amber-600 dark:text-amber-400",
  error: "text-red-600 dark:text-red-400",
  neutral: "text-slate-600 dark:text-slate-400",
};
