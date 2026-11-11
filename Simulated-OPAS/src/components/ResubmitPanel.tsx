import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, RefreshCw, Send } from 'lucide-react';
import { usePassport } from '../context/PassportContext';

/**
 * Shown on a reverted application. RESUBMIT sends the corrected application back for review and only
 * shows success after the OPAS server confirms it, so applicants never believe they resubmitted when
 * the system says they did not.
 */
export const ResubmitPanel: React.FC = () => {
  const { currentApp, resubmitRevertedApplication } = usePassport();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState<{ confirmationNumber: string; resubmittedAt: string; smartGuideSynced: boolean } | null>(null);

  if (!currentApp) return null;
  if (currentApp.status !== 'REVERTED_ACTION_REQUIRED' && !confirmed) return null;

  const docs = currentApp.documents;
  const missing = [
    !docs.nrcFrontBack && 'Green NRC scan',
    !docs.birthCertificate && 'Birth certificate',
    !docs.passportPhoto && 'Passport photo',
  ].filter(Boolean) as string[];

  const handleResubmit = async () => {
    if (missing.length) { setError(`Upload these first: ${missing.join(', ')}.`); return; }
    setBusy(true); setError('');
    const result = await resubmitRevertedApplication();
    setBusy(false);
    if (result.success && result.confirmationNumber) {
      setConfirmed({ confirmationNumber: result.confirmationNumber, resubmittedAt: result.resubmittedAt || new Date().toISOString(), smartGuideSynced: Boolean(result.smartGuideSynced) });
    } else {
      setError(result.error || 'The server did not confirm the resubmission.');
    }
  };

  if (confirmed) {
    return (
      <div role="status" aria-live="polite" className="p-5 bg-emerald-50 border-2 border-emerald-500 rounded-xl text-center space-y-2">
        <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
        <p className="text-base font-black text-emerald-900">YOUR APPLICATION HAS BEEN RESUBMITTED SUCCESSFULLY</p>
        <p className="text-xs text-emerald-900">It is back in the review queue. You do NOT need to resubmit again, and you do NOT need to pay again. Reminders have stopped.</p>
        <div className="inline-block text-left text-xs bg-white rounded-lg border border-emerald-200 px-4 py-2 space-y-0.5">
          <p><strong>Application:</strong> {currentApp.referenceNumber}</p>
          <p><strong>Confirmation number:</strong> {confirmed.confirmationNumber}</p>
          <p><strong>Resubmitted:</strong> {new Date(confirmed.resubmittedAt).toLocaleString()}</p>
          <p><strong>Status:</strong> Under review</p>
        </div>
        <p className="text-[11px] text-emerald-800">Write down or screenshot the confirmation number. You can quote it if anyone asks whether you resubmitted.</p>
        {!confirmed.smartGuideSynced && (
          <p className="text-[11px] text-amber-800">Note for officers: OPAS saved the resubmission, but SmartGuide was not updated yet. It will sync on the next status sync.</p>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 bg-purple-50 border-2 border-purple-400 rounded-xl space-y-3">
      <div>
        <p className="text-sm font-black text-purple-950">When your corrections are done, press RESUBMIT</p>
        <p className="text-xs text-purple-900">Your application is NOT being processed until you resubmit. Uploading files alone does not resubmit it.</p>
      </div>
      {error && (
        <div role="alert" className="p-3 bg-red-50 border-2 border-red-400 rounded-lg text-xs text-red-900 flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
          <div>
            <p className="font-black">NOT RESUBMITTED</p>
            <p>Your application was NOT resubmitted and is still returned to you. {error} Please try again.</p>
          </div>
        </div>
      )}
      <button type="button" onClick={handleResubmit} disabled={busy}
        className="w-full sm:w-auto px-6 py-3 bg-purple-700 hover:bg-purple-800 text-white font-black text-sm rounded-lg flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer">
        {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {busy ? 'Resubmitting... do not close this page' : 'RESUBMIT corrected application'}
      </button>
    </div>
  );
};
