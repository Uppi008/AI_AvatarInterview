import { AlertTriangle } from "lucide-react";

const VIOLATION_MESSAGES: Record<string, string> = {
  no_face: "Face not detected. Please stay visible on camera.",
  multiple_faces: "Multiple people detected in frame.",
  looking_away: "Please look at the camera.",
  head_rotation: "Please keep your head facing the camera.",
  lip_movement_anomaly: "Unusual lip movement detected.",
  mobile_usage: "Mobile phone usage detected.",
  tab_switch: "Please stay on this tab during the interview.",
  window_minimized: "Please keep this window active.",
  browser_refresh: "Please don't refresh or close this page.",
  mic_disabled: "Microphone was disabled.",
  camera_disabled: "Camera was disabled.",
  internet_disconnected: "Internet connection lost.",
};

interface ViolationBannerProps {
  eventType: string | null;
  violationCount: number;
  maxViolations: number;
}

export function ViolationBanner({ eventType, violationCount, maxViolations }: ViolationBannerProps) {
  if (!eventType) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <span className="text-sm font-medium">{VIOLATION_MESSAGES[eventType] ?? "Proctoring alert."}</span>
      </div>
      <span className="shrink-0 text-xs font-semibold">
        Violation {violationCount}/{maxViolations}
      </span>
    </div>
  );
}
