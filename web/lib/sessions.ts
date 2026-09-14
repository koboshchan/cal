import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";
import type { AgentSessionDoc } from "./types";

export class NotFoundError extends Error {}

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

/** The one JSON shape every session-returning route (create/get/answer) sends. */
export function serializeSessionDetail(session: AgentSessionDoc & { _id: ObjectId }) {
  return {
    id: session._id.toString(),
    status: session.status,
    title: session.title,
    userPrompt: session.userPrompt,
    pendingQuestion: session.pendingQuestion,
    resultEvents: session.resultEvents,
    error: session.error,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

/**
 * Persists the mutable fields `runInitialTurn`/`continueSessionWithAnswer`
 * update on a session. Uses $unset for `pendingQuestion` when it's been
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
        updatedAt: rest.updatedAt,
        ...(pendingQuestion ? { pendingQuestion } : {}),
      },
      ...(pendingQuestion ? {} : { $unset: { pendingQuestion: "" } }),
    },
  );
}
