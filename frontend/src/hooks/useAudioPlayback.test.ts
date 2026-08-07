import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAudioPlayback } from "./useAudioPlayback";

class FakeAudio {
  static instances: FakeAudio[] = [];
  src: string;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(src: string) {
    this.src = src;
    FakeAudio.instances.push(this);
  }

  play() {
    return Promise.resolve();
  }

  pause() {}

  // test helper, not part of the real Audio API
  simulateEnded() {
    this.onended?.();
  }
}

describe("useAudioPlayback", () => {
  beforeEach(() => {
    FakeAudio.instances = [];
    vi.stubGlobal("Audio", FakeAudio);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("plays the first enqueued clip immediately", async () => {
    const { result } = renderHook(() => useAudioPlayback());

    await act(async () => result.current.enqueue("clip-1"));

    expect(FakeAudio.instances).toHaveLength(1);
    expect(result.current.isPlaying).toBe(true);
  });

  it("queues a second clip instead of interrupting the first -- plays it only once the first ends", async () => {
    const { result } = renderHook(() => useAudioPlayback());

    await act(async () => result.current.enqueue("clip-1"));
    await act(async () => result.current.enqueue("clip-2"));

    // Still just the one Audio instance -- clip-2 is queued, not started yet.
    expect(FakeAudio.instances).toHaveLength(1);

    await act(async () => FakeAudio.instances[0].simulateEnded());

    expect(FakeAudio.instances).toHaveLength(2);
    expect(result.current.isPlaying).toBe(true);
  });

  it("sets isPlaying to false once the queue drains", async () => {
    const { result } = renderHook(() => useAudioPlayback());

    await act(async () => result.current.enqueue("clip-1"));
    await act(async () => FakeAudio.instances[0].simulateEnded());

    expect(result.current.isPlaying).toBe(false);
  });

  it("stop() clears the queue so nothing further plays", async () => {
    const { result } = renderHook(() => useAudioPlayback());

    await act(async () => result.current.enqueue("clip-1"));
    await act(async () => result.current.enqueue("clip-2"));
    act(() => result.current.stop());

    expect(result.current.isPlaying).toBe(false);

    await act(async () => FakeAudio.instances[0].simulateEnded());
    expect(FakeAudio.instances).toHaveLength(1); // clip-2 never started
  });
});
