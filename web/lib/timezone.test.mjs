import test from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "../test/load-ts.mjs";
const { zonedTimeToUtc } = loadTs("../lib/timezone.ts");
const utc = (value, zone = "America/New_York") => zonedTimeToUtc(value, zone).toISOString();

test("uses the offset at the resulting instant, not at the naive UTC guess", () => {
  assert.equal(utc("2025-03-09T07:00:00"), "2025-03-09T11:00:00.000Z");
  assert.equal(utc("2025-11-02T07:00:00"), "2025-11-02T12:00:00.000Z");
});
test("DST gaps and folds follow RFC 5545 compatible disambiguation", () => {
  assert.equal(utc("2025-03-09T02:30:00"), "2025-03-09T07:30:00.000Z");
  assert.equal(utc("2025-11-02T01:30:00"), "2025-11-02T05:30:00.000Z");
});
test("explicit offsets are not converted again; fractional offsets work", () => {
  assert.equal(utc("2025-11-02T01:30:00-05:00"), "2025-11-02T06:30:00.000Z");
  assert.equal(utc("2025-01-02T09:00:00", "Asia/Kathmandu"), "2025-01-02T03:15:00.000Z");
});
test("invalid calendar dates are rejected instead of silently rolling over", () => {
  assert.throws(() => utc("2025-02-30T09:00:00"));
  assert.throws(() => utc("not a date"));
});
