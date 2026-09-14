import * as ical from "node-ical";
import IcalGenerator from "ical-generator";
import type { NormalizedEvent } from "./types";

/** `summary`/`location`/`description` may be a bare string or `{val, params}`. */
function textValue(value: string | { val: string } | undefined): string | undefined {
  if (value === undefined) return undefined;
  return typeof value === "string" ? value : value.val;
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
    events.push({
      title: textValue(item.summary) ?? "Untitled event",
      start: new Date(item.start).toISOString(),
      end: new Date(item.end ?? item.start).toISOString(),
      ...(allDay ? { allDay: true } : {}),
      ...(location ? { location } : {}),
      ...(description ? { description } : {}),
      ...(item.rrule ? { rrule: item.rrule.toString().replace(/^RRULE:/, "") } : {}),
    });
  }
  return events;
}

/** Serializes normalized events back out to a downloadable .ics string. */
export function generateIcs(events: NormalizedEvent[]): string {
  const calendar = IcalGenerator({ name: "Cal" });
  for (const event of events) {
    calendar.createEvent({
      summary: event.title,
      start: new Date(event.start),
      end: new Date(event.end),
      allDay: event.allDay ?? false,
      location: event.location,
      description: event.description,
      repeating: event.rrule ?? undefined,
    });
  }
  return calendar.toString();
}
