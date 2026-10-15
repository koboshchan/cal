# Recurring event timezones

Timed events now persist an optional `timezone` IANA identifier. Newly generated events default to the session timezone. Explicit event zones survive generation, refinement, imports and edits. Existing clients may omit the field; editing retains the old event zone or inherits the session zone.

ICS exports use local DTSTART/DTEND with TZID. They rely on calendar clients' IANA timezone databases rather than embedding VTIMEZONE. All-day events remain VALUE=DATE. Events without either an event or session timezone retain the previous UTC export behavior.

## Existing data

No required database migration. Subscription feeds and downloads regenerate ICS from resultEvents, falling back to the stored session timezone, so existing weekly events such as Film Club retain the intended 15:15 local start after November 1, 2026. New event records persist the timezone directly. Cached resultIcs is refreshed on edit/refinement; downloads no longer use that stale cache when resultEvents exist.

If permanently backfilling, set missing timed-event timezones from the owning session timezone, leaving start/end UTC instants unchanged. Review imported UTC recurrences or events intentionally using a different timezone before assigning the session zone. Where the original zone was lost and no session zone exists, it cannot be inferred safely; the owner must select the intended zone. Previously downloaded ICS files must be replaced/re-imported; subscribed clients refresh automatically.

## Verification

Run `node --test lib/recurring-timezone.test.mjs lib/agent/current-time.test.mjs` from web. The regression expands five weekly Film Club occurrences across the cancelled November 2026 fallback, checks 15:15 local throughout, and verifies the UTC start remains 22:15. Vancouver now stays at UTC-7 year-round; Los Angeles still falls back. Import round-trips, schema validation, generation defaults, overrides and all-day exports are also covered.


## Portable timezone data

Generation, the agent clock, event review, zone validation, and ICS serialization use
the full timezone data bundled by pinned moment-timezone 0.6.5 (IANA 2026e).
No BC-specific offset exception or host ICU upgrade is required. Moment's API is
legacy/maintenance-mode, but its timezone data releases remain maintained; it is
confined to these timezone boundaries. Temporal still validates calendar fields
and explicit instants, without invoking its ICU-dependent zoned conversion.
The package lock pins the data release, so local Node, Docker and hosted Node
produce the same results. Keep this dependency updated when IANA rules change.

For known IANA TZID imports, ical.js reads the original local DTSTART/DTEND fields
and conversion uses the bundled data rather than node-ical's ICU-derived dates.
node-ical remains the fallback for custom/non-IANA zones and floating imports;
those retain the existing host/embedded-zone semantics. Imported recurrences
remain local TZID plus RRULE, not expanded instants. Embedded VTIMEZONE definitions
for recognized IANA names do not override current IANA policy in normalized data.
Exports still omit VTIMEZONE, so recipient calendar clients need up-to-date IANA
data themselves. Old exported files and old incorrectly generated UTC instants
are not retroactively repaired by this change; regenerate/reimport when necessary.

Node 24.x remains required for isolated-vm's native ABI, as documented in the
Dockerfile. OS tzdata and npm full-icu are not substitutes for updating Node's
compiled ICU database. The regression suite also runs on Node 24.14.1 with
ICU 78.2 / tzdata 2025c to prove independence from that obsolete rule set.
Vancouver Nov 1 and Nov 8, 2026 at 10:00 resolve to 17:00Z and export/import
as 10:00, not 11:00. Spring gaps shift forward and fall folds choose the first
occurrence, preserving RFC 5545 compatible behavior for zones that still switch.
Explicit offsets remain authoritative; all-day dates remain timezone-free.

Policy references checked October 14, 2026:
https://www2.gov.bc.ca/gov/content/governments/celebrating-british-columbia/daylight-saving-time
https://www.iana.org/time-zones/releases/2026b
https://github.com/moment/moment-timezone/releases/tag/0.6.5
https://momentjs.com/timezone/docs/
