import React, { useState } from 'react';
import { usePassport } from '../context/PassportContext';
import { OpasPaymentApiInspector } from './OpasPaymentApiInspector';
import {
  Plus,
  LogOut,
  ChevronDown,
  RefreshCw,
  CheckCircle2,
  FileText,
  Database,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    currentUser,
    startNewApplication,
    setCurrentAppId,
    setIsAuthModalOpen,
    setAuthModalMode,
    setAuthPageMode,
    logoutUser,
    switchUser,
    resetAllData,
    storedLedgerRecords,
  } = usePassport();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isApiInspectorOpen, setIsApiInspectorOpen] = useState(false);

  const handleStartNew = () => {
    const newApp = startNewApplication('NEW');
    setCurrentAppId(newApp.id);
  };


  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40">
      {/* Official Republic of Zambia Header Strip */}
      <div className="bg-slate-950 border-b border-slate-800/80 px-4 sm:px-8 py-1.5 text-xs text-slate-400 flex items-center justify-between min-h-[33px]">
        <div className="flex items-center gap-2">
          <span className="font-bold text-amber-400 uppercase tracking-wider text-[11px]">
            Republic of Zambia
          </span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="hidden sm:inline text-slate-300">
            Ministry of Home Affairs & Internal Security · DNRPC
          </span>
        </div>
        {currentUser && (
          <div className="flex items-center gap-3 text-slate-400 text-[11px]">
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <CheckCircle2 className="w-3 h-3" />
              Official e-Passport Portal
            </span>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <button
              onClick={resetAllData}
              title="Reset system to fresh demo data"
              className="hover:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              Reset Demo
            </button>
          </div>
        )}
      </div>

      {/* Main Top Bar Contract: Zone 1 (Wordmark) — Zone 2 (Nav Links) — Zone 3 (Action / Profile) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark with Zambian Coat of Arms Emblem */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setCurrentAppId(null)}
            className="flex items-center gap-2.5 text-left group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-md bg-emerald-950 border border-emerald-500/40 flex items-center justify-center text-amber-400 font-bold text-lg shadow-inner">
              <span className="text-sm font-serif">🇿🇲</span>
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white group-hover:text-amber-400 transition-colors whitespace-nowrap">
                OPAS ZAMBIA
              </span>
              <span className="block text-[10px] font-medium text-slate-400 tracking-wider uppercase">
                Passports & Citizenship Directorate
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Navigation Links (Only shown when citizen is logged in - hidden on Citizen Portal Log In) */}
        {currentUser && (
          <nav className="hidden md:flex items-center gap-4 text-sm font-medium text-slate-300">
            <button
              onClick={() => setCurrentAppId(null)}
              className="text-white border-b-2 border-emerald-500 font-semibold py-1 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              My Applications
            </button>

            <button
              type="button"
              onClick={() => setIsApiInspectorOpen(true)}
              title="Inspect Simulated Government Payment Gateway & OPAS Payment API Ledger"
              className="text-slate-300 hover:text-white font-medium py-1 px-2.5 rounded bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 text-xs"
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>OPAS Payment API</span>
              <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-mono px-1.5 py-0.2 rounded">
                {storedLedgerRecords.length}
              </span>
            </button>
          </nav>
        )}

        {/* Zone 3: Primary Action / User Profile */}
        <div className="flex items-center gap-3 shrink-0">
          {currentUser ? (
            <div className="flex items-center gap-3">
              <button
                onClick={handleStartNew}
                className="hidden sm:flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-md transition-colors whitespace-nowrap shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Apply for Passport
              </button>

              {/* Account Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-md bg-slate-800/80 border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer text-left"
                >
                  <div className="w-7 h-7 rounded-full bg-emerald-900 border border-emerald-600/40 flex items-center justify-center text-emerald-200 text-xs font-semibold">
                    {currentUser.fullName.charAt(0)}
                  </div>
                  <div className="hidden lg:block text-left">
                    <span className="block text-xs font-semibold text-slate-200 truncate max-w-[130px]">
                      {currentUser.fullName}
                    </span>
                    <span className="block text-[10px] text-slate-400 font-mono">
                      NRC: {currentUser.nrcNumber}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-2 z-50 text-xs text-slate-300 divide-y divide-slate-800">
                    <div className="px-3.5 py-2.5">
                      <p className="font-semibold text-white truncate">{currentUser.fullName}</p>
                      <p className="text-slate-400 truncate">{currentUser.email}</p>
                      <p className="text-emerald-400 font-mono text-[11px] mt-0.5">
                        NRC: {currentUser.nrcNumber}
                      </p>
                    </div>

                    <div className="py-1">
                      <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Switch Synthetic Applicant Cohort
                      </div>

                      <button
                        onClick={() => {
                          switchUser('USR-ZM-7102');
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <span className="block font-medium">Mulenga Banda</span>
                          <span className="text-[10px] text-emerald-400 font-mono">Benchmark · Biometrics Booked</span>
                        </div>
                        {currentUser.id === 'USR-ZM-7102' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                      </button>

                      <button
                        onClick={() => {
                          switchUser('USR-ZM-INCOMP-1');
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <span className="block font-medium">Kondwani Tembo</span>
                          <span className="text-[10px] text-amber-400 font-mono">Incomplete · Missing Fields</span>
                        </div>
                        {currentUser.id === 'USR-ZM-INCOMP-1' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                      </button>

                      <button
                        onClick={() => {
                          switchUser('USR-ZM-INVALID-2');
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <span className="block font-medium">Bupe Mwila</span>
                          <span className="text-[10px] text-red-400 font-mono">Invalid Contact · Bounced</span>
                        </div>
                        {currentUser.id === 'USR-ZM-INVALID-2' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                      </button>

                      <button
                        onClick={() => {
                          switchUser('USR-ZM-PAID-3');
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <span className="block font-medium">Lumbani Phiri</span>
                          <span className="text-[10px] text-blue-400 font-mono">Paid Unsubmitted (23d)</span>
                        </div>
                        {currentUser.id === 'USR-ZM-PAID-3' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                      </button>

                      <button
                        onClick={() => {
                          switchUser('USR-ZM-REVERT-4');
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <span className="block font-medium">Natasha Chilufya</span>
                          <span className="text-[10px] text-purple-400 font-mono">Reverted Case #REV-1482</span>
                        </div>
                        {currentUser.id === 'USR-ZM-REVERT-4' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                      </button>
                    </div>

                    <div className="pt-1">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          logoutUser();
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-red-500/10 text-red-400 hover:text-red-300 flex items-center gap-2 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setAuthPageMode('LOGIN');
                  setAuthModalMode('LOGIN');
                  setCurrentAppId(null);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-200 hover:text-white border border-slate-700 hover:border-slate-600 rounded-md transition-colors cursor-pointer"
              >
                Log In
              </button>
              <button
                onClick={() => {
                  setAuthPageMode('REGISTER');
                  setAuthModalMode('REGISTER');
                  setCurrentAppId(null);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-md transition-colors whitespace-nowrap cursor-pointer shadow-sm"
              >
                Create Account
              </button>
            </div>
          )}
        </div>
      </div>

      {isApiInspectorOpen && (
        <OpasPaymentApiInspector
          isOpen={true}
          onClose={() => setIsApiInspectorOpen(false)}
        />
      )}
    </header>
  );
};
