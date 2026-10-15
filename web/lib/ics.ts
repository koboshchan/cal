import * as ical from "node-ical";
import IcalGenerator, { ICalAlarmType } from "ical-generator";
import moment from "moment-timezone";
import ICAL from "ical.js";
import { isValidTimezone, zonedTimeToUtc } from "./timezone";
import { bundledVtimezone } from "./vtimezone";
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

function localDate(value: Date): string {
  // node-ical represents VALUE=DATE using local midnight, not a UTC instant.
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Parses raw .ics text into plain, sandbox/model-safe JSON events. */
export function parseIcs(icsText: string): NormalizedEvent[] {
  const parsed = ical.sync.parseICS(icsText);
  const events: NormalizedEvent[] = [];
  // node-ical still handles text, custom zones and legacy input. Read original
  // wall fields through a standards parser so stale host ICU cannot alter IANA imports.
  const components = new ICAL.Component(ICAL.parse(icsText)).getAllSubcomponents("vevent");
  const byUid = new Map(components.filter((component) => !component.hasProperty("recurrence-id")).map((component) => [
    String(component.getFirstPropertyValue("uid")), component,
  ]));

  for (const raw of Object.values(parsed)) {
    // node-ical's CalendarComponent union doesn't discriminate cleanly
    // through TS's control-flow narrowing (Record<string, unknown> mixed
    // into the intersection types), so guard + cast explicitly.
    if (!raw || raw.type !== "VEVENT") continue;
    const item = raw as ical.VEvent;
    const allDay = item.datetype === "date";
    const component = byUid.get(item.uid);
    const originalInstant = (name: string, fallback: Date): string => {
      const property = component?.getFirstProperty(name);
      const zone = property?.getParameter("tzid");
      const value = property?.getFirstValue();
      if (typeof zone === "string" && isValidTimezone(zone) && value instanceof ICAL.Time && !value.isDate) {
        return zonedTimeToUtc(value.toString(), zone).toISOString();
      }
      return new Date(fallback).toISOString();
    };
    const location = textValue(item.location);
    const description = textValue(item.description);
    const zone = (item.start as Date & { tz?: string }).tz;
    events.push({
      title: textValue(item.summary) ?? "Untitled event",
      start: allDay ? localDate(item.start) : originalInstant("dtstart", item.start),
      end: allDay ? localDate(item.end ?? item.start) : originalInstant(item.end ? "dtend" : "dtstart", item.end ?? item.start),
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
  calendar.timezone({ name: null, generator: bundledVtimezone });
  for (const event of events) {
    const zone = event.allDay ? undefined : event.timezone ?? defaultTimezone;
    if (zone && !isValidTimezone(zone)) throw new Error(`Invalid event timezone: ${zone}`);
    // Moment objects carry bundled zone rules through the serializer, independent of ICU/server TZ.
    const createdEvent = calendar.createEvent({
      summary: event.title,
      start: zone ? moment.tz(event.start, moment.ISO_8601, true, zone) : new Date(event.start),
      end: zone ? moment.tz(event.end, moment.ISO_8601, true, zone) : new Date(event.end),
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
