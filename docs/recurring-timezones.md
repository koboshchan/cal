# Recurring event timezones

Timed events now persist an optional `timezone` IANA identifier. Newly generated events default to the session timezone. Explicit event zones survive generation, refinement, imports and edits. Existing clients may omit the field; editing retains the old event zone or inherits the session zone.

ICS exports use local DTSTART/DTEND with TZID. They rely on calendar clients' IANA timezone databases rather than embedding VTIMEZONE. All-day events remain VALUE=DATE. Events without either an event or session timezone retain the previous UTC export behavior.

## Existing data

No required database migration. Subscription feeds and downloads regenerate ICS from resultEvents, falling back to the stored session timezone, so existing weekly events such as Film Club retain the intended 15:15 local start across November 1, 2026. New event records persist the timezone directly. Cached resultIcs is refreshed on edit/refinement; downloads no longer use that stale cache when resultEvents exist.

If permanently backfilling, set missing timed-event timezones from the owning session timezone, leaving start/end UTC instants unchanged. Review imported UTC recurrences or events intentionally using a different timezone before assigning the session zone. Where the original zone was lost and no session zone exists, it cannot be inferred safely; the owner must select the intended zone. Previously downloaded ICS files must be replaced/re-imported; subscribed clients refresh automatically.

## Verification

Run `node --test lib/recurring-timezone.test.mjs lib/agent/current-time.test.mjs` from web. The regression expands five weekly Film Club occurrences across fall DST, checks 15:15–17:30 local throughout, and verifies UTC start changes from 22:15 to 23:15 after November 1. Import round-trips, schema validation, generation defaults, overrides and all-day exports are also covered.
