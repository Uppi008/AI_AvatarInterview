/**
 * One shared AudioContext for the interview page, created and resumed only
 * inside a user gesture. Mobile browsers (iOS Safari, Chrome on Android
 * after a reload) start a context created outside a gesture "suspended", and
 * an <audio> element routed into a suspended graph plays in total silence --
 * which is exactly how the interviewer went mute on phones.
 */
let ctx: AudioContext | null = null;

/** Call from a click/tap/keydown handler. Never throws. */
export function unlockAudioContext(): void {
  try {
    if (!ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      ctx = new Ctor();
    }
    if (ctx.state !== "running") void ctx.resume().catch(() => {});
  } catch {
    // Web Audio unavailable -- lip-sync falls back to a synthetic mouth.
  }
}

/** The shared context, but only once it is actually producing sound. */
export function getRunningAudioContext(): AudioContext | null {
  return ctx && ctx.state === "running" ? ctx : null;
}
