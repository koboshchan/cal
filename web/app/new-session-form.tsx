"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

const EXAMPLES = [
  { label: "Weekly routine", prompt: "Gym every Monday, Wednesday and Friday at 7am for one hour, starting next week." },
  { label: "School clubs", prompt: "Create an all-day calendar for school club meetings. Ask me which dates and rooms to include." },
  { label: "One appointment", prompt: "Dentist next Tuesday at 2pm for one hour, with a reminder the day before." },
];

export default function NewSessionForm() {
  const router = useRouter();
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const [textPrompt, setTextPrompt] = useState("");
  const [timezone, setTimezone] = useState("");
  const [filesKey, setFilesKey] = useState(0);
  const [icsFile, setIcsFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    if (!textPrompt.trim() && !icsFile && imageFiles.length === 0) {
      setError("Describe your schedule, attach a photo, or upload an .ics file.");
      promptRef.current?.focus();
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
      if (!res.ok) throw new Error(data.error || "Could not create your calendar. Your input is still here.");
      // One page owns generation, questions and results. Reloading it resumes progress.
      router.push("/sessions/" + data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="cal-form flex flex-col gap-5" aria-busy={submitting}>
      <fieldset disabled={submitting} className="flex min-w-0 flex-col gap-5 disabled:opacity-60">
        <div className="flex flex-col gap-2">
          <label htmlFor="schedule-request" className="text-sm font-medium">What belongs on your calendar?</label>
          <textarea ref={promptRef} id="schedule-request" name="textPrompt" autoComplete="off" aria-invalid={error ? true : undefined} aria-describedby={error ? "schedule-error" : undefined} value={textPrompt} onChange={(e) => setTextPrompt(e.target.value)}
            placeholder="Include dates, times, how often things repeat, and any reminders. A photo works too."
            rows={5} className="cal-prompt w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-base" />
          <div className="flex flex-wrap gap-2" aria-label="Example schedules">
            {EXAMPLES.map((example) => <button key={example.label} type="button" onClick={() => { if (!textPrompt.trim() || window.confirm("Replace what you typed with this example?")) setTextPrompt(example.prompt); }} className="cal-example min-h-10 rounded-full border border-gray-200 px-3 text-sm text-gray-600 hover:border-gray-900 hover:text-gray-900">{example.label}</button>)}
          </div>
        </div>
        <details className="cal-attachments rounded-xl border border-gray-200 bg-gray-50/70 p-4">
          <summary className="cursor-pointer text-sm font-medium"><span className="cal-disclosure-icon" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="m6 3 5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></span><span>Photos, calendar files & timezone{(imageFiles.length > 0 || icsFile) ? " · files attached" : ""}</span></summary>
          <div className="mt-4 flex min-w-0 flex-col gap-4">
            <label className="flex min-w-0 flex-col gap-2 text-sm text-gray-600">Schedule photos
              <input key={filesKey} type="file" name="imageFiles" accept="image/*" multiple onChange={(e) => setImageFiles(Array.from(e.target.files ?? []))} className="w-full min-w-0 text-sm" />
              {imageFiles.length > 0 && <span role="status">{imageFiles.length} photo{imageFiles.length === 1 ? "" : "s"} attached</span>}
            </label>
            <label className="flex min-w-0 flex-col gap-2 text-sm text-gray-600">Existing .ics calendar
              <input key={filesKey} type="file" name="icsFile" accept=".ics,text/calendar" onChange={(e) => setIcsFile(e.target.files?.[0] ?? null)} className="w-full min-w-0 text-sm" />
              {icsFile && <span role="status" className="break-all">{icsFile.name} attached</span>}
            </label>
            {(icsFile || imageFiles.length > 0) && <button type="button" onClick={() => { setIcsFile(null); setImageFiles([]); setFilesKey((key) => key + 1); }} className="min-h-11 w-fit rounded-lg border px-3 text-sm">Clear attachments</button>}
            <label className="flex flex-col gap-2 text-sm text-gray-600">Schedule timezone
              <input name="timezone" autoComplete="off" spellCheck={false} value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="Automatic, or America/Vancouver" className="min-w-0 rounded-lg border bg-white px-3 py-2 text-base" />
              <span className="text-xs">Automatic uses your browser timezone. Override it when scheduling for another place.</span>
            </label>
          </div>
        </details>
      </fieldset>
      {error && <p id="schedule-error" role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="cal-form-footer flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-gray-500">Review the events before downloading.</p>
        <button type="submit" disabled={submitting} className="cal-primary min-h-11 rounded-lg bg-black px-5 py-3 text-sm font-medium text-white disabled:opacity-60">{submitting ? "Creating your calendar…" : "Create calendar"}</button>
      </div>
      {submitting && <p role="status" className="text-sm text-gray-500">Preparing your calendar. You&apos;ll answer any questions on the next page.</p>}
    </form>
  );
}
