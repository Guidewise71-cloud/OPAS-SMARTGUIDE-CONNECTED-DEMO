import React, { useState } from 'react';
import {
  Shield,
  Sparkles,
  User,
  BarChart3,
  Building2,
  LogOut,
  Layers,
  KeyRound,
  FileText,
  Smartphone,
  Bell,
  AlertTriangle,
  Clock,
  CheckCircle2,
  X,
} from 'lucide-react';
import { UserAccount } from '../types/auth';

interface HeaderProps {
  currentUser: UserAccount | null;
  currentView: 'officer' | 'citizen' | 'admin';
  onViewChange: (view: 'officer' | 'citizen' | 'admin') => void;
  onOpenAssistant: () => void;
  onSelectScenario: (scenarioId: string) => void;
  activeScenarioId?: string;
  onLogout: () => void;
  onOpenEOIModal?: () => void;
  onOpenPhoneSimulator?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  currentView,
  onViewChange,
  onOpenAssistant,
  onSelectScenario,
  activeScenarioId,
  onLogout,
  onOpenEOIModal,
  onOpenPhoneSimulator,
}) => {
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  return (
    <header className={`border-b sticky top-0 z-40 shadow-xs transition-colors ${
      currentView === 'officer' && currentUser
        ? 'border-[#283548] bg-[#1a2332] text-slate-200'
        : 'border-slate-200 bg-white'
    }`}>
      {/* Top Governmental Bar */}
      <div className="bg-emerald-950 text-white px-4 sm:px-8 py-2 text-xs sm:text-sm font-medium tracking-wide flex flex-wrap items-center justify-between gap-2 border-b border-emerald-900/40">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
          <span className="font-semibold">REPUBLIC OF ZAMBIA</span>
          <span className="text-emerald-300/60" aria-hidden="true">·</span>
          <span className="text-emerald-100">Ministry of Home Affairs and Internal Security (MoHAIS)</span>
          <span className="text-emerald-300/60 hidden md:inline" aria-hidden="true">·</span>
          <span className="text-emerald-200/90 hidden md:inline">Online Passport Application System (OPAS)</span>
        </div>
        {currentView === 'officer' && currentUser ? (
          <div className="flex items-center gap-2 text-xs sm:text-sm text-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-emerald-100">National Operational Portal</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs sm:text-sm text-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="font-medium text-emerald-100">Official Citizen Portal</span>
          </div>
        )}
      </div>

      {/* Main Navigation Header */}
      <div className="max-w-[1750px] mx-auto px-4 sm:px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Crest & Title */}
        {currentView === 'officer' && currentUser ? (
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-700 flex items-center justify-center text-white shadow-xs shrink-0">
              <Shield className="w-7 h-7 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-100">
                  OPAS Officer Operations Console
                </h1>
                <span className="bg-emerald-100 text-emerald-900 text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                  Official
                </span>
              </div>
              <p className="text-xs sm:text-sm mt-0.5 text-slate-300">
                Assisted Citizen Guidance · Contact Validation · Automated Reversion Tracking
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center text-white shadow-xs shrink-0">
              <Shield className="w-6 h-6 stroke-[2.2]" />
            </div>
          </div>
        )}

        {/* Action Controls & Navigation */}
        <div className="flex flex-wrap items-center gap-2.5">

          {/* Officer Notification Icon (only on officer dashboard) */}
          {currentView === 'officer' && currentUser ? (
            <div className="relative">
              <button
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="relative inline-flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-bold rounded-xl border transition-all cursor-pointer shadow-xs bg-[#20293a] hover:bg-[#28354a] text-slate-200 border-[#33425a]"
                title="Officer Notifications & Operational System Alerts"
                aria-label="Officer Notifications"
              >
                <div className="relative flex items-center justify-center">
                  <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-amber-400" />
                  <span className="absolute -top-1.5 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white shadow-xs">
                    4
                  </span>
                </div>
                <span className="hidden sm:inline">Officer Notifications</span>
              </button>

              {/* Officer Notifications Interactive Dropdown Panel */}
              {isNotificationOpen && (
                <div
                  className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#1e2738] border border-[#33425a] shadow-2xl p-4 text-slate-200 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between pb-3 border-b border-[#2d3a4f]">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-amber-400" />
                      <span className="text-sm font-bold text-slate-100">Officer System Alerts</span>
                      <span className="bg-red-500/20 text-red-300 border border-red-500/30 text-xs px-2 py-0.5 rounded-full font-bold">
                        4 Active
                      </span>
                    </div>
                    <button
                      onClick={() => setIsNotificationOpen(false)}
                      className="text-slate-400 hover:text-white p-1 rounded-md cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-3 space-y-2.5 max-h-72 overflow-y-auto pr-1 text-xs">
                    <div className="p-2.5 rounded-xl bg-[#253247] border border-[#384964] hover:border-amber-400/40 transition-colors">
                      <div className="flex items-center justify-between text-amber-300 font-bold mb-1">
                        <span className="flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" /> SLA Threshold Alert
                        </span>
                        <span className="text-[10px] text-slate-400">10m ago</span>
                      </div>
                      <p className="text-slate-300 leading-snug">
                        3 applications in Lusaka HQ queue have reached 14+ days in review status.
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#253247] border border-[#384964] hover:border-sky-400/40 transition-colors">
                      <div className="flex items-center justify-between text-sky-300 font-bold mb-1">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" /> Reversion Resubmission
                        </span>
                        <span className="text-[10px] text-slate-400">25m ago</span>
                      </div>
                      <p className="text-slate-300 leading-snug">
                        Mutinta Mweetwa (ZAM-OPAS-2026-8492) re-uploaded compliant photo for officer triage.
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#253247] border border-[#384964] hover:border-emerald-400/40 transition-colors">
                      <div className="flex items-center justify-between text-emerald-300 font-bold mb-1">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Automated Dispatch SMS
                        </span>
                        <span className="text-[10px] text-slate-400">1h ago</span>
                      </div>
                      <p className="text-slate-300 leading-snug">
                        Collection alert delivered to Mwamba Chileshe for booklet pickup.
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#253247] border border-[#384964] hover:border-purple-400/40 transition-colors">
                      <div className="flex items-center justify-between text-purple-300 font-bold mb-1">
                        <span className="flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5" /> Security Audit
                        </span>
                        <span className="text-[10px] text-slate-400">2h ago</span>
                      </div>
                      <p className="text-slate-300 leading-snug">
                        Biometrics schedule validated across Ndola &amp; Kitwe regional enrollment stations.
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-[#2d3a4f] flex items-center justify-between text-xs">
                    <span className="text-slate-400">All services operating normally</span>
                    <button
                      onClick={() => setIsNotificationOpen(false)}
                      className="text-amber-300 hover:text-amber-200 font-bold cursor-pointer"
                    >
                      Dismiss Alerts
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : currentUser ? (
            /* AI Assistant Quick Trigger (preserved for citizen & admin portal) */
            <button
              onClick={onOpenAssistant}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>AI Assistant</span>
            </button>
          ) : null}

          {/* Role-Specific Navigation Switcher (for Admins / Officers) */}
          {currentUser && currentUser.role === 'admin' && (
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                onClick={() => onViewChange('admin')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  currentView === 'admin'
                    ? 'bg-white text-emerald-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Admin Provisioning</span>
              </button>
              <button
                onClick={() => onViewChange('officer')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  currentView === 'officer'
                    ? 'bg-white text-emerald-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Officer Console</span>
              </button>
            </div>
          )}

          {/* User Profile Badge & High-Visibility Logout Button */}
          {currentUser ? (
            <div className={`flex items-center gap-3 pl-3 border-l ${
              currentView === 'officer' ? 'border-[#33425a]' : 'border-slate-200'
            }`}>
              <div className="text-right hidden sm:block">
                <div className={`text-sm font-bold flex items-center justify-end gap-2 ${
                  currentView === 'officer' ? 'text-slate-100' : 'text-slate-900'
                }`}>
                  <span>{currentUser.fullName}</span>
                  <span
                    className={`text-xs font-mono px-2 py-0.5 rounded font-bold uppercase ${
                      currentUser.role === 'admin'
                        ? 'bg-purple-100 text-purple-800'
                        : currentUser.role === 'officer'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {currentUser.role}
                  </span>
                </div>
                <div className={`text-xs ${
                  currentView === 'officer' ? 'text-slate-300 font-mono' : 'text-slate-500'
                }`}>
                  {currentUser.role === 'citizen'
                    ? `NRC: ${currentUser.nrcNumber || '294812/11/1'}`
                    : currentUser.badgeNumber || currentUser.email}
                </div>
              </div>

              {/* Log Out button: high-visibility on officer dashboard, original clean icon on citizen dashboard */}
              {currentView === 'officer' ? (
                <button
                  onClick={onLogout}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer shadow-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-100 border border-red-500/50"
                  title="Sign Out / Log Out of OPAS"
                >
                  <LogOut className="w-4 h-4 text-red-400" />
                  <span>Log Out</span>
                </button>
              ) : (
                <button
                  onClick={onLogout}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  title="Sign Out of OPAS"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Identity &amp; Access Portal</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
