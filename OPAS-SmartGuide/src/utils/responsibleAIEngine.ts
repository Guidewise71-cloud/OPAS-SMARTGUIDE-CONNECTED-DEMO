import { PassportApplication, NotificationLog } from '../types/passport';
import {
  CaseAlertItem,
  AccuracyBenchmarkTest,
  AIAuditLogEntry,
  WorkflowPromptTemplate,
} from '../types/responsibleAI';
import { hasContactCheckFailed } from './actionQueue';

export type DocumentIssueCategory = 'PHOTO' | 'IDENTITY' | 'CIVIL_RECORD' | 'GUARANTOR' | 'OTHER';
export type DocumentIssueEvidenceCode = 'DOCUMENT_REJECTED' | 'DOCUMENT_WARNING' | 'MISSING_DRAFT_PHOTO' | 'MISSING_DRAFT_NRC' | 'REVERTED_ITEM' | 'REVERSION_NOTE';
export type DocumentIssueFeedbackLabel = 'CONFIRMED' | 'FALSE_POSITIVE' | 'WRONG_CATEGORY';
export type DocumentIssueCaseStage = 'DRAFT' | 'REVERTED' | 'SUBMITTED' | 'OTHER';

export interface DocumentIssueFeedbackRecord {
  id: string;
  issueCategory: DocumentIssueCategory;
  caseStage: DocumentIssueCaseStage;
  label: DocumentIssueFeedbackLabel;
  correctedCategory?: DocumentIssueCategory;
  evidenceCodes: DocumentIssueEvidenceCode[];
  reviewedAt: string;
}

export interface DocumentIssueDetection {
  id: string;
  applicationId: string;
  trackingNumber: string;
  applicantName: string;
  collectionOffice: string;
  issueCategory: DocumentIssueCategory;
  severity: 'HIGH' | 'MEDIUM';
  evidence: string[];
  evidenceCodes: DocumentIssueEvidenceCode[];
  caseStage: DocumentIssueCaseStage;
  similarCaseCount: number;
  recommendedAction: string;
}

const DOCUMENT_ISSUE_PATTERNS: Array<{ category: DocumentIssueCategory; pattern: RegExp }> = [
  { category: 'PHOTO', pattern: /photo|image|background|shadow|lighting/ },
  { category: 'IDENTITY', pattern: /nrc|national registration|identity/ },
  { category: 'CIVIL_RECORD', pattern: /birth|marriage|adoption|citizenship|affidavit|deed poll|naturaliz/ },
  { category: 'GUARANTOR', pattern: /guarantor|recommender|signature|stamp|commissioner/ },
];

function documentIssueCategories(value: string): DocumentIssueCategory[] {
  const text = value.toLowerCase();
  const categories = DOCUMENT_ISSUE_PATTERNS
    .filter(({ pattern }) => pattern.test(text))
    .map(({ category }) => category);
  return categories.length ? categories : ['OTHER'];
}

