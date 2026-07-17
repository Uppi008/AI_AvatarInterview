import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle } from "lucide-react";

interface InterviewEndScreenProps {
  outcome: "complete" | "terminated" | "ended";
  reason?: string | null;
  sessionId: string;
}

export function InterviewEndScreen({ outcome, reason, sessionId }: InterviewEndScreenProps) {
  const navigate = useNavigate();
  const isTerminated = outcome === "terminated";

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate(isTerminated ? "/dashboard" : `/interviews/${sessionId}`);
    }, 4000);
    return () => clearTimeout(timer);
  }, [navigate, isTerminated, sessionId]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-white/95 backdrop-blur-sm dark:bg-slate-950/95">
      {isTerminated ? (
        <XCircle className="h-16 w-16 text-red-500" />
      ) : (
        <CheckCircle2 className="h-16 w-16 text-green-500" />
      )}
      <h2 className="text-xl font-bold text-slate-900 dark:text-white">
        {isTerminated ? "Interview terminated" : "Interview complete"}
      </h2>
      {reason && <p className="max-w-sm text-center text-sm text-slate-500 dark:text-slate-400">{reason}</p>}
      <p className="text-sm text-slate-400">Redirecting...</p>
    </div>
  );
}
