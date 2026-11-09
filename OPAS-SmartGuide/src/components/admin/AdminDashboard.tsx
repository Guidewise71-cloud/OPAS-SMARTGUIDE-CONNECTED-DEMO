import React, { useState, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import {
  Shield,
  UserPlus,
  Users,
  Building2,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Search,
  Lock,
  Mail,
  Phone,
  Copy,
  RefreshCw,
  Eye,
  Sliders,
  FileText,
  BadgeCheck,
  Bell,
} from 'lucide-react';
import { UserAccount, OfficerClearanceLevel } from '../../types/auth';
import { BulkNotificationManager } from './BulkNotificationManager';

interface AdminDashboardProps {
  users: UserAccount[];
  onAddOfficer: (newOfficer: UserAccount) => void;
  onUpdateOfficerStatus: (userId: string, newStatus: 'ACTIVE' | 'SUSPENDED') => void;
  onResetPassword: (userId: string, newPass: string) => void;
  onViewOfficerConsole: () => void;
}

const PASSPORT_STATIONS = [
  'Lusaka Central Passport Office (Makishi Road)',
  'Ndola Regional Passport Office (President Avenue)',
  'Livingstone Regional Passport Office',
  'Kitwe Provincial Passport Office',
  'Chipata Provincial Center',
  'Kasama Provincial Center',
  'Solwezi Provincial Passport Center',
  'Choma Provincial Passport Center',
];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  users,
  onAddOfficer,
  onUpdateOfficerStatus,
  onResetPassword,
  onViewOfficerConsole,
}) => {
  const [activeTab, setActiveTab] = useState<'officers' | 'provision' | 'system' | 'notifications'>('officers');
  const { setCurrentSection } = useChat();

  useEffect(() => {
    const tabMap: Record<string, string> = {
      officers: 'Admin Dashboard - Officer Management',
      provision: 'Admin Dashboard - Provision Officer',
      system: 'Admin Dashboard - System Settings',
      notifications: 'Admin Dashboard - Bulk Notifications',
    };
    setCurrentSection(tabMap[activeTab] || 'Admin Dashboard');
  }, [activeTab, setCurrentSection]);
  const [searchQuery, setSearchQuery] = useState('');
  const [stationFilter, setStationFilter] = useState('ALL');

  // Form State for Provisioning New Officer
  const [officerName, setOfficerName] = useState('');
  const [badgeNumber, setBadgeNumber] = useState('');
  const [officialEmail, setOfficialEmail] = useState('');
  const [station, setStation] = useState(PASSPORT_STATIONS[0]);
  const [clearanceLevel, setClearanceLevel] = useState<OfficerClearanceLevel>('Vetting Officer');
  const [phone, setPhone] = useState('');
  const [customPassword, setCustomPassword] = useState('pass@mohais2026');
  const [autoGeneratePassword, setAutoGeneratePassword] = useState(true);

  // Success Feedback
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);
  const [newlyCreatedSlip, setNewlyCreatedSlip] = useState<{
    name: string;
    email: string;
    badge: string;
    station: string;
    level: string;
    password: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Filter officers list
  const officers = users.filter((u) => u.role === 'officer');
  const citizens = users.filter((u) => u.role === 'citizen');

  const filteredOfficers = officers.filter((off) => {
    const matchesSearch =
      searchQuery === '' ||
      off.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      off.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (off.badgeNumber && off.badgeNumber.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStation =
      stationFilter === 'ALL' || (off.station && off.station.includes(stationFilter));

    return matchesSearch && matchesStation;
  });

  // Auto-generate suggested badge number and email when name changes
  const handleNameChange = (name: string) => {
    setOfficerName(name);
    if (!badgeNumber || badgeNumber.startsWith('PO-')) {
      const parts = name.trim().split(' ');
      const initials = parts.map((p) => p[0]?.toUpperCase() || '').join('');
      const randomNum = Math.floor(100 + Math.random() * 900);
      setBadgeNumber(`PO-ZM-${randomNum}`);
    }
    if (!officialEmail || officialEmail.includes('@mohais.gov.zm')) {
      const parts = name.trim().toLowerCase().split(' ');
      if (parts.length > 1) {
        setOfficialEmail(`${parts[0][0]}.${parts[parts.length - 1]}@mohais.gov.zm`);
      } else if (parts[0]) {
        setOfficialEmail(`${parts[0]}@mohais.gov.zm`);
      }
    }
  };

  // Submit Officer Provisioning
  const handleProvisionOfficer = (e: React.FormEvent) => {
    e.preventDefault();

    const finalPass = autoGeneratePassword
      ? `MoHAIS#${Math.floor(1000 + Math.random() * 9000)}`
      : customPassword;

    const newOfficer: UserAccount = {
      id: `usr-officer-${Date.now()}`,
      email: officialEmail.trim().toLowerCase(),
      password: finalPass,
      fullName: officerName.trim(),
      role: 'officer',
      badgeNumber: badgeNumber.trim().toUpperCase(),
      station,
      clearanceLevel,
      phone: phone.trim() || '+260977000000',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      lastLogin: undefined,
    };

    onAddOfficer(newOfficer);

    setNewlyCreatedSlip({
      name: newOfficer.fullName,
      email: newOfficer.email,
      badge: newOfficer.badgeNumber || 'N/A',
      station: newOfficer.station || 'Headquarters',
      level: newOfficer.clearanceLevel || 'Officer',
      password: finalPass,
    });

    // Reset form
    setOfficerName('');
    setBadgeNumber('');
    setOfficialEmail('');
    setPhone('');
  };

  const copySlipToClipboard = () => {
    if (!newlyCreatedSlip) return;
    const text = `MoHAIS OPAS Officer Login Credentials:
Officer Name: ${newlyCreatedSlip.name}
Badge Number: ${newlyCreatedSlip.badge}
Official Email: ${newlyCreatedSlip.email}
Assigned Station: ${newlyCreatedSlip.station}
Clearance Level: ${newlyCreatedSlip.level}
Initial Temporary Password: ${newlyCreatedSlip.password}
Portal URL: opas.mohais.gov.zm`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              MoHAIS ICT Administration
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
            System Administration &amp; Passport Officer Provisioning
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage authorized vetting personnel, station credentials, and national OPAS access rules
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('officers')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'officers'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Officer Roster ({officers.length})
            </button>
            <button
              onClick={() => setActiveTab('provision')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'provision'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 text-emerald-700" />
              Provision New Officer
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'notifications' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              Bulk Notifications
            </button>
            <button
              onClick={() => setActiveTab('system')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                activeTab === 'system'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              System Overview
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: Officers Roster */}
      {activeTab === 'officers' && (
        <div className="space-y-4">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">
                Authorized Passport Officers
              </span>
              <div className="text-2xl font-bold text-slate-900 font-mono mt-1">
                {officers.length}{' '}
                <span className="text-xs font-normal text-slate-500">active accounts</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Across 8 regional passport centers</p>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">
                Registered Citizens
              </span>
              <div className="text-2xl font-bold text-slate-900 font-mono mt-1">
                {citizens.length}{' '}
                <span className="text-xs font-normal text-slate-500">citizen profiles</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Authenticated via Green NRC &amp; email</p>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">
                  Officer Vetting Console
                </span>
                <p className="text-xs text-slate-600 mt-1 font-medium">Inspect live national queues</p>
              </div>
              <button
                onClick={onViewOfficerConsole}
                className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                Open Console
              </button>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search officer by name, badge ID, email..."
                className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 bg-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Station:</span>
              <select
                value={stationFilter}
                onChange={(e) => setStationFilter(e.target.value)}
                className="text-xs p-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="ALL">All Stations</option>
                <option value="Lusaka">Lusaka Central</option>
                <option value="Ndola">Ndola Regional</option>
                <option value="Livingstone">Livingstone Regional</option>
                <option value="Kitwe">Kitwe Provincial</option>
              </select>

              <button
                onClick={() => setActiveTab('provision')}
                className="px-3 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Provision Officer</span>
              </button>
            </div>
          </div>

          {/* Reset password notification banner */}
          {resetSuccessMsg && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-lg p-3 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">{resetSuccessMsg}</span>
              </div>
              <button
                onClick={() => setResetSuccessMsg(null)}
                className="text-xs text-emerald-700 hover:text-emerald-900 font-bold ml-4 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Officers Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                    <th className="py-3 px-4">Officer Details</th>
                    <th className="py-3 px-4">Badge ID</th>
                    <th className="py-3 px-4">Station &amp; Clearance</th>
                    <th className="py-3 px-4">Official MoHAIS Email</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredOfficers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                        No officers found matching search parameters.
                      </td>
                    </tr>
                  ) : (
                    filteredOfficers.map((off) => (
                      <tr key={off.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            <span>{off.fullName}</span>
                          </div>
                          <div className="text-[11px] text-slate-500">Phone: {off.phone}</div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-mono bg-slate-100 text-slate-800 font-semibold px-2 py-0.5 rounded text-[11px]">
                            {off.badgeNumber || 'PO-ZM'}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900">
                            {off.station?.replace('Passport Office', 'P.O.')}
                          </div>
                          <div className="text-[11px] text-emerald-800 font-semibold">
                            {off.clearanceLevel || 'Vetting Officer'}
                          </div>
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-700">{off.email}</td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                              off.status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {off.status}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right space-x-1.5">
                          <button
                            onClick={() => {
                              const newStatus = off.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
                              onUpdateOfficerStatus(off.id, newStatus);
                            }}
                            className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                              off.status === 'ACTIVE'
                                ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                            }`}
                          >
                            {off.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                          </button>
                          <button
                            onClick={() => {
                              const generatedPass = `MoHAIS#${Math.floor(1000 + Math.random() * 9000)}`;
                              onResetPassword(off.id, generatedPass);
                              setResetSuccessMsg(`Password reset successfully for ${off.fullName} (${off.badgeNumber || 'PO-ZM'}). Temporary Password: ${generatedPass}`);
                            }}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            Reset Password
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Provision New Officer Form */}
      {activeTab === 'provision' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
            <div>
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                Official Credential Provisioning
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">
                Register &amp; Issue Passport Officer Login Details
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Creates an authorized officer account with role-based clearance to access the OPAS queue.
              </p>
            </div>

            <form onSubmit={handleProvisionOfficer} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Officer Full Legal Name
                  </label>
                  <input
                    type="text"
                    value={officerName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Chisanga Phiri"
                    required
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Badge Number / Officer Service ID
                  </label>
                  <input
                    type="text"
                    value={badgeNumber}
                    onChange={(e) => setBadgeNumber(e.target.value)}
                    placeholder="PO-LUS-089"
                    required
                    className="w-full p-2.5 border border-slate-300 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Official MoHAIS Government Email
                  </label>
                  <input
                    type="email"
                    value={officialEmail}
                    onChange={(e) => setOfficialEmail(e.target.value)}
                    placeholder="c.phiri@mohais.gov.zm"
                    required
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Official Mobile Contact
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+260 977 123456"
                    className="w-full p-2.5 border border-slate-300 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Assigned Passport Office / Station
                  </label>
                  <select
                    value={station}
                    onChange={(e) => setStation(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 bg-white"
                  >
                    {PASSPORT_STATIONS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Vetting Clearance Level
                  </label>
                  <select
                    value={clearanceLevel}
                    onChange={(e) => setClearanceLevel(e.target.value as any)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 bg-white"
                  >
                    <option value="Vetting Officer">Vetting Officer (Standard Review)</option>
                    <option value="Biometrics Supervisor">Biometrics Supervisor (Biometric Capture)</option>
                    <option value="Senior Adjudicator">Senior Adjudicator (Reversion &amp; Approval)</option>
                    <option value="Registry Administrator">Registry Administrator (Supervisory)</option>
                  </select>
                </div>
              </div>

              {/* Password Setup */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-900">Initial Authentication Password</label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-600">
                    <input
                      type="checkbox"
                      checked={autoGeneratePassword}
                      onChange={(e) => setAutoGeneratePassword(e.target.checked)}
                      className="text-emerald-700"
                    />
                    <span>Auto-generate secure temporary password</span>
                  </label>
                </div>

                {!autoGeneratePassword && (
                  <input
                    type="text"
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    placeholder="Set custom password"
                    className="w-full p-2 border border-slate-300 rounded-md bg-white font-mono"
                  />
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-lg shadow-md transition-colors cursor-pointer flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Provision Officer Account</span>
                </button>
              </div>
            </form>
          </div>

          {/* Credential Slip & Instructions */}
          <div className="space-y-4">
            {newlyCreatedSlip ? (
              <div className="bg-white border-2 border-emerald-500 rounded-xl p-5 shadow-lg space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                    Officer Credential Slip
                  </span>
                  <button
                    onClick={copySlipToClipboard}
                    className="text-xs text-emerald-800 hover:text-emerald-950 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copied ? 'Copied!' : 'Copy Slip'}</span>
                  </button>
                </div>

                <div className="text-center py-2 border-b border-slate-100">
                  <h4 className="text-sm font-bold text-slate-900">{newlyCreatedSlip.name}</h4>
                  <span className="text-xs font-mono text-emerald-800 font-bold block">
                    {newlyCreatedSlip.badge}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Login Username:</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {newlyCreatedSlip.email}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Temporary Password:</span>
                    <span className="font-mono font-bold text-emerald-800 bg-slate-100 px-2 py-1 rounded inline-block">
                      {newlyCreatedSlip.password}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Assigned Station:</span>
                    <span className="text-slate-800">{newlyCreatedSlip.station}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Clearance Level:</span>
                    <span className="text-slate-800 font-semibold">{newlyCreatedSlip.level}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                  This officer can immediately sign in via the Unified Login Portal using these credentials.
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-5 text-center text-xs text-slate-500 space-y-2">
                <Shield className="w-8 h-8 text-slate-400 mx-auto" />
                <div className="font-semibold text-slate-700">Official Provisioning Policy</div>
                <p className="text-[11px] leading-relaxed">
                  Only authorized ICT personnel may provision passport officer accounts. All accounts are logged under MoHAIS audit trails.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: Bulk Notification Management */}
      {activeTab === 'notifications' && <BulkNotificationManager />}

      {/* TAB 3: System Overview & Audit Rules */}
      {activeTab === 'system' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">
              National OPAS System Parameters &amp; Security Protocols
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Governing rules for citizen accounts, automated notification triggers, and officer permissions
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <BadgeCheck className="w-4 h-4 text-emerald-700" />
                Citizen Account Validation Policy
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Citizens register using a verified Green NRC number (format `123456/78/1`) and international E.164 phone. Each NRC is bound to one active passport account to eliminate duplicate identity submissions.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-700" />
                Officer Role-Based Access Control (RBAC)
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Vetting Officers can inspect and pre-screen documents. Senior Adjudicators can issue official reversions or approvals. Biometrics Supervisors confirm enrollment at regional counter terminals.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
