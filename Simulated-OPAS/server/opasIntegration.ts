// Server-only signed client used by Simulated OPAS to send events to OPAS SmartGuide.
// Keep this module out of the browser bundle: it uses node:crypto and the shared secret.
import { createHmac } from 'node:crypto';

export function signOpasRequest(secret: string, timestamp: string, rawBody: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
}

export interface SignedPostResult {
  status: number;
  body: unknown;
}

export type IntegrationPath =
  | '/api/integration/opas/payment-events'
  | '/api/integration/opas/application-events'
  | '/api/integration/opas/applications';

export async function postSignedEvent(
  baseUrl: string,
  path: IntegrationPath,
  secret: string,
  payload: Record<string, unknown>,
  fetchImpl: typeof fetch = fetch,
  now: Date = new Date(),
): Promise<SignedPostResult> {
  if (!secret || secret.length < 32) throw new Error('OPAS_INTEGRATION_SECRET must contain at least 32 characters.');
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
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = body && typeof body === 'object' && 'error' in body ? String((body as {error: unknown}).error) : `HTTP ${response.status}`;
    throw new Error(`SmartGuide ${path} failed: ${detail}`);
  }
  return { status: response.status, body };
}

export type PaymentEventInput = {
  applicantId: string;
  applicationReference: string;
  transactionReference: string;
  paymentReferenceNumber: string;
  amount: number;
  currency: string;
  paymentStatus: 'SUCCESSFUL' | 'FAILED';
  paymentDate: string;
  applicationStatus: 'PAID_NOT_SUBMITTED' | 'SUBMITTED';
  gatewayConfirmation: string;
  opasAcknowledgementReference?: string;
};

export type ApplicationEventInput = {
  applicationReference: string;
  applicationStatus: 'PAID_NOT_SUBMITTED' | 'SUBMITTED' | 'REVERTED';
  occurredAt?: string;
  opasAcknowledgementReference?: string;
  officerComment?: string;
};

export const sendPaymentEvent = (baseUrl: string, secret: string, event: PaymentEventInput) =>
  postSignedEvent(baseUrl, '/api/integration/opas/payment-events', secret, event as unknown as Record<string, unknown>);

export const sendApplicationEvent = (baseUrl: string, secret: string, event: ApplicationEventInput) =>
  postSignedEvent(baseUrl, '/api/integration/opas/application-events', secret, event as unknown as Record<string, unknown>);

export const sendApplications = (baseUrl: string, secret: string, applications: Array<Record<string, unknown>>) =>
  postSignedEvent(baseUrl, '/api/integration/opas/applications', secret, { applications });
