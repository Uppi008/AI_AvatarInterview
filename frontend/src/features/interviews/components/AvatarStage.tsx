import { useRef } from "react";
import Webcam from "react-webcam";

import type { AvatarState } from "./AnimatedAvatar";
import { AnimatedAvatar } from "./AnimatedAvatar";

interface AvatarStageProps {
  avatarImage: string;
  avatarName: string;
  state: AvatarState;
  audioElement: HTMLAudioElement | null;
  onStreamReady: (stream: MediaStream, videoElement: HTMLVideoElement) => void;
  onMediaError: (message: string) => void;
}

export function AvatarStage({
  avatarImage,
  avatarName,
  state,
  audioElement,
  onStreamReady,
  onMediaError,
}: AvatarStageProps) {
  const webcamRef = useRef<Webcam>(null);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-700">
        <AnimatedAvatar avatarImage={avatarImage} avatarName={avatarName} state={state} audioElement={audioElement} />
        <span className="absolute left-3 top-3 rounded-full bg-black/30 px-2.5 py-1 text-xs font-medium text-white">
          {avatarName}
        </span>
        {state === "speaking" && (
          <div className="absolute bottom-4 flex items-center gap-1.5 rounded-full bg-black/30 px-3 py-1.5">
            {[...Array(3)].map((_, i) => (
              <span
                key={i}
                className="h-4 w-1 animate-pulse rounded-full bg-white"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="relative aspect-video overflow-hidden rounded-2xl bg-slate-900">
        <Webcam
          ref={webcamRef}
          audio
          muted
          className="h-full w-full object-cover"
          onUserMedia={(stream) => {
            const videoEl = webcamRef.current?.video;
            if (videoEl) onStreamReady(stream, videoEl);
          }}
          onUserMediaError={() => onMediaError("Camera/microphone access is required for the interview.")}
        />
        <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-xs font-medium text-white">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
          Monitoring active
        </span>
      </div>
    </div>
  );
}
