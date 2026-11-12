import React, { useEffect, useRef, useState } from 'react';
import { usePassport } from '../context/PassportContext';
import type {
  ApplicantUser,
  ApplicationType,
  BookletType,
  PassportApplication,
  PersonalDetails,
  ProcessingSpeed,
} from '../types/passport';
import { AlertCircle, Bot, CheckCircle2, Loader2, RotateCcw, Send, Sparkles, X } from 'lucide-react';

/** Flat draft collected by the AI assistant; converted into a PassportApplication update on apply. */
export type AiApplicationDraft = Partial<PersonalDetails> & {
  applicationType?: ApplicationType;
  bookletType?: BookletType;
  processingSpeed?: ProcessingSpeed;
  hasPreviousPassport?: boolean;
  previousPassportNumber?: string;
  previousPassportIssueDate?: string;
  previousPassportExpiryDate?: string;
  lossReason?: string;
  policeReportRef?: string;
};

type ChatMessage = { role: 'applicant' | 'assistant'; text: string };
type MissingField = { key: string; label: string };

/** statusHistory actor used to mark applications pre-filled by the assistant. */
export const AI_ASSISTANT_ACTOR = 'OPAS AI Application Assistant';

const PERSONAL_KEYS: (keyof PersonalDetails)[] = [
  'surname', 'givenNames', 'maidenName', 'gender', 'maritalStatus', 'dateOfBirth',
  'placeOfBirthTown', 'placeOfBirthDistrict', 'placeOfBirthProvince', 'nationality',
  'citizenshipAcquiredBy', 'nrcNumber', 'village', 'chief', 'districtOfOrigin',
  'fatherFullName', 'fatherNrc', 'motherFullName', 'motherNrc', 'occupation', 'heightCm',
  'eyeColor', 'hairColor', 'visibleMarks', 'residentialAddress', 'townCity', 'province',
  'mobilePhone', 'email', 'emergencyName', 'emergencyRelation', 'emergencyPhone', 'emergencyAddress',
];

// Mirrors the mandatory checks in Step2PersonalDetails (also enforced on the server).
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
  applicationType: 'Application type',
  bookletType: 'Booklet',
  processingSpeed: 'Processing speed',
  surname: 'Surname',
  givenNames: 'Given names',
  maidenName: 'Maiden name',
  gender: 'Gender',
  maritalStatus: 'Marital status',
  dateOfBirth: 'Date of birth',
  nrcNumber: 'NRC number',
  placeOfBirthTown: 'Town of birth',
  placeOfBirthDistrict: 'District of birth',
  placeOfBirthProvince: 'Province of birth',
  nationality: 'Nationality',
  citizenshipAcquiredBy: 'Citizenship by',
  village: 'Village',
  chief: 'Traditional chief',
  districtOfOrigin: 'District of origin',
  fatherFullName: "Father's name",
  fatherNrc: "Father's NRC",
  motherFullName: "Mother's name",
  motherNrc: "Mother's NRC",
  occupation: 'Occupation',
  heightCm: 'Height (cm)',
  eyeColor: 'Eye colour',
  hairColor: 'Hair colour',
  visibleMarks: 'Visible marks',
  residentialAddress: 'Residential address',
  townCity: 'Town / city',
  province: 'Province',
  mobilePhone: 'Mobile phone',
  email: 'Email',
  emergencyName: 'Emergency contact',
  emergencyRelation: 'Relationship',
  emergencyPhone: 'Emergency phone',
  emergencyAddress: 'Emergency address',
  hasPreviousPassport: 'Has previous passport',
  previousPassportNumber: 'Previous passport no.',
  previousPassportIssueDate: 'Previous issue date',
  previousPassportExpiryDate: 'Previous expiry date',
  lossReason: 'Loss reason',
  policeReportRef: 'Police report ref.',
};

