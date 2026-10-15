import * as ical from "node-ical";
import IcalGenerator, { ICalAlarmType } from "ical-generator";
import { DateTime } from "luxon";
import { isValidTimezone } from "./timezone";
import type { NormalizedEvent } from "./types";

/** `summary`/`location`/`description` may be a bare string or `{val, params}`. */
function textValue(value: string | { val: string } | undefined): string | undefined {
  if (value === undefined) return undefined;
  return typeof value === "string" ? value : value.val;
}

/** Parses alarm trigger in seconds from number or user-facing string description */
export function parseAlarmTriggerSeconds(trigger: number | string): number | null {
  if (typeof trigger === "number") {
    if (isNaN(trigger)) return null;
    if (trigger === 1440) return 86400; // minutes to seconds
    if (trigger === 60) return 3600;
    if (trigger === 5) return 300;
    return trigger;
  }
  const str = String(trigger).toLowerCase().trim();
  if (str.includes("day")) {
    const days = parseInt(str) || 1;
    return days * 86400;
  }
  if (str.includes("hour")) {
    const hours = parseInt(str) || 1;
    return hours * 3600;
  }
  if (str.includes("min")) {
    const mins = parseInt(str) || 5;
    return mins * 60;
  }
  const num = parseInt(str);
  return isNaN(num) ? null : num;
}

/** Parses raw .ics text into plain, sandbox/model-safe JSON events. */
export function parseIcs(icsText: string): NormalizedEvent[] {
  const parsed = ical.sync.parseICS(icsText);
  const events: NormalizedEvent[] = [];

  for (const raw of Object.values(parsed)) {
    // node-ical's CalendarComponent union doesn't discriminate cleanly
    // through TS's control-flow narrowing (Record<string, unknown> mixed
    // into the intersection types), so guard + cast explicitly.
    if (!raw || raw.type !== "VEVENT") continue;
    const item = raw as ical.VEvent;
    const allDay = item.datetype === "date";
    const location = textValue(item.location);
    const description = textValue(item.description);
    const zone = (item.start as Date & { tz?: string }).tz;
    events.push({
      title: textValue(item.summary) ?? "Untitled event",
      start: new Date(item.start).toISOString(),
      end: new Date(item.end ?? item.start).toISOString(),
      ...(allDay ? { allDay: true } : {}),
      ...(!allDay && zone && isValidTimezone(zone) ? { timezone: zone } : {}),
      ...(location ? { location } : {}),
      ...(description ? { description } : {}),
      ...(item.rrule ? { rrule: item.rrule.toString().split(/\r?\n/).find((line) => line.startsWith("RRULE:"))?.slice(6) } : {}),
    });
  }
  return events;
}

/** Serializes normalized events back out to a downloadable .ics string. */
export function generateIcs(events: NormalizedEvent[], defaultTimezone?: string): string {
  const calendar = IcalGenerator({ name: "Cal" });
  for (const event of events) {
    const zone = event.allDay ? undefined : event.timezone ?? defaultTimezone;
    if (zone && !isValidTimezone(zone)) throw new Error(`Invalid event timezone: ${zone}`);
    // Luxon gives the serializer real zone-aware wall times, independent of server TZ.
    const createdEvent = calendar.createEvent({
      summary: event.title,
      start: zone ? DateTime.fromISO(event.start, { zone }) : new Date(event.start),
      end: zone ? DateTime.fromISO(event.end, { zone }) : new Date(event.end),
      timezone: zone,
      allDay: event.allDay ?? false,
      location: event.location,
      description: event.description,
      repeating: event.rrule ?? undefined,
    });

    if (event.alarms) {
      const alarmList = Array.isArray(event.alarms) ? event.alarms : [event.alarms];
      for (const rawAlarm of alarmList) {
        const seconds = parseAlarmTriggerSeconds(rawAlarm);
        if (seconds !== null && seconds > 0) {
          createdEvent.createAlarm({
            type: ICalAlarmType.display,
            trigger: seconds,
            description: event.title,
          });
        }
      }
    }
  }
  return calendar.toString();
}
