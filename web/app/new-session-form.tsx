"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import GenerationProgressModal from "./generation-progress-modal";

export default function NewSessionForm() {
  const router = useRouter();
  const [textPrompt, setTextPrompt] = useState("");
  const [timezone, setTimezone] = useState("");
  const [icsFile, setIcsFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!textPrompt.trim() && !icsFile) {
      setError("Describe your schedule or upload an .ics file.");
      return;
    }

    setSubmitting(true);
    try {
      const form = new FormData();
      if (textPrompt.trim()) form.set("textPrompt", textPrompt.trim());
      if (icsFile) form.set("icsFile", icsFile);
      imageFiles.forEach((file) => form.append("imageFiles", file));
      const zone = timezone.trim() || Intl.DateTimeFormat().resolvedOptions().timeZone;
      try { new Intl.DateTimeFormat(undefined, { timeZone: zone }); }
      catch { throw new Error("Enter a valid timezone, such as America/Vancouver."); }
      form.set("timezone", zone);

      const res = await fetch("/api/sessions", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setActiveSessionId(data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <textarea
          value={textPrompt}
          onChange={(e) => setTextPrompt(e.target.value)}
          placeholder="e.g. Gym every weekday at 7am for the next month, plus a dentist appointment next Tuesday at 2pm"
          rows={4}
          className="rounded-lg border px-3 py-2"
        />

        <label className="flex flex-col gap-1 text-sm text-gray-600">
          Schedule timezone (optional)
          <input value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="Automatic, or America/Vancouver" className="rounded-lg border px-3 py-2" />
          <span className="text-xs">Leave blank to use your browser timezone. Set this if your browser is in a different zone.</span>
        </label>

        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex flex-1 flex-col gap-1 text-sm text-gray-600">
            Photos of a schedule (optional)
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setImageFiles(Array.from(e.target.files ?? []))}
              className="text-sm"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm text-gray-600">
            Existing calendar .ics (optional)
            <input
              type="file"
              accept=".ics,text/calendar"
              onChange={(e) => setIcsFile(e.target.files?.[0] ?? null)}
              className="text-sm"
            />
          </label>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-black px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {submitting ? "Starting…" : "Generate calendar"}
        </button>
      </form>

      {activeSessionId && (
        <GenerationProgressModal
          sessionId={activeSessionId}
          onDone={() => router.push(`/sessions/${activeSessionId}`)}
          onClose={() => setActiveSessionId(null)}
        />
      )}
    </>
  );
}
