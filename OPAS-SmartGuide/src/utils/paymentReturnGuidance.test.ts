import { describe, expect, it } from 'vitest';
import { getPaymentFollowUp, PAYMENT_RETURN_INSTRUCTION } from './paymentReturnGuidance';

const now = new Date('2026-11-11T12:00:00Z');

describe('getPaymentFollowUp', () => {
  it('returns null for applications that are not paid-unsubmitted', () => {
    expect(getPaymentFollowUp({ status: 'Draft' }, now)).toBeNull();
    expect(getPaymentFollowUp({ status: 'Submitted - Under Review', paidAt: '2026-11-01T00:00:00Z' }, now)).toBeNull();
  });
  it('reports hours when paid under a day ago', () => {
    const r = getPaymentFollowUp({ status: 'Paid - Unsubmitted', paidAt: '2026-11-11T09:00:00Z' }, now)!;
    expect(r.hoursWaiting).toBe(3);
    expect(r.level).toBe('new');
    expect(r.label).toContain('3 hours');
  });
  it('flags attention after 1 day and overdue after 2 days', () => {
    expect(getPaymentFollowUp({ status: 'Paid - Unsubmitted', paidAt: '2026-11-10T10:00:00Z' }, now)!.level).toBe('attention');
    const r = getPaymentFollowUp({ status: 'Paid - Unsubmitted', paidAt: '2026-11-08T12:00:00Z' }, now)!;
    expect(r.level).toBe('overdue');
    expect(r.daysWaiting).toBe(3);
  });
  it('does not invent a time when paidAt is missing', () => {
    const r = getPaymentFollowUp({ status: 'Paid - Unsubmitted' }, now)!;
    expect(r.daysWaiting).toBeNull();
    expect(r.label).toContain('not recorded');
  });
  it('keeps the required instruction wording', () => {
    expect(PAYMENT_RETURN_INSTRUCTION).toContain('RETURN TO THE PASSPORT APPLICATION');
  });
});
