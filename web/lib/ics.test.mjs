import test from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "../test/load-ts.mjs";
const { parseIcs, generateIcs } = loadTs("../lib/ics.ts");

test("all-day import retains calendar dates and exclusive end, not local midnight instants", () => {
  const [event] = parseIcs([
    "BEGIN:VCALENDAR", "VERSION:2.0", "BEGIN:VEVENT", "UID:clubs",
    "SUMMARY:Clubs", "DTSTART;VALUE=DATE:20261015", "DTEND;VALUE=DATE:20261017",
    "RRULE:FREQ=WEEKLY;COUNT=3", "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n"));
  assert.equal(event.start, "2026-10-15");
  assert.equal(event.end, "2026-10-17");
  assert.equal(event.rrule, "FREQ=WEEKLY;COUNT=3");
  const exported = generateIcs([event]);
  assert.match(exported, /DTSTART;VALUE=DATE:20261015/);
  assert.match(exported, /DTEND;VALUE=DATE:20261017/);
  assert.match(exported, /\r\nRRULE:FREQ=WEEKLY;COUNT=3\r\n/);
  assert.equal((exported.match(/DTSTART/g) ?? []).length, 1);
});

test("timed recurring imports have only a rule, without a second DTSTART", () => {
  const [event] = parseIcs([
    "BEGIN:VCALENDAR", "VERSION:2.0", "BEGIN:VEVENT", "UID:weekly",
    "DTSTART:20261015T190000Z", "DTEND:20261015T200000Z",
    "RRULE:FREQ=WEEKLY;BYDAY=TH", "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n"));
  assert.equal(event.rrule, "FREQ=WEEKLY;BYDAY=TH");
  assert.equal((generateIcs([event]).match(/DTSTART/g) ?? []).length, 1);
});
