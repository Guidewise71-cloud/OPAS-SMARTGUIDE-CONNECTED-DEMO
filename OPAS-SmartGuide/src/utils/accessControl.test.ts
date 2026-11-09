import { describe, expect, it } from 'vitest';
import { canAccessView, hasPermission } from './accessControl';
import type { UserAccount } from '../types/auth';

const account = (role: UserAccount['role']): UserAccount => ({
  id: `test-${role}`, email: `${role}@example.test`, fullName: role, role, status: 'ACTIVE', createdAt: new Date(0).toISOString(),
});

describe('role-based access policy', () => {
  it('limits applicants to their own portal permissions', () => {
    const citizen = account('citizen');
    expect(canAccessView(citizen, 'citizen')).toBe(true);
    expect(canAccessView(citizen, 'officer')).toBe(false);
    expect(hasPermission(citizen, 'application:view:own')).toBe(true);
    expect(hasPermission(citizen, 'case:update')).toBe(false);
  });
  it('allows officers to work cases but not manage escalations', () => {
    const officer = account('officer');
    expect(canAccessView(officer, 'officer')).toBe(true);
    expect(hasPermission(officer, 'case:update')).toBe(true);
    expect(hasPermission(officer, 'escalation:manage')).toBe(false);
    expect(hasPermission(officer, 'user:manage')).toBe(false);
  });
  it('gives supervisors escalation oversight without case adjudication', () => {
    const supervisor = account('supervisor');
    expect(canAccessView(supervisor, 'officer')).toBe(true);
    expect(hasPermission(supervisor, 'escalation:view')).toBe(true);
    expect(hasPermission(supervisor, 'escalation:manage')).toBe(true);
    expect(hasPermission(supervisor, 'case:update')).toBe(false);
    expect(hasPermission(supervisor, 'notification:dispatch')).toBe(false);
    expect(hasPermission(supervisor, 'user:manage')).toBe(false);
  });
  it('limits administrators to administration and oversight', () => {
    const admin = account('admin');
    expect(canAccessView(admin, 'admin')).toBe(true);
    expect(hasPermission(admin, 'user:manage')).toBe(true);
    expect(hasPermission(admin, 'case:update')).toBe(false);
    expect(hasPermission(admin, 'notification:dispatch')).toBe(false);
  });
  it('denies suspended accounts', () => {
    const suspended = { ...account('supervisor'), status: 'SUSPENDED' as const };
    expect(canAccessView(suspended, 'officer')).toBe(false);
    expect(hasPermission(suspended, 'escalation:manage')).toBe(false);
  });
});
