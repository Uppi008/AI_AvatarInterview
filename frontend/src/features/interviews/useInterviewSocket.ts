import { useCallback, useEffect, useRef, useState } from "react";

import { tokenStorage } from "@/services/apiClient";

import type { ClientMessage, ProctoringEventType, ServerMessage, WSProgress, WSQuestion, WSScores } from "./ws-types";

interface EvaluationResult {
  questionId: string;
  feedback: string;
  scores: WSScores;
}

type ConnectionStatus = "connecting" | "open" | "closed";
type InterviewOutcome = "complete" | "terminated" | "ended" | null;

export function useInterviewSocket(sessionId: string) {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [question, setQuestion] = useState<WSQuestion | null>(null);
  const [progress, setProgress] = useState<WSProgress>({ answered: 0, total: 0 });
  const [lastEvaluation, setLastEvaluation] = useState<EvaluationResult | null>(null);
  const [violationCount, setViolationCount] = useState(0);
  const [lastViolationType, setLastViolationType] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<InterviewOutcome>(null);
  const [terminationReason, setTerminationReason] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const token = tokenStorage.getAccess();
    const base = import.meta.env.VITE_WS_BASE_URL;
    const ws = new WebSocket(`${base}/interview/${sessionId}/?token=${token}`);
    wsRef.current = ws;

    // React 18 StrictMode double-invokes this effect in dev (mount -> cleanup
    // -> mount again), so a throwaway first socket gets opened and closed
    // immediately. Browsers can still fire onerror/onclose on it *after* that
    // close() call, asynchronously -- without this guard, that stale event
    // would overwrite state that rightfully belongs to the real, current
    // connection (e.g. showing a permanent "Connection error" banner while
    // the actual socket is open and working fine).
    const isCurrent = () => wsRef.current === ws;

    ws.onopen = () => {
      if (isCurrent()) setStatus("open");
    };
    ws.onclose = () => {
      if (isCurrent()) setStatus("closed");
    };
    ws.onerror = () => {
      if (isCurrent()) setError("Connection error. Check your network and try again.");
    };

    ws.onmessage = (event) => {
      if (!isCurrent()) return;
      const message: ServerMessage = JSON.parse(event.data);
      switch (message.type) {
        case "question":
          setQuestion(message.question);
          setProgress(message.progress);
          setLastEvaluation(null);
          break;
        case "evaluation":
          setLastEvaluation({ questionId: message.question_id, feedback: message.feedback, scores: message.scores });
          break;
        case "violation_warning":
          setViolationCount(message.violation_count);
          setLastViolationType(message.event_type);
          break;
        case "monitoring_notice":
          setLastViolationType(message.event_type);
          break;
        case "interview_complete":
          setOutcome("complete");
          break;
        case "interview_terminated":
          setOutcome("terminated");
          setTerminationReason(message.reason);
          setViolationCount(message.violation_count);
          break;
        case "interview_ended":
          setOutcome("ended");
          break;
        case "error":
          setError(message.detail);
          break;
      }
    };

    return () => {
      ws.close();
    };
  }, [sessionId]);

  const send = useCallback((message: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  return {
    status,
    question,
    progress,
    lastEvaluation,
    violationCount,
    lastViolationType,
    outcome,
    terminationReason,
    error,
    sendAnswerAudio: (audioBase64: string, mimeType: string) =>
      send({ type: "answer_audio", audio_base64: audioBase64, mime_type: mimeType }),
    sendAnswerText: (text: string) => send({ type: "answer_text", text }),
    skipQuestion: () => send({ type: "skip_question" }),
    repeatQuestion: () => send({ type: "repeat_question" }),
    endInterview: () => send({ type: "end_interview" }),
    sendProctoringEvent: (eventType: ProctoringEventType, metadata?: Record<string, unknown>) =>
      send({ type: "proctoring_event", event_type: eventType, metadata }),
  };
}
