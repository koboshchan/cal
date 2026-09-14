"use client";

import { useState } from "react";
import type { PendingQuestion } from "@/lib/types";
import type { SessionData } from "./session-types";

export default function QuestionForm({
  sessionId,
  questions,
  onAnswered,
}: {
  sessionId: string;
  questions: PendingQuestion[];
  onAnswered: (updated: SessionData) => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [customText, setCustomText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const question = questions[stepIndex];
  const isLast = stepIndex === questions.length - 1;

  function chooseAndAdvance(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    const updated = { ...answers, [question.toolCallId]: trimmed };
    setAnswers(updated);
    setCustomText("");
    if (isLast) {
      submitAll(updated);
    } else {
      setStepIndex(stepIndex + 1);
    }
  }

  async function submitAll(finalAnswers: Record<string, string>) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: questions.map((q) => ({ toolCallId: q.toolCallId, answer: finalAnswers[q.toolCallId] })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit answers");
      onAnswered(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border p-5">
      {questions.length > 1 && (
        <p className="text-xs font-medium tracking-wide text-gray-400">
          QUESTION {stepIndex + 1} OF {questions.length}
        </p>
      )}
      <p className="text-base font-semibold text-gray-900">{question.question}</p>

      <div className="flex flex-col gap-2">
        {question.options.map((opt) => (
          <button
            key={opt}
            disabled={submitting}
            onClick={() => chooseAndAdvance(opt)}
            className="w-full rounded-lg border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-800 transition hover:border-gray-900 hover:bg-gray-50 disabled:opacity-50"
          >
            {opt}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs text-gray-400">or write your own</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <div className="flex gap-2">
        <input
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") chooseAndAdvance(customText);
          }}
          placeholder="Type your own answer"
          disabled={submitting}
          className="flex-1 rounded-lg border px-3 py-2 text-sm"
        />
        <button
          onClick={() => chooseAndAdvance(customText)}
          disabled={submitting || !customText.trim()}
          className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? "Sending…" : isLast ? "Submit" : "Next"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
