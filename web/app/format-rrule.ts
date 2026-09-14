const DAY_NAMES: Record<string, string> = {
  MO: "Monday",
  TU: "Tuesday",
  WE: "Wednesday",
  TH: "Thursday",
  FR: "Friday",
  SA: "Saturday",
  SU: "Sunday",
};

function ordinal(n: number): string {
  const abs = Math.abs(n);
  const suffix =
    abs % 10 === 1 && abs % 100 !== 11
      ? "st"
      : abs % 10 === 2 && abs % 100 !== 12
        ? "nd"
        : abs % 10 === 3 && abs % 100 !== 13
          ? "rd"
          : "th";
  return `${abs}${suffix}`;
}

function parseIcsDate(value: string): Date | null {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?Z?$/);
  if (!m) return null;
  const [, y, mo, d, h = "0", mi = "0", s = "0"] = m;
  return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s));
}

/** Renders an RFC 5545 RRULE (as our agent generates them) as plain English, falling back to the raw string for anything unexpected. */
export function formatRRule(rrule: string): string {
  const parts: Record<string, string> = {};
  for (const kv of rrule.split(";")) {
    const [k, v] = kv.split("=");
    if (k && v) parts[k.toUpperCase()] = v;
  }

  const interval = parts.INTERVAL ? parseInt(parts.INTERVAL, 10) : 1;
  let freqPhrase: string;
  switch (parts.FREQ) {
    case "DAILY":
      freqPhrase = interval > 1 ? `Every ${interval} days` : "Daily";
      break;
    case "WEEKLY":
      freqPhrase = interval > 1 ? `Every ${interval} weeks` : "Weekly";
      break;
    case "MONTHLY":
      freqPhrase = interval > 1 ? `Every ${interval} months` : "Monthly";
      break;
    case "YEARLY":
      freqPhrase = interval > 1 ? `Every ${interval} years` : "Yearly";
      break;
    default:
      return rrule;
  }

  let dayPhrase = "";
  if (parts.BYDAY) {
    const tokens = parts.BYDAY.split(",");
    const hasOrdinal = tokens.some((t) => /^-?\d/.test(t));
    const named = tokens.map((t) => {
      const m = t.match(/^(-?\d+)([A-Z]{2})$/);
      if (!m) return DAY_NAMES[t] ?? t;
      const [, numStr, day] = m;
      const num = parseInt(numStr, 10);
      const dayName = DAY_NAMES[day] ?? day;
      return num === -1 ? `last ${dayName}` : num < 0 ? `${ordinal(num)}-to-last ${dayName}` : `${ordinal(num)} ${dayName}`;
    });
    dayPhrase = hasOrdinal ? ` on the ${named.join(", ")}` : ` on ${named.join(", ")}`;
  }

  let countPhrase = "";
  if (parts.COUNT) {
    const n = parseInt(parts.COUNT, 10);
    countPhrase = `, ${n} time${n === 1 ? "" : "s"}`;
  }

  let untilPhrase = "";
  if (parts.UNTIL) {
    const d = parseIcsDate(parts.UNTIL);
    if (d) untilPhrase = `, until ${d.toLocaleDateString()}`;
  }

  return `${freqPhrase}${dayPhrase}${countPhrase}${untilPhrase}`;
}
