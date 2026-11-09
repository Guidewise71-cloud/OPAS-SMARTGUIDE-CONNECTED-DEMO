import React, { useState } from 'react';
import { usePassport } from '../context/PassportContext';
import {
  UserPlus,
  LogIn,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  ArrowRight,
  Lock,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';

interface RegisterPageProps {
  onSwitchToLogin: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onSwitchToLogin }) => {
  const { registerUser, startNewApplication } = usePassport();

  const [fullName, setFullName] = useState('');
  const [nrcNumber, setNrcNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('ZambiaPass2026!');
  const [confirmPassword, setConfirmPassword] = useState('ZambiaPass2026!');
  const [agreedTerms, setAgreedTerms] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

    if (!fullName.trim() || !email.trim() || !nrcNumber.trim() || !phone.trim() || !dateOfBirth) {
      setError('All fields marked with an asterisk (*) are mandatory.');
      return;
    }
    if (nrcNumber.length < 9) {
      setError('Please provide a valid Green National Registration Card (NRC) number (e.g. 123456/78/1).');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }
    if (!agreedTerms) {
      setError('You must authorize civil registry verification to register an OPAS account.');
      return;
    }

    const createdUser = registerUser({
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      nrcNumber: nrcNumber.trim(),
      dateOfBirth,
      password,
    });

    startNewApplication('NEW', createdUser);
  };

  const handleAutoFillSample = () => {
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
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Official Government Top Seal */}
      <div className="text-center space-y-2">
        <div className="w-14 h-14 mx-auto rounded-full bg-emerald-950 border-2 border-emerald-500/50 flex items-center justify-center text-3xl shadow-sm">
          🇿🇲
        </div>
        <div>
          <span className="text-[11px] font-bold tracking-widest text-emerald-800 uppercase block">
            Republic of Zambia
          </span>
          <h1 className="text-2xl font-black text-slate-950 tracking-tight">
            Citizen Account Registration
          </h1>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            Department of National Registration, Passport and Citizenship (DNRPC) · Ministry of Home Affairs and Internal Security
          </p>
        </div>
      </div>

      {/* Main Registration Card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {/* Banner */}
        <div className="bg-emerald-950 text-white px-6 py-3.5 flex items-center justify-between text-xs border-b border-emerald-900">
          <span className="font-semibold text-emerald-100 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            Step 1 of 5: Register Your Verified Citizen Profile
          </span>
          <button
            type="button"
            onClick={handleAutoFillSample}
            className="text-[11px] text-amber-300 hover:text-amber-200 font-semibold flex items-center gap-1 cursor-pointer bg-emerald-900/80 px-2.5 py-1 rounded border border-emerald-700"
          >
            <Sparkles className="w-3 h-3" />
            Auto-Fill Sample Citizen
          </button>
        </div>

        <div className="p-6 sm:p-8 space-y-5">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Registration Error</span>
                <p>{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Full Legal Name (as on Green NRC) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="e.g. Chileshe Natasha Mwape"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  National Registration Card (NRC) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={11}
                  value={nrcNumber}
                  onChange={handleNrcChange}
                  placeholder="e.g. 381920/11/1"
                  className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">Format: ######/##/1</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={dateOfBirth}
                  onChange={e => setDateOfBirth(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Mobile Phone (Airtel / MTN / Zamtel) <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+260 97 0000000"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Official Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="citizen@domain.com"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Create Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-950 flex items-start gap-2.5">
              <input
                type="checkbox"
                id="consentTerms"
                checked={agreedTerms}
                onChange={e => setAgreedTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-700 cursor-pointer"
              />
              <label htmlFor="consentTerms" className="cursor-pointer select-none leading-relaxed">
                I declare that I am a citizen of the Republic of Zambia and authorize the Department of National Registration, Passport and Citizenship to authenticate my Green NRC against the civil registry.
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm mt-3"
            >
              <UserPlus className="w-4 h-4 text-amber-300" />
              <span>Create Account & Start Passport Application</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Footer Prompt to Log In */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <span className="text-slate-600">
            Already have a registered OPAS account?
          </span>
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-emerald-800 hover:text-emerald-900 font-bold flex items-center gap-1 cursor-pointer self-start sm:self-auto"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Go to Log In Page</span>
          </button>
        </div>
      </div>
    </div>
  );
};
