export type UserRole = 'citizen' | 'officer' | 'supervisor' | 'admin';

export type OfficerClearanceLevel =
  | 'Vetting Officer'
  | 'Biometrics Supervisor'
  | 'Senior Adjudicator'
  | 'Registry Administrator';

export interface UserAccount {
  id: string;
  email: string;
  password?: string;
  fullName: string;
  role: UserRole;
  nrcNumber?: string; // For citizens
  phone?: string;
  badgeNumber?: string; // For officers (e.g. PO-LUS-042)
  station?: string; // For officers (e.g. Lusaka Central Passport Office)
  clearanceLevel?: OfficerClearanceLevel;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
  lastLogin?: string;
}

export interface AuthState {
  currentUser: UserAccount | null;
  isAuthenticated: boolean;
}
