# OPAS SmartGuide payment integration setup

This is a local sandbox bridge. It does not connect to the Government of Zambia production payment gateway.

## What is connected

1. Simulated OPAS publishes application snapshots to SmartGuide using signed HMAC-SHA256 requests.
2. After a simulated gateway payment, Simulated OPAS stores the gateway transaction and its own OPAS acknowledgement in its JSON payment ledger.
3. Simulated OPAS uses the server-only signed client in `Simulated-OPAS/server/opasIntegration.ts` to send HMAC-SHA256 payment and application events to SmartGuide. The shared secret is never placed in the React browser bundle.
   - `POST /api/integration/opas/payment-events`
   - `POST /api/integration/opas/application-events`
   - `POST /api/integration/opas/applications` (application snapshot sync)
4. SmartGuide validates the signature, application reference, transaction reference, PRN, amount, currency and gateway confirmation.
5. SmartGuide stores the payment transaction and integration event in SQLite, generates a SmartGuide acknowledgement, and marks the application Paid - Unsubmitted when appropriate.
6. SmartGuide creates applicant return instructions in the OPAS Message Board for mapped demo accounts.
7. The existing reminder scheduler handles later reminders; a submitted application event cancels queued payment reminders.
8. Officers can inspect integration events at `GET /api/integration/events` after signing in with an officer, supervisor or administrator account. SmartGuide also retains the shorter legacy route aliases for compatibility.

## Configure the shared local secret

Both projects include a local demo secret in their example environment files. For a local test, use the same value in both places. For any shared or production environment, generate a new random secret and never commit it to source control.

- SmartGuide: copy `OPAS-SmartGuide/.env.local.example` to `OPAS-SmartGuide/.env.local`. Keep `OPAS_INTEGRATION_SECRET` set to the shared secret.
- Simulated OPAS: copy `Simulated-OPAS/.env.example` to `Simulated-OPAS/.env`. Set `SMARTGUIDE_API_BASE_URL=http://127.0.0.1:3001` and the same `OPAS_INTEGRATION_SECRET`.

## Start the two apps

Terminal 1:

```powershell
cd OPAS-SmartGuide
npm install
npm run dev
```

Terminal 2:

```powershell
cd Simulated-OPAS
npm install
npm run dev
```

Open Simulated OPAS at `http://localhost:3000` and SmartGuide at `http://localhost:3001`. Keep both terminals running.

## End-to-end test

1. Register or sign in to a fictional applicant account in Simulated OPAS.
2. Create or open a passport application and complete the form.
3. Make a sandbox payment.
4. Confirm the Simulated OPAS receipt shows the gateway transaction reference, application reference, PRN and OPAS acknowledgement.
5. The payment response should include `smartGuideAcknowledgement.delivered: true`. If false, check both server terminals and confirm the shared secret and URL.
6. Sign in to SmartGuide and inspect the Payment / Submission Monitor. The application should show Paid - Unsubmitted.
7. Submit the application in Simulated OPAS. Its status sync should notify SmartGuide, which should update the status and cancel queued reminders.
8. Run the SmartGuide tests from its folder: `npm test`.
9. Run the Simulated OPAS signed-client tests from its folder: `npm run test:integration` (Node 22+ with the project's `tsx` dev dependency installed).

## Data locations

- SmartGuide SQLite database: `OPAS-SmartGuide/data/opas.sqlite` (or `OPAS_SQLITE_PATH` if configured).
- Simulated OPAS payment ledger: its Vite plugin persists to `Simulated-OPAS/data/payment-ledger.json`.
- Simulated OPAS signed-event client: `Simulated-OPAS/server/opasIntegration.ts` (server-side only).
- Simulated OPAS client tests: `Simulated-OPAS/tests/opasIntegrationClient.test.ts`.

## Important limitations

- This is a development simulation. It is not an official OPAS, bank, or government payment integration.
- The SmartGuide acknowledgement is separate from the OPAS acknowledgement. Both are stored and returned independently.
- Email reminders require valid Resend configuration. WhatsApp/SMS require their respective approved provider credentials. The local in-app/message-board notice can be tested without those providers.
- Use fictional test identities and never put real applicant data or production credentials in this demo.
