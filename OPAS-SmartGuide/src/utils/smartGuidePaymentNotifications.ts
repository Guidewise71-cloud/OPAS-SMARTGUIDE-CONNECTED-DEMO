import { NotificationLog, PassportApplication } from '../types/passport';
import { isApplicationSubmitted } from './applicationStatus';

export interface SmartGuidePaymentDetection {
  applicationReference: string;
  transactionReference: string;
  paymentStatus: string;
  message: string;
}

export interface StoredPaymentNotification {
  applicationId: string;
  applicationReference: string;
  notification: NotificationLog;
}

const STORAGE_PREFIX = 'opas-smartguide-payment-notifications:';

function isStoredPaymentNotification(value: unknown): value is StoredPaymentNotification {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  const notification = record.notification as Record<string, unknown> | undefined;
  if (
    typeof record.applicationId !== 'string' ||
    typeof record.applicationReference !== 'string' ||
    !notification
  ) {
    return false;
  }
  return typeof notification.id === 'string' &&
    typeof notification.timestamp === 'string' &&
    notification.channel === 'OPAS Message Board' &&
    typeof notification.subject === 'string' &&
    typeof notification.content === 'string' &&
    notification.deliveryStatus === 'Delivered' &&
    notification.trigger === 'SMARTGUIDE_PAYMENT_DETECTION';
}

export function parseSmartGuidePaymentDetections(payload: unknown): SmartGuidePaymentDetection[] {
  if (!payload || typeof payload !== 'object') {
    throw new Error('SmartGuide returned an invalid payment-detection response.');
  }
  const response = payload as Record<string, unknown>;
  if (response.success !== true || !Array.isArray(response.detections)) {
    throw new Error('SmartGuide returned an invalid payment-detection response.');
  }

  return response.detections.map((detection) => {
    if (
      !detection ||
      typeof detection !== 'object' ||
      typeof (detection as Record<string, unknown>).applicationReference !== 'string' ||
      typeof (detection as Record<string, unknown>).transactionReference !== 'string' ||
      typeof (detection as Record<string, unknown>).paymentStatus !== 'string' ||
      typeof (detection as Record<string, unknown>).message !== 'string'
    ) {
      throw new Error('SmartGuide returned a malformed payment detection.');
    }
    return detection as SmartGuidePaymentDetection;
  });
}

export function createSmartGuidePaymentNotification(
  application: PassportApplication,
  detection: SmartGuidePaymentDetection,
  detectedAt = new Date().toISOString()
): NotificationLog | null {
  const transactionReference = detection.transactionReference.trim();
  if (
    detection.paymentStatus.trim().toUpperCase() !== 'SUCCESSFUL' ||
    !transactionReference ||
    detection.applicationReference !== application.trackingNumber ||
    isApplicationSubmitted(application)
  ) {
    return null;
  }

  return {
    id: `smartguide-payment-${application.id}-${encodeURIComponent(transactionReference)}`,
    timestamp: detectedAt,
    channel: 'OPAS Message Board',
    subject: 'Payment detected — submission needed',
    content: `${detection.message} Payment reference: ${transactionReference}. Please sign in to OPAS and complete final submission. This is a simulated OPAS notification; check the official OPAS portal for current status.`,
    deliveryStatus: 'Delivered',
    auditId: `AUD-SMARTGUIDE-PAYMENT-${encodeURIComponent(transactionReference)}`,
    trigger: 'SMARTGUIDE_PAYMENT_DETECTION',
    dispatchedBy: { userId: 'smartguide', name: 'OPAS SmartGuide', role: 'system' },
    deliveryUpdatedAt: detectedAt,
    auditTrail: [{
      id: `evt-smartguide-payment-${encodeURIComponent(transactionReference)}`,
      timestamp: detectedAt,
      event: 'DELIVERED',
      actor: 'OPAS SmartGuide',
      details: 'Payment was detected in the simulated OPAS registry and added to the applicant inbox.',
    }],
  };
}

export function loadStoredPaymentNotifications(userId: string): StoredPaymentNotification[] {
  try {
    const stored = window.localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) throw new Error('Stored payment notifications must be an array.');
    return parsed.filter(isStoredPaymentNotification);
  } catch (error) {
    console.error('Unable to load saved SmartGuide payment notifications:', error);
    return [];
  }
}

export function saveStoredPaymentNotifications(userId: string, notifications: StoredPaymentNotification[]) {
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(notifications));
  } catch (error) {
    console.error('Unable to save SmartGuide payment notifications:', error);
  }
}