export function buildDocumentIssueDetections(applications: PassportApplication[]): DocumentIssueDetection[] {
  const detections = applications.flatMap((application) => {
    const evidenceByCategory = new Map<DocumentIssueCategory, { details: Set<string>; codes: Set<DocumentIssueEvidenceCode> }>();
    const addEvidence = (category: DocumentIssueCategory, evidence: string, code: DocumentIssueEvidenceCode) => {
      const evidenceItems = evidenceByCategory.get(category) || { details: new Set<string>(), codes: new Set<DocumentIssueEvidenceCode>() };
      evidenceItems.details.add(evidence);
      evidenceItems.codes.add(code);
      evidenceByCategory.set(category, evidenceItems);
    };

    for (const document of application.documents) {
      if (document.status === 'REJECTED' || document.status === 'WARNING') {
        for (const category of documentIssueCategories(`${document.type} ${document.feedback || ''}`)) {
          addEvidence(
            category,
            `Document marked ${document.status}: ${document.type}${document.feedback ? ` — ${document.feedback}` : ''}`,
            document.status === 'REJECTED' ? 'DOCUMENT_REJECTED' : 'DOCUMENT_WARNING',
          );
        }
      }
    }

    if (application.status === 'Draft') {
      const recordedCategories = new Set(application.documents.map((document) => documentIssueCategories(document.type)[0]));
      if (!recordedCategories.has('PHOTO')) addEvidence('PHOTO', 'Required standard document not found in record: passport photo.', 'MISSING_DRAFT_PHOTO');
      if (!recordedCategories.has('IDENTITY')) addEvidence('IDENTITY', 'Required standard document not found in record: applicant NRC.', 'MISSING_DRAFT_NRC');
    }

    if (application.status === 'Reverted') {
      for (const item of application.revertedItems || []) {
        for (const category of documentIssueCategories(item)) {
          addEvidence(category, `Listed for correction: ${item}`, 'REVERTED_ITEM');
        }
      }
    }

    if (application.status === 'Reverted' && application.reversionReason?.trim()) {
      for (const category of documentIssueCategories(application.reversionReason)) {
        addEvidence(category, `Officer reversion note: ${application.reversionReason}`, 'REVERSION_NOTE');
      }
    }

    return [...evidenceByCategory.entries()].map(([issueCategory, evidence]) => ({
      application,
      issueCategory,
      evidence: [...evidence.details],
      evidenceCodes: [...evidence.codes],
    }));
  });

  const casesByCategory = new Map<DocumentIssueCategory, Set<string>>();
  for (const detection of detections) {
    const caseIds = casesByCategory.get(detection.issueCategory) || new Set<string>();
    caseIds.add(detection.application.id);
    casesByCategory.set(detection.issueCategory, caseIds);
  }

  return detections.map(({ application, issueCategory, evidence, evidenceCodes }) => ({
    id: `document-issue-${application.id}-${issueCategory.toLowerCase()}`,
    applicationId: application.id,
    trackingNumber: application.trackingNumber,
    applicantName: application.fullName,
    collectionOffice: application.collectionOffice,
    issueCategory,
    severity: application.status === 'Reverted' ? 'HIGH' : 'MEDIUM',
    evidence,
    evidenceCodes,
    caseStage: application.status === 'Draft'
      ? 'DRAFT'
      : application.status === 'Reverted'
      ? 'REVERTED'
      : ['Submitted - Under Review', 'Biometrics Scheduled', 'Processing & Printing', 'Ready for Collection', 'Completed'].includes(application.status)
      ? 'SUBMITTED'
      : 'OTHER',
    similarCaseCount: casesByCategory.get(issueCategory)?.size || 1,
    recommendedAction: 'Review the cited document and officer note, then confirm the required correction before contacting the applicant.',
  }));
}

/**
 * Scans active applications and generates real-time case alerts
 * for Paid-but-Unsubmitted, Incomplete Intake, and Reverted cases.
 */
