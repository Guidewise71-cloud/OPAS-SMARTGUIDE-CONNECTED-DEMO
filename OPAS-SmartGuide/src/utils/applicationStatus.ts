import { PassportApplication } from '../types/passport';

const SUBMITTED_STATUSES: PassportApplication['status'][] = [
  'Submitted - Under Review',
  'Reverted',
  'Biometrics Scheduled',
  'Processing & Printing',
  'Ready for Collection',
  'Completed',
];

export function isApplicationSubmitted(application: PassportApplication) {
  if (application.submissionStatus) {
    return application.submissionStatus === 'SUBMITTED';
  }
  return SUBMITTED_STATUSES.includes(application.status);
}
