import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Bot, CheckCircle2, Copy, ExternalLink, Loader2, RotateCcw, Send, Sparkles } from 'lucide-react';

/**
 * SmartGuide AI Application Filler (public page: /ai-fill).
 *
 * The applicant chats with SmartGuide; the server (Gemini) turns the answers into
 * passport-form fields. "Send to my OPAS application" pushes the draft to Simulated OPAS
 * over the signed bridge and shows a one-time claim code / link. OPAS then fills the form
 * and the applicant reviews every step before the declaration and payment.
 */

type ChatMessage = { role: 'applicant' | 'assistant'; text: string };
type MissingField = { key: string; label: string };
type Draft = Record<string, string | number | boolean>;
type Receipt = { claimCode: string; claimUrl: string; expiresAt: string; filledFieldCount: number };

const REQUIRED_FIELDS: MissingField[] = [
  { key: 'surname', label: 'Surname' },
  { key: 'givenNames', label: 'Given names' },
  { key: 'nrcNumber', label: 'NRC number' },
  { key: 'dateOfBirth', label: 'Date of birth' },
  { key: 'placeOfBirthTown', label: 'Town of birth' },
  { key: 'village', label: 'Village' },
  { key: 'chief', label: 'Traditional chief' },
  { key: 'districtOfOrigin', label: 'District of origin' },
  { key: 'fatherFullName', label: "Father's full name" },
  { key: 'motherFullName', label: "Mother's full name" },
  { key: 'residentialAddress', label: 'Residential address' },
  { key: 'townCity', label: 'Town / city' },
  { key: 'mobilePhone', label: 'Mobile phone' },
  { key: 'emergencyName', label: 'Emergency contact name' },
  { key: 'emergencyPhone', label: 'Emergency contact phone' },
];

const FIELD_LABELS: Record<string, string> = {
  applicationType: 'Application type', bookletType: 'Booklet', processingSpeed: 'Processing speed',
  surname: 'Surname', givenNames: 'Given names', maidenName: 'Maiden name', gender: 'Gender',
  maritalStatus: 'Marital status', dateOfBirth: 'Date of birth', nrcNumber: 'NRC number',
  placeOfBirthTown: 'Town of birth', placeOfBirthDistrict: 'District of birth',
  placeOfBirthProvince: 'Province of birth', nationality: 'Nationality', citizenshipAcquiredBy: 'Citizenship by',
  village: 'Village', chief: 'Traditional chief', districtOfOrigin: 'District of origin',
  fatherFullName: "Father's name", fatherNrc: "Father's NRC", motherFullName: "Mother's name", motherNrc: "Mother's NRC",
  occupation: 'Occupation', heightCm: 'Height (cm)', eyeColor: 'Eye colour', hairColor: 'Hair colour',
  visibleMarks: 'Visible marks', residentialAddress: 'Residential address', townCity: 'Town / city',
  province: 'Province', mobilePhone: 'Mobile phone', email: 'Email', emergencyName: 'Emergency contact',
  emergencyRelation: 'Relationship', emergencyPhone: 'Emergency phone', emergencyAddress: 'Emergency address',
  hasPreviousPassport: 'Has previous passport', previousPassportNumber: 'Previous passport no.',
  previousPassportIssueDate: 'Previous issue date', previousPassportExpiryDate: 'Previous expiry date',
  lossReason: 'Loss reason', policeReportRef: 'Police report ref.',
};

const PREVIEW_GROUPS: { title: string; keys: string[] }[] = [
  { title: 'Passport service', keys: ['applicationType', 'bookletType', 'processingSpeed'] },
  { title: 'Identity', keys: ['surname', 'givenNames', 'maidenName', 'gender', 'maritalStatus', 'dateOfBirth', 'nrcNumber', 'placeOfBirthTown', 'placeOfBirthDistrict', 'placeOfBirthProvince', 'nationality', 'citizenshipAcquiredBy'] },
  { title: 'Heritage & parents', keys: ['village', 'chief', 'districtOfOrigin', 'fatherFullName', 'fatherNrc', 'motherFullName', 'motherNrc'] },
  { title: 'Description', keys: ['occupation', 'heightCm', 'eyeColor', 'hairColor', 'visibleMarks'] },
  { title: 'Address & contact', keys: ['residentialAddress', 'townCity', 'province', 'mobilePhone', 'email'] },
  { title: 'Emergency contact', keys: ['emergencyName', 'emergencyRelation', 'emergencyPhone', 'emergencyAddress'] },
  { title: 'Previous passport', keys: ['hasPreviousPassport', 'previousPassportNumber', 'previousPassportIssueDate', 'previousPassportExpiryDate', 'lossReason', 'policeReportRef'] },
];

