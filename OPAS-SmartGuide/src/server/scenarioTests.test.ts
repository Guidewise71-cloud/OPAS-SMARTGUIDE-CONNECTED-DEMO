// Scripted scenario tests: contact validation, paid-but-unsubmitted, and reverted applications.
import { describe, expect, it } from 'vitest';
import type { PassportApplication } from '../types/passport.ts';
import { DEFAULT_REMINDER_RULES } from '../utils/reminderRules.ts';
import { validateContactInfo } from '../utils/validation.ts';
import { processApplicationEvent, processPaymentEvent } from './opasPaymentIntegration.ts';

const REF = 'SYN-PAS-2026-SCEN01';

const application = (): PassportApplication => ({
  id: 'scenario-app-1', trackingNumber: REF, nrcNumber: '900001/10/1',
  fullName: 'Scenario Applicant', dateOfBirth: '1998-01-01', gender: 'Male', placeOfBirth: 'Lusaka',
  passportType: '32-Page Ordinary', serviceSpeed: 'Standard (14-21 days)', feeAmount: 500,
  feePaid: false, status: 'Draft', daysInStatus: 0,
  contact: { phone: '+260971000001', phoneCountryCode: '+260', email: 'test@example.zm', residentialAddress: '', district: 'Lusaka', province: 'Lusaka' },
  guarantor: { fullName: '', nrcNumber: '', profession: '', phoneNumber: '', organization: '', verified: false },
  documents: [], notifications: [], lastUpdated: '2026-11-08T10:00:00.000Z', collectionOffice: 'Lusaka Passport Office',
});

const paymentEvent = {
  applicantId: 'scenario-user-1', applicationReference: REF,
  transactionReference: 'TXN-SCEN-0001', paymentReferenceNumber: 'PRN-SCEN-0001',
  amount: 500, currency: 'ZMW', paymentStatus: 'SUCCESSFUL' as const,
  paymentDate: '2026-11-08T10:05:00.000Z', applicationStatus: 'PAID_NOT_SUBMITTED' as const,
  gatewayConfirmation: 'CONFIRMED', opasAcknowledgementReference: 'OPAS-ACK-SCEN-1',
};

const paidState = () => {
  const paid = processPaymentEvent(paymentEvent, {
    applications: [application()], transactions: [], rules: DEFAULT_REMINDER_RULES, now: new Date('2026-11-08T10:06:00.000Z'),
  });
  return { applications: [paid.application!], transactions: [paid.transaction!], rules: DEFAULT_REMINDER_RULES };
};

describe('scenario: contact validation', () => {
  const valid = { phone: '971000001', phoneCountryCode: '+260', email: 'applicant@gmail.com', residentialAddress: 'Plot 12 Woodlands Road', district: 'Lusaka', province: 'Lusaka' };

  it('accepts a valid contact', () => {
    expect(validateContactInfo(valid).isValid).toBe(true);
  });

  it('rejects an empty phone and an empty email', () => {
    const result = validateContactInfo({ ...valid, phone: '', email: '' });
    expect(result.isValid).toBe(false);
    expect(result.errors.phone).toBeTruthy();
    expect(result.errors.email).toBeTruthy();
  });

  it('rejects a too-short address and a missing district', () => {
    const result = validateContactInfo({ ...valid, residentialAddress: 'x', district: '' });
    expect(result.isValid).toBe(false);
    expect(result.errors.residentialAddress).toBeTruthy();
    expect(result.errors.district).toBeTruthy();
  });

  it('warns on an email domain typo without blocking', () => {
    const result = validateContactInfo({ ...valid, email: 'applicant@gamil.com' });
    expect(result.isValid).toBe(true);
    expect(result.warnings.email).toContain('gmail.com');
  });
});

