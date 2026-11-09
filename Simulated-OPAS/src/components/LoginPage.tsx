import React, { useState } from 'react';
import { usePassport } from '../context/PassportContext';
import {
  LogIn,
  UserPlus,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  Lock,
  ArrowRight,
  Info,
} from 'lucide-react';

interface LoginPageProps {
  onSwitchToRegister: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSwitchToRegister }) => {
  const { loginUser } = usePassport();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('ZambiaPass2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!identifier.trim()) {
      setError('Please enter your registered Email Address, NRC Number, or Mobile Number.');
      return;
    }

    const success = loginUser(identifier);
    if (!success) {
      setError(
        'Invalid login credentials. No citizen profile was found matching this Email, NRC, or Mobile Number. If you are a new applicant, please create an account.'
      );
    }
  };

  const handleQuickDemoLogin = (email: string) => {
    setIdentifier(email);
    loginUser(email);
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetIdentifier.trim()) return;
    setResetSent(true);
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
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
            Citizen Portal Log In
          </h1>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            Department of National Registration, Passport and Citizenship (DNRPC) · Ministry of Home Affairs and Internal Security
          </p>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {/* Banner */}
        <div className="bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-200 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            Official OPAS Citizen Authentication
          </span>
          <span className="text-[11px] font-mono text-emerald-400 font-semibold">
            SECURE ACCESS
          </span>
        </div>

        <div className="p-6 sm:p-8 space-y-5">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold block">Authentication Failed</span>
                <p>{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Email Address, Green NRC Number, or Mobile Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={e => {
                  setIdentifier(e.target.value);
                  setError(null);
                }}
                placeholder="e.g. 381920/11/1, email@domain.com, or +260 97..."
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-700 font-sans"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                You can sign in with your National Registration Card (NRC) or registered email.
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-800">
                  Account Password <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-[11px] text-emerald-800 hover:text-emerald-900 font-medium cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your account password"
                  className="w-full pl-3.5 pr-10 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-700 cursor-pointer"
                />
                <span>Remember this workstation</span>
              </label>

              <span className="text-[11px] text-slate-400">256-Bit SSL Protection</span>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm mt-2"
            >
              <LogIn className="w-4 h-4 text-amber-300" />
              <span>Log In to Citizen Portal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Logins for Instant Testing of Synthetic Cohorts */}
          <div className="pt-4 border-t border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 block uppercase tracking-wider">
                Select Synthetic Applicant Cohort:
              </span>
              <span className="text-[10px] text-slate-500 font-mono">1-Click Sign In</span>
            </div>

            <div className="space-y-2">
              {/* Cohort 1: Incomplete application */}
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('kondwani.tembo@opas.gov.zm')}
                className="w-full p-2.5 bg-amber-50/70 hover:bg-amber-100/70 border border-amber-300 rounded text-left transition-colors cursor-pointer flex items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">Kondwani Tembo</span>
                    <span className="text-[10px] font-mono text-slate-500">652194/52/1</span>
                  </div>
                  <span className="text-[11px] text-amber-900 block mt-0.5">
                    • <strong>Cohort 1: Incomplete Application</strong> (Missing parents' NRCs, village &amp; chief)
                  </span>
                </div>
                <span className="text-[10px] bg-amber-200 text-amber-950 px-2 py-0.5 rounded font-bold shrink-0">
                  Incomplete
                </span>
              </button>

              {/* Cohort 2: Invalid contact information */}
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('bupe.mwila@gnail.c')}
                className="w-full p-2.5 bg-red-50/70 hover:bg-red-100/70 border border-red-300 rounded text-left transition-colors cursor-pointer flex items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">Bupe Mwila</span>
                    <span className="text-[10px] font-mono text-slate-500">518042/31/1</span>
                  </div>
                  <span className="text-[11px] text-red-900 block mt-0.5">
                    • <strong>Cohort 2: Invalid Contact Info</strong> (Typo domain 'gnail.c' &amp; short phone '+260 95 12')
                  </span>
                </div>
                <span className="text-[10px] bg-red-200 text-red-950 px-2 py-0.5 rounded font-bold shrink-0">
                  Invalid Contact
                </span>
              </button>

              {/* Cohort 3: Paid but unsubmitted */}
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('lumbani.phiri@opas.gov.zm')}
                className="w-full p-2.5 bg-blue-50/70 hover:bg-blue-100/70 border border-blue-300 rounded text-left transition-colors cursor-pointer flex items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">Lumbani Phiri</span>
                    <span className="text-[10px] font-mono text-slate-500">724910/10/1</span>
                  </div>
                  <span className="text-[11px] text-blue-900 block mt-0.5">
                    • <strong>Cohort 3: Paid but Unsubmitted</strong> (ZMW 500 settled via MoMo 23 days ago, unsubmitted)
                  </span>
                </div>
                <span className="text-[10px] bg-blue-200 text-blue-950 px-2 py-0.5 rounded font-bold shrink-0">
                  Paid Unsubmitted
                </span>
              </button>

              {/* Cohort 4: Reverted applications (~1,500 burden) */}
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('natasha.chilufya@opas.gov.zm')}
                className="w-full p-2.5 bg-purple-50/70 hover:bg-purple-100/70 border border-purple-300 rounded text-left transition-colors cursor-pointer flex items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">Natasha Chilufya</span>
                    <span className="text-[10px] font-mono text-slate-500">318029/61/1</span>
                  </div>
                  <span className="text-[11px] text-purple-900 block mt-0.5">
                    • <strong>Cohort 4: Reverted Case #REV-1482</strong> (DNRPC officer rejected photo shadows &amp; clipped NRC)
                  </span>
                </div>
                <span className="text-[10px] bg-purple-200 text-purple-950 px-2 py-0.5 rounded font-bold shrink-0">
                  Reverted (~1.5k)
                </span>
              </button>

              {/* Benchmark: Mulenga Banda */}
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('mulenga.banda@opas.gov.zm')}
                className="w-full p-2.5 bg-emerald-50/70 hover:bg-emerald-100/70 border border-emerald-300 rounded text-left transition-colors cursor-pointer flex items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">Mulenga Banda</span>
                    <span className="text-[10px] font-mono text-slate-500">381920/11/1</span>
                  </div>
                  <span className="text-[11px] text-emerald-900 block mt-0.5">
                    • <strong>Benchmark Completed</strong> (Statutory fee paid &middot; Biometrics appointment scheduled)
                  </span>
                </div>
                <span className="text-[10px] bg-emerald-200 text-emerald-950 px-2 py-0.5 rounded font-bold shrink-0">
                  Scheduled
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Prompt to Register */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <span className="text-slate-600">
            Applying for a Zambian passport for the first time?
          </span>
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="text-emerald-800 hover:text-emerald-900 font-bold flex items-center gap-1 cursor-pointer self-start sm:self-auto"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create Citizen Account Now</span>
          </button>
        </div>
      </div>

      {/* Security & Legal Notice */}
      <div className="p-4 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Official Government Notice:</strong> Unauthorized attempts to access this system or upload fraudulent civil records are criminal offences punishable under Section 8 of the Passports Act and the Electronic Communications and Transactions Act.
        </p>
      </div>

      {/* Password Reset Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold text-slate-900">Reset Citizen Account Access</h3>
              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(false);
                  setResetSent(false);
                }}
                className="text-slate-400 hover:text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>

            {resetSent ? (
              <div className="space-y-3 py-2 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h4 className="text-xs font-bold text-slate-900">
                  Password Reset Instructions Dispatched
                </h4>
                <p className="text-xs text-slate-600">
                  A temporary password reset link and SMS OTP token have been dispatched to the mobile number and email associated with <strong className="font-mono">{resetIdentifier}</strong>.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(false);
                    setResetSent(false);
                  }}
                  className="px-4 py-2 bg-slate-900 text-white font-semibold text-xs rounded-md cursor-pointer mt-2"
                >
                  Return to Log In
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-3">
                <p className="text-xs text-slate-600">
                  Enter your registered Green NRC Number or Email Address. A verification code will be sent to your registered mobile handset.
                </p>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    NRC Number or Email
                  </label>
                  <input
                    type="text"
                    required
                    value={resetIdentifier}
                    onChange={e => setResetIdentifier(e.target.value)}
                    placeholder="e.g. 381920/11/1 or citizen@domain.zm"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-md cursor-pointer"
                  >
                    Send Reset Token
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
