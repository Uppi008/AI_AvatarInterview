import { useEffect, useRef } from "react";

import type { ProctoringEventType } from "../ws-types";

type OnViolation = (eventType: ProctoringEventType, metadata?: Record<string, unknown>) => void;

/** Watches the live camera/mic tracks and reports if either stops (device
 * disabled/revoked/unplugged mid-interview). */
export function useMediaDeviceMonitoring(stream: MediaStream | null, onViolation: OnViolation) {
  const onViolationRef = useRef(onViolation);
  onViolationRef.current = onViolation;

  useEffect(() => {
    if (!stream) return;

    const videoTrack = stream.getVideoTracks()[0];
    const audioTrack = stream.getAudioTracks()[0];

    const handleVideoEnded = () => onViolationRef.current("camera_disabled");
    const handleAudioEnded = () => onViolationRef.current("mic_disabled");

    videoTrack?.addEventListener("ended", handleVideoEnded);
    audioTrack?.addEventListener("ended", handleAudioEnded);

    return () => {
      videoTrack?.removeEventListener("ended", handleVideoEnded);
      audioTrack?.removeEventListener("ended", handleAudioEnded);
    };
  }, [stream]);
}
