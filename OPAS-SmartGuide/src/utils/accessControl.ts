import { UserAccount, UserRole } from '../types/auth';

/**
 * Front-end permission policy for the OPAS demonstration. The production
 * OPAS integration must enforce the same policy server-side through its IdP.
 */
export type Permission =
  | 'application:view:own'
  | 'application:create'
  | 'application:resubmit'
  | 'case:view'
  | 'case:update'
  | 'notification:dispatch'
  | 'dashboard:view'
  | 'escalation:view'
  | 'escalation:manage'
  | 'user:manage';

const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  citizen: ['application:view:own', 'application:create', 'application:resubmit'],
  officer: ['case:view', 'case:update', 'notification:dispatch', 'dashboard:view'],
  // Supervisors review workloads and escalations but cannot adjudicate applications or dispatch applicant messages.
  supervisor: ['case:view', 'dashboard:view', 'escalation:view', 'escalation:manage'],
  // Administrators manage access and system settings; they do not adjudicate cases.
  admin: ['case:view', 'dashboard:view', 'user:manage'],
};

export const hasPermission = (
  user: Pick<UserAccount, 'role' | 'status'> | null | undefined,
  permission: Permission
): boolean => Boolean(user && user.status === 'ACTIVE' && ROLE_PERMISSIONS[user.role].includes(permission));

export const canAccessView = (
  user: Pick<UserAccount, 'role' | 'status'> | null | undefined,
  view: 'citizen' | 'officer' | 'admin'
): boolean => {
  if (!user || user.status !== 'ACTIVE') return false;
  if (view === 'citizen') return user.role === 'citizen';
  if (view === 'admin') return user.role === 'admin';
  return user.role === 'officer' || user.role === 'supervisor';
};
