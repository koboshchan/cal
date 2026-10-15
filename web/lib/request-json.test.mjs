import test from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "../test/load-ts.mjs";

test("malformed JSON is a client error, not an internal failure", async () => {
  class InvalidRequestError extends Error {}
  const { readJsonBody } = loadTs("../lib/request-json.ts", {
    "./sessions": { InvalidRequestError },
  }, { SyntaxError });
  await assert.rejects(readJsonBody({ json: async () => { throw new SyntaxError("Unexpected end of JSON input"); } }), InvalidRequestError);
  assert.equal(await readJsonBody({ json: async () => null }), null);
  const failure = new Error("Transport failure");
  await assert.rejects(readJsonBody({ json: async () => { throw failure; } }), (error) => error === failure);
});
