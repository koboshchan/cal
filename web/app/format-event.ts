import { formatInZone } from "../lib/timezone";
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
  const zone = event.timezone || timeZone;
  const format = (iso: string) => zone
    // UTC is only a formatting carrier for already-converted wall fields.
    ? new Date(formatInZone(new Date(iso), zone) + "Z").toLocaleString(undefined, { timeZone: "UTC" })
    : new Date(iso).toLocaleString();
  return format(event.start) + " – " + format(event.end);
}
