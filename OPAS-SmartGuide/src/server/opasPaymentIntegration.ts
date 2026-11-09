// Inbound integration: Simulated OPAS (source of payment and application events) -> OPAS SmartGuide
// (intelligence and monitoring layer). Everything here is pure logic with no database or network access,
// so it can be unit tested. server.ts does the persistence and HTTP wiring.
import * as crypto from 'node:crypto';
import type { ApplicationStatus, NotificationLog, PassportApplication } from '../types/passport.ts';
import type { ReminderRule } from '../utils/reminderRules.ts';
import { availableChannels } from '../utils/reminderRules.ts';
import type { SimulatedPaymentTransaction } from './persistence.ts';

// ---------------------------------------------------------------------------------------------------------
// 1. Request authentication (HMAC-SHA256 over "<timestamp>.<raw body>")
// ---------------------------------------------------------------------------------------------------------

export const SIGNATURE_TOLERANCE_SECONDS = 300;

export function signOpasRequest(secret: string, timestamp: string, rawBody: string): string {
  return crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
}

export type SignatureCheck = { ok: true } | { ok: false; reason: string };

export function verifyOpasSignature(
  secret: string | undefined,
  rawBody: Buffer | string | undefined,
  timestampHeader: string | undefined,
  signatureHeader: string | undefined,
  now: Date = new Date()
): SignatureCheck {
  if (!secret) return { ok: false, reason: 'The OPAS integration secret is not configured on SmartGuide.' };
  if (!rawBody || !timestampHeader || !signatureHeader) return { ok: false, reason: 'Missing signature headers or body.' };

  const timestamp = Number(timestampHeader);
  if (!Number.isFinite(timestamp)) return { ok: false, reason: 'Invalid timestamp.' };
  // The timestamp is signed, so an old captured request cannot be replayed later.
  if (Math.abs(now.getTime() / 1000 - timestamp) > SIGNATURE_TOLERANCE_SECONDS) {
    return { ok: false, reason: 'Request timestamp is outside the allowed window.' };
  }

  const expected = Buffer.from(signOpasRequest(secret, timestampHeader, rawBody.toString()), 'hex');
  const received = Buffer.from(signatureHeader.trim(), 'hex');
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    return { ok: false, reason: 'Signature does not match.' };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------------------------------------
// 2. Payloads and validation
// ---------------------------------------------------------------------------------------------------------

export interface PaymentEventInput {
  applicantId: string;
  applicationReference: string;
  transactionReference: string;
  paymentReferenceNumber: string; // PRN
  amount: number;
  currency: string;
  paymentStatus: 'SUCCESSFUL' | 'FAILED';
  paymentDate: string; // normalised to ISO
  applicationStatus: 'PAID_NOT_SUBMITTED' | 'SUBMITTED';
  gatewayConfirmation: string;
  opasAcknowledgementReference?: string;
}

export interface ApplicationEventInput {
  applicationReference: string;
  applicationStatus: 'PAID_NOT_SUBMITTED' | 'SUBMITTED' | 'REVERTED';
  occurredAt: string; // normalised to ISO
  opasAcknowledgementReference?: string;
  officerComment?: string;
}

export type Validation<T> = { ok: true; value: T } | { ok: false; errors: string[] };

const REFERENCE_PATTERN = /^[A-Za-z0-9._\-/]{3,64}$/;

function readString(body: Record<string, unknown>, key: string, errors: string[], optional = false): string {
  const value = body[key];
  if (value === undefined || value === null || value === '') {
    if (!optional) errors.push(`${key} is required.`);
    return '';
  }
  if (typeof value !== 'string') {
    errors.push(`${key} must be a string.`);
    return '';
  }
  return value.trim();
}

function readReference(body: Record<string, unknown>, key: string, errors: string[], optional = false): string {
  const value = readString(body, key, errors, optional);
  if (value && !REFERENCE_PATTERN.test(value)) errors.push(`${key} has an invalid format.`);
  return value;
}

function readDate(body: Record<string, unknown>, key: string, errors: string[]): string {
  const raw = readString(body, key, errors);
  if (!raw) return '';
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    errors.push(`${key} is not a valid date.`);
    return '';
  }
  return parsed.toISOString();
}

