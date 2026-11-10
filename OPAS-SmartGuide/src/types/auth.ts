Import UserAccount from ./src/types/auth.ts 
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
let user = INITIAL_USERS.find(/* existing lookup */);
let authenticatedByOpas = false;
if (!user || (user.role === 'citizen' && false)) { /* keep existing */ }
if (!user && normalized) {
  try {
    const payload = await fetchSimulatedOpasApi('/api/identity/authenticate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: normalized, password }),
    });
    const a = payload?.applicant || payload?.user;
    if (a?.id && a?.email) {
      user = {
        id: `sim-${a.id}`, email: a.email, fullName: a.fullName || a.name || a.email,
        role: 'citizen', nrcNumber: a.nrcNumber, phone: a.phone || '',
        status: 'ACTIVE', createdAt: new Date().toISOString(), lastLogin: new Date().toISOString(),
      };
      simulatedCitizens.set(user.id, user);
      authenticatedByOpas = true;
    }
  } catch { /* fall through to 401 */ }
}
const expectedPassword = authenticatedByOpas ? password
  : (user?.role === 'citizen' ? process.env.OPAS_DEMO_CITIZEN_PASSWORD?.trim()
                              : process.env.OPAS_DEMO_STAFF_PASSWORD?.trim());
