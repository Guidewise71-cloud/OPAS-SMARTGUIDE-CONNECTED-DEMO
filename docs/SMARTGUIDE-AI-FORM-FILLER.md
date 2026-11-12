# SmartGuide AI fills the Simulated OPAS application form

Local demonstration only. Simulated OPAS is not the real MoHAIS OPAS, and nothing here submits, pays for or verifies an application. Use fictional test data.

## Flow

1. **Simulated OPAS** citizen dashboard (`http://localhost:3000`) → card **SmartGuide AI fills your form** → **Open SmartGuide AI assistant**.
2. **OPAS SmartGuide** page `http://localhost:3001/ai-fill` (public, no sign-in, because first-time applicants have no application yet). The applicant chats in plain language. SmartGuide calls Gemini (`gemini-2.5-flash`, JSON output) and shows a live form preview plus the required fields still missing.
3. The applicant presses **Send to my OPAS application**. SmartGuide signs the draft with `OPAS_INTEGRATION_SECRET` and posts it to Simulated OPAS. OPAS stores it and returns a one-time claim code such as `H7RW-BZ5X` (valid 24 hours).
4. **Open OPAS and fill my form** opens `http://localhost:3000/?smartguidePrefill=CODE`. After sign-in, OPAS claims the code, creates a new application and opens the wizard with the fields filled in. The applicant can also type the code on the dashboard.
5. The applicant reviews every step, uploads documents, signs the declaration and pays. A notice in the wizard and a status-history entry (`OPAS SmartGuide AI Application Filler`) mark pre-filled applications.

## Endpoints

| App | Endpoint | Caller | Protection |
|---|---|---|---|
| SmartGuide | `POST /api/smartguide/application-prefill/chat` | `/ai-fill` page | 30 turns / 10 min per client, 1,000 chars per message |
| SmartGuide | `POST /api/smartguide/application-prefill/send-to-opas` | `/ai-fill` page | 5 sends / 10 min per client; target must be local `http://localhost`/`127.0.0.1`; disabled when `NODE_ENV=production` |
| Simulated OPAS | `POST /api/integration/smartguide/prefill-drafts` | SmartGuide server | HMAC-SHA256 of `timestamp.rawBody` in `X-OPAS-Signature`, `X-OPAS-Timestamp` within 5 minutes |
| Simulated OPAS | `POST /api/smartguide-prefill/claim` `{ code }` | OPAS dashboard | Single use, 24 h expiry, 10 attempts / 10 min per client |

Both sides validate the draft against the same allow-list: known form fields only, allowed enum values, `YYYY-MM-DD` dates, NRC `######/##/#`, height 50 to 250 cm. Unknown fields are dropped. Missing required fields are computed in code from the same rules as OPAS Step 2, not by the model. The model is told to use only what the applicant said and never to guess.

## Configuration

`OPAS-SmartGuide/.env.local`

```
GEMINI_API_KEY=...
SIMULATED_OPAS_API_BASE_URL=http://127.0.0.1:3000
SIMULATED_OPAS_PUBLIC_URL=http://localhost:3000   # optional, used for the claim link
OPAS_INTEGRATION_SECRET=<same 32+ character value as Simulated OPAS>
```

`Simulated-OPAS/.env.local`

```
OPAS_INTEGRATION_SECRET=<same value>
VITE_SMARTGUIDE_PUBLIC_URL=http://localhost:3001   # optional
```

Simulated OPAS no longer needs `GEMINI_API_KEY` for this feature.

## Code

- SmartGuide: `src/server/applicationPrefill.ts` (allow-list, Gemini turn, signed sender), `src/server/applicationPrefillPlugin.ts` (routes, registered in `vite.config.ts`, dev server only), `src/components/prefill/AIApplicationFiller.tsx` (chat page), `src/main.tsx` (`/ai-fill`), tests in `src/server/applicationPrefill.test.ts`.
- Simulated OPAS: `server/smartGuidePrefill.ts` (signed receiver, claim store in git-ignored `data/smartguide-prefill-drafts.json`), `vite.prefill.config.ts` (used by `npm run dev`; `npm run dev:no-prefill` runs without it), `src/components/SmartGuidePrefillCard.tsx`, `src/utils/smartGuidePrefill.ts`, `src/App.tsx`.

## Test

1. Start SmartGuide (`npm run dev` in `OPAS-SmartGuide`) and Simulated OPAS (`npm run dev` in `Simulated-OPAS`).
2. Sign in to Simulated OPAS with a fictional applicant and press **Open SmartGuide AI assistant**.
3. Describe yourself with fictional details, press **Send to my OPAS application**, then **Open OPAS and fill my form**.
4. Check that Step 1 and Step 2 are filled, and that reusing the code is rejected.

`npx vitest run src/server/applicationPrefill.test.ts` in `OPAS-SmartGuide` runs the unit tests.
