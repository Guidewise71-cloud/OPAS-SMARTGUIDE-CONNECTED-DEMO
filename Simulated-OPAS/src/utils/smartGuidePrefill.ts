import type {
  ApplicationType,
  BookletType,
  PassportApplication,
  PersonalDetails,
  ProcessingSpeed,
} from '../types/passport';

/** Flat draft prepared by OPAS SmartGuide; converted into a PassportApplication update on apply. */
export type SmartGuidePrefillDraft = Partial<PersonalDetails> & {
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

/** statusHistory actor used to mark applications pre-filled from SmartGuide. */
export const SMARTGUIDE_PREFILL_ACTOR = 'OPAS SmartGuide AI Application Filler';

const PERSONAL_KEYS: (keyof PersonalDetails)[] = [
  'surname', 'givenNames', 'maidenName', 'gender', 'maritalStatus', 'dateOfBirth',
  'placeOfBirthTown', 'placeOfBirthDistrict', 'placeOfBirthProvince', 'nationality',
  'citizenshipAcquiredBy', 'nrcNumber', 'village', 'chief', 'districtOfOrigin',
  'fatherFullName', 'fatherNrc', 'motherFullName', 'motherNrc', 'occupation', 'heightCm',
  'eyeColor', 'hairColor', 'visibleMarks', 'residentialAddress', 'townCity', 'province',
  'mobilePhone', 'email', 'emergencyName', 'emergencyRelation', 'emergencyPhone', 'emergencyAddress',
];

const hasValue = (value: unknown) => value !== undefined && value !== null && String(value).trim() !== '';

/** Converts the SmartGuide draft into an update for the newly created application. */
export function buildSmartGuidePrefillUpdates(
  app: PassportApplication,
  draft: SmartGuidePrefillDraft,
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
        note: `Application form pre-filled by OPAS SmartGuide AI from the applicant's answers (${filledCount} fields). Applicant must review every step before the declaration and payment.`,
        updatedBy: SMARTGUIDE_PREFILL_ACTOR,
      },
    ],
  };
}

const PENDING_CODE_KEY = 'opas.smartguidePrefillCode';

/**
 * Reads ?smartguidePrefill=CODE once (so it survives the sign-in screen), stores it in
 * sessionStorage and removes it from the address bar.
 */
export function captureSmartGuideCodeFromUrl(): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  const code = url.searchParams.get('smartguidePrefill');
  if (!code) return;
  try {
    window.sessionStorage.setItem(PENDING_CODE_KEY, code.slice(0, 20));
  } catch {
    /* storage unavailable */
  }
  url.searchParams.delete('smartguidePrefill');
  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
}

export function takePendingSmartGuideCode(): string | null {
  try {
    const code = window.sessionStorage.getItem(PENDING_CODE_KEY);
    if (code) window.sessionStorage.removeItem(PENDING_CODE_KEY);
    return code;
  } catch {
    return null;
  }
}

export function getSmartGuideFillerUrl(): string {
  const configured = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_SMARTGUIDE_PUBLIC_URL;
  return `${(configured || 'http://localhost:3001').replace(/\/+$/, '')}/ai-fill`;
}
