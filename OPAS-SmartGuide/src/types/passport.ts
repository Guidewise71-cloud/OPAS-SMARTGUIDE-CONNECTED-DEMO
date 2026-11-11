export type ApplicationStatus =
  | 'Draft'
  | 'Paid - Unsubmitted'
  | 'Submitted - Under Review'
  | 'Reverted'
  | 'Biometrics Scheduled'
  | 'Processing & Printing'
  | 'Ready for Collection'
  | 'Completed';

export type PassportType = '32-Page Ordinary' | '48-Page Frequent Traveler' | 'Diplomatic' | 'Official';

export type ServiceSpeed = 'Standard (14-21 days)' | 'Express Expedited (3-5 days)';

export interface ContactInfo {
  phone: string;
  phoneCountryCode: string;
  whatsappNumber?: string;
  whatsappOptIn?: boolean;
  whatsappVerified?: boolean;
  email: string;
  residentialAddress: string;
  district: string;
  province: string;

  // Structured Residential Address
  residentialCountry?: string;
  residentialProvince?: string;
  residentialDistrict?: string;
  residentialAreaVillage?: string;
  residentialPlotStreet?: string;
  residentialPostalCode?: string;

  // Postal Address
  sameAsResidential?: boolean;
  postalCountry?: string;
  postalProvince?: string;
  postalDistrict?: string;
  postalAreaVillage?: string;
  postalPoBox?: string;
  postalPostalCode?: string;
}

export interface GuarantorInfo {
  fullName: string;
  nrcNumber: string;
  profession: string;
  phoneNumber: string;
  organization: string;
  verified: boolean;
}

export const STANDARD_REQUIREMENTS = [
  "Copy of Applicant’s National Registration Card (NRC)",
  "Recent Passport-Size Photo",
] as const;

export const SERVICE_SPECIFIC_REQUIREMENTS = [
  "Form 'N' (Affidavit of Birth before Commissioner for Oaths)",
  "Form 'A' (Application for Zambian Passport 16+ Schedule)",
  "Full Passport Data Page",
  "Full Passport Last Stamped Page",
  "GRZ Receipt for the Police Report",
  "Expired Passport Data Page",
  "Proof of Passport Damage (e.g., upload Photos of Damaged Passport)",
  "Zambia Police Report",
  "Applicant's Birth Certificate",
  "Applicant’s Marriage Certificate (if married)",
  "Applicant’s Adoption Certificate",
  "Applicant’s Naturalization Certificate",
  "Applicant’s Bestowal Certificate",
  "Applicant’s Citizenship Registration Certificate",
  "Applicant’s previous passport copy (renewal)",
  "Letter of Consent from Guardian (if 18 years and below)",
  "Shortened Birth Certificate",
  "Parents NRC copies / Passports (for applicants under 16 years)",
] as const;

export type StandardRequirementType = (typeof STANDARD_REQUIREMENTS)[number];
export type ServiceSpecificRequirementType = (typeof SERVICE_SPECIFIC_REQUIREMENTS)[number];
export type OfficialDocumentType = StandardRequirementType | ServiceSpecificRequirementType | string;

export interface UploadedDocument {
  id: string;
  name: string;
  type: OfficialDocumentType;
  fileUrl?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'WARNING';
  uploadedAt: string;
  feedback?: string;
  aiScore?: number;
}

export interface NotificationLog {
  id: string;
  timestamp: string;
  channel: 'SMS' | 'WhatsApp' | 'Email' | 'OPAS Message Board';
  subject?: string;
  content: string;
  deliveryStatus: 'Queued' | 'Scheduled' | 'Failed' | 'Cancelled' | 'Sent' | 'Delivered' | 'Read' | 'Action Taken';
  scheduledAt?: string;
  failureReason?: string;
  actionTakenAt?: string;
  /** Immutable dispatch context retained for operational review. */
  auditId?: string;
  trigger?: 'MANUAL_OFFICER' | 'BULK_REMINDER' | 'AUTOMATED_WORKFLOW' | 'CITIZEN_ACTION' | 'SMARTGUIDE_PAYMENT_DETECTION';
  dispatchedBy?: {
    userId: string;
    name: string;
    role: 'citizen' | 'officer' | 'supervisor' | 'admin' | 'system';
  };
  deliveryUpdatedAt?: string;
  auditTrail?: NotificationAuditEvent[];
}

export interface NotificationAuditEvent {
  id: string;
  timestamp: string;
  event: 'CREATED' | 'DISPATCHED' | 'DELIVERED' | 'READ' | 'ACTION_TAKEN' | 'FAILED' | 'CANCELLED';
  actor: string;
  details: string;
}

export interface ApplicationLifecycleEvent {
  id: string;
  type: 'APPLICATION_CREATED' | 'PAYMENT_CONFIRMED' | 'SUBMITTED' | 'OFFICER_ASSIGNED' | 'OFFICER_REVIEW_STARTED' | 'REVERTED' | 'RESUBMITTED' | 'BIOMETRICS_SCHEDULED' | 'PROCESSING_STARTED' | 'READY_FOR_COLLECTION' | 'COMPLETED' | 'STATUS_UPDATED';
  title: string;
  description: string;
  timestamp: string;
  actorId?: string;
  actorName?: string;
  actorRole?: 'citizen' | 'officer' | 'supervisor' | 'admin' | 'system';
}

export interface PassportApplication {
  id: string;
  trackingNumber: string; // e.g., ZAM-OPAS-2026-8492
  nrcNumber: string; // format: 123456/78/1
  fullName: string;
  dateOfBirth: string;
  gender: 'Male' | 'Female';
  placeOfBirth: string;
  passportType: PassportType;
  serviceSpeed: ServiceSpeed;
  feeAmount: number;
  feePaid: boolean;
  paymentReference?: string;
  paidAt?: string;
  status: ApplicationStatus;
  submissionStatus?: 'SUBMITTED' | 'NOT_SUBMITTED';
  daysInStatus: number;
  reversionReason?: string;
  revertedItems?: string[];
  revertedAt?: string;
  contact: ContactInfo;
  guarantor: GuarantorInfo;
  documents: UploadedDocument[];
  notifications: NotificationLog[];
  officerNotes?: string;
  /** Append-only workflow events used for applicant tracking and operational reporting. */
  lifecycleEvents?: ApplicationLifecycleEvent[];
  /** Optional, explicitly recorded case ownership and workflow timestamps for operational monitoring. */
  assignedOfficer?: string;
  assignedAt?: string;
  firstReviewedAt?: string;
  lastOfficerActionAt?: string;
  waitingForApplicantSince?: string;
  lastUpdated: string;
  biometricsDate?: string;
  collectionOffice: string;
  isUrgent?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
  suggestions: Record<string, string>;
}

export interface AITriageAnalysis {
  urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  rootCauseAnalysis: string;
  recommendedAction: string;
  channelRecommendation: 'SMS' | 'EMAIL' | 'DIRECT_CALL' | 'AUTO_BOARD';
  slaAgingAlert: boolean;
  dataIntegrityScore: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  audioBase64?: string;
  groundingSources?: { title: string; url: string }[];
  isLiveGrounded?: boolean;
  provider?: 'gemini-api' | 'deepseek' | 'vertex-ai' | 'local';
}
