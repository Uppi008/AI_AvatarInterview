import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAudioPlayback } from "./useAudioPlayback";

class FakeAudio {
  static instances: FakeAudio[] = [];
  static blockAutoplay = false;
  src = "";
  played: string[] = [];
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor() {
    FakeAudio.instances.push(this);
  }

  setAttribute() {}

  play() {
    if (FakeAudio.blockAutoplay) {
      return Promise.reject(new DOMException("blocked", "NotAllowedError"));
    }
    this.played.push(this.src);
    return Promise.resolve();
  }

  pause() {}

  // test helper, not part of the real Audio API
  simulateEnded() {
    this.onended?.();
  }
}

const clip = (name: string) => `data:audio/mpeg;base64,${name}`;
const audio = () => FakeAudio.instances[0];

describe("useAudioPlayback", () => {
  beforeEach(() => {
    FakeAudio.instances = [];
    FakeAudio.blockAutoplay = false;
    vi.stubGlobal("Audio", FakeAudio);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("plays the first enqueued clip immediately", async () => {
    const { result } = renderHook(() => useAudioPlayback());

    await act(async () => result.current.enqueue({ audioBase64: "clip-1" }));

    expect(audio().played).toEqual([clip("clip-1")]);
    expect(result.current.isPlaying).toBe(true);
  });

  it("queues a second clip instead of interrupting the first -- plays it only once the first ends", async () => {
    const { result } = renderHook(() => useAudioPlayback());

    await act(async () => result.current.enqueue({ audioBase64: "clip-1" }));
    await act(async () => result.current.enqueue({ audioBase64: "clip-2" }));

    expect(audio().played).toEqual([clip("clip-1")]);

    await act(async () => audio().simulateEnded());

    expect(audio().played).toEqual([clip("clip-1"), clip("clip-2")]);
    expect(result.current.isPlaying).toBe(true);
  });

  it("reuses one audio element for every clip (mobile approves playback per element)", async () => {
    const { result } = renderHook(() => useAudioPlayback());

    await act(async () => result.current.enqueue({ audioBase64: "clip-1" }));
    await act(async () => audio().simulateEnded());
    await act(async () => result.current.enqueue({ audioBase64: "clip-2" }));

    expect(FakeAudio.instances).toHaveLength(1);
  });

  it("sets isPlaying to false once the queue drains", async () => {
    const { result } = renderHook(() => useAudioPlayback());

    await act(async () => result.current.enqueue({ audioBase64: "clip-1" }));
    await act(async () => audio().simulateEnded());

    expect(result.current.isPlaying).toBe(false);
  });

  it("stop() clears the queue so nothing further plays", async () => {
    const { result } = renderHook(() => useAudioPlayback());

    await act(async () => result.current.enqueue({ audioBase64: "clip-1" }));
    await act(async () => result.current.enqueue({ audioBase64: "clip-2" }));
    act(() => result.current.stop());

    expect(result.current.isPlaying).toBe(false);

    await act(async () => audio().simulateEnded());
    expect(audio().played).toEqual([clip("clip-1")]); // clip-2 never started
  });

  it("keeps a clip the browser refused to autoplay and plays it on unlock()", async () => {
    // Regression: on phones the question audio was silently dropped because
    // it arrives over the socket, not from a tap.
    FakeAudio.blockAutoplay = true;
    const { result } = renderHook(() => useAudioPlayback());

    await act(async () => result.current.enqueue({ audioBase64: "clip-1" }));

    expect(result.current.needsUnlock).toBe(true);
    expect(result.current.isPlaying).toBe(false);

    FakeAudio.blockAutoplay = false;
    await act(async () => result.current.unlock());

    expect(audio().played).toEqual([clip("clip-1")]);
    expect(result.current.needsUnlock).toBe(false);
    expect(result.current.isPlaying).toBe(true);
  });

  it("reads the text with the browser's voice when the server sent no audio", async () => {
    // Regression: when the server's TTS provider failed, the interviewer was
    // completely silent.
    const spoken: { text: string; lang: string; onend: (() => void) | null }[] = [];
    vi.stubGlobal(
      "SpeechSynthesisUtterance",
      class {
        lang = "";
        onend: (() => void) | null = null;
        onerror = null;
        constructor(public text: string) {
          spoken.push(this);
        }
      }
    );
    vi.stubGlobal("speechSynthesis", { speak: vi.fn(), cancel: vi.fn() });
    const { result } = renderHook(() => useAudioPlayback());

    await act(async () => result.current.enqueue({ audioBase64: null, text: "Tell me about yourself", language: "te" }));

    expect(spoken).toMatchObject([{ text: "Tell me about yourself", lang: "te-IN" }]);
    expect(result.current.isPlaying).toBe(true);
    expect(result.current.audioElement).toBeNull();

    await act(async () => spoken[0].onend?.());
    expect(result.current.isPlaying).toBe(false);
  });
});
