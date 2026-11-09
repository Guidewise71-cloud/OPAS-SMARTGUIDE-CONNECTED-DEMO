import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Clock,
  Sparkles,
  Search,
  Filter,
  Send,
  ArrowRight,
  ShieldAlert,
  Building2,
  CheckCircle2,
  FileText,
  UserCheck,
  PhoneCall,
  Flame,
  ChevronRight,
  ExternalLink,
  Smartphone,
} from 'lucide-react';
import { PassportApplication, NotificationLog } from '../../types/passport';
import {
  buildActionQueue,
  calculateActionQueueSummary,
  ActionQueueItem,
} from '../../utils/actionQueue';
import { CitizenPhoneSimulatorModal } from '../common/CitizenPhoneSimulatorModal';

interface ActionQueueTabProps {
  applications: PassportApplication[];
  onOpenTriageModal: (app: PassportApplication) => void;
  onUpdateStatus: (id: string, newStatus: PassportApplication['status'], notes?: string) => void;
  onAddNotification: (id: string, notif: NotificationLog) => void;
  onSelectApplication: (app: PassportApplication) => void;
}

export const ActionQueueTab: React.FC<ActionQueueTabProps> = ({
  applications,
  onOpenTriageModal,
  onUpdateStatus,
  onAddNotification,
  onSelectApplication,
}) => {
  const [filterType, setFilterType] = useState<
    'ALL' | 'REVERTED' | 'OVERDUE' | 'INCOMPLETE' | 'PAID_UNSUBMITTED'
  >('ALL');
  const [officeFilter, setOfficeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [quickReminderSentId, setQuickReminderSentId] = useState<string | null>(null);
  const [phoneSimApp, setPhoneSimApp] = useState<PassportApplication | null>(null);

  // Summary statistics
  const summary = useMemo(() => calculateActionQueueSummary(applications), [applications]);

  // Full action queue (sorted most-overdue first)
  const fullQueue = useMemo(() => buildActionQueue(applications), [applications]);

  // Count paid-unsubmitted
  const paidUnsubmittedCount = useMemo(() => {
    return applications.filter(
      (a) => a.status === 'Paid - Unsubmitted' || (a.feePaid && a.status === 'Draft')
    ).length;
  }, [applications]);

  // Filtered queue items
  const filteredQueue = useMemo(() => {
    return fullQueue.filter((item) => {
      // Type Filter
      if (filterType === 'REVERTED' && !item.isReverted) return false;
      if (filterType === 'OVERDUE' && !item.isOverdue) return false;
      if (filterType === 'INCOMPLETE' && !item.isIncomplete) return false;
      if (
        filterType === 'PAID_UNSUBMITTED' &&
        item.application.status !== 'Paid - Unsubmitted' &&
        !(item.application.feePaid && item.application.status === 'Draft')
      ) {
        return false;
      }

      // Office Filter
      if (officeFilter !== 'ALL' && !item.application.collectionOffice.toLowerCase().includes(officeFilter.toLowerCase())) {
        return false;
      }

      // Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.application.fullName.toLowerCase().includes(q);
        const matchesNrc = item.application.nrcNumber.toLowerCase().includes(q);
        const matchesTracking = item.application.trackingNumber.toLowerCase().includes(q);
        const matchesReason = item.primaryReason.toLowerCase().includes(q);
        if (!matchesName && !matchesNrc && !matchesTracking && !matchesReason) {
          return false;
        }
      }

      return true;
    });
  }, [fullQueue, filterType, officeFilter, searchQuery]);

  // Quick automated reminder dispatcher
  const handleQuickSendReminder = (app: PassportApplication) => {
    const isReverted = app.status === 'Reverted';
    const content = isReverted
      ? `MoHAIS OPAS: Dear ${app.fullName}, action required on reverted application #${app.trackingNumber}. Please upload required documentation on the OPAS portal.`
      : `MoHAIS OPAS: Dear ${app.fullName}, your passport application #${app.trackingNumber} requires completion. Please log in to complete your submission.`;

    onAddNotification(app.id, {
      id: `notif-${Date.now()}`,
      timestamp: new Date().toISOString(),
      channel: 'SMS',
      subject: isReverted ? 'Action Required: Reverted Passport Application' : 'Action Required: Application Incomplete',
      content,
      deliveryStatus: 'Delivered',
    });

    setQuickReminderSentId(app.id);
    setTimeout(() => {
      setQuickReminderSentId((curr) => (curr === app.id ? null : curr));
    }, 3500);
  };

  return (
    <div className="space-y-6 text-slate-200">
      {/* SECTION BANNER with comfortable contrast */}
      <div className="bg-amber-500/15 border border-amber-400/40 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-3 bg-amber-500 text-slate-950 rounded-xl shrink-0 mt-0.5 shadow-xs">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-base sm:text-lg font-bold text-amber-200 tracking-tight">
                Staff Action Queue: Triage &amp; Human Intervention
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-400/20 text-amber-200 border border-amber-300/40">
                {summary.totalNeedingAttention} Cases Need Attention
              </span>
            </div>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Surfaces strictly cases requiring officer vetting, applicant outreach, or document corrections.
              Sorted automatically by longest aging duration to eliminate SLA bottlenecks.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => {
              setFilterType('ALL');
              setOfficeFilter('ALL');
              setSearchQuery('');
            }}
            className="px-4 py-2 text-sm font-semibold text-slate-200 bg-[#18202c] hover:bg-[#253247] border border-[#33425a] rounded-xl transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* TOP ROW: SUMMARY METRICS & PER-OFFICE BREAKDOWN */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        {/* Metric 1: Total & Category Breakdown */}
        <div className="bg-[#20293a] border border-[#33425a] rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-sm text-slate-300 mb-1.5">
              <span className="font-semibold text-slate-200">Staff Attention Cases</span>
              <span className="text-xs text-emerald-400 font-bold bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                {summary.totalNeedingAttention} of {applications.length} Active
              </span>
            </div>
            <div className="flex items-baseline gap-2.5">
              <span className="text-3xl sm:text-4xl font-extrabold text-slate-100 font-mono">{summary.totalNeedingAttention}</span>
              <span className="text-sm text-slate-400">cases requiring staff action</span>
            </div>
          </div>

          <div className="mt-4 pt-3.5 border-t border-[#33425a] grid grid-cols-3 gap-2 text-center">
            <button
              onClick={() => setFilterType('REVERTED')}
              className={`p-2 rounded-xl border transition-colors cursor-pointer text-left ${
                filterType === 'REVERTED'
                  ? 'bg-red-500/30 border-red-400/60 text-red-200 shadow-sm'
                  : 'bg-red-500/15 border-red-500/30 text-red-300 hover:bg-red-500/25'
              }`}
            >
              <div className="text-xs font-semibold text-red-300 uppercase">Reverted</div>
              <div className="text-xl font-black text-red-100 font-mono">{summary.revertedCount}</div>
            </button>

            <button
              onClick={() => setFilterType('OVERDUE')}
              className={`p-2 rounded-xl border transition-colors cursor-pointer text-left ${
                filterType === 'OVERDUE'
                  ? 'bg-amber-500/30 border-amber-400/60 text-amber-200 shadow-sm'
                  : 'bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/25'
              }`}
            >
              <div className="text-xs font-semibold text-amber-300 uppercase">Overdue 14d+</div>
              <div className="text-xl font-black text-amber-100 font-mono">{summary.overdueCount}</div>
            </button>

            <button
              onClick={() => setFilterType('INCOMPLETE')}
              className={`p-2 rounded-xl border transition-colors cursor-pointer text-left ${
                filterType === 'INCOMPLETE'
                  ? 'bg-blue-500/30 border-blue-400/60 text-blue-200 shadow-sm'
                  : 'bg-blue-500/15 border-blue-500/30 text-blue-300 hover:bg-blue-500/25'
              }`}
            >
              <div className="text-xs font-semibold text-blue-300 uppercase">Incomplete</div>
              <div className="text-xl font-black text-blue-100 font-mono">{summary.incompleteCount}</div>
            </button>
          </div>
        </div>

        {/* Metric 2: Longest Wait Duration */}
        <div className="bg-[#20293a] border border-[#33425a] rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-sm text-slate-300 mb-1.5">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-red-400" />
                Longest Waiting Case
              </span>
              <span className="text-xs font-bold text-red-300 bg-red-500/15 px-2 py-0.5 rounded-md border border-red-500/30">
                SLA Alert
              </span>
            </div>

            <div className="flex items-baseline gap-2.5">
              <span className="text-3xl sm:text-4xl font-extrabold text-red-400 font-mono">{summary.longestWaitDays}</span>
              <span className="text-sm text-slate-300 font-semibold">Days in Stage</span>
            </div>
          </div>

          {summary.longestWaitCase ? (
            <div className="mt-4 pt-3.5 border-t border-[#33425a] bg-[#18202c] rounded-xl p-3 border border-[#33425a]">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-100">{summary.longestWaitCase.fullName}</span>
                <span className="text-xs font-mono text-slate-400">{summary.longestWaitCase.trackingNumber}</span>
              </div>
              <div className="text-xs text-slate-300 mt-1 flex items-center justify-between">
                <span>{summary.longestWaitCase.collectionOffice.replace(' Passport Office', '')}</span>
                <button
                  onClick={() => onOpenTriageModal(summary.longestWaitCase!)}
                  className="text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1 cursor-pointer text-xs sm:text-sm"
                >
                  <span>Triage Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-400 mt-4">No overdue applications.</div>
          )}
        </div>

        {/* Metric 3: Backlog Breakdown by Passport Office */}
        <div className="bg-[#20293a] border border-[#33425a] rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-sm mb-2.5">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-slate-400" />
              Backlog by Passport Office
            </span>
            <span className="text-xs text-slate-400">At a glance</span>
          </div>

          <div className="space-y-3">
            {summary.officeBreakdown.map((item) => (
              <div key={item.office} className="space-y-1">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="font-medium text-slate-200 truncate max-w-[170px]">{item.office}</span>
                  <span className="font-bold text-slate-100">
                    {item.count} <span className="text-xs text-slate-400 font-normal">({item.percentage}%)</span>
                  </span>
                </div>
                <div className="w-full h-2 bg-[#18202c] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-[#20293a] border border-[#33425a] rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        {/* Category Filter Pills with larger fonts */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-colors cursor-pointer ${
              filterType === 'ALL'
                ? 'bg-[#2f5582] text-white shadow-xs border border-[#3c679a]'
                : 'bg-[#18202c] hover:bg-[#253247] text-slate-300 border border-[#33425a]'
            }`}
          >
            All Action Required ({summary.totalNeedingAttention})
          </button>
          <button
            onClick={() => setFilterType('REVERTED')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              filterType === 'REVERTED'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Reverted ({summary.revertedCount})
          </button>
          <button
            onClick={() => setFilterType('OVERDUE')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              filterType === 'OVERDUE'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30'
            }`}
          >
            <Clock className="w-4 h-4" />
            Overdue 14d+ ({summary.overdueCount})
          </button>
          <button
            onClick={() => setFilterType('INCOMPLETE')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              filterType === 'INCOMPLETE'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30'
            }`}
          >
            <FileText className="w-4 h-4" />
            Incomplete Intake ({summary.incompleteCount})
          </button>
          <button
            onClick={() => setFilterType('PAID_UNSUBMITTED')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              filterType === 'PAID_UNSUBMITTED'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Paid-Unsubmitted ({paidUnsubmittedCount})
          </button>
        </div>

        {/* Search & Office Dropdown */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search queue..."
              className="text-sm pl-9 pr-3 py-2 border border-[#33425a] rounded-xl bg-[#18202c] text-slate-100 placeholder-slate-400 w-44 sm:w-56 focus:outline-hidden focus:border-[#4d6b94]"
            />
          </div>

          <select
            value={officeFilter}
            onChange={(e) => setOfficeFilter(e.target.value)}
            className="text-sm px-3 py-2 border border-[#33425a] rounded-xl bg-[#18202c] text-slate-200 font-medium cursor-pointer"
          >
            <option value="ALL">All Stations</option>
            <option value="Lusaka">Lusaka Central</option>
            <option value="Ndola">Ndola Regional</option>
            <option value="Livingstone">Livingstone Regional</option>
          </select>
        </div>
      </div>

      {/* ACTION QUEUE LIST: SORTED MOST-OVERDUE FIRST WITH LARGE READABLE TEXT */}
      <div className="space-y-4">
        {filteredQueue.length === 0 ? (
          <div className="bg-[#20293a] border border-[#33425a] rounded-2xl p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <h4 className="text-base font-bold text-slate-100">Queue is Clear for this Filter</h4>
            <p className="text-sm text-slate-300 mt-1">
              No applications currently require attention matching your search and category filter.
            </p>
          </div>
        ) : (
          filteredQueue.map((item, index) => {
            const app = item.application;
            const days = app.daysInStatus || 0;
            const isReminderSent = quickReminderSentId === app.id;

            return (
              <div
                key={app.id}
                className="bg-[#20293a] border border-[#33425a] hover:border-[#4d6387] rounded-2xl p-5 shadow-sm transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left Column: Overdue badge, Name, NRC, Office */}
                  <div className="flex items-start gap-4">
                    {/* Rank & Days Pill */}
                    <div className="text-center shrink-0">
                      <div
                        className={`w-16 py-2.5 rounded-xl font-black text-center border ${
                          days >= 14
                            ? 'bg-red-600/90 text-white border-red-500 shadow-sm'
                            : days >= 8
                            ? 'bg-amber-600/90 text-white border-amber-500'
                            : 'bg-slate-700 text-white border-slate-600'
                        }`}
                      >
                        <div className="text-lg leading-tight font-extrabold">{days}d</div>
                        <div className="text-[10px] uppercase tracking-wider font-bold opacity-90">Wait</div>
                      </div>
                      <div className="text-xs text-slate-400 mt-1 font-mono">#{index + 1} in queue</div>
                    </div>

                    {/* Applicant Identity & Metadata */}
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="text-base sm:text-lg font-bold text-slate-100 hover:text-sky-300 cursor-pointer" onClick={() => onOpenTriageModal(app)}>
                          {app.fullName}
                        </span>

                        <span className="font-mono text-xs text-slate-300 bg-[#18202c] border border-[#33425a] px-2.5 py-0.5 rounded-md">
                          {app.trackingNumber}
                        </span>

                        {app.isUrgent && (
                          <span className="bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-bold px-2 py-0.5 rounded-md">
                            EXPRESS SPEED
                          </span>
                        )}

                        {/* Case Alert: Paid - Unsubmitted */}
                        {(app.status === 'Paid - Unsubmitted' || (app.feePaid && app.status === 'Draft')) && (
                          <span className="bg-amber-500/20 text-amber-300 border border-amber-400/40 text-xs font-bold px-2.5 py-0.5 rounded-md flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                            Alert: Paid - Unsubmitted
                          </span>
                        )}

                        {/* Category Badges */}
                        {item.isReverted && (
                          <span className="bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-bold px-2.5 py-0.5 rounded-md flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Alert: Reverted
                          </span>
                        )}

                        {item.isOverdue && (
                          <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold px-2.5 py-0.5 rounded-md flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            SLA Escalation (14d+)
                          </span>
                        )}

                        {item.isIncomplete && app.status !== 'Paid - Unsubmitted' && (
                          <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold px-2.5 py-0.5 rounded-md flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5" />
                            Alert: Incomplete Intake
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs sm:text-sm text-slate-300">
                        <span>NRC: <strong className="text-slate-100 font-mono">{app.nrcNumber}</strong></span>
                        <span>Station: <strong className="text-slate-100">{app.collectionOffice.replace(' Passport Office', '')}</strong></span>
                        <span>Passport: <strong className="text-slate-100">{app.passportType}</strong></span>
                        <span>Fee: <strong className={app.feePaid ? 'text-emerald-400' : 'text-red-400'}>{app.feePaid ? `Paid (ZMW ${app.feeAmount})` : 'Unpaid'}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Fast Action Buttons with readable size */}
                  <div className="flex items-center gap-2.5 self-start lg:self-center shrink-0">
                    <button
                      onClick={() => setPhoneSimApp(app)}
                      className="p-2.5 bg-[#18202c] hover:bg-[#253247] text-slate-300 rounded-xl transition-colors cursor-pointer border border-[#33425a]"
                      title="Inspect SMS on Citizen Handset"
                    >
                      <Smartphone className="w-4 h-4 text-slate-300" />
                    </button>

                    <button
                      onClick={() => handleQuickSendReminder(app)}
                      disabled={isReminderSent}
                      className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isReminderSent
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-[#18202c] hover:bg-[#253247] text-slate-200 border border-[#33425a]'
                      }`}
                      title="Send automated SMS reminder directly to applicant"
                    >
                      {isReminderSent ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Reminder Dispatched!</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 text-slate-300" />
                          <span>Send Reminder</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => onOpenTriageModal(app)}
                      className="px-4 py-2 bg-[#2f5582] hover:bg-[#25466e] text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 border border-[#3c679a]"
                    >
                      <Sparkles className="w-4 h-4 text-sky-300" />
                      <span>Triage Case</span>
                      <ChevronRight className="w-4 h-4 opacity-70" />
                    </button>
                  </div>
                </div>

                {/* ONE-LINE ACTION REASON CONTAINER */}
                <div className="mt-3.5 pt-3 border-t border-[#33425a]">
                  <div className="bg-[#18202c] border-l-4 border-amber-400 rounded-r-xl px-4 py-3 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 text-sm sm:text-base">
                      <span className="font-bold text-amber-300 shrink-0">Staff Attention Reason:</span>
                      <span className="text-slate-200 font-medium leading-relaxed">{item.primaryReason}</span>
                    </div>

                    <button
                      onClick={() => onOpenTriageModal(app)}
                      className="text-xs sm:text-sm text-sky-400 hover:text-sky-300 font-bold shrink-0 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Triage File</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Citizen Phone Handset Simulator Modal */}
      {phoneSimApp && (
        <CitizenPhoneSimulatorModal
          application={phoneSimApp}
          onClose={() => setPhoneSimApp(null)}
        />
      )}
    </div>
  );
};
