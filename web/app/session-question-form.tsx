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
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allAnswered = questions.every((q) => (answers[q.toolCallId] ?? "").trim().length > 0);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: questions.map((q) => ({
            toolCallId: q.toolCallId,
            answer: answers[q.toolCallId].trim(),
          })),
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
    <div className="flex flex-col gap-4 rounded-lg border p-4">
      {questions.map((question) => (
        <div key={question.toolCallId} className="flex flex-col gap-2">
          <p className="font-medium">{question.question}</p>
          {question.type === "choice" ? (
            <div className="flex flex-wrap gap-2">
              {question.options?.map((opt) => {
                const selected = answers[question.toolCallId] === opt;
                return (
                  <button
                    key={opt}
                    disabled={submitting}
                    onClick={() => setAnswers((a) => ({ ...a, [question.toolCallId]: opt }))}
                    className={`rounded-full border px-4 py-1.5 text-sm disabled:opacity-50 ${
                      selected ? "border-black bg-black text-white" : "hover:bg-gray-50"
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          ) : (
            <input
              value={answers[question.toolCallId] ?? ""}
              onChange={(e) =>
                setAnswers((a) => ({ ...a, [question.toolCallId]: e.target.value }))
              }
              placeholder={question.placeholder}
              disabled={submitting}
              className="rounded-lg border px-3 py-2"
            />
          )}
        </div>
      ))}

      <button
        onClick={submit}
        disabled={submitting || !allAnswered}
        className="w-fit rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {submitting ? "Sending…" : questions.length > 1 ? "Send answers" : "Send"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
