import { useEffect, useRef, useState } from "react";

/**
 * Drives lip-sync from the actual TTS audio, not a canned loop: samples live
 * playback amplitude via Web Audio's AnalyserNode and returns it as 0-1,
 * ~60x/sec while `isPlaying`. Works with any voice/language edge-tts
 * produces since it reacts to the real waveform rather than pre-computed
 * phoneme/viseme timing (which edge-tts doesn't expose).
 */
export function useLipSync(audioElement: HTMLAudioElement | null, isPlaying: boolean): number {
  const [amplitude, setAmplitude] = useState(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const wiredElementRef = useRef<HTMLAudioElement | null>(null);
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  // Wires a fresh MediaElementAudioSourceNode exactly once per <audio>
  // element (a new one is created per play() call upstream) -- an element
  // can only ever be captured by one source node, and re-running this for
  // the same element (e.g. React StrictMode's double-invoke) would throw.
  useEffect(() => {
    if (!audioElement || wiredElementRef.current === audioElement) return;
    wiredElementRef.current = audioElement;

    try {
      const AudioContextCtor =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtxRef.current ??= new AudioContextCtor();
      const ctx = audioCtxRef.current;

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
      void ctx.resume();
    } catch {
      // Web Audio unavailable or blocked -- lip-sync just stays flat (0),
      // audio playback itself is unaffected since this only taps the graph.
      analyserRef.current = null;
    }
  }, [audioElement]);

  useEffect(() => {
    if (!isPlaying || !analyserRef.current || !dataRef.current) {
      setAmplitude(0);
      return;
    }
    const analyser = analyserRef.current;
    const data = dataRef.current;
    let rafId: number;

    const tick = () => {
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
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying]);

  return amplitude;
}
