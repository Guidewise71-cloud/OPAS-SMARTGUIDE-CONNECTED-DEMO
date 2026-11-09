export type ApplicationStatus =
  | 'DRAFT'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_COMPLETED'
  | 'PAID_UNSUBMITTED'
  | 'REVERTED_ACTION_REQUIRED'
  | 'BIOMETRICS_SCHEDULED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'PRINTED'
  | 'READY_FOR_COLLECTION';

export type ApplicationType = 'NEW' | 'RENEWAL' | 'REPLACEMENT_LOST';
export type BookletType = 'STANDARD_32' | 'FREQUENT_48';
export type ProcessingSpeed = 'STANDARD' | 'EXPRESS' | 'URGENT_24H';

export interface ApplicantUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  nrcNumber: string; // Zambian National Registration Card: e.g. 123456/78/1
  dateOfBirth: string;
  createdAt: string;
}

export type ZambianProvince =
  | 'Lusaka'
  | 'Copperbelt'
  | 'Central'
  | 'Southern'
  | 'Eastern'
  | 'Western'
  | 'Northern'
  | 'Luapula'
  | 'Muchinga'
  | 'North-Western';

export interface PersonalDetails {
  surname: string;
  givenNames: string;
  maidenName?: string;
  gender: 'MALE' | 'FEMALE';
  maritalStatus: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';
  dateOfBirth: string;
  placeOfBirthTown: string;
  placeOfBirthDistrict: string;
  placeOfBirthProvince: ZambianProvince | 'Abroad';
  nationality: string;
  citizenshipAcquiredBy: 'BIRTH' | 'DESCENT' | 'NATURALIZATION' | 'REGISTRATION';
  nrcNumber: string; // e.g. 349120/11/1
  village: string; // Chiefdom / Ancestral Village
  chief: string; // Traditional Chief
  districtOfOrigin: string;
  fatherFullName: string;
  fatherNrc: string;
  motherFullName: string;
  motherNrc: string;
  occupation: string;
  heightCm: number;
  eyeColor: 'BROWN' | 'BLACK' | 'HAZEL' | 'OTHER';
  hairColor: 'BLACK' | 'BROWN' | 'GREY';
  visibleMarks?: string;
  residentialAddress: string;
  townCity: string;
  province: ZambianProvince;
  mobilePhone: string;
  email: string;
  emergencyName: string;
  emergencyRelation: string;
  emergencyPhone: string;
  emergencyAddress: string;
}

export interface PreviousPassportDetails {
  hasPreviousPassport: boolean;
  passportNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  issuingAuthority?: string;
  lossReason?: string;
  policeReportRef?: string;
}

export interface PhotoComplianceReport {
  neutralBackground: boolean;
  eyesVisible: boolean;
  centered: boolean;
  lightingGood: boolean;
  scorePercent: number;
}

export interface UploadedDoc {
  id: string;
  name: string;
  type: string;
  sizeKb: number;
  dataUrl?: string;
  uploadedAt: string;
  verified: boolean;
  compliance?: PhotoComplianceReport;
}

export interface DocumentCollection {
  nrcFrontBack?: UploadedDoc; // Green NRC Scan
  birthCertificate?: UploadedDoc; // Certified Zambian Birth Certificate
  passportPhoto?: UploadedDoc; // Biometric Headshot
  parentsNrcOrAffidavit?: UploadedDoc; // Parents' NRC / Supporting Proof
  previousPassportScan?: UploadedDoc; // If renewal
}

export interface FeeBreakdown {
  baseFee: number; // in ZMW (Kwacha)
  bookletFee: number;
  speedFee: number;
  biometricProcessingFee: number;
  tax: number;
  total: number;
}

export type ZambianPaymentMethod =
  | 'AIRTEL_MONEY'
  | 'MTN_MOMO'
  | 'ZAMTEL_KWACHA'
  | 'CREDIT_DEBIT_CARD';

export interface PaymentDetails {
  status: 'UNPAID' | 'PROCESSING' | 'PAID' | 'FAILED';
  amount: number;
  breakdown: FeeBreakdown;
  transactionId?: string;
  paymentMethod?: ZambianPaymentMethod;
  receiptNumber?: string;
  paidAt?: string;
  mobileMoneyNumber?: string;
  cardLast4?: string;
  cardBrand?: string;
}

