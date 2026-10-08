"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import QuestionForm from "@/app/session-question-form";
import { formatEventTime } from "@/app/format-event";
import { formatRRule } from "@/app/format-rrule";
import type { SessionData } from "@/app/session-types";

const POLL_MS = 700;

export default function SessionView({ id }: { id: string }) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stoppedRef = useRef(false);
  const inFlightRef = useRef(false);

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
    if (inFlightRef.current) return;
    inFlightRef.current = true;
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
    } finally {
      inFlightRef.current = false;
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

  if (!session) return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-5 py-10">
      <Link href="/" className="w-fit text-sm text-gray-500">Back to calendars</Link>
      {loadError ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5">
        <p className="font-medium">Could not open this calendar</p><p className="mt-2 text-sm text-red-700">{loadError}</p>
        <button onClick={() => { setLoadError(null); advance(); }} className="mt-4 min-h-11 rounded-lg border px-4 text-sm">Try again</button>
      </div> : <div role="status" className="rounded-xl border bg-white p-6"><p className="font-medium">Opening your calendar…</p><p className="mt-2 text-sm text-gray-500">Checking saved events and any unfinished work.</p></div>}
    </div>
  );

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-5 py-10 sm:px-6 sm:py-12">
      <Link href="/" className="w-fit text-sm text-gray-500 hover:text-black">Back to calendars</Link>
      {loadError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4"><p className="text-sm text-red-700">{loadError}</p><button onClick={() => { setLoadError(null); advance(); }} className="mt-3 min-h-11 rounded-lg border px-4 text-sm">Try again</button></div>}
      <div>
        <SessionTitle key={session.id} session={session} onRenamed={(updated) => setSession((current) => current ? { ...current, title: updated.title } : current)} />
        {session.description && <p className="mt-1 text-gray-600">{session.description}</p>}
      </div>
      <p className="text-sm text-gray-500">
        Status: <span className="font-medium">{({ running: "Building your calendar", awaiting_input: "Needs your answer", done: "Ready to review", error: "Needs a change" })[session.status]}</span>
        {session.timezone && ` · ${session.timezone}`}
      </p>

      {session.status === "running" && (
        <div role="status" className="flex items-center gap-3 rounded-xl border bg-white p-5">
          <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-gray-300 border-t-black" />
          <p className="text-gray-600">{session.currentStage ?? "Working on it…"}</p>
        </div>
      )}

      {session.userAnswers && session.userAnswers.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border p-4">
          {session.userAnswers.map((qa, i) => (
            <div key={i}>
              <p className="text-sm text-gray-500">{qa.question}</p>
              <p className="font-medium">{qa.answer}</p>
            </div>
          ))}
        </div>
      )}

      {session.status === "awaiting_input" && session.pendingQuestions && (
        <QuestionForm key={JSON.stringify(session.pendingQuestions)} sessionId={id} questions={session.pendingQuestions} onAnswered={handleUpdate} />
      )}

      {session.status === "error" && (
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">{session.error}</p>
      )}

      {session.status === "done" && session.resultEvents && (
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">{session.resultEvents.length} event{session.resultEvents.length === 1 ? "" : "s"}</h2>
          {session.resultEvents.length === 0 && <div className="rounded-xl border border-dashed p-6 text-center"><p className="font-medium">No events yet</p><p className="mt-2 text-sm text-gray-500">Ask for a change below to add dates or appointments.</p></div>}
          <ul className="flex flex-col divide-y rounded-xl border bg-white empty:hidden">
            {session.resultEvents.map((ev, i) => (
              <li key={i} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0 break-words">
                  <p className="font-medium">{ev.title}</p>
                  <p className="text-sm text-gray-500">
                    {formatEventTime(ev, session.timezone)}
                    {ev.rrule ? ` · repeats: ${formatRRule(ev.rrule)}` : ""}
                  </p>
                  {ev.location && <p className="text-sm text-gray-500">{ev.location}</p>}
                </div>
                <DeleteEventButton key={ev.title + ev.start + ev.end} title={ev.title} sessionId={id} eventIndex={i} onDeleted={handleUpdate} />
              </li>
            ))}
          </ul>
          <a
            href={`/api/sessions/${id}/ics`}
            className="w-fit rounded-lg bg-black px-4 py-2 font-medium text-white"
          >
            Download calendar (.ics)
          </a>
          <p className="text-xs text-gray-500">Open the .ics file in your calendar app to import these events.</p>
        </div>
      )}
      {(session.status === "done" || session.status === "error") && <RefineForm sessionId={id} onRefined={handleUpdate} />}
    </div>
  );
}

function DeleteEventButton({
  title,
  sessionId,
  eventIndex,
  onDeleted,
}: {
  sessionId: string;
  eventIndex: number;
  title: string;
  onDeleted: (updated: SessionData) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (deleting || !window.confirm('Remove "' + title + '" from your calendar?')) return;
    setError(null);
    setDeleting(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/events/${eventIndex}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete event");
      onDeleted(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
    <button
      onClick={onClick}
      disabled={deleting}
      aria-label={"Remove " + title}
      className="min-h-11 min-w-11 rounded-lg px-2 py-1 text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
    >
      {deleting ? "…" : "✕"}
    </button>
    {error && <p role="alert" className="max-w-32 text-xs text-red-600">{error}</p>}
    </div>
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
    if (submitting || !trimmed) return;
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
    <div className="flex flex-col gap-3 rounded-xl border bg-white p-5">
      <label htmlFor="calendar-change" className="font-medium">Want to change anything?</label>
      <p className="text-sm text-gray-500">Add an event, move a time, or describe what should be different.</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="calendar-change"
          disabled={submitting}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={'Ask for a change — e.g. "move gym to 6am"'}
          className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-base"
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <button
          onClick={submit}
          disabled={submitting || !prompt.trim()}
          className="rounded-lg border px-4 py-2 font-medium disabled:opacity-50"
        >
          {submitting ? "Updating…" : "Update calendar"}
        </button>
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

function SessionTitle({ session, onRenamed }: { session: SessionData; onRenamed: (data: SessionData) => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(session.title);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (saving || !title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions/" + session.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to rename calendar");
      onRenamed(data);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  if (!editing) return (
    <div className="flex items-start justify-between gap-3">
      <h1 className="min-w-0 break-words text-2xl font-semibold">{session.title}</h1>
      <button disabled={session.status === "running"} className="min-h-11 shrink-0 rounded-lg border px-3 py-1 text-sm disabled:opacity-50" onClick={() => { setTitle(session.title); setError(null); setEditing(true); }}>Rename</button>
    </div>
  );

  return (
    <form onSubmit={save} className="flex flex-col gap-2">
      <label htmlFor="calendar-title" className="text-sm text-gray-600">Calendar name</label>
      <input id="calendar-title" autoFocus maxLength={120} value={title} disabled={saving} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border px-3 py-2" />
      <div className="flex gap-2">
        <button type="submit" disabled={saving || !title.trim()} className="rounded-lg bg-black px-3 py-2 text-sm text-white disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
        <button type="button" disabled={saving} onClick={() => setEditing(false)} className="rounded-lg border px-3 py-2 text-sm">Cancel</button>
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