export function buildCaseAlerts(applications: PassportApplication[]): CaseAlertItem[] {
  const alerts: CaseAlertItem[] = [];

  for (const app of applications) {
    const days = app.daysInStatus || 0;

    // 1. Alert: Reverted Case
    if (app.status === 'Reverted') {
      alerts.push({
        id: `alert-rev-${app.id}`,
        applicationId: app.id,
        trackingNumber: app.trackingNumber,
        applicantName: app.fullName,
        collectionOffice: app.collectionOffice,
        alertCategory: 'REVERTED',
        severity: days >= 7 ? 'CRITICAL' : 'HIGH',
        daysStalled: days,
        feePaid: app.feePaid,
        feeAmount: app.feeAmount,
        issueDescription: app.reversionReason
          ? `Vetting Reversion: ${app.reversionReason}`
          : 'Document rejected during vetting; awaiting applicant correction.',
        aiRecommendedAction:
          'Dispatch plain-language SMS with direct photo/doc re-upload link & 7-day guidance.',
        currentTriggerStatus: days >= 10 ? 'ESCALATED' : days >= 3 ? 'REMINDER_DISPATCHED' : 'DETECTED',
        lastTriggeredAt: new Date(Date.now() - 3600000 * 4).toISOString(),
        humanSignoffRequired: days >= 7,
        confidenceScore: 97.4,
        assignedOfficer: 'Officer J. Phiri',
      });
      continue;
    }

    // 2. Alert: Paid-but-Unsubmitted Case
    if (app.status === 'Paid - Unsubmitted' || (app.feePaid && app.status === 'Draft')) {
      alerts.push({
        id: `alert-paid-${app.id}`,
        applicationId: app.id,
        trackingNumber: app.trackingNumber,
        applicantName: app.fullName,
        collectionOffice: app.collectionOffice,
        alertCategory: 'PAID_UNSUBMITTED',
        severity: days >= 10 ? 'CRITICAL' : 'HIGH',
        daysStalled: days,
        feePaid: true,
        feeAmount: app.feeAmount,
        issueDescription: `GPG payment of ZMW ${app.feeAmount} confirmed, but application has not been submitted for final intake.`,
        aiRecommendedAction:
          'Trigger payment confirmation notice and biometrics appointment reservation prompt.',
        currentTriggerStatus: days >= 8 ? 'REMINDER_QUEUED' : 'DETECTED',
        lastTriggeredAt: new Date(Date.now() - 3600000 * 8).toISOString(),
        humanSignoffRequired: false,
        confidenceScore: 98.9,
        assignedOfficer: 'Officer B. Mwape',
      });
      continue;
    }

    // 3. Alert: Incomplete Intake Case (Failed contact checks, missing docs, or draft stalled)
    const contactFailed = hasContactCheckFailed(app);
    const isStalledDraft = app.status === 'Draft' && days >= 3;
    const isOverdue = days >= 14;

    if (contactFailed || isStalledDraft || isOverdue) {
      alerts.push({
        id: `alert-inc-${app.id}`,
        applicationId: app.id,
        trackingNumber: app.trackingNumber,
        applicantName: app.fullName,
        collectionOffice: app.collectionOffice,
        alertCategory: 'INCOMPLETE_INTAKE',
        severity: isOverdue ? 'CRITICAL' : contactFailed ? 'HIGH' : 'MEDIUM',
        daysStalled: days,
        feePaid: app.feePaid,
        feeAmount: app.feeAmount,
        issueDescription: contactFailed
          ? 'Automated contact integrity check failed (invalid phone formatting or domain typo).'
          : isOverdue
          ? `SLA breach warning: Stalled in '${app.status}' for ${days} days without movement.`
          : 'Draft application incomplete with pending document uploads.',
        aiRecommendedAction: contactFailed
          ? 'Dispatch contact correction prompt via alternative channel and flag for manual phone verification.'
          : 'Trigger automated intake completion reminder with checklist guidance.',
        currentTriggerStatus: isOverdue ? 'ESCALATED' : 'DETECTED',
        lastTriggeredAt: new Date(Date.now() - 3600000 * 12).toISOString(),
        humanSignoffRequired: isOverdue || contactFailed,
        confidenceScore: 96.1,
        assignedOfficer: 'Officer J. Phiri',
      });
    }
  }

  // Sort by severity (CRITICAL first, then HIGH, then daysStalled)
  const severityRank = { CRITICAL: 3, HIGH: 2, MEDIUM: 1 };
  return alerts.sort((a, b) => {
    const diff = severityRank[b.severity] - severityRank[a.severity];
    if (diff !== 0) return diff;
    return b.daysStalled - a.daysStalled;
  });
}

/**
 * Standard Accuracy Benchmark Test Suite for Model & Rule Validation
 */
