import { randomBytes } from "crypto";
import { getDb } from "./mongodb";
import { generateIcs } from "./ics";
import type { AgentSessionDoc, UserDoc } from "./types";

/**
 * A live calendar-subscription feed (webcal://…/api/calendar/feed/<token>)
 * merges every finished session's events into one .ics that calendar apps
 * re-fetch periodically — so new schedules show up automatically instead of
 * needing a fresh manual download each time. Calendar apps can't send our
 * normal Clerk bearer token, so this opaque token is the feed's own secret
 * instead of going through requireUser().
 */
export async function getOrCreateFeedToken(clerkUserId: string): Promise<string> {
  const db = await getDb();
  const users = db.collection<UserDoc>("users");

  const existing = await users.findOne({ clerkUserId });
  if (existing?.calendarFeedToken) return existing.calendarFeedToken;

  const token = randomBytes(24).toString("hex");
  await users.updateOne({ clerkUserId }, { $set: { calendarFeedToken: token } });
  return token;
}

export async function generateFeedIcsForToken(token: string): Promise<string | null> {
  const db = await getDb();
  const user = await db.collection<UserDoc>("users").findOne({ calendarFeedToken: token });
  if (!user) return null;

  const sessions = await db
    .collection<AgentSessionDoc>("sessions")
    .find({ userId: user.clerkUserId, status: "done" })
    .project<{ resultEvents: AgentSessionDoc["resultEvents"] }>({ resultEvents: 1 })
    .toArray();

  const events = sessions.flatMap((s) => s.resultEvents ?? []);
  return generateIcs(events);
}
