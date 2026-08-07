import { useCallback, useRef, useState } from "react";

export function useAudioPlayback() {
  const [isPlaying, setIsPlaying] = useState(false);
  // Mirrors audioRef as state (not just a ref) so consumers like useLipSync
  // can depend on "the current audio element" in an effect -- a new Audio()
  // is created per turn, and only a state change reliably re-triggers
  // downstream effects when that happens.
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // A live interview turn can produce several spoken messages in quick
  // succession (e.g. evaluation feedback immediately followed by the next
  // question) -- queued and played back-to-back rather than the later one
  // cutting the earlier one off mid-sentence.
  const queueRef = useRef<string[]>([]);
  const playingRef = useRef(false);

  const playNext = useCallback(() => {
    const next = queueRef.current.shift();
    if (!next) {
      playingRef.current = false;
      setIsPlaying(false);
      return;
    }
    playingRef.current = true;
    const audio = new Audio(`data:audio/mpeg;base64,${next}`);
    audioRef.current = audio;
    setAudioElement(audio);
    audio.onended = () => playNext();
    audio.onerror = () => playNext();
    setIsPlaying(true);
    void audio.play().catch(() => playNext());
  }, []);

  const enqueue = useCallback(
    (base64Mp3: string) => {
      queueRef.current.push(base64Mp3);
      if (!playingRef.current) {
        playNext();
      }
    },
    [playNext]
  );

  const stop = useCallback(() => {
    queueRef.current = [];
    playingRef.current = false;
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  return { isPlaying, enqueue, stop, audioElement };
}
