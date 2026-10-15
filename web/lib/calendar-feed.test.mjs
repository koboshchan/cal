import test from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "../test/load-ts.mjs";

test("concurrent feed creation returns one persisted credential", async () => {
  let saved;
  let initialReads = 0;
  let release;
  const bothRead = new Promise((resolve) => { release = resolve; });
  const users = {
    async findOne() {
      if (initialReads < 2) {
        initialReads++;
        if (initialReads === 2) release();
        await bothRead;
        return { clerkUserId: "owner" };
      }
      return { clerkUserId: "owner", calendarFeedToken: saved };
    },
    async updateOne(filter, update) {
      assert.equal(filter.clerkUserId, "owner");
      assert.equal(filter.calendarFeedToken.$exists, false);
      if (!saved) saved = update.$set.calendarFeedToken;
    },
  };
  const { getOrCreateFeedToken } = loadTs("../lib/calendar-feed.ts", {
    "./mongodb": { getDb: async () => ({ collection: () => users }) },
    "./ics": {},
  });
  const [first, second] = await Promise.all([getOrCreateFeedToken("owner"), getOrCreateFeedToken("owner")]);
  assert.match(first, /^[a-f0-9]{48}$/);
  assert.equal(first, second);
  assert.equal(first, saved);
});

test("malformed feed credentials are rejected before database access", async () => {
  const { generateFeedIcsForToken } = loadTs("../lib/calendar-feed.ts", {
    "./mongodb": { getDb: () => { throw new Error("Should not query"); } },
    "./ics": {},
  });
  for (const token of ["", "owner", "x".repeat(48), "a".repeat(49)]) {
    assert.equal(await generateFeedIcsForToken(token), null);
  }
});
