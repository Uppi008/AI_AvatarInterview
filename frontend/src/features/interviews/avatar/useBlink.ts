import { useEffect, useState } from "react";

const MIN_INTERVAL_MS = 2000;
const MAX_INTERVAL_MS = 6000;
const BLINK_DURATION_MS = 150;

/** Autonomous randomized blink, independent of speech/state -- runs for as
 * long as the avatar is mounted so it never looks like a frozen photo. */
export function useBlink(): boolean {
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
    let scheduleId: ReturnType<typeof setTimeout>;
    let closeId: ReturnType<typeof setTimeout>;

    const scheduleNextBlink = () => {
      const delay = MIN_INTERVAL_MS + Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS);
      scheduleId = setTimeout(() => {
        setIsBlinking(true);
        closeId = setTimeout(() => {
          setIsBlinking(false);
          scheduleNextBlink();
        }, BLINK_DURATION_MS);
      }, delay);
    };

    scheduleNextBlink();
    return () => {
      clearTimeout(scheduleId);
      clearTimeout(closeId);
    };
  }, []);

  return isBlinking;
}
