<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/6cf5f386-9052-4d3b-9063-8e2e2cf2f185

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. To enable Gemini responses, set `GEMINI_API_KEY` in an untracked `.env.local` file.
   The server loads `.env.local` first, then `.env`. Without a key, the assistant uses
   the local MoHAIS guidance engine.
3. For local signed-in sessions, configure `OPAS_AUTH_SECRET` with a random value of
   at least 32 characters. Set `OPAS_DEMO_CITIZEN_PASSWORD` and
   `OPAS_DEMO_STAFF_PASSWORD` for password-based demo sign-in. The development-only
   John Banda shortcut does not use the citizen password. Keep all three values
   server-only and do not commit them.
4. Run the app:
   `npm run dev`

To enable DeepSeek as a fallback, set `DEEPSEEK_API_KEY` in `.env.local`. Providers are
tried in this order: Gemini API, DeepSeek, then Vertex AI (if configured), followed by
the local guidance engine. DeepSeek replies are AI-generated but are not web-grounded;
the interface identifies the provider used for each answer. Applicant/application
context may be sent to whichever external provider handles the request, so configure
only providers approved for that data.

For Google-hosted Gemini failover, configure `GOOGLE_CLOUD_PROJECT` and
`GOOGLE_CLOUD_LOCATION` in `.env.local`, enable Vertex AI in that Google Cloud project,
and authenticate the server with Application Default Credentials. When both providers
are configured, Gemini API and DeepSeek are tried before Vertex AI; the local guidance
engine remains the final fallback. Vertex AI configuration alone also works when no
other provider key is set. A configured provider is not guaranteed to be reachable or
have quota, so chat responses identify which provider actually replied.

Application snapshots, reminder data, and simulated payment transactions are stored
locally in `data/opas.sqlite`; the directory and database are created automatically
on first startup. MySQL is not required. Set `OPAS_SQLITE_PATH` in `.env.local` to use
a different SQLite file location.

The local Simulated OPAS API is available on the same origin as the backend:
- `POST /api/payment/simulate` requires a signed-in simulated applicant, accepts only that account’s unpaid demo draft, and generates transaction details on the server. It is available only outside production.
- `POST /api/payment/process` rejects unverified client-supplied payment confirmations. A real gateway callback requires an authenticated, provider-approved webhook integration.
- `GET /api/payment/transactions` returns persisted simulated transactions to signed-in staff.
- `POST /api/applications/sync` is staff-authenticated, synchronizes demo status for known references, and is disabled in production.
- `GET /api/applications/status?applicationReference=...` requires a signed-in account; citizens can access only their own record, while staff can request the dashboard status list.
- `GET /api/smartguide/detections` requires a signed-in account and returns only that citizen’s detections or the staff view.
- `GET /api/smartguide/document-feedback` returns structured, PII-minimized officer review labels.
- `POST /api/smartguide/document-feedback` records a `CONFIRMED`, `FALSE_POSITIVE`, or `WRONG_CATEGORY` label with categorical evidence codes. Feedback is local demo data and both endpoints are disabled in production.

The document detector uses explicit rules and recorded evidence. Review labels can be exported from the officer console as CSV for future evaluation; they do not change detector rules or train a model. The exported dataset excludes applicant names, tracking references, and document text.

The officer Payment-to-Submission Monitor reads transactions, application statuses,
and detections from these APIs and shows an explicit connection/error state. These
endpoints use local simulated records and are not connected to official OPAS or a
Government Payment Gateway. Sandbox success confirms only a local demo transaction; it
never means an application was submitted.

In the local citizen demo portal, SmartGuide checks for new payment detections every
15 seconds. A successful paid-but-not-submitted detection opens an in-app alert and
adds one message per transaction to that browser's applicant inbox. These notices are
stored locally per demo account and are not official OPAS messages.

In development mode only, the login dialog offers a clearly labeled John Banda
simulated-applicant shortcut for trying the local payment alert and inbox flow.
Simulated applicant sign-in is checked by the backend against an active demo account and an application in the local simulated registry, then issued an HttpOnly signed session cookie. The demo applicant password is configured only on the server; the quick demo shortcut is development-only. This uses sample identity/application data and does not authenticate anyone with official OPAS. Simulated sign-in is disabled in production until an approved OPAS identity service is configured. Applicant status, payment simulation, and assistant case context are restricted server-side to the authenticated account; staff-only monitoring and sync endpoints require a staff session. The assistant resolves a citizen’s application context server-side and will not accept a different tracking reference for that session. No ML is used for authentication or authorization; these are deterministic security checks.

