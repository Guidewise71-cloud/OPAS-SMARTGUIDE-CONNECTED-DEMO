import { describe, expect, it } from 'vitest';
import { INITIAL_APPLICATIONS } from '../data/mockApplications';
import {
  createSmartGuidePaymentNotification,
  parseSmartGuidePaymentDetections,
} from './smartGuidePaymentNotifications';

describe('SmartGuide payment notifications', () => {
  it('creates an inbox notification for a newly detected successful payment', () => {
    const application = INITIAL_APPLICATIONS.find((item) => item.trackingNumber === 'OPAS-2026-00718')!;
    const notification = createSmartGuidePaymentNotification(application, {
      applicationReference: application.trackingNumber,
      transactionReference: 'GPG-TX-998241',
      paymentStatus: 'SUCCESSFUL',
      message: 'Payment is recorded, but the application is not marked as submitted.',
    }, '2026-11-08T00:00:00.000Z');

    expect(notification).toMatchObject({
      id: `smartguide-payment-${application.id}-GPG-TX-998241`,
      subject: 'Payment detected — submission needed',
      channel: 'OPAS Message Board',
      deliveryStatus: 'Delivered',
      trigger: 'SMARTGUIDE_PAYMENT_DETECTION',
    });
    expect(notification?.content).toContain('complete final submission');
  });

  it('ignores unsuccessful payments and submitted applications', () => {
    const application = INITIAL_APPLICATIONS.find((item) => item.trackingNumber === 'OPAS-2026-00718')!;
    expect(createSmartGuidePaymentNotification(application, {
      applicationReference: application.trackingNumber,
      transactionReference: 'TX-1',
      paymentStatus: 'PENDING',
      message: 'Payment pending.',
    })).toBeNull();

    expect(createSmartGuidePaymentNotification({
      ...application,
      status: 'Submitted - Under Review',
    }, {
      applicationReference: application.trackingNumber,
      transactionReference: 'TX-2',
      paymentStatus: 'SUCCESSFUL',
      message: 'Paid.',
    })).toBeNull();
  });

  it('rejects malformed detection responses', () => {
    expect(() => parseSmartGuidePaymentDetections({ success: true, detections: [{}] }))
      .toThrow('SmartGuide returned a malformed payment detection.');
  });
});
