# Legal review notes for Cal draft policies

Status: draft, not effective, not legal advice. Reviewed against main d9b6a18 (merged into this branch as 88a8d90) on October 15, 2026. Re-audit after any code, provider or hosting change.

## Source flows checked

- Sign-in uses Clerk (`web/lib/auth.ts`, `web/proxy.ts`): cookie session on web, session token for the iOS client. Cal stores the Clerk user id, email and registration time. No password is stored.
- Creating a calendar (`web/app/api/sessions/route.ts`, `web/app/new-session-form.tsx`) sends prompt text, optional images, optional ICS files and a timezone to the backend. Images are described by the configured vision model and only the description is saved. ICS files are parsed into events.
- Saved data lives in MongoDB: sessions, events, generated ICS, history, errors. A calendar can be deleted (`DELETE` on a session removes the record). There is no expiry job and no account-wide deletion tied to Clerk.
- The secret feed (`/api/calendar/feed`, `/api/me/calendar-feed`) is readable without sign-in by anyone holding the token URL.
- AI endpoint and model are set in admin settings; the code supports an OpenAI-compatible endpoint. Operator-supplied facts (Oct 15, not verified from code): paid OpenAI API, no Zero Data Retention; voice, transcription and TTS run locally on operator hardware and are never used for training. OpenAI's page (https://developers.openai.com/api/docs/guides/your-data, read Oct 15) says API data is not used for training by default and abuse monitoring logs are kept up to 30 days. Still open: hosting country, retention of non-provider logs and backups, effective date and operator identity.
- No analytics, ads or payment code was found. The web app code does not use localStorage, sessionStorage or its own cookies; cookies come from Clerk.

## Timezone handling

The web form sends the browser's resolved timezone (or a user-entered IANA name, validated with Intl) and the iOS app sends `TimeZone.current.identifier`. The server validates it again and stores it on the session. ICS output uses TZID with the current timezone rules in main (see `docs/recurring-timezones.md`). Only the identifier is collected, not location. Earlier work on this branch that embedded bundled timezone data and added ical.js and moment-timezone was removed in the merge so the branch matches main; those commits remain in history.

## Companion iOS app

The ios/ project uses the same backend (https://cal.kobosh.com by default) and the same Clerk sign-in, and sends the device timezone. This review covers the source only. App Store or TestFlight listings, privacy labels and anything that differs in a specific build need a release-specific check, because the policies describe the web service and clients on the same backend, not any particular shipped binary. The app has no link to the privacy or terms pages yet.

## What the pages do not do

- No age or guardian check is enforced in code. The under-13 and guardian wording is a statement, not a mechanism.
- No change-notice mechanism exists. The pages say changes will be announced in the service, but nothing implements that yet.
- No complete account-data deletion workflow exists.

## Blockers before publishing

1. Confirm the actual AI and vision providers, their processing locations, and their retention and training terms.
2. Confirm hosting, database and network operators, their countries, and log and backup retention periods.
3. Decide the effective date and the version/change-notice process, then remove the draft labels.
4. Decide how the operator being a minor affects who may agree to the terms, and whether a parent or guardian must be named; have this reviewed.
5. Add account deletion or a documented manual process, and link the pages from the iOS app.
6. Have a qualified lawyer review the BC PIPA and PIPEDA statements before relying on them.
