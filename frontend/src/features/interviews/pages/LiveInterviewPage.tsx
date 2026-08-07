import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Clock, ListChecks, ShieldAlert } from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { useAudioPlayback } from "@/hooks/useAudioPlayback";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { DashboardLayout } from "@/layouts/DashboardLayout";

import { interviewsApi } from "../api";
import type { AvatarState } from "../components/AnimatedAvatar";
import { AnswerControls } from "../components/AnswerControls";
import { AvatarStage } from "../components/AvatarStage";
import { InterviewEndScreen } from "../components/InterviewEndScreen";
import { ViolationBanner } from "../components/ViolationBanner";
import { useBrowserSignals } from "../proctoring/useBrowserSignals";
import { useFaceMonitoring } from "../proctoring/useFaceMonitoring";
import { useMediaDeviceMonitoring } from "../proctoring/useMediaDeviceMonitoring";
import { useInterviewSocket } from "../useInterviewSocket";
import { useSilenceDetector } from "../useSilenceDetector";

export function LiveInterviewPage() {
  const { id } = useParams<{ id: string }>();
  const sessionId = id ?? "";
  const socket = useInterviewSocket(sessionId);
  const { isPlaying, enqueue, audioElement } = useAudioPlayback();
  const { isRecording, start: startRecording, stop: stopRecording } = useAudioRecorder();

  const [avatar, setAvatar] = useState<{ name: string; image: string } | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [awaitingResponse, setAwaitingResponse] = useState(false);
  const lastPlayedQuestionId = useRef<string | null>(null);

  const avatarState: AvatarState = isPlaying
    ? "speaking"
    : isRecording
      ? "listening"
      : awaitingResponse
        ? "thinking"
        : "idle";

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
    if (socket.question && socket.question.id !== lastPlayedQuestionId.current) {
      lastPlayedQuestionId.current = socket.question.id;
      setAwaitingResponse(false);
      if (socket.question.audio_base64) {
        enqueue(socket.question.audio_base64);
      }
    }
  }, [socket.question, enqueue]);

  // Feedback/acknowledgement/nudge audio queues behind whatever's still
  // playing (see useAudioPlayback) so e.g. "Nice, let's continue" finishes
  // before the next question starts talking over it.
  useEffect(() => {
    if (socket.lastEvaluation?.audioBase64) enqueue(socket.lastEvaluation.audioBase64);
  }, [socket.lastEvaluation, enqueue]);

  useEffect(() => {
    if (socket.acknowledgement?.audioBase64) enqueue(socket.acknowledgement.audioBase64);
  }, [socket.acknowledgement, enqueue]);

  useEffect(() => {
    if (socket.silenceNudge?.audioBase64) enqueue(socket.silenceNudge.audioBase64);
  }, [socket.silenceNudge, enqueue]);

  // Case 3: a candidate who hasn't started answering gets a spoken check-in
  // at 15s, then an automatic skip at 30s total -- paused while they're
  // actually recording or a response is already being scored.
  useSilenceDetector({
    questionId: socket.question?.id ?? null,
    isActive: socket.status === "open" && !socket.outcome && !!socket.question && !isRecording && !awaitingResponse,
    onCheckSilence: socket.checkSilence,
    onTimeout: () => socket.skipQuestion("silence_timeout"),
  });

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
    setAwaitingResponse(true);
    socket.sendAnswerAudio(base64, mimeType);
  };

  const handleSendText = (text: string) => {
    setAwaitingResponse(true);
    socket.sendAnswerText(text);
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

        {socket.error && <Alert tone="error">{socket.error}</Alert>}

        {mediaError && <Alert tone="error">{mediaError}</Alert>}

        {socket.status === "open" && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge tone="slate" className="gap-1.5 py-1.5">
                <ListChecks className="h-3.5 w-3.5" />
                Question {socket.progress.answered + 1} of{" "}
                {Math.max(socket.progress.total, socket.progress.answered + 1)}
              </Badge>
              <Badge tone="slate" className="gap-1.5 py-1.5 tabular-nums">
                <Clock className="h-3.5 w-3.5" />
                {formatElapsed(elapsedSeconds)}
              </Badge>
              <Badge
                tone={socket.violationCount >= 3 ? "red" : socket.violationCount >= 1 ? "amber" : "green"}
                className="gap-1.5 py-1.5"
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                Violations: {socket.violationCount}/4
              </Badge>
            </div>

            <ViolationBanner
              eventType={socket.lastViolationType}
              violationCount={socket.violationCount}
              maxViolations={4}
            />

            <AvatarStage
              avatarImage={avatar?.image ?? ""}
              avatarName={avatar?.name ?? "Interviewer"}
              state={avatarState}
              audioElement={audioElement}
              onStreamReady={handleStreamReady}
              onMediaError={setMediaError}
            />

            {socket.question && (
              <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="absolute inset-y-0 left-0 w-1 bg-brand-600 dark:bg-brand-500" />
                <div className="mb-2 flex items-center gap-2">
                  <Badge tone="brand">{socket.question.question_type.replace("_", " ")}</Badge>
                  <Badge tone="slate">{socket.question.difficulty}</Badge>
                </div>
                <p className="text-lg font-medium text-slate-900 dark:text-white">{socket.question.text}</p>
              </div>
            )}

            {socket.lastEvaluation && <Alert tone="success">{socket.lastEvaluation.feedback}</Alert>}
            {socket.acknowledgement && <Alert tone="info">{socket.acknowledgement.text}</Alert>}
            {socket.silenceNudge && <Alert tone="warning">{socket.silenceNudge.text}</Alert>}

            <AnswerControls
              isRecording={isRecording}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
              onSendText={handleSendText}
              onSkip={() => socket.skipQuestion()}
              onRepeat={socket.repeatQuestion}
              onEnd={socket.endInterview}
              disabled={!socket.question || awaitingResponse}
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
