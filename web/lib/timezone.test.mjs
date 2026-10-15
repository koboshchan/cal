import test from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "../test/load-ts.mjs";
const { zonedTimeToUtc, formatInZone, timezoneDataVersion, isValidTimezone } = loadTs("../lib/timezone.ts");
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

test("bundled current data keeps Vancouver at UTC-7 after the cancelled 2026 fallback", () => {
  assert.equal(timezoneDataVersion, "2026e");
  for (const day of ["2026-11-01", "2026-11-08", "2027-01-15"]) {
    assert.equal(utc(day + "T10:00:00", "America/Vancouver"), day + "T17:00:00.000Z");
    assert.equal(formatInZone(new Date(day + "T17:00:00Z"), "America/Vancouver"), day + "T10:00:00");
  }
  assert.equal(utc("2026-11-08T10:00:00", "America/Los_Angeles"), "2026-11-08T18:00:00.000Z");
  assert.equal(isValidTimezone("Bad/Zone"), false);
  assert.throws(() => utc("2026-11-08T10:00:00", "Bad/Zone"));
});