const PREVIEW_GROUPS: { title: string; keys: string[] }[] = [
  { title: 'Passport service', keys: ['applicationType', 'bookletType', 'processingSpeed'] },
  {
    title: 'Identity',
    keys: ['surname', 'givenNames', 'maidenName', 'gender', 'maritalStatus', 'dateOfBirth', 'nrcNumber',
      'placeOfBirthTown', 'placeOfBirthDistrict', 'placeOfBirthProvince', 'nationality', 'citizenshipAcquiredBy'],
  },
  { title: 'Heritage & parents', keys: ['village', 'chief', 'districtOfOrigin', 'fatherFullName', 'fatherNrc', 'motherFullName', 'motherNrc'] },
  { title: 'Description', keys: ['occupation', 'heightCm', 'eyeColor', 'hairColor', 'visibleMarks'] },
  { title: 'Address & contact', keys: ['residentialAddress', 'townCity', 'province', 'mobilePhone', 'email'] },
  { title: 'Emergency contact', keys: ['emergencyName', 'emergencyRelation', 'emergencyPhone', 'emergencyAddress'] },
  {
    title: 'Previous passport',
    keys: ['hasPreviousPassport', 'previousPassportNumber', 'previousPassportIssueDate', 'previousPassportExpiryDate', 'lossReason', 'policeReportRef'],
  },
];

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function computeMissing(draft: AiApplicationDraft): MissingField[] {
  const record = draft as unknown as Record<string, unknown>;
  return REQUIRED_FIELDS.filter(({ key }) => {
    const value = record[key];
    if (!hasValue(value)) return true;
    return key === 'nrcNumber' && String(value).length < 9;
  });
}

function formatValue(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return String(value);
  const text = String(value ?? '');
  if (/^[A-Z][A-Z0-9_]*$/.test(text)) {
    return text
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  }
  return text;
}

function seedDraft(user: ApplicantUser | null): AiApplicationDraft {
  if (!user) return {};
  const draft: AiApplicationDraft = {};
  const names = user.fullName.trim().split(/\s+/).filter(Boolean);
  if (names.length > 1) {
    draft.surname = names[names.length - 1];
    draft.givenNames = names.slice(0, -1).join(' ');
  } else if (names[0]) {
    draft.givenNames = names[0];
  }
  if (user.email) draft.email = user.email;
  if (user.phone) draft.mobilePhone = user.phone;
  if (user.nrcNumber) draft.nrcNumber = user.nrcNumber;
  if (user.dateOfBirth) draft.dateOfBirth = user.dateOfBirth;
  return draft;
}

/** Converts the assistant draft into an update for the newly created application. */
export function buildAiPrefillUpdates(
  app: PassportApplication,
  draft: AiApplicationDraft
): Partial<PassportApplication> {
  const record = draft as unknown as Record<string, unknown>;
  const personal: Partial<PersonalDetails> = {};
  for (const key of PERSONAL_KEYS) {
    if (hasValue(record[key])) (personal as unknown as Record<string, unknown>)[key] = record[key];
  }

  const previous = { ...app.previousPassportDetails };
  if (typeof draft.hasPreviousPassport === 'boolean') previous.hasPreviousPassport = draft.hasPreviousPassport;
  if (draft.previousPassportNumber) previous.passportNumber = draft.previousPassportNumber;
  if (draft.previousPassportIssueDate) previous.issueDate = draft.previousPassportIssueDate;
  if (draft.previousPassportExpiryDate) previous.expiryDate = draft.previousPassportExpiryDate;
  if (draft.lossReason) previous.lossReason = draft.lossReason;
  if (draft.policeReportRef) previous.policeReportRef = draft.policeReportRef;

  const filledCount = Object.values(record).filter(hasValue).length;

  return {
    applicationType: draft.applicationType || app.applicationType,
    bookletType: draft.bookletType || app.bookletType,
    processingSpeed: draft.processingSpeed || app.processingSpeed,
    personalDetails: { ...app.personalDetails, ...personal },
    previousPassportDetails: previous,
    currentStep: 1,
    statusHistory: [
      ...app.statusHistory,
      {
        status: app.status,
        timestamp: new Date().toISOString(),
        note: `Application form pre-filled by the AI-Assisted Application from applicant answers (${filledCount} fields). Applicant must review every step before the declaration and payment.`,
        updatedBy: AI_ASSISTANT_ACTOR,
      },
    ],
  };
}

