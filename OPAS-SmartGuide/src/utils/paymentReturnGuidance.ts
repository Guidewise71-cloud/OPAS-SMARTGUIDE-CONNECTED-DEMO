/**
 * Fixed (non-generated) wording shown after a successful payment, so every
 * applicant sees the same clear instruction. Not produced by AI on purpose.
 */
export const PAYMENT_RETURN_HEADLINE =
  'YOU HAVE SUCCESSFULLY PAID FOR YOUR PASSPORT SERVICE';
export const PAYMENT_RETURN_INSTRUCTION =
  'CLOSE THIS WINDOW AND RETURN TO THE PASSPORT APPLICATION TO COMPLETE THE PROCESS.';
export const PAYMENT_RETURN_WARNING =
  'Your application is NOT submitted yet. Do not pay again.';

export interface PaymentFollowUp {
  waitingSinceIso: string | null;
  hoursWaiting: number | null;
  daysWaiting: number | null;
  label: string;
  level: 'new' | 'attention' | 'overdue';
}

const HOUR = 3600 * 1000;

/** Summarises how long a paid application has waited for the applicant to submit. */
export function getPaymentFollowUp(
  app: { status: string; paidAt?: string },
  now: Date = new Date()
): PaymentFollowUp | null {
  if (app.status !== 'Paid - Unsubmitted') return null;
  const paid = app.paidAt ? new Date(app.paidAt) : null;
  if (!paid || Number.isNaN(paid.getTime())) {
    return {
      waitingSinceIso: null,
      hoursWaiting: null,
      daysWaiting: null,
      label: 'Paid, not yet submitted (payment time not recorded)',
      level: 'attention',
    };
  }
  const hours = Math.max(0, Math.floor((now.getTime() - paid.getTime()) / HOUR));
  const days = Math.floor(hours / 24);
  const level = days >= 2 ? 'overdue' : hours >= 24 ? 'attention' : 'new';
  const label = days >= 1
    ? `Paid ${days} day${days === 1 ? '' : 's'} ago, not yet submitted`
    : `Paid ${hours} hour${hours === 1 ? '' : 's'} ago, not yet submitted`;
  return { waitingSinceIso: paid.toISOString(), hoursWaiting: hours, daysWaiting: days, label, level };
}
