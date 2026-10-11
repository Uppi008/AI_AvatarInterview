/** Shared colouring for 0-100 interview scores: green >= 75, amber >= 50, red below. */
export function scoreBadgeClasses(score: number) {
  if (score >= 75) return "bg-green-50 text-green-700 ring-green-600/15 dark:bg-green-900/30 dark:text-green-300";
  if (score >= 50) return "bg-amber-50 text-amber-700 ring-amber-600/15 dark:bg-amber-900/30 dark:text-amber-300";
  return "bg-red-50 text-red-700 ring-red-600/15 dark:bg-red-900/30 dark:text-red-300";
}

export function scoreBarClass(score: number) {
  if (score >= 75) return "bg-green-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-red-500";
}

export function formatDuration(seconds: number) {
  if (!seconds) return null;
  const minutes = Math.round(seconds / 60);
  return minutes < 1 ? "<1 min" : `${minutes} min`;
}

export const LANGUAGE_LABEL: Record<"en" | "hi" | "te", string> = {
  en: "English",
  hi: "हिन्दी",
  te: "తెలుగు",
};
