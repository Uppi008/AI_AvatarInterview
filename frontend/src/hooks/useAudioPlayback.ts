import { useCallback, useRef, useState } from "react";

import { unlockAudioContext } from "@/features/interviews/avatar/audioContext";

// A zero-length WAV: played once inside the first tap so mobile browsers
// treat our <audio> element as user-approved for every later clip.
const SILENT_WAV = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

const SPEECH_LANG: Record<string, string> = { en: "en-IN", hi: "hi-IN", te: "te-IN" };

/** A spoken remark: server TTS audio when available, otherwise its text,
 * read by the browser's own voice (when the server's TTS provider fails,
 * the interviewer would otherwise go completely silent). */
export interface SpokenClip {
  audioBase64?: string | null;
  text?: string | null;
  language?: string;
}

function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function useAudioPlayback() {
  const [isPlaying, setIsPlaying] = useState(false);
  // True when the browser refused to autoplay a clip (mobile autoplay
  // policy). The clip stays queued until the user taps -- see unlock().
  const [needsUnlock, setNeedsUnlock] = useState(false);
  // Mirrors audioRef as state (not just a ref) so consumers like useLipSync
  // can depend on "the audio element" in an effect.
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  // True while the browser's speech synthesis (not the element) is talking.
  const [usingBrowserVoice, setUsingBrowserVoice] = useState(false);
  // One element reused for every clip: iOS/Android approve playback per
  // element, so a fresh new Audio() per turn would be blocked again each time.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // A live interview turn can produce several spoken messages in quick
  // succession (e.g. evaluation feedback immediately followed by the next
  // question) -- queued and played back-to-back rather than the later one
  // cutting the earlier one off mid-sentence. The head of the queue is the
  // clip currently playing (or waiting for an unlock).
  const queueRef = useRef<SpokenClip[]>([]);
  const playingRef = useRef(false);
  const primedRef = useRef(false);

  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.setAttribute("playsinline", "");
      audioRef.current = audio;
      setAudioElement(audio);
    }
    return audioRef.current;
  }, []);

  const playNext = useCallback(() => {
    const next = queueRef.current[0];
    if (!next) {
      playingRef.current = false;
      setIsPlaying(false);
      setUsingBrowserVoice(false);
      return;
    }
    playingRef.current = true;
    const advance = () => {
      queueRef.current.shift();
      playNext();
    };
    const blocked = () => {
      // Autoplay blocked: don't drop the clip, wait for a tap.
      playingRef.current = false;
      setIsPlaying(false);
      setNeedsUnlock(true);
    };

    if (!next.audioBase64) {
      setUsingBrowserVoice(true);
      setIsPlaying(true);
      const utterance = new SpeechSynthesisUtterance(next.text ?? "");
      utterance.lang = SPEECH_LANG[next.language ?? "en"] ?? "en-IN";
      utterance.onend = () => {
        if (playingRef.current) advance();
      };
      utterance.onerror = (e) => {
        if (e.error === "not-allowed") blocked();
        else if (playingRef.current) advance();
      };
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      setNeedsUnlock(false);
      return;
    }

    setUsingBrowserVoice(false);
    const audio = getAudio();
    audio.onended = advance;
    audio.onerror = advance;
    audio.src = `data:audio/mpeg;base64,${next.audioBase64}`;
    setIsPlaying(true);
    void audio
      .play()
      .then(() => setNeedsUnlock(false))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "NotAllowedError") {
          blocked();
          return;
        }
        if (playingRef.current) advance();
      });
  }, [getAudio]);

  const enqueue = useCallback(
    (clip: SpokenClip) => {
      if (!clip.audioBase64 && !(clip.text && speechSupported())) return;
      queueRef.current.push(clip);
      if (!playingRef.current) {
        playNext();
      }
    },
    [playNext]
  );

  /** Must be called from a user gesture (tap/click/keydown). Unlocks audio on
   * mobile and plays anything that was held back by the autoplay policy. */
  const unlock = useCallback(() => {
    unlockAudioContext();
    if (playingRef.current) return;
    if (queueRef.current.length > 0) {
      playNext();
      return;
    }
    if (!primedRef.current) {
      primedRef.current = true;
      const audio = getAudio();
      audio.onended = null;
      audio.onerror = null;
      audio.src = SILENT_WAV;
      void audio.play().catch(() => {});
      // iOS also only lets speech synthesis talk after it spoke in a tap.
      if (speechSupported()) window.speechSynthesis.speak(new SpeechSynthesisUtterance(""));
    }
  }, [getAudio, playNext]);

  const stop = useCallback(() => {
    queueRef.current = [];
    playingRef.current = false;
    audioRef.current?.pause();
    if (speechSupported()) window.speechSynthesis.cancel();
    setIsPlaying(false);
  }, []);

  return {
    isPlaying,
    needsUnlock,
    enqueue,
    unlock,
    stop,
    // The browser voice doesn't go through the element, so lip-sync must
    // not read the (silent) element while it talks.
    audioElement: usingBrowserVoice ? null : audioElement,
  };
}
