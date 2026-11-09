import React, { useState } from 'react';
import {
  Shield,
  Lock,
  Mail,
  ArrowLeft,
  X,
  AlertTriangle,
  KeyRound,
  Building2,
} from 'lucide-react';
import { UserAccount } from '../../types/auth';

interface AuthPortalProps {
  users: UserAccount[];
  onLogin: (user: UserAccount) => void;
  onRegisterCitizen?: (newUser: UserAccount) => void;
  initialMode?: 'login' | 'register';
  onClose?: () => void;
  isModal?: boolean;
  promptMessage?: string;
}

export const AuthPortal: React.FC<AuthPortalProps> = ({
  users,
  onLogin,
  onClose,
  isModal = false,
  promptMessage,
}) => {
  // Login Form State
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const cleanId = loginIdentifier.trim().toLowerCase();
    const user = users.find(
      (u) =>
        u.email.toLowerCase() === cleanId ||
        (u.nrcNumber && u.nrcNumber.toLowerCase() === cleanId) ||
        (u.badgeNumber && u.badgeNumber.toLowerCase() === cleanId)
    );

    if (!user) {
      setLoginError('No matching active account was found.');
      return;
    }

    if (user.status === 'SUSPENDED') {
      setLoginError('This account is suspended and cannot sign in.');
      return;
    }

    if (user.role === 'citizen' && !import.meta.env.DEV) {
      setLoginError('Applicant sign-in requires the approved official OPAS identity service.');
      return;
    }

    setLoginLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: cleanId, password: loginPassword }),
      });
      const result = await response.json();
      if (!response.ok || !result.user) {
        throw new Error(result.error || 'Sign-in failed. Please verify your credentials.');
      }
      onLogin(result.user as UserAccount);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Sign-in failed. Please verify your credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleQuickDemoApplicantLogin = async () => {
    if (!import.meta.env.DEV || loginLoading) return;
    setLoginError('');
    setLoginLoading(true);
    try {
      const response = await fetch('/api/auth/demo-applicant-login', { method: 'POST' });
      const result = await response.json();
      if (!response.ok || result.user?.role !== 'citizen') {
        throw new Error(result.error || 'The local demo applicant is unavailable.');
      }
      onLogin(result.user as UserAccount);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'The local demo applicant is unavailable.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleQuickLogin = (email: string) => {
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (user?.status === 'ACTIVE') {
      // Demo cards make account selection easier, but authentication still
      // requires the account password through the normal submit flow.
      setLoginIdentifier(user.email);
      setLoginPassword('');
      setLoginError('');
    } else {
      setLoginError('This account is suspended and cannot access OPAS SmartGuide.');
    }
  };

  const content = (
    <div className="w-full max-w-lg mx-auto">
      {/* Top Close Button for Modal */}
      {isModal && onClose && (
        <div className="flex justify-end mb-2">
          <button
            onClick={onClose}
            className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-full transition-colors cursor-pointer"
            aria-label="Close Authentication Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Auth Card Container */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
        {/* Official Ministry Header Banner */}
        <div className="bg-[#09182B] text-white px-6 py-6 border-b border-slate-800 flex flex-col items-center text-center">
          {/* Authentic Zambia Coat of Arms */}
          <div className="w-16 h-16 flex items-center justify-center shrink-0 mb-3 drop-shadow-md">
            <img
              src="/assets/aistudio/zambia_coat_of_arms.png"
              alt="Republic of Zambia Coat of Arms"
              className="h-16 w-auto object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/public/assets/aistudio/zambia_coat_of_arms.png';
              }}
            />
          </div>

          <span className="text-[11px] font-bold tracking-widest text-amber-400 uppercase">
            Republic of Zambia · Ministry of Home Affairs
          </span>

          <h2 className="text-base sm:text-lg font-bold tracking-tight text-white mt-1">
            OPAS SmartGuide Portal
          </h2>

          <p className="text-xs text-slate-300 font-medium mt-0.5">
            Registered Account Sign In
          </p>

          {promptMessage && (
            <div className="mt-3.5 w-full p-3 bg-blue-950/80 border border-blue-400/60 rounded-xl text-xs font-semibold text-blue-100 flex items-center justify-center gap-2 shadow-xs">
              <Shield className="w-4 h-4 text-blue-300 shrink-0" />
              <span>{promptMessage}</span>
            </div>
          )}
        </div>

        {import.meta.env.DEV ? (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 text-[11px] text-amber-950 flex items-center gap-2 font-medium">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span>
              Local simulated OPAS demo only. Sample applications and payments are not official and do not verify identity.
            </span>
          </div>
        ) : (
          <div className="bg-blue-50/80 border-b border-blue-100 px-6 py-2.5 text-[11px] text-blue-900 flex items-center gap-2 font-medium">
            <Shield className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>
              Applicant sign-in requires an approved OPAS identity service.{' '}
              <a href="https://pass.gsb.gov.zm/login" target="_blank" rel="noopener noreferrer" className="font-bold underline">
                Sign in to official OPAS
              </a>
            </span>
          </div>
        )}

        <div className="p-6 sm:p-8">
          {/* Sign In Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {loginError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Registered Email, Green NRC or Officer ID
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="Registered email, NRC, or staff ID"
                  required
                  className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white text-slate-900"
                />
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                {import.meta.env.DEV
                  ? 'Development demo only. Sample credentials access simulated data, not official OPAS.'
                  : 'Applicant identity is not verified here. Staff should use their assigned staff account.'}
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white font-mono text-slate-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full mt-2 py-3 bg-[#1868D6] hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              <span>{loginLoading ? 'Verifying account…' : 'Authenticate & Open My OPAS Dashboard'}</span>
            </button>

            {/* Staff-only local demo account selectors. */}
            <div className="pt-5 mt-5 border-t border-slate-100">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">
                Staff demo sign-in:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('s.banda@mohais.gov.zm')}
                  className="p-2 text-left border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 rounded-lg transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 group-hover:text-emerald-900">
                    <Shield className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Spriano Banda</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
                    Passport Officer
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('supervisor@mohais.gov.zm')}
                  className="p-2 text-left border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 rounded-lg transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 group-hover:text-emerald-900">
                    <Shield className="w-3.5 h-3.5 text-amber-700" />
                    <span>Operations Supervisor</span>
                  </div>
                  <span className="text-[10px] text-amber-700 font-semibold block mt-0.5">Supervisor Dashboard</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin@mohais.gov.zm')}
                  className="p-2 text-left border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 rounded-lg transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 group-hover:text-emerald-900">
                    <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>MoHAIS Admin</span>
                  </div>
                  <span className="text-[10px] text-indigo-700 font-semibold block mt-0.5">
                    Registry Administration
                  </span>
                </button>
              </div>
            </div>

            {import.meta.env.DEV && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
                  Simulated applicant account
                </div>
                <p className="mt-1 text-[11px] text-amber-900">
                  John Banda’s local demo applications, payment detections, and inbox. No real identity or payment is checked.
                </p>
                <button
                  type="button"
                  disabled={loginLoading}
                  onClick={handleQuickDemoApplicantLogin}
                  className="mt-3 w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-amber-950 hover:bg-amber-100 disabled:opacity-50"
                >
                  Open John Banda demo inbox
                </button>
              </div>
            )}

            {/* Secondary back link if user does not want to log in */}
            {onClose && (
              <div className="text-center pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-800 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to landing page</span>
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Footer help note */}
      <p className="text-center text-xs text-slate-400 font-medium mt-3 drop-shadow-xs">
        Government of the Republic of Zambia · Online Passport Application System (OPAS)
      </p>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
        {content}
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-8 px-4 sm:px-6">
      {content}
    </div>
  );
};
