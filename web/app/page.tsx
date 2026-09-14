import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { getDb } from "@/lib/mongodb";
import type { AgentSessionDoc } from "@/lib/types";
import NewSessionForm from "./new-session-form";

export default async function Home() {
  const { userId } = await auth();

  if (!userId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
        <h1 className="text-3xl font-semibold">Describe your schedule. Get a calendar.</h1>
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
    <div className="mx-auto flex max-w-2xl flex-col gap-10 px-6 py-12">
      <section>
        <h1 className="mb-4 text-2xl font-semibold">New schedule</h1>
        <NewSessionForm />
      </section>

      {sessions.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-medium text-gray-700">Past sessions</h2>
          <ul className="flex flex-col divide-y rounded-lg border">
            {sessions.map((s) => (
              <li key={s._id!.toString()}>
                <Link
                  href={`/sessions/${s._id!.toString()}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                >
                  <span>{s.title}</span>
                  <span className="text-sm text-gray-500">{s.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
