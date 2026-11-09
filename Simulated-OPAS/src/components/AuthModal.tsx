import React, { useState } from 'react';
import { usePassport } from '../context/PassportContext';
import { X, UserPlus, LogIn, ShieldCheck, Sparkles } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    authModalMode,
    setAuthModalMode,
    registerUser,
    loginUser,
    startNewApplication,
  } = usePassport();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('ZambiaPass2026!');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [nrcNumber, setNrcNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  // Format Zambian NRC: 123456/78/1
  const formatNRC = (val: string) => {
    const raw = val.replace(/[^0-9]/g, '');
    if (raw.length <= 6) return raw;
    if (raw.length <= 8) return `${raw.slice(0, 6)}/${raw.slice(6)}`;
    return `${raw.slice(0, 6)}/${raw.slice(6, 8)}/${raw.slice(8, 9)}`;
  };

  const handleNrcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNrcNumber(formatNRC(e.target.value));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (authModalMode === 'LOGIN') {
      if (!email.trim()) {
        setError('Please enter your registered email address.');
        return;
      }
      const success = loginUser(email);
      if (!success) {
        setError('No citizen account found with this email. Please register below or use demo credentials.');
      }
    } else {
      if (!fullName.trim() || !email.trim() || !nrcNumber.trim() || !phone.trim() || !dateOfBirth) {
        setError('Please complete all mandatory citizen registration fields.');
        return;
      }
      if (nrcNumber.length < 9) {
        setError('Please enter a valid National Registration Card (NRC) number (e.g. 123456/78/1).');
        return;
      }
      const createdUser = registerUser({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        nrcNumber: nrcNumber.trim(),
        dateOfBirth,
      });
      startNewApplication('NEW', createdUser);
    }
  };

  const handlePreFillZambianUser = () => {
    const random6 = Math.floor(100000 + Math.random() * 900000);
    const random2 = Math.floor(10 + Math.random() * 89);
    setFullName('Chileshe Natasha Mwape');
    setEmail(`chileshe.mwape${random2}@example.zm`);
    setPhone('+260 97 8419022');
    setNrcNumber(`${random6}/${random2}/1`);
    setDateOfBirth('1995-07-12');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-emerald-900 border border-emerald-500/40 text-amber-400 flex items-center justify-center text-sm font-bold">
              🇿🇲
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight">
                {authModalMode === 'REGISTER'
                  ? 'Zambian Citizen Account Registration'
                  : 'OPAS Citizen Sign In'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Department of National Registration, Passport and Citizenship
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsAuthModalOpen(false)}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-md hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setAuthModalMode('REGISTER');
              setError(null);
            }}
            className={`flex-1 py-3 text-center transition-colors cursor-pointer ${
              authModalMode === 'REGISTER'
                ? 'bg-white text-slate-900 border-b-2 border-emerald-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Create Citizen Account
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthModalMode('LOGIN');
              setError(null);
            }}
            className={`flex-1 py-3 text-center transition-colors cursor-pointer ${
              authModalMode === 'LOGIN'
                ? 'bg-white text-slate-900 border-b-2 border-emerald-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Sign In to OPAS
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
              <span className="font-bold">Error:</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {authModalMode === 'REGISTER' && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-medium">Applicant NRC & Identity</span>
                  <button
                    type="button"
                    onClick={handlePreFillZambianUser}
                    className="text-[11px] text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    Auto-Fill Sample Zambian Citizen
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Full Legal Name (as on NRC / Birth Certificate) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="e.g. Chileshe Natasha Mwape"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      National Registration Card (NRC) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={11}
                      value={nrcNumber}
                      onChange={handleNrcChange}
                      placeholder="e.g. 381920/11/1"
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                    <span className="text-[10px] text-slate-500">Format: ######/##/1</span>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Date of Birth <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={dateOfBirth}
                      onChange={e => setDateOfBirth(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Mobile Phone (Airtel / MTN / Zamtel) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+260 97 0000000"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Official Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="citizen@domain.com"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Account Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            {authModalMode === 'REGISTER' && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-[11px] text-emerald-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  National Registration Cards (NRC) are authenticated against the National Registry Database to verify Zambian citizenship.
                </span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              {authModalMode === 'REGISTER' ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  Register Citizen Profile & Proceed
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In to OPAS Portal
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          {authModalMode === 'LOGIN' && (
            <div className="mt-5 pt-4 border-t border-slate-200 text-xs">
              <span className="block text-slate-500 text-[11px] font-medium mb-2">
                Zambian Demo Profiles for Testing:
              </span>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setEmail('mulenga.banda@opas.gov.zm');
                    loginUser('mulenga.banda@opas.gov.zm');
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-between cursor-pointer"
                >
                  <span className="font-medium">Mulenga Banda (Active Passport Application)</span>
                  <span className="text-slate-400 font-mono text-[10px]">mulenga.banda@opas.gov.zm</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('thandiwe.lungu@opas.gov.zm');
                    loginUser('thandiwe.lungu@opas.gov.zm');
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-between cursor-pointer"
                >
                  <span className="font-medium">Thandiwe Lungu (Fresh Citizen Account)</span>
                  <span className="text-slate-400 font-mono text-[10px]">thandiwe.lungu@opas.gov.zm</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
