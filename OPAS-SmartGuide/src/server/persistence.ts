import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { PassportApplication } from '../types/passport.ts';
import { ReminderRule, DEFAULT_REMINDER_RULES } from '../utils/reminderRules.ts';
import type { DocumentIssueFeedbackRecord } from '../utils/responsibleAIEngine.ts';

export interface SimulatedPaymentTransaction {
  applicationReference: string;
  transactionReference: string;
  paymentStatus: 'SUCCESSFUL' | 'FAILED';
  amount: number;
  currency: string;
  paymentDate: string;
  applicantId?: string;
  paymentReferenceNumber?: string;
  gatewayConfirmation?: string;
  opasAcknowledgementReference?: string;
  smartGuideAcknowledgementReference?: string;
  source?: 'OPAS_API' | 'SMARTGUIDE_SANDBOX';
}

const configuredPath = process.env.OPAS_SQLITE_PATH?.trim() || 'data/opas.sqlite';
const databasePath = path.resolve(configuredPath);

mkdirSync(path.dirname(databasePath), { recursive: true });

const database = new Database(databasePath);
database.pragma('journal_mode = WAL');
database.pragma('foreign_keys = ON');
database.pragma('busy_timeout = 5000');

export async function initializePersistence() {
  database.exec(`
    CREATE TABLE IF NOT EXISTS application_snapshots (
      id TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS notification_audit (
      audit_id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS reminder_rules (
      id TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS reminder_runs (
      id TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS simulated_payment_transactions (
      transaction_reference TEXT PRIMARY KEY,
      application_reference TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS integration_events (
      id TEXT PRIMARY KEY, kind TEXT NOT NULL, application_reference TEXT NOT NULL,
      transaction_reference TEXT, outcome TEXT NOT NULL, payload TEXT NOT NULL, received_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_integration_events_app ON integration_events(application_reference, received_at DESC);
    CREATE TABLE IF NOT EXISTS document_issue_feedback (
      feedback_id TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS applicant_messages (
      id TEXT PRIMARY KEY,
      applicant_user_id TEXT NOT NULL,
      application_reference TEXT NOT NULL,
      channel TEXT NOT NULL CHECK(channel IN ('IN_APP','OPAS_MESSAGE_BOARD')),
      subject TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK(status IN ('AVAILABLE','READ','RESOLVED')) ,
      created_at TEXT NOT NULL,
      read_at TEXT,
      batch_id TEXT NOT NULL,
      dedupe_key TEXT NOT NULL UNIQUE
    );
    CREATE INDEX IF NOT EXISTS idx_applicant_messages_user ON applicant_messages(applicant_user_id, created_at DESC);
    CREATE TABLE IF NOT EXISTS email_notification_outbox (
      id TEXT PRIMARY KEY, dedupe_key TEXT NOT NULL UNIQUE, batch_id TEXT NOT NULL,
      application_reference TEXT NOT NULL, recipient_email TEXT NOT NULL, subject TEXT NOT NULL,
      content TEXT NOT NULL, status TEXT NOT NULL, provider_message_id TEXT,
      failure_reason TEXT, delivery_state TEXT NOT NULL DEFAULT 'unknown',
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_email_outbox_created ON email_notification_outbox(created_at DESC);
    CREATE TABLE IF NOT EXISTS notification_batches (
      id TEXT PRIMARY KEY, payload TEXT NOT NULL, created_at TEXT NOT NULL
    );
  `);
}

export async function loadApplications(seed: PassportApplication[]): Promise<PassportApplication[]> {
  const rows = database
    .prepare('SELECT payload FROM application_snapshots ORDER BY updated_at DESC')
    .all() as Array<{ payload: string }>;

  if (rows.length > 0) {
    return rows.map((row) => JSON.parse(row.payload) as PassportApplication);
  }

  const seedApplications = database.transaction((applications: PassportApplication[]) => {
    for (const application of applications) {
      saveApplication(application);
    }
  });
  seedApplications(seed);
  return structuredClone(seed);
}

export async function saveApplication(application: PassportApplication) {
  const save = database.transaction((record: PassportApplication) => {
    database.prepare(`
      INSERT INTO application_snapshots (id, payload, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        payload = excluded.payload,
        updated_at = excluded.updated_at
    `).run(record.id, JSON.stringify(record), new Date().toISOString());

    const saveNotification = database.prepare(`
      INSERT INTO notification_audit (audit_id, application_id, payload, created_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(audit_id) DO UPDATE SET payload = excluded.payload
    `);

    for (const notification of record.notifications) {
      if (!notification.auditId) continue;
      saveNotification.run(
        notification.auditId,
        record.id,
        JSON.stringify(notification),
        new Date(notification.timestamp).toISOString(),
      );
    }
  });

  save(application);
}

