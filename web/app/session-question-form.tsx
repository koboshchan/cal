"use client";

import { useState } from "react";
import type { PendingQuestion } from "@/lib/types";
import type { SessionData } from "./session-types";

export default function QuestionForm({
  sessionId,
  question,
  onAnswered,
}: {
  sessionId: string;
  question: PendingQuestion;
  onAnswered: (updated: SessionData) => void;
}) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(answer: string) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit answer");
      onAnswered(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <p className="font-medium">{question.question}</p>
      {question.type === "choice" ? (
        <div className="flex flex-wrap gap-2">
          {question.options?.map((opt) => (
            <button
              key={opt}
              disabled={submitting}
              onClick={() => submit(opt)}
              className="rounded-full border px-4 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              {opt}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={question.placeholder}
            className="flex-1 rounded-lg border px-3 py-2"
          />
          <button
            disabled={submitting || !text.trim()}
            onClick={() => submit(text.trim())}
            className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            Send
          </button>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
