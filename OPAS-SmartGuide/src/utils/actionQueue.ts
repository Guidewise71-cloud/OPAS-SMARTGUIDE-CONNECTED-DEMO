import { PassportApplication } from '../types/passport';
import { validatePhoneNumber, validateEmail } from './validation';

export interface ActionQueueItem {
  application: PassportApplication;
  isReverted: boolean;
  isOverdue: boolean;
  isIncomplete: boolean;
  primaryReason: string;
  categoryBadge: 'REVERTED' | 'OVERDUE' | 'INCOMPLETE';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

export interface ActionQueueSummary {
  totalNeedingAttention: number;
  revertedCount: number;
  overdueCount: number;
  incompleteCount: number;
  longestWaitDays: number;
  longestWaitCase?: PassportApplication;
  officeBreakdown: { office: string; count: number; percentage: number }[];
}

/**
 * Checks whether contact details failed the automated integrity check
 */
export function hasContactCheckFailed(app: PassportApplication): boolean {
  const phoneRes = validatePhoneNumber(app.contact.phone, app.contact.phoneCountryCode || '+260');
  const cleanPhone = (app.contact.phone || '').replace(/[\s\-\(\)\+]/g, '');
  const isPhoneBad = !phoneRes.isValid || cleanPhone.length < 9 || (phoneRes.warning && cleanPhone.length < 9);

  const emailRes = validateEmail(app.contact.email);
  const isEmailBad = !emailRes.isValid || !!emailRes.error || !!emailRes.warning;

  return isPhoneBad || isEmailBad;
}

/**
 * Determines whether a case has incomplete intake:
 * unpaid fee, form stuck at stage 1-2, or contact details that failed the check
 */
export function isCaseIncomplete(app: PassportApplication): boolean {
  if (app.status === 'Paid - Unsubmitted') return true;
  if (!app.feePaid) return true;
  if (app.status === 'Draft') return true;
  if (hasContactCheckFailed(app)) return true;
  return false;
}

/**
 * Determines whether a case is overdue (14+ days in one stage)
 */
export function isCaseOverdue(app: PassportApplication): boolean {
  return (app.daysInStatus || 0) >= 14;
}

/**
 * Determines whether a case is reverted
 */
export function isCaseReverted(app: PassportApplication): boolean {
  return app.status === 'Reverted';
}

/**
 * Evaluates whether an application requires staff attention
 */
export function isCaseNeedingAttention(app: PassportApplication): boolean {
  return isCaseReverted(app) || isCaseOverdue(app) || isCaseIncomplete(app);
}

/**
 * Produces a clear, actionable one-line reason for staff attention
 */
export function getOneLineReason(app: PassportApplication): string {
  const days = app.daysInStatus || 0;

  if (app.status === 'Reverted') {
    if (app.reversionReason) {
      // Trim to concise sentence
      const reasonSnippet = app.reversionReason.split('.')[0];
      return `Reverted (${days}d): ${reasonSnippet}. Awaiting applicant response.`;
    }
    return `Reverted (${days}d): Awaiting applicant to re-upload flagged document.`;
  }

  if (days >= 14) {
    if (hasContactCheckFailed(app)) {
      return `Overdue (${days}d): Stuck in vetting with contact check failure (phone/email format flagged).`;
    }
    if (app.status === 'Paid - Unsubmitted') {
      return `Overdue (${days}d): GPG fee verified, but applicant has stalled before final submission step.`;
    }
    return `Overdue (${days}d): In '${app.status}' for ${days} days — exceeds 14-day SLA threshold.`;
  }

  if (app.status === 'Paid - Unsubmitted') {
    return `Incomplete Intake (${days}d): Fee received (ZMW ${app.feeAmount}), but application not submitted.`;
  }

  if (!app.feePaid || app.status === 'Draft') {
    if (hasContactCheckFailed(app)) {
      return `Incomplete Intake (${days}d): Draft form with contact check failure & pending stage documents.`;
    }
    return `Incomplete Intake (${days}d): Draft intake stalled with unpaid fee (ZMW ${app.feeAmount}).`;
  }

  if (hasContactCheckFailed(app)) {
    return `Incomplete Intake (${days}d): Contact check failed — invalid phone format or email typo.`;
  }

  return `Staff Attention Needed (${days}d): Requires review by passport vetting team.`;
}

/**
 * Builds the focused Action Queue items sorted most-overdue first
 */
export function buildActionQueue(applications: PassportApplication[]): ActionQueueItem[] {
  const queueItems: ActionQueueItem[] = [];

  for (const app of applications) {
    const isReverted = isCaseReverted(app);
    const isOverdue = isCaseOverdue(app);
    const isIncomplete = isCaseIncomplete(app);

    if (isReverted || isOverdue || isIncomplete) {
      let categoryBadge: 'REVERTED' | 'OVERDUE' | 'INCOMPLETE' = 'INCOMPLETE';
      if (isReverted) {
        categoryBadge = 'REVERTED';
      } else if (isOverdue) {
        categoryBadge = 'OVERDUE';
      }

      let severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' = 'MEDIUM';
      if (app.isUrgent || (app.daysInStatus || 0) >= 20 || (isReverted && (app.daysInStatus || 0) >= 8)) {
        severity = 'CRITICAL';
      } else if ((app.daysInStatus || 0) >= 14 || isReverted) {
        severity = 'HIGH';
      }

      queueItems.push({
        application: app,
        isReverted,
        isOverdue,
        isIncomplete,
        primaryReason: getOneLineReason(app),
        categoryBadge,
        severity,
      });
    }
  }

  // Sort most-overdue first (descending by daysInStatus)
  return queueItems.sort((a, b) => (b.application.daysInStatus || 0) - (a.application.daysInStatus || 0));
}

/**
 * Calculates top-row summary statistics for the Action Queue
 */
export function calculateActionQueueSummary(applications: PassportApplication[]): ActionQueueSummary {
  const queue = buildActionQueue(applications);
  const totalNeedingAttention = queue.length;

  let revertedCount = 0;
  let overdueCount = 0;
  let incompleteCount = 0;

  queue.forEach((item) => {
    if (item.isReverted) revertedCount++;
    if (item.isOverdue) overdueCount++;
    if (item.isIncomplete) incompleteCount++;
  });

  const longestWaitDays = queue.length > 0 ? (queue[0].application.daysInStatus || 0) : 0;
  const longestWaitCase = queue.length > 0 ? queue[0].application : undefined;

  // Per-office breakdown
  const officeMap: Record<string, number> = {};
  queue.forEach((item) => {
    const office = item.application.collectionOffice || 'Unassigned';
    officeMap[office] = (officeMap[office] || 0) + 1;
  });

  const officeBreakdown = Object.entries(officeMap)
    .map(([office, count]) => ({
      office: office.replace(' Passport Office', '').replace('Regional', 'Reg.').replace('Provincial', 'Prov.'),
      count,
      percentage: totalNeedingAttention > 0 ? Math.round((count / totalNeedingAttention) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    totalNeedingAttention,
    revertedCount,
    overdueCount,
    incompleteCount,
    longestWaitDays,
    longestWaitCase,
    officeBreakdown,
  };
}
