import React, { useState } from 'react';
import { usePassport } from '../context/PassportContext';
import { PassportApplication, ApplicationStatus } from '../types/passport';
import { OpasPaymentApiInspector } from './OpasPaymentApiInspector';
import { SmartGuidePaymentMonitor } from './SmartGuidePaymentMonitor';
import {
  FileText,
  Plus,
  CheckCircle2,
  Calendar,
  CreditCard,
  Printer,
  ChevronRight,
  Shield,
  Database,
  RotateCcw,
  AlertTriangle,
  Mail,
  Clock,
  AlertCircle,
  ArrowRight,
  UserCheck,
  ShieldAlert,
} from 'lucide-react';

interface ApplicantDashboardProps {
  onStartNew: () => void;
  onResumeApp: (appId: string) => void;
}

export const ApplicantDashboard: React.FC<ApplicantDashboardProps> = ({
  onStartNew,
  onResumeApp,
}) => {
  const { currentUser, applications, storedLedgerRecords, switchUser } = usePassport();
  const [isApiInspectorOpen, setIsApiInspectorOpen] = useState(false);
  const [cohortFilter, setCohortFilter] = useState<'CURRENT' | 'ALL' | 'INCOMPLETE' | 'INVALID_CONTACT' | 'PAID_UNSUBMITTED' | 'REVERTED'>('CURRENT');

  // Filter applications based on selected synthetic cohort
  const displayedApps = (() => {
    switch (cohortFilter) {
      case 'INCOMPLETE':
        return applications.filter(a => !!a.incompleteIssues);
      case 'INVALID_CONTACT':
        return applications.filter(a => !!a.contactIssues);
      case 'PAID_UNSUBMITTED':
        return applications.filter(a => a.status === 'PAID_UNSUBMITTED');
      case 'REVERTED':
        return applications.filter(a => a.status === 'REVERTED_ACTION_REQUIRED' || !!a.revertDetails);
      case 'ALL':
        return applications;
      case 'CURRENT':
      default:
        return currentUser ? applications.filter(a => a.userId === currentUser.id) : applications;
    }
  })();

  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case 'DRAFT':
        return (
          <span className="text-xs text-slate-700 bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded font-medium">
            Draft Incomplete
          </span>
        );
      case 'PAYMENT_PENDING':
        return (
          <span className="text-xs text-amber-800 bg-amber-50 border border-amber-300 px-2.5 py-0.5 rounded font-medium">
            Awaiting Fee Payment
          </span>
        );
      case 'PAYMENT_COMPLETED':
        return (
          <span className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 rounded font-medium">
            Payment Cleared · Book Biometrics
          </span>
        );
      case 'PAID_UNSUBMITTED':
        return (
          <span className="text-xs text-blue-900 bg-blue-100 border border-blue-300 px-2.5 py-0.5 rounded font-bold flex items-center gap-1">
            <Clock className="w-3 h-3 text-blue-700" />
            Fee Paid · Unsubmitted (Action Needed)
          </span>
        );
      case 'REVERTED_ACTION_REQUIRED':
        return (
          <span className="text-xs text-purple-900 bg-purple-100 border border-purple-300 px-2.5 py-0.5 rounded font-bold flex items-center gap-1">
            <RotateCcw className="w-3 h-3 text-purple-700" />
            Reverted by DNRPC · Action Required
          </span>
        );
      case 'BIOMETRICS_SCHEDULED':
        return (
          <span className="text-xs text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded font-medium">
            Biometrics Scheduled
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className="text-xs text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded font-medium">
            Under DNRPC Verification
          </span>
        );
      case 'APPROVED':
        return (
          <span className="text-xs text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded font-bold">
            Issuance Approved
          </span>
        );
      case 'PRINTED':
        return (
          <span className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded font-medium">
            Booklet Printed &amp; Encoded
          </span>
        );
      case 'READY_FOR_COLLECTION':
        return (
          <span className="text-xs text-emerald-900 bg-emerald-200 font-bold px-2.5 py-0.5 rounded">
            Ready for Collection
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <SmartGuidePaymentMonitor />

      {/* Top Welcome Card with Zambian Identity */}
      <div className="bg-slate-900 text-white rounded-xl p-6 sm:p-8 relative overflow-hidden shadow-sm border border-slate-800">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 rounded-md">
            <span>Republic of Zambia · e-Passport System</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome, {currentUser?.fullName || 'Citizen'}
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Apply for your Republic of Zambia electronic biometric passport, upload your Green NRC and birth records, settle statutory fees securely via Mobile Money (Airtel, MTN, Zamtel) or Bank Card, and book your Provincial Passport Office appointment.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={onStartNew}
              className="px-5 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-md transition-all flex items-center gap-2 cursor-pointer shadow-md hover:scale-[1.01]"
            >
              <Plus className="w-4 h-4" />
              <span>Select Zambian Passport Type &amp; Service Urgency (Start Applying)</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Direct Action Card: Select Zambian Passport Type & Service Urgency */}
      <div
        onClick={onStartNew}
        className="bg-white border-2 border-emerald-600/40 hover:border-emerald-700 rounded-xl p-5 sm:p-6 transition-all shadow-xs hover:shadow-md cursor-pointer group flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              New Application Filing
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500">Ordinary 32-Page (K500) or Frequent 48-Page (K700)</span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-emerald-800 transition-colors flex items-center gap-2">
            Select Zambian Passport Type &amp; Service Urgency
            <ChevronRight className="w-4 h-4 text-emerald-700 group-hover:translate-x-1 transition-transform" />
          </h2>
          <p className="text-xs text-slate-600 max-w-2xl">
            Click here to select your passport category (First-Time Adult, Renewal, or Replacement), choose booklet capacity and processing urgency, and start applying for your passport.
          </p>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onStartNew();
          }}
          className="px-5 py-2.5 bg-emerald-800 group-hover:bg-emerald-900 text-white font-bold text-xs rounded-md transition-colors flex items-center justify-center gap-2 shrink-0 shadow-sm cursor-pointer"
        >
          <span>Start Applying Now</span>
          <ChevronRight className="w-4 h-4 text-amber-300" />
        </button>
      </div>

      {/* KPI Overview Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <span className="text-xs text-slate-500 block">Registered Applications</span>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {displayedApps.length}
          </div>
          <span className="text-[11px] text-slate-400">Filings on record</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <span className="text-xs text-slate-500 block">Settled Statutory Fees</span>
          <div className="text-2xl font-bold font-mono text-emerald-800 mt-1">
            K{displayedApps.reduce((acc, a) => (a.payment.status === 'PAID' ? acc + a.payment.amount : acc), 0).toFixed(2)}
          </div>
          <span className="text-[11px] text-slate-400">Total Zambian Kwacha (ZMW)</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <span className="text-xs text-slate-500 block">National Registration Card (NRC)</span>
          <div className="text-base font-bold font-mono text-slate-900 mt-2 truncate">
            {currentUser?.nrcNumber || 'NRC-PENDING'}
          </div>
          <span className="text-[11px] text-emerald-700 font-medium">Zambian civil registry verified</span>
        </div>

        <div
          onClick={() => setIsApiInspectorOpen(true)}
          className="bg-white border border-slate-200 hover:border-emerald-700 rounded-lg p-4 transition-all cursor-pointer group shadow-2xs"
          title="Click to view stored transaction references, status and timestamps"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 block">OPAS Payment API</span>
            <Database className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1 flex items-baseline gap-2">
            <span>{storedLedgerRecords.length}</span>
            <span className="text-[11px] font-sans font-normal text-slate-400">Records</span>
          </div>
          <span className="text-[11px] text-emerald-700 font-semibold group-hover:underline flex items-center gap-1">
            <span>Inspect API Ledger</span>
            <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </div>

      {/* Synthetic Data Cohort Quick Filter Bar */}
      <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              Synthetic Applicant Cohort Selector
            </span>
            <span className="text-[11px] text-slate-500">
              Inspect application edge cases modeled directly in the system.
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setCohortFilter('CURRENT')}
              className={`px-3 py-1 rounded font-medium transition-colors cursor-pointer ${
                cohortFilter === 'CURRENT'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-300'
              }`}
            >
              Current Profile ({currentUser?.fullName.split(' ')[0]})
            </button>

            <button
              type="button"
              onClick={() => setCohortFilter('ALL')}
              className={`px-3 py-1 rounded font-medium transition-colors cursor-pointer ${
                cohortFilter === 'ALL'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-300'
              }`}
            >
              All Cohorts ({applications.length})
            </button>
          </div>
        </div>

        {/* 4 Requested Cohort Filter Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1 text-xs">
          {/* Cohort 1: Incomplete */}
          <button
            type="button"
            onClick={() => {
              setCohortFilter('INCOMPLETE');
              switchUser('USR-ZM-INCOMP-1');
            }}
            className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
              cohortFilter === 'INCOMPLETE'
                ? 'bg-amber-100/80 border-amber-500 ring-2 ring-amber-400'
                : 'bg-white hover:bg-amber-50/50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">Incomplete Applications</span>
              <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-bold">
                Cohort 1
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">
              Kondwani Tembo: Missing parental NRCs, ancestral chief &amp; birth cert.
            </p>
          </button>

          {/* Cohort 2: Invalid Contact */}
          <button
            type="button"
            onClick={() => {
              setCohortFilter('INVALID_CONTACT');
              switchUser('USR-ZM-INVALID-2');
            }}
            className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
              cohortFilter === 'INVALID_CONTACT'
                ? 'bg-red-100/80 border-red-500 ring-2 ring-red-400'
                : 'bg-white hover:bg-red-50/50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">Invalid Contact Info</span>
              <span className="text-[10px] bg-red-200 text-red-900 px-1.5 py-0.2 rounded font-bold">
                Cohort 2
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">
              Bupe Mwila: Typo domain 'gnail.c' &amp; truncated phone '+260 95 12'.
            </p>
          </button>

          {/* Cohort 3: Paid Unsubmitted */}
          <button
            type="button"
            onClick={() => {
              setCohortFilter('PAID_UNSUBMITTED');
              switchUser('USR-ZM-PAID-3');
            }}
            className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
              cohortFilter === 'PAID_UNSUBMITTED'
                ? 'bg-blue-100/80 border-blue-500 ring-2 ring-blue-400'
                : 'bg-white hover:bg-blue-50/50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">Paid But Unsubmitted</span>
              <span className="text-[10px] bg-blue-200 text-blue-900 px-1.5 py-0.2 rounded font-bold">
                Cohort 3
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">
              Lumbani Phiri: ZMW 500 fee paid 23 days ago via MoMo; unsubmitted.
            </p>
          </button>

          {/* Cohort 4: Reverted */}
          <button
            type="button"
            onClick={() => {
              setCohortFilter('REVERTED');
              switchUser('USR-ZM-REVERT-4');
            }}
            className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
              cohortFilter === 'REVERTED'
                ? 'bg-purple-100/80 border-purple-500 ring-2 ring-purple-400'
                : 'bg-white hover:bg-purple-50/50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">Reverted Applications</span>
              <span className="text-[10px] bg-purple-200 text-purple-900 px-1.5 py-0.2 rounded font-bold">
                ~1.5k Burden
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">
              Natasha Chilufya: Case #REV-1482; officer rejected photo &amp; NRC scan.
            </p>
          </button>
        </div>
      </div>

      {/* Applications Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Passport Applications
            </h2>
            <p className="text-xs text-slate-500">
              Active filings, statutory fee statuses, and required applicant actions.
            </p>
          </div>
        </div>

        {displayedApps.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">No Zambian Passport Applications Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                You have no applications under this filter. Click the button below to start your application.
              </p>
            </div>
            <div>
              <button
                onClick={onStartNew}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-md transition-colors inline-flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Start Passport Application Now
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedApps.map(app => (
              <div
                key={app.id}
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-5 sm:p-6 transition-all shadow-xs space-y-4"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-base font-mono font-black text-slate-950">
                      {app.referenceNumber}
                    </span>
                    {getStatusBadge(app.status)}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onResumeApp(app.id)}
                      className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <span>
                        {app.status === 'REVERTED_ACTION_REQUIRED'
                          ? 'Resolve Revert & Fix'
                          : app.status === 'PAID_UNSUBMITTED'
                          ? 'Complete Final Submission'
                          : app.payment.status === 'PAID'
                          ? 'View Application & Slip'
                          : 'Resume Application'}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Metadata Summary */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                  <span>
                    Applicant: <strong>{app.personalDetails.givenNames} {app.personalDetails.surname}</strong>
                  </span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span>
                    NRC: <strong className="font-mono">{app.personalDetails.nrcNumber || 'Not Provided'}</strong>
                  </span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span>
                    Category: <strong>{app.applicationType} ({app.bookletType === 'STANDARD_32' ? '32 Pages' : '48 Pages'})</strong>
                  </span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span>
                    Statutory Fee: <strong className="font-mono text-emerald-800">K{app.payment.amount.toFixed(2)} ZMW</strong> ({app.payment.status})
                  </span>
                </div>

                {/* 1. Specialized Incomplete Application Warning Banner */}
                {app.incompleteIssues && (
                  <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-lg space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>Synthetic Cohort 1: Incomplete Application Warning</span>
                    </div>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      {app.incompleteIssues.warningText}
                    </p>
                    <div className="pt-1">
                      <span className="text-[11px] font-bold text-amber-950 block mb-1">
                        Missing Mandatory Civil Records:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {app.incompleteIssues.missingFields.map((field, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-medium bg-amber-200/80 text-amber-950 px-2 py-0.5 rounded border border-amber-300"
                          >
                            ✕ {field}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Specialized Invalid Contact Information Banner */}
                {app.contactIssues && (
                  <div className="p-3.5 bg-red-50 border border-red-300 rounded-lg space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-red-900">
                      <Mail className="w-4 h-4 text-red-700 shrink-0" />
                      <span>Synthetic Cohort 2: Invalid Contact Information (Undeliverable)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-red-800">
                      <div className="bg-white/80 p-2.5 rounded border border-red-200">
                        <span className="font-bold block text-[11px]">Email Dispatch Error:</span>
                        <p className="font-mono text-[11px] text-red-950">{app.personalDetails.email}</p>
                        <p className="text-[11px] text-red-700 mt-1">{app.contactIssues.emailIssue}</p>
                      </div>
                      <div className="bg-white/80 p-2.5 rounded border border-red-200">
                        <span className="font-bold block text-[11px]">SMS Telephony Error:</span>
                        <p className="font-mono text-[11px] text-red-950">{app.personalDetails.mobilePhone}</p>
                        <p className="text-[11px] text-red-700 mt-1">{app.contactIssues.phoneIssue}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Specialized Paid but Unsubmitted Application Banner */}
                {app.unsubmittedDetails && (
                  <div className="p-3.5 bg-blue-50 border border-blue-300 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-blue-950">
                        <Clock className="w-4 h-4 text-blue-700 shrink-0" />
                        <span>Synthetic Cohort 3: Paid But Unsubmitted Application</span>
                      </div>
                      <span className="text-[11px] font-mono text-blue-800 bg-blue-100 px-2 py-0.5 rounded font-bold">
                        {app.unsubmittedDetails.daysPending} Days Dormant
                      </span>
                    </div>
                    <p className="text-xs text-blue-800 leading-relaxed">
                      Statutory fee of <strong>K{app.payment.amount.toFixed(2)} ZMW</strong> was successfully cleared on <strong>{new Date(app.unsubmittedDetails.paidAt).toLocaleDateString()}</strong> via {app.payment.paymentMethod} (Txn: {app.payment.transactionId}). However, the applicant has not submitted their application for DNRPC officer vetting or scheduled biometrics.
                    </p>
                    <div className="pt-1">
                      <button
                        onClick={() => onResumeApp(app.id)}
                        className="px-3.5 py-1.5 bg-blue-800 hover:bg-blue-900 text-white font-bold text-xs rounded transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <span>Complete Submission &amp; Book Biometrics</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. Specialized Reverted Application Banner (~1,500 Cases) */}
                {app.revertDetails && (
                  <div className="p-4 bg-purple-50 border-2 border-purple-400 rounded-lg space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-200 pb-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-purple-950">
                        <RotateCcw className="w-4 h-4 text-purple-700 shrink-0" />
                        <span>DNRPC Action Notice &middot; Reverted Application Case #{app.revertDetails.caseNumber}</span>
                      </div>
                      <span className="text-[11px] font-bold text-red-700 bg-red-100 px-2.5 py-0.5 rounded border border-red-200">
                        Deadline: {app.revertDetails.deadlineDate}
                      </span>
                    </div>

                    <div className="text-xs text-purple-900 space-y-1">
                      <p>
                        <strong>Reason:</strong> {app.revertDetails.reason}
                      </p>
                      <p>
                        <strong>Officer Note:</strong> {app.revertDetails.requiredCorrection}
                      </p>
                      <p className="text-[11px] text-purple-700">
                        Assigned Officer: {app.revertDetails.officerName} &middot; {app.revertDetails.department}
                      </p>
                    </div>

                    <div className="pt-1 flex items-center justify-between">
                      <span className="text-[11px] text-purple-800 italic">
                        Representing 1 of ~1,500 active reverted cases requiring follow-up.
                      </span>
                      <button
                        onClick={() => onResumeApp(app.id)}
                        className="px-4 py-1.5 bg-purple-800 hover:bg-purple-900 text-white font-bold text-xs rounded transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <span>Re-Upload Required Records</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Appointment Banner if booked */}
                {app.appointment && (
                  <div className="flex items-center gap-2 text-xs text-emerald-950 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded">
                    <Calendar className="w-4 h-4 text-emerald-800 shrink-0" />
                    <span>
                      Biometrics Scheduled: <strong>{app.appointment.appointmentDate}</strong> at <strong>{app.appointment.appointmentTimeSlot}</strong> &middot; {app.appointment.officeName}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {isApiInspectorOpen && (
        <OpasPaymentApiInspector
          isOpen={true}
          onClose={() => setIsApiInspectorOpen(false)}
        />
      )}
    </div>
  );
};
