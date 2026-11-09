import React, { useCallback, useEffect, useState } from 'react';
import { Bell, MessageSquare, RefreshCw, Send, CheckCircle2, AlertTriangle, Users } from 'lucide-react';

type Preview = { eligibleCount: number; sample: Array<{ applicantName: string; applicationReference: string; paymentReference: string; email: string }> };
type Batch = { id: string; createdAt: string; eligible: number; processed: number; inAppCreated: number; boardCreated: number; emailSent?: number; emailFailed?: number; emailSkipped?: number; emailTestMode?: boolean; duplicatesSkipped: number; status: string };
type EmailRecord = { id: string; applicationReference: string; recipientEmail: string; subject: string; status: string; deliveryState: string; failureReason?: string; createdAt: string };
type ProviderStatus = { email: boolean; emailTestMode: boolean; emailTestRecipientConfigured: boolean };

export const BulkNotificationManager: React.FC = () => {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [runs, setRuns] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [provider, setProvider] = useState<ProviderStatus>({ email: false, emailTestMode: false, emailTestRecipientConfigured: false });
  const [emailRecords, setEmailRecords] = useState<EmailRecord[]>([]);
  const [refreshingDelivery, setRefreshingDelivery] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [previewResponse, runsResponse, providerResponse, emailResponse] = await Promise.all([
        fetch('/api/notifications/bulk/preview', { credentials: 'include' }),
        fetch('/api/notifications/bulk/runs', { credentials: 'include' }),
        fetch('/api/notifications/providers/status', { credentials: 'include' }),
        fetch('/api/notifications/email/outbox', { credentials: 'include' }),
      ]);
      if (!previewResponse.ok || !runsResponse.ok || !providerResponse.ok || !emailResponse.ok) throw new Error('Could not load notification data. Sign in with an administrator account.');
      const [previewData, runsData, providerData, emailData] = await Promise.all([previewResponse.json(), runsResponse.json(), providerResponse.json(), emailResponse.json()]);
      setPreview(previewData); setRuns(runsData.runs || []); setProvider(providerData); setEmailRecords(emailData.records || []);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load notification data.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const runBulk = async () => {
    if (!window.confirm(`Create in-app and simulated OPAS Message Board notifications for ${preview?.eligibleCount || 0} eligible applicants?${provider.email ? (provider.emailTestMode ? '\n\nResend is in TEST RECIPIENT mode; emails go only to the configured test inbox.' : '\n\nWARNING: Resend is configured for LIVE applicant email addresses.') : '\n\nResend is not configured; no emails will be sent.'}`)) return;
    setRunning(true); setMessage(''); setError('');
    try {
      const response = await fetch('/api/notifications/bulk/run', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true, batchSize: 500 }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Bulk notification run failed.');
      setMessage(`Completed: ${data.batch.inAppCreated} in-app, ${data.batch.boardCreated} OPAS Message Board, ${data.batch.emailSent} email(s) accepted by Resend, ${data.batch.emailFailed} email failure(s), ${data.batch.emailSkipped} email(s) skipped. ${data.batch.emailTestMode ? 'TEST RECIPIENT MODE was active.' : ''} ${data.batch.duplicatesSkipped} duplicates skipped.`);
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Bulk notification run failed.'); }
    finally { setRunning(false); }
  };

  const refreshDelivery = async () => {
    setRefreshingDelivery(true); setError('');
    try {
      const response = await fetch('/api/notifications/email/refresh', { method: 'POST', credentials: 'include' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not refresh email delivery states.');
      setEmailRecords(data.records || []);
      setMessage(`Checked delivery events for ${data.refreshed} Resend email(s).`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to refresh email delivery.'); }
    finally { setRefreshingDelivery(false); }
  };

  return <div className="space-y-5">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div><h3 className="text-lg font-bold text-slate-900">Bulk Notification Management</h3><p className="text-xs text-slate-500 mt-1">Create applicant-specific alerts in SmartGuide and the simulated OPAS Message Board.</p></div>
      <button onClick={() => void refresh()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"><RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh preview</button>
    </div>
    {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{error}</div>}
    {message && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex gap-2"><CheckCircle2 className="w-4 h-4 shrink-0" />{message}</div>}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center gap-2 text-slate-500 text-xs"><Users className="w-4 h-4"/> Eligible applicants</div><div className="text-3xl font-bold text-slate-900 mt-2">{preview?.eligibleCount ?? '—'}</div><p className="text-[11px] text-slate-500 mt-1">Successful payment matched; application not submitted</p></div>
      <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4"><div className="flex items-center gap-2 text-blue-700 text-xs"><Bell className="w-4 h-4"/> In-app inbox</div><div className="text-2xl font-bold text-slate-900 mt-2">Ready</div><p className="text-[11px] text-slate-600 mt-1">Applicant-specific SmartGuide notifications</p></div>
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4"><div className="flex items-center gap-2 text-emerald-700 text-xs"><MessageSquare className="w-4 h-4"/> OPAS Message Board</div><div className="text-2xl font-bold text-slate-900 mt-2">Simulation</div><p className="text-[11px] text-slate-600 mt-1">Stored in the simulated OPAS message board inbox</p></div>
    </div>
    <div className={`rounded-xl border p-3 text-xs ${provider.email ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}><div className="font-bold">Resend email: {provider.email ? 'Configured' : 'Not configured'}</div><p className="mt-1">{provider.email ? (provider.emailTestMode ? 'Test mode is ON: every email is redirected to the configured test inbox.' : 'Live recipient mode is ON. Bulk email dispatch will use applicant email addresses.') : 'Add RESEND_API_KEY and NOTIFICATION_FROM_EMAIL to .env.local to enable email sending.'}</p></div>
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex gap-2 text-xs text-amber-900"><AlertTriangle className="w-4 h-4 shrink-0"/> In-app and OPAS Message Board messages are stored in this demo. Resend emails are real external messages when configured; the simulated OPAS is not the live government system.</div>
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between"><div><h4 className="text-sm font-bold text-slate-900">Eligible applicant preview</h4><p className="text-[11px] text-slate-500">Showing up to 10 matched records</p></div><span className="text-xs font-semibold text-slate-600">Batch size: 500</span></div>
      <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-3">Applicant</th><th className="p-3">Application reference</th><th className="p-3">Payment reference</th></tr></thead><tbody>{preview?.sample.map((row) => <tr key={row.applicationReference} className="border-t border-slate-100"><td className="p-3 font-medium text-slate-800">{row.applicantName}</td><td className="p-3 font-mono">{row.applicationReference}</td><td className="p-3 font-mono">{row.paymentReference}</td></tr>)}{preview && preview.sample.length === 0 && <tr><td colSpan={3} className="p-5 text-center text-slate-500">No eligible paid-but-not-submitted applicants found.</td></tr>}</tbody></table></div>
      <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><p className="text-[11px] text-slate-500">A personalised in-app and Message Board alert will be created. Email is also attempted when Resend is configured.</p><button onClick={() => void runBulk()} disabled={running || loading || !preview?.eligibleCount} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"><Send className="w-4 h-4"/>{running ? 'Creating notifications…' : `Create ${preview?.eligibleCount || 0} notifications`}</button></div>
    </div>
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><h4 className="text-sm font-bold text-slate-900">Email delivery history</h4><p className="text-[11px] text-slate-500">Provider acceptance and delivery events are tracked separately.</p></div><button onClick={() => void refreshDelivery()} disabled={!provider.email || refreshingDelivery} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">{refreshingDelivery ? 'Checking…' : 'Refresh delivery status'}</button></div>{emailRecords.length ? <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-2">Application</th><th className="p-2">Recipient</th><th className="p-2">Provider status</th><th className="p-2">Delivery event</th><th className="p-2">Created</th></tr></thead><tbody>{emailRecords.map((record) => <tr key={record.id} className="border-t border-slate-100"><td className="p-2 font-mono">{record.applicationReference}</td><td className="p-2">{record.recipientEmail}</td><td className="p-2">{record.status}{record.failureReason ? <p className="max-w-xs text-rose-600">{record.failureReason}</p> : null}</td><td className="p-2 capitalize">{record.deliveryState}</td><td className="p-2">{new Date(record.createdAt).toLocaleString()}</td></tr>)}</tbody></table></div> : <p className="text-xs text-slate-500">No email attempts recorded yet.</p>}</div>
    <div className="rounded-xl border border-slate-200 bg-white p-4"><h4 className="text-sm font-bold text-slate-900 mb-3">Recent bulk runs</h4>{runs.length ? <div className="space-y-2">{runs.map((run) => <div key={run.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-2 last:border-0"><div><p className="text-xs font-semibold text-slate-800">{run.id}</p><p className="text-[11px] text-slate-500">{new Date(run.createdAt).toLocaleString()} · {run.eligible} eligible applicants</p></div><p className="text-[11px] text-slate-600">{run.inAppCreated} in-app · {run.boardCreated} board · {run.emailSent || 0} email accepted · {run.emailFailed || 0} email failed · {run.duplicatesSkipped} duplicates skipped</p></div>)}</div> : <p className="text-xs text-slate-500">No bulk notification runs yet.</p>}</div>
  </div>;
};
