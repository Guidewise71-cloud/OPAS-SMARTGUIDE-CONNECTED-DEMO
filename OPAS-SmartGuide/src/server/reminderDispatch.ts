// Reminder delivery for reverted and paid-but-unsubmitted applications.
// - Builds the applicant message with a deep link to the exact application and field.
// - Sends through real providers when configured (Twilio SMS, Resend email) and falls back to the
//   next channel when one fails. A message is only marked "Sent" when a provider accepted it.
// - Optionally forwards lifecycle events to the n8n "OPAS Reminder Engine" webhook, which runs the
//   repeated reminders, delivery tracking and officer escalation outside this server.
import { createHmac } from 'node:crypto';
import type { PassportApplication, NotificationLog } from '../types/passport.ts';
import { buildCorrectionLink, type CorrectionTarget } from '../utils/correctionLinks.ts';
import type { ReminderChannel } from '../utils/reminderRules.ts';
import { sendEmailViaResend, isResendConfigured } from './resendEmail.ts';

type Env = Record<string, string | undefined>;

export type ProviderResult = { ok: true; providerMessageId: string } | { ok: false; reason: string; notConfigured?: boolean };

export interface ReminderMessage {
  subject: string;
  text: string;
  sms: string;
  link: string;
  target?: CorrectionTarget;
}

export interface DeliveryAttempt {
  channel: ReminderChannel;
  ok: boolean;
  providerMessageId?: string;
  reason?: string;
  notConfigured?: boolean;
}

export interface DeliveryOutcome {
  channel: ReminderChannel;
  deliveryStatus: NotificationLog['deliveryStatus'];
  providerMessageId?: string;
  failureReason?: string;
  attempts: DeliveryAttempt[];
}

export function opasPublicUrl(env: Env = process.env): string {
  return env.OPAS_PUBLIC_URL?.trim() || 'http://localhost:3000';
}

export function isTwilioConfigured(env: Env = process.env): boolean {
  return Boolean(env.TWILIO_ACCOUNT_SID?.trim() && env.TWILIO_AUTH_TOKEN?.trim() && env.TWILIO_FROM_NUMBER?.trim());
}

export function isReminderEngineConfigured(env: Env = process.env): boolean {
  return Boolean(env.N8N_REMINDER_WEBHOOK_URL?.trim());
}

/** Build the applicant reminder. Wording is fixed (not AI-generated) so it is always accurate. */
export function buildReminderMessage(application: PassportApplication, reminderNumber: number, env: Env = process.env): ReminderMessage {
  const ref = application.trackingNumber;
  const name = application.fullName || 'Applicant';
  if (application.status === 'Reverted') {
    const comment = (application.reversionReason || application.officerNotes || '').trim().replace(/\.+$/, '');
    const { url, target } = buildCorrectionLink(opasPublicUrl(env), ref, 'fix', comment);
    const fix = target ? `What to fix: ${target.label}.` : '';
    return {
      link: url,
      target,
      subject: `Action required (reminder ${reminderNumber}): passport application ${ref} was returned for corrections`,
      sms: `OPAS: Application ${ref} was RETURNED and is NOT being processed. ${fix} ${comment ? `Officer: ${comment}.` : ''} Fix and press RESUBMIT: ${url}`.replace(/\s+/g, ' ').trim(),
      text: [
        `Dear ${name},`,
        '',
        `Your passport application ${ref} has been RETURNED to you for corrections.`,
        'It is NOT being processed until you correct it and press RESUBMIT.',
        '',
        fix,
        comment ? `Officer comment: ${comment}.` : '',
        '',
        `Open your application directly here: ${url}`,
        '1. Log in. The link takes you straight to the part that must be fixed.',
        '2. Make the correction.',
        '3. Press RESUBMIT and wait for the green confirmation screen. If you do not see it, the resubmission did not go through.',
        '',
        'You do not need to pay again.',
        '',
        'OPAS - Department of National Registration, Passport and Citizenship',
      ].filter((line, i, all) => !(line === '' && all[i - 1] === '')).join('\n'),
    };
  }
  const { url } = buildCorrectionLink(opasPublicUrl(env), ref, 'submit');
  return {
    link: url,
    subject: `Action required (reminder ${reminderNumber}): your passport payment for ${ref} is received but the application is NOT submitted`,
    sms: `OPAS: Payment for ${ref} received, but the application is NOT submitted yet. Do not pay again. Open it and press SUBMIT: ${url}`,
    text: [
      `Dear ${name},`,
      '',
      `We have received your payment for passport application ${ref}.`,
      'Your application is NOT submitted yet. It is still in Drafts and will not be processed.',
      'Do NOT pay again.',
      '',
      `Open your application directly here: ${url}`,
      '1. Log in.',
      '2. Check your details and press SUBMIT.',
      '3. Wait for the green confirmation screen with your reference number.',
      '',
      'OPAS - Department of National Registration, Passport and Citizenship',
    ].join('\n'),
  };
}

