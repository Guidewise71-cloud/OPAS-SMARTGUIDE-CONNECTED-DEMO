# OPAS SmartGuide + Simulated OPAS — Connected Test Package

This package contains two separate local applications connected through the SmartGuide server-side API proxy. It is intended for local prototype testing only.

## 1. What is connected

- Simulated OPAS applicant application (registration, login, passport application, document steps and simulated payment) runs on `http://localhost:3000`.
- OPAS SmartGuide with Resend notification code runs on `http://localhost:3001`.
- SmartGuide reads the simulated payment ledger, application status and paid-but-not-submitted detections from Simulated OPAS through these endpoints:
  - `GET http://127.0.0.1:3000/api/payment/transactions`
  - `GET http://127.0.0.1:3000/api/applications/status`
  - `GET http://127.0.0.1:3000/api/smartguide/detections`
- Simulated OPAS sends payment events to its own `/api/payment/process` endpoint and publishes application changes to `/api/applications/sync`.

## 2. Requirements

Install Node.js (LTS) and npm. Extract this ZIP to a normal folder, for example `C:\OPAS-SMARTGUIDE-CONNECTED-DEMO`.

## 3. Start Simulated OPAS first

Open VS Code in the extracted folder. Open Terminal 1 and run:

```powershell
cd Simulated-OPAS
npm install
npm run dev
```

Keep this terminal running. The simulated application should be available at `http://localhost:3000`.

## 4. Configure and start SmartGuide

Open a second terminal in the package root and run:

```powershell
cd OPAS-SmartGuide
Copy-Item .env.local.example .env.local
```

Open `OPAS-SmartGuide/.env.local` and check that this line is present:

```env
SIMULATED_OPAS_API_BASE_URL=http://127.0.0.1:3000
```

Keep the demo settings for local testing. Set your Resend API key and verified sender only when you are ready to test email delivery. Never paste API keys into chat or commit `.env.local` to Git.

Then run:

```powershell
npm install
npm run dev
```

Keep this terminal running. SmartGuide should be available at `http://localhost:3001`.

## 5. Test the connection

1. Open `http://localhost:3000`.
2. Register a fictional test applicant. Do not use real NRC details, official OPAS credentials or real applicant information.
3. Create a passport application and complete the personal details and document steps.
4. Make a simulated successful payment. This is a prototype transaction only; it does not contact a bank or the Government Payment Gateway.
5. Leave the application in the paid-but-not-submitted state if the application flow permits it.
6. Open `http://localhost:3001` in another browser tab.
7. Sign in to SmartGuide using a staff demo account from the login screen. The local demo password configured in `.env.local.example` is `GuidewiseDemo2026!`.
8. Open the Payment / Submission Monitor and refresh it. It should request the transaction and detection data from Simulated OPAS through the SmartGuide backend proxy.
9. Submit the application in Simulated OPAS and refresh the SmartGuide monitor. The paid-but-not-submitted detection should clear once the Simulated OPAS status endpoint reports the submitted state.

## 6. Connection check (optional)

With both apps running, open these URLs in a browser to check the Simulated OPAS API directly:

- `http://127.0.0.1:3000/api/payment/transactions`
- `http://127.0.0.1:3000/api/applications/status`
- `http://127.0.0.1:3000/api/smartguide/detections`

The SmartGuide proxy routes are protected by SmartGuide sign-in. The UI monitor is the recommended test path.

## 7. Important limitations

- This is a simulated local integration, not a connection to Zambia's official OPAS, a real payment gateway, a bank, or a Ministry database.
- Application status and synthetic identity records are still development/demo stores. Payment ledger transactions are additionally saved to `Simulated-OPAS/data/payment-ledger.json` for local restart persistence. This is a local prototype file, not a production database; protect and clear it when appropriate.
- SmartGuide's applicant/staff authentication in this package is prototype authentication. A real shared applicant identity / SSO integration requires an approved identity-provider flow and must not be inferred from the payment/status API connection.
- Resend delivery requires valid server-side `RESEND_API_KEY` and `NOTIFICATION_FROM_EMAIL` configuration. Use `NOTIFICATION_TEST_RECIPIENT` to redirect test emails to your own inbox. A successful API request is not the same as confirmed delivery.
- Do not use real passport applicant data, official passwords, production payment details, or live government credentials in this demo.
- Production deployment requires Ministry approval, documented and authenticated APIs, TLS, secure identity integration, durable database storage, access controls, audit logging, monitoring, and security review.

## 8. Preserving your original project

The SmartGuide folder in this package is copied from the Resend standalone test project; the Simulated OPAS folder is included alongside it as a separate application. Your uploaded original archive is not overwritten by this package.
