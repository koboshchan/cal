"use client";

import { useEffect, useRef, useState } from "react";
import QuestionForm from "./session-question-form";
import type { SessionData } from "./session-types";

const POLL_MS = 700;

export default function GenerationProgressModal({
  sessionId,
  onDone,
  onClose,
}: {
  sessionId: string;
  onDone: (session: SessionData) => void;
  onClose: () => void;
}) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stoppedRef = useRef(false);

  function handleUpdate(data: SessionData) {
    if (stoppedRef.current) return;
    setSession(data);
    if (data.status === "done") {
      onDone(data);
    } else if (data.status === "running") {
      timerRef.current = setTimeout(continuePolling, POLL_MS);
    }
    // "awaiting_input" and "error" just render and wait for the question
    // form (or the close button) to drive what happens next.
  }

  async function continuePolling() {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/continue`, { method: "POST" });
      const data = await res.json();
      if (stoppedRef.current) return;
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }
      handleUpdate(data);
    } catch (err) {
      if (!stoppedRef.current) setError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    stoppedRef.current = false;
    continuePolling();
    return () => {
      stoppedRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold">Generating your schedule</h2>

        {!error && session?.status !== "awaiting_input" && session?.status !== "error" && (
          <div className="mt-4 flex items-center gap-3">
            <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-gray-300 border-t-black" />
            <p className="text-gray-600">{session?.currentStage ?? "Starting…"}</p>
          </div>
        )}

        {session?.userAnswers && session.userAnswers.length > 0 && (
          <div className="mt-4 flex flex-col gap-2 rounded-lg bg-gray-50 p-3">
            {session.userAnswers.map((qa, i) => (
              <div key={i}>
                <p className="text-xs text-gray-500">{qa.question}</p>
                <p className="text-sm font-medium">{qa.answer}</p>
              </div>
            ))}
          </div>
        )}

        {session?.status === "awaiting_input" && session.pendingQuestions && (
          <div className="mt-4">
            <QuestionForm
              sessionId={sessionId}
              questions={session.pendingQuestions}
              onAnswered={handleUpdate}
            />
          </div>
        )}

        {(error || session?.status === "error") && (
          <div className="mt-4 flex flex-col gap-3">
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error ?? session?.error}
            </p>
            <button
              onClick={onClose}
              className="w-fit rounded-lg border px-4 py-2 text-sm font-medium"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
