# n8n applicant details validation

SmartGuide sends applicant details (typed fields or a free-text correction) to the n8n workflow
"OPAS SmartGuide - Validate & Correct Applicant Details". n8n checks them with fixed rules plus AI:

- **200 accepted**: all details pass. SmartGuide saves them on the application automatically.
- **422 rejected**: some details fail. SmartGuide saves only `acceptedCorrections` and shows the AI guidance.
- n8n unreachable or unexpected answer: nothing is changed (HTTP 502 to the browser).

Webhook: `POST https://al-alw.app.n8n.cloud/webhook/opas-smartguide-validate`, secured with a header secret.

## Remaining manual step: register the route in `OPAS-SmartGuide/server.ts`

### 1. Import (next to the other ./src/server imports)

```ts
import { createDetailsCorrectionHandler } from './src/server/applicantDetailsCorrection.ts';
```

### 2. Route (after the `GET /api/integration/validation-results/:reference` route)

```ts
// Applicant fixes their own details. n8n validates them; passing values are saved automatically.
app.post('/api/smartguide/application-details', requireSignedIn, createDetailsCorrectionHandler({
  getApplicant: (req) => {
    const session = getSessionFromRequest(req);
    if (!session || session.role !== 'citizen' || session.authSource !== 'simulated-opas') return null;
    const user = INITIAL_USERS.find(u => u.id === session.userId && u.role === 'citizen' && u.status === 'ACTIVE');
    return user ? { id: user.id, nrcNumber: user.nrcNumber, email: user.email } : null;
  },
  getApplications: () => reminderApplications,
  storeApplication: async (application) => {
    await saveApplication(application);
    reminderApplications = reminderApplications.map(a => a.id === application.id ? application : a);
  },
  validationResults: latestValidationResults,
  audit: (event) => saveIntegrationEvent(event),
}));
```

### 3. Local `.env`

```
SMARTGUIDE_VALIDATION_WEBHOOK_URL="https://al-alw.app.n8n.cloud/webhook/opas-smartguide-validate"
SMARTGUIDE_VALIDATION_HEADER_NAME="<header name from the n8n Header Auth credential>"
SMARTGUIDE_VALIDATION_SECRET="<header value from the n8n Header Auth credential>"
```

## Calling it from the SmartGuide chat or form

```ts
// Free-text correction typed in the SmartGuide chat
await fetch('/api/smartguide/application-details', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ applicationReference, applicantMessage: userText }),
});

// Details typed into a form field
await fetch('/api/smartguide/application-details', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ applicationReference, fields: { phoneNumber: '0977123456' } }),
});
// 200 -> show assistantMessage; details were saved (updatedFields lists which)
// 422 -> show assistantMessage + fieldGuidance; updatedFields lists any parts still saved
```

## Notes

- `fullName` is split into first, middle and surname. A one-word name fails the surname check.
- Passport types accepted: 32-Page Ordinary, 48-Page Frequent Traveler, Diplomatic, Official.
- Validation rules are demo rules. Align them with official OPAS requirements before production.
