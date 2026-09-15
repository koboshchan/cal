import { auth, clerkClient } from "@clerk/nextjs/server";
import { getDb } from "./mongodb";
import type { UserDoc } from "./types";

export class UnauthorizedError extends Error {}
export class ForbiddenError extends Error {}

/**
 * Verifies the caller via Clerk — either a browser cookie session (web) or
 * an `Authorization: Bearer <token>` session token (native iOS) — and
 * upserts a matching Mongo `users` doc, lazily.
 */
export async function requireUser(): Promise<UserDoc> {
  // "session_token" (not "any"): both the web cookie session and the iOS
  // ClerkKit bearer token are session tokens — we don't accept Clerk API
  // keys / M2M tokens, so this also narrows away that half of the union.
  const authObject = await auth({ acceptsToken: "session_token" });
  if (!authObject.userId) throw new UnauthorizedError("Not signed in");
  const clerkUserId = authObject.userId;

  const db = await getDb();
  const users = db.collection<UserDoc>("users");

  const existing = await users.findOne({ clerkUserId });
  if (existing) return existing;

  const client = await clerkClient();
  const clerkUser = await client.users.getUser(clerkUserId);
  const email =
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress ??
    "";

  // Admin is granted by hand, in the Clerk dashboard (user -> Metadata ->
  // Private -> Edit -> {"admin": true}) — never automatically. Every new
  // user gets an explicit `admin: false` here so the field always exists
  // ready to flip, rather than needing to be typed from scratch.
  if (clerkUser.privateMetadata?.admin === undefined) {
    await client.users.updateUserMetadata(clerkUserId, {
      privateMetadata: { ...clerkUser.privateMetadata, admin: false },
    });
  }

  const doc: UserDoc = {
    clerkUserId,
    email,
    createdAt: new Date(),
  };

  // upsert (not insertOne) so a duplicate concurrent request for the same
  // clerkUserId just re-reads the winner's doc instead of erroring on the
  // unique index (see ensureIndexes in lib/mongodb.ts).
  await users.updateOne(
    { clerkUserId },
    { $setOnInsert: doc },
    { upsert: true },
  );
  return (await users.findOne({ clerkUserId }))!;
}

/**
 * Clerk's private metadata is the source of truth for admin status — set by
 * hand in the dashboard, not cached on the Mongo user doc — so this always
 * reads it live rather than trusting anything stored locally.
 */
export async function isAdmin(user: UserDoc): Promise<boolean> {
  const client = await clerkClient();
  const clerkUser = await client.users.getUser(user.clerkUserId);
  return clerkUser.privateMetadata?.admin === true;
}

export async function requireAdmin(): Promise<UserDoc> {
  const user = await requireUser();
  if (!(await isAdmin(user))) throw new ForbiddenError("Admin only");
  return user;
}
