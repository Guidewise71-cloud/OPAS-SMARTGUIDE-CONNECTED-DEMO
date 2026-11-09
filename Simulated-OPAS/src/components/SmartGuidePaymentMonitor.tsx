import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Bot, CheckCircle2, RefreshCw, Send, ShieldCheck, Bell } from 'lucide-react';
import { fetchSmartGuideDetections, SmartGuidePaymentDetection } from '../services/opasPaymentApi';

export const SmartGuidePaymentMonitor: React.FC = () => {
  const [detections, setDetections] = useState<SmartGuidePaymentDetection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{role: 'assistant' | 'user'; text: string}>>([
    {role: 'assistant', text: 'Ask me about the simulated OPAS payment and application records.'},
  ]);

  const askSmartGuide = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = question.trim();
    if (!message || asking) return;

    setQuestion('');
    setAsking(true);
    setChatMessages(current => [...current, {role: 'user', text: message}]);
    try {
      const response = await fetch('/api/smartguide/ask', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({message}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'SmartGuide could not answer right now.');
      setChatMessages(current => [...current, {role: 'assistant', text: data.answer}]);
    } catch (err) {
      setChatMessages(current => [...current, {
        role: 'assistant',
        text: err instanceof Error ? err.message : 'SmartGuide could not answer right now.',
      }]);
    } finally {
      setAsking(false);
    }
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const records = await fetchSmartGuideDetections();
      setDetections(records);
    } catch (err: any) {
      setError(err?.message || 'Could not connect to the simulated OPAS API.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(); }, 450);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  return (
    <section className="bg-white border border-violet-200 rounded-xl shadow-sm overflow-hidden">
      <div className="bg-slate-950 text-white px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-violet-500/15 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-violet-300" />
          </div>
          <div>
            <h2 className="font-bold text-sm">OPAS SmartGuide · Payment Detection</h2>
            <p className="text-[11px] text-slate-400">Retrieving payment confirmations and matching application status through simulated APIs</p>
          </div>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={loading}
          className="px-3 py-2 rounded-md bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white text-xs font-bold flex items-center justify-center gap-2">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh detection
        </button>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
            <p className="text-[11px] text-slate-500">Detection source</p>
            <p className="text-xs font-bold text-slate-900 mt-1">OPAS Payment API + Application Status API</p>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
            <p className="text-[11px] text-slate-500">Matched payment records</p>
            <p className="text-xl font-black text-slate-900 mt-1">{detections.length}</p>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
            <p className="text-[11px] text-slate-500">Monitoring status</p>
            <p className="text-xs font-bold text-emerald-700 mt-2 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> API check enabled</p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-900">
            {error} Ensure the Vite development server is running and refresh.
          </div>
        )}

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-500">Checking payment and application records…</div>
        ) : detections.length === 0 ? (
          <div className="py-7 text-center border border-dashed border-slate-300 rounded-lg">
            <CheckCircle2 className="w-7 h-7 text-emerald-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-800">No paid-but-not-submitted cases detected</p>
            <p className="text-xs text-slate-500 mt-1">SmartGuide did not find a successful payment matched to an outstanding application.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
              <AlertTriangle className="w-4 h-4" />
              {detections.length} application{detections.length === 1 ? '' : 's'} require applicant action
            </div>
            {detections.map(item => (
              <article key={`${item.applicationReference}-${item.transactionReference}`} className="border border-amber-200 bg-amber-50/60 rounded-lg p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{item.applicantName}</p>
                    <p className="text-[11px] font-mono text-slate-600 mt-1">{item.applicationReference}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-1 text-[10px] font-bold">
                    <AlertTriangle className="w-3 h-3" /> PAID · NOT SUBMITTED
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-xs">
                  <p className="text-slate-600">Transaction: <strong className="font-mono text-slate-900">{item.transactionReference}</strong></p>
                  <p className="text-slate-600">Payment: <strong className="text-emerald-700">{item.paymentStatus}</strong></p>
                  <p className="text-slate-600">Amount: <strong className="text-slate-900">{item.currency} {Number(item.amount).toFixed(2)}</strong></p>
                  <p className="text-slate-600">OPAS status: <strong className="text-amber-800">{item.applicationStatus}</strong></p>
                </div>
                <div className="mt-3 p-3 bg-white border border-amber-200 rounded-md text-xs text-slate-700">
                  <div className="flex items-center gap-2 font-bold text-amber-900"><Bell className="w-3.5 h-3.5" /> Applicant notification preview</div>
                  <p className="mt-1">Your payment was successful, but your passport application is not yet submitted. Please return to OPAS, open your application and complete the submission process.</p>
                </div>
              </article>
            ))}
          </div>
        )}
        <div className="border border-violet-200 rounded-lg overflow-hidden">
          <div className="bg-violet-50 px-4 py-3 flex items-center gap-2">
            <Bot className="w-4 h-4 text-violet-700" />
            <div>
              <h3 className="text-xs font-bold text-slate-900">Ask SmartGuide</h3>
              <p className="text-[10px] text-slate-500">AI answers using simulated OPAS records only.</p>
            </div>
          </div>
          <div className="p-4 space-y-3 max-h-72 overflow-y-auto" aria-live="polite">
            {chatMessages.map((item, index) => (
              <div key={`${item.role}-${index}`} className={`max-w-[90%] rounded-lg px-3 py-2 text-xs whitespace-pre-wrap ${item.role === 'user' ? 'ml-auto bg-violet-700 text-white' : 'bg-slate-100 text-slate-800'}`}>
                {item.text}
              </div>
            ))}
            {asking && <p className="text-xs text-slate-500">SmartGuide is thinking…</p>}
          </div>
          <form onSubmit={askSmartGuide} className="border-t border-violet-100 p-3 flex gap-2">
            <input
              value={question}
              onChange={event => setQuestion(event.target.value)}
              maxLength={1000}
              placeholder="Ask about a payment or application status"
              aria-label="Ask SmartGuide a question"
              className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <button type="submit" disabled={asking || !question.trim()} className="rounded-md bg-violet-700 px-3 py-2 text-white disabled:opacity-50" aria-label="Send question">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
        <p className="text-[10px] text-slate-400">Demonstration only: records are simulated. The monitor does not send real SMS, email or government notifications.</p>
      </div>
    </section>
  );
};
