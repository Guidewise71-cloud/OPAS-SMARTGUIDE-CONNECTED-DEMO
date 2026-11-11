import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Headset, Send, X, RefreshCw } from 'lucide-react';

interface HandoverMessage { id: string; senderRole: 'applicant' | 'officer' | 'system'; senderName: string; content: string; createdAt: string; }
interface Handover { id: string; status: 'WAITING' | 'ACTIVE' | 'CLOSED'; officerName?: string; applicationReference: string; messages: HandoverMessage[]; }

interface Props {
  /** Recent AI chat turns, passed to the officer so the applicant does not have to repeat themselves. */
  transcript: Array<{ role: string; text: string }>;
  applicationReference?: string;
}

const POLL_MS = 5000;

/** "Talk to an officer": hands the AI conversation to a live passport officer and shows replies in real time. */
export const LiveOfficerHandover: React.FC<Props> = ({ transcript, applicationReference }) => {
  const [handover, setHandover] = useState<Handover | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/support/handovers/mine', { headers: { Accept: 'application/json' } });
      if (!response.ok) return;
      const data = await response.json();
      setHandover(data.handover || null);
      if (data.handover) setOpen(true);
    } catch { /* offline: keep last state */ }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (!handover || handover.status === 'CLOSED') return;
    const timer = setInterval(() => { void refresh(); }, POLL_MS);
    return () => clearInterval(timer);
  }, [handover, refresh]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [handover?.messages.length]);

  const start = async () => {
    setBusy(true); setError('');
    try {
      const lastQuestion = [...transcript].reverse().find((m) => m.role === 'user')?.text;
      const response = await fetch('/api/support/handovers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ question: lastQuestion || 'I need help from an officer.', transcript, applicationReference }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.handover) throw new Error(data.error || 'Could not reach an officer.');
      setHandover(data.handover); setOpen(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not reach an officer.'); }
    finally { setBusy(false); }
  };

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!handover || !draft.trim()) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/support/handovers/${handover.id}/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ content: draft.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Message not sent.');
      setHandover(data.handover); setDraft('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Message not sent.'); }
    finally { setBusy(false); }
  };

  const close = async () => {
    if (!handover) return;
    await fetch(`/api/support/handovers/${handover.id}/close`, { method: 'POST' }).catch(() => undefined);
    setHandover(null); setOpen(false);
  };

  if (!open || !handover) {
    return (
      <div className="px-3 py-2 bg-white border-t border-slate-100 flex items-center justify-between gap-2">
        <span className="text-[11px] text-slate-500">Still stuck while correcting your application?</span>
        <button type="button" onClick={start} disabled={busy}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-blue-700 hover:bg-blue-800 text-white px-3 py-1.5 rounded-full disabled:opacity-50 cursor-pointer">
          {busy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Headset className="w-3.5 h-3.5" />}
          Talk to an officer
        </button>
        {error && <span role="alert" className="text-[11px] text-red-700">{error}</span>}
      </div>
    );
  }

  const statusText = handover.status === 'WAITING' ? 'Waiting for an officer...' : handover.status === 'ACTIVE' ? `Connected to ${handover.officerName || 'an officer'}` : 'Conversation closed';

  return (
    <div className="border-t-2 border-blue-600 bg-blue-50/60">
      <div className="px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
          <Headset className="w-4 h-4" />
          <span>Live officer help</span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${handover.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{statusText}</span>
        </div>
        <button type="button" onClick={close} title="End conversation" className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer"><X className="w-4 h-4" /></button>
      </div>
      <div className="max-h-48 overflow-y-auto px-3 space-y-1.5 pb-2" aria-live="polite">
        {handover.messages.map((m) => (
          <div key={m.id} className={`text-xs ${m.senderRole === 'applicant' ? 'text-right' : 'text-left'}`}>
            {m.senderRole === 'system' ? (
              <p className="text-[11px] italic text-slate-500">{m.content}</p>
            ) : (
              <span className={`inline-block rounded-xl px-3 py-1.5 ${m.senderRole === 'applicant' ? 'bg-blue-700 text-white' : 'bg-white border border-slate-200 text-slate-800'}`}>
                {m.senderRole === 'officer' && <strong className="block text-[10px] text-blue-800">{m.senderName}</strong>}
                {m.content}
              </span>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {handover.status !== 'CLOSED' && (
        <form onSubmit={send} className="px-3 pb-3 flex gap-2">
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Message the officer..."
            className="flex-1 text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white" />
          <button type="submit" disabled={busy || !draft.trim()} className="p-2 rounded-lg bg-blue-700 text-white disabled:opacity-40 cursor-pointer"><Send className="w-4 h-4" /></button>
        </form>
      )}
      {error && <p role="alert" className="px-3 pb-2 text-[11px] text-red-700">{error}</p>}
    </div>
  );
};