export function validatePaymentEvent(body: unknown): Validation<PaymentEventInput> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, errors: ['A JSON object body is required.'] };
  const data = body as Record<string, unknown>;
  const errors: string[] = [];

  const applicantId = readString(data, 'applicantId', errors);
  const applicationReference = readReference(data, 'applicationReference', errors);
  const transactionReference = readReference(data, 'transactionReference', errors);
  const paymentReferenceNumber = readReference(data, 'paymentReferenceNumber', errors);
  const currency = readString(data, 'currency', errors).toUpperCase();
  const gatewayConfirmation = readString(data, 'gatewayConfirmation', errors);
  const opasAcknowledgementReference = readReference(data, 'opasAcknowledgementReference', errors, true);
  const paymentDate = readDate(data, 'paymentDate', errors);

  const amount = typeof data.amount === 'number' ? data.amount : Number.NaN;
  if (!Number.isFinite(amount) || amount <= 0) errors.push('amount must be a positive number.');
  if (currency && !/^[A-Z]{3}$/.test(currency)) errors.push('currency must be a 3-letter code.');

  const paymentStatus = readString(data, 'paymentStatus', errors).toUpperCase();
  if (paymentStatus && !['SUCCESSFUL', 'FAILED'].includes(paymentStatus)) errors.push('paymentStatus must be SUCCESSFUL or FAILED.');

  const applicationStatus = readString(data, 'applicationStatus', errors).toUpperCase();
  if (applicationStatus && !['PAID_NOT_SUBMITTED', 'SUBMITTED'].includes(applicationStatus)) {
    errors.push('applicationStatus must be PAID_NOT_SUBMITTED or SUBMITTED.');
  }

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      applicantId, applicationReference, transactionReference, paymentReferenceNumber, amount, currency,
      paymentStatus: paymentStatus as PaymentEventInput['paymentStatus'],
      paymentDate,
      applicationStatus: applicationStatus as PaymentEventInput['applicationStatus'],
      gatewayConfirmation,
      ...(opasAcknowledgementReference ? { opasAcknowledgementReference } : {}),
    },
  };
}

export function validateApplicationEvent(body: unknown, now: Date = new Date()): Validation<ApplicationEventInput> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, errors: ['A JSON object body is required.'] };
  const data = body as Record<string, unknown>;
  const errors: string[] = [];

  const applicationReference = readReference(data, 'applicationReference', errors);
  const opasAcknowledgementReference = readReference(data, 'opasAcknowledgementReference', errors, true);
  const officerComment = readString(data, 'officerComment', errors, true).slice(0, 1000);
  const applicationStatus = readString(data, 'applicationStatus', errors).toUpperCase();
  if (applicationStatus && !['PAID_NOT_SUBMITTED', 'SUBMITTED', 'REVERTED'].includes(applicationStatus)) {
    errors.push('applicationStatus must be PAID_NOT_SUBMITTED, SUBMITTED or REVERTED.');
  }
  const occurredAt = data.occurredAt === undefined ? now.toISOString() : readDate(data, 'occurredAt', errors);

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      applicationReference,
      applicationStatus: applicationStatus as ApplicationEventInput['applicationStatus'],
      occurredAt,
      ...(opasAcknowledgementReference ? { opasAcknowledgementReference } : {}),
      ...(officerComment ? { officerComment } : {}),
    },
  };
}

// ---------------------------------------------------------------------------------------------------------
// 3. Processing
// ---------------------------------------------------------------------------------------------------------

export interface IntegrationEvent {
  id: string;
  kind: 'PAYMENT' | 'APPLICATION';
  receivedAt: string;
  applicationReference: string;
  transactionReference?: string;
  /** What SmartGuide did with the event. */
  outcome:
    | 'ACCEPTED'
    | 'DUPLICATE_IGNORED'
    | 'REJECTED_UNKNOWN_APPLICATION'
    | 'REJECTED_UNCONFIRMED_PAYMENT'
    | 'FLAGGED_DUPLICATE_PAYMENT'
    | 'FLAGGED_TRANSACTION_CONFLICT'
    | 'IGNORED_OUT_OF_ORDER'
    | 'REJECTED_NO_PAYMENT';
  detail: string;
  flags: string[];
}

