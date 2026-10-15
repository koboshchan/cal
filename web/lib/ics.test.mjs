import test from "node:test";
import assert from "node:assert/strict";
import ICAL from "ical.js";
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
  assert.equal(new ICAL.Component(ICAL.parse(generateIcs([event]))).getFirstSubcomponent("vevent").getAllProperties("dtstart").length, 1);
});

test("November Vancouver JSON and ICS round-trip with bundled rules despite stale ICU", () => {
  for (const day of ["2026-11-01", "2026-11-08"]) {
    const event = { title: "Ten", start: day + "T17:00:00Z", end: day + "T18:00:00Z",
      timezone: "America/Vancouver", rrule: "FREQ=WEEKLY;COUNT=2" };
    const output = generateIcs([event]);
    assert.match(output, new RegExp("DTSTART;TZID=America/Vancouver:" + day.replaceAll("-", "") + "T100000"));
    const [roundTrip] = parseIcs(output);
    assert.equal(roundTrip.start, day + "T17:00:00.000Z");
    assert.equal(roundTrip.end, day + "T18:00:00.000Z");
    assert.equal(roundTrip.timezone, event.timezone);
    assert.equal(roundTrip.rrule, event.rrule);
  }
});
