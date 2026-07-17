import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { tokenStorage } from "@/services/apiClient";

import { useInterviewSocket } from "./useInterviewSocket";

class FakeWebSocket {
  static OPEN = 1;
  static instances: FakeWebSocket[] = [];

  url: string;
  readyState = 0;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  sent: string[] = [];
  closed = false;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.closed = true;
    this.readyState = 3;
    this.onclose?.();
  }

  // test helpers, not part of the real WebSocket API
  simulateOpen() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }

  simulateMessage(payload: unknown) {
    this.onmessage?.({ data: JSON.stringify(payload) });
  }

  simulateError() {
    this.onerror?.();
  }
}

describe("useInterviewSocket", () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
    vi.stubGlobal("WebSocket", FakeWebSocket);
    tokenStorage.set("access-tok", "refresh-tok");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("connects to the session-scoped URL with the access token as a query param", () => {
    renderHook(() => useInterviewSocket("session-123"));

    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(FakeWebSocket.instances[0].url).toContain("/interview/session-123/");
    expect(FakeWebSocket.instances[0].url).toContain("token=access-tok");
  });

  it("updates status and question state as messages arrive", () => {
    const { result } = renderHook(() => useInterviewSocket("session-123"));
    const ws = FakeWebSocket.instances[0];

    act(() => ws.simulateOpen());
    expect(result.current.status).toBe("open");

    act(() =>
      ws.simulateMessage({
        type: "question",
        question: { id: "q1", text: "Tell me about yourself.", question_type: "behavioral", difficulty: "easy", order_index: 0, audio_base64: null },
        progress: { answered: 0, total: 3 },
      })
    );

    expect(result.current.question?.text).toBe("Tell me about yourself.");
    expect(result.current.progress).toEqual({ answered: 0, total: 3 });
  });

  it("tracks violation count and type from violation_warning messages", () => {
    const { result } = renderHook(() => useInterviewSocket("session-123"));
    const ws = FakeWebSocket.instances[0];
    act(() => ws.simulateOpen());

    act(() =>
      ws.simulateMessage({ type: "violation_warning", event_type: "no_face", violation_count: 2, max_violations: 4 })
    );

    expect(result.current.violationCount).toBe(2);
    expect(result.current.lastViolationType).toBe("no_face");
  });

  it("sets outcome to terminated on interview_terminated", () => {
    const { result } = renderHook(() => useInterviewSocket("session-123"));
    const ws = FakeWebSocket.instances[0];
    act(() => ws.simulateOpen());

    act(() =>
      ws.simulateMessage({
        type: "interview_terminated",
        reason: "Too many violations.",
        violation_count: 4,
      })
    );

    expect(result.current.outcome).toBe("terminated");
    expect(result.current.terminationReason).toBe("Too many violations.");
  });

  it("sends a well-formed proctoring_event message once open", () => {
    const { result } = renderHook(() => useInterviewSocket("session-123"));
    const ws = FakeWebSocket.instances[0];
    act(() => ws.simulateOpen());

    act(() => result.current.sendProctoringEvent("no_face", { confidence: 0.9 }));

    expect(ws.sent).toHaveLength(1);
    expect(JSON.parse(ws.sent[0])).toEqual({
      type: "proctoring_event",
      event_type: "no_face",
      metadata: { confidence: 0.9 },
    });
  });

  it("does not send messages before the socket is open", () => {
    const { result } = renderHook(() => useInterviewSocket("session-123"));
    const ws = FakeWebSocket.instances[0];
    // never call simulateOpen(); readyState stays 0

    act(() => result.current.skipQuestion());

    expect(ws.sent).toHaveLength(0);
  });

  it("ignores late events from a stale (superseded) connection", () => {
    // Regression test for a real bug found while manually verifying Phase 7:
    // React StrictMode double-invokes effects in dev, so a throwaway first
    // socket can still fire onerror/onclose *after* being superseded by the
    // real one. Those stale events must not overwrite the current state.
    const { result, rerender } = renderHook(({ id }) => useInterviewSocket(id), {
      initialProps: { id: "session-123" },
    });
    const firstSocket = FakeWebSocket.instances[0];

    // Force the effect to re-run, creating a second ("current") socket --
    // simulates what StrictMode's mount->cleanup->mount does.
    rerender({ id: "session-456" });
    const secondSocket = FakeWebSocket.instances[1];
    act(() => secondSocket.simulateOpen());
    expect(result.current.status).toBe("open");

    // The stale first socket fires an error after the fact.
    act(() => firstSocket.simulateError());

    expect(result.current.error).toBeNull();
    expect(result.current.status).toBe("open");
  });
});
