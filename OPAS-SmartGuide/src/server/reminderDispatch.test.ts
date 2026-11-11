import { describe, expect, it, vi } from 'vitest';
import { buildCorrectionLink, classifyCorrectionField } from '../utils/correctionLinks';
import { buildReminderMessage, deliverWithFallback, forwardToReminderEngine, toE164 } from './reminderDispatch';
import type { PassportApplication } from '../types/passport';

const base = {
  id: 'a1', trackingNumber: 'ZM-PAS-2026-100125', fullName: 'Natasha Chilufya', nrcNumber: '111111/11/1',
  status: 'Reverted', daysInStatus: 3, notifications: [], reversionReason: 'Passport photo background is not white.',
  contact: { phone: '0971234567', phoneCountryCode: '+260', email: 'natasha@example.org' },
} as unknown as PassportApplication;

describe('correction links', () => {
  it('maps officer comments to the field and wizard step', () => {
    expect(classifyCorrectionField('Photo has glare on glasses').field).toBe('photo');
    expect(classifyCorrectionField('NRC copy borders are cut off').step).toBe(4);
    expect(classifyCorrectionField('Name mismatch between NRC and birth certificate').field).toBe('nrc');
    expect(classifyCorrectionField('Surname spelling differs').field).toBe('personal_details');
    expect(classifyCorrectionField('').field).toBe('documents');
  });

  it('builds a link that opens one application at the field to fix', () => {
    const { url } = buildCorrectionLink('http://localhost:3000/', 'ZM-PAS-2026-100125', 'fix', 'photo background');
    expect(url).toBe('http://localhost:3000/?application=ZM-PAS-2026-100125&action=fix&field=photo');
    expect(buildCorrectionLink('https://opas.example', 'X-1', 'submit').url).toBe('https://opas.example/?application=X-1&action=submit');
  });
});

describe('reminder message', () => {
  it('includes the deep link, the field and the officer comment without a double period', () => {
    const msg = buildReminderMessage(base, 2, { OPAS_PUBLIC_URL: 'https://opas.example' });
    expect(msg.link).toContain('application=ZM-PAS-2026-100125');
    expect(msg.sms).toContain('Passport photo');
    expect(msg.sms).not.toContain('..');
    expect(msg.text).toContain('green confirmation screen');
    expect(msg.subject).toContain('reminder 2');
  });

  it('tells paid-unsubmitted applicants not to pay again', () => {
    const msg = buildReminderMessage({ ...base, status: 'Paid - Unsubmitted' } as PassportApplication, 1, {});
    expect(msg.sms).toMatch(/Do not pay again/i);
    expect(msg.link).toContain('action=submit');
  });
});

describe('delivery with fallback', () => {
  it('normalises Zambian numbers', () => {
    expect(toE164('0971234567')).toBe('+260971234567');
    expect(toE164('260971234567')).toBe('+260971234567');
    expect(toE164('')).toBe('');
  });

  it('falls back to email when SMS fails, and records why', async () => {
    const msg = buildReminderMessage(base, 1, {});
    const outcome = await deliverWithFallback(base, ['SMS', 'Email', 'OPAS Message Board'], msg, {
      sendSms: async () => ({ ok: false, reason: 'Twilio rejected the SMS (400): invalid From' }),
      sendEmail: async () => ({ ok: true, providerMessageId: 'em_1' }),
    });
    expect(outcome.channel).toBe('Email');
    expect(outcome.deliveryStatus).toBe('Sent');
    expect(outcome.attempts[0]).toMatchObject({ channel: 'SMS', ok: false });
  });

  it('never marks a message Sent when no provider accepted it', async () => {
    const msg = buildReminderMessage(base, 1, {});
    const outcome = await deliverWithFallback(base, ['SMS', 'Email', 'OPAS Message Board'], msg, {
      sendSms: async () => ({ ok: false, reason: 'down' }),
      sendEmail: async () => ({ ok: false, reason: 'bounced' }),
    });
    expect(outcome.deliveryStatus).toBe('Queued');
    expect(outcome.channel).toBe('OPAS Message Board');
    expect(outcome.failureReason).toContain('SMS - down');
  });
});

describe('n8n reminder engine bridge', () => {
  it('skips when not configured', async () => {
    expect(await forwardToReminderEngine('REVERTED', base, { env: {} })).toMatchObject({ skipped: true });
  });

  it('posts the payload the n8n workflow expects, signed when a secret is set', async () => {
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 200 }));
    const result = await forwardToReminderEngine('REVERTED', base, {
      env: { N8N_REMINDER_WEBHOOK_URL: 'https://n8n.example/webhook/opas-reminder-status-event', N8N_REMINDER_WEBHOOK_SECRET: 's'.repeat(32), OPAS_PUBLIC_URL: 'https://opas.example' },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.ok).toBe(true);
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({ event: 'REVERTED', application_reference: 'ZM-PAS-2026-100125', phone: '+260971234567', email: 'natasha@example.org' });
    expect(body.action_link).toBe('https://opas.example/?application=ZM-PAS-2026-100125&action=fix&field=photo');
    expect((init.headers as Record<string, string>)['X-OPAS-Signature']).toMatch(/^[a-f0-9]{64}$/);
  });
});
