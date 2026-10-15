import test from 'node:test';
import assert from 'node:assert/strict';
import ICAL from 'ical.js';
import { loadTs } from '../test/load-ts.mjs';
const { generateIcs, parseIcs } = loadTs('../lib/ics.ts');
const { zonedTimeToUtc, formatInZone } = loadTs('../lib/timezone.ts');
const { NormalizedEventSchema } = loadTs('../lib/types.ts');
const film = { title: 'Film Club', start: '2026-10-15T22:15:00Z', end: '2026-10-16T00:30:00Z', timezone: 'America/Vancouver', rrule: 'FREQ=WEEKLY;BYDAY=TH;COUNT=5' };

test('weekly Film Club keeps 15:15 through Vancouver permanent UTC-7 in November 2026', () => {
  const output = generateIcs([film]);
  assert.match(output, /DTSTART;TZID=America\/Vancouver:20261015T151500/);
  assert.match(output, /DTEND;TZID=America\/Vancouver:20261015T173000/);
  // Expand local recurrence fields independently of the host ICU database.
  const event = new ICAL.Component(ICAL.parse(output)).getFirstSubcomponent('vevent');
  const iterator = event.getFirstPropertyValue('rrule').iterator(event.getFirstPropertyValue('dtstart'));
  const dates = [];
  for (let wall = iterator.next(); wall; wall = iterator.next()) {
    const start = zonedTimeToUtc(wall.toString(), film.timezone);
    dates.push(start.toISOString());
    assert.equal(formatInZone(start, film.timezone).slice(11), '15:15:00');
  }
  assert.deepEqual(dates, [
    '2026-10-15T22:15:00.000Z', '2026-10-22T22:15:00.000Z',
    '2026-10-29T22:15:00.000Z', '2026-11-05T22:15:00.000Z',
    '2026-11-12T22:15:00.000Z',
  ]);
});

test('TZID and clean RRULE survive import and re-export', () => {
  const [event] = parseIcs(generateIcs([film]));
  assert.equal(event.timezone, film.timezone);
  assert.equal(event.start, '2026-10-15T22:15:00.000Z');
  assert.deepEqual(event.rrule.split(";").sort(), film.rrule.split(";").sort());
  assert.equal(new ICAL.Component(ICAL.parse(generateIcs([event]))).getFirstSubcomponent("vevent").getAllProperties("dtstart").length, 1);
  assert.match(generateIcs([event]), /DTSTART;TZID=America\/Vancouver:20261015T151500/);
});

test('legacy events default to session zone; explicit event zone takes precedence', () => {
  const { timezone, ...legacy } = film;
  assert.match(generateIcs([legacy], timezone), /DTSTART;TZID=America\/Vancouver:20261015T151500/);
  assert.match(generateIcs([film], 'Asia/Shanghai'), /DTSTART;TZID=America\/Vancouver:20261015T151500/);
  assert.match(generateIcs([legacy]), /DTSTART:20261015T221500Z/);
});

test('all-day events remain date values without TZID', () => {
  const output = generateIcs([{ ...film, start: '2026-10-15', end: '2026-10-16', allDay: true }]);
  assert.match(output, /DTSTART;VALUE=DATE:20261015/);
  assert.doesNotMatch(output, /TZID=/);
});

test('event API schema retains valid zones and rejects invalid zones', () => {
  assert.equal(NormalizedEventSchema.parse(film).timezone, film.timezone);
  assert.equal(NormalizedEventSchema.safeParse({ ...film, timezone: 'Bad/Zone' }).success, false);
});

test('sandbox defaults timezone and honors event-specific timezone', async () => {
  const { runGenerateSchedule } = loadTs('../lib/sandbox/run.ts');
  const input = { existingEvents: [], userPrompt: '', userAnswers: [], now: '2026-10-09T12:00:00', timezone: 'America/Vancouver' };
  const result = await runGenerateSchedule(`function generateSchedule() { return [{title:'Club',start:'2026-10-15T15:15:00',end:'2026-10-15T17:30:00',rrule:'FREQ=WEEKLY'}, {title:'Elsewhere',start:'2026-10-15T15:15:00',end:'2026-10-15T17:30:00',timezone:'Asia/Shanghai'}]; }`, input);
  assert.equal(result.ok, true);
  assert.equal(result.events[0].timezone, input.timezone);
  assert.equal(result.events[0].start, '2026-10-15T22:15:00.000Z');
  assert.equal(result.events[1].start, '2026-10-15T07:15:00.000Z');
});
