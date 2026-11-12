// SmartGuide <-> n8n "Validate & Correct Applicant Details" bridge.
// Place at: OPAS-SmartGuide/src/server/applicantDetailsCorrection.ts
//
// The applicant sends typed details or a free-text correction ("my NRC is 123456/10/1").
// n8n validates them (rules + AI) and answers:
//   200 -> details passed: save them on the application automatically.
//   422 -> some details refused: save only the corrections that passed, show the AI guidance.
import type { Request, Response } from 'express';
import type { PassportApplication } from '../types/passport.ts';
import type { ApplicationValidationResult } from './applicationErrorEngine.ts';

// Field names the n8n workflow understands.
export type WorkflowField =
  | 'firstName' | 'middleName' | 'surname' | 'nrcNumber' | 'dateOfBirth' | 'gender'
  | 'placeOfBirth' | 'phoneNumber' | 'email' | 'passportType' | 'residentialAddress';

const WORKFLOW_FIELDS: WorkflowField[] = [
  'firstName', 'middleName', 'surname', 'nrcNumber', 'dateOfBirth', 'gender',
  'placeOfBirth', 'phoneNumber', 'email', 'passportType', 'residentialAddress',
];

type FieldMap = Partial<Record<WorkflowField, string>>;

interface ApplicantAccount { id: string; nrcNumber?: string; email: string }

export interface DetailsCorrectionDeps {
  /** Signed-in citizen account, or null. */
  getApplicant: (req: Request) => ApplicantAccount | null;
  getApplications: () => PassportApplication[];
  /** Persist to SQLite AND replace the in-memory copy (reminderApplications). */
  storeApplication: (application: PassportApplication) => Promise<void>;
  /** Latest OPAS error-detection result per application reference. */
  validationResults: Map<string, ApplicationValidationResult>;
  audit: (event: Record<string, unknown>) => void;
}

// ---------- mapping between PassportApplication and workflow fields ----------

function splitFullName(fullName: string) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { firstName: parts[0] || '', middleName: '', surname: '' };
  return { firstName: parts[0], middleName: parts.slice(1, -1).join(' '), surname: parts[parts.length - 1] };
}

export function applicationToFields(app: PassportApplication): FieldMap {
  return {
    ...splitFullName(app.fullName),
    nrcNumber: app.nrcNumber || '',
    dateOfBirth: app.dateOfBirth || '',
    gender: app.gender || '',
    placeOfBirth: app.placeOfBirth || '',
    phoneNumber: app.contact?.phone || '',
    email: app.contact?.email || '',
    passportType: app.passportType || '',
    residentialAddress: app.contact?.residentialAddress || '',
  };
}

export function applyFieldsToApplication(app: PassportApplication, updates: FieldMap): PassportApplication {
  const current = applicationToFields(app);
  const merged = { ...current, ...updates };
  const nameChanged = ['firstName', 'middleName', 'surname'].some(k => k in updates);
  return {
    ...app,
    fullName: nameChanged
      ? [merged.firstName, merged.middleName, merged.surname].filter(Boolean).join(' ')
      : app.fullName,
    nrcNumber: updates.nrcNumber ?? app.nrcNumber,
    dateOfBirth: updates.dateOfBirth ?? app.dateOfBirth,
    gender: (updates.gender as PassportApplication['gender']) ?? app.gender,
    placeOfBirth: updates.placeOfBirth ?? app.placeOfBirth,
    passportType: (updates.passportType as PassportApplication['passportType']) ?? app.passportType,
    contact: {
      ...app.contact,
      phone: updates.phoneNumber ?? app.contact.phone,
      email: updates.email ?? app.contact.email,
      residentialAddress: updates.residentialAddress ?? app.contact.residentialAddress,
    },
    lastUpdated: new Date().toISOString(),
  };
}

// OPAS error-engine field keys (e.g. "personalDetails.mobilePhone") -> workflow fields.
const OPAS_FIELD_TO_WORKFLOW: Record<string, WorkflowField> = {
  givenNames: 'firstName', firstName: 'firstName', middleName: 'middleName', surname: 'surname',
  nrc: 'nrcNumber', nrcNumber: 'nrcNumber', dateOfBirth: 'dateOfBirth', gender: 'gender',
  placeOfBirth: 'placeOfBirth', placeOfBirthTown: 'placeOfBirth',
  mobilePhone: 'phoneNumber', phone: 'phoneNumber', phoneNumber: 'phoneNumber',
  email: 'email', emailAddress: 'email',
  bookletType: 'passportType', passportType: 'passportType',
  residentialAddress: 'residentialAddress', physicalAddress: 'residentialAddress',
};

function toWorkflowField(opasField: string): WorkflowField | undefined {
  const last = String(opasField || '').split('.').pop() || '';
  return OPAS_FIELD_TO_WORKFLOW[last];
}

function knownErrorsFor(reference: string, results: Map<string, ApplicationValidationResult>) {
  const result = results.get(reference);
  if (!result) return [];
  return result.issues
    .filter(i => i.severity === 'error')
    .map(i => ({ field: toWorkflowField(i.field), problem: `${i.message} ${i.correction}`.trim() }))
    .filter((e): e is { field: WorkflowField; problem: string } => Boolean(e.field));
}

// Drop issues the applicant has now fixed, so SmartGuide stops flagging them.
function clearResolvedIssues(reference: string, fixed: WorkflowField[], results: Map<string, ApplicationValidationResult>) {
  const result = results.get(reference);
  if (!result || !fixed.length) return;
  const issues = result.issues.filter(i => {
    const f = toWorkflowField(i.field);
    return !(f && fixed.includes(f));
  });
  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.length - errorCount;
  results.set(reference, {
    ...result,
    issues,
    errorCount,
    warningCount,
    status: errorCount ? 'FAILED' : warningCount ? 'PASSED_WITH_WARNINGS' : 'PASSED',
    canProceed: errorCount === 0,
    firstErrorStep: issues.find(i => i.severity === 'error')?.step ?? null,
  });
}

