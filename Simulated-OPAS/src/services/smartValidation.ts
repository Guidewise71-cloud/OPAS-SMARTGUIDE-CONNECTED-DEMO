// Browser client for Smart Validation (SmartGuide Application Error Detection Engine).
// Calls the Simulated OPAS server, which signs and forwards the request to SmartGuide.
import type { PassportApplication } from '../types/passport';

export interface SmartValidationIssue {
  code: string;
  category: string;
  severity: 'error' | 'warning';
  step: number;
  stepName: string;
  field: string;
  fieldLabel: string;
  message: string;
  correction: string;
  source: 'rules' | 'ai';
}

export interface SmartValidationResult {
  applicationReference: string;
  status: 'PASSED' | 'PASSED_WITH_WARNINGS' | 'FAILED';
  canProceed: boolean;
  validatedAt: string;
  errorCount: number;
  warningCount: number;
  firstErrorStep: number | null;
  issues: SmartValidationIssue[];
  aiCheck: { performed: boolean; reason?: string; issuesFound?: number };
}

export type SmartValidationOutcome =
  | { ok: true; result: SmartValidationResult }
  | { ok: false; error: string };

const storageKey = (ref: string) => `opas_smart_validation_${ref}`;

export async function validateApplication(app: PassportApplication, fetchImpl: typeof fetch = fetch): Promise<SmartValidationOutcome> {
  try {
    const response = await fetchImpl('/api/opas/validate-application', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ application: app }),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.success || !body.result) {
      return { ok: false, error: body?.error || `Smart Validation failed (HTTP ${response.status}).` };
    }
    saveValidationResult(body.result);
    return { ok: true, result: body.result };
  } catch (error: any) {
    return { ok: false, error: error?.message || 'Smart Validation service could not be reached.' };
  }
}

export function saveValidationResult(result: SmartValidationResult) {
  try { sessionStorage.setItem(storageKey(result.applicationReference), JSON.stringify(result)); } catch { /* storage full */ }
}

export function loadValidationResult(ref: string): SmartValidationResult | null {
  try {
    const raw = sessionStorage.getItem(storageKey(ref));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function issuesForStep(result: SmartValidationResult | null, step: number) {
  return (result?.issues || []).filter(i => i.step === step);
}
