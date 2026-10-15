import { Temporal } from "@js-temporal/polyfill";
import moment from "moment-timezone";

const HAS_OFFSET = /(Z|[+-]\d{2}:?\d{2})$/;

// Full IANA data is bundled with the pinned package, not borrowed from Node ICU.
export const timezoneDataVersion = moment.tz.dataVersion;

/** RFC 5545 compatible disambiguation: first fold occurrence, gaps shift forward. */
export function zonedTimeToUtc(iso: string, timeZone: string): Date {
  if (HAS_OFFSET.test(iso)) return new Date(Temporal.Instant.from(iso).epochMilliseconds);
  if (!isValidTimezone(timeZone)) throw new RangeError(`Invalid timezone: ${timeZone}`);
  // Temporal validates the calendar fields without invoking its ICU-backed zoning.
  const local = Temporal.PlainDateTime.from(iso);
  return moment.tz(local.toString(), moment.ISO_8601, true, timeZone).toDate();
}

/** The inverse, using the same bundled rules as generation and ICS. */
export function formatInZone(date: Date, timeZone: string): string {
  if (!isValidTimezone(timeZone)) throw new RangeError(`Invalid timezone: ${timeZone}`);
  return moment.tz(date, timeZone).format("YYYY-MM-DDTHH:mm:ss");
}

export function isValidTimezone(value: string): boolean {
  return Boolean(moment.tz.zone(value));
}