The officer Payment-to-Submission Monitor summarizes payment/submission states from
the local Simulated OPAS APIs and can export visible rows as CSV. Follow-up actions
are logged in the prototype notification history and do not deliver messages. The
monitor cannot track whether an applicant returned to OPAS; these simulated records
are not official payment or production OPAS status.

The officer Message Outbox supports eligible-recipient selection, payment-date and
application-status filters, custom messages, OPAS message-board/email/SMS channel
selection, immediate queueing, scheduling, and manual failure/history tracking. In the
current prototype, queued/scheduled messages are not delivered and schedules do not
run in the background. Officers must check official OPAS and manually confirm whether
an applicant submitted; a confirmed submission marks the case submitted and cancels
pending reminders, while a confirmed non-submission marks it paid-but-not-submitted
and queues a reminder.


## Local integration with Simulated OPAS

This development build connects the SmartGuide officer payment-submission monitor to the separate Simulated OPAS application.

### Run the two systems

1. In `OPAS-SmartGuide`, copy `.env.local.example` to `.env.local`. Keep the supplied local demo password for this demonstration, or change it.
2. Start Simulated OPAS from its project folder:
   - `cd Simulated-OPAS`
   - `npm install`
   - `npm run dev`
   - Open `http://localhost:3000`
3. Start OPAS SmartGuide from `OPAS-SmartGuide` in a second terminal:
   - `npm install`
   - `npm run dev`
   - Open `http://localhost:3001`

SmartGuide's local server proxies these read-only development requests to Simulated OPAS:
- `GET /api/payment/transactions`
- `GET /api/applications/status`
- `GET /api/smartguide/detections`

The upstream address is configured in `.env.local` as `SIMULATED_OPAS_API_BASE_URL=http://127.0.0.1:3000`.
The SmartGuide staff demo password is `GuidewiseDemo2026!`; use the staff demo account selector on the sign-in screen. This is a local demonstration credential only and must be changed before any shared deployment.

### Test the connection

1. In Simulated OPAS, register a demo applicant and start a passport application.
2. Make a simulated successful payment. The payment API records the transaction and the application-status sync publishes the latest status.
3. Leave the application at `PAYMENT_COMPLETED` / not submitted.
4. In SmartGuide, sign in with a local staff demo account and open the payment-submission monitoring view.
5. Refresh the monitor. It should show the payment transaction and the paid-but-not-submitted detection from Simulated OPAS.
6. Complete submission in Simulated OPAS and refresh SmartGuide; the detection should disappear once the application status is reported as submitted.

### Identity and production boundary

The data connection above is a local development integration, not official government OPAS connectivity. Applicant sign-in remains subject to an approved OPAS identity provider. Do not enter official OPAS passwords into this prototype. Production requires an approved identity flow (for example, OPAS-managed OIDC/OAuth), authenticated server-to-server APIs, persistent shared records, TLS, audit logging, and Ministry authorisation.

## Application lifecycle tracking (prototype)

The applicant's **My Applications → View Details** panel now includes an Application Journey timeline. It shows the high-level workflow from application creation through payment, submission, officer review, biometrics/processing, collection and completion, plus recorded activity events.

The prototype appends lifecycle events when an applicant confirms a sandbox payment and when an authorised staff/applicant action changes application status. Events include the actor name/role, timestamp, event type and description. Officer status actions also populate the existing assignment/review/action timestamp fields used by operational insights. Reversion records the waiting-for-applicant timestamp; resubmission clears that waiting marker.

Important limitations: this is prototype state held by the React application and is not yet a tamper-resistant server-side audit log. Existing seeded records may have incomplete historical timestamps; the timeline labels missing dates as "Date not recorded" rather than estimating them. Production use requires a server-side append-only audit/event store, authenticated OPAS event integration, role-based access, retention policy and clock synchronisation. The high-level stage strip is a status overview, not proof that every intermediate stage has a recorded timestamp.

## Lifecycle analytics and bottleneck monitoring

The Officer Dashboard's **Reports & Workload → Auto Reports** view now includes lifecycle event coverage, current-stage case counts, average elapsed time since the latest recorded activity, and a shortlist of the longest-waiting non-completed applications. These metrics are included in the operational CSV export.

