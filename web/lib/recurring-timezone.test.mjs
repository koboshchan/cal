import test from 'node:test';
import assert from 'node:assert/strict';
import * as ical from 'node-ical';
import { loadTs } from '../test/load-ts.mjs';
const { generateIcs, parseIcs } = loadTs('../lib/ics.ts');
const { NormalizedEventSchema } = loadTs('../lib/types.ts');
const film = { title: 'Film Club', start: '2026-10-15T22:15:00Z', end: '2026-10-16T00:30:00Z', timezone: 'America/Vancouver', rrule: 'FREQ=WEEKLY;BYDAY=TH;COUNT=5' };

test('weekly Film Club keeps 15:15 through Vancouver fall DST on Nov 1 2026', () => {
  const output = generateIcs([film]);
  assert.match(output, /DTSTART;TZID=America\/Vancouver:20261015T151500/);
  assert.match(output, /DTEND;TZID=America\/Vancouver:20261015T173000/);
  const event = Object.values(ical.sync.parseICS(output)).find(e => e.type === 'VEVENT');
  const dates = ical.expandRecurringEvent(event, { from: new Date('2026-10-14Z'), to: new Date('2026-11-14Z') });
  assert.equal(dates.length, 5);
  for (const date of dates) {
    assert.equal(new Intl.DateTimeFormat('en-GB', { timeZone: film.timezone, hour: '2-digit', minute: '2-digit' }).format(date.start), '15:15');
    assert.equal(new Intl.DateTimeFormat('en-GB', { timeZone: film.timezone, hour: '2-digit', minute: '2-digit' }).format(date.end), '17:30');
  }
  assert.equal(dates[2].start.toISOString(), '2026-10-29T22:15:00.000Z');
  assert.equal(dates[3].start.toISOString(), '2026-11-05T23:15:00.000Z');
});

test('TZID and clean RRULE survive import and re-export', () => {
  const [event] = parseIcs(generateIcs([film]));
  assert.equal(event.timezone, film.timezone);
  assert.equal(event.start, '2026-10-15T22:15:00.000Z');
  assert.deepEqual(event.rrule.split(";").sort(), film.rrule.split(";").sort());
  assert.equal((generateIcs([event]).match(/DTSTART/g) ?? []).length, 1);
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