/** Normalise a Zambian number to E.164 (+260...). Returns '' when the number is unusable. */
export function toE164(phone: string, countryCode = '+260'): string {
  const digits = String(phone || '').replace(/[^\d+]/g, '');
  if (!digits) return '';
  if (digits.startsWith('+')) return digits.length >= 11 ? digits : '';
  if (digits.startsWith('00')) return `+${digits.slice(2)}`;
  if (digits.startsWith('0')) return `${countryCode}${digits.slice(1)}`;
  if (digits.startsWith('260')) return `+${digits}`;
  return `${countryCode}${digits}`;
}

export async function sendSmsViaTwilio(
  to: string,
  body: string,
  env: Env = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<ProviderResult> {
  if (!isTwilioConfigured(env)) return { ok: false, reason: 'Twilio SMS is not configured.', notConfigured: true };
  const sid = env.TWILIO_ACCOUNT_SID!.trim();
  const token = env.TWILIO_AUTH_TOKEN!.trim();
  const form = new URLSearchParams({ To: to, From: env.TWILIO_FROM_NUMBER!.trim(), Body: body });
  if (env.TWILIO_STATUS_CALLBACK_URL?.trim()) form.set('StatusCallback', env.TWILIO_STATUS_CALLBACK_URL.trim());
  try {
    const response = await fetchImpl(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await response.json().catch(() => ({}))) as { sid?: string; message?: string; code?: number };
    if (!response.ok || !data.sid) {
      return { ok: false, reason: `Twilio rejected the SMS (${response.status}${data.code ? `, code ${data.code}` : ''}): ${data.message ?? 'unknown error'}` };
    }
    return { ok: true, providerMessageId: data.sid };
  } catch (error) {
    return { ok: false, reason: `Twilio request failed: ${error instanceof Error ? error.message : 'unknown error'}` };
  }
}

export interface DeliveryDeps {
  sendSms?: (to: string, body: string) => Promise<ProviderResult>;
  sendEmail?: (to: string, subject: string, text: string) => Promise<ProviderResult>;
  env?: Env;
}

/**
 * Try each available channel in priority order until one provider accepts the message.
 * WhatsApp and the OPAS Message Board have no live provider here, so the message board is the
 * guaranteed last resort and is recorded as "Queued" (visible to the applicant on next login).
 */
export async function deliverWithFallback(
  application: PassportApplication,
  channels: ReminderChannel[],
  message: ReminderMessage,
  deps: DeliveryDeps = {},
): Promise<DeliveryOutcome> {
  const env = deps.env ?? process.env;
  const sendSms = deps.sendSms ?? ((to, body) => sendSmsViaTwilio(to, body, env));
  const sendEmail = deps.sendEmail ?? (async (to, subject, text): Promise<ProviderResult> => {
    if (!isResendConfigured(env)) return { ok: false, reason: 'Resend email is not configured.', notConfigured: true };
    return sendEmailViaResend({ to, subject, text }, env);
  });

  const attempts: DeliveryAttempt[] = [];
  for (const channel of channels) {
    if (channel === 'SMS') {
      const to = toE164(application.contact.phone, application.contact.phoneCountryCode || '+260');
      if (!to) { attempts.push({ channel, ok: false, reason: 'No usable phone number on file.' }); continue; }
      const result = await sendSms(to, message.sms);
      attempts.push(result.ok ? { channel, ok: true, providerMessageId: result.providerMessageId } : { channel, ok: false, reason: result.reason, notConfigured: result.notConfigured });
      if (result.ok) return { channel, deliveryStatus: 'Sent', providerMessageId: result.providerMessageId, attempts };
    } else if (channel === 'Email') {
      const to = application.contact.email?.trim();
      if (!to) { attempts.push({ channel, ok: false, reason: 'No email address on file.' }); continue; }
      const result = await sendEmail(to, message.subject, message.text);
      attempts.push(result.ok ? { channel, ok: true, providerMessageId: result.providerMessageId } : { channel, ok: false, reason: result.reason, notConfigured: result.notConfigured });
      if (result.ok) return { channel, deliveryStatus: 'Sent', providerMessageId: result.providerMessageId, attempts };
    } else if (channel === 'WhatsApp') {
      attempts.push({ channel, ok: false, reason: 'WhatsApp provider is not connected in this build.', notConfigured: true });
    } else if (channel === 'OPAS Message Board') {
      attempts.push({ channel, ok: true });
      const failed = attempts.filter((a) => !a.ok && !a.notConfigured);
      return {
        channel,
        deliveryStatus: 'Queued',
        failureReason: failed.length ? `Fell back to the OPAS Message Board after: ${failed.map((a) => `${a.channel} - ${a.reason}`).join('; ')}` : undefined,
        attempts,
      };
    }
  }
  const last = attempts[attempts.length - 1];
  return {
    channel: last?.channel ?? channels[0] ?? 'OPAS Message Board',
    deliveryStatus: 'Failed',
    failureReason: attempts.map((a) => `${a.channel}: ${a.reason}`).join('; ') || 'No reminder channel is available for this applicant.',
    attempts,
  };
}

// ---------------------------------------------------------------------------
// n8n reminder engine bridge
// ---------------------------------------------------------------------------
export type ReminderEngineEvent = 'REVERTED' | 'PAID_UNSUBMITTED' | 'SUBMITTED' | 'RESUBMITTED' | 'CANCELLED';

export async function forwardToReminderEngine(
  event: ReminderEngineEvent,
  application: Pick<PassportApplication, 'trackingNumber' | 'fullName' | 'contact' | 'reversionReason' | 'officerNotes'>,
  options: { officerComment?: string; env?: Env; fetchImpl?: typeof fetch; now?: Date } = {},
): Promise<{ ok: boolean; skipped?: boolean; status?: number; reason?: string }> {
  const env = options.env ?? process.env;
  const url = env.N8N_REMINDER_WEBHOOK_URL?.trim();
  if (!url) return { ok: false, skipped: true, reason: 'N8N_REMINDER_WEBHOOK_URL is not configured.' };
  const comment = (options.officerComment ?? application.reversionReason ?? application.officerNotes ?? '').trim();
  const action = event === 'REVERTED' ? 'fix' : 'submit';
  const payload = {
    event,
    application_reference: application.trackingNumber,
    applicant_name: application.fullName,
    email: application.contact?.email || '',
    phone: toE164(application.contact?.phone || '', application.contact?.phoneCountryCode || '+260'),
    officer_comment: event === 'REVERTED' ? comment : '',
    action_link: buildCorrectionLink(opasPublicUrl(env), application.trackingNumber, action, comment).url,
    event_at: (options.now ?? new Date()).toISOString(),
  };
  const rawBody = JSON.stringify(payload);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const secret = env.N8N_REMINDER_WEBHOOK_SECRET?.trim();
  if (secret) {
    const timestamp = String(Math.floor(Date.now() / 1000));
    headers['X-OPAS-Timestamp'] = timestamp;
    headers['X-OPAS-Signature'] = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  }
  try {
    const response = await (options.fetchImpl ?? fetch)(url, { method: 'POST', headers, body: rawBody, signal: AbortSignal.timeout(10_000) });
    return response.ok ? { ok: true, status: response.status } : { ok: false, status: response.status, reason: `Reminder engine answered HTTP ${response.status}` };
  } catch (error) {
    return { ok: false, reason: `Reminder engine unreachable: ${error instanceof Error ? error.message : 'unknown error'}` };
  }
}
