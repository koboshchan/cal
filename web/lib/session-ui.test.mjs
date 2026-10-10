import test from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "../test/load-ts.mjs";
const { SessionTitleSchema } = loadTs("../lib/session-title.ts");
const { formatEventTime } = loadTs("../app/format-event.ts");

test("rename trims and rejects blank or oversized titles", () => {
  assert.equal(SessionTitleSchema.parse("  Clubs  "), "Clubs");
  assert.equal(SessionTitleSchema.safeParse("  ").success, false);
  assert.equal(SessionTitleSchema.safeParse("a".repeat(121)).success, false);
});
test("all-day display never shifts dates or shows the exclusive end", () => {
  const event = { title: "Clubs", allDay: true, start: "2026-10-15", end: "2026-10-16" };
  const start = new Date("2026-10-15T00:00:00Z").toLocaleDateString(undefined, { timeZone: "UTC" });
  assert.equal(formatEventTime(event, "America/New_York"), start + " · All day");
  const last = new Date("2026-10-16T00:00:00Z").toLocaleDateString(undefined, { timeZone: "UTC" });
  assert.equal(formatEventTime({ ...event, end: "2026-10-17" }), start + " – " + last + " · All day");
});
test("timed display uses the schedule timezone instead of browser/server timezone", () => {
  const event = { title: "Lunch", start: "2026-10-15T19:00:00Z", end: "2026-10-15T20:00:00Z" };
  const zone = "America/Vancouver";
  const expected = new Date(event.start).toLocaleString(undefined, { timeZone: zone }) + " – " + new Date(event.end).toLocaleString(undefined, { timeZone: zone });
  assert.equal(formatEventTime(event, zone), expected);
});
test("timed display prefers the event timezone over the session timezone", () => {
  const event = { title: "Film Club", start: "2026-10-15T22:15:00Z", end: "2026-10-16T00:30:00Z", timezone: "America/Vancouver" };
  const expected = new Date(event.start).toLocaleString(undefined, { timeZone: "America/Vancouver" }) + " – " + new Date(event.end).toLocaleString(undefined, { timeZone: "America/Vancouver" });
  assert.equal(formatEventTime(event, "America/New_York"), expected);
  assert.notEqual(formatEventTime(event, "America/New_York"), formatEventTime({ ...event, timezone: undefined }, "America/New_York"));
});
