import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";
import { generateIcs } from "./ics";
import type { AgentSessionDoc, NormalizedEvent } from "./types";

export class NotFoundError extends Error {}
export class InvalidRequestError extends Error {}

export async function getOwnedSession(
  id: string,
  userId: string,
): Promise<AgentSessionDoc & { _id: ObjectId }> {
  if (!ObjectId.isValid(id)) throw new NotFoundError("Session not found");
  const db = await getDb();
  const session = await db
    .collection<AgentSessionDoc>("sessions")
    .findOne({ _id: new ObjectId(id), userId });
  if (!session) throw new NotFoundError("Session not found");
  return session as AgentSessionDoc & { _id: ObjectId };
}

/** The one JSON shape every session-returning route (create/get/answer/refine/delete-event) sends. */
export function serializeSessionDetail(session: AgentSessionDoc & { _id: ObjectId }) {
  return {
    id: session._id.toString(),
    status: session.status,
    title: session.title,
    description: session.description,
    userPrompt: session.userPrompt,
    currentStage: session.currentStage,
    pendingQuestion: session.pendingQuestion,
    resultEvents: session.resultEvents,
    error: session.error,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

/** Removes one event from a finished session's result, in place, and re-serializes the .ics. */
export async function removeResultEvent(
  session: AgentSessionDoc & { _id: ObjectId },
  eventIndex: number,
): Promise<void> {
  if (session.status !== "done" || !session.resultEvents) {
    throw new InvalidRequestError("Session has no finished result to edit");
  }
  if (!Number.isInteger(eventIndex) || eventIndex < 0 || eventIndex >= session.resultEvents.length) {
    throw new InvalidRequestError("Event index out of range");
  }

  const resultEvents = session.resultEvents.filter((_, i) => i !== eventIndex);
  const resultIcs = generateIcs(resultEvents);
  session.resultEvents = resultEvents;
  session.resultIcs = resultIcs;
  session.updatedAt = new Date();

  const db = await getDb();
  await db
    .collection<AgentSessionDoc>("sessions")
    .updateOne({ _id: session._id }, { $set: { resultEvents, resultIcs, updatedAt: session.updatedAt } });
}

/** Replaces one event in a finished session's result, in place, and re-serializes the .ics. */
export async function updateResultEvent(
  session: AgentSessionDoc & { _id: ObjectId },
  eventIndex: number,
  event: NormalizedEvent,
): Promise<void> {
  if (session.status !== "done" || !session.resultEvents) {
    throw new InvalidRequestError("Session has no finished result to edit");
  }
  if (!Number.isInteger(eventIndex) || eventIndex < 0 || eventIndex >= session.resultEvents.length) {
    throw new InvalidRequestError("Event index out of range");
  }

  const resultEvents = session.resultEvents.map((e, i) => (i === eventIndex ? event : e));
  const resultIcs = generateIcs(resultEvents);
  session.resultEvents = resultEvents;
  session.resultIcs = resultIcs;
  session.updatedAt = new Date();

  const db = await getDb();
  await db
    .collection<AgentSessionDoc>("sessions")
    .updateOne({ _id: session._id }, { $set: { resultEvents, resultIcs, updatedAt: session.updatedAt } });
}

/**
 * Persists the mutable fields `stepSession`/`answerPendingQuestion`/
 * `startRefinement` update on a session. Uses $unset for `pendingQuestion` when it's been
 * cleared — the Mongo driver silently drops `undefined`-valued keys from
 * $set, which would otherwise leave a stale pendingQuestion in place.
 */
export async function persistSession(session: AgentSessionDoc & { _id: ObjectId }) {
  const db = await getDb();
  const { pendingQuestion, ...rest } = session;
  await db.collection<AgentSessionDoc>("sessions").updateOne(
    { _id: session._id },
    {
      $set: {
        status: rest.status,
        messages: rest.messages,
        codeVersions: rest.codeVersions,
        userAnswers: rest.userAnswers,
        resultEvents: rest.resultEvents,
        resultIcs: rest.resultIcs,
        error: rest.error,
        stepCount: rest.stepCount,
        currentStage: rest.currentStage,
        latestPatchedEvents: rest.latestPatchedEvents,
        updatedAt: rest.updatedAt,
        ...(pendingQuestion ? { pendingQuestion } : {}),
      },
      ...(pendingQuestion ? {} : { $unset: { pendingQuestion: "" } }),
    },
  );
}
