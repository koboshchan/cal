import test from "node:test";
import assert from "node:assert/strict";
import ICAL from "ical.js";
import fs from "node:fs";
import { loadTs } from "../test/load-ts.mjs";
const { generateIcs } = loadTs("../lib/ics.ts");
const { zonedTimeToUtc } = loadTs("../lib/timezone.ts");

function calendarReader(events) {
  const output = generateIcs(events);
  const calendar = new ICAL.Component(ICAL.parse(output));
  const zones = calendar.getAllSubcomponents("vtimezone");
  // Independent client reads ONLY the embedded rules, no host Intl or Moment conversion.
  for (const component of zones) {
    ICAL.TimezoneService.register(new ICAL.Timezone({ component }));
  }
  return { calendar, output, zones };
}

test("Nov 1 JSON and embedded ICS agree even for a client without current tzdata", () => {
  ICAL.TimezoneService.reset();
  const events = [
    { title: "Vancouver", timezone: "America/Vancouver", start: "2026-11-01T17:00:00Z", end: "2026-11-01T18:00:00Z", rrule: "FREQ=WEEKLY;COUNT=3" },
    { title: "New York", timezone: "America/New_York", start: "2026-11-01T15:00:00Z", end: "2026-11-01T16:00:00Z", rrule: "FREQ=WEEKLY;COUNT=3" },
  ];
  const { calendar, output, zones } = calendarReader([...events, events[0]]);
  assert.equal(zones.length, 2);
  assert.match(output, /X-TZDB-VERSION:2026e/);
  for (const component of calendar.getAllSubcomponents("vevent")) {
    const event = new ICAL.Event(component);
    const expected = events.find((item) => item.title === event.summary);
    assert.equal(event.startDate.toJSDate().toISOString(), new Date(expected.start).toISOString());
    assert.equal(event.endDate.toJSDate().toISOString(), new Date(expected.end).toISOString());
    const iterator = event.iterator();
    for (let wall = iterator.next(); wall; wall = iterator.next()) {
      assert.equal(wall.hour, 10);
      assert.equal(wall.toJSDate().toISOString(), zonedTimeToUtc(wall.toString(), expected.timezone).toISOString());
    }
  }
  ICAL.TimezoneService.reset();
});

test("embedded New York rules preserve offsets across DST boundaries and fractional-offset zones", () => {
  ICAL.TimezoneService.reset();
  for (const [zone, wall, utc] of [
    ["America/New_York", "2026-03-08T01:30:00", "2026-03-08T06:30:00.000Z"],
    ["America/New_York", "2026-03-08T03:30:00", "2026-03-08T07:30:00.000Z"],
    ["America/New_York", "2026-11-01T00:30:00", "2026-11-01T04:30:00.000Z"],
    ["America/New_York", "2026-11-01T02:30:00", "2026-11-01T07:30:00.000Z"],
    ["Asia/Kathmandu", "2026-11-01T10:00:00", "2026-11-01T04:15:00.000Z"],
    ["UTC", "2026-11-01T10:00:00", "2026-11-01T10:00:00.000Z"],
  ]) {
    const { calendar } = calendarReader([{ title: wall, timezone: zone, start: utc, end: utc }]);
    const start = new ICAL.Event(calendar.getFirstSubcomponent("vevent")).startDate;
    assert.equal(start.toJSDate().toISOString(), utc);
    assert.equal(start.toString().replace(/Z$/, ""), wall);
  }
  ICAL.TimezoneService.reset();
});


test("November 1 sandbox generation JSON and independent ICS client match the fixture", async () => {
  const fixture = JSON.parse(fs.readFileSync(new URL("../test/fixtures/vancouver-nov1-2026.json", import.meta.url), "utf8"));
  const { runGenerateSchedule } = loadTs("../lib/sandbox/run.ts");
  const result = await runGenerateSchedule(
    `function generateSchedule() { return [{title:"Regression",start:"${fixture.wallStart}",end:"${fixture.wallEnd}",rrule:"FREQ=WEEKLY;COUNT=2"}]; }`,
    { existingEvents: [], userPrompt: "", userAnswers: [], now: "2026-10-14T12:00:00", timezone: fixture.timezone },
  );
  assert.equal(result.ok, true);
  assert.equal(result.events[0].start, fixture.expectedStart);
  assert.equal(result.events[0].end, fixture.expectedEnd);
  ICAL.TimezoneService.reset();
  const { calendar, output } = calendarReader(result.events);
  assert.ok(output.includes(fixture.expectedIcsStart));
  const event = new ICAL.Event(calendar.getFirstSubcomponent("vevent"));
  assert.equal(event.startDate.toJSDate().toISOString(), fixture.expectedStart);
  assert.equal(event.endDate.toJSDate().toISOString(), fixture.expectedEnd);
  ICAL.TimezoneService.reset();
});

test("timezone data overhead is bounded per distinct zone for a huge calendar", () => {
  const event = { title: "Ten", timezone: "America/New_York", start: "2026-11-01T15:00:00Z", end: "2026-11-01T16:00:00Z" };
  const one = generateIcs([event]);
  const many = generateIcs(Array.from({ length: 1000 }, () => event));
  const block = (text) => text.match(/BEGIN:VTIMEZONE[\s\S]*?END:VTIMEZONE/)[0];
  assert.equal(block(many), block(one));
  assert.equal((many.match(/BEGIN:VTIMEZONE/g) ?? []).length, 1);
  assert.ok(Buffer.byteLength(block(many)) < 40000);
  assert.ok((block(many).match(/BEGIN:(STANDARD|DAYLIGHT)/g) ?? []).length < 20);
});

test("explicit offset instants remain authoritative and zoneless exports remain UTC", () => {
  const event = { title: "Offset", start: "2026-11-01T10:00:00-08:00", end: "2026-11-01T11:00:00-08:00" };
  const zoneless = generateIcs([event]);
  assert.match(zoneless, /DTSTART:20261101T180000Z/);
  assert.doesNotMatch(zoneless, /BEGIN:VTIMEZONE/);
  ICAL.TimezoneService.reset();
  const { calendar, output } = calendarReader([{ ...event, timezone: "America/Vancouver" }]);
  assert.match(output, /DTSTART;TZID=America\/Vancouver:20261101T110000/);
  assert.equal(new ICAL.Event(calendar.getFirstSubcomponent("vevent")).startDate.toJSDate().toISOString(), "2026-11-01T18:00:00.000Z");
  ICAL.TimezoneService.reset();
});
