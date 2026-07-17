import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import { Spinner } from "@/components/ui/Spinner";
import { useAudioPlayback } from "@/hooks/useAudioPlayback";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { DashboardLayout } from "@/layouts/DashboardLayout";

import { interviewsApi } from "../api";
import { AnswerControls } from "../components/AnswerControls";
import { AvatarStage } from "../components/AvatarStage";
import { InterviewEndScreen } from "../components/InterviewEndScreen";
import { ViolationBanner } from "../components/ViolationBanner";
import { useBrowserSignals } from "../proctoring/useBrowserSignals";
import { useFaceMonitoring } from "../proctoring/useFaceMonitoring";
import { useMediaDeviceMonitoring } from "../proctoring/useMediaDeviceMonitoring";
import { useInterviewSocket } from "../useInterviewSocket";

export function LiveInterviewPage() {
  const { id } = useParams<{ id: string }>();
  const sessionId = id ?? "";
  const socket = useInterviewSocket(sessionId);
  const { isPlaying, play } = useAudioPlayback();
  const { isRecording, start: startRecording, stop: stopRecording } = useAudioRecorder();

  const [avatar, setAvatar] = useState<{ name: string; image: string } | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const lastPlayedQuestionId = useRef<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    void interviewsApi.retrieve(sessionId).then(({ data }) => {
      setAvatar({ name: data.avatar_name, image: data.avatar_image });
    });
  }, [sessionId]);

  // Elapsed-time display only; no server-enforced time limit.
  useEffect(() => {
    const timer = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (socket.question?.audio_base64 && socket.question.id !== lastPlayedQuestionId.current) {
      lastPlayedQuestionId.current = socket.question.id;
      play(socket.question.audio_base64);
    }
  }, [socket.question, play]);

  const handleStreamReady = useCallback((mediaStream: MediaStream, video: HTMLVideoElement) => {
    setStream(mediaStream);
    setVideoElement(video);
  }, []);

  const monitoringEnabled = socket.status === "open" && !socket.outcome;
  useFaceMonitoring(videoElement, socket.sendProctoringEvent, monitoringEnabled);
  useBrowserSignals(socket.sendProctoringEvent, monitoringEnabled);
  useMediaDeviceMonitoring(stream, socket.sendProctoringEvent);

  const handleStartRecording = () => {
    const audioTrack = stream?.getAudioTracks()[0];
    if (!audioTrack) {
      setMediaError("No microphone track available.");
      return;
    }
    startRecording(new MediaStream([audioTrack]));
  };

  const handleStopRecording = async () => {
    const { base64, mimeType } = await stopRecording();
    socket.sendAnswerAudio(base64, mimeType);
  };

  if (socket.outcome) {
    return <InterviewEndScreen outcome={socket.outcome} reason={socket.terminationReason} sessionId={sessionId} />;
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-5">
        {socket.status === "connecting" && (
          <div className="flex h-64 items-center justify-center">
            <Spinner />
          </div>
        )}

        {socket.error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {socket.error}
          </p>
        )}

        {mediaError && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {mediaError}
          </p>
        )}

        {socket.status === "open" && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500 dark:text-slate-400">
              <span>
                Question {socket.progress.answered + 1} of{" "}
                {Math.max(socket.progress.total, socket.progress.answered + 1)}
              </span>
              <span>{formatElapsed(elapsedSeconds)}</span>
              <span className="font-medium text-amber-600 dark:text-amber-400">
                Violations: {socket.violationCount}/4
              </span>
            </div>

            <ViolationBanner
              eventType={socket.lastViolationType}
              violationCount={socket.violationCount}
              maxViolations={4}
            />

            <AvatarStage
              avatarImage={avatar?.image ?? ""}
              avatarName={avatar?.name ?? "Interviewer"}
              isSpeaking={isPlaying}
              onStreamReady={handleStreamReady}
              onMediaError={setMediaError}
            />

            {socket.question && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
                  <span>{socket.question.question_type.replace("_", " ")}</span>
                  <span>&middot;</span>
                  <span>{socket.question.difficulty}</span>
                </div>
                <p className="text-lg font-medium text-slate-900 dark:text-white">{socket.question.text}</p>
              </div>
            )}

            {socket.lastEvaluation && (
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300">
                {socket.lastEvaluation.feedback}
              </div>
            )}

            <AnswerControls
              isRecording={isRecording}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
              onSendText={socket.sendAnswerText}
              onSkip={socket.skipQuestion}
              onRepeat={socket.repeatQuestion}
              onEnd={socket.endInterview}
              disabled={!socket.question}
            />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}