describe('scenario: paid but unsubmitted', () => {
  it('marks the application paid-unsubmitted with reminders queued', () => {
    const state = paidState();
    expect(state.applications[0].feePaid).toBe(true);
    expect(state.applications[0].status).toBe('Paid - Unsubmitted');
  });

  it('rejects PAID_NOT_SUBMITTED when no payment was recorded', () => {
    const result = processApplicationEvent(
      { applicationReference: REF, applicationStatus: 'PAID_NOT_SUBMITTED', occurredAt: '2026-11-08T10:07:00.000Z' },
      { applications: [application()], transactions: [], rules: DEFAULT_REMINDER_RULES, now: new Date('2026-11-08T10:07:00.000Z') },
    );
    expect(result.httpStatus).toBe(409);
    expect(result.event.outcome).toBe('REJECTED_NO_PAYMENT');
  });

  it('rejects events for an unknown application reference', () => {
    const result = processApplicationEvent(
      { applicationReference: 'SYN-PAS-2026-NOPE99', applicationStatus: 'SUBMITTED', occurredAt: '2026-11-08T10:07:00.000Z' },
      { ...paidState(), now: new Date('2026-11-08T10:07:00.000Z') },
    );
    expect(result.httpStatus).toBe(404);
    expect(result.event.outcome).toBe('REJECTED_UNKNOWN_APPLICATION');
  });
});

describe('scenario: reverted application', () => {
  const revert = (state: ReturnType<typeof paidState>, comment?: string) =>
    processApplicationEvent(
      { applicationReference: REF, applicationStatus: 'REVERTED', occurredAt: '2026-11-09T09:00:00.000Z', officerComment: comment },
      { ...state, now: new Date('2026-11-09T09:00:00.000Z') },
    );

  it('moves a paid application to Reverted and keeps reminders running', () => {
    const result = revert(paidState(), 'Passport photo is blurry');
    expect(result.httpStatus).toBe(200);
    expect(result.application?.status).toBe('Reverted');
    expect(result.application?.daysInStatus).toBe(0);
    expect(result.body.remindersStopped).toBe(false);
    expect(result.event.outcome).toBe('ACCEPTED');
    expect(result.event.detail).toContain('Passport photo is blurry');
  });

  it('ignores a repeated REVERTED event', () => {
    const first = revert(paidState());
    const second = processApplicationEvent(
      { applicationReference: REF, applicationStatus: 'REVERTED', occurredAt: '2026-11-09T09:05:00.000Z' },
      { applications: [first.application!], transactions: paidState().transactions, rules: DEFAULT_REMINDER_RULES, now: new Date('2026-11-09T09:05:00.000Z') },
    );
    expect(second.body.unchanged).toBe(true);
    expect(second.event.outcome).toBe('DUPLICATE_IGNORED');
  });

  it('does not move a reverted application back on a late PAID_NOT_SUBMITTED event', () => {
    const first = revert(paidState());
    const late = processApplicationEvent(
      { applicationReference: REF, applicationStatus: 'PAID_NOT_SUBMITTED', occurredAt: '2026-11-09T09:10:00.000Z' },
      { applications: [first.application!], transactions: paidState().transactions, rules: DEFAULT_REMINDER_RULES, now: new Date('2026-11-09T09:10:00.000Z') },
    );
    expect(late.event.outcome).toBe('IGNORED_OUT_OF_ORDER');
    expect(late.application).toBeUndefined();
  });

  it('currently treats SUBMITTED on a reverted application as a no-op (known gap: status stays Reverted)', () => {
    const first = revert(paidState());
    const resubmitted = processApplicationEvent(
      { applicationReference: REF, applicationStatus: 'SUBMITTED', occurredAt: '2026-11-10T09:00:00.000Z' },
      { applications: [first.application!], transactions: paidState().transactions, rules: DEFAULT_REMINDER_RULES, now: new Date('2026-11-10T09:00:00.000Z') },
    );
    // Reverted counts as submitted in isSubmitted(), so the resubmission is acknowledged but the record is not updated.
    expect(resubmitted.httpStatus).toBe(200);
    expect(resubmitted.body.unchanged).toBe(true);
    expect(resubmitted.application).toBeUndefined();
  });
});
