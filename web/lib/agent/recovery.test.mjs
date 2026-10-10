import test from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "../../test/load-ts.mjs";

function agent() {
  return loadTs("../lib/agent/run.ts", {
    ai: { APICallError: { isInstance: () => false } },
    "./provider": {}, "./systemPrompt": { SYSTEM_PROMPT: "" },
    "./tools": {}, "../ics": {}, "../timezone": {},
  });
}

test("retry clears a failed generation without losing prior events", () => {
  const { startRefinement } = agent();
  const events = [{ title: "Manually edited event" }];
  const session = { messages: [], status: "error", error: "Provider unavailable",
    pendingQuestions: [{ question: "Old question" }], resultEvents: events };
  startRefinement(session, "Retry the original request");
  assert.equal(session.status, "running");
  assert.equal(session.error, undefined);
  assert.equal(session.pendingQuestions, undefined);
  assert.equal(session.resultEvents, events);
  assert.equal(session.latestPatchedEvents, null);
});

test("new generation clears stale error and question fields", () => {
  const { initializeSession } = agent();
  const session = { userPrompt: "Study", inputEvents: [], error: "Old failure",
    pendingQuestions: [{ question: "Old question" }] };
  initializeSession(session);
  assert.equal(session.error, undefined);
  assert.equal(session.pendingQuestions, undefined);
});
