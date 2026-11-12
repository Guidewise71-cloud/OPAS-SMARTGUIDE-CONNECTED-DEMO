import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Bot, ExternalLink, KeyRound, Loader2, Sparkles } from 'lucide-react';
import {
  getSmartGuideFillerUrl,
  takePendingSmartGuideCode,
  type SmartGuidePrefillDraft,
} from '../utils/smartGuidePrefill';

interface SmartGuidePrefillCardProps {
  onApply: (draft: SmartGuidePrefillDraft) => void;
}

/**
 * Citizen-dashboard card: send the applicant to the SmartGuide AI Application Filler, and
 * redeem the one-time code SmartGuide returns. Redeeming fetches the draft from the OPAS
 * server and opens a new application with the form already filled.
 */
export const SmartGuidePrefillCard: React.FC<SmartGuidePrefillCardProps> = ({ onApply }) => {
  const [code, setCode] = useState('');
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoClaimed = useRef(false);

  const claim = async (rawCode: string) => {
    const value = rawCode.trim();
    if (!value || isClaiming) return;
    setIsClaiming(true);
    setError(null);
    try {
      const response = await fetch('/api/smartguide-prefill/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: value }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success || !result.draft) {
        throw new Error(result.error || `OPAS returned HTTP ${response.status}.`);
      }
      setCode('');
      onApply(result.draft as SmartGuidePrefillDraft);
    } catch (err) {
      setCode(value);
      setError(err instanceof Error ? err.message : 'Could not load the form from SmartGuide.');
    } finally {
      setIsClaiming(false);
    }
  };

  // Arriving from SmartGuide's "Open OPAS and fill my form" link: claim automatically.
  useEffect(() => {
    if (autoClaimed.current) return;
    autoClaimed.current = true;
    const pending = takePendingSmartGuideCode();
    if (pending) void claim(pending);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-white border-2 border-emerald-600/40 rounded-xl shadow-xs overflow-hidden">
      <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-5 gap-5 bg-gradient-to-r from-emerald-50 to-sky-50">
        <div className="md:col-span-3 space-y-2">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider bg-white px-2 py-0.5 rounded border border-emerald-200 inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            New · SmartGuide AI fills your form
          </span>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Bot className="w-5 h-5 text-emerald-700" />
            Let OPAS SmartGuide fill your passport application for you
          </h2>
          <p className="text-xs text-slate-600 max-w-2xl">
            Chat with SmartGuide in plain language. It prepares your application form and sends it here. You then review
            every step, upload documents and pay — SmartGuide never submits or pays for you.
          </p>
          <a
            href={getSmartGuideFillerUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-md items-center gap-2 shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            Open SmartGuide AI assistant
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <form
          className="md:col-span-2 bg-white border border-slate-200 rounded-lg p-4 space-y-2 self-start"
          onSubmit={(event) => {
            event.preventDefault();
            void claim(code);
          }}
        >
          <label htmlFor="smartguide-code" className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-emerald-700" />
            Already chatted with SmartGuide? Enter your code
          </label>
          <div className="flex gap-2">
            <input
              id="smartguide-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={12}
              placeholder="ABCD-2345"
              autoComplete="off"
              disabled={isClaiming}
              className="flex-1 min-w-0 px-3 py-2 text-sm font-mono tracking-widest border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-700 disabled:bg-slate-100"
            />
            <button
              type="submit"
              disabled={isClaiming || !code.trim()}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-semibold text-xs rounded-md flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
            >
              {isClaiming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Fill my form
            </button>
          </div>
          {error && (
            <div className="p-2 bg-red-50 border border-red-200 rounded-md flex items-start gap-1.5 text-[11px] text-red-800">
              <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          <p className="text-[11px] text-slate-500">Each code works once and expires after 24 hours.</p>
        </form>
      </div>
    </div>
  );
};
