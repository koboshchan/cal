Cal Privacy Policy

Draft for review, not yet effective. Prepared October 9, 2026.

Lucas Zhang, also known as kobosh, operates Cal at cal.kobosh.com as a minor-run hobby project in British Columbia, Canada. Lucas is responsible for privacy questions and requests at lz@kjt.lol. This policy covers Cal's web service and companion clients using the same backend.

Clerk handles sign-in and account management. Cal stores your Clerk user identifier, email address, registration time, and, if requested, a secret calendar feed token. Clerk also processes the account information you give it and the session and device information needed for authentication. Cal does not store your Clerk password.

Cal processes schedule instructions, imported ICS event details, optional schedule images, clarification answers, refinement requests, and your device's time-zone identifier. Saved calendars include titles, descriptions, event dates and times, locations, recurrence rules, alarms, generated ICS content, generation history, generated code versions, processing status, errors, and timestamps. A location written in an event is not GPS tracking.

Uploaded images are sent to the configured vision provider for a text description. The application saves that description rather than the original image bytes in the calendar record. Imported ICS files are parsed into saved event details. Schedule text, relevant event information, image descriptions, and conversation history go to the configured AI provider to generate and refine calendars.

The AI endpoint and model are chosen by the operator in the admin settings. The code supports an OpenAI-compatible Responses API, which does not establish that OpenAI is the current provider. Before submitting information, you may ask lz@kjt.lol which provider receives it and where it is processed. Provider retention and model-training practices depend on that provider's terms and configuration; Cal cannot promise that every provider discards requests or excludes them from training.

Cal uses this information to authenticate you, generate and save calendars, answer clarification requests, export or serve ICS files, diagnose errors, protect the service, and respond to support or privacy requests. The application has no advertising, payment, or third-party analytics integration. It does not include a feature that sells your information or trains its own AI model on your calendars.

The backend uses MongoDB for account and calendar records. The operator and service infrastructure may process IP addresses, request times, paths, browser or device details, and errors as part of operating and securing the service. Error logs can contain provider error responses or submitted information. Hosting, network, and AI providers may process data outside Canada, where local authorities may have lawful access. The specific infrastructure operators, storage locations, and log retention must be confirmed before publication.

Clerk uses cookies and related session storage for sign-in and security. Blocking them may prevent authenticated features from working. Cal's application code has no advertising cookies or separate analytics tracker. A calendar app receiving your feed or export processes that information under its own policy.

Calendars are associated with your account. Your secret subscription URL is an exception to sign-in protection. Anyone who obtains it can retrieve the completed calendar events in your feed. Treat it like a password. Data may also be disclosed where required by law or reasonably necessary to protect security or legal rights. The operator may need to access records to provide support or investigate a problem.

There is no automatic expiry for saved calendars in the current application. Deleting a calendar removes its active database record and removes its events from future feed responses. It does not delete already downloaded ICS files, imported events, provider-held copies, or infrastructure logs. Deleting an event does not necessarily remove earlier prompts or generation history describing it. The current code does not provide a complete account-data deletion workflow tied to Clerk account deletion, so contact lz@kjt.lol for full account-data removal. Backup and log deletion intervals are not established by the source code and must not be assumed.

You can review saved calendars, edit available fields, delete calendars, and export ICS files. You may ask for access to your personal information, an explanation of its use and disclosure, correction, deletion, or withdrawal of consent. The operator may ask for proportionate information to verify your identity, explain any lawful refusal, and respond within applicable legal deadlines. Withdrawal may mean Cal can no longer provide the features requiring that information.

Applicable privacy rights may arise under British Columbia's Personal Information Protection Act or Canada's Personal Information Protection and Electronic Documents Act, depending on the activity. This policy does not limit those rights. You may raise a concern with the Office of the Information and Privacy Commissioner for British Columbia at https://www.oipc.bc.ca or the Office of the Privacy Commissioner of Canada at https://www.priv.gc.ca.

Do not submit sensitive information or other people's information without appropriate permission. Cal is not intended for children under 13. A parent or guardian who believes a child has provided information can request help at lz@kjt.lol. No online service can guarantee complete security; account protection and restricted access reduce risk but are not a guarantee.

Material policy changes will be announced in the service before taking effect. New uses requiring consent will be presented separately. Contact lz@kjt.lol with questions.

Adapted from General Legal's attorney-drafted CC0 Privacy Policy template at https://github.com/General-Legal/legal-templates. General Legal has not reviewed or endorsed this adaptation.
