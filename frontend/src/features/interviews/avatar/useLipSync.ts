import { useEffect, useRef, useState } from "react";

import { getRunningAudioContext } from "./audioContext";

/**
 * Drives lip-sync from the actual TTS audio, not a canned loop: samples live
 * playback amplitude via Web Audio's AnalyserNode and returns it as 0-1,
 * ~60x/sec while `isPlaying`. Works with any voice/language edge-tts
 * produces since it reacts to the real waveform rather than pre-computed
 * phoneme/viseme timing (which edge-tts doesn't expose).
 *
 * The element is only routed into Web Audio once the shared context is
 * running (i.e. after a user gesture). Routing it into a suspended context
 * would silence it -- so until then the mouth moves on a synthetic rhythm
 * and the audio plays straight from the element.
 */
export function useLipSync(audioElement: HTMLAudioElement | null, isPlaying: boolean): number {
  const [amplitude, setAmplitude] = useState(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const wiredElementRef = useRef<HTMLAudioElement | null>(null);
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  // Wires a MediaElementAudioSourceNode exactly once per <audio> element --
  // an element can only ever be captured by one source node, and re-running
  // this for the same element (e.g. React StrictMode's double-invoke) would
  // throw. Retried on each new clip until the context is running.
  useEffect(() => {
    if (!audioElement || wiredElementRef.current === audioElement) return;
    const ctx = getRunningAudioContext();
    if (!ctx) return;
    wiredElementRef.current = audioElement;

    try {
      const source = ctx.createMediaElementSource(audioElement);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      // Route through the analyser but still out to speakers -- creating a
      // MediaElementAudioSourceNode reroutes the element's output into the
      // Web Audio graph, so skipping this connect() would silence playback.
      source.connect(analyser);
      analyser.connect(ctx.destination);

      analyserRef.current = analyser;
      dataRef.current = new Uint8Array(analyser.frequencyBinCount);
    } catch {
      // Web Audio unavailable or blocked -- falls back to the synthetic
      // mouth; audio playback itself is unaffected.
      analyserRef.current = null;
    }
  }, [audioElement, isPlaying]);

  useEffect(() => {
    if (!isPlaying) {
      setAmplitude(0);
      return;
    }
    const analyser = analyserRef.current;
    const data = dataRef.current;
    let rafId: number;

    const tick = (now: number) => {
      if (analyser && data) {
        analyser.getByteTimeDomainData(data);
        let sumSquares = 0;
        for (let i = 0; i < data.length; i++) {
          const normalized = (data[i] - 128) / 128;
          sumSquares += normalized * normalized;
        }
        const rms = Math.sqrt(sumSquares / data.length);
        // Speech RMS on this waveform typically sits well under 1; scale up
        // so ordinary talking volume reaches a visually convincing mouth-open
        // range instead of only ever nudging the low end.
        setAmplitude(Math.min(1, rms * 4));
      } else {
        // No analyser yet: a syllable-like rhythm so the avatar still talks.
        const v = Math.abs(Math.sin(now / 110)) * (0.55 + 0.45 * Math.sin(now / 370));
        setAmplitude(Math.max(0, v));
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, audioElement]);

  return amplitude;
}
