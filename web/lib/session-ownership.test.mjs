import test from "node:test";
import assert from "node:assert/strict";
import { ObjectId } from "mongodb";
import { loadTs } from "../test/load-ts.mjs";

test("session lookup scopes valid IDs to the authenticated owner", async () => {
  let filter;
  const { getOwnedSession, NotFoundError } = loadTs("../lib/sessions.ts", {
    "./mongodb": { getDb: async () => ({ collection: () => ({ findOne: async (query) => { filter = query; return null; } }) }) },
    "./ics": {},
  });
  const id = new ObjectId().toString();
  await assert.rejects(getOwnedSession(id, "attacker"), NotFoundError);
  assert.equal(filter.userId, "attacker");
  assert.equal(filter._id.toString(), id);
});

test("invalid session IDs return not found without a database query", async () => {
  const { getOwnedSession, NotFoundError } = loadTs("../lib/sessions.ts", {
    "./mongodb": { getDb: () => { throw new Error("Should not query"); } },
    "./ics": {},
  });
  await assert.rejects(getOwnedSession("not-an-id", "owner"), NotFoundError);
});
