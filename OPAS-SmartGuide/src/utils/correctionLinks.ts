// Deep links that open one specific application in OPAS at the step and field the applicant must fix.
// Browser-safe: no Node APIs. The same field codes are parsed by Simulated-OPAS (src/utils/deepLink.ts).

export type CorrectionField =
  | 'photo'
  | 'nrc'
  | 'birth_certificate'
  | 'guarantor'
  | 'police_report'
  | 'personal_details'
  | 'contact_details'
  | 'travel_history'
  | 'declaration'
  | 'documents';

export interface CorrectionTarget {
  field: CorrectionField;
  /** OPAS wizard step that holds the field (Simulated-OPAS numbering: 2 personal, 3 travel, 4 documents, 5 review). */
  step: number;
  /** Plain-language label shown to the applicant. */
  label: string;
}

const TARGETS: Record<CorrectionField, CorrectionTarget> = {
  photo: { field: 'photo', step: 4, label: 'Passport photo' },
  nrc: { field: 'nrc', step: 4, label: 'Green NRC copy (front and back)' },
  birth_certificate: { field: 'birth_certificate', step: 4, label: 'Birth certificate' },
  guarantor: { field: 'guarantor', step: 4, label: 'Guarantor / recommender declaration' },
  police_report: { field: 'police_report', step: 4, label: 'Police report' },
  personal_details: { field: 'personal_details', step: 2, label: 'Personal details (name, date of birth, NRC number)' },
  contact_details: { field: 'contact_details', step: 2, label: 'Contact details (phone and email)' },
  travel_history: { field: 'travel_history', step: 3, label: 'Previous passport / travel history' },
  declaration: { field: 'declaration', step: 5, label: 'Declaration and signature' },
  documents: { field: 'documents', step: 4, label: 'Supporting documents' },
};

// Order matters: the first matching rule wins.
const RULES: Array<{ field: CorrectionField; pattern: RegExp }> = [
  { field: 'photo', pattern: /photo|picture|portrait|background|glare|shadow|lighting|selfie/i },
  { field: 'nrc', pattern: /\bnrc\b|national registration|registration card/i },
  { field: 'birth_certificate', pattern: /birth cert/i },
  { field: 'guarantor', pattern: /guarantor|recommender|section 8|commissioner for oaths|stamp/i },
  { field: 'police_report', pattern: /police/i },
  { field: 'contact_details', pattern: /phone|mobile|e-?mail|contact|address/i },
  { field: 'travel_history', pattern: /previous passport|travel history|old passport|expired passport/i },
  { field: 'personal_details', pattern: /name mismatch|surname|spelling|date of birth|\bdob\b|gender|place of birth|personal detail/i },
  { field: 'declaration', pattern: /declaration|signature|signed/i },
];

/** Work out which field an officer comment refers to. Falls back to the documents step. */
export function classifyCorrectionField(officerComment: string | undefined | null): CorrectionTarget {
  const text = String(officerComment || '');
  const rule = RULES.find((candidate) => candidate.pattern.test(text));
  return TARGETS[rule?.field ?? 'documents'];
}

export function getCorrectionTarget(field: string | undefined | null): CorrectionTarget | undefined {
  return field && field in TARGETS ? TARGETS[field as CorrectionField] : undefined;
}

/**
 * Build the link sent in SMS/email. Example:
 *   http://localhost:3000/?application=ZM-PAS-2026-100125&action=fix&field=photo
 * Simulated-OPAS opens that application at the right step after the applicant logs in.
 */
export function buildCorrectionLink(
  baseUrl: string,
  applicationReference: string,
  action: 'fix' | 'submit',
  officerComment?: string,
): { url: string; target?: CorrectionTarget } {
  const base = (baseUrl || 'http://localhost:3000').replace(/\/+$/, '');
  const params = new URLSearchParams({ application: applicationReference, action });
  let target: CorrectionTarget | undefined;
  if (action === 'fix') {
    target = classifyCorrectionField(officerComment);
    params.set('field', target.field);
  }
  return { url: `${base}/?${params.toString()}`, target };
}
