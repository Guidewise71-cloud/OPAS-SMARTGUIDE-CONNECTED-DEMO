import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { postSignedEvent, signOpasRequest } from '../server/opasIntegration.ts';

const secret = 'local-test-integration-secret-with-at-least-32-characters';
const fixedNow = new Date('2026-11-09T04:00:00.000Z');

describe('Simulated OPAS signed SmartGuide client', () => {
  it('sends the expected endpoint, timestamp and HMAC signature', async () => {
    let capturedUrl = '';
    let capturedInit: RequestInit | undefined;
    const fakeFetch: typeof fetch = async (input, init) => {
      capturedUrl = String(input);
      capturedInit = init;
      return new Response(JSON.stringify({ success: true, accepted: true }), { status: 200 });
    };
    const payload = { applicationReference: 'ZM-PAS-2026-123456', applicationStatus: 'SUBMITTED' };
    const result = await postSignedEvent(
      'http://127.0.0.1:3001/',
      '/api/integration/opas/application-events',
      secret,
      payload,
      fakeFetch,
      fixedNow,
    );
    const rawBody = JSON.stringify(payload);
    const timestamp = String(Math.floor(fixedNow.getTime() / 1000));
    const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
    assert.equal(capturedUrl, 'http://127.0.0.1:3001/api/integration/opas/application-events');
    assert.equal((capturedInit?.headers as Record<string, string>)['X-OPAS-Timestamp'], timestamp);
    assert.equal((capturedInit?.headers as Record<string, string>)['X-OPAS-Signature'], expected);
    assert.deepEqual(result, { status: 200, body: { success: true, accepted: true } });
  });

  it('rejects a short or missing integration secret before sending', async () => {
    let called = false;
    const fakeFetch: typeof fetch = async () => {
      called = true;
      return new Response('{}', { status: 200 });
    };
    await assert.rejects(() => postSignedEvent(
      'http://127.0.0.1:3001', '/api/integration/opas/payment-events', 'short', {}, fakeFetch, fixedNow,
    ), /at least 32 characters/);
    assert.equal(called, false);
  });

  it('surfaces a SmartGuide HTTP error instead of silently accepting it', async () => {
    const fakeFetch: typeof fetch = async () => new Response(JSON.stringify({ error: 'Unknown application' }), { status: 404 });
    await assert.rejects(() => postSignedEvent(
      'http://127.0.0.1:3001', '/api/integration/opas/payment-events', secret, {}, fakeFetch, fixedNow,
    ), /Unknown application/);
  });
});
