# OPAS SmartGuide: In-App and Simulated OPAS Message Board Notifications

## What is included

- Applicant-specific SmartGuide in-app notification inbox.
- Applicant-specific simulated OPAS Message Board inbox.
- Admin-only bulk preview and bulk notification creation.
- Payment/application matching: a successful payment transaction must match the application's reference (and payment reference where present), and the application must remain Draft or Paid - Unsubmitted.
- Duplicate prevention using a unique key per application, payment and channel.
- SQLite persistence for messages and bulk-run audit summaries.
- Read/unread status for each message and channel.
- Batch processing with a maximum of 500 applicants per processing chunk.

## API routes

- `GET /api/applicant-messages` — signed-in applicant's messages.
- `POST /api/applicant-messages/:id/read` — mark the applicant's own message as read.
- `GET /api/notifications/bulk/preview` — administrator preview of eligible paid-but-not-submitted applicants.
- `POST /api/notifications/bulk/run` — administrator-only bulk creation; JSON body must include `{ "confirm": true, "batchSize": 500 }`.
- `GET /api/notifications/bulk/runs` — administrator's recent bulk-run history.

## Demo behaviour

The bulk run writes two records per eligible applicant: one `IN_APP` notification and one `OPAS_MESSAGE_BOARD` message. Both appear in the signed-in applicant's Notifications page, in separate sections. Marking one message read updates only that channel's message.

These are local simulated inboxes. No email, SMS, WhatsApp or live government OPAS message is dispatched. Live OPAS board integration requires an approved endpoint, authentication, data-sharing approval and confirmation from the OPAS technical team.

## Run locally

1. Install dependencies: `npm install`.
2. Configure the existing `.env` / `.env.local` values required by the app, especially the demo authentication secret and demo account passwords.
3. Start SmartGuide: `npm run dev`.
4. Sign in using the configured administrator account.
5. Open **Bulk Notifications** in the administrator dashboard.
6. Refresh the preview, review the eligible applicants, then select **Create notifications** and confirm.
7. Sign in as an eligible applicant and open **Notifications & Alerts**. The same notice is visible under SmartGuide In-App Notifications and Simulated OPAS Message Board.

## Data and security notes

- SQLite stores message rows, read status and bulk-run summaries.
- Applicant endpoints derive the recipient from the signed-in server session; callers cannot request another applicant's messages by supplying a user ID.
- The bulk endpoint requires administrator authorization and explicit confirmation.
- Synthetic data only. Do not use real applicant personal data in this prototype.
- This demo implementation is not a production messaging service. Before production use, add official OPAS API integration, robust authorization review, rate limiting, operational monitoring, backup/retention policy, and approved notification templates.

## Payment return guidance and operational insights update

- The sandbox payment confirmation modal now displays a prominent payment-success message, both application and payment references, and an explicit next-step instruction to return to the passport application and complete final submission.
- The return action closes the modal and opens the applicant's Applications section. The demo clearly labels the payment as simulated; it does not claim a live gateway transaction.
- Officer Dashboard now includes an Operational Intelligence tab with live counts derived from the current local application dataset and CSV report export.
- The same tab includes officer workload summaries based only on explicitly recorded `assignedOfficer` values. Unassigned cases remain unassigned; the prototype does not invent officer attribution.
- `PassportApplication` supports optional assignment and workflow timestamps for future SLA calculations. Officer-level processing-time metrics are intentionally not calculated until reliable action timestamps and applicant-waiting intervals are populated.
- Reports are local prototype summaries. Automated scheduled report delivery, PDF/Excel generation and production audit retention require approved infrastructure and policy.