export async function loadSimulatedPaymentTransactions(
  seedApplications: PassportApplication[]
): Promise<SimulatedPaymentTransaction[]> {
  const rows = database
    .prepare('SELECT payload FROM simulated_payment_transactions ORDER BY created_at DESC')
    .all() as Array<{ payload: string }>;
  if (rows.length) {
    return rows.map((row) => JSON.parse(row.payload) as SimulatedPaymentTransaction);
  }

  const seedTransactions = seedApplications
    .filter((application) => application.feePaid)
    .map((application) => ({
      applicationReference: application.trackingNumber,
      transactionReference: application.paymentReference || `SIM-${application.trackingNumber}`,
      paymentStatus: 'SUCCESSFUL' as const,
      amount: application.feeAmount,
      currency: 'ZMW',
      paymentDate: application.paidAt || application.lastUpdated,
    }));
  const insert = database.prepare(`
    INSERT OR IGNORE INTO simulated_payment_transactions
      (transaction_reference, application_reference, payload, created_at)
    VALUES (?, ?, ?, ?)
  `);
  const seed = database.transaction((transactions: SimulatedPaymentTransaction[]) => {
    for (const transaction of transactions) {
      insert.run(
        transaction.transactionReference,
        transaction.applicationReference,
        JSON.stringify(transaction),
        transaction.paymentDate,
      );
    }
  });
  seed(seedTransactions);
  return seedTransactions;
}

export async function saveSimulatedPaymentTransaction(transaction: SimulatedPaymentTransaction) {
  database.prepare(`
    INSERT INTO simulated_payment_transactions
      (transaction_reference, application_reference, payload, created_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(transaction_reference) DO UPDATE SET
      application_reference = excluded.application_reference,
      payload = excluded.payload,
      created_at = excluded.created_at
  `).run(
    transaction.transactionReference,
    transaction.applicationReference,
    JSON.stringify(transaction),
    transaction.paymentDate,
  );
}

export async function loadDocumentIssueFeedback(): Promise<DocumentIssueFeedbackRecord[]> {
  const rows = database
    .prepare('SELECT payload FROM document_issue_feedback ORDER BY created_at DESC')
    .all() as Array<{ payload: string }>;
  return rows.map((row) => JSON.parse(row.payload) as DocumentIssueFeedbackRecord);
}

export async function saveDocumentIssueFeedback(record: DocumentIssueFeedbackRecord) {
  database.prepare(`
    INSERT INTO document_issue_feedback (feedback_id, payload, created_at)
    VALUES (?, ?, ?)
  `).run(record.id, JSON.stringify(record), record.reviewedAt);
}

export async function loadReminderRules(): Promise<ReminderRule[]> {
  const rows = database
    .prepare('SELECT payload FROM reminder_rules ORDER BY updated_at DESC')
    .all() as Array<{ payload: string }>;

  if (rows.length > 0) {
    return rows.map((row) => JSON.parse(row.payload) as ReminderRule);
  }

  for (const rule of DEFAULT_REMINDER_RULES) {
    await saveReminderRule(rule);
  }
  return structuredClone(DEFAULT_REMINDER_RULES);
}

export async function saveReminderRule(rule: ReminderRule) {
  database.prepare(`
    INSERT INTO reminder_rules (id, payload, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      payload = excluded.payload,
      updated_at = excluded.updated_at
  `).run(rule.id, JSON.stringify(rule), new Date().toISOString());
}

