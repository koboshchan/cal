"use client";

import { useEffect, useRef, useState } from "react";
import QuestionForm from "@/app/session-question-form";
import type { SessionData } from "@/app/session-types";

const POLL_MS = 700;

export default function SessionView({ id }: { id: string }) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stoppedRef = useRef(false);

  function handleUpdate(data: SessionData) {
    if (stoppedRef.current) return;
    setSession(data);
    setLoadError(null);
    if (data.status === "running") {
      timerRef.current = setTimeout(advance, POLL_MS);
    }
    // "awaiting_input", "done", "error" just render and wait for the next
    // user action (answering, refining, deleting) to feed a fresh update
    // back through handleUpdate, which restarts polling if that goes
    // straight back to "running".
  }

  async function advance() {
    try {
      const res = await fetch(`/api/sessions/${id}/continue`, { method: "POST" });
      const data = await res.json();
      if (stoppedRef.current) return;
      if (!res.ok) {
        setLoadError(data.error || "Failed to load session");
        return;
      }
      handleUpdate(data);
    } catch (err) {
      if (!stoppedRef.current) setLoadError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    stoppedRef.current = false;
    advance();
    return () => {
      stoppedRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loadError) return <p className="p-8 text-red-600">{loadError}</p>;
  if (!session) return <p className="p-8 text-gray-500">Loading…</p>;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12">
      <div>
        <h1 className="text-2xl font-semibold">{session.title}</h1>
        {session.description && <p className="mt-1 text-gray-600">{session.description}</p>}
      </div>
      <p className="text-sm text-gray-500">
        Status: <span className="font-medium">{session.status.replace("_", " ")}</span>
      </p>

      {session.status === "running" && (
        <div className="flex items-center gap-3">
          <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-gray-300 border-t-black" />
          <p className="text-gray-600">{session.currentStage ?? "Working on it…"}</p>
        </div>
      )}

      {session.status === "awaiting_input" && session.pendingQuestions && (
        <QuestionForm sessionId={id} questions={session.pendingQuestions} onAnswered={handleUpdate} />
      )}

      {session.status === "error" && (
        <p className="rounded-lg bg-red-50 p-4 text-red-700">{session.error}</p>
      )}

      {(session.status === "done" || session.status === "error") && (
        <RefineForm sessionId={id} onRefined={handleUpdate} />
      )}

      {session.status === "done" && session.resultEvents && (
        <div className="flex flex-col gap-4">
          <ul className="flex flex-col divide-y rounded-lg border">
            {session.resultEvents.map((ev, i) => (
              <li key={i} className="flex items-start justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium">{ev.title}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(ev.start).toLocaleString()} — {new Date(ev.end).toLocaleString()}
                    {ev.rrule ? ` · repeats: ${ev.rrule}` : ""}
                  </p>
                  {ev.location && <p className="text-sm text-gray-500">{ev.location}</p>}
                </div>
                <DeleteEventButton sessionId={id} eventIndex={i} onDeleted={handleUpdate} />
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

function DeleteEventButton({
  sessionId,
  eventIndex,
  onDeleted,
}: {
  sessionId: string;
  eventIndex: number;
  onDeleted: (updated: SessionData) => void;
}) {
  const [deleting, setDeleting] = useState(false);

  async function onClick() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/events/${eventIndex}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete event");
      onDeleted(data);
    } catch {
      setDeleting(false);
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={deleting}
      aria-label="Remove event"
      className="shrink-0 rounded-full px-2 py-1 text-sm text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
    >
      ✕
    </button>
  );
}

function RefineForm({
  sessionId,
  onRefined,
}: {
  sessionId: string;
  onRefined: (updated: SessionData) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit change");
      onRefined(data);
      setPrompt("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={'Ask for a change — e.g. "move gym to 6am"'}
          className="flex-1 rounded-lg border px-3 py-2"
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <button
          onClick={submit}
          disabled={submitting || !prompt.trim()}
          className="rounded-lg border px-4 py-2 font-medium disabled:opacity-50"
        >
          {submitting ? "Working…" : "Refine"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