export interface BiometricAppointment {
  officeId: string;
  officeName: string;
  province: string;
  address: string;
  appointmentDate: string;
  appointmentTimeSlot: string;
  confirmationCode: string;
  bookedAt: string;
}

export interface PassportApplication {
  id: string;
  referenceNumber: string; // e.g. ZM-PAS-2026-894102
  userId: string;
  createdAt: string;
  updatedAt: string;
  status: ApplicationStatus;
  currentStep: number;
  applicationType: ApplicationType;
  bookletType: BookletType;
  processingSpeed: ProcessingSpeed;
  personalDetails: PersonalDetails;
  previousPassportDetails: PreviousPassportDetails;
  documents: DocumentCollection;
  declaration: {
    agreed: boolean;
    digitalSignature: string;
    signedAt?: string;
  };
  payment: PaymentDetails;
  appointment?: BiometricAppointment;
  officerNotes?: string;
  revertDetails?: {
    revertedAt: string;
    officerName: string;
    department: string;
    reason: string;
    requiredCorrection: string;
    deadlineDate: string;
    caseNumber: string;
  };
  contactIssues?: {
    emailIssue?: string;
    phoneIssue?: string;
    deliveryBounced?: boolean;
    lastAttemptTimestamp?: string;
  };
  incompleteIssues?: {
    missingFields: string[];
    incorrectInfo?: string;
    warningText: string;
  };
  unsubmittedDetails?: {
    paidAt: string;
    daysPending: number;
    reminderDispatched: boolean;
  };
  statusHistory: {
    status: ApplicationStatus;
    timestamp: string;
    note: string;
    updatedBy: string;
  }[];
}

export interface PassportOffice {
  id: string;
  name: string;
  province: ZambianProvince;
  town: string;
  address: string;
  operatingHours: string;
}

export interface GovernmentGatewayPayload {
  amount: number; // e.g. 500
  currency: 'ZMW';
  applicationReference: string;
  payerName: string;
  payerNrc: string;
  payerPhone: string;
  paymentChannel: ZambianPaymentMethod;
  notes?: string;
}

export interface GovernmentPaymentConfirmation {
  applicationReference: string;
  transactionReference: string; // e.g. TXN-GRZ-2026-89412
  paymentRegistrationNumber: string; // e.g. PRN-2026-00491
  biller: string; // "Republic of Zambia - Ministry of Home Affairs & Internal Security (DNRPC)"
  amount: number; // e.g. 500
  currency: 'ZMW';
  payerName: string;
  payerNrc: string;
  paymentChannel: ZambianPaymentMethod;
  status: 'CONFIRMED' | 'PAID';
  timestamp: string; // ISO string
  approvalCode: string;
  digitalReceiptHash: string;
}

export interface OpasPaymentApiRecord {
  id: string; // ledger record ID e.g. LEDGER-ZM-2026-0031
  transactionReference: string;
  applicationReference: string;
  paymentStatus: 'PAID' | 'CONFIRMED' | 'FAILED';
  timestamp: string; // ISO string
  amount: number;
  currency: 'ZMW';
  payerName?: string;
  payerNrc?: string;
  paymentMethod?: string;
  paymentRegistrationNumber?: string;
  approvalCode?: string;
  digitalReceiptHash?: string;
  gatewayBiller?: string;
  gatewayConfirmationStatus?: 'PAID' | 'CONFIRMED';
  opasAcknowledgementReference?: string;
  opasConfirmationStatus?: 'RECEIVED_AND_RECORDED';
  opasReceivedAt?: string;
  smartGuideAcknowledgementReference?: string;
  smartGuideReceived?: boolean;
  apiEndpoint: string; // e.g. '/api/payment/process'
  receivedAt: string;
  storedInLedger: boolean;
}

export interface OpasPaymentApiResponse {
  success: boolean;
  message: string;
  timestamp: string;
  record: OpasPaymentApiRecord;
}