const GREETING =
  'Hello, I am SmartGuide. I will fill your passport application in OPAS for you. Tell me in your own words what you need ' +
  '(first-time passport, renewal or replacement) and anything you already know: your full name and NRC, where and when you were born, ' +
  "your parents' names, your village and chief, your home address and an emergency contact. You can write it all at once or answer step by step.";

const hasValue = (value: unknown) => value !== undefined && value !== null && String(value).trim() !== '';

function computeMissing(draft: Draft): MissingField[] {
  return REQUIRED_FIELDS.filter(({ key }) => {
    const value = draft[key];
    if (!hasValue(value)) return true;
    return key === 'nrcNumber' && !/^\d{6}\/\d{2}\/\d$/.test(String(value));
  });
}

function formatValue(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  const text = String(value ?? '');
  if (/^[A-Z][A-Z0-9_]*$/.test(text)) {
    return text.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
  }
  return text;
}

export const AIApplicationFiller: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'assistant', text: GREETING }]);
  const [draft, setDraft] = useState<Draft>({});
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSubmittingToOpas, setIsSubmittingToOpas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentlyUpdated, setRecentlyUpdated] = useState<string[]>([]);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [copied, setCopied] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  const missing = computeMissing(draft);
  const capturedCount = Object.values(draft).filter(hasValue).length;
  const canSend = hasValue(draft.surname) || hasValue(draft.givenNames);
  const busy = isSending || isSubmittingToOpas;

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, isSending]);

  const resetConversation = () => {
    setMessages([{ role: 'assistant', text: GREETING }]);
    setDraft({});
    setInput('');
    setError(null);
    setRecentlyUpdated([]);
    setReceipt(null);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const nextMessages: ChatMessage[] = [...messages, { role: 'applicant', text }];
    setMessages(nextMessages);
    setInput('');
    setError(null);
    setIsSending(true);
    try {
      const response = await fetch('/api/smartguide/application-prefill/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages, draft }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.error || `SmartGuide returned HTTP ${response.status}.`);
      setDraft((result.draft as Draft) || draft);
      setRecentlyUpdated(Array.isArray(result.updatedFields) ? result.updatedFields : []);
      setMessages((prev) => [...prev, { role: 'assistant', text: String(result.reply || 'Noted.') }]);
      setReceipt(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'SmartGuide is unavailable. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const sendToOpas = async () => {
    if (!canSend || busy) return;
    setError(null);
    setIsSubmittingToOpas(true);
    try {
      const response = await fetch('/api/smartguide/application-prefill/send-to-opas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.error || `SmartGuide returned HTTP ${response.status}.`);
      setReceipt(result as Receipt);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the form to OPAS.');
    } finally {
      setIsSubmittingToOpas(false);
    }
  };

  const copyCode = async () => {
    if (!receipt) return;
    try {
      await navigator.clipboard.writeText(receipt.claimCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard not available: the code stays visible */
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="bg-[#0b3d2e] text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Bot className="w-6 h-6 text-amber-300" />
            <div>
              <p className="font-bold text-sm sm:text-base">OPAS SmartGuide · AI Application Filler</p>
              <p className="text-[11px] text-emerald-100">Simulated demo — not the official MoHAIS / OPAS service</p>
            </div>
          </div>
          <a href="/" className="text-xs text-emerald-100 hover:text-white underline">SmartGuide home</a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-6 space-y-4">
        <div className="bg-white border border-emerald-200 rounded-xl p-4 sm:p-5 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-slate-700 space-y-1">
            <p className="font-semibold text-slate-900">Let SmartGuide fill your OPAS passport form for you</p>
            <p>
              1. Answer SmartGuide's questions. 2. Press <strong>Send to my OPAS application</strong>. 3. Open OPAS with the claim code —
              your form opens already filled. You still review every step, upload documents and pay yourself.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Conversation */}
          <section className="lg:col-span-3 flex flex-col gap-3">
            <div ref={chatRef} className="h-[28rem] overflow-y-auto bg-white border border-slate-200 rounded-lg p-3 space-y-3" aria-live="polite">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'applicant' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-3 py-2 rounded-lg text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === 'applicant' ? 'bg-slate-900 text-white rounded-br-sm' : 'bg-emerald-50 border border-emerald-200 text-slate-800 rounded-bl-sm'
                  }`}>
                    {m.role === 'assistant' && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-800 mb-0.5"><Bot className="w-3 h-3" />SmartGuide</span>
                    )}
                    {m.text}
                  </div>
                </div>
              ))}
              {isSending && (
                <div className="flex justify-start">
                  <div className="px-3 py-2 rounded-lg text-xs bg-emerald-50 border border-emerald-200 text-slate-500 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />Filling in your details…
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-md flex items-start gap-2 text-xs text-red-800">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" /><span>{error}</span>
              </div>
            )}

            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }}
                rows={2}
                maxLength={1000}
                disabled={busy}
                placeholder="e.g. I need a new 32-page passport. My name is Chanda Mwila Banda, NRC 123456/78/1, born in Kitwe on 4 March 1996…"
                className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-700 resize-none disabled:bg-slate-100"
              />
              <button
                type="button"
                onClick={() => void sendMessage()}
                disabled={busy || !input.trim()}
                className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 disabled:bg-slate-300 text-white font-semibold text-xs rounded-md flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />Send
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Demo only: use fictional test details. SmartGuide prepares a draft — it never submits, pays for or verifies your application.
            </p>
          </section>

          {/* Form preview + hand-off */}
          <section className="lg:col-span-2 flex flex-col gap-3">
            <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-3 max-h-[24rem] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider">OPAS form preview</span>
                <span className="text-[11px] text-slate-500">{capturedCount} captured · {missing.length} required missing</span>
              </div>
              {capturedCount === 0 && <p className="text-xs text-slate-500">Fields appear here as SmartGuide captures them.</p>}
              {PREVIEW_GROUPS.map((group) => {
                const filled = group.keys.filter((key) => hasValue(draft[key]));
                if (!filled.length) return null;
                return (
                  <div key={group.title} className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{group.title}</span>
                    <dl className="space-y-0.5">
                      {filled.map((key) => (
                        <div key={key} className={`flex justify-between gap-3 text-xs px-1.5 py-0.5 rounded ${recentlyUpdated.includes(key) ? 'bg-emerald-50 ring-1 ring-emerald-200' : ''}`}>
                          <dt className="text-slate-500 shrink-0">{FIELD_LABELS[key] || key}</dt>
                          <dd className="font-medium text-right break-words">{formatValue(draft[key])}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                );
              })}
              {missing.length > 0 ? (
                <div className="space-y-1 pt-1 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Still needed</span>
                  <div className="flex flex-wrap gap-1">
                    {missing.map((f) => (
                      <span key={f.key} className="text-[10px] bg-amber-50 text-amber-900 border border-amber-200 px-1.5 py-0.5 rounded">{f.label}</span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-2 py-1.5">
                  <CheckCircle2 className="w-4 h-4" />All required personal details captured.
                </div>
              )}
            </div>

            {receipt ? (
              <div className="bg-emerald-50 border-2 border-emerald-300 rounded-lg p-4 space-y-3">
                <p className="text-sm font-bold text-emerald-900 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" />Your form is ready in OPAS</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-center text-lg font-bold tracking-widest bg-white border border-emerald-200 rounded px-3 py-2">{receipt.claimCode}</code>
                  <button type="button" onClick={() => void copyCode()} className="px-2.5 py-2 border border-emerald-300 bg-white hover:bg-emerald-100 rounded text-xs flex items-center gap-1 cursor-pointer">
                    <Copy className="w-3.5 h-3.5" />{copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <a href={receipt.claimUrl} target="_blank" rel="noopener noreferrer"
                  className="w-full px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-md flex items-center justify-center gap-1.5">
                  <ExternalLink className="w-4 h-4" />Open OPAS and fill my form
                </a>
                <p className="text-[11px] text-emerald-900">
                  Sign in to OPAS, then the form fills automatically (or enter the code on your OPAS dashboard).
                  {receipt.expiresAt && ` The code works once and expires ${new Date(receipt.expiresAt).toLocaleString()}.`}
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void sendToOpas()}
                disabled={!canSend || busy}
                className="w-full px-4 py-3 bg-emerald-800 hover:bg-emerald-900 disabled:bg-slate-300 text-white font-bold text-sm rounded-md flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed shadow-sm"
              >
                {isSubmittingToOpas ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-300" />}
                Send to my OPAS application
              </button>
            )}
            {!receipt && missing.length > 0 && canSend && (
              <p className="text-[11px] text-slate-500 text-right">You can send now and complete the {missing.length} missing field(s) in OPAS.</p>
            )}
            <button type="button" onClick={resetConversation} disabled={busy}
              className="self-start px-3 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs rounded-md flex items-center gap-1.5 cursor-pointer">
              <RotateCcw className="w-3.5 h-3.5" />Start over
            </button>
          </section>
        </div>
      </main>
    </div>
  );
};

export default AIApplicationFiller;
