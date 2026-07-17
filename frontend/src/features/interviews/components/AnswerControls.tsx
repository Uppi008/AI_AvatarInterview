import { useState } from "react";
import { Mic, MicOff, Repeat2, Send, SkipForward } from "lucide-react";

import { Button } from "@/components/ui/Button";

interface AnswerControlsProps {
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onSendText: (text: string) => void;
  onSkip: () => void;
  onRepeat: () => void;
  onEnd: () => void;
  disabled: boolean;
}

export function AnswerControls({
  isRecording,
  onStartRecording,
  onStopRecording,
  onSendText,
  onSkip,
  onRepeat,
  onEnd,
  disabled,
}: AnswerControlsProps) {
  const [showText, setShowText] = useState(false);
  const [text, setText] = useState("");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          size="lg"
          variant={isRecording ? "secondary" : "primary"}
          disabled={disabled}
          onClick={isRecording ? onStopRecording : onStartRecording}
          className={isRecording ? "animate-pulse" : ""}
        >
          {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          {isRecording ? "Stop & submit" : "Record answer"}
        </Button>
        <Button variant="outline" disabled={disabled || isRecording} onClick={onRepeat}>
          <Repeat2 className="h-4 w-4" />
          Repeat
        </Button>
        <Button variant="outline" disabled={disabled || isRecording} onClick={onSkip}>
          <SkipForward className="h-4 w-4" />
          Skip
        </Button>
        <Button variant="ghost" disabled={disabled || isRecording} onClick={() => setShowText((v) => !v)}>
          Type instead
        </Button>
        <Button variant="ghost" className="text-red-600 dark:text-red-400" onClick={onEnd}>
          End interview
        </Button>
      </div>

      {showText && (
        <div className="flex gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            placeholder="Type your answer..."
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <Button
            disabled={!text.trim() || disabled}
            onClick={() => {
              onSendText(text);
              setText("");
              setShowText(false);
            }}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