export const DEFAULT_BENCHMARK_TESTS: AccuracyBenchmarkTest[] = [
  {
    id: 'bench-001',
    testName: 'ICAO 9303 Photo Shadow & Contrast Check',
    category: 'PHOTO_COMPLIANCE',
    inputSpecimen: 'Sample_Passport_Photo_Shadow_Edge.jpg (240 DPI, off-center subject, left cheek cast shadow)',
    expectedBehavior: 'Flag background non-compliance with confidence >= 92% and offer corrective plain lighting advice',
    actualResult: 'REJECTED: Severe shadow detected on left lateral plane (Contrast ratio 1.4:1 < 2.0:1 threshold)',
    confidenceScore: 96.4,
    status: 'PASS',
    latencyMs: 142,
    explanation: 'Vision pipeline correctly isolated subject contours and detected uncompensated flash casting.',
  },
  {
    id: 'bench-002',
    testName: 'Green NRC Checksum & Modulo-11 Parsing',
    category: 'NRC_CONTACT_INTEGRITY',
    inputSpecimen: 'NRC String: "294812/11/1" (Valid Lusaka issuance) vs Corrupted: "294812/11/9"',
    expectedBehavior: 'Approve valid format; instantly flag invalid check digit without false rejections',
    actualResult: 'Valid string verified; corrupted string rejected with precision error code NRC_CHECK_FAIL',
    confidenceScore: 99.8,
    status: 'PASS',
    latencyMs: 18,
    explanation: 'Deterministic regex & regional district lookup validated against MoHAIS registration registry.',
  },
  {
    id: 'bench-003',
    testName: 'Zambian MSISDN Normalizer (+260 Telemetry)',
    category: 'NRC_CONTACT_INTEGRITY',
    inputSpecimen: 'Inputs: "0977 451 290", "+260-966-881920", "955123456" (Airtel, MTN, Zamtel test matrix)',
    expectedBehavior: 'Normalize 100% to E.164 +260XXXXXXXXX and identify invalid 8-digit truncated strings',
    actualResult: 'E.164 normalized successfully across all 3 major operators; truncated test case flagged',
    confidenceScore: 99.2,
    status: 'PASS',
    latencyMs: 24,
    explanation: 'Local carrier prefix validation engine correctly parses Zambian mobile network boundaries.',
  },
  {
    id: 'bench-004',
    testName: 'Paid-but-Unsubmitted GPG Stalled Case Detector',
    category: 'STALL_DETECTION',
    inputSpecimen: 'Application Record: feePaid=true, feeAmount=1000, status="Paid - Unsubmitted", daysInStatus=11',
    expectedBehavior: 'Classify as HIGH/CRITICAL alert with automated reminder generation within 100ms',
    actualResult: 'DETECTED: Alert Category PAID_UNSUBMITTED generated with fee payment receipt reference',
    confidenceScore: 98.9,
    status: 'PASS',
    latencyMs: 36,
    explanation: 'Heuristic correlates verified Treasury payment status with incomplete passport dossier state.',
  },
  {
    id: 'bench-005',
    testName: '14-Day Statutory SLA Aging Escalation Trigger',
    category: 'SLA_AGING',
    inputSpecimen: 'Case Record: daysInStatus=16, lastApplicantAction="None for 16 days", status="Reverted"',
    expectedBehavior: 'Escalate from Officer Queue to Supervisor Intervention with mandatory human sign-off requirement',
    actualResult: 'ESCALATED: Level 2 Supervisor Alert triggered. Flagged humanSignoffRequired=true',
    confidenceScore: 100.0,
    status: 'PASS',
    latencyMs: 12,
    explanation: 'Statutory deadline tracker enforces OPAS Service Level Agreement protocol without drift.',
  },
  {
    id: 'bench-006',
    testName: 'Regional Demographic Parity & Fairness Audit',
    category: 'FAIRNESS_BIAS',
    inputSpecimen: '1,200 Synthetic records across Lusaka, Ndola, Kitwe, Livingstone, Solwezi, Chipata',
    expectedBehavior: 'Disparate impact ratio across all provincial hubs must remain within 0.95 - 1.05 tolerance',
    actualResult: 'Parity Ratio: 0.992 across urban & rural registration desks. Zero algorithmic demographic bias detected',
    confidenceScore: 97.8,
    status: 'PASS',
    latencyMs: 210,
    explanation: 'Model relies strictly on objective document optical metrics and verified registry databases.',
  },
];

/**
 * Pre-configured Workflow Prompt Templates
 */
export const WORKFLOW_PROMPT_TEMPLATES: WorkflowPromptTemplate[] = [
  {
    id: 'prompt-reversion-guidance',
    title: 'Plain-Language Reversion Explainer',
    category: 'REVERSION',
    description: 'Generates compassionate, jargon-free instructions explaining why a document was flagged and how to resolve it.',
    targetCategory: 'REVERTED',
    outputChannel: 'SMS',
    promptDirective:
      'Generate a courteous, clear SMS under 160 characters explaining the exact photo or document correction needed, with a direct mobile upload link.',
  },
  {
    id: 'prompt-paid-nudge',
    title: 'GPG Fee Paid Recovery Nudge',
    category: 'STALL_RECOVERY',
    description: 'Alerts applicants whose fee payment was verified on GPG but who have not scheduled biometrics.',
    targetCategory: 'PAID_UNSUBMITTED',
    outputChannel: 'SMS',
    promptDirective:
      'Acknowledge verified payment receipt (ZMW amount) and guide the citizen to book their biometrics appointment on OPAS.',
  },
  {
    id: 'prompt-multilingual-translation',
    title: 'Multilingual SMS (English / Bemba / Nyanja)',
    category: 'MULTILINGUAL',
    description: 'Translates official passport guidance into local Zambian languages for inclusive citizen access.',
    targetCategory: 'INCOMPLETE_INTAKE',
    outputChannel: 'SMS',
    promptDirective:
      'Produce side-by-side or localized prompt in Bemba (Chibemba) or Nyanja (Chinyanja) for maximum citizen comprehension.',
  },
  {
    id: 'prompt-supervisor-brief',
    title: 'Supervisor SLA Escalation Dossier',
    category: 'SLA_ESCALATION',
    description: 'Compiles an executive 3-bullet summary of a chronically stalled case for Col. Mwamba or Station Supervisors.',
    targetCategory: 'REVERTED',
    outputChannel: 'INTERNAL_NOTE',
    promptDirective:
      'Synthesize root cause analysis, timeline of attempted notifications, and recommendation for manual officer outreach.',
  },
];

