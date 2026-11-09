import { PassportApplication } from '../types/passport';
import { UserAccount } from '../types/auth';

export function isRegisteredSimulatedApplicant(
  user: Pick<UserAccount, 'role' | 'status' | 'nrcNumber' | 'email'>,
  applications: PassportApplication[]
): boolean {
  if (user.role !== 'citizen' || user.status !== 'ACTIVE') return false;

  const nrcNumber = user.nrcNumber?.trim().toLowerCase();
  if (nrcNumber) {
    return applications.some((application) =>
      application.nrcNumber.trim().toLowerCase() === nrcNumber
    );
  }

  const email = user.email.trim().toLowerCase();
  return Boolean(email) && applications.some((application) =>
    application.contact.email.trim().toLowerCase() === email
  );
}
