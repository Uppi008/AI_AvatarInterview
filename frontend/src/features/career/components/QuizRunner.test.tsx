import { afterEach, describe, expect, it, vi } from "vitest";

import { act, renderWithProviders, screen } from "@/test/test-utils";

import { careerApi } from "../api";
import type { Quiz } from "../types";
import { QuizRunner } from "./QuizTool";

vi.mock("../api", () => ({ careerApi: { submitQuiz: vi.fn() } }));

const timedQuiz: Quiz = {
  id: "q1",
  topic: "Quantitative aptitude",
  difficulty: "medium",
  language: "en",
  category: "quantitative",
  time_limit_seconds: 3,
  time_taken_seconds: null,
  questions: [
    { question: "2 + 2?", options: ["3", "4", "5", "6"] },
    { question: "3 x 3?", options: ["6", "8", "9", "12"] },
  ],
  answers: [],
  score: null,
  submitted_at: null,
  created_at: "2026-11-25T10:00:00Z",
};

describe("QuizRunner (timed aptitude test)", () => {
  afterEach(() => vi.useRealTimers());

  it("shows a countdown and submits automatically when time runs out", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    const submitted = { ...timedQuiz, submitted_at: "2026-11-25T10:01:00Z", score: "0" };
    vi.mocked(careerApi.submitQuiz).mockResolvedValue({ data: submitted } as never);
    const onSubmitted = vi.fn();

    renderWithProviders(<QuizRunner quiz={timedQuiz} onSubmitted={onSubmitted} onExit={() => {}} />);

    expect(screen.getByRole("timer")).toHaveTextContent("0:03");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3500);
    });

    expect(careerApi.submitQuiz).toHaveBeenCalledTimes(1);
    const [id, answers, taken] = vi.mocked(careerApi.submitQuiz).mock.calls[0];
    expect(id).toBe("q1");
    expect(answers).toEqual([null, null]);
    expect(taken).toBeGreaterThanOrEqual(3);
    expect(onSubmitted).toHaveBeenCalledWith(submitted);
  });

  it("has no timer for an untimed topic quiz", () => {
    renderWithProviders(
      <QuizRunner quiz={{ ...timedQuiz, category: "general", time_limit_seconds: 0 }} onSubmitted={() => {}} onExit={() => {}} />
    );
    expect(screen.queryByRole("timer")).not.toBeInTheDocument();
  });
});
