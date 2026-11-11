// Parses reminder deep links such as /?application=ZM-PAS-2026-100125&action=fix&field=photo
// Field codes match OPAS-SmartGuide/src/utils/correctionLinks.ts.

export interface ApplicationDeepLink {
  applicationReference: string;
  action: 'fix' | 'submit';
  field?: string;
  step: number;
  label: string;
}

const FIELD_STEPS: Record<string, { step: number; label: string; elementId?: string }> = {
  photo: { step: 4, label: 'Passport photo', elementId: 'doc-section-photo' },
  nrc: { step: 4, label: 'Green NRC copy (front and back)', elementId: 'doc-section-nrc' },
  birth_certificate: { step: 4, label: 'Birth certificate', elementId: 'doc-section-birth-certificate' },
  guarantor: { step: 4, label: 'Guarantor / recommender declaration', elementId: 'doc-section-supporting' },
  police_report: { step: 4, label: 'Police report', elementId: 'doc-section-supporting' },
  documents: { step: 4, label: 'Supporting documents', elementId: 'doc-section-supporting' },
  personal_details: { step: 2, label: 'Personal details (name, date of birth, NRC number)' },
  contact_details: { step: 2, label: 'Contact details (phone and email)' },
  travel_history: { step: 3, label: 'Previous passport / travel history' },
  declaration: { step: 5, label: 'Declaration and signature' },
};

const STORAGE_KEY = 'opas_pending_deep_link';

export function parseDeepLink(search: string): ApplicationDeepLink | null {
  const params = new URLSearchParams(search);
  const applicationReference = (params.get('application') || '').trim();
  if (!applicationReference) return null;
  const action = params.get('action') === 'submit' ? 'submit' : 'fix';
  const field = params.get('field') || undefined;
  const mapped = field ? FIELD_STEPS[field] : undefined;
  return {
    applicationReference,
    action,
    field: mapped ? field : undefined,
    step: action === 'submit' ? 5 : mapped?.step ?? 4,
    label: action === 'submit' ? 'Review and SUBMIT your paid application' : mapped?.label ?? 'The items listed by the officer',
  };
}

export function fieldElementId(field?: string): string | undefined {
  return field ? FIELD_STEPS[field]?.elementId : undefined;
}

/** Keep the link across the login screen (the query string is removed after it is read). */
export function rememberDeepLink(link: ApplicationDeepLink | null) {
  if (link) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(link));
  else sessionStorage.removeItem(STORAGE_KEY);
}

export function recallDeepLink(): ApplicationDeepLink | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ApplicationDeepLink) : null;
  } catch {
    return null;
  }
}
