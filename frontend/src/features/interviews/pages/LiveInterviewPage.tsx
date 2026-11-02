import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Clock, ListChecks, ShieldAlert, Volume2 } from "lucide-react";

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
  const { isPlaying, needsUnlock, enqueue, unlock, audioElement } = useAudioPlayback();
  const { isRecording, start: startRecording, stop: stopRecording } = useAudioRecorder();

  const [avatar, setAvatar] = useState<{ name: string; image: string } | null>(null);
  const [language, setLanguage] = useState("en");
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
      setLanguage(data.language);
    });
  }, [sessionId]);

  // Elapsed-time display only; no server-enforced time limit.
  useEffect(() => {
    const timer = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Mobile browsers only allow sound that starts from a user gesture, and the
  // interviewer's clips arrive over the socket with no gesture attached. The
  // first tap/key anywhere on the page unlocks audio for the whole session.
  useEffect(() => {
    const events = ["click", "touchend", "keydown"] as const;
    events.forEach((e) => document.addEventListener(e, unlock, { capture: true }));
    return () => events.forEach((e) => document.removeEventListener(e, unlock, { capture: true }));
  }, [unlock]);

  useEffect(() => {
    if (socket.question && socket.question.id !== lastPlayedQuestionId.current) {
      lastPlayedQuestionId.current = socket.question.id;
      setAwaitingResponse(false);
      enqueue({ audioBase64: socket.question.audio_base64, text: socket.question.text, language });
    }
  }, [socket.question, enqueue, language]);

  // Feedback/acknowledgement/nudge audio queues behind whatever's still
  // playing (see useAudioPlayback) so e.g. "Nice, let's continue" finishes
  // before the next question starts talking over it. Without server audio,
  // the text is read by the browser's own voice instead.
  useEffect(() => {
    const e = socket.lastEvaluation;
    if (e) enqueue({ audioBase64: e.audioBase64, text: e.feedback, language });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per message
  }, [socket.lastEvaluation, enqueue]);

  useEffect(() => {
    const a = socket.acknowledgement;
    if (a) enqueue({ audioBase64: a.audioBase64, text: a.text, language });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per message
  }, [socket.acknowledgement, enqueue]);

  useEffect(() => {
    const n = socket.silenceNudge;
    if (n) enqueue({ audioBase64: n.audioBase64, text: n.text, language });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per message
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
    <DashboardLayout calm>
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

            {needsUnlock && (
              <button
                type="button"
                onClick={unlock}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand-600/30 transition hover:bg-brand-700 active:scale-[0.99]"
              >
                <Volume2 className="h-5 w-5 animate-pulse" />
                Tap to hear the interviewer
              </button>
            )}

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
