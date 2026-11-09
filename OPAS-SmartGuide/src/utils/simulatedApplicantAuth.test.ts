import { describe, expect, it } from 'vitest';
import { INITIAL_APPLICATIONS } from '../data/mockApplications';
import { INITIAL_USERS } from '../data/mockUsers';
import { isRegisteredSimulatedApplicant } from './simulatedApplicantAuth';

describe('simulated applicant registration', () => {
  it('accepts an active demo account linked to a simulated application', () => {
    const applicant = INITIAL_USERS.find((user) => user.id === 'usr-citizen-00')!;

    expect(isRegisteredSimulatedApplicant(applicant, INITIAL_APPLICATIONS)).toBe(true);
  });

  it('rejects inactive accounts and accounts with no simulated application', () => {
    const applicant = INITIAL_USERS.find((user) => user.id === 'usr-citizen-00')!;

    expect(isRegisteredSimulatedApplicant(
      { ...applicant, status: 'SUSPENDED' },
      INITIAL_APPLICATIONS
    )).toBe(false);
    expect(isRegisteredSimulatedApplicant(
      { ...applicant, nrcNumber: '000000/00/0' },
      INITIAL_APPLICATIONS
    )).toBe(false);
  });

  it('does not treat a citizen account as an authenticated staff account', () => {
    const staff = INITIAL_USERS.find((user) => user.role === 'officer')!;

    expect(isRegisteredSimulatedApplicant(staff, INITIAL_APPLICATIONS)).toBe(false);
  });
});
