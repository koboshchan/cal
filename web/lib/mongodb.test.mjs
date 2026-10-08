import test from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "../test/load-ts.mjs";

test("import is side-effect free; requests connect and ensure indexes once", async () => {
  let connections = 0;
  let indexes = 0;
  const old = process.env.MONGODB_URI;
  delete process.env.MONGODB_URI;
  const db = { collection: () => ({ createIndex: async () => { indexes++; } }) };
  const processMock = { env: { NODE_ENV: "production", MONGODB_URI: undefined } };
  const { getDb } = loadTs("../lib/mongodb.ts", {
    mongodb: { MongoClient: class {
      constructor(uri) { assert.equal(uri, "mongodb://test/cal"); }
      async connect() { connections++; return this; }
      db() { return db; }
    } },
  }, { process: processMock });
  assert.equal(connections, 0);
  await assert.rejects(getDb(), /MONGODB_URI is not set/);
  processMock.env.MONGODB_URI = "mongodb://test/cal";
  const results = await Promise.all([getDb(), getDb()]);
  assert.equal(results[0], db);
  assert.equal(connections, 1);
  assert.equal(indexes, 3);
  if (old !== undefined) process.env.MONGODB_URI = old;
});
