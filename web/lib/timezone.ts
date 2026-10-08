import { Temporal } from "@js-temporal/polyfill";

const HAS_OFFSET = /(Z|[+-]\d{2}:?\d{2})$/;

/**
 * Converts a naive local wall-clock ISO string (no timezone offset — what
 * the agent's sandboxed code emits) representing a time in `timeZone` into
 * the correct UTC instant. If the string already carries an explicit
 * offset/Z, it's trusted as-is instead of being converted a second time.
 *
 * This deliberately lives in trusted host code, not the sandbox: DST and
 * IANA zone data are exactly the kind of thing a model gets subtly wrong
 * without anyone noticing until the wrong hour shows up.
 */
export function zonedTimeToUtc(iso: string, timeZone: string): Date {
  const instant = HAS_OFFSET.test(iso)
    ? Temporal.Instant.from(iso)
    : Temporal.PlainDateTime.from(iso)
        // RFC 5545: first occurrence of a repeated time, shift skipped times forward.
        .toZonedDateTime(timeZone, { disambiguation: "compatible" })
        .toInstant();
  return new Date(instant.epochMilliseconds);
}

/** The inverse: formats a real instant as a naive "YYYY-MM-DDTHH:mm:ss" local to `timeZone`. */
export function formatInZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`;
}
