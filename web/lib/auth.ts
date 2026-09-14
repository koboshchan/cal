import { auth, clerkClient } from "@clerk/nextjs/server";
import { getDb } from "./mongodb";
import type { UserDoc } from "./types";

export class UnauthorizedError extends Error {}
export class ForbiddenError extends Error {}

/**
 * Verifies the caller via Clerk — either a browser cookie session (web) or
 * an `Authorization: Bearer <token>` session token (native iOS) — and
 * upserts a matching Mongo `users` doc, lazily. The very first user ever
 * created becomes `admin`; everyone after is `user`.
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

  const isFirstUser = (await users.countDocuments({}, { limit: 1 })) === 0;
  const doc: UserDoc = {
    clerkUserId,
    email,
    role: isFirstUser ? "admin" : "user",
    createdAt: new Date(),
  };

  // upsert (not insertOne) so a duplicate concurrent request for the same
  // clerkUserId just re-reads the winner's doc instead of erroring on the
  // unique index (see ensureIndexes in lib/mongodb.ts). Two *different* brand-new users
  // signing up in the same instant could theoretically both compute
  // isFirstUser=true and both land as admin — an acceptable, vanishingly
  // unlikely race for a self-hosted admin-bootstrap flow.
  await users.updateOne(
    { clerkUserId },
    { $setOnInsert: doc },
    { upsert: true },
  );
  return (await users.findOne({ clerkUserId }))!;
}

export async function requireAdmin(): Promise<UserDoc> {
  const user = await requireUser();
  if (user.role !== "admin") throw new ForbiddenError("Admin only");
  return user;
}
