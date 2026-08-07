import { useEffect, useState } from "react";

import { MEDIAPIPE_FACE_LANDMARKER_MODEL_URL, MEDIAPIPE_WASM_BASE_URL } from "../mediapipeConfig";

interface Region {
  /** Center position, as a percentage of the source image's width/height. */
  xPct: number;
  yPct: number;
  /** Feature width as a percentage of the source image's width. */
  widthPct: number;
}

export interface AvatarLandmarks {
  mouth: Region;
  leftEye: Region;
  rightEye: Region;
}

// MediaPipe FaceMesh's fixed landmark indices for eye/mouth contour points.
// Same mesh topology used by proctoring's blendshapes -- these indices are
// stable across the model, not something detected/computed per photo.
const MOUTH_LEFT = 61;
const MOUTH_RIGHT = 291;
const MOUTH_TOP = 13;
const MOUTH_BOTTOM = 14;
const LEFT_EYE_OUTER = 33;
const LEFT_EYE_INNER = 133;
const LEFT_EYE_TOP = 159;
const LEFT_EYE_BOTTOM = 145;
const RIGHT_EYE_OUTER = 362;
const RIGHT_EYE_INNER = 263;
const RIGHT_EYE_TOP = 386;
const RIGHT_EYE_BOTTOM = 374;

// Detection runs once per distinct avatar photo URL and is cached for the
// lifetime of the tab -- avatar images don't change mid-session, and this
// avoids re-running the model every time AnimatedAvatar remounts (e.g. on
// question change re-render).
const cache = new Map<string, AvatarLandmarks | null>();

/** Runs MediaPipe FaceLandmarker once (IMAGE mode, not the VIDEO mode
 * proctoring uses) against a static avatar photo to find real eye/mouth
 * positions on *that specific photo*, so blink/lip-sync overlays anchor to
 * the actual face instead of a guessed fixed position.
 *
 * Percentages are relative to the source image's own dimensions. Display
 * containers using object-fit: cover only render these at the correct
 * screen position if the container's aspect ratio matches the source image
 * (true for CustomAvatar's server-side square crop; catalog avatar photos
 * that aren't square may be off by the crop amount -- degrades to a
 * slightly mispositioned overlay, not a broken one).
 */
export function useAvatarLandmarks(imageUrl: string | null): AvatarLandmarks | null {
  const [landmarks, setLandmarks] = useState<AvatarLandmarks | null>(
    imageUrl ? (cache.get(imageUrl) ?? null) : null
  );

  useEffect(() => {
    if (!imageUrl) {
      setLandmarks(null);
      return;
    }
    if (cache.has(imageUrl)) {
      setLandmarks(cache.get(imageUrl) ?? null);
      return;
    }

    let cancelled = false;

    async function detect() {
      let landmarker: import("@mediapipe/tasks-vision").FaceLandmarker | null = null;
      try {
        const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
        const filesetResolver = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_BASE_URL);
        landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: { modelAssetPath: MEDIAPIPE_FACE_LANDMARKER_MODEL_URL, delegate: "GPU" },
          outputFaceBlendshapes: false,
          runningMode: "IMAGE",
          numFaces: 1,
        });

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = imageUrl!;
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("Failed to load avatar image for landmark detection."));
        });
        if (cancelled) return;

        const result = landmarker.detect(img);
        const points = result.faceLandmarks?.[0];
        const computed = points ? extractRegions(points) : null;
        cache.set(imageUrl!, computed);
        if (!cancelled) setLandmarks(computed);
      } catch {
        // No face detected, image blocked by CORS, or model failed to load --
        // AnimatedAvatar falls back to no overlays (just the plain photo).
        cache.set(imageUrl!, null);
        if (!cancelled) setLandmarks(null);
      } finally {
        landmarker?.close();
      }
    }

    void detect();
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  return landmarks;
}

export function extractRegions(points: Array<{ x: number; y: number }>): AvatarLandmarks {
  const pct = (v: number) => v * 100;
  const midpoint = (a: { x: number; y: number }, b: { x: number; y: number }) => ({
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  });

  const mouthCenter = midpoint(points[MOUTH_TOP], points[MOUTH_BOTTOM]);
  const leftEyeCenter = midpoint(points[LEFT_EYE_TOP], points[LEFT_EYE_BOTTOM]);
  const rightEyeCenter = midpoint(points[RIGHT_EYE_TOP], points[RIGHT_EYE_BOTTOM]);

  return {
    mouth: {
      xPct: pct(mouthCenter.x),
      yPct: pct(mouthCenter.y),
      widthPct: pct(Math.abs(points[MOUTH_RIGHT].x - points[MOUTH_LEFT].x)),
    },
    leftEye: {
      xPct: pct(leftEyeCenter.x),
      yPct: pct(leftEyeCenter.y),
      widthPct: pct(Math.abs(points[LEFT_EYE_INNER].x - points[LEFT_EYE_OUTER].x)),
    },
    rightEye: {
      xPct: pct(rightEyeCenter.x),
      yPct: pct(rightEyeCenter.y),
      widthPct: pct(Math.abs(points[RIGHT_EYE_OUTER].x - points[RIGHT_EYE_INNER].x)),
    },
  };
}
