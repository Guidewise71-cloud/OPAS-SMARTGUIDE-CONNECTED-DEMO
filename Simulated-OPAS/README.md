<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/3efae543-a944-4421-a9c4-e8d219d67bd3

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## OPAS SmartGuide payment-detection demo

This prototype now includes a simulated OPAS API integration:

- `POST /api/payment/process` receives and stores the simulated gateway confirmation, including the applicant's application reference, gateway transaction reference, PRN, approval code, receipt hash, amount, channel, status and timestamp.
- The API responds with an OPAS acknowledgement reference, `RECEIVED_AND_RECORDED` status and the time OPAS received the confirmation. The applicant receipt and Payment API Inspector display these details.
- Payment records are saved to `data/payment-ledger.json` in the Simulated OPAS project and loaded again when the dev server restarts.
- `GET /api/payment/transactions` exposes stored payment records.
- `POST /api/applications/sync` publishes the simulated OPAS application's latest status to the API layer.
- `GET /api/applications/status?applicationReference=...` retrieves the status for one application (omit the query parameter to list all synced applications).
- `GET /api/smartguide/detections` matches successful payment records to application statuses and returns paid-but-not-submitted cases.

The SmartGuide Payment Detection panel is shown on the applicant dashboard. Complete a test payment in the simulated OPAS application, return to the dashboard, and press **Refresh detection**. The monitor should show the payment reference, application reference, payment status, application status and a notification preview.

## OIDC identity endpoint (development only)

`GET /api/me` is a development-server endpoint that verifies a signed OIDC access token using the provider's discovery metadata and JWKS. It returns the verified subject (`sub`), issuer, and email claims when present. It responds with HTTP 503 unless both `OPAS_OIDC_ISSUER` and `OPAS_OIDC_AUDIENCE` are configured in the server environment or `.env.local`.

```http
GET http://localhost:3000/api/me
Authorization: Bearer <OIDC access token>
```

Do not put a real token in source control, screenshots, logs, or chat. This endpoint does not report whether an applicant account is active and does not connect an OIDC identity to the browser-stored demo users or their applications. The other demo application-status endpoints are not authenticated and must not be used for real applicant data. Vite development middleware is not a production identity service; production deployment requires an approved server-side identity integration and authoritative account/application storage.

### Run locally

```bash
npm install
npm run dev
```

Open the local Vite address shown in the terminal (the project uses port 3000 by default).

**Important:** The API stores records in memory and is intended for local demonstration only. Restarting the development server clears its API-side records. This is not a production payment integration and does not contact any real government, bank or payment service. Production use requires OPAS-approved API documentation, authentication, authorisation, persistent storage, audit logging and secure handling of applicant data.