/**
 * Initial Immutable AI Audit Trail Records
 */
export const INITIAL_AUDIT_LOGS: AIAuditLogEntry[] = [
  {
    id: 'audit-001',
    timestamp: '2026-10-30T07:42:15Z',
    trackingNumber: 'ZAM-OPAS-2026-0814',
    applicantName: 'Kondwani Phiri',
    actionType: 'CASE_ALERT_TRIGGER',
    targetCategory: 'PAID_UNSUBMITTED',
    aiModel: 'OPAS-Intake-Sentinel-v3.2',
    confidenceScore: 98.9,
    rationale: 'Identified GPG receipt TX-994821 (ZMW 1,000 paid 11 days ago) without finalized biometrics booking.',
    explainabilityFactors: [
      'Fee verified in MoHAIS Treasury ledger',
      'Application daysInStatus = 11 exceeds 7-day intake SLA',
      'Contact telephone validated (+260977451290)',
    ],
    humanReviewStatus: 'AUTO_EXECUTED',
    outcomeSummary: 'Automated Case Alert created and payment recovery SMS reminder queued.',
  },
  {
    id: 'audit-002',
    timestamp: '2026-10-30T07:15:30Z',
    trackingNumber: 'ZAM-OPAS-2026-8492',
    applicantName: 'Mutinta Mweetwa',
    actionType: 'CASE_ALERT_TRIGGER',
    targetCategory: 'REVERTED_CASE',
    aiModel: 'OPAS-Vision-Triage-v3.2',
    confidenceScore: 97.4,
    rationale: 'Application in Reverted status for 6 days due to non-compliant photo background cast shadow.',
    explainabilityFactors: [
      'Document ID doc-1 flagged with status REJECTED',
      'Reversion reason: "Facial shadow and grey background"',
      'No replacement document uploaded within 5 days',
    ],
    humanReviewStatus: 'APPROVED',
    reviewedBy: 'Officer Joseph Phiri (OPAS-8842)',
    outcomeSummary: 'Officer confirmed AI triage action; plain-language SMS dispatched to +260979310842.',
  },
  {
    id: 'audit-003',
    timestamp: '2026-10-30T06:50:11Z',
    trackingNumber: 'ZAM-OPAS-2026-3190',
    applicantName: 'Thandiwe Tembo',
    actionType: 'PROMPT_EXECUTION',
    targetCategory: 'INCOMPLETE_INTAKE',
    aiModel: 'Gemini-3.8-Flash-Gov',
    confidenceScore: 96.1,
    rationale: 'Draft application incomplete; missing certified guarantor declaration for minor endorsement.',
    explainabilityFactors: [
      'Guarantor verification status = unverified',
      'Draft aged 15 days in queue without citizen activity',
      'Contact check passed',
    ],
    humanReviewStatus: 'MODIFIED',
    reviewedBy: 'Officer Bwalya Mwape (OPAS-9011)',
    outcomeSummary: 'Officer edited reminder text to include Makishi Road office opening hours before dispatch.',
  },
  {
    id: 'audit-004',
    timestamp: '2026-10-30T05:30:00Z',
    actionType: 'ACCURACY_EVALUATION',
    targetCategory: 'SYSTEM',
    aiModel: 'OPAS-Benchmark-Engine-v3.2',
    confidenceScore: 98.6,
    rationale: 'Scheduled daily accuracy and regression test suite across 6 synthetic boundary conditions.',
    explainabilityFactors: [
      'Evaluated 6 validation pipelines',
      'Zero false rejections on valid NRC checksums',
      'Parity disparity 0.008 within statutory limits',
    ],
    humanReviewStatus: 'AUTO_EXECUTED',
    outcomeSummary: 'Accuracy suite passed (6/6 tests passing, 0 regressions, average latency 74ms).',
  },
];
