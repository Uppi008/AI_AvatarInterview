import { useEffect, useRef } from "react";

const NUDGE_DELAY_MS = 15000; // Case 3, stage 1: check in after 15s of no answer
const TIMEOUT_DELAY_MS = 15000; // Case 3, stage 2: auto-advance after another 15s (30s total)

interface UseSilenceDetectorArgs {
  /** Resets the timer whenever it changes -- pass the current question's id. */
  questionId: string | null;
  /** True only while the candidate is expected to answer and hasn't started
   * (no question awaiting a response, or actively recording, both pause it). */
  isActive: boolean;
  onCheckSilence: () => void;
  onTimeout: () => void;
}

/** Case 3 (silence detection): a candidate who hasn't started answering
 * gets a spoken check-in at 15s, then an automatic skip at 30s total, so
 * the interview never just freezes waiting on someone who's stuck. */
export function useSilenceDetector({ questionId, isActive, onCheckSilence, onTimeout }: UseSilenceDetectorArgs) {
  const onCheckSilenceRef = useRef(onCheckSilence);
  const onTimeoutRef = useRef(onTimeout);
  onCheckSilenceRef.current = onCheckSilence;
  onTimeoutRef.current = onTimeout;

  useEffect(() => {
    if (!isActive || !questionId) return;

    const nudgeTimer = setTimeout(() => onCheckSilenceRef.current(), NUDGE_DELAY_MS);
    const timeoutTimer = setTimeout(() => onTimeoutRef.current(), NUDGE_DELAY_MS + TIMEOUT_DELAY_MS);

    return () => {
      clearTimeout(nudgeTimer);
      clearTimeout(timeoutTimer);
    };
  }, [questionId, isActive]);
}
