/**
 * Simulated Government Payment Gateway & OPAS Payment API
 * 
 * Implements:
 * 1. Government Payment Gateway (ZamPay / MOF Single Treasury Gateway)
 *    - Processes payments (e.g., Applicant pays ZMW 500)
 *    - Generates test transaction reference and payment confirmation
 * 2. OPAS Payment API (/api/payment/process)
 *    - Receives & stores: transactionReference, applicationReference, paymentStatus, and timestamp
 */

import {
  GovernmentGatewayPayload,
  GovernmentPaymentConfirmation,
  OpasPaymentApiRecord,
  OpasPaymentApiResponse,
} from '../types/passport';

const STORAGE_KEY_OPAS_LEDGER = 'opas_payment_ledger_records_v1';

// Seed with an initial sample transaction record for demonstration
const INITIAL_TRANSACTIONS: OpasPaymentApiRecord[] = [
  {
    id: 'LEDGER-ZM-2026-00109',
    transactionReference: 'TXN-GRZ-2026-38291',
    applicationReference: 'ZM-PAS-2026-819203',
    paymentStatus: 'PAID',
    timestamp: '2026-11-06T14:30:00.000Z',
    amount: 500,
    currency: 'ZMW',
    payerName: 'Mulenga Banda',
    payerNrc: '381920/11/1',
    paymentMethod: 'AIRTEL_MONEY',
    apiEndpoint: '/api/payment/process',
    receivedAt: '2026-11-06T14:30:01.210Z',
    storedInLedger: true,
  },
];

export const getStoredLedger = (): OpasPaymentApiRecord[] => {
  if (typeof window === 'undefined') return INITIAL_TRANSACTIONS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_OPAS_LEDGER);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_OPAS_LEDGER, JSON.stringify(INITIAL_TRANSACTIONS));
      return INITIAL_TRANSACTIONS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_TRANSACTIONS;
  }
};

export const saveLedger = (records: OpasPaymentApiRecord[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_OPAS_LEDGER, JSON.stringify(records));
    // Dispatch custom window event so listeners can update in real-time
    window.dispatchEvent(new CustomEvent('opas_payment_ledger_updated', { detail: records }));
  } catch (err) {
    console.error('Failed to save OPAS Payment Ledger', err);
  }
};

/**
 * 2. Simulated Government Payment Gateway
 * 
 * Simulates the Republic of Zambia Government Payment Gateway (Ministry of Finance ZamPay / e-Government Switch).
 * Example: Applicant pays ZMW 500.
 * Gateway generates a test transaction reference and official payment confirmation.
 */
export const simulateGovernmentPaymentGateway = async (
  payload: GovernmentGatewayPayload
): Promise<GovernmentPaymentConfirmation> => {
  // Simulate network latency communicating with Bank of Zambia payment switch
  await new Promise(resolve => setTimeout(resolve, 850));

  const random5 = Math.floor(10000 + Math.random() * 90000);
  const random4 = Math.floor(1000 + Math.random() * 9000);
  const prnRandom = Math.floor(100000 + Math.random() * 900000);

  // Generate test transaction reference
  const transactionReference = `TXN-GRZ-2026-${random5}`;
  const paymentRegistrationNumber = `PRN-2026-${prnRandom}`;
  const approvalCode = `AUTH-ZM-${random4}`;
  const timestamp = new Date().toISOString();

  // Create simulated cryptographic receipt hash
  const digitalReceiptHash = `SHA256:${Math.random().toString(36).substring(2, 10).toUpperCase()}-${transactionReference}-${payload.amount}`;

  const confirmation: GovernmentPaymentConfirmation = {
    applicationReference: payload.applicationReference,
    transactionReference,
    paymentRegistrationNumber,
    biller: 'Republic of Zambia - Ministry of Home Affairs & Internal Security (DNRPC)',
    amount: payload.amount,
    currency: 'ZMW',
    payerName: payload.payerName,
    payerNrc: payload.payerNrc,
    paymentChannel: payload.paymentChannel,
    status: 'PAID',
    timestamp,
    approvalCode,
    digitalReceiptHash,
  };

  return confirmation;
};

/**
 * 3. Simulated OPAS Payment API
 * 
 * Receives and stores:
 * - transactionReference
 * - applicationReference
 * - paymentStatus
 * - timestamp
 * 
 * Calls the backend `/api/payment/process` endpoint, with persistent fallback into localStorage.
 */
