import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  Info,
  Send,
  Wallet,
  MessageSquare,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { ApplicationStatus, NotificationLog, PassportApplication } from '../../types/passport';
import { isApplicationSubmitted } from '../../utils/applicationStatus';

interface PaymentSubmissionMonitorProps {
  applications: PassportApplication[];
  onSelectApplication: (application: PassportApplication) => void;
  onAskAssistant: (application: PassportApplication) => void;
  isOfficerView?: boolean;
  onUpdateStatus: (id: string, newStatus: ApplicationStatus, notes?: string) => void;
  onAddNotification: (id: string, notification: NotificationLog) => void;
  onUpdateNotificationDelivery: (
    applicationId: string,
    notificationId: string,
    deliveryStatus: NotificationLog['deliveryStatus'],
    failureReason?: string
  ) => void;
}

type StatusFilter = 'all' | ApplicationStatus | 'paid' | 'submitted' | 'paid-unsubmitted' | 'pending-payment';
type DateFilter = '30' | '90' | 'all';
type NotificationChannel = Extract<NotificationLog['channel'], 'SMS' | 'Email' | 'OPAS Message Board'>;

const OPAS_URL = 'https://pass.gsb.gov.zm/login';
const APPLICATION_STATUSES: ApplicationStatus[] = [
  'Draft',
  'Paid - Unsubmitted',
  'Submitted - Under Review',
  'Reverted',
  'Biometrics Scheduled',
  'Processing & Printing',
  'Ready for Collection',
  'Completed',
];

const DEFAULT_MESSAGE =
  'Your passport application payment is recorded, but the application is not marked as submitted. Please sign in to OPAS, review your application, and complete final submission. Payment alone does not submit your application.';

interface PaymentTransaction {
  applicationReference: string;
  transactionReference: string;
  paymentStatus: string;
  amount: number;
  currency: string;
  paymentDate: string;
}

interface ApplicationStatusRecord {
  applicationReference: string;
  applicationStatus: string;
  submissionStatus: 'SUBMITTED' | 'NOT_SUBMITTED';
  applicantName?: string;
  email?: string;
  phone?: string;
  nrcNumber?: string;
}

interface DetectionRecord {
  applicationReference: string;
  transactionReference: string;
  paymentStatus: string;
  applicationStatus: string;
  detectionType: string;
  message: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseTransactions(payload: unknown): PaymentTransaction[] {
  if (!isRecord(payload) || payload.success !== true || !Array.isArray(payload.transactions)) {
    throw new Error('Simulated OPAS returned an invalid payment-transactions response.');
  }
  return payload.transactions.map((transaction) => {
    if (
      !isRecord(transaction) ||
      typeof transaction.applicationReference !== 'string' ||
      typeof transaction.transactionReference !== 'string' ||
      typeof transaction.paymentStatus !== 'string' ||
      typeof transaction.amount !== 'number' ||
      typeof transaction.currency !== 'string' ||
      (typeof transaction.paymentDate !== 'string' && typeof transaction.timestamp !== 'string')
    ) {
      throw new Error('Simulated OPAS returned a malformed payment transaction.');
    }
    return {
      applicationReference: transaction.applicationReference,
      transactionReference: transaction.transactionReference,
      paymentStatus: transaction.paymentStatus,
      amount: transaction.amount,
      currency: transaction.currency,
      paymentDate: typeof transaction.paymentDate === 'string' ? transaction.paymentDate : String(transaction.timestamp),
    };
  });
}

function parseApplicationStatuses(payload: unknown): ApplicationStatusRecord[] {
  if (!isRecord(payload) || payload.success !== true || !Array.isArray(payload.applications)) {
    throw new Error('Simulated OPAS returned an invalid application-status response.');
  }
  return payload.applications.map((application) => {
    if (
      !isRecord(application) ||
      typeof application.applicationReference !== 'string' ||
      typeof application.applicationStatus !== 'string' ||
      (application.submissionStatus !== 'SUBMITTED' && application.submissionStatus !== 'NOT_SUBMITTED')
    ) {
      throw new Error('Simulated OPAS returned a malformed application-status record.');
    }
    return {
      applicationReference: application.applicationReference,
      applicationStatus: application.applicationStatus,
      submissionStatus: application.submissionStatus,
      applicantName: typeof application.applicantName === 'string' ? application.applicantName : undefined,
      email: typeof application.email === 'string' ? application.email : undefined,
      phone: typeof application.phone === 'string' ? application.phone : undefined,
      nrcNumber: typeof application.nrcNumber === 'string' ? application.nrcNumber : undefined,
    };
  });
}

function parseDetections(payload: unknown): DetectionRecord[] {
  if (!isRecord(payload) || payload.success !== true || !Array.isArray(payload.detections)) {
    throw new Error('Simulated OPAS returned an invalid detection response.');
  }
  return payload.detections.map((detection) => {
    if (
      !isRecord(detection) ||
      typeof detection.applicationReference !== 'string' ||
      typeof detection.transactionReference !== 'string' ||
      typeof detection.paymentStatus !== 'string' ||
      typeof detection.applicationStatus !== 'string' ||
      typeof detection.detectionType !== 'string' ||
      typeof detection.message !== 'string'
    ) {
      throw new Error('Simulated OPAS returned a malformed detection record.');
    }
    return {
      applicationReference: detection.applicationReference,
      transactionReference: detection.transactionReference,
      paymentStatus: detection.paymentStatus,
      applicationStatus: detection.applicationStatus,
      detectionType: detection.detectionType,
      message: detection.message,
    };
  });
}

async function fetchApiJson(path: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(path, {
    ...init,
    headers: { Accept: 'application/json', ...init?.headers },
  });
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`Simulated OPAS API ${path} returned non-JSON data (HTTP ${response.status}).`);
  }
  if (!response.ok) {
    const message = isRecord(payload) && typeof payload.error === 'string'
      ? payload.error
      : `HTTP ${response.status}`;
    throw new Error(`Simulated OPAS API ${path} failed: ${message}`);
  }
  return payload;
}