export interface IntegrationState {
  applications: PassportApplication[];
  transactions: SimulatedPaymentTransaction[];
  rules: ReminderRule[];
  now: Date;
}

export interface ProcessResult {
  httpStatus: number;
  body: Record<string, unknown>;
  /** Present when the application record changed and must be saved. */
  application?: PassportApplication;
  /** Present when a new payment record must be saved. */
  transaction?: SimulatedPaymentTransaction;
  event: IntegrationEvent;
}

const SUBMITTED_STATUSES: ApplicationStatus[] = [
  'Submitted - Under Review', 'Reverted', 'Biometrics Scheduled', 'Processing & Printing', 'Ready for Collection', 'Completed',
];

export function isSubmitted(status: ApplicationStatus): boolean {
  return SUBMITTED_STATUSES.includes(status);
}

export function acknowledgementFor(transactionReference: string): string {
  return `SG-ACK-${transactionReference}`;
}

export function buildReturnInstructions(application: PassportApplication, transaction: Pick<SimulatedPaymentTransaction, 'amount' | 'currency' | 'transactionReference'>) {
  const amount = `${transaction.currency} ${transaction.amount.toFixed(2)}`;
  return {
    subject: 'Payment received: please complete your passport application',
    text:
      `Dear ${application.fullName}, we have received your payment of ${amount} (transaction ${transaction.transactionReference}) ` +
      `for application ${application.trackingNumber}. Your application has not been submitted yet, so it cannot be processed. ` +
      `To finish: 1) Log in to OPAS. 2) Open application ${application.trackingNumber} from your dashboard. ` +
      `3) Complete any missing details and upload the required documents. 4) Select Submit. ` +
      `You do not need to pay again.`,
  };
}

function newEvent(
  state: IntegrationState,
  kind: IntegrationEvent['kind'],
  applicationReference: string,
  outcome: IntegrationEvent['outcome'],
  detail: string,
  extra: { transactionReference?: string; flags?: string[] } = {}
): IntegrationEvent {
  return {
    id: `ievt-${state.now.getTime()}-${crypto.randomBytes(3).toString('hex')}`,
    kind,
    receivedAt: state.now.toISOString(),
    applicationReference,
    outcome,
    detail,
    flags: extra.flags ?? [],
    ...(extra.transactionReference ? { transactionReference: extra.transactionReference } : {}),
  };
}

function firstReminderDue(application: PassportApplication, rules: ReminderRule[], from: Date) {
  const rule = rules.find((candidate) => candidate.enabled && candidate.statuses.includes(application.status));
  if (!rule) return { scheduled: false as const, reason: 'No reminder rule is enabled for this status.' };
  const days = rule.escalationDays?.[0] ?? rule.inactiveDays;
  return {
    scheduled: true as const,
    ruleId: rule.id,
    firstReminderDueAt: new Date(from.getTime() + days * 86_400_000).toISOString(),
    maximumReminders: rule.maximumReminders,
    channelsPlanned: availableChannels(application, rule.channelPriority),
  };
}

/** Cancels reminders that were queued but not sent, and returns how many were cancelled. */
function cancelPendingReminders(application: PassportApplication, now: Date, reason: string): { notifications: NotificationLog[]; cancelled: number } {
  let cancelled = 0;
  const notifications = application.notifications.map((notification) => {
    const pending = notification.deliveryStatus === 'Queued' || notification.deliveryStatus === 'Scheduled';
    const reminder = notification.trigger === 'AUTOMATED_WORKFLOW' || notification.trigger === 'SMARTGUIDE_PAYMENT_DETECTION';
    if (!pending || !reminder) return notification;
    cancelled += 1;
    return {
      ...notification,
      deliveryStatus: 'Cancelled' as const,
      deliveryUpdatedAt: now.toISOString(),
      auditTrail: [...(notification.auditTrail ?? []), {
        id: `evt-cancelled-${now.getTime()}-${notification.id}`,
        timestamp: now.toISOString(),
        event: 'CANCELLED' as const,
        actor: 'OPAS SmartGuide',
        details: reason,
      }],
    };
  });
  return { notifications, cancelled };
}

