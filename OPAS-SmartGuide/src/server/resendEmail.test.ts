import { describe, expect, it, vi } from 'vitest';
import { fetchResendDeliveryState, isEmailTestMode, isResendConfigured, sendEmailViaResend } from './resendEmail.ts';

describe('Resend email adapter', () => {
  it('requires both the API key and sender address', () => {
    expect(isResendConfigured({ RESEND_API_KEY: 'key' })).toBe(false);
    expect(isResendConfigured({ RESEND_API_KEY: ' key ', NOTIFICATION_FROM_EMAIL: ' notices@example.com ' })).toBe(true);
  });

  it('redirects messages to the test recipient and labels the original recipient', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 're_test_123' }), { status: 200 }));
    const result = await sendEmailViaResend(
      { to: 'applicant@example.com', subject: 'Payment reminder', text: 'Please submit.' },
      { RESEND_API_KEY: 'secret', NOTIFICATION_FROM_EMAIL: 'demo@example.com', NOTIFICATION_TEST_RECIPIENT: 'tester@example.com' },
      fetchMock as unknown as typeof fetch,
    );
    expect(result).toEqual({ ok: true, providerMessageId: 're_test_123' });
    const request = fetchMock.mock.calls[0];
    const payload = JSON.parse(String(request[1]?.body));
    expect(payload.to).toEqual(['tester@example.com']);
    expect(payload.subject).toContain('[TEST for applicant@example.com]');
    expect(isEmailTestMode({ NOTIFICATION_TEST_RECIPIENT: 'tester@example.com' })).toBe(true);
  });

  it('does not treat a successful API acceptance as delivered', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ last_event: 'sent' }), { status: 200 }));
    await expect(fetchResendDeliveryState('re_test_123', { RESEND_API_KEY: 'secret' }, fetchMock as unknown as typeof fetch)).resolves.toBe('pending');
  });

  it('maps bounce and delivery events', async () => {
    const delivered = vi.fn().mockResolvedValue(new Response(JSON.stringify({ last_event: 'delivered' }), { status: 200 }));
    const bounced = vi.fn().mockResolvedValue(new Response(JSON.stringify({ last_event: 'bounced' }), { status: 200 }));
    await expect(fetchResendDeliveryState('re_1', { RESEND_API_KEY: 'secret' }, delivered as unknown as typeof fetch)).resolves.toBe('delivered');
    await expect(fetchResendDeliveryState('re_2', { RESEND_API_KEY: 'secret' }, bounced as unknown as typeof fetch)).resolves.toBe('bounced');
  });
});
