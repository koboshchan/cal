import test from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "../test/load-ts.mjs";

function handler() {
  const state = { images: 0, saved: null };
  const { POST } = loadTs("../app/api/sessions/route.ts", {
    "@/lib/auth": { requireUser: async () => ({ clerkUserId: "owner" }) },
    "@/lib/api-errors": { handleApiError: (error) => { throw error; } },
    "@/lib/mongodb": { getDb: async () => ({ collection: () => ({ insertOne: async (session) => { state.saved = session; return { insertedId: "new-calendar" }; } }) }) },
    "@/lib/ics": { parseIcs: () => [] },
    "@/lib/agent/vision": { describeImages: async (images) => { state.images = images.length; return "Club timetable"; } },
    "@/lib/agent/summarize": { summarizeRequest: async () => ({ title: "Clubs", description: "Club schedule" }) },
    "@/lib/agent/run": { initializeSession: () => {} },
    "@/lib/sessions": { serializeSessionDetail: (session) => ({ id: session._id }) },
  }, { File, Response, Buffer });
  return { POST, state };
}

test("photo-only creation reaches vision and returns the calendar to open", async () => {
  const { POST, state } = handler();
  const form = new FormData();
  form.append("imageFiles", new File(["fixture"], "schedule.png", { type: "image/png" }));
  form.set("timezone", "America/Vancouver");
  const response = await POST({ formData: async () => form });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { id: "new-calendar" });
  assert.equal(state.images, 1);
  assert.equal(state.saved.userId, "owner");
  assert.equal(state.saved.timezone, "America/Vancouver");
});

test("empty or fake file inputs show a usable validation error", async () => {
  const { POST, state } = handler();
  const form = new FormData();
  form.set("icsFile", "not a file");
  const response = await POST({ formData: async () => form });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /schedule photo/);
  assert.equal(state.saved, null);
});
