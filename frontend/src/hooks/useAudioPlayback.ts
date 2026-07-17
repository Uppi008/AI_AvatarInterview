import { useCallback, useRef, useState } from "react";

export function useAudioPlayback() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = useCallback((base64Mp3: string) => {
    audioRef.current?.pause();
    const audio = new Audio(`data:audio/mpeg;base64,${base64Mp3}`);
    audioRef.current = audio;
    audio.onended = () => setIsPlaying(false);
    audio.onerror = () => setIsPlaying(false);
    setIsPlaying(true);
    void audio.play().catch(() => setIsPlaying(false));
  }, []);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  return { isPlaying, play, stop };
}