**Interpretation:** elapsed time since the latest recorded event is a prioritisation proxy, not verified active handling time or an SLA breach. Applicant waiting periods, staff leave, reassignment and other approved pauses must be modelled separately before officer performance or SLA conclusions are drawn. Reports use the prototype's local application dataset and are not official OPAS statistics.

## Configurable processing targets and supervisor alerts

The Officer Dashboard > Operational Intelligence > Auto Reports view includes configurable working-day targets for selected workflow stages. Demonstration defaults are 2 working days for Submitted - Under Review, 3 for Biometrics Scheduled, 5 for Processing & Printing, and 2 for Ready for Collection. These are prototype defaults only and are not approved Ministry service standards. Administrators/supervisors can adjust the values in the UI; the settings are stored in the browser's local storage for this demonstration.

The supervisor alert queue flags applications whose elapsed working days since the available stage-start/activity timestamp exceed the configured target. Weekends are excluded, but public holidays are not yet excluded. Reverted applications are treated as waiting for applicant action and paused from officer-stage breach counts. Records without usable timestamps are not assigned an assumed age. Alerts are advisory; they do not automatically determine officer misconduct or performance. Production use requires authorised target policy, a holiday calendar, server-side settings, reliable stage transition and assignment timestamps, explicit applicant-wait pause/resume events, access controls and an auditable supervisor review process.


## Demonstration role access

The prototype includes four distinct roles:

- **Applicant (`citizen`)**: accesses only their own application, guidance and applicant notifications.
- **Passport officer (`officer`)**: accesses the officer work queue and authorised case-update/notification actions. The supervisor dashboard is not shown to officers.
- **Operations supervisor (`supervisor`)**: accesses the dedicated Supervisor Dashboard for workload oversight and escalation acknowledgement/resolution. This role cannot adjudicate cases, dispatch applicant notifications or manage user accounts.
- **ICT administrator (`admin`)**: manages staff accounts and system administration; it does not receive case-adjudication or applicant-notification dispatch permissions.

### Supervisor demo sign-in

Use `supervisor@mohais.gov.zm` as the login identifier and the local `OPAS_DEMO_STAFF_PASSWORD` configured in `.env.local`. The staff password is shared by the seeded staff demo accounts in this prototype. Do not use this shared-password pattern in production; use individually provisioned accounts, a government identity provider, MFA and server-side role/permission enforcement.

Role checks in the React UI are demonstration safeguards. Production authorization must be enforced on every backend endpoint and data query. The supervisor escalation store currently uses browser local storage and must be migrated to shared server-side persistence before multi-user deployment.

## Resend email delivery

The paid-but-not-submitted bulk notification workflow can send email through the server-side Resend adapter when `RESEND_API_KEY` and `NOTIFICATION_FROM_EMAIL` are configured. Set `NOTIFICATION_TEST_RECIPIENT` during testing to redirect every message to a controlled inbox. See [RESEND-EMAIL-INTEGRATION.md](./RESEND-EMAIL-INTEGRATION.md) for setup, test steps, status meanings, and production limitations. The API key must remain server-side and must never use a `VITE_` prefix.


## Simulate OPAS payment and application events

With the SmartGuide server running on port 3001, open a second terminal in this
`OPAS-SmartGuide` folder. Ensure `.env.local` contains the same
`OPAS_INTEGRATION_SECRET` as the running SmartGuide server (at least 32 characters).

Use an application reference already present in SmartGuide's demo data:

```powershell
npm run simulate:opas -- payment OPAS-2026-001
npm run simulate:opas -- submit OPAS-2026-001
npm run simulate:opas -- revert OPAS-2026-001
```

- `payment` sends a signed, confirmed ZMW 500 payment event with a fresh transaction
  reference and PRN. SmartGuide should mark the application Paid - Unsubmitted and
  return applicant guidance.
- `submit` reports that the applicant submitted the application. SmartGuide should
  stop/cancel queued payment reminders.
- `revert` reports that an officer reverted the application and includes a sample
  correction comment.

Run `payment` first, then `submit` or `revert`. Use a different eligible demo
application for a fresh payment test; a second successful payment for the same
application is intentionally flagged for officer review. These commands simulate
OPAS events; they do not contact a real payment gateway or government OPAS.