/** Steps 2 to 6: validate, de-duplicate, record, decide whether the applicant must return, and plan reminders. */
export function processPaymentEvent(input: PaymentEventInput, state: IntegrationState): ProcessResult {
  const { now } = state;
  const application = state.applications.find((record) => record.trackingNumber === input.applicationReference);
  if (!application) {
    return {
      httpStatus: 404,
      body: { success: false, error: 'Application reference was not found in SmartGuide.' },
      event: newEvent(state, 'PAYMENT', input.applicationReference, 'REJECTED_UNKNOWN_APPLICATION', 'No application matches this reference.', { transactionReference: input.transactionReference }),
    };
  }

  // The same transaction reference is never processed twice, so OPAS can safely retry.
  const existing = state.transactions.find((transaction) => transaction.transactionReference === input.transactionReference);
  if (existing) {
    if (existing.applicationReference !== input.applicationReference) {
      return {
        httpStatus: 409,
        body: { success: false, error: 'This transaction reference is already recorded against a different application.' },
        event: newEvent(state, 'PAYMENT', input.applicationReference, 'FLAGGED_TRANSACTION_CONFLICT',
          `Transaction already belongs to ${existing.applicationReference}.`, { transactionReference: input.transactionReference, flags: ['TRANSACTION_CONFLICT'] }),
      };
    }
    return {
      httpStatus: 200,
      body: {
        success: true, duplicate: true,
        message: 'This transaction was already processed. No changes were made.',
        smartGuideAcknowledgementReference: existing.smartGuideAcknowledgementReference ?? acknowledgementFor(existing.transactionReference),
      },
      event: newEvent(state, 'PAYMENT', input.applicationReference, 'DUPLICATE_IGNORED', 'Duplicate transaction reference.', { transactionReference: input.transactionReference }),
    };
  }

  const baseTransaction: SimulatedPaymentTransaction = {
    applicationReference: input.applicationReference,
    transactionReference: input.transactionReference,
    paymentStatus: input.paymentStatus,
    amount: input.amount,
    currency: input.currency,
    paymentDate: input.paymentDate,
    applicantId: input.applicantId,
    paymentReferenceNumber: input.paymentReferenceNumber,
    gatewayConfirmation: input.gatewayConfirmation,
    ...(input.opasAcknowledgementReference ? { opasAcknowledgementReference: input.opasAcknowledgementReference } : {}),
    smartGuideAcknowledgementReference: acknowledgementFor(input.transactionReference),
    source: 'OPAS_API',
  };

  // A failed payment is kept for the audit trail but changes nothing on the application.
  if (input.paymentStatus === 'FAILED') {
    return {
      httpStatus: 200,
      body: {
        success: true, paymentRecorded: true, applicationStatus: application.status,
        smartGuideAcknowledgementReference: baseTransaction.smartGuideAcknowledgementReference,
        reminders: { scheduled: false, reason: 'The payment did not succeed.' },
      },
      transaction: baseTransaction,
      event: newEvent(state, 'PAYMENT', input.applicationReference, 'ACCEPTED', 'Failed payment recorded. No application change.', { transactionReference: input.transactionReference }),
    };
  }

  if (input.gatewayConfirmation.toUpperCase() !== 'CONFIRMED') {
    return {
      httpStatus: 422,
      body: { success: false, error: 'The payment gateway has not confirmed this payment, so it was not recorded as paid.' },
      event: newEvent(state, 'PAYMENT', input.applicationReference, 'REJECTED_UNCONFIRMED_PAYMENT', `Gateway status was "${input.gatewayConfirmation}".`, { transactionReference: input.transactionReference }),
    };
  }

  const earlierPayment = state.transactions.find((transaction) =>
    transaction.applicationReference === input.applicationReference && transaction.paymentStatus === 'SUCCESSFUL');
  if (earlierPayment) {
    return {
      httpStatus: 409,
      body: { success: false, error: 'A successful payment is already recorded for this application. A second payment was flagged for officer review.' },
      event: newEvent(state, 'PAYMENT', input.applicationReference, 'FLAGGED_DUPLICATE_PAYMENT',
        `Earlier successful payment ${earlierPayment.transactionReference}; new transaction ${input.transactionReference}.`,
        { transactionReference: input.transactionReference, flags: ['POSSIBLE_DOUBLE_PAYMENT'] }),
    };
  }

  const flags: string[] = [];
  if (input.currency !== 'ZMW' || input.amount !== application.feeAmount) flags.push('AMOUNT_DIFFERS_FROM_FEE');

  const alreadySubmitted = isSubmitted(application.status) || input.applicationStatus === 'SUBMITTED';
  const nextStatus: ApplicationStatus = isSubmitted(application.status)
    ? application.status
    : alreadySubmitted ? 'Submitted - Under Review' : 'Paid - Unsubmitted';

  let notifications = application.notifications;
  let instructions: ReturnType<typeof buildReturnInstructions> | undefined;
  let cancelled = 0;

  if (alreadySubmitted) {
    const result = cancelPendingReminders(application, now, 'Application already submitted in OPAS.');
    notifications = result.notifications;
    cancelled = result.cancelled;
  } else {
    instructions = buildReturnInstructions(application, baseTransaction);
    const instructionNotice: NotificationLog = {
      id: `sg-return-${now.getTime()}-${application.id}`,
      timestamp: now.toISOString(),
      channel: 'OPAS Message Board',
      subject: instructions.subject,
      content: instructions.text,
      deliveryStatus: 'Queued',
      auditId: `AUD-SG-RETURN-${input.transactionReference}`,
      trigger: 'SMARTGUIDE_PAYMENT_DETECTION',
      dispatchedBy: { userId: 'opas-smartguide', name: 'OPAS SmartGuide', role: 'system' },
      deliveryUpdatedAt: now.toISOString(),
      auditTrail: [{
        id: `evt-return-${now.getTime()}-${application.id}`,
        timestamp: now.toISOString(),
        event: 'CREATED',
        actor: 'OPAS SmartGuide',
        details: `Return instructions created after payment ${input.transactionReference} was confirmed.`,
      }],
    };
    notifications = [instructionNotice, ...application.notifications];
  }

  const updated: PassportApplication = {
    ...application,
    feePaid: true,
    paymentReference: input.transactionReference,
    paidAt: input.paymentDate,
    status: nextStatus,
    daysInStatus: nextStatus === application.status ? application.daysInStatus : 0,
    notifications,
    lastUpdated: now.toISOString(),
  };

  return {
    httpStatus: 200,
    body: {
      success: true,
      paymentRecorded: true,
      applicationStatus: nextStatus,
      submitted: alreadySubmitted,
      smartGuideAcknowledgementReference: baseTransaction.smartGuideAcknowledgementReference,
      flags,
      ...(instructions ? { returnInstructions: instructions } : {}),
      reminders: alreadySubmitted
        ? { scheduled: false, reason: 'The application is already submitted.', cancelledPendingReminders: cancelled }
        : firstReminderDue(updated, state.rules, now),
    },
    application: updated,
    transaction: baseTransaction,
    event: newEvent(state, 'PAYMENT', input.applicationReference, 'ACCEPTED',
      alreadySubmitted ? 'Payment recorded; application already submitted.' : 'Payment recorded; applicant must return to submit.',
      { transactionReference: input.transactionReference, flags }),
  };
}

