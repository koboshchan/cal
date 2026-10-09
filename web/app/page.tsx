import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { getDb } from "@/lib/mongodb";
import type { AgentSessionDoc } from "@/lib/types";
import NewSessionForm from "./new-session-form";

export default async function Home() {
  const { userId } = await auth();

  if (!userId) {
    return (
      <div className="cal-welcome flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
        <span className="cal-eyebrow">Less planning. More living.</span><h1 className="text-3xl font-semibold">Describe your schedule. Get a calendar.</h1>
        <p className="max-w-md text-gray-600">
          Sign in to describe a schedule in plain text, drop in a photo of a
          timetable, or upload an existing .ics — and get back a clean
          calendar file.
        </p>
      </div>
    );
  }

  const db = await getDb();
  const sessions = await db
    .collection<AgentSessionDoc>("sessions")
    .find({ userId })
    .sort({ createdAt: -1 })
    .project<{ _id: AgentSessionDoc["_id"]; title: string; status: string; createdAt: Date }>({
      title: 1,
      status: 1,
      createdAt: 1,
    })
    .limit(50)
    .toArray();

  return (
    <div className="cal-workspace">
      <section className="cal-composer">
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-gray-500">From plans to dates</p>
        <h1 className="mb-2 text-2xl font-semibold">Make room for your week.</h1>
        <p className="mb-6 text-sm text-gray-500">Describe your plans. Answer any questions. Review and export.</p>
        <NewSessionForm />
      </section>

      <section className="cal-library">
        {sessions.length === 0 ? <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center"><h2 className="font-medium">Your calendars will live here</h2><p className="mt-2 text-sm text-gray-500">Create your first one above. Come back anytime to rename it, make changes, or download it again.</p></div> : <div>
          <h2 className="mb-3 text-lg font-medium text-gray-700">Your calendars</h2>
          <ul className="flex flex-col divide-y rounded-xl border bg-white">
            {sessions.map((s) => (
              <li key={s._id!.toString()}>
                <Link
                  href={`/sessions/${s._id!.toString()}`}
                  className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50"
                >
                  <span className="cal-calendar-title min-w-0 break-words font-medium">{s.title}</span>
                  <span className="cal-status shrink-0 text-xs text-gray-500">{({ done: "Ready", running: "Building", awaiting_input: "Needs answer", error: "Needs change" } as Record<string, string>)[s.status] ?? s.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>}
      </section>
    </div>
  );
}
