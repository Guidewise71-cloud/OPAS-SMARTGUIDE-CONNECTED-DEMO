import { describe, expect, it } from 'vitest';
import type { PassportApplication } from '../types/passport.ts';
import { DEFAULT_REMINDER_RULES } from '../utils/reminderRules.ts';
import {
  acknowledgementFor,
  processApplicationEvent,
  processPaymentEvent,
  signOpasRequest,
  validatePaymentEvent,
  verifyOpasSignature,
} from './opasPaymentIntegration.ts';

const application = (): PassportApplication => ({
  id: 'test-app-1', trackingNumber: 'SYN-PAS-2026-TEST01', nrcNumber: '900001/10/1',
  fullName: 'Test Applicant', dateOfBirth: '1998-01-01', gender: 'Male', placeOfBirth: 'Lusaka',
  passportType: '32-Page Ordinary', serviceSpeed: 'Standard (14-21 days)', feeAmount: 500,
  feePaid: false, status: 'Draft', daysInStatus: 0,
  contact: { phone: '+260971000001', phoneCountryCode: '+260', email: 'test@example.zm', residentialAddress: '', district: 'Lusaka', province: 'Lusaka' },
  guarantor: { fullName: '', nrcNumber: '', profession: '', phoneNumber: '', organization: '', verified: false },
  documents: [], notifications: [], lastUpdated: '2026-11-08T10:00:00.000Z', collectionOffice: 'Lusaka Passport Office',
});

const event = {
  applicantId: 'test-user-1', applicationReference: 'SYN-PAS-2026-TEST01',
  transactionReference: 'TXN-TEST-0001', paymentReferenceNumber: 'PRN-TEST-0001',
  amount: 500, currency: 'ZMW', paymentStatus: 'SUCCESSFUL' as const,
  paymentDate: '2026-11-08T10:05:00.000Z', applicationStatus: 'PAID_NOT_SUBMITTED' as const,
  gatewayConfirmation: 'CONFIRMED', opasAcknowledgementReference: 'OPAS-ACK-TEST-1',
};

describe('Simulated OPAS -> SmartGuide payment integration', () => {
  it('authenticates signed requests and rejects tampering', () => {
    const secret = 'local-test-integration-secret-with-more-than-32-characters';
    const timestamp = String(Math.floor(Date.now() / 1000));
    const body = JSON.stringify({ applicationReference: event.applicationReference });
    const signature = signOpasRequest(secret, timestamp, body);
    expect(verifyOpasSignature(secret, body, timestamp, signature).ok).toBe(true);
    expect(verifyOpasSignature(secret, `${body} `, timestamp, signature).ok).toBe(false);
  });

  it('validates the payment references, amount, currency and gateway confirmation fields', () => {
    expect(validatePaymentEvent(event).ok).toBe(true);
    expect(validatePaymentEvent({ ...event, amount: -1 }).ok).toBe(false);
    expect(validatePaymentEvent({ ...event, applicationReference: 'bad ref' }).ok).toBe(false);
  });

  it('records a confirmed payment and generates applicant return instructions', () => {
    const app = application();
    const result = processPaymentEvent(event, { applications: [app], transactions: [], rules: DEFAULT_REMINDER_RULES, now: new Date('2026-11-08T10:06:00.000Z') });
    expect(result.httpStatus).toBe(200);
    expect(result.application?.feePaid).toBe(true);
    expect(result.application?.status).toBe('Paid - Unsubmitted');
    expect(result.transaction?.transactionReference).toBe(event.transactionReference);
    expect(result.body.smartGuideAcknowledgementReference).toBe(acknowledgementFor(event.transactionReference));
    expect(result.body.returnInstructions).toBeTruthy();
  });

  it('does not record a duplicate transaction twice', () => {
    const app = application();
    const first = processPaymentEvent(event, { applications: [app], transactions: [], rules: DEFAULT_REMINDER_RULES, now: new Date('2026-11-08T10:06:00.000Z') });
    const second = processPaymentEvent(event, { applications: [first.application!], transactions: [first.transaction!], rules: DEFAULT_REMINDER_RULES, now: new Date('2026-11-08T10:07:00.000Z') });
    expect(second.body.duplicate).toBe(true);
    expect(second.transaction).toBeUndefined();
  });

  it('stops queued payment reminders when OPAS reports submission', () => {
    const app = application();
    const payment = processPaymentEvent(event, { applications: [app], transactions: [], rules: DEFAULT_REMINDER_RULES, now: new Date('2026-11-08T10:06:00.000Z') });
    const submitted = processApplicationEvent({ applicationReference: event.applicationReference, applicationStatus: 'SUBMITTED', occurredAt: '2026-11-08T10:10:00.000Z' }, {
      applications: [payment.application!], transactions: [payment.transaction!], rules: DEFAULT_REMINDER_RULES, now: new Date('2026-11-08T10:10:00.000Z'),
    });
    expect(submitted.application?.status).toBe('Submitted - Under Review');
    expect(submitted.body.remindersStopped).toBe(true);
    expect(submitted.application?.notifications.some(n => n.deliveryStatus === 'Cancelled')).toBe(true);
  });
});
