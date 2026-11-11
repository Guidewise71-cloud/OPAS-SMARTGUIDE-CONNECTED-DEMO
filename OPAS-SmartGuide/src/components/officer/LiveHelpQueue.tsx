import React, { useCallback, useEffect, useState } from 'react';
import { Headset, Send, CheckCircle2 } from 'lucide-react';

interface HandoverMessage { id: string; senderRole: 'applicant' | 'officer' | 'system'; senderName: string; content: string; createdAt: string; }
interface Handover {
  id: string; applicantName: string; applicationReference: string; question: string; status: 'WAITING' | 'ACTIVE' | 'CLOSED';
  officerName?: string; createdAt: string; transcript: Array<{ role: string; text: string }>; messages: HandoverMessage[];
}

const POLL_MS = 5000;

function waitedFor(createdAt: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(createdAt).getTime()) / 60000));
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

/** Officer side of the AI-to-human handover: applicants waiting for live help, oldest first. */
export const LiveHelpQueue: React.FC = () => {
  const [handovers, setHandovers] = useState<Handover[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/support/handovers', { headers: { Accept: 'application/json' } });
      if (!response.ok) { setError(response.status === 401 || response.status === 403 ? 'Sign in as an officer to see live help requests.' : `Could not load live help (${response.status}).`); return; }
      const data = await response.json();
      setHandovers(data.handovers || []); setError('');
    } catch { setError('Live help queue is offline.'); }
  }, []);

  useEffect(() => { void load(); const t = setInterval(() => { void load(); }, POLL_MS); return () => clearInterval(t); }, [load]);

  const selected = handovers.find((h) => h.id === selectedId) || null;

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || !reply.trim()) return;
    const response = await fetch(`/api/support/handovers/${selected.id}/messages`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: reply.trim() }),
    });
    if (response.ok) { setReply(''); void load(); } else setError('Reply not sent.');
  };

  const close = async () => {
    if (!selected) return;
    await fetch(`/api/support/handovers/${selected.id}/close`, { method: 'POST' });
    setSelectedId(null); void load();
  };

  const waiting = handovers.filter((h) => h.status === 'WAITING').length;

  return (
    <section className="mb-5 rounded-xl border border-[#33425a] bg-[#1a2333] p-4 text-slate-100">
      <div className="flex items-center justify-between mb-3">
        <h3 className="flex items-center gap-2 text-sm font-bold"><Headset className="w-4 h-4 text-sky-300" /> Live help requests from applicants</h3>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${waiting ? 'bg-amber-400 text-slate-950' : 'bg-slate-700 text-slate-200'}`}>{waiting} waiting</span>
      </div>
      {error && <p className="text-xs text-amber-300 mb-2">{error}</p>}
      {!handovers.length ? (
        <p className="text-xs text-slate-400">No applicant is waiting for an officer right now.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <ul className="space-y-1.5">
            {handovers.map((h) => (
              <li key={h.id}>
                <button type="button" onClick={() => setSelectedId(h.id)}
                  className={`w-full text-left rounded-lg px-3 py-2 text-xs border cursor-pointer ${selectedId === h.id ? 'border-sky-400 bg-[#22324a]' : 'border-[#33425a] hover:bg-[#22324a]'}`}>
                  <div className="flex justify-between gap-2">
                    <strong>{h.applicantName}</strong>
                    <span className={h.status === 'WAITING' ? 'text-amber-300' : 'text-emerald-300'}>{h.status === 'WAITING' ? `waiting ${waitedFor(h.createdAt)}` : `with ${h.officerName}`}</span>
                  </div>
                  <p className="text-slate-400 truncate">{h.applicationReference || 'No application linked'} · {h.question}</p>
                </button>
              </li>
            ))}
          </ul>
          {selected ? (
            <div className="rounded-lg border border-[#33425a] bg-[#111827] p-3 flex flex-col">
              <p className="text-xs text-slate-300 mb-2"><strong>{selected.applicantName}</strong> · {selected.applicationReference || 'no application'} </p>
              {selected.transcript.length > 0 && (
                <details className="mb-2 text-[11px] text-slate-400">
                  <summary className="cursor-pointer">AI assistant conversation before handover ({selected.transcript.length} messages)</summary>
                  <div className="mt-1 space-y-1 max-h-32 overflow-y-auto">
                    {selected.transcript.map((t, i) => <p key={i}><strong>{t.role === 'user' ? 'Applicant' : 'Assistant'}:</strong> {t.text}</p>)}
                  </div>
                </details>
              )}
              <div className="flex-1 max-h-56 overflow-y-auto space-y-1.5 mb-2">
                {selected.messages.map((m) => (
                  <p key={m.id} className={`text-xs ${m.senderRole === 'system' ? 'italic text-slate-500' : m.senderRole === 'officer' ? 'text-sky-200' : 'text-slate-100'}`}>
                    {m.senderRole !== 'system' && <strong>{m.senderName}: </strong>}{m.content}
                  </p>
                ))}
              </div>
              <form onSubmit={send} className="flex gap-2">
                <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply to the applicant..."
                  className="flex-1 text-xs px-3 py-2 rounded-lg bg-[#1f2937] border border-[#374151] text-slate-100" />
                <button type="submit" disabled={!reply.trim()} className="p-2 rounded-lg bg-sky-600 text-white disabled:opacity-40 cursor-pointer"><Send className="w-4 h-4" /></button>
                <button type="button" onClick={close} title="Mark resolved" className="p-2 rounded-lg bg-emerald-700 text-white cursor-pointer"><CheckCircle2 className="w-4 h-4" /></button>
              </form>
            </div>
          ) : (
            <p className="text-xs text-slate-400 self-center">Select a request to reply. The applicant sees your reply within a few seconds.</p>
          )}
        </div>
      )}
    </section>
  );
};
