import { useCallback, useEffect, useRef, useState } from "react";

// The Web Speech API isn't in TypeScript's DOM lib yet; this is the slice we use.
interface RecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface RecognitionEvent {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: RecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
}
type RecognitionCtor = new () => Recognition;

const SPEECH_LANG: Record<string, string> = { en: "en-IN", hi: "hi-IN", te: "te-IN" };

function getRecognitionCtor(): RecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Speak-to-type using the browser's built-in speech recognition (free, no
 * API key; Chrome/Edge/Android/Safari). Final phrases are appended through
 * `onText`; `interim` shows what's being heard right now.
 */
export function useDictation(onText: (text: string) => void, language = "en") {
  const [supported] = useState(() => typeof window !== "undefined" && getRecognitionCtor() !== null);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<Recognition | null>(null);
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    setError(null);
    const recognition = new Ctor();
    recognition.lang = SPEECH_LANG[language] ?? "en-IN";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (e) => {
      let live = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) onTextRef.current(result[0].transcript.trim());
        else live += result[0].transcript;
      }
      setInterim(live);
    };
    recognition.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setError("Microphone access was blocked. Allow it in your browser to dictate.");
      } else if (e.error !== "no-speech" && e.error !== "aborted") {
        setError("Voice typing stopped. Tap the mic to try again.");
      }
    };
    recognition.onend = () => {
      setListening(false);
      setInterim("");
    };
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [language]);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  return { supported, listening, interim, error, start, stop };
}
