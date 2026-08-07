/** Shared MediaPipe FaceLandmarker config -- used by proctoring (VIDEO mode,
 * live webcam feed) and avatar animation (IMAGE mode, static avatar photo). */
export const MEDIAPIPE_VERSION = "0.10.35"; // must match the installed @mediapipe/tasks-vision npm version
export const MEDIAPIPE_WASM_BASE_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
export const MEDIAPIPE_FACE_LANDMARKER_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