interface AiApplicationAssistantProps {
  onApply: (draft: AiApplicationDraft) => void;
}

export const AiApplicationAssistant: React.FC<AiApplicationAssistantProps> = ({ onApply }) => {
  const { currentUser } = usePassport();
  const firstName = currentUser?.fullName.split(' ')[0] || 'there';
  const greeting =
    `Hello ${firstName}. I will help you fill your passport application. Tell me in your own words what you need ` +
    '(first-time passport, renewal or replacement) and anything you already know: where you were born, your parents\' names, ' +
    'your village and chief, your home address and an emergency contact. You can write it all at once or answer step by step.';

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState<AiApplicationDraft>(() => seedDraft(currentUser));
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentlyUpdated, setRecentlyUpdated] = useState<string[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const missing = computeMissing(draft);
  const capturedCount = Object.values(draft).filter(hasValue).length;
  const canApply = hasValue(draft.surname) || hasValue(draft.givenNames);

  // Start fresh when the signed-in applicant changes (e.g. cohort switch).
  useEffect(() => {
    setIsOpen(false);
    setMessages([]);
    setDraft(seedDraft(currentUser));
    setInput('');
    setError(null);
    setRecentlyUpdated([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  useEffect(() => {
    const container = chatContainerRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages, isSending]);

  const openAssistant = () => {
    setIsOpen(true);
    if (messages.length === 0) setMessages([{ role: 'assistant', text: greeting }]);
  };

  const resetConversation = () => {
    setMessages([{ role: 'assistant', text: greeting }]);
    setDraft(seedDraft(currentUser));
    setInput('');
    setError(null);
    setRecentlyUpdated([]);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isSending) return;
    if (text.length > 1000) {
      setError('Please keep each message under 1,000 characters.');
      return;
    }

    const nextMessages: ChatMessage[] = [...messages, { role: 'applicant', text }];
    setMessages(nextMessages);
    setInput('');
    setError(null);
    setIsSending(true);

    try {
      const response = await fetch('/api/ai/application-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages, draft }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.error || `The AI assistant returned HTTP ${response.status}.`);
      }
      setDraft((result.draft as AiApplicationDraft) || draft);
      setRecentlyUpdated(Array.isArray(result.updatedFields) ? result.updatedFields : []);
      setMessages(prev => [...prev, { role: 'assistant', text: String(result.reply || 'Noted.') }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The AI assistant is unavailable. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  const applyToForm = () => {
    if (!canApply) return;
    onApply(draft);
    setIsOpen(false);
    setMessages([]);
    setRecentlyUpdated([]);
  };

  return (
    <div className="bg-white border-2 border-sky-600/40 rounded-xl shadow-xs overflow-hidden">
      {/* Feature card */}
      <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-sky-50 to-emerald-50">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-sky-800 uppercase tracking-wider bg-white px-2 py-0.5 rounded border border-sky-200 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              New · AI-Assisted Application
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Bot className="w-5 h-5 text-sky-700" />
            Let the AI assistant fill your passport form for you
          </h2>
          <p className="text-xs text-slate-600 max-w-2xl">
            Answer a few questions in plain language. The assistant turns your answers into the application form, then
            opens it pre-filled so you only review, upload documents and pay.
          </p>
        </div>

        {!isOpen ? (
          <button
            type="button"
            onClick={openAssistant}
            className="px-5 py-2.5 bg-sky-800 hover:bg-sky-900 text-white font-bold text-xs rounded-md transition-colors flex items-center justify-center gap-2 shrink-0 shadow-sm cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Start AI-Assisted Application</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="self-start md:self-auto px-3 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs rounded-md flex items-center gap-1.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            Close assistant
          </button>
        )}
      </div>

      {isOpen && (
        <div className="border-t border-sky-100 p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Conversation */}
          <div className="lg:col-span-3 flex flex-col gap-3">
            <div
              ref={chatContainerRef}
              className="h-80 overflow-y-auto bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-3"
              aria-live="polite"
            >
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'applicant' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-lg text-xs leading-relaxed whitespace-pre-wrap ${
                      message.role === 'applicant'
                        ? 'bg-slate-900 text-white rounded-br-sm'
                        : 'bg-white border border-sky-200 text-slate-800 rounded-bl-sm'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-sky-800 mb-0.5">
                        <Bot className="w-3 h-3" />
                        AI Assistant
                      </span>
                    )}
                    {message.text}
                  </div>
                </div>
              ))}
              {isSending && (
                <div className="flex justify-start">
                  <div className="px-3 py-2 rounded-lg text-xs bg-white border border-sky-200 text-slate-500 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Filling in your details…
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-md flex items-start gap-2 text-xs text-red-800">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
                maxLength={1000}
                disabled={isSending}
                placeholder="e.g. I need a new 32-page passport. I was born in Kitwe on 4 March 1996. My father is Peter Banda and my mother is Mary Phiri…"
                className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-700 resize-none disabled:bg-slate-100"
              />
              <button
                type="button"
                onClick={() => void sendMessage()}
                disabled={isSending || !input.trim()}
                className="px-4 py-2.5 bg-sky-800 hover:bg-sky-900 disabled:bg-slate-300 text-white font-semibold text-xs rounded-md flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
                Send
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Demo only: use fictional test details. The assistant prepares a draft — it never submits, pays for or
              verifies your application. Press Enter to send, Shift+Enter for a new line.
            </p>
          </div>

          {/* Live form preview */}
          <div className="lg:col-span-2 flex flex-col gap-3">
            <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-3 max-h-96 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Form preview</span>
                <span className="text-[11px] text-slate-500">
                  {capturedCount} captured · {missing.length} required missing
                </span>
              </div>

              {PREVIEW_GROUPS.map(group => {
                const record = draft as unknown as Record<string, unknown>;
                const filled = group.keys.filter(key => hasValue(record[key]));
                if (filled.length === 0) return null;
                return (
                  <div key={group.title} className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{group.title}</span>
                    <dl className="space-y-0.5">
                      {filled.map(key => (
                        <div
                          key={key}
                          className={`flex justify-between gap-3 text-xs px-1.5 py-0.5 rounded ${
                            recentlyUpdated.includes(key) ? 'bg-emerald-50 ring-1 ring-emerald-200' : ''
                          }`}
                        >
                          <dt className="text-slate-500 shrink-0">{FIELD_LABELS[key] || key}</dt>
                          <dd className="text-slate-900 font-medium text-right break-words">{formatValue(record[key])}</dd>
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
                    {missing.map(field => (
                      <span
                        key={field.key}
                        className="text-[10px] bg-amber-50 text-amber-900 border border-amber-200 px-1.5 py-0.5 rounded"
                      >
                        {field.label}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-2 py-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  All required personal details captured.
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={resetConversation}
                disabled={isSending}
                className="px-3 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs rounded-md flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Start over
              </button>
              <button
                type="button"
                onClick={applyToForm}
                disabled={!canApply || isSending}
                className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 disabled:bg-slate-300 text-white font-bold text-xs rounded-md flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                Fill my application form
              </button>
            </div>
            {missing.length > 0 && canApply && (
              <p className="text-[11px] text-slate-500 text-right">
                You can fill the form now and complete the {missing.length} missing field(s) in the wizard.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
