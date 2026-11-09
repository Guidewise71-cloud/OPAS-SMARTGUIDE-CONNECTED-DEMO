// Resend email adapter. API credentials are read from the server environment only.
export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export type SendResult =
  | { ok: true; providerMessageId: string }
  | { ok: false; reason: string };

export type EmailDeliveryState = 'delivered' | 'bounced' | 'pending' | 'unknown';
type Env = Record<string, string | undefined>;

const RESEND_URL = 'https://api.resend.com/emails';

export function isResendConfigured(env: Env = process.env): boolean {
  return Boolean(env.RESEND_API_KEY?.trim() && env.NOTIFICATION_FROM_EMAIL?.trim());
}

export function isEmailTestMode(env: Env = process.env): boolean {
  return Boolean(env.NOTIFICATION_TEST_RECIPIENT?.trim());
}

export async function sendEmailViaResend(
  message: EmailMessage,
  env: Env = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<SendResult> {
  const key = env.RESEND_API_KEY?.trim();
  const from = env.NOTIFICATION_FROM_EMAIL?.trim();
  if (!key || !from) return { ok: false, reason: 'Resend is not configured.' };

  const testRecipient = env.NOTIFICATION_TEST_RECIPIENT?.trim();
  const to = testRecipient || message.to;
  const cleanSubject = message.subject.replace(/[\r\n]+/g, ' ').trim();
  const subject = testRecipient ? `[TEST for ${message.to}] ${cleanSubject}` : cleanSubject;

  try {
    const response = await fetchImpl(RESEND_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, text: message.text }),
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await response.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!response.ok) {
      return { ok: false, reason: `Resend rejected the message (${response.status}): ${body.message ?? 'unknown error'}` };
    }
    if (!body.id) return { ok: false, reason: 'Resend accepted the request but returned no message id.' };
    return { ok: true, providerMessageId: body.id };
  } catch (error) {
    return { ok: false, reason: `Resend request failed: ${error instanceof Error ? error.message : 'unknown error'}` };
  }
}

/** Checks the provider event; acceptance alone is not treated as delivery. */
export async function fetchResendDeliveryState(
  providerMessageId: string,
  env: Env = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<EmailDeliveryState> {
  const key = env.RESEND_API_KEY?.trim();
  if (!key) return 'unknown';
  try {
    const response = await fetchImpl(`${RESEND_URL}/${encodeURIComponent(providerMessageId)}`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return 'unknown';
    const body = (await response.json()) as { last_event?: string };
    switch (body.last_event) {
      case 'delivered': case 'opened': case 'clicked': return 'delivered';
      case 'bounced': case 'complained': case 'failed': return 'bounced';
      case 'sent': case 'queued': case 'scheduled': case 'delivery_delayed': return 'pending';
      default: return 'unknown';
    }
  } catch {
    return 'unknown';
  }
}
