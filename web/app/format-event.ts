import type { NormalizedEvent } from "@/lib/types";

export function formatEventTime(event: NormalizedEvent, timeZone?: string): string {
  if (event.allDay) {
    // Calendar dates are not instants; DTEND is exclusive.
    const start = new Date(event.start.slice(0, 10) + "T00:00:00Z");
    const last = new Date(event.end.slice(0, 10) + "T00:00:00Z");
    last.setUTCDate(last.getUTCDate() - 1);
    const format = (date: Date) => date.toLocaleDateString(undefined, { timeZone: "UTC" });
    return format(start) + (last > start ? " – " + format(last) : "") + " · All day";
  }
  const options = timeZone ? { timeZone } : undefined;
  return new Date(event.start).toLocaleString(undefined, options) + " – " + new Date(event.end).toLocaleString(undefined, options);
}