// ---------- n8n call ----------

interface N8nResult { httpStatus: number; body: any }

async function callValidationWebhook(payload: Record<string, unknown>): Promise<N8nResult> {
  const url = process.env.SMARTGUIDE_VALIDATION_WEBHOOK_URL?.trim();
  const headerName = process.env.SMARTGUIDE_VALIDATION_HEADER_NAME?.trim();
  const secret = process.env.SMARTGUIDE_VALIDATION_SECRET?.trim();
  if (!url || !headerName || !secret) throw new Error('SmartGuide validation webhook is not configured.');

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', [headerName]: secret },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30_000),
  });
  const text = await response.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = null; }
  return { httpStatus: response.status, body };
}

function pickFields(input: unknown): FieldMap {
  const out: FieldMap = {};
  if (!input || typeof input !== 'object') return out;
  for (const k of WORKFLOW_FIELDS) {
    const v = (input as Record<string, unknown>)[k];
    if (typeof v === 'string') out[k] = v.slice(0, 200);
  }
  return out;
}

function ownsApplication(user: ApplicantAccount, app: PassportApplication) {
  const nrc = user.nrcNumber?.trim().toLowerCase();
  const email = user.email?.trim().toLowerCase();
  return Boolean(
    (nrc && app.nrcNumber?.trim().toLowerCase() === nrc) ||
    (email && app.contact?.email?.trim().toLowerCase() === email)
  );
}

// ---------- route ----------
// POST body:
//   { applicationReference?: string,
//     fields?: { phoneNumber?: string, ... },   // details typed into a form
//     applicantMessage?: string }               // free-text correction in chat
export function createDetailsCorrectionHandler(deps: DetailsCorrectionDeps) {
  return async (req: Request, res: Response) => {
    const user = deps.getApplicant(req);
    if (!user) return res.status(401).json({ success: false, error: 'A signed-in applicant account is required.' });

    const owned = deps.getApplications().filter(a => ownsApplication(user, a));
    const requestedRef = String(req.body?.applicationReference || '').trim();
    const application = requestedRef
      ? owned.find(a => a.trackingNumber === requestedRef)
      : [...owned].sort((a, b) => String(b.lastUpdated).localeCompare(String(a.lastUpdated)))[0];
    if (!application) return res.status(404).json({ success: false, error: 'No matching application was found for your account.' });

    const typedFields = pickFields(req.body?.fields);
    const applicantMessage = String(req.body?.applicantMessage || '').slice(0, 2000);
    if (!Object.keys(typedFields).length && !applicantMessage.trim()) {
      return res.status(400).json({ success: false, error: 'Send the details to check, or a message with your corrections.' });
    }

    const reference = application.trackingNumber;
    const knownErrors = knownErrorsFor(reference, deps.validationResults);
    const mode = knownErrors.length || applicantMessage.trim() ? 'correct_application' : 'validate_input';

    let result: N8nResult;
    try {
      result = await callValidationWebhook({
        mode,
        applicationReference: reference,
        fields: { ...applicationToFields(application), ...typedFields },
        knownErrors,
        applicantMessage,
      });
    } catch (error) {
      console.error('SmartGuide validation webhook failed:', error);
      return res.status(502).json({ success: false, error: 'Details could not be checked right now. Nothing was changed. Please try again shortly.' });
    }

    const body = result.body || {};
    let updates: FieldMap = {};
    if (result.httpStatus === 200 && body.status === 'accepted') {
      // Everything passed: save the corrections plus any typed fields in normalized form.
      updates = { ...pickFields(body.updatedFields) };
      for (const k of Object.keys(typedFields) as WorkflowField[]) {
        const normalized = body.normalizedFields?.[k];
        if (typeof normalized === 'string') updates[k] = normalized;
      }
    } else if (result.httpStatus === 422 && body.status === 'rejected') {
      // Some details refused: keep the corrections that did pass.
      updates = pickFields(body.acceptedCorrections);
    } else {
      console.error('Unexpected validation webhook response:', result.httpStatus, body);
      return res.status(502).json({ success: false, error: 'Details could not be checked right now. Nothing was changed.' });
    }

    const changedFields = (Object.keys(updates) as WorkflowField[])
      .filter(k => updates[k] !== applicationToFields(application)[k]);
    if (changedFields.length) {
      const updated = applyFieldsToApplication(application, updates);
      await deps.storeApplication(updated);
      clearResolvedIssues(reference, changedFields, deps.validationResults);
    }

    // Audit: field names and outcome only, no personal values.
    deps.audit({
      id: `details-correction-${reference}-${Date.now()}`,
      kind: 'APPLICANT_DETAILS_CORRECTION',
      applicationReference: reference,
      outcome: body.status,
      updatedFields: changedFields,
      rejectedFields: Array.isArray(body.errors) ? body.errors.map((e: any) => e.field) : [],
      receivedAt: new Date().toISOString(),
    });

    return res.status(result.httpStatus === 200 ? 200 : 422).json({
      success: result.httpStatus === 200,
      applicationReference: reference,
      updatedFields: changedFields,
      errors: body.errors || [],
      fieldGuidance: body.fieldGuidance || [],
      warnings: body.warnings || [],
      assistantMessage: body.assistantMessage || '',
    });
  };
}