const APPLICATION_STATUS_FROM_API: Record<string, ApplicationStatus> = {
  DRAFT: 'Draft',
  PAID_UNSUBMITTED: 'Paid - Unsubmitted',
  PAYMENT_COMPLETED: 'Paid - Unsubmitted',
  SUBMITTED: 'Submitted - Under Review',
  SUBMITTED_UNDER_REVIEW: 'Submitted - Under Review',
  REVERTED: 'Reverted',
  BIOMETRICS_SCHEDULED: 'Biometrics Scheduled',
  PROCESSING_PRINTING: 'Processing & Printing',
  READY_FOR_COLLECTION: 'Ready for Collection',
  COMPLETED: 'Completed',
};

function formatDate(value?: string) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function timeSincePayment(value?: string) {
  if (!value) return '—';
  const paidAt = new Date(value).getTime();
  if (!Number.isFinite(paidAt)) return '—';
  const elapsedHours = Math.max(0, Math.floor((Date.now() - paidAt) / 3_600_000));
  const days = Math.floor(elapsedHours / 24);
  const hours = elapsedHours % 24;
  return days ? `${days}d ${hours}h` : `${hours}h`;
}

function escapeCsv(value: string | number) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export const PaymentSubmissionMonitor: React.FC<PaymentSubmissionMonitorProps> = ({
  applications,
  onSelectApplication,
  onAskAssistant,
  isOfficerView = false,
  onUpdateStatus,
  onAddNotification,
  onUpdateNotificationDelivery,
}) => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [paymentDateFrom, setPaymentDateFrom] = useState('');
  const [paymentDateTo, setPaymentDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [channel, setChannel] = useState<NotificationChannel>('OPAS Message Board');
  const [scheduleAt, setScheduleAt] = useState('');
  const [outboxFeedback, setOutboxFeedback] = useState('');
  const [failureReasonById, setFailureReasonById] = useState<Record<string, string>>({});
  const trackingSectionRef = useRef<HTMLElement>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sourceState, setSourceState] = useState<{
    loading: boolean;
    error?: string;
    transactions: PaymentTransaction[];
    statuses: ApplicationStatusRecord[];
    detections: DetectionRecord[];
    lastSyncedAt?: string;
  }>({ loading: true, transactions: [], statuses: [], detections: [] });

  useEffect(() => {
    let active = true;
    setSourceState((current) => ({ ...current, loading: true, error: undefined }));

    Promise.all([
      fetchApiJson('/api/payment/transactions').then(parseTransactions),
      fetchApiJson('/api/applications/status').then(parseApplicationStatuses),
      fetchApiJson('/api/smartguide/detections').then(parseDetections),
    ])
      .then(([transactions, statuses, detections]) => {
        const unknownStatuses = statuses.filter((record) => !APPLICATION_STATUS_FROM_API[record.applicationStatus]);
        if (unknownStatuses.length) {
          throw new Error(`Simulated OPAS returned unsupported application status: ${unknownStatuses[0].applicationStatus}`);
        }
        if (active) {
          setSourceState({
            loading: false,
            transactions,
            statuses,
            detections,
            lastSyncedAt: new Date().toISOString(),
          });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setSourceState({
            loading: false,
            error: error instanceof Error ? error.message : 'Simulated OPAS connection failed unexpectedly.',
            transactions: [],
            statuses: [],
            detections: [],
          });
        }
      });

    return () => {
      active = false;
    };
  }, [applications, refreshKey]);

  const sourceApplications = useMemo(() => {
    if (sourceState.error || sourceState.loading) return applications;
    const statusByReference = new Map(
      sourceState.statuses.map((record) => [record.applicationReference, record])
    );
    const transactionByReference = new Map<string, PaymentTransaction>();
    for (const transaction of sourceState.transactions) {
      if (!transactionByReference.has(transaction.applicationReference)) {
        transactionByReference.set(transaction.applicationReference, transaction);
      }
    }
    const localReferences = new Set(applications.map((application) => application.trackingNumber));
    const mergedLocal = applications.map((application) => {
      const sourceStatus = statusByReference.get(application.trackingNumber);
      const transaction = transactionByReference.get(application.trackingNumber);
      return {
        ...application,
        status: sourceStatus
          ? APPLICATION_STATUS_FROM_API[sourceStatus.applicationStatus] || application.status
          : application.status,
        submissionStatus: sourceStatus?.submissionStatus,
        feePaid: Boolean(transaction && ['SUCCESSFUL', 'PAID', 'CONFIRMED'].includes(transaction.paymentStatus.toUpperCase())),
        paymentReference: transaction?.transactionReference,
        paidAt: transaction?.paymentDate,
        feeAmount: transaction?.amount ?? application.feeAmount,
      };
    });

    // Add records that came directly from the connected Simulated OPAS API.
    // A local template supplies nonessential display fields; identity/contact fields
    // are populated only from the API response.
    const template = applications[0];
    if (!template) return mergedLocal;
    const externalRecords = sourceState.statuses
      .filter((record) => !localReferences.has(record.applicationReference))
      .map((record) => {
        const transaction = transactionByReference.get(record.applicationReference);
        const apiStatus = APPLICATION_STATUS_FROM_API[record.applicationStatus] || 'Draft';
        return {
          ...template,
          id: `sim-opas-${record.applicationReference}`,
          trackingNumber: record.applicationReference,
          fullName: record.applicantName || 'Simulated OPAS applicant',
          nrcNumber: record.nrcNumber || '',
          status: apiStatus,
          submissionStatus: record.submissionStatus,
          feePaid: Boolean(transaction && ['SUCCESSFUL', 'PAID', 'CONFIRMED'].includes(transaction.paymentStatus.toUpperCase())),
          paymentReference: transaction?.transactionReference,
          paidAt: transaction?.paymentDate,
          feeAmount: transaction?.amount ?? template.feeAmount,
          contact: {
            ...template.contact,
            email: record.email || '',
            phone: record.phone || '',
          },
          notifications: [],
          lastUpdated: new Date().toISOString(),
        };
      });
    return [...mergedLocal, ...externalRecords];
  }, [applications, sourceState]);

  const connectedToSource = !sourceState.loading && !sourceState.error;
  const sourceDetectionReferences = new Set(sourceState.detections.map((detection) => detection.applicationReference));
  const latestSourceTransactionByReference = new Map<string, PaymentTransaction>();
  for (const transaction of sourceState.transactions) {
    if (!latestSourceTransactionByReference.has(transaction.applicationReference)) {
      latestSourceTransactionByReference.set(transaction.applicationReference, transaction);
    }
  }
  const latestSourceTransactions = [...latestSourceTransactionByReference.values()];
  const paidCount = connectedToSource
    ? latestSourceTransactions.filter((transaction) => ['SUCCESSFUL', 'PAID', 'CONFIRMED'].includes(transaction.paymentStatus.toUpperCase())).length
    : sourceApplications.filter((application) => application.feePaid).length;
  const paidUnsubmitted = connectedToSource
    ? sourceApplications.filter((application) => sourceDetectionReferences.has(application.trackingNumber))
    : sourceApplications.filter((application) => application.feePaid && !isApplicationSubmitted(application));
  const pendingPaymentCount = connectedToSource
    ? sourceState.statuses.filter((record) => {
        const transaction = latestSourceTransactionByReference.get(record.applicationReference);
        return !transaction || !['SUCCESSFUL', 'PAID', 'CONFIRMED'].includes(transaction.paymentStatus.toUpperCase());
      }).length
    : sourceApplications.filter((application) => !application.feePaid).length;
  const submittedCount = connectedToSource
    ? sourceState.statuses.filter((record) => record.submissionStatus === 'SUBMITTED').length
    : sourceApplications.filter(isApplicationSubmitted).length;
  const eligibleApplicants = sourceApplications.filter((application) =>
    application.feePaid && !isApplicationSubmitted(application)
  );
  const queuedCount = sourceApplications.flatMap((application) => application.notifications)
    .filter((notification) => notification.deliveryStatus === 'Queued' || notification.deliveryStatus === 'Scheduled').length;
  const failedNotifications = sourceApplications.flatMap((application) =>
    application.notifications
      .filter((notification) => notification.deliveryStatus === 'Failed')
      .map((notification) => ({ application, notification }))
  );
  const outboxHistory = sourceApplications
    .flatMap((application) =>
      application.notifications
        .filter((notification) => notification.trigger === 'MANUAL_OFFICER')
        .map((notification) => ({ application, notification }))
    )
    .sort((left, right) => new Date(right.notification.timestamp).getTime() - new Date(left.notification.timestamp).getTime())
    .slice(0, 30);
  const outboxRecipientIds = new Set(
    sourceApplications
      .filter((application) =>
        application.notifications.some((notification) =>
          notification.trigger === 'MANUAL_OFFICER' &&
          notification.subject === 'Paid application submission reminder'
        )
      )
      .map((application) => application.id)
  );
  const outboxSubmittedCount = sourceApplications.filter(
    (application) => outboxRecipientIds.has(application.id) && isApplicationSubmitted(application)
  ).length;
  const visibleApplications = useMemo(() => {
    const cutoff = dateFilter === 'all'
      ? 0
      : Date.now() - Number(dateFilter) * 24 * 60 * 60 * 1000;
    const query = search.trim().toLowerCase();

    return sourceApplications.filter((application) => {
      const submitted = isApplicationSubmitted(application);
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'paid' && application.feePaid) ||
        (statusFilter === 'submitted' && submitted) ||
        (statusFilter === 'paid-unsubmitted' && application.feePaid && !submitted) ||
        (statusFilter === 'pending-payment' && !application.feePaid) ||
        (APPLICATION_STATUSES.includes(statusFilter as ApplicationStatus) && application.status === statusFilter);
      const paymentTime = application.paidAt ? new Date(application.paidAt).getTime() : 0;
      const startTime = paymentDateFrom ? new Date(`${paymentDateFrom}T00:00:00`).getTime() : 0;
      const endTime = paymentDateTo ? new Date(`${paymentDateTo}T23:59:59.999`).getTime() : Number.POSITIVE_INFINITY;
      const matchesDate =
        (!cutoff || (paymentTime > 0 && paymentTime >= cutoff)) &&
        (!paymentDateFrom || (paymentTime > 0 && paymentTime >= startTime)) &&
        (!paymentDateTo || (paymentTime > 0 && paymentTime <= endTime));
      const matchesSearch = !query || [
        application.trackingNumber,
        application.paymentReference || '',
        application.passportType,
        application.status,
      ].some((value) => value.toLowerCase().includes(query));
      return matchesStatus && matchesDate && matchesSearch;
    });
  }, [sourceApplications, dateFilter, paymentDateFrom, paymentDateTo, search, statusFilter]);

  const applyMetricFilter = (filter: StatusFilter) => {
    setStatusFilter(filter);
    setDateFilter('all');
    setPaymentDateFrom('');
    setPaymentDateTo('');
    setSearch('');
    trackingSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const visibleEligibleIds = visibleApplications
    .filter((application) => application.feePaid && !isApplicationSubmitted(application))
    .map((application) => application.id);

  const createOutboxEntry = (application: PassportApplication, content = message) => {
    const timestamp = new Date().toISOString();
    const scheduledAt = scheduleAt ? new Date(scheduleAt).toISOString() : undefined;
    const notification: NotificationLog = {
      id: `outbox-${application.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp,
      scheduledAt,
      channel,
      subject: 'Paid application submission reminder',
      content,
      deliveryStatus: scheduledAt ? 'Scheduled' : 'Queued',
      trigger: 'MANUAL_OFFICER',
    };
    onAddNotification(application.id, notification);
  };

  const syncOfficialStatus = async (application: PassportApplication, submitted: boolean) => {
    const response = await fetchApiJson('/api/applications/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        applications: [{
          applicationReference: application.trackingNumber,
          applicantName: application.fullName,
          email: application.contact.email,
          phone: application.contact.phone,
          applicationStatus: submitted ? 'SUBMITTED' : 'PAID_UNSUBMITTED',
          submissionStatus: submitted ? 'SUBMITTED' : 'NOT_SUBMITTED',
        }],
      }),
    });
    if (!isRecord(response) || response.success !== true) {
      throw new Error('Simulated OPAS did not confirm the application-status update.');
    }
  };

  const queueSelectedNotifications = () => {
    if (!selectedIds.length) {
      setOutboxFeedback('Select at least one eligible applicant.');
      return;
    }
    if (!message.trim()) {
      setOutboxFeedback('Enter a notification message before adding it to the outbox.');
      return;
    }
    if (scheduleAt && new Date(scheduleAt).getTime() <= Date.now()) {
      setOutboxFeedback('Choose a future date and time, or clear the schedule to queue immediately.');
      return;
    }

    const recipients = eligibleApplicants.filter((application) => selectedIds.includes(application.id));
    if (!recipients.length) {
      setOutboxFeedback('There are no eligible applicants in the current selection.');
      return;
    }
    recipients.forEach((application) => createOutboxEntry(application));
    setSelectedIds([]);
    setOutboxFeedback(
      `${recipients.length} message${recipients.length === 1 ? '' : 's'} added to the ${scheduleAt ? 'scheduled' : 'pending'} outbox. Nothing was sent externally.`
    );
  };

  const confirmSubmissionStatus = async (application: PassportApplication, submitted: boolean) => {
    if (!sourceState.error && sourceState.loading) {
      setOutboxFeedback('Wait for the Simulated OPAS status check to finish before recording a decision.');
      return;
    }
    if (sourceState.error) {
      setOutboxFeedback(`Cannot record status because Simulated OPAS is unavailable: ${sourceState.error}`);
      return;
    }
    if (submitted && !window.confirm(`Confirm you checked official OPAS and ${application.trackingNumber} is submitted?`)) {
      return;
    }
    if (!submitted && !window.confirm(`Confirm you checked official OPAS and ${application.trackingNumber} is not submitted?`)) {
      return;
    }
    if (!submitted && !message.trim()) {
      setOutboxFeedback('Enter a notification message before marking this case not submitted.');
      return;
    }
    if (!submitted && scheduleAt && new Date(scheduleAt).getTime() <= Date.now()) {
      setOutboxFeedback('Choose a future schedule time, or clear the schedule before notifying this applicant.');
      return;
    }

    try {
      await syncOfficialStatus(application, submitted);
    } catch (error) {
      setOutboxFeedback(error instanceof Error ? error.message : 'Failed to sync the status with Simulated OPAS.');
      return;
    }

    if (submitted) {
      onUpdateStatus(application.id, 'Submitted - Under Review', 'Officer manually confirmed successful submission in official OPAS.');
      application.notifications
        .filter((notification) =>
          notification.subject === 'Paid application submission reminder' &&
          (notification.deliveryStatus === 'Queued' || notification.deliveryStatus === 'Scheduled')
        )
        .forEach((notification) => onUpdateNotificationDelivery(application.id, notification.id, 'Cancelled'));
      setOutboxFeedback(`${application.trackingNumber} marked submitted. Pending reminders for this application were cancelled.`);
      return;
    }

    onUpdateStatus(application.id, 'Paid - Unsubmitted', 'Officer manually checked official OPAS; application is not submitted.');
    createOutboxEntry(application);
    setOutboxFeedback(`${application.trackingNumber} marked paid-but-not-submitted and added to the outbox.`);
  };

  const exportReport = () => {
    const rows = [
      ['Application reference', 'Payment transaction reference', 'Payment status', 'Payment date', 'Return-to-OPAS status (not integrated)', 'OPAS status', 'Time since payment'],
      ...visibleApplications.map((application) => [
        application.trackingNumber,
        application.paymentReference || '',
        application.feePaid ? 'Paid' : 'Not paid / unconfirmed',
        application.paidAt || '',
        'Not tracked',
        application.status,
        timeSincePayment(application.paidAt),
      ]),
    ];
    const csv = rows.map((row) => row.map(escapeCsv).join(',')).join('\r\n');
    const file = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const downloadUrl = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'opas-payment-submission-tracking.csv';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  };

  return (
    <div className="space-y-4 pb-6">
      <header className="flex flex-col gap-3 rounded-xl border border-blue-100 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
            <CreditCard className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Payment-to-Submission Monitor</h2>
            <p className="mt-1 text-sm text-slate-600">
              {isOfficerView
                ? 'Monitor payment, return-to-OPAS, final-submission, and applicant follow-up across cases.'
                : 'Track payment and final submission steps for your applications.'}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 self-start rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 sm:self-center">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          Prototype tracking
        </span>
      </header>

      {isOfficerView && (
        <section aria-labelledby="smartguide-flow-title" className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 id="smartguide-flow-title" className="text-sm font-bold text-slate-900">OPAS SmartGuide integration flow</h3>
              <p className="mt-1 text-xs text-slate-600">Target architecture and the capabilities currently demonstrated in this prototype.</p>
            </div>
            <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-900">Demo mode</span>
          </div>
          <ol className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            <li className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900"><CreditCard className="h-4 w-4 text-blue-700" />Existing OPAS</div>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-600">Official application and payment records remain the intended source of truth.</p>
              <p className="mt-2 text-[10px] font-semibold text-rose-700">Production connection not configured</p>
            </li>
            <li className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900"><RefreshCw className="h-4 w-4 text-violet-700" />Integration service</div>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-600">The planned API and webhook layer retrieves payment confirmations and application status.</p>
              <p className="mt-2 text-[10px] font-semibold text-amber-800">Simulated APIs only; no production webhooks</p>
            </li>
            <li className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900"><AlertTriangle className="h-4 w-4 text-amber-700" />Smart detection</div>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-600">Compares payment and submission status, then flags paid-but-not-submitted demo records.</p>
              <p className="mt-2 text-[10px] font-semibold text-emerald-800">Demo rules active</p>
            </li>
            <li className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900"><MessageSquare className="h-4 w-4 text-emerald-700" />Applicant + officer portals</div>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-600">Displays correction guidance, reminders, alerts, and monitoring for the relevant audiences.</p>
              <p className="mt-2 text-[10px] font-semibold text-amber-800">In-app prototype; no external delivery</p>
            </li>
          </ol>
        </section>
      )}

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Connected to the Simulated OPAS APIs. These records are simulated, not official Government Payment Gateway or
            production OPAS data. Applicant return-to-OPAS tracking and identity authentication are not provided by these APIs.
          </p>
        </div>
      </div>

      <div className={`flex flex-col gap-2 rounded-lg border px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between ${
        sourceState.error
          ? 'border-rose-300 bg-rose-50 text-rose-900'
          : sourceState.loading
          ? 'border-slate-300 bg-slate-50 text-slate-700'
          : 'border-emerald-300 bg-emerald-50 text-emerald-900'
      }`}>
        <div>
          <p className="font-bold">
            {sourceState.error
              ? 'Simulated OPAS API connection failed'
              : sourceState.loading
              ? 'Connecting to Simulated OPAS APIs…'
              : `Simulated OPAS connected · ${sourceState.transactions.length} payment records · ${sourceState.statuses.length} application statuses · ${sourceState.detections.length} detections`}
          </p>
          {sourceState.error && <p className="mt-1">{sourceState.error} Displayed records are local prototype data and may be stale.</p>}
          {sourceState.lastSyncedAt && <p className="mt-1">Last checked: {formatDate(sourceState.lastSyncedAt)}</p>}
        </div>
        <button
          onClick={() => setRefreshKey((current) => current + 1)}
          disabled={sourceState.loading}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-current/20 px-3 py-1.5 font-bold disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${sourceState.loading ? 'animate-spin' : ''}`} />
          Refresh Simulated OPAS data
        </button>
      </div>
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { title: 'Applications tracked', value: connectedToSource ? sourceState.statuses.length : applications.length, note: isOfficerView ? 'Across available records' : 'In this account', icon: FileText, style: 'border-blue-200 bg-blue-50 text-blue-700', filter: 'all' as const },
          { title: 'Paid', value: paidCount, note: 'Payment marked paid', icon: Wallet, style: 'border-emerald-200 bg-emerald-50 text-emerald-700', filter: 'paid' as const },
          { title: 'Paid · Not submitted', value: paidUnsubmitted.length, note: 'Needs OPAS follow-up', icon: AlertTriangle, style: 'border-amber-200 bg-amber-50 text-amber-800', filter: 'paid-unsubmitted' as const },
          { title: 'Submitted', value: submittedCount, note: 'Submission status recorded', icon: CheckCircle2, style: 'border-violet-200 bg-violet-50 text-violet-700', filter: 'submitted' as const },
        ].map(({ title, value, note, icon: Icon, style, filter }) => (
          <button
            key={title}
            type="button"
            onClick={() => applyMetricFilter(filter)}
            aria-label={`View ${title}: ${value} applications`}
            aria-pressed={statusFilter === filter}
            className={`rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${style} ${
              statusFilter === filter ? 'ring-2 ring-blue-700 ring-offset-2' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <Icon className="h-6 w-6 shrink-0" />
              <div>
                <p className="text-2xl font-extrabold leading-none">{value}</p>
                <p className="mt-1 text-xs font-bold">{title}</p>
                <p className="mt-0.5 text-[11px] opacity-80">{note}</p>
                <p className="mt-2 text-[10px] font-bold uppercase tracking-wide">Click to view records</p>
              </div>
            </div>
          </button>
        ))}
      </section>

      {isOfficerView && (
        <section className="overflow-hidden rounded-xl border border-blue-200 bg-white shadow-xs">
          <div className="flex flex-col gap-2 border-b border-blue-100 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <MessageSquare className="h-5 w-5 text-blue-700" />
                Message Outbox
              </h3>
              <p className="mt-1 text-xs text-slate-600">
                Select paid-but-unsubmitted applicants, compose a reminder, then queue it now or for a future time.
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-700">
                Open official OPAS and check the case before recording YES or NO.
                {' '}
                <a href={OPAS_URL} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">
                  Open OPAS
                </a>
              </p>
            </div>
            <span className="rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
              Prototype queue · no external delivery
            </span>
          </div>

          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-2xl font-extrabold text-amber-800">{eligibleApplicants.length}</p>
              <p className="text-xs font-bold text-amber-950">Eligible applicants</p>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <p className="text-2xl font-extrabold text-blue-800">{queuedCount}</p>
              <p className="text-xs font-bold text-blue-950">Queued / scheduled</p>
            </div>
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
              <p className="text-2xl font-extrabold text-rose-800">{failedNotifications.length}</p>
              <p className="text-xs font-bold text-rose-950">Recorded delivery failures</p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-2xl font-extrabold text-emerald-800">{outboxSubmittedCount}</p>
              <p className="text-xs font-bold text-emerald-950">Outbox recipients now marked submitted</p>
            </div>
          </div>

          <div className="grid gap-4 border-t border-slate-100 p-4 xl:grid-cols-[1fr_1.2fr]">
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-900">Filter recipients</h4>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="text-xs font-semibold text-slate-700">
                  Application status
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-xs"
                  >
                    <option value="all">All application statuses</option>
                    {APPLICATION_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </label>
                <label className="text-xs font-semibold text-slate-700">
                  Payment date
                  <select
                    value={dateFilter}
                    onChange={(event) => setDateFilter(event.target.value as DateFilter)}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-xs"
                  >
                    <option value="all">All dates</option>
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                  </select>
                </label>
                <label className="text-xs font-semibold text-slate-700">
                  Paid from
                  <input
                    type="date"
                    value={paymentDateFrom}
                    onChange={(event) => setPaymentDateFrom(event.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-xs"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-700">
                  Paid through
                  <input
                    type="date"
                    value={paymentDateTo}
                    onChange={(event) => setPaymentDateTo(event.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-xs"
                  />
                </label>
              </div>
              <label className="block text-xs font-semibold text-slate-700">
                Search applicant or application
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Name, application ref. or payment ref."
                  className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-2 text-xs"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedIds((current) =>
                    visibleEligibleIds.every((id) => current.includes(id))
                      ? current.filter((id) => !visibleEligibleIds.includes(id))
                      : Array.from(new Set([...current, ...visibleEligibleIds]))
                  )}
                  disabled={!visibleEligibleIds.length}
                  className="rounded-md border border-blue-200 px-3 py-2 text-xs font-bold text-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {visibleEligibleIds.length > 0 && visibleEligibleIds.every((id) => selectedIds.includes(id))
                    ? 'Unselect visible eligible'
                    : `Select all visible eligible (${visibleEligibleIds.length})`}
                </button>
                <button
                  onClick={() => setSelectedIds(eligibleApplicants.map((application) => application.id))}
                  className="rounded-md border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700"
                >
                  Select all eligible ({eligibleApplicants.length})
                </button>
                <button
                  onClick={() => setSelectedIds([])}
                  disabled={!selectedIds.length}
                  className="rounded-md border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50"
                >
                  Clear selection
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700">
                Custom notification message
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={4}
                  className="mt-1 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-xs leading-relaxed"
                />
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="text-xs font-semibold text-slate-700">
                  Delivery channel
                  <select
                    value={channel}
                    onChange={(event) => setChannel(event.target.value as NotificationChannel)}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-xs"
                  >
                    <option value="OPAS Message Board">OPAS message board</option>
                    <option value="Email">Email</option>
                    <option value="SMS">SMS</option>
                  </select>
                </label>
                <label className="text-xs font-semibold text-slate-700">
                  Schedule (optional)
                  <input
                    type="datetime-local"
                    value={scheduleAt}
                    onChange={(event) => setScheduleAt(event.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-xs"
                  />
                </label>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-slate-600">{selectedIds.length} applicant(s) selected</p>
                <button
                  onClick={queueSelectedNotifications}
                  disabled={!selectedIds.length}
                  className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  {scheduleAt ? 'Schedule in outbox' : 'Queue immediately'}
                </button>
              </div>
              {outboxFeedback && <p role="status" className="text-xs font-semibold text-blue-800">{outboxFeedback}</p>}
              <p className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-[11px] leading-relaxed text-amber-900">
                Prototype mode: items are recorded as queued or scheduled only. Email, SMS and OPAS messages are not delivered,
                scheduled jobs do not run in the background, and delivery status must not be treated as provider confirmation.
              </p>
            </div>
          </div>
        </section>
      )}

      {isOfficerView && (
        <section className="grid gap-3 xl:grid-cols-[1fr_300px]">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <h3 className="flex items-center gap-2 font-bold text-slate-900">
              <Clock3 className="h-5 w-5 text-blue-700" />
              Payment status overview
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => setStatusFilter('paid-unsubmitted')}
                className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-left hover:border-amber-400"
              >
                <span className="block text-2xl font-extrabold text-amber-800">{paidUnsubmitted.length}</span>
                <span className="text-xs font-bold text-amber-950">Paid applications not submitted</span>
                <span className="mt-1 block text-[11px] text-amber-800">Select to review records requiring follow-up</span>
              </button>
              <button
                onClick={() => setStatusFilter('pending-payment')}
                className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-left hover:border-blue-400"
              >
                <span className="block text-2xl font-extrabold text-blue-800">{pendingPaymentCount}</span>
                <span className="text-xs font-bold text-blue-950">Payment not confirmed</span>
                <span className="mt-1 block text-[11px] text-blue-800">Payment is pending or not recorded</span>
              </button>
            </div>
          </div>
          <aside className="rounded-xl border border-rose-200 bg-rose-50 p-4">
            <h3 className="flex items-center gap-2 font-bold text-rose-950">
              <AlertTriangle className="h-5 w-5 text-rose-700" />
              System Detection
            </h3>
            <p className="mt-2 text-3xl font-extrabold text-rose-700">{paidUnsubmitted.length}</p>
            <p className="text-sm font-bold text-rose-950">Paid applications not submitted</p>
            <p className="mt-2 text-xs leading-relaxed text-rose-900">
              These records need follow-up after confirming the payment and application refer to the same case.
              Gateway and OPAS reconciliation is not connected.
            </p>
          </aside>
        </section>
      )}

      {paidUnsubmitted.length > 0 && (
        <section className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-amber-100 p-2 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-amber-950">
                {paidUnsubmitted.length} paid application{paidUnsubmitted.length === 1 ? '' : 's'} may still need submission
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-amber-900">
                Payment alone does not submit an application. Sign in to OPAS and check whether you need to select
                “Complete Final Submission.”
              </p>
            </div>
          </div>
          <a
            href={OPAS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800"
          >
            Return to OPAS <ExternalLink className="h-4 w-4" />
          </a>
        </section>
      )}

      <section ref={trackingSectionRef} className="scroll-mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="flex items-center gap-2 font-bold text-slate-900">
              <FileCheck2 className="h-5 w-5 text-blue-700" />
              Application Tracking
            </h3>
            <p className="mt-1 text-xs text-slate-600">{visibleApplications.length} application(s) match the current outbox filters.</p>
          </div>
          <button
            onClick={exportReport}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50"
          >
            <Download className="h-4 w-4" /> Export filtered report
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] border-collapse text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-3 py-3">Select</th>
                <th className="px-3 py-3">#</th>
                <th className="px-3 py-3">Application ref.</th>
                <th className="px-3 py-3">Payment transaction ref.</th>
                <th className="px-3 py-3">Payment status</th>
                <th className="px-3 py-3">Payment date &amp; time</th>
                <th className="px-3 py-3">Return to OPAS (not integrated)</th>
                <th className="px-3 py-3">OPAS status</th>
                <th className="px-3 py-3">Time since payment</th>
                {isOfficerView && <th className="px-3 py-3">Reminder history</th>}
                {isOfficerView && <th className="px-3 py-3">OPAS check</th>}
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleApplications.map((application, index) => {
                const submitted = isApplicationSubmitted(application);
                const needsSubmit = application.feePaid && !submitted;
                return (
                  <tr key={application.id} className={needsSubmit ? 'bg-amber-50/50' : 'hover:bg-slate-50'}>
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        aria-label={`Select ${application.trackingNumber}`}
                        checked={selectedIds.includes(application.id)}
                        disabled={!needsSubmit}
                        onChange={(event) => setSelectedIds((current) =>
                          event.target.checked
                            ? [...current, application.id]
                            : current.filter((id) => id !== application.id)
                        )}
                        className="h-4 w-4 accent-blue-700 disabled:opacity-30"
                      />
                    </td>
                    <td className="px-3 py-3 text-slate-500">{index + 1}</td>
                    <td className="px-3 py-3 font-semibold text-slate-900">{application.trackingNumber}</td>
                    <td className="px-3 py-3 text-slate-600">{application.paymentReference || 'Not recorded'}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 font-bold ${
                        application.feePaid ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {application.feePaid ? <Check className="h-3 w-3" /> : <Clock3 className="h-3 w-3" />}
                        {application.feePaid ? 'Paid*' : 'Not confirmed'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{formatDate(application.paidAt)}</td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-500">
                        <Clock3 className="h-3.5 w-3.5" />
                        Unavailable
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                        needsSubmit ? 'bg-amber-100 text-amber-900' : submitted ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {application.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{timeSincePayment(application.paidAt)}</td>
                    {isOfficerView && (
                      <td className="px-3 py-3 text-slate-600">
                        {application.notifications.filter((notification) =>
                          /reminder|payment|submission|follow.?up/i.test(`${notification.subject || ''} ${notification.content}`)
                        ).length}
                      </td>
                    )}
                    {isOfficerView && (
                      <td className="px-3 py-3">
                        {needsSubmit ? (
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-slate-700">Has applicant successfully submitted?</span>
                            <div className="flex gap-1">
                              <button
                                onClick={() => confirmSubmissionStatus(application, true)}
                                className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 font-bold text-emerald-800 hover:bg-emerald-100"
                              >
                                YES
                              </button>
                              <button
                                onClick={() => confirmSubmissionStatus(application, false)}
                                className="rounded border border-rose-300 bg-rose-50 px-2 py-1 font-bold text-rose-800 hover:bg-rose-100"
                              >
                                NO
                              </button>
                            </div>
                          </div>
                        ) : submitted ? (
                          <span className="font-semibold text-emerald-700">Submitted · reminders stopped</span>
                        ) : (
                          <span className="text-slate-500">Manual status check required</span>
                        )}
                      </td>
                    )}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            onSelectApplication(application);
                            onAskAssistant(application);
                          }}
                          className="rounded-md border border-blue-200 px-2.5 py-1.5 font-semibold text-blue-700 hover:bg-blue-50"
                        >
                          Ask AI
                        </button>
                        {needsSubmit && !isOfficerView && (
                            <a
                              href={OPAS_URL}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-md bg-blue-700 px-2.5 py-1.5 font-semibold text-white hover:bg-blue-800"
                            >
                              Follow up <ArrowRight className="h-3 w-3" />
                            </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {visibleApplications.length === 0 && (
                <tr>
                  <td colSpan={isOfficerView ? 12 : 9} className="px-4 py-10 text-center text-slate-500">
                    No applications match those filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="border-t border-slate-100 px-4 py-2 text-[10px] text-slate-500">
          * “Paid” reflects the workspace application record only; it is not independently verified with the payment gateway.
        </p>
      </section>

      {isOfficerView && (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="border-b border-slate-200 p-4">
            <h3 className="font-bold text-slate-900">Outbox history and delivery failures</h3>
            <p className="mt-1 text-xs text-slate-600">
              Queue and schedule records are shown here. In prototype mode, delivery failures can only be manually recorded;
              they are not provider receipts.
            </p>
          </div>
          {outboxHistory.length ? (
            <div className="divide-y divide-slate-100">
              {outboxHistory.map(({ application, notification }) => (
                <div key={`${application.id}-${notification.id}`} className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-bold text-slate-900">{application.trackingNumber} · {notification.subject || notification.channel}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        notification.deliveryStatus === 'Failed'
                          ? 'bg-rose-100 text-rose-800'
                          : notification.deliveryStatus === 'Cancelled'
                          ? 'bg-slate-100 text-slate-700'
                          : 'bg-blue-100 text-blue-800'
                      }`}>{notification.deliveryStatus}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-600">{notification.content}</p>
                    {notification.failureReason && (
                      <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-rose-700">
                        <XCircle className="h-3.5 w-3.5" /> Failure: {notification.failureReason}
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap gap-x-3 text-[10px] text-slate-500">
                      <span>Channel: {notification.channel}</span>
                      <span>Created: {formatDate(notification.timestamp)}</span>
                      {notification.scheduledAt && <span>Scheduled for: {formatDate(notification.scheduledAt)}</span>}
                    </div>
                  </div>
                  {(notification.deliveryStatus === 'Queued' || notification.deliveryStatus === 'Scheduled' || notification.deliveryStatus === 'Sent') && (
                    <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
                      <input
                        value={failureReasonById[notification.id] || ''}
                        onChange={(event) => setFailureReasonById((current) => ({ ...current, [notification.id]: event.target.value }))}
                        placeholder="Failure reason"
                        aria-label={`Failure reason for ${application.trackingNumber}`}
                        className="rounded border border-slate-300 px-2 py-1 text-[11px]"
                      />
                      <button
                        onClick={() => {
                          const reason = failureReasonById[notification.id]?.trim();
                          if (reason) {
                            onUpdateNotificationDelivery(application.id, notification.id, 'Failed', reason);
                          }
                        }}
                        disabled={!failureReasonById[notification.id]?.trim()}
                        className="rounded bg-rose-700 px-2.5 py-1 text-[10px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Record failure
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="p-4 text-xs text-slate-500">No message outbox items have been queued or scheduled.</p>
          )}
        </section>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <h3 className="flex items-center gap-2 font-bold text-slate-900">
            <ArrowRight className="h-5 w-5 text-blue-700" />
            Application journey
          </h3>
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { title: 'Application created', icon: FileText, tone: 'bg-blue-100 text-blue-700' },
              { title: 'Payment', subtitle: 'Government Gateway', icon: CircleDollarSign, tone: 'bg-emerald-100 text-emerald-700' },
              { title: 'Return to OPAS', subtitle: 'Expected', icon: ExternalLink, tone: 'bg-amber-100 text-amber-700' },
              { title: 'Submit application', subtitle: 'Finalise in OPAS', icon: FileCheck2, tone: 'bg-violet-100 text-violet-700' },
            ].map(({ title, subtitle, icon: Icon, tone }, index) => (
              <div key={title} className="relative flex flex-col items-center text-center">
                <span className={`flex h-11 w-11 items-center justify-center rounded-full ${tone}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <p className="mt-2 text-xs font-bold text-slate-800">{title}</p>
                {subtitle && <p className="mt-0.5 text-[10px] text-slate-500">{subtitle}</p>}
                {index < 3 && <ArrowRight className="absolute -right-3 top-3 hidden h-4 w-4 text-slate-400 sm:block" />}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <h3 className="flex items-center gap-2 font-bold text-slate-900">
            <Send className="h-5 w-5 text-blue-700" />
            Next steps
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">
            SmartGuide cannot send payment reminders or confirm a gateway return until an official OPAS and payment
            gateway connection is configured.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <button
              onClick={exportReport}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50"
            >
              <Download className="h-4 w-4" /> Export visible records (CSV)
            </button>
            <a
              href={OPAS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800"
            >
              Open official OPAS <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </section>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-950">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Important: successful payment does not mean an application has been submitted. The official submission status
          must be confirmed in OPAS.
        </p>
      </div>
    </div>
  );
};
