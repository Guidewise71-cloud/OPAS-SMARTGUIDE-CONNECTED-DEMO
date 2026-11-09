# OPAS SmartGuide – Resend Email Integration

## What is connected

- The admin bulk paid-but-not-submitted workflow still creates applicant-specific SmartGuide inbox and simulated OPAS Message Board messages.
- When Resend is configured, it also sends the matching email from the server.
- Email attempts are recorded in the SQLite `email_notification_outbox` table. A unique application/payment deduplication key prevents repeat sends on later bulk runs.
- Provider acceptance is recorded as `SENT`, but delivery remains `pending` until Resend reports a delivery event. Bounce/complaint/failure events are recorded as `bounced`.
- The admin Bulk Notification Management screen shows Resend configuration, test mode, email attempt history, and a delivery refresh action.

## Configure safely

Add these values to the server's `.env.local` file (never to a `VITE_` variable and never to frontend code):

```env
RESEND_API_KEY=re_your_key
NOTIFICATION_FROM_EMAIL=OPAS SmartGuide <verified-sender@your-domain.example>
NOTIFICATION_TEST_RECIPIENT=your-controlled-test-inbox@example.com
```

Verify the sender/domain in Resend first. Keep `NOTIFICATION_TEST_RECIPIENT` set while testing. In test mode every email is redirected to that one inbox and the subject identifies the original intended recipient. Remove the test recipient only after you have approval to send to real applicants and have verified the applicant contact data and message content.

Restart the server after changing `.env.local`. The admin screen should show Resend as configured and test mode as ON.

## Test workflow

1. Sign in with the admin demo account.
2. Open Bulk Notification Management and review the eligible paid-but-not-submitted preview.
3. Confirm the test recipient is configured in `.env.local`.
4. Run the bulk notification action. It creates in-app and simulated OPAS Message Board messages and attempts email delivery through Resend.
5. Check the test inbox and the Email delivery history table.
6. Select **Refresh delivery status** to query Resend for the latest provider event.
7. Run the bulk action again; existing outbox dedupe keys prevent duplicate emails for the same application/payment pair.

## Important status meanings

- `PENDING`: outbox entry created, dispatch in progress or not yet finalised.
- `SENT`: Resend accepted the API request and returned a message ID. This is **not** proof the email reached the recipient.
- `delivered`: Resend reports delivery.
- `bounced`: Resend reports a bounce, complaint, or failure.
- `unknown`: delivery could not be established.
- `emailSkipped`: Resend is not configured or the applicant email is missing/invalid.

This integration does not connect to the live government OPAS or payment gateway. It uses the project's simulated OPAS data. The outbox is a useful prototype foundation; production should add signed Resend webhooks, retry/backoff for transient failures, stronger delivery-event audit history, provider rate limiting, and approved data-protection controls before national deployment.

## Standalone Resend smoke test

A standalone script is available at the project root as `sendTest.ts`. It sends one test message and then checks the provider's latest delivery state:

```bash
npm run test:resend
# or: npx tsx sendTest.ts
```

Before running it, set `RESEND_API_KEY`, `NOTIFICATION_FROM_EMAIL`, and `NOTIFICATION_TEST_RECIPIENT` in `.env.local`. The script deliberately stops if `NOTIFICATION_TEST_RECIPIENT` is missing, so the sample recipient cannot accidentally become a live destination. The adapter redirects the sample message to the test inbox and labels the subject with the intended sample recipient. Keep the test recipient configured during development.
