import moment from "moment-timezone";

/** RFC 5545 adapter for the pinned bundle, never a second/host rules database. */
export function bundledVtimezone(name: string): string {
  const zone = moment.tz.zone(name);
  if (!zone) throw new RangeError(`Invalid timezone: ${name}`);
  // TZID and abbreviations are bundled, not arbitrary user text.
  const lines = ["BEGIN:VTIMEZONE", "TZID:" + name, "X-TZDB-VERSION:" + moment.tz.dataVersion];
  const offset = (minutes: number) => {
    const seconds = Math.round(-minutes * 60);
    const pad = (value: number) => String(value).padStart(2, "0");
    return (seconds < 0 ? "-" : "+") + pad(Math.floor(Math.abs(seconds) / 3600))
      + pad(Math.floor(Math.abs(seconds) % 3600 / 60))
      + (seconds % 60 ? pad(Math.abs(seconds) % 60) : "");
  };
  // Group identical observances into RDATE sets rather than hundreds of components.
  // Explicit dates preserve policy changes without inventing repeating timezone rules.
  const groups = new Map<string, { kind: string; from: number; to: number; abbreviation: string; dates: string[] }>();
  const add = (wall: string, from: number, to: number, abbreviation: string) => {
    const kind = to < from ? "DAYLIGHT" : "STANDARD";
    const key = [kind, from, to, abbreviation].join("|");
    const group = groups.get(key) ?? { kind, from, to, abbreviation, dates: [] };
    group.dates.push(wall);
    groups.set(key, group);
  };
  // Earlier than every finite transition in this full bundle, also covers fixed zones.
  add("16010101T000000", zone.offsets[0], zone.offsets[0], zone.abbrs[0]);
  for (let i = 0; i + 1 < zone.offsets.length; i++) {
    const instant = zone.untils[i];
    if (!Number.isFinite(instant)) continue;
    // DTSTART/RDATE are local clocks using the offset BEFORE the transition.
    const wall = moment.utc(instant - zone.offsets[i] * 60000).format("YYYYMMDD[T]HHmmss");
    add(wall, zone.offsets[i], zone.offsets[i + 1], zone.abbrs[i + 1]);
  }
  for (const group of groups.values()) {
    lines.push("BEGIN:" + group.kind, "DTSTART:" + group.dates[0],
      "TZOFFSETFROM:" + offset(group.from), "TZOFFSETTO:" + offset(group.to),
      "TZNAME:" + group.abbreviation);
    // Separate RDATE properties are standard and avoid overlong, unfolded lines.
    lines.push(...group.dates.slice(1).map((date) => "RDATE:" + date), "END:" + group.kind);
  }
  lines.push("END:VTIMEZONE");
  return lines.join("\r\n");
}