export const postPaymentToOpasApi = async (params: {
  transactionReference: string;
  applicationReference: string;
  paymentStatus: 'PAID' | 'CONFIRMED';
  timestamp: string;
  amount: number;
  currency: 'ZMW';
  payerName?: string;
  payerNrc?: string;
  paymentMethod?: string;
  gatewayConfirmation?: GovernmentPaymentConfirmation;
}): Promise<OpasPaymentApiResponse> => {
  const ledgerId = `LEDGER-ZM-2026-${Math.floor(10000 + Math.random() * 90000)}`;
  const receivedAt = new Date().toISOString();

  const record: OpasPaymentApiRecord = {
    id: ledgerId,
    transactionReference: params.transactionReference,
    applicationReference: params.applicationReference,
    paymentStatus: params.paymentStatus,
    timestamp: params.timestamp,
    amount: params.amount,
    currency: params.currency,
    payerName: params.payerName,
    payerNrc: params.payerNrc,
    paymentMethod: params.paymentMethod,
    paymentRegistrationNumber: params.gatewayConfirmation?.paymentRegistrationNumber,
    approvalCode: params.gatewayConfirmation?.approvalCode,
    digitalReceiptHash: params.gatewayConfirmation?.digitalReceiptHash,
    gatewayBiller: params.gatewayConfirmation?.biller,
    gatewayConfirmationStatus: params.gatewayConfirmation?.status,
    apiEndpoint: '/api/payment/process',
    receivedAt,
    storedInLedger: true,
  };

  // Try calling the HTTP backend endpoint first if available
  try {
    const response = await fetch('/api/payment/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transactionReference: params.transactionReference,
        applicationReference: params.applicationReference,
        paymentStatus: params.paymentStatus,
        timestamp: params.timestamp,
        amount: params.amount,
        currency: params.currency,
        payerName: params.payerName,
        payerNrc: params.payerNrc,
        paymentMethod: params.paymentMethod,
        gatewayConfirmation: params.gatewayConfirmation,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      // Also persist to local ledger cache for UI instant queries
      const current = getStoredLedger();
      saveLedger([data.record || record, ...current.filter(r => r.transactionReference !== params.transactionReference)]);
      return data;
    }
  } catch {
    // If backend endpoint is unavailable or network error, fallback gracefully to client persistence
  }

  // Fallback / client-authoritative persistence
  const current = getStoredLedger();
  const updated = [record, ...current.filter(r => r.transactionReference !== params.transactionReference)];
  saveLedger(updated);

  return {
    success: true,
    message: 'Payment transaction successfully received and stored in OPAS Treasury Ledger',
    timestamp: receivedAt,
    record,
  };
};

/**
 * Fetch all stored transactions from the OPAS Payment API
 */
export const fetchOpasTransactions = async (): Promise<OpasPaymentApiRecord[]> => {
  try {
    const res = await fetch('/api/payment/transactions');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.transactions)) {
        return data.transactions;
      }
    }
  } catch {
    // ignore
  }
  return getStoredLedger();
};

/**
 * Reset ledger
 */
export const resetOpasLedger = (): void => {
  saveLedger(INITIAL_TRANSACTIONS);
};


export interface SmartGuidePaymentDetection {
  applicationReference: string;
  transactionReference: string;
  paymentStatus: string;
  applicationStatus: string;
  amount: number;
  currency: string;
  paymentTimestamp: string;
  applicantName: string;
  detection: 'PAID_NOT_SUBMITTED';
  detectedAt: string;
}

/** Publish the latest simulated OPAS application statuses to its API. */
export const syncOpasApplicationStatuses = async (applications: Array<{
  applicationReference: string;
  applicationStatus: string;
  paymentStatus: string;
  applicantName?: string;
  applicantId?: string;
  email?: string;
  phone?: string;
  nrcNumber?: string;
  amount?: number;
}>): Promise<void> => {
  try {
    await fetch('/api/applications/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applications }),
    });
  } catch {
    // The demo still works offline; API-dependent monitoring will show a connection warning.
  }
};

/** SmartGuide retrieves matched payment/application records through its simulated API. */
export const fetchSmartGuideDetections = async (): Promise<SmartGuidePaymentDetection[]> => {
  const response = await fetch('/api/smartguide/detections');
  if (!response.ok) throw new Error('Unable to retrieve SmartGuide detection results.');
  const data = await response.json();
  return Array.isArray(data.detections) ? data.detections : [];
};
