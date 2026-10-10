import test from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "../test/load-ts.mjs";

test("persisted retry removes stale errors instead of leaving them in Mongo", async () => {
  let update;
  const { persistSession } = loadTs("../lib/sessions.ts", {
    "./mongodb": { getDb: async () => ({ collection: () => ({
      updateOne: async (_filter, value) => { update = value; },
    }) }) }, "./ics": {},
  });
  await persistSession({ _id: "session", status: "running",
    error: undefined, pendingQuestions: undefined });
  assert.equal(update.$unset.error, "");
  assert.equal(update.$unset.pendingQuestions, "");
  assert.equal("error" in update.$set, false);
});

test("persisted failure keeps the actionable error", async () => {
  let update;
  const { persistSession } = loadTs("../lib/sessions.ts", {
    "./mongodb": { getDb: async () => ({ collection: () => ({
      updateOne: async (_filter, value) => { update = value; },
    }) }) }, "./ics": {},
  });
  await persistSession({ _id: "session", status: "error",
    error: "Provider unavailable", pendingQuestions: undefined });
  assert.equal(update.$set.error, "Provider unavailable");
  assert.equal("error" in update.$unset, false);
});
