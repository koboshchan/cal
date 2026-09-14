"use client";

import { useEffect, useRef, useState } from "react";
import type { NormalizedEvent, PendingQuestion, SessionStatus } from "@/lib/types";

interface SessionData {
  id: string;
  status: SessionStatus;
  title: string;
  userPrompt: string;
  pendingQuestion?: PendingQuestion;
  resultEvents?: NormalizedEvent[];
  error?: string;
}

const POLL_MS = 2000;

export default function SessionView({ id }: { id: string }) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/sessions/${id}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setLoadError(data.error || "Failed to load session");
          return;
        }
        setSession(data);
        if (data.status !== "running" && pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : String(err));
      }
    }

    load();
    pollRef.current = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [id]);

  if (loadError) return <p className="p-8 text-red-600">{loadError}</p>;
  if (!session) return <p className="p-8 text-gray-500">Loading…</p>;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold">{session.title}</h1>
      <p className="text-sm text-gray-500">
        Status: <span className="font-medium">{session.status.replace("_", " ")}</span>
      </p>

      {session.status === "running" && (
        <p className="text-gray-600">Working on it…</p>
      )}

      {session.status === "awaiting_input" && session.pendingQuestion && (
        <QuestionForm
          sessionId={id}
          question={session.pendingQuestion}
          onAnswered={(updated) => setSession({ ...session, ...updated })}
        />
      )}

      {session.status === "error" && (
        <p className="rounded-lg bg-red-50 p-4 text-red-700">{session.error}</p>
      )}

      {session.status === "done" && session.resultEvents && (
        <div className="flex flex-col gap-4">
          <ul className="flex flex-col divide-y rounded-lg border">
            {session.resultEvents.map((ev, i) => (
              <li key={i} className="px-4 py-3">
                <p className="font-medium">{ev.title}</p>
                <p className="text-sm text-gray-500">
                  {new Date(ev.start).toLocaleString()} — {new Date(ev.end).toLocaleString()}
                  {ev.rrule ? ` · repeats: ${ev.rrule}` : ""}
                </p>
                {ev.location && <p className="text-sm text-gray-500">{ev.location}</p>}
              </li>
            ))}
          </ul>
          <a
            href={`/api/sessions/${id}/ics`}
            className="w-fit rounded-lg bg-black px-4 py-2 font-medium text-white"
          >
            Download .ics
          </a>
        </div>
      )}
    </div>
  );
}

function QuestionForm({
  sessionId,
  question,
  onAnswered,
}: {
  sessionId: string;
  question: PendingQuestion;
  onAnswered: (updated: Partial<SessionData>) => void;
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
