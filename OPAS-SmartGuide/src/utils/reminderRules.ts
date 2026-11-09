import { NotificationLog, PassportApplication } from '../types/passport';

export type ReminderChannel = 'WhatsApp' | 'SMS' | 'Email' | 'OPAS Message Board';

export interface ReminderRule {
  id: string;
  label: string;
  statuses: PassportApplication['status'][];
  inactiveDays: number;
  cooldownDays: number;
  maximumReminders: number;
  channelPriority: ReminderChannel[];
  enabled: boolean;
}

export interface ReminderCandidate {
  application: PassportApplication;
  rule: ReminderRule;
  channel: ReminderChannel;
  reason: string;
}

export const DEFAULT_REMINDER_RULES: ReminderRule[] = [
  {
    id: 'paid-unsubmitted-24h',
    label: 'Paid but unsubmitted follow-up',
    statuses: ['Paid - Unsubmitted'],
    inactiveDays: 1,
    cooldownDays: 2,
    maximumReminders: 3,
    channelPriority: ['WhatsApp', 'SMS', 'Email', 'OPAS Message Board'],
    enabled: true,
  },
  {
    id: 'reverted-24h',
    label: 'Reverted application correction reminder',
    statuses: ['Reverted'],
    inactiveDays: 1,
    cooldownDays: 1,
    maximumReminders: 4,
    channelPriority: ['WhatsApp', 'SMS', 'Email', 'OPAS Message Board'],
    enabled: true,
  },
  {
    id: 'draft-24h',
    label: 'Inactive draft completion reminder',
    statuses: ['Draft'],
    inactiveDays: 1,
    cooldownDays: 1,
    maximumReminders: 2,
    channelPriority: ['WhatsApp', 'Email', 'OPAS Message Board'],
    enabled: true,
  },
];

function channelIsAvailable(application: PassportApplication, channel: ReminderChannel): boolean {
  if (channel === 'WhatsApp') {
    return Boolean(application.contact.whatsappOptIn && application.contact.whatsappVerified && application.contact.whatsappNumber);
  }
  if (channel === 'SMS') return Boolean(application.contact.phone);
  if (channel === 'Email') return Boolean(application.contact.email);
  return true;
}

function selectChannel(application: PassportApplication, channels: ReminderChannel[]): ReminderChannel | null {
  return channels.find((channel) => channelIsAvailable(application, channel)) || null;
}

function isWithinCooldown(notification: NotificationLog, cooldownDays: number, now: Date): boolean {
  const timestamp = new Date(notification.deliveryUpdatedAt || notification.timestamp).getTime();
  return Number.isFinite(timestamp) && now.getTime() - timestamp < cooldownDays * 24 * 60 * 60 * 1000;
}

/** Returns only cases that are eligible for one non-duplicated reminder. */
export function detectReminderCandidates(
  applications: PassportApplication[],
  rules: ReminderRule[] = DEFAULT_REMINDER_RULES,
  now: Date = new Date()
): ReminderCandidate[] {
  const candidates: ReminderCandidate[] = [];

  for (const application of applications) {
    const rule = rules.find((candidateRule) => candidateRule.enabled && candidateRule.statuses.includes(application.status));
    if (!rule || application.daysInStatus < rule.inactiveDays) continue;

    const priorRuleNotifications = application.notifications.filter((notification) => notification.trigger === 'AUTOMATED_WORKFLOW');
    if (priorRuleNotifications.length >= rule.maximumReminders) continue;
    if (priorRuleNotifications.some((notification) => isWithinCooldown(notification, rule.cooldownDays, now))) continue;

    const channel = selectChannel(application, rule.channelPriority);
    if (!channel) continue;

    candidates.push({
      application,
      rule,
      channel,
      reason: `${rule.label}: inactive for ${application.daysInStatus} day(s).`,
    });
  }

  return candidates;
}

/** Return the configured reminder channels that have usable applicant contact details. */
export function availableChannels(application: PassportApplication, channels: ReminderChannel[]): ReminderChannel[] {
  return channels.filter((channel) => channelIsAvailable(application, channel));
}
