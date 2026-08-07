import { cn } from "@/utils/cn";

import { useAvatarLandmarks } from "../avatar/useAvatarLandmarks";
import { useBlink } from "../avatar/useBlink";
import { useLipSync } from "../avatar/useLipSync";

export type AvatarState = "idle" | "listening" | "thinking" | "speaking";

interface AnimatedAvatarProps {
  avatarImage: string;
  avatarName: string;
  state: AvatarState;
  audioElement: HTMLAudioElement | null;
}

// Ambient ring per state -- the one facial signal this rig can't produce
// (it animates motion on a fixed photo, not a different expression) is
// substituted with a state-appropriate glow/pulse around the frame.
const RING_CLASSES: Record<AvatarState, string> = {
  idle: "ring-4 ring-white/20",
  listening: "ring-4 ring-green-400/60 animate-pulse",
  thinking: "ring-4 ring-amber-400/60",
  speaking: "ring-4 ring-white/70",
};

export function AnimatedAvatar({ avatarImage, avatarName, state, audioElement }: AnimatedAvatarProps) {
  const landmarks = useAvatarLandmarks(avatarImage || null);
  const isBlinking = useBlink();
  const mouthAmplitude = useLipSync(audioElement, state === "speaking");

  const mouthScale = state === "speaking" ? 0.15 + mouthAmplitude * 0.85 : 0.15;

  return (
    <div className="relative h-32 w-32 shrink-0">
      {avatarImage && (
        <img
          src={avatarImage}
          alt={avatarName}
          className={cn(
            "h-32 w-32 rounded-full object-cover transition-transform duration-300 animate-avatar-sway",
            RING_CLASSES[state],
            state === "speaking" && "scale-105"
          )}
        />
      )}

      {landmarks && (
        <>
          <EyelidOverlay eye={landmarks.leftEye} closed={isBlinking} />
          <EyelidOverlay eye={landmarks.rightEye} closed={isBlinking} />
          <div
            className="pointer-events-none absolute rounded-full bg-black/60 transition-transform duration-75 ease-out"
            style={{
              left: `${landmarks.mouth.xPct}%`,
              top: `${landmarks.mouth.yPct}%`,
              width: `${landmarks.mouth.widthPct * 0.7}%`,
              height: `${landmarks.mouth.widthPct * 0.45}%`,
              transform: `translate(-50%, -50%) scaleY(${mouthScale})`,
            }}
          />
        </>
      )}

      {state === "thinking" && (
        <div className="absolute -bottom-1 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/40 px-2 py-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-300"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EyelidOverlay({ eye, closed }: { eye: { xPct: number; yPct: number; widthPct: number }; closed: boolean }) {
  return (
    <div
      className="pointer-events-none absolute rounded-full bg-black/55 transition-transform duration-100 ease-out"
      style={{
        left: `${eye.xPct}%`,
        top: `${eye.yPct}%`,
        width: `${eye.widthPct}%`,
        height: `${eye.widthPct * 0.5}%`,
        transform: `translate(-50%, -50%) scaleY(${closed ? 1 : 0})`,
      }}
    />
  );
}
