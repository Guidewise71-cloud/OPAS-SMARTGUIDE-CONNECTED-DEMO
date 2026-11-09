// Test client that plays the part of Simulated OPAS when exercising SmartGuide.
// This module is server-side only: it uses the shared HMAC secret and must never
// be imported by React/browser code.
import { signOpasRequest, type ApplicationEventInput, type PaymentEventInput } from './opasPaymentIntegration.ts';

export interface SignedPostResult {
  status: number;
  body: unknown;
}

export async function postSignedEvent(
  baseUrl: string,
  path: '/api/integration/opas/payment-events' | '/api/integration/opas/application-events',
  secret: string,
  payload: Record<string, unknown>,
  fetchImpl: typeof fetch = fetch,
  now: Date = new Date(),
): Promise<SignedPostResult> {
  if (!secret || secret.length < 32) {
    throw new Error('OPAS_INTEGRATION_SECRET must contain at least 32 characters.');
  }
  const rawBody = JSON.stringify(payload);
  const timestamp = String(Math.floor(now.getTime() / 1000));
  const response = await fetchImpl(`${baseUrl.replace(/\/$/, '')}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-OPAS-Timestamp': timestamp,
      'X-OPAS-Signature': signOpasRequest(secret, timestamp, rawBody),
    },
    body: rawBody,
    signal: AbortSignal.timeout(10_000),
  });
  return { status: response.status, body: await response.json().catch(() => null) };
}

export const sendPaymentEvent = (
  baseUrl: string,
  secret: string,
  event: PaymentEventInput,
) => postSignedEvent(
  baseUrl,
  '/api/integration/opas/payment-events',
  secret,
  event as unknown as Record<string, unknown>,
);

export const sendApplicationEvent = (
  baseUrl: string,
  secret: string,
  event: Omit<ApplicationEventInput, 'occurredAt'> & { occurredAt?: string },
) => postSignedEvent(
  baseUrl,
  '/api/integration/opas/application-events',
  secret,
  event as unknown as Record<string, unknown>,
);
