import test from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "../test/load-ts.mjs";

for (const [path, method, status] of [
  ["../app/api/sessions/[id]/route.ts", "PATCH", "done"],
  ["../app/api/sessions/[id]/events/[index]/route.ts", "PATCH", "done"],
  ["../app/api/sessions/[id]/answer/route.ts", "POST", "awaiting_input"],
  ["../app/api/sessions/[id]/refine/route.ts", "POST", "done"],
  ["../app/api/admin/settings/route.ts", "PUT", "done"],
]) {
  test(`${method} ${path} rejects malformed and null JSON before writes`, async () => {
    class InvalidRequestError extends Error {}
    class NotFoundError extends Error {}
    class UnauthorizedError extends Error {}
    class ForbiddenError extends Error {}
    class NotConfiguredError extends Error {}
    let writes = 0;
    const mocks = {
      "@/lib/auth": { requireUser: async () => ({ clerkUserId: "owner" }), requireAdmin: async () => ({ clerkUserId: "owner" }) },
      "./auth": { UnauthorizedError, ForbiddenError },
      "./agent/provider": { NotConfiguredError },
      "./sessions": { InvalidRequestError, NotFoundError },
      "@/lib/sessions": {
        getOwnedSession: async (_id, owner) => { assert.equal(owner, "owner"); return { status }; },
        persistSession: async () => { writes++; },
        removeResultEvent: async () => { writes++; },
        updateResultEvent: async () => { writes++; },
        serializeSessionDetail: () => ({}),
      },
      "@/lib/agent/run": { startRefinement: () => { writes++; }, stepSession: async () => { writes++; }, answerPendingQuestions: () => { writes++; } },
      "@/lib/mongodb": { getDb: async () => { writes++; throw new Error("Should not write"); } },
    };
    const globals = { Response, SyntaxError };
    mocks["@/lib/api-errors"] = loadTs("../lib/api-errors.ts", mocks, globals);
    mocks["@/lib/request-json"] = loadTs("../lib/request-json.ts", mocks, globals);
    mocks["@/lib/types"] = loadTs("../lib/types.ts", mocks, globals);
    mocks["@/lib/session-title"] = loadTs("../lib/session-title.ts", mocks, globals);
    const handler = loadTs(path, mocks, globals)[method];
    for (const json of [
      async () => { throw new SyntaxError("Unexpected end of JSON input"); },
      async () => null,
    ]) {
      const response = await handler({ json }, { params: Promise.resolve({ id: "owned", index: "0" }) });
      assert.equal(response.status, 400);
      assert.equal(writes, 0);
    }
  });
}
