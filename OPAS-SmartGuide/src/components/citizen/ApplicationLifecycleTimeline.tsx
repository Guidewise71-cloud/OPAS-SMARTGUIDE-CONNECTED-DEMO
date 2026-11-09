import React, { useMemo } from 'react';
import { Activity, CheckCircle2, Circle, Clock3, CreditCard, FileCheck2, RotateCcw, UserCheck, Bell } from 'lucide-react';
import { PassportApplication } from '../../types/passport';

type TimelineEvent = { id: string; title: string; detail: string; at?: string; icon: React.ElementType; tone: 'done' | 'current' | 'pending' | 'warning' };

const FLOW = [
  'Application created',
  'Payment confirmed',
  'Application submitted',
  'Officer review',
  'Biometrics / processing',
  'Ready for collection',
  'Completed',
];

function stageIndex(app: PassportApplication): number {
  if (app.status === 'Draft') return 0;
  if (app.status === 'Paid - Unsubmitted') return 1;
  if (app.status === 'Submitted - Under Review') return 3;
  if (app.status === 'Reverted') return 3;
  if (app.status === 'Biometrics Scheduled' || app.status === 'Processing & Printing') return 4;
  if (app.status === 'Ready for Collection') return 5;
  if (app.status === 'Completed') return 6;
  return 0;
}

function formatDate(value?: string): string {
  if (!value) return 'Date not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date not recorded' : date.toLocaleString();
}

export const ApplicationLifecycleTimeline: React.FC<{ application: PassportApplication }> = ({ application }) => {
  const currentStage = stageIndex(application);
  const events = useMemo<TimelineEvent[]>(() => {
    const rows: TimelineEvent[] = (application.lifecycleEvents || []).map((event) => ({ id: event.id, title: event.title, detail: `${event.description}${event.actorName ? ` · Recorded by ${event.actorName}` : ''}`, at: event.timestamp, icon: Activity, tone: event.type === 'REVERTED' ? 'warning' : 'done' }));
    if (application.feePaid) rows.push({ id: 'payment', title: 'Payment confirmed', detail: application.paymentReference ? `Payment reference: ${application.paymentReference}` : 'The application record indicates payment has been made.', at: application.paidAt, icon: CreditCard, tone: 'done' });
    if (application.assignedOfficer) rows.push({ id: 'assigned', title: 'Assigned to passport officer', detail: `Assigned officer: ${application.assignedOfficer}`, at: application.assignedAt, icon: UserCheck, tone: 'done' });
    if (application.firstReviewedAt) rows.push({ id: 'review', title: 'Officer review started', detail: 'A first review timestamp is recorded for this case.', at: application.firstReviewedAt, icon: FileCheck2, tone: 'done' });
    if (application.status === 'Reverted' || application.revertedAt) rows.push({ id: 'reverted', title: 'Returned for applicant correction', detail: application.reversionReason || 'The application record indicates that corrections are required.', at: application.revertedAt, icon: RotateCcw, tone: 'warning' });
    if (application.waitingForApplicantSince) rows.push({ id: 'waiting', title: 'Waiting for applicant', detail: 'The case is waiting for information or corrections from the applicant.', at: application.waitingForApplicantSince, icon: Clock3, tone: 'current' });
    if (application.lastOfficerActionAt) rows.push({ id: 'officer-action', title: 'Latest officer action', detail: 'An officer action timestamp is recorded.', at: application.lastOfficerActionAt, icon: Activity, tone: 'done' });
    (application.notifications || []).forEach((notification) => rows.push({ id: `notification-${notification.id}`, title: 'Applicant notification', detail: `${notification.channel}: ${notification.deliveryStatus}${notification.subject ? ` — ${notification.subject}` : ''}`, at: notification.timestamp, icon: Bell, tone: notification.deliveryStatus === 'Failed' ? 'warning' : 'done' }));
    rows.sort((a, b) => (a.at ? new Date(a.at).getTime() : 0) - (b.at ? new Date(b.at).getTime() : 0));
    return rows;
  }, [application]);

  return (
    <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4" aria-label="Application lifecycle timeline">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h4 className="font-bold text-slate-900">Application journey</h4>
          <p className="mt-1 text-xs text-slate-500">Track the recorded progress of this application.</p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">{application.status}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {FLOW.map((label, index) => {
          const done = index < currentStage || (index === 1 && application.feePaid) || (index === 3 && ['Submitted - Under Review', 'Reverted', 'Biometrics Scheduled', 'Processing & Printing', 'Ready for Collection', 'Completed'].includes(application.status));
          const active = index === currentStage;
          return <div key={label} className={`rounded-lg border p-2 ${done ? 'border-emerald-200 bg-emerald-50' : active ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}>
            {done ? <CheckCircle2 className="mb-1 h-4 w-4 text-emerald-600" /> : active ? <Clock3 className="mb-1 h-4 w-4 text-blue-600" /> : <Circle className="mb-1 h-4 w-4 text-slate-400" />}
            <p className="text-[11px] font-semibold leading-snug text-slate-700">{label}</p>
          </div>;
        })}
      </div>
      {application.status === 'Reverted' && <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><strong>Applicant action required:</strong> {application.reversionReason || 'Review the officer comments and provide the requested corrections.'}</div>}
      <div className="mt-5">
        <h5 className="mb-3 text-sm font-semibold text-slate-800">Recorded activity</h5>
        {events.length === 0 ? <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">No detailed activity timestamps have been recorded for this application yet. As actions occur, their recorded dates will appear here.</p> : <ol className="space-y-3">
          {events.map((event) => {
            const Icon = event.icon;
            return <li key={event.id} className="flex gap-3">
              <div className={`mt-0.5 rounded-full p-2 ${event.tone === 'warning' ? 'bg-amber-100 text-amber-700' : event.tone === 'current' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}><Icon className="h-4 w-4" /></div>
              <div className="min-w-0 flex-1 border-b border-slate-100 pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold text-slate-800">{event.title}</p><time className="text-[11px] text-slate-500">{formatDate(event.at)}</time></div>
                <p className="mt-1 text-xs text-slate-600">{event.detail}</p>
              </div>
            </li>;
          })}
        </ol>}
      </div>
      <p className="mt-3 text-[11px] text-slate-400">This timeline uses timestamps and events available in the prototype record. Missing historical timestamps are not estimated. Official OPAS history requires an authorised OPAS event feed.</p>
    </section>
  );
};
