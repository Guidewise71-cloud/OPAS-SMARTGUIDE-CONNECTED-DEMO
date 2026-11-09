import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Sparkles, ArrowRight } from 'lucide-react';
import type { SmartValidationIssue, SmartValidationResult } from '../services/smartValidation';
import { issuesForStep, loadValidationResult } from '../services/smartValidation';

const IssueRow: React.FC<{ issue: SmartValidationIssue; onFix?: (step: number) => void }> = ({ issue, onFix }) => (
  <li className={`flex items-start gap-3 p-3 rounded-lg border text-xs ${issue.severity === 'error' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
    {issue.severity === 'error'
      ? <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
      : <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />}
    <div className="flex-1">
      <p className="font-semibold text-slate-900">
        {issue.fieldLabel}
        {issue.source === 'ai' && <span className="ml-2 text-[10px] font-medium text-violet-700">AI check</span>}
      </p>
      <p className="text-slate-700 mt-0.5">{issue.message}</p>
      <p className="text-slate-900 mt-1"><strong>How to fix:</strong> {issue.correction}</p>
    </div>
    {onFix && (
      <button type="button" onClick={() => onFix(issue.step)}
        className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white border border-slate-300 text-slate-800 font-semibold hover:bg-slate-50">
        Fix in {issue.stepName} <ArrowRight className="w-3 h-3" />
      </button>
    )}
  </li>
);

/** Full results view shown on Review & Declaration. */
export const SmartValidationPanel: React.FC<{
  result: SmartValidationResult | null;
  error?: string | null;
  loading?: boolean;
  onFix: (step: number) => void;
}> = ({ result, error, loading, onFix }) => {
  if (loading) return <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700">Smart Validation is checking your application…</div>;
  if (error) return (
    <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 text-xs text-amber-900">
      <strong>Smart Validation unavailable:</strong> {error} Your application has <strong>not</strong> been checked.
    </div>
  );
  if (!result) return null;

  const passed = result.status !== 'FAILED';
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4" aria-live="polite">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-emerald-800" />
        <h3 className="text-sm font-bold text-slate-900">Smart Validation results</h3>
      </div>
      {passed ? (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
          <CheckCircle className="w-4 h-4" />
          {result.status === 'PASSED' ? 'Validation passed. No errors were found.' : `Validation passed with ${result.warningCount} warning(s). Please review them before you continue.`}
        </div>
      ) : (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900">
          {result.errorCount} error(s) must be corrected before payment{result.warningCount ? `, plus ${result.warningCount} warning(s)` : ''}.
        </div>
      )}
      {result.issues.length > 0 && (
        <ul className="space-y-2">
          {result.issues.map((issue, i) => <IssueRow key={`${issue.code}-${issue.field}-${i}`} issue={issue} onFix={issue.step < 5 ? onFix : undefined} />)}
        </ul>
      )}
      <p className="text-[10px] text-slate-500">
        Checked {new Date(result.validatedAt).toLocaleString()} · {result.aiCheck.performed ? 'rules + AI consistency check' : 'rules only (AI check not available)'}
      </p>
    </section>
  );
};

/** Banner on Category/Personal/Travel/Documents listing what the applicant was sent back to fix. */
export const SmartValidationFixBanner: React.FC<{ referenceNumber: string; step: number }> = ({ referenceNumber, step }) => {
  const issues = issuesForStep(loadValidationResult(referenceNumber), step);
  if (!issues.length) return null;
  return (
    <section className="rounded-xl border border-red-200 bg-white p-4 space-y-2" role="alert">
      <p className="text-xs font-bold text-slate-900 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-emerald-800" /> Smart Validation found {issues.length} item(s) to correct on this page
      </p>
      <ul className="space-y-2">{issues.map((issue, i) => <IssueRow key={`${issue.code}-${i}`} issue={issue} />)}</ul>
      <p className="text-[10px] text-slate-500">After correcting, continue to Review & Declaration; validation runs again automatically.</p>
    </section>
  );
};
