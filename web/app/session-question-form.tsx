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
  const [usingOther, setUsingOther] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const question = questions[stepIndex];
  const isLast = stepIndex === questions.length - 1;

  function chooseAndAdvance(value: string) {
    const updated = { ...answers, [question.toolCallId]: value };
    setAnswers(updated);
    setCustomText("");
    setUsingOther(false);
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

  const showingTextEntry = question.type === "text" || usingOther;

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      {questions.length > 1 && (
        <p className="text-xs text-gray-400">
          Question {stepIndex + 1} of {questions.length}
        </p>
      )}
      <p className="font-medium">{question.question}</p>

      {!showingTextEntry ? (
        <div className="flex flex-wrap gap-2">
          {question.options?.map((opt) => (
            <button
              key={opt}
              disabled={submitting}
              onClick={() => chooseAndAdvance(opt)}
              className="rounded-full border px-4 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              {opt}
            </button>
          ))}
          <button
            disabled={submitting}
            onClick={() => setUsingOther(true)}
            className="rounded-full border border-dashed px-4 py-1.5 text-sm text-gray-500 hover:bg-gray-50 disabled:opacity-50"
          >
            Other
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder={question.type === "text" ? question.placeholder : "Type your own answer"}
            disabled={submitting}
            autoFocus
            className="flex-1 rounded-lg border px-3 py-2"
          />
          <button
            onClick={() => customText.trim() && chooseAndAdvance(customText.trim())}
            disabled={submitting || !customText.trim()}
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? "Sending…" : isLast ? "Submit" : "Next"}
          </button>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