/** Handles OPAS telling SmartGuide that an application was submitted (reminders stop) or reverted (correction reminders start). */
export function processApplicationEvent(input: ApplicationEventInput, state: IntegrationState): ProcessResult {
  const { now } = state;
  const application = state.applications.find((record) => record.trackingNumber === input.applicationReference);
  if (!application) {
    return {
      httpStatus: 404,
      body: { success: false, error: 'Application reference was not found in SmartGuide.' },
      event: newEvent(state, 'APPLICATION', input.applicationReference, 'REJECTED_UNKNOWN_APPLICATION', 'No application matches this reference.'),
    };
  }

  const ack = input.opasAcknowledgementReference ? { opasAcknowledgementReference: input.opasAcknowledgementReference } : {};

  if (input.applicationStatus === 'SUBMITTED') {
    if (isSubmitted(application.status)) {
      return {
        httpStatus: 200,
        body: { success: true, unchanged: true, applicationStatus: application.status, remindersStopped: true, ...ack },
        event: newEvent(state, 'APPLICATION', input.applicationReference, 'DUPLICATE_IGNORED', 'Application was already in a submitted state.'),
      };
    }
    const flags = application.feePaid ? [] : ['SUBMITTED_WITHOUT_RECORDED_PAYMENT'];
    const { notifications, cancelled } = cancelPendingReminders(application, now, 'OPAS reported that the application was submitted.');
    const updated: PassportApplication = {
      ...application, status: 'Submitted - Under Review', daysInStatus: 0, notifications, lastUpdated: now.toISOString(),
    };
    return {
      httpStatus: 200,
      body: { success: true, applicationStatus: updated.status, remindersStopped: true, cancelledPendingReminders: cancelled, flags, ...ack },
      application: updated,
      event: newEvent(state, 'APPLICATION', input.applicationReference, 'ACCEPTED', `Submitted in OPAS. ${cancelled} pending reminder(s) cancelled.`, { flags }),
    };
  }

  if (input.applicationStatus === 'REVERTED') {
    if (application.status === 'Reverted') {
      return {
        httpStatus: 200,
        body: { success: true, unchanged: true, applicationStatus: application.status, ...ack },
        event: newEvent(state, 'APPLICATION', input.applicationReference, 'DUPLICATE_IGNORED', 'Application was already reverted.'),
      };
    }
    const updated: PassportApplication = { ...application, status: 'Reverted', daysInStatus: 0, lastUpdated: now.toISOString() };
    return {
      httpStatus: 200,
      body: { success: true, applicationStatus: updated.status, remindersStopped: false, reminders: firstReminderDue(updated, state.rules, now), ...ack },
      application: updated,
      event: newEvent(state, 'APPLICATION', input.applicationReference, 'ACCEPTED',
        input.officerComment ? `Reverted by OPAS. Officer comment: ${input.officerComment}` : 'Reverted by OPAS.'),
    };
  }

  // PAID_NOT_SUBMITTED
  if (isSubmitted(application.status)) {
    return {
      httpStatus: 200,
      body: { success: true, unchanged: true, applicationStatus: application.status, note: 'Ignored: the application is already submitted, so the status was not moved back.' },
      event: newEvent(state, 'APPLICATION', input.applicationReference, 'IGNORED_OUT_OF_ORDER', 'Late PAID_NOT_SUBMITTED event ignored.'),
    };
  }
  if (!application.feePaid) {
    return {
      httpStatus: 409,
      body: { success: false, error: 'No payment is recorded for this application. Send the payment event first.' },
      event: newEvent(state, 'APPLICATION', input.applicationReference, 'REJECTED_NO_PAYMENT', 'PAID_NOT_SUBMITTED received without a recorded payment.'),
    };
  }
  if (application.status === 'Paid - Unsubmitted') {
    return {
      httpStatus: 200,
      body: { success: true, unchanged: true, applicationStatus: application.status },
      event: newEvent(state, 'APPLICATION', input.applicationReference, 'DUPLICATE_IGNORED', 'Already paid and unsubmitted.'),
    };
  }
  const updated: PassportApplication = { ...application, status: 'Paid - Unsubmitted', daysInStatus: 0, lastUpdated: now.toISOString() };
  return {
    httpStatus: 200,
    body: { success: true, applicationStatus: updated.status, reminders: firstReminderDue(updated, state.rules, now), ...ack },
    application: updated,
    event: newEvent(state, 'APPLICATION', input.applicationReference, 'ACCEPTED', 'Status set to Paid - Unsubmitted.'),
  };
}