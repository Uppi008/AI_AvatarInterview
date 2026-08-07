import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useSilenceDetector } from "./useSilenceDetector";

describe("useSilenceDetector", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fires onCheckSilence at 15s and onTimeout at 30s when inactive the whole time", () => {
    const onCheckSilence = vi.fn();
    const onTimeout = vi.fn();
    renderHook(() =>
      useSilenceDetector({ questionId: "q1", isActive: true, onCheckSilence, onTimeout })
    );

    vi.advanceTimersByTime(14999);
    expect(onCheckSilence).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onCheckSilence).toHaveBeenCalledTimes(1);
    expect(onTimeout).not.toHaveBeenCalled();

    vi.advanceTimersByTime(15000);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it("does not fire while inactive (e.g. the candidate is recording)", () => {
    const onCheckSilence = vi.fn();
    const onTimeout = vi.fn();
    renderHook(() =>
      useSilenceDetector({ questionId: "q1", isActive: false, onCheckSilence, onTimeout })
    );

    vi.advanceTimersByTime(60000);
    expect(onCheckSilence).not.toHaveBeenCalled();
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it("resets the timer when the question id changes", () => {
    const onCheckSilence = vi.fn();
    const onTimeout = vi.fn();
    const { rerender } = renderHook(
      ({ questionId }) => useSilenceDetector({ questionId, isActive: true, onCheckSilence, onTimeout }),
      { initialProps: { questionId: "q1" } }
    );

    vi.advanceTimersByTime(10000);
    rerender({ questionId: "q2" });
    vi.advanceTimersByTime(10000);

    // 10s into q2's timer, not 20s total -- the switch reset it.
    expect(onCheckSilence).not.toHaveBeenCalled();

    vi.advanceTimersByTime(5000);
    expect(onCheckSilence).toHaveBeenCalledTimes(1);
  });

  it("pausing (isActive -> false) and resuming restarts the timer instead of resuming a partial one", () => {
    const onCheckSilence = vi.fn();
    const onTimeout = vi.fn();
    const { rerender } = renderHook(
      ({ isActive }) => useSilenceDetector({ questionId: "q1", isActive, onCheckSilence, onTimeout }),
      { initialProps: { isActive: true } }
    );

    vi.advanceTimersByTime(10000);
    rerender({ isActive: false }); // e.g. candidate starts recording
    vi.advanceTimersByTime(10000);
    expect(onCheckSilence).not.toHaveBeenCalled();

    rerender({ isActive: true }); // stops recording without submitting
    vi.advanceTimersByTime(14999);
    expect(onCheckSilence).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onCheckSilence).toHaveBeenCalledTimes(1);
  });
});
