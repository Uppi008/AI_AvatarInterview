/**
 * Fixed, non-interactive backdrop: drifting aurora colour fields plus a
 * receding perspective grid. Sits behind all app content (-z-10).
 */
export function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="aurora-blob -left-40 -top-40 h-[34rem] w-[34rem] bg-brand-400/25 dark:bg-brand-600/20" />
      <div
        className="aurora-blob -right-48 top-1/4 h-[30rem] w-[30rem] bg-fuchsia-300/20 dark:bg-fuchsia-700/15"
        style={{ animationDelay: "-8s" }}
      />
      <div
        className="aurora-blob -bottom-56 left-1/3 h-[32rem] w-[32rem] bg-sky-300/20 dark:bg-sky-700/15"
        style={{ animationDelay: "-16s" }}
      />
      <div className="grid-floor absolute -left-1/4 bottom-[-30%] h-[70%] w-[150%] opacity-60 dark:opacity-40" />
    </div>
  );
}