export async function saveReminderRun(run: Record<string, unknown>) {
  database.prepare(`
    INSERT INTO reminder_runs (id, payload, created_at)
    VALUES (?, ?, ?)
  `).run(
    `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    JSON.stringify(run),
    new Date().toISOString(),
  );
}


export type ApplicantMessageChannel = 'IN_APP' | 'OPAS_MESSAGE_BOARD';
export interface ApplicantMessageRecord {
  id: string; applicantUserId: string; applicationReference: string; channel: ApplicantMessageChannel;
  subject: string; content: string; status: 'AVAILABLE' | 'READ' | 'RESOLVED';
  createdAt: string; readAt?: string; batchId: string; dedupeKey: string;
}

export function saveApplicantMessage(record: ApplicantMessageRecord) {
  const result = database.prepare(`
    INSERT OR IGNORE INTO applicant_messages
      (id, applicant_user_id, application_reference, channel, subject, content, status, created_at, read_at, batch_id, dedupe_key)
    VALUES (@id, @applicantUserId, @applicationReference, @channel, @subject, @content, @status, @createdAt, @readAt, @batchId, @dedupeKey)
  `).run(record);
  return result.changes > 0;
}

export function listApplicantMessages(applicantUserId: string, channel?: ApplicantMessageChannel) {
  const rows = channel
    ? database.prepare('SELECT * FROM applicant_messages WHERE applicant_user_id = ? AND channel = ? ORDER BY created_at DESC').all(applicantUserId, channel)
    : database.prepare('SELECT * FROM applicant_messages WHERE applicant_user_id = ? ORDER BY created_at DESC').all(applicantUserId);
  return (rows as any[]).map((row) => ({
    id: row.id, applicantUserId: row.applicant_user_id, applicationReference: row.application_reference,
    channel: row.channel, subject: row.subject, content: row.content, status: row.status,
    createdAt: row.created_at, readAt: row.read_at || undefined, batchId: row.batch_id, dedupeKey: row.dedupe_key,
  })) as ApplicantMessageRecord[];
}

export function markApplicantMessageRead(id: string, applicantUserId: string) {
  const now = new Date().toISOString();
  return database.prepare(`UPDATE applicant_messages SET status = 'READ', read_at = ?
    WHERE id = ? AND applicant_user_id = ? AND status = 'AVAILABLE'`).run(now, id, applicantUserId).changes > 0;
}

export function saveNotificationBatch(batch: Record<string, unknown>) {
  database.prepare('INSERT INTO notification_batches (id, payload, created_at) VALUES (?, ?, ?)')
    .run(String(batch.id), JSON.stringify(batch), String(batch.createdAt));
}

export function listNotificationBatches(limit = 50) {
  return (database.prepare('SELECT payload FROM notification_batches ORDER BY created_at DESC LIMIT ?').all(limit) as Array<{payload:string}>)
    .map((row) => JSON.parse(row.payload));
}


export interface EmailOutboxRecord {
  id: string; dedupeKey: string; batchId: string; applicationReference: string;
  recipientEmail: string; subject: string; content: string;
  status: 'PENDING' | 'SENT' | 'FAILED'; providerMessageId?: string;
  failureReason?: string; deliveryState: 'delivered' | 'bounced' | 'pending' | 'unknown';
  createdAt: string; updatedAt: string;
}

/** Inserts before dispatch, so a repeated bulk run cannot send the same email twice. */
export function claimEmailNotification(record: EmailOutboxRecord): boolean {
  const result = database.prepare(`INSERT OR IGNORE INTO email_notification_outbox
    (id, dedupe_key, batch_id, application_reference, recipient_email, subject, content, status,
     provider_message_id, failure_reason, delivery_state, created_at, updated_at)
    VALUES (@id, @dedupeKey, @batchId, @applicationReference, @recipientEmail, @subject, @content, @status,
     @providerMessageId, @failureReason, @deliveryState, @createdAt, @updatedAt)`).run({
       ...record, providerMessageId: record.providerMessageId ?? null, failureReason: record.failureReason ?? null,
     });
  return result.changes > 0;
}

export function updateEmailNotification(id: string, update: {
  status?: 'PENDING' | 'SENT' | 'FAILED'; providerMessageId?: string; failureReason?: string;
  deliveryState?: 'delivered' | 'bounced' | 'pending' | 'unknown';
}) {
  const current = database.prepare('SELECT * FROM email_notification_outbox WHERE id = ?').get(id) as any;
  if (!current) return false;
  database.prepare(`UPDATE email_notification_outbox SET status = ?, provider_message_id = ?,
    failure_reason = ?, delivery_state = ?, updated_at = ? WHERE id = ?`).run(
      update.status ?? current.status, update.providerMessageId ?? current.provider_message_id,
      update.failureReason ?? current.failure_reason, update.deliveryState ?? current.delivery_state,
      new Date().toISOString(), id);
  return true;
}

export function listEmailNotifications(limit = 100): EmailOutboxRecord[] {
  const rows = database.prepare('SELECT * FROM email_notification_outbox ORDER BY created_at DESC LIMIT ?').all(limit) as any[];
  return rows.map((row) => ({ id: row.id, dedupeKey: row.dedupe_key, batchId: row.batch_id,
    applicationReference: row.application_reference, recipientEmail: row.recipient_email,
    subject: row.subject, content: row.content, status: row.status,
    providerMessageId: row.provider_message_id || undefined, failureReason: row.failure_reason || undefined,
    deliveryState: row.delivery_state, createdAt: row.created_at, updatedAt: row.updated_at }));
}


export function saveIntegrationEvent(event: Record<string, unknown>) {
  database.prepare(`INSERT OR IGNORE INTO integration_events
    (id, kind, application_reference, transaction_reference, outcome, payload, received_at)
    VALUES (@id, @kind, @applicationReference, @transactionReference, @outcome, @payload, @receivedAt)`).run({
      id: String(event.id), kind: String(event.kind), applicationReference: String(event.applicationReference),
      transactionReference: event.transactionReference ? String(event.transactionReference) : null,
      outcome: String(event.outcome), payload: JSON.stringify(event), receivedAt: String(event.receivedAt),
    });
}

export function listIntegrationEvents(limit = 100) {
  return (database.prepare('SELECT payload FROM integration_events ORDER BY received_at DESC LIMIT ?').all(limit) as Array<{payload:string}>)
    .map((row) => JSON.parse(row.payload));
}

export function getIntegrationPaymentTransactions() {
  return (database.prepare('SELECT payload FROM simulated_payment_transactions ORDER BY created_at DESC').all() as Array<{payload:string}>)
    .map((row) => JSON.parse(row.payload) as SimulatedPaymentTransaction);
}
