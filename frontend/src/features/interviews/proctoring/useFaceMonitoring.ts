import { useEffect, useRef } from "react";

import { MEDIAPIPE_FACE_LANDMARKER_MODEL_URL, MEDIAPIPE_WASM_BASE_URL } from "../mediapipeConfig";
import type { ProctoringEventType } from "../ws-types";

type OnViolation = (eventType: ProctoringEventType, metadata?: Record<string, unknown>) => void;

const NO_FACE_CONSECUTIVE_FRAMES = 15; // ~1s at ~15fps, rides out blinks/brief occlusion
const LOOKING_AWAY_YAW_THRESHOLD_DEG = 30;
const HEAD_ROTATION_ROLL_THRESHOLD_DEG = 25;
const EVENT_COOLDOWN_MS = 4000; // don't re-fire the same violation every single frame

/** Runs MediaPipe FaceLandmarker against the live video feed to detect face
 * presence, multiple faces, and (via the facial transformation matrix)
 * looking-away / head-tilt beyond a threshold.
 *
 * The yaw/roll extraction below is this implementation's best-effort Euler
 * decomposition of MediaPipe's 4x4 transformation matrix -- it hasn't been
 * calibrated against a real face feed (no camera/face input was available
 * to test with), so the exact threshold angles may need tuning once run
 * against real footage. Face presence / multiple-face counting doesn't
 * depend on that math and is reliable as-is.
 */
export function useFaceMonitoring(videoElement: HTMLVideoElement | null, onViolation: OnViolation, enabled: boolean) {
  const onViolationRef = useRef(onViolation);
  onViolationRef.current = onViolation;

  useEffect(() => {
    if (!enabled || !videoElement) return;

    let cancelled = false;
    let rafId = 0;
    let noFaceStreak = 0;
    const lastFired: Partial<Record<ProctoringEventType, number>> = {};

    const fire = (eventType: ProctoringEventType, metadata?: Record<string, unknown>) => {
      const now = Date.now();
      if (now - (lastFired[eventType] ?? 0) < EVENT_COOLDOWN_MS) return;
      lastFired[eventType] = now;
      onViolationRef.current(eventType, metadata);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let landmarker: any = null;

    async function setup() {
      const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
      const filesetResolver = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_BASE_URL);
      if (cancelled) return;

      landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: { modelAssetPath: MEDIAPIPE_FACE_LANDMARKER_MODEL_URL, delegate: "GPU" },
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: true,
        runningMode: "VIDEO",
        numFaces: 2, // detect a 2nd face to distinguish "multiple faces" from plain "no face"
      });

      if (cancelled) {
        landmarker.close();
        return;
      }
      detectLoop();
    }

    function detectLoop() {
      if (cancelled) return;
      if (!landmarker || !videoElement || videoElement.readyState < 2) {
        rafId = requestAnimationFrame(detectLoop);
        return;
      }

      const result = landmarker.detectForVideo(videoElement, performance.now());
      const faceCount = result.faceLandmarks?.length ?? 0;

      if (faceCount === 0) {
        noFaceStreak += 1;
        // >= (not ===): the streak keeps climbing for as long as no face is
        // seen, so an exact-match check would only ever fire once. fire()'s
        // own cooldown is what naturally re-triggers this every few seconds
        // for as long as the violation persists.
        if (noFaceStreak >= NO_FACE_CONSECUTIVE_FRAMES) {
          fire("no_face");
        }
      } else {
        noFaceStreak = 0;
        if (faceCount > 1) {
          fire("multiple_faces", { face_count: faceCount });
        }

        const matrix = result.facialTransformationMatrixes?.[0]?.data;
        if (matrix) {
          const { yawDeg, rollDeg } = eulerAnglesFromMatrix(matrix);
          if (Math.abs(yawDeg) > LOOKING_AWAY_YAW_THRESHOLD_DEG) {
            fire("looking_away", { yaw_deg: Math.round(yawDeg) });
          }
          if (Math.abs(rollDeg) > HEAD_ROTATION_ROLL_THRESHOLD_DEG) {
            fire("head_rotation", { roll_deg: Math.round(rollDeg) });
          }
        }
      }

      rafId = requestAnimationFrame(detectLoop);
    }

    void setup();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      landmarker?.close();
    };
  }, [videoElement, enabled]);
}

function eulerAnglesFromMatrix(m: Float32Array | number[]): { yawDeg: number; rollDeg: number } {
  const r00 = m[0];
  const r10 = m[4];
  const r20 = m[8];
  const r21 = m[9];
  const r22 = m[10];

  const yaw = Math.atan2(-r20, Math.sqrt(r00 * r00 + r10 * r10));
  const roll = Math.atan2(r21, r22);

  return { yawDeg: (yaw * 180) / Math.PI, rollDeg: (roll * 180) / Math.PI };
}
