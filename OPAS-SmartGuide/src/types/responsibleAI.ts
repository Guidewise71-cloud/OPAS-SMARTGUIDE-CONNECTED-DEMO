export type CaseAlertCategory = 'PAID_UNSUBMITTED' | 'INCOMPLETE_INTAKE' | 'REVERTED';

export type AlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM';

export type AlertExecutionStatus =
  | 'DETECTED'
  | 'PROMPT_GENERATED'
  | 'REMINDER_QUEUED'
  | 'REMINDER_DISPATCHED'
  | 'ESCALATED'
  | 'HUMAN_RESOLVED';

export interface CaseAlertItem {
  id: string;
  applicationId: string;
  trackingNumber: string;
  applicantName: string;
  collectionOffice: string;
  alertCategory: CaseAlertCategory;
  severity: AlertSeverity;
  daysStalled: number;
  feePaid: boolean;
  feeAmount: number;
  issueDescription: string;
  aiRecommendedAction: string;
  currentTriggerStatus: AlertExecutionStatus;
  lastTriggeredAt?: string;
  humanSignoffRequired: boolean;
  confidenceScore: number;
  assignedOfficer?: string;
}

export interface AccuracyBenchmarkTest {
  id: string;
  testName: string;
  category: 'PHOTO_COMPLIANCE' | 'NRC_CONTACT_INTEGRITY' | 'STALL_DETECTION' | 'SLA_AGING' | 'FAIRNESS_BIAS';
  inputSpecimen: string;
  expectedBehavior: string;
  actualResult: string;
  confidenceScore: number;
  status: 'PASS' | 'FAIL' | 'WARNING';
  latencyMs: number;
  explanation: string;
}

export type AIAuditActionType =
  | 'CASE_ALERT_TRIGGER'
  | 'ACCURACY_EVALUATION'
  | 'PROMPT_EXECUTION'
  | 'REMINDER_DISPATCH'
  | 'SLA_ESCALATION'
  | 'HUMAN_OVERRIDE'
  | 'HUMAN_APPROVAL';

export interface AIAuditLogEntry {
  id: string;
  timestamp: string;
  applicationId?: string;
  trackingNumber?: string;
  applicantName?: string;
  actionType: AIAuditActionType;
  targetCategory: 'PAID_UNSUBMITTED' | 'INCOMPLETE_INTAKE' | 'REVERTED_CASE' | 'SLA_BREACH' | 'SYSTEM';
  aiModel: string;
  confidenceScore: number;
  rationale: string;
  explainabilityFactors: string[];
  humanReviewStatus: 'APPROVED' | 'MODIFIED' | 'OVERRIDDEN' | 'PENDING' | 'AUTO_EXECUTED';
  reviewedBy?: string;
  outcomeSummary: string;
}

export interface WorkflowPromptTemplate {
  id: string;
  title: string;
  category: 'REVERSION' | 'STALL_RECOVERY' | 'SLA_ESCALATION' | 'MULTILINGUAL' | 'AUDIT';
  description: string;
  promptDirective: string;
  targetCategory: CaseAlertCategory;
  outputChannel: 'SMS' | 'EMAIL' | 'INTERNAL_NOTE';
}
