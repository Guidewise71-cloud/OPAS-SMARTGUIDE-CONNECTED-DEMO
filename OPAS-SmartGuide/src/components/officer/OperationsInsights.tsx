import React, { useEffect, useMemo, useState } from 'react';
import { Activity, BarChart3, Download, FileSpreadsheet, Users, Clock3, CheckCircle2, AlertTriangle, Timer, TrendingUp, BellRing, ClipboardCheck } from 'lucide-react';
import { PassportApplication } from '../../types/passport';
import { isApplicationSubmitted } from '../../utils/applicationStatus';

type Props = { applications: PassportApplication[] };
type EscalationRecord = { id: string; applicationId: string; trackingNumber: string; stage: string; officer: string; elapsedDays: number; targetDays: number; createdAt: string; status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED'; acknowledgedAt?: string; resolvedAt?: string; supervisorNote?: string; notified: boolean };

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
}

const DEFAULT_SLA_TARGETS: Record<string, number> = {
  'Submitted - Under Review': 2,
  'Biometrics Scheduled': 3,
  'Processing & Printing': 5,
  'Ready for Collection': 2,
};

function workingDaysBetween(start: Date, end: Date): number {
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) return 0;
  let count = 0;
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const finish = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (cursor < finish) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

export const OperationsInsights: React.FC<Props> = ({ applications }) => {
  const [view, setView] = useState<'reports' | 'officers'>('reports');
  const [slaTargets, setSlaTargets] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('opas-smartguide-sla-targets');
      return saved ? { ...DEFAULT_SLA_TARGETS, ...JSON.parse(saved) } : DEFAULT_SLA_TARGETS;
    } catch { return DEFAULT_SLA_TARGETS; }
  });
  const [showSlaSettings, setShowSlaSettings] = useState(false);
  const [escalations, setEscalations] = useState<EscalationRecord[]>(() => {
    try { return JSON.parse(localStorage.getItem('opas-smartguide-supervisor-escalations') || '[]'); } catch { return []; }
  });
  const [supervisorNotes, setSupervisorNotes] = useState<Record<string, string>>({});
  const [escalationFilter, setEscalationFilter] = useState<'OPEN' | 'ALL'>('OPEN');
  useEffect(() => {
    try { localStorage.setItem('opas-smartguide-supervisor-escalations', JSON.stringify(escalations)); } catch { /* storage may be unavailable */ }
  }, [escalations]);
  useEffect(() => {
    try { localStorage.setItem('opas-smartguide-sla-targets', JSON.stringify(slaTargets)); } catch { /* browser storage may be unavailable */ }
  }, [slaTargets]);
  const metrics = useMemo(() => {
    const total = applications.length;
    const paid = applications.filter((a) => a.feePaid).length;
    const paidUnsubmitted = applications.filter((a) => a.feePaid && !isApplicationSubmitted(a)).length;
    const submitted = applications.filter(isApplicationSubmitted).length;
    const reverted = applications.filter((a) => a.status === 'Reverted').length;
    const completed = applications.filter((a) => a.status === 'Completed').length;
    const pending = applications.filter((a) => !['Completed'].includes(a.status)).length;
    const notices = applications.reduce((sum, a) => sum + a.notifications.length, 0);
    const read = applications.reduce((sum, a) => sum + a.notifications.filter((n) => n.deliveryStatus === 'Read' || n.deliveryStatus === 'Action Taken').length, 0);
    return { total, paid, paidUnsubmitted, submitted, reverted, completed, pending, notices, read };
  }, [applications]);

  const officerRows = useMemo(() => {
    const map = new Map<string, { assigned: number; completed: number; pending: number; reverted: number; apps: PassportApplication[] }>();
    applications.forEach((app) => {
      const name = app.assignedOfficer?.trim() || 'Unassigned';
      const item = map.get(name) || { assigned: 0, completed: 0, pending: 0, reverted: 0, apps: [] };
      item.assigned += 1;
      item.completed += app.status === 'Completed' ? 1 : 0;
      item.pending += app.status === 'Completed' ? 0 : 1;
      item.reverted += app.status === 'Reverted' ? 1 : 0;
      item.apps.push(app); map.set(name, item);
    });
    return [...map.entries()].map(([name, stats]) => ({ name, ...stats }));
  }, [applications]);

  const lifecycleAnalytics = useMemo(() => {
    const now = Date.now();
    const stageName = (app: PassportApplication) => {
      if (app.status === 'Draft') return 'Application draft';
      if (app.status === 'Paid - Unsubmitted') return 'Paid · awaiting submission';
      if (app.status === 'Submitted - Under Review') return 'Officer review';
      if (app.status === 'Reverted') return 'Applicant corrections';
      if (app.status === 'Biometrics Scheduled') return 'Biometrics';
      if (app.status === 'Processing & Printing') return 'Processing & printing';
      if (app.status === 'Ready for Collection') return 'Ready for collection';
      if (app.status === 'Completed') return 'Completed';
      return String(app.status);
    };
    const records = applications.map((app) => {
      const events = [...(app.lifecycleEvents || [])].filter((event) => Number.isFinite(Date.parse(event.timestamp))).sort((a,b) => Date.parse(a.timestamp)-Date.parse(b.timestamp));
      const latest = events.at(-1)?.timestamp || app.lastUpdated;
      const parsed = latest ? Date.parse(latest) : NaN;
      const ageDays = Number.isFinite(parsed) ? Math.max(0, (now - parsed) / 86400000) : null;
      return { app, stage: stageName(app), ageDays, eventCount: events.length };
    });
    const stageMap = new Map<string, { count: number; totalDays: number; timed: number; oldestDays: number }>();
    records.forEach((record) => {
      const current = stageMap.get(record.stage) || { count: 0, totalDays: 0, timed: 0, oldestDays: 0 };
      current.count += 1;
      if (record.ageDays !== null) { current.totalDays += record.ageDays; current.timed += 1; current.oldestDays = Math.max(current.oldestDays, record.ageDays); }
      stageMap.set(record.stage, current);
    });
    const stages = [...stageMap.entries()].map(([stage, data]) => ({ stage, ...data, averageDays: data.timed ? data.totalDays / data.timed : null })).sort((a,b) => (b.averageDays ?? -1) - (a.averageDays ?? -1));
    const longest = records.filter((r) => r.ageDays !== null && r.app.status !== 'Completed').sort((a,b) => (b.ageDays || 0)-(a.ageDays || 0)).slice(0,8);
    return { stages, longest, eventTotal: records.reduce((sum, r) => sum + r.eventCount, 0), timestamped: records.filter((r) => r.ageDays !== null).length };
  }, [applications]);

  const slaAnalysis = useMemo(() => {
    const now = new Date();
    const rows = applications.map((app) => {
      const paused = app.status === 'Reverted';
      const events = [...(app.lifecycleEvents || [])].filter((event) => Number.isFinite(Date.parse(event.timestamp))).sort((a,b) => Date.parse(a.timestamp)-Date.parse(b.timestamp));
      const stageStart = app.status === 'Submitted - Under Review' ? (app.firstReviewedAt || app.assignedAt || events.at(-1)?.timestamp || app.lastUpdated) : (events.at(-1)?.timestamp || app.lastUpdated);
      const start = stageStart ? new Date(stageStart) : null;
      const elapsed = start && Number.isFinite(start.getTime()) ? workingDaysBetween(start, now) : null;
      const target = slaTargets[String(app.status)];
      const monitored = target !== undefined && !paused && app.status !== 'Completed';
      const overdue = monitored && elapsed !== null && elapsed > target;
      return { app, elapsed, target, monitored, overdue, paused, stageStart };
    });
    return {
      rows,
      monitored: rows.filter((r) => r.monitored && r.elapsed !== null).length,
      overdue: rows.filter((r) => r.overdue),
      paused: rows.filter((r) => r.paused && r.app.status !== 'Completed').length,
      missing: rows.filter((r) => r.monitored && r.elapsed === null).length,
    };
  }, [applications, slaTargets]);

  // Idempotently create one escalation per application/stage-start breach.
  useEffect(() => {
    const overdueRecords = slaAnalysis.overdue;
    if (!overdueRecords.length) return;
    setEscalations((current) => {
      const known = new Set(current.map((item) => item.id));
      const additions: EscalationRecord[] = overdueRecords.flatMap(({ app, elapsed, target, stageStart }) => {
        const id = `${app.id}:${app.status}:${stageStart || 'unknown'}`;
        if (known.has(id)) return [];
        return [{ id, applicationId: app.id, trackingNumber: app.trackingNumber, stage: String(app.status), officer: app.assignedOfficer || 'Unassigned', elapsedDays: elapsed || 0, targetDays: target || 0, createdAt: new Date().toISOString(), status: 'OPEN' as const, notified: true }];
      });
      return additions.length ? [...additions, ...current] : current;
    });
  }, [slaAnalysis]);

  const updateEscalation = (id: string, status: EscalationRecord['status']) => {
    const note = supervisorNotes[id]?.trim();
    setEscalations((current) => current.map((item) => item.id !== id ? item : ({ ...item, status, supervisorNote: note || item.supervisorNote, ...(status === 'ACKNOWLEDGED' ? { acknowledgedAt: new Date().toISOString() } : {}), ...(status === 'RESOLVED' ? { resolvedAt: new Date().toISOString() } : {}) })));
  };

  const reportRows = [
    ['Metric', 'Count'], ['Applications received', String(metrics.total)], ['Payments recorded', String(metrics.paid)],
    ['Paid but not submitted', String(metrics.paidUnsubmitted)], ['Submitted', String(metrics.submitted)],
    ['Reverted', String(metrics.reverted)], ['Completed', String(metrics.completed)],
    ['Pending (not completed)', String(metrics.pending)], ['Notifications created', String(metrics.notices)],
    ['Notifications read/actioned', String(metrics.read)],
    ['Lifecycle events recorded', String(lifecycleAnalytics.eventTotal)],
    ['Cases exceeding configured working-day targets', String(slaAnalysis.overdue.length)],
    ['Supervisor escalations open', String(escalations.filter((e) => e.status === 'OPEN').length)],
    ['Supervisor escalations acknowledged', String(escalations.filter((e) => e.status === 'ACKNOWLEDGED').length)],
    ['Supervisor escalations resolved', String(escalations.filter((e) => e.status === 'RESOLVED').length)],
    ['Cases paused for applicant action', String(slaAnalysis.paused)],
    ...slaAnalysis.overdue.map((r) => [`SLA alert: ${r.app.trackingNumber}`, `${r.app.status}; ${r.elapsed} working days against ${r.target}-day target; officer ${r.app.assignedOfficer || 'unassigned'}`]),
    ['Applications with usable stage timestamps', String(lifecycleAnalytics.timestamped)],
    ...lifecycleAnalytics.stages.map((stage) => [`Stage: ${stage.stage}`, `${stage.count} cases; average ${stage.averageDays === null ? 'unavailable' : stage.averageDays.toFixed(1) + ' days'}`]),
  ];

  return <section className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-xl font-extrabold text-slate-100">Operational Intelligence</h2><p className="text-sm text-slate-400">Live summaries calculated from the application records currently available to this prototype.</p></div>
      <div className="flex gap-2">
        <button onClick={() => setView('reports')} className={`px-4 py-2 rounded-lg text-sm font-bold ${view === 'reports' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-200'}`}><BarChart3 className="inline w-4 h-4 mr-2"/>Auto Reports</button>
        <button onClick={() => setView('officers')} className={`px-4 py-2 rounded-lg text-sm font-bold ${view === 'officers' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-200'}`}><Users className="inline w-4 h-4 mr-2"/>Officer Workload</button>
      </div>
    </div>
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      {[['Applications received', metrics.total, Activity], ['Paid but not submitted', metrics.paidUnsubmitted, AlertTriangle], ['Submitted', metrics.submitted, CheckCircle2], ['Reverted', metrics.reverted, Clock3]].map(([label, value, Icon]: any) => <div key={label} className="rounded-xl border border-slate-700 bg-[#20293a] p-4"><Icon className="w-5 h-5 text-sky-400 mb-2"/><p className="text-xs text-slate-400">{label}</p><p className="text-2xl font-black text-white">{value}</p></div>)}
    </div>
    {view === 'reports' ? <div className="rounded-xl border border-slate-700 bg-[#20293a] p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-bold text-white">Automated operational report</h3><p className="text-xs text-slate-400">Generated from current records · {new Date().toLocaleString()}</p></div><button onClick={() => downloadCsv(`opas-smartguide-report-${new Date().toISOString().slice(0,10)}.csv`, reportRows)} className="px-3 py-2 rounded-lg bg-emerald-700 text-white text-sm font-bold"><Download className="inline w-4 h-4 mr-2"/>Export CSV</button></div>
      <div className="grid md:grid-cols-2 gap-3">{[['Payment completion', `${metrics.paid} payments recorded`, `${metrics.paidUnsubmitted} still require application submission`], ['Application processing', `${metrics.submitted} submitted`, `${metrics.pending} not yet completed`], ['Reversion monitoring', `${metrics.reverted} reverted`, 'Review correction reasons and resubmission progress'], ['Notification engagement', `${metrics.read} read/actioned`, `${Math.max(0, metrics.notices - metrics.read)} not yet read/actioned`]].map(([title, value, note]) => <div key={title} className="rounded-lg bg-slate-800 p-3"><p className="text-xs text-slate-400">{title}</p><p className="text-lg font-bold text-white">{value}</p><p className="text-xs text-slate-400 mt-1">{note}</p></div>)}</div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-lg bg-slate-800 p-4 space-y-3">
          <div className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-sky-400"/><h4 className="font-bold text-white">Stage bottleneck analysis</h4></div>
          <p className="text-xs text-slate-400">Cases grouped by current workflow stage. Average age uses the latest lifecycle event, falling back to the record's last-updated timestamp.</p>
          {lifecycleAnalytics.stages.length === 0 ? <p className="text-sm text-slate-400">No stage data available.</p> : lifecycleAnalytics.stages.map((stage) => <div key={stage.stage} className="space-y-1"><div className="flex justify-between gap-3 text-sm"><span className="text-slate-200">{stage.stage}</span><span className="text-white font-bold">{stage.count} cases</span></div><div className="h-2 rounded-full bg-slate-700 overflow-hidden"><div className="h-full bg-sky-500" style={{ width: `${Math.max(2, stage.count / Math.max(1, applications.length) * 100)}%` }}/></div><p className="text-[11px] text-slate-400">{stage.averageDays === null ? 'Timing unavailable' : `Average time since last recorded activity: ${stage.averageDays.toFixed(1)} days`} · oldest {stage.timed ? `${stage.oldestDays.toFixed(1)} days` : 'unknown'}</p></div>)}
        </div>
        <div className="rounded-lg bg-slate-800 p-4 space-y-3">
          <div className="flex items-center gap-2"><Timer className="w-5 h-5 text-amber-400"/><h4 className="font-bold text-white">Longest waiting applications</h4></div>
          <p className="text-xs text-slate-400">Prioritisation aid based on elapsed time since last recorded activity; not an officer performance ranking.</p>
          {lifecycleAnalytics.longest.length === 0 ? <p className="text-sm text-slate-400">No reliable timestamps available.</p> : <div className="overflow-x-auto"><table className="w-full text-xs"><thead className="text-slate-400"><tr><th className="text-left py-2">Application</th><th className="text-left">Stage</th><th className="text-right">Days</th></tr></thead><tbody>{lifecycleAnalytics.longest.map(({app,stage,ageDays}) => <tr key={app.id} className="border-t border-slate-700 text-slate-200"><td className="py-2 pr-2">{app.trackingNumber}</td><td className="pr-2">{stage}</td><td className="text-right font-bold">{ageDays!.toFixed(1)}</td></tr>)}</tbody></table></div>}
        </div>
      </div>
      <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h4 className="font-bold text-white">Processing targets & supervisor alerts</h4><p className="text-xs text-slate-400">Working-day thresholds are configurable demonstration defaults, not approved government service standards.</p></div><button onClick={() => setShowSlaSettings((v) => !v)} className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-bold text-white">{showSlaSettings ? 'Hide target settings' : 'Configure targets'}</button></div>
        {showSlaSettings && <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">{Object.entries(slaTargets).map(([stage, days]) => <label key={stage} className="text-xs text-slate-300">{stage}<div className="mt-1 flex items-center gap-2"><input type="number" min="1" max="90" value={days} onChange={(e) => setSlaTargets((current) => ({ ...current, [stage]: Math.max(1, Math.min(90, Number(e.target.value) || 1)) }))} className="w-20 rounded bg-slate-900 border border-slate-600 px-2 py-2 text-white"/><span>working days</span></div></label>)}<button onClick={() => setSlaTargets(DEFAULT_SLA_TARGETS)} className="self-end rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-200">Reset demo defaults</button></div>}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[['Monitored cases', slaAnalysis.monitored], ['Target exceeded', slaAnalysis.overdue.length], ['Open escalations', escalations.filter((e) => e.status === 'OPEN').length], ['Paused for applicant', slaAnalysis.paused], ['Missing timestamps', slaAnalysis.missing]].map(([label, value]) => <div key={label} className="rounded-lg bg-slate-900 p-3"><p className="text-[11px] text-slate-400">{label}</p><p className="text-xl font-black text-white">{value}</p></div>)}</div>
        <div className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><h5 className="text-sm font-bold text-white"><BellRing className="inline w-4 h-4 mr-2 text-amber-300"/>Supervisor escalation workflow</h5><div className="flex gap-2"><button onClick={() => setEscalationFilter('OPEN')} className={`rounded px-3 py-1 text-xs ${escalationFilter === 'OPEN' ? 'bg-amber-700 text-white' : 'bg-slate-700 text-slate-300'}`}>Open / acknowledged</button><button onClick={() => setEscalationFilter('ALL')} className={`rounded px-3 py-1 text-xs ${escalationFilter === 'ALL' ? 'bg-blue-700 text-white' : 'bg-slate-700 text-slate-300'}`}>All history</button></div></div><p className="text-xs text-slate-400">A supervisor alert is created once per application and stage-start breach. In this prototype, the alert is recorded in this browser and appears in this queue; it is not an email/SMS or an official OPAS notification.</p>{(escalationFilter === 'ALL' ? escalations : escalations.filter((e) => e.status !== 'RESOLVED')).length === 0 ? <p className="rounded-lg bg-slate-900 p-3 text-sm text-emerald-300">No open supervisor escalations. New breaches will be added automatically when reliable timestamps show a target has been exceeded.</p> : <div className="space-y-3">{(escalationFilter === 'ALL' ? escalations : escalations.filter((e) => e.status !== 'RESOLVED')).map((item) => <div key={item.id} className="rounded-lg border border-slate-700 bg-slate-900 p-3 space-y-2"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-bold text-white">{item.trackingNumber}</p><p className="text-xs text-slate-400">{item.stage} · {item.officer}</p></div><span className={`rounded-full px-2 py-1 text-[11px] font-bold ${item.status === 'OPEN' ? 'bg-amber-900 text-amber-200' : item.status === 'ACKNOWLEDGED' ? 'bg-blue-900 text-blue-200' : 'bg-emerald-900 text-emerald-200'}`}>{item.status}</span></div><p className="text-sm text-amber-300">{item.elapsedDays} / {item.targetDays} working days · {Math.max(0, item.elapsedDays - item.targetDays)} days beyond target</p><p className="text-[11px] text-slate-500">Created {new Date(item.createdAt).toLocaleString()}{item.acknowledgedAt ? ` · Acknowledged ${new Date(item.acknowledgedAt).toLocaleString()}` : ''}{item.resolvedAt ? ` · Resolved ${new Date(item.resolvedAt).toLocaleString()}` : ''}</p>{item.supervisorNote && <p className="rounded bg-slate-800 p-2 text-xs text-slate-300">Supervisor note: {item.supervisorNote}</p>}{item.status !== 'RESOLVED' && <><textarea value={supervisorNotes[item.id] ?? item.supervisorNote ?? ''} onChange={(e) => setSupervisorNotes((current) => ({ ...current, [item.id]: e.target.value }))} rows={2} placeholder="Add supervisor review note or action taken..." className="w-full rounded border border-slate-700 bg-slate-800 p-2 text-xs text-white placeholder:text-slate-500"/><div className="flex flex-wrap gap-2">{item.status === 'OPEN' && <button onClick={() => updateEscalation(item.id, 'ACKNOWLEDGED')} className="rounded bg-blue-700 px-3 py-2 text-xs font-bold text-white"><ClipboardCheck className="inline w-3 h-3 mr-1"/>Acknowledge</button>}<button onClick={() => updateEscalation(item.id, 'RESOLVED')} className="rounded bg-emerald-700 px-3 py-2 text-xs font-bold text-white">Mark resolved</button></div></>}</div>)}</div>}</div>
        <p className="text-[11px] text-slate-400">Clock rules: weekends are excluded; public holidays are not yet excluded. Reverted cases and records waiting for applicant action are paused and excluded from officer-stage breach counts. Stage timing uses available assignment/review/lifecycle timestamps; missing dates are not guessed. Alerts are advisory and require supervisor review.</p>
      </div>
      <div className="rounded-lg bg-slate-800 p-3 text-xs text-slate-400"><Clock3 className="inline w-4 h-4 mr-2"/>Recorded lifecycle events: {lifecycleAnalytics.eventTotal}. Applications with usable timestamps: {lifecycleAnalytics.timestamped} of {applications.length}. Time in stage is an elapsed-time proxy, not verified active handling time. Applicant waiting periods must be separated before SLA or officer performance conclusions are made.</div>
      <p className="text-xs text-amber-300">Prototype limitation: reports reflect the local demonstration dataset, not official Ministry statistics. Scheduled PDF/Excel delivery can be added when reporting policy and recipients are approved.</p>
    </div> : <div className="rounded-xl border border-slate-700 bg-[#20293a] p-4 space-y-4">
      <div><h3 className="font-bold text-white">Officer case workload</h3><p className="text-xs text-slate-400">Uses recorded officer assignments where available. It does not infer officer identities or attribute unassigned cases.</p></div>
      {officerRows.length === 0 ? <p className="text-sm text-slate-400">No application records are available.</p> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-slate-400 border-b border-slate-700"><tr><th className="text-left py-2">Officer / assignment</th><th className="text-right">Assigned</th><th className="text-right">Completed</th><th className="text-right">Pending</th><th className="text-right">Reverted</th></tr></thead><tbody>{officerRows.map((row) => <tr key={row.name} className="border-b border-slate-800 text-slate-200"><td className="py-3 font-semibold">{row.name}</td><td className="text-right">{row.assigned}</td><td className="text-right">{row.completed}</td><td className="text-right">{row.pending}</td><td className="text-right">{row.reverted}</td></tr>)}</tbody></table></div>}
      <div className="rounded-lg bg-slate-800 p-3 text-xs text-slate-400"><FileSpreadsheet className="inline w-4 h-4 mr-2"/>Officer-level processing time and SLA performance require reliable assignment, action timestamps and pause periods (for applicant waiting time). This prototype reports workload only where assignment data exists.</div>
      <button onClick={() => downloadCsv('opas-officer-workload.csv', [['Officer','Assigned','Completed','Pending','Reverted'], ...officerRows.map((r) => [r.name,String(r.assigned),String(r.completed),String(r.pending),String(r.reverted)])])} className="px-3 py-2 rounded-lg bg-emerald-700 text-white text-sm font-bold"><Download className="inline w-4 h-4 mr-2"/>Export workload CSV</button>
    </div>}
  </section>;
};
