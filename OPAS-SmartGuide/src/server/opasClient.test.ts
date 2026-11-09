import { describe, expect, it } from 'vitest';
import { signOpasRequest, verifyOpasSignature } from './opasPaymentIntegration.ts';
import { postSignedEvent } from './opasClient.ts';

describe('Simulated OPAS command-line event client', () => {
  it('posts the exact JSON body with a valid timestamped HMAC signature', async () => {
    const secret = 'local-test-integration-secret-with-more-than-32-characters';
    const now = new Date('2026-11-09T04:00:00.000Z');
    let captured: { url: string; init?: RequestInit } | undefined;
    const fakeFetch: typeof fetch = async (input, init) => {
      captured = { url: String(input), init };
      return new Response(JSON.stringify({ success: true, paymentRecorded: true }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    };
    const payload = { applicationReference: 'OPAS-2026-001', applicationStatus: 'SUBMITTED' };
    const result = await postSignedEvent(
      'http://localhost:3001/',
      '/api/integration/opas/application-events',
      secret,
      payload,
      fakeFetch,
      now,
    );

    expect(captured?.url).toBe('http://localhost:3001/api/integration/opas/application-events');
    const headers = new Headers(captured?.init?.headers);
    const rawBody = String(captured?.init?.body);
    expect(headers.get('X-OPAS-Timestamp')).toBe(String(Math.floor(now.getTime() / 1000)));
    expect(verifyOpasSignature(secret, rawBody, headers.get('X-OPAS-Timestamp') ?? undefined, headers.get('X-OPAS-Signature') ?? undefined, now).ok).toBe(true);
    expect(JSON.parse(rawBody)).toEqual(payload);
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ success: true, paymentRecorded: true });
  });

  it('rejects a missing or too-short shared secret before making a request', async () => {
    let called = false;
    const fakeFetch: typeof fetch = async () => {
      called = true;
      return new Response('{}', { status: 200 });
    };
    await expect(postSignedEvent(
      'http://localhost:3001',
      '/api/integration/opas/payment-events',
      'short',
      { applicationReference: 'OPAS-2026-001' },
      fakeFetch,
    )).rejects.toThrow('at least 32 characters');
    expect(called).toBe(false);
  });
});
