// HTTP wiring for POST /api/integration/opas/validate-application.
// Kept outside server.ts so tests can mount it on a throwaway Express app.
import type { Request, Response } from 'express';
import { verifyOpasSignature } from './opasPaymentIntegration.ts';
import {
  runApplicationErrorDetection,
  validateApplicationValidationRequest,
  type AiConsistencyChecker,
  type ApplicationValidationResult,
  type ApplicationValidationIssue,
} from './applicationErrorEngine.ts';

export interface ValidationRouteOptions {
  getSecret: () => string | undefined;
  getAiChecker?: () => AiConsistencyChecker | undefined;
  onResult?: (result: ApplicationValidationResult) => void | Promise<void>;
  now?: () => Date;
}

/** Latest result per application reference (for the SmartGuide Smart Validation view). */
export const latestValidationResults = new Map<string, ApplicationValidationResult>();

export interface ValidationComparison {
  previousValidatedAt: string | null;
  resolvedIssues: ApplicationValidationIssue[];
  newIssues: ApplicationValidationIssue[];
  remainingIssues: ApplicationValidationIssue[];
}

const issueKey = (i: ApplicationValidationIssue) => `${i.code}|${i.field}`;

/** Compare a new result with the previously stored one for the same application. */
export function compareValidationResults(
  previous: ApplicationValidationResult | undefined,
  current: ApplicationValidationResult,
): ValidationComparison {
  if (!previous) {
    return { previousValidatedAt: null, resolvedIssues: [], newIssues: [], remainingIssues: [] };
  }
  const prevKeys = new Set(previous.issues.map(issueKey));
  const currKeys = new Set(current.issues.map(issueKey));
  return {
    previousValidatedAt: previous.validatedAt,
    resolvedIssues: previous.issues.filter(i => !currKeys.has(issueKey(i))),
    newIssues: current.issues.filter(i => !prevKeys.has(issueKey(i))),
    remainingIssues: current.issues.filter(i => prevKeys.has(issueKey(i))),
  };
}

export function createApplicationValidationHandler(options: ValidationRouteOptions) {
  return async (req: Request, res: Response) => {
    const rawBody = (req as any).rawBody as Buffer | undefined;
    const signature = verifyOpasSignature(
      options.getSecret(), rawBody, req.header('x-opas-timestamp'), req.header('x-opas-signature'), options.now?.(),
    );
    if (!signature.ok) return res.status(401).json({ success: false, error: signature.reason });

    const validated = validateApplicationValidationRequest(req.body);
    if (!validated.ok) return res.status(400).json({ success: false, errors: validated.errors });

    try {
      const result = await runApplicationErrorDetection(validated.value, {
        now: options.now?.(),
        aiChecker: options.getAiChecker?.(),
      });
      const comparison = compareValidationResults(latestValidationResults.get(result.applicationReference), result);
      latestValidationResults.set(result.applicationReference, result);
      await options.onResult?.(result);
      return res.json({ success: true, result, comparison });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: `Validation engine failed: ${error?.message || 'unknown error'}` });
    }
  };
}


