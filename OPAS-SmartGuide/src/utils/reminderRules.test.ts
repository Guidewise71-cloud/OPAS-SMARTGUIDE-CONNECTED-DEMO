// Runtime validation coverage for automated reminder eligibility.
import { describe, expect, it } from 'vitest';
import { INITIAL_APPLICATIONS } from '../data/mockApplications';
import { detectReminderCandidates } from './reminderRules';

describe('automated reminder eligibility', () => {
  it('selects an available channel for an inactive paid application', () => {
    const application = {
      ...INITIAL_APPLICATIONS[1],
      notifications: [],
    };

    const candidates = detectReminderCandidates(
      [application],
      undefined,
      new Date('2026-11-07T00:00:00.000Z')
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0].application.trackingNumber).toBe(application.trackingNumber);
    expect(candidates[0].channel).toBe('SMS');
  });

  it('does not duplicate a reminder within the cooldown window', () => {
    const application = {
      ...INITIAL_APPLICATIONS[1],
      notifications: [{
        id: 'recent-reminder',
        timestamp: '2026-11-06T23:30:00.000Z',
        channel: 'SMS' as const,
        content: 'Reminder',
        deliveryStatus: 'Delivered' as const,
        trigger: 'AUTOMATED_WORKFLOW' as const,
      }],
    };

    expect(detectReminderCandidates(
      [application],
      undefined,
      new Date('2026-11-07T00:00:00.000Z')
    )).toHaveLength(0);
  });
});
