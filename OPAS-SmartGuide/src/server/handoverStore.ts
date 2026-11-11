// Storage for the live officer handover (applicant asks the AI assistant for a human officer).
import { database } from './persistence.ts';

export function initializeHandoverStore() {
  database.exec(`
    CREATE TABLE IF NOT EXISTS support_handovers (
      id TEXT PRIMARY KEY, applicant_user_id TEXT NOT NULL, applicant_name TEXT NOT NULL,
      application_reference TEXT NOT NULL DEFAULT '', question TEXT NOT NULL, transcript TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'WAITING' CHECK(status IN ('WAITING','ACTIVE','CLOSED')),
      officer_id TEXT, officer_name TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, closed_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_support_handovers_status ON support_handovers(status, created_at);
    CREATE TABLE IF NOT EXISTS support_handover_messages (
      id TEXT PRIMARY KEY, handover_id TEXT NOT NULL REFERENCES support_handovers(id) ON DELETE CASCADE,
      sender_role TEXT NOT NULL CHECK(sender_role IN ('applicant','officer','system')),
      sender_name TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_support_handover_messages ON support_handover_messages(handover_id, created_at);
  `);
}
export type HandoverStatus = 'WAITING' | 'ACTIVE' | 'CLOSED';
export interface HandoverMessage { id: string; handoverId: string; senderRole: 'applicant' | 'officer' | 'system'; senderName: string; content: string; createdAt: string; }
export interface SupportHandover {
  id: string; applicantUserId: string; applicantName: string; applicationReference: string; question: string;
  transcript: Array<{ role: string; text: string }>; status: HandoverStatus; officerId?: string; officerName?: string;
  createdAt: string; updatedAt: string; closedAt?: string; messages: HandoverMessage[];
}

function mapHandover(row: any): SupportHandover {
  const messages = (database.prepare('SELECT * FROM support_handover_messages WHERE handover_id = ? ORDER BY created_at ASC').all(row.id) as any[])
    .map((m) => ({ id: m.id, handoverId: m.handover_id, senderRole: m.sender_role, senderName: m.sender_name, content: m.content, createdAt: m.created_at }));
  let transcript: Array<{ role: string; text: string }> = [];
  try { transcript = JSON.parse(row.transcript || '[]'); } catch { transcript = []; }
  return {
    id: row.id, applicantUserId: row.applicant_user_id, applicantName: row.applicant_name, applicationReference: row.application_reference,
    question: row.question, transcript, status: row.status, officerId: row.officer_id || undefined, officerName: row.officer_name || undefined,
    createdAt: row.created_at, updatedAt: row.updated_at, closedAt: row.closed_at || undefined, messages,
  };
}

export function createHandover(input: { id: string; applicantUserId: string; applicantName: string; applicationReference: string; question: string; transcript: Array<{ role: string; text: string }> }): SupportHandover {
  const now = new Date().toISOString();
  database.prepare(`INSERT INTO support_handovers (id, applicant_user_id, applicant_name, application_reference, question, transcript, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'WAITING', ?, ?)`).run(input.id, input.applicantUserId, input.applicantName, input.applicationReference, input.question, JSON.stringify(input.transcript.slice(-20)), now, now);
  return getHandover(input.id)!;
}

export function getHandover(id: string): SupportHandover | undefined {
  const row = database.prepare('SELECT * FROM support_handovers WHERE id = ?').get(id);
  return row ? mapHandover(row) : undefined;
}

export function findOpenHandoverForApplicant(applicantUserId: string): SupportHandover | undefined {
  const row = database.prepare(`SELECT * FROM support_handovers WHERE applicant_user_id = ? AND status != 'CLOSED' ORDER BY created_at DESC LIMIT 1`).get(applicantUserId);
  return row ? mapHandover(row) : undefined;
}

export function listHandovers(includeClosed = false, limit = 50): SupportHandover[] {
  const rows = includeClosed
    ? database.prepare('SELECT * FROM support_handovers ORDER BY created_at DESC LIMIT ?').all(limit)
    : database.prepare(`SELECT * FROM support_handovers WHERE status != 'CLOSED' ORDER BY created_at ASC LIMIT ?`).all(limit);
  return (rows as any[]).map(mapHandover);
}

export function addHandoverMessage(input: Omit<HandoverMessage, 'createdAt'>): HandoverMessage {
  const createdAt = new Date().toISOString();
  database.prepare('INSERT INTO support_handover_messages (id, handover_id, sender_role, sender_name, content, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(input.id, input.handoverId, input.senderRole, input.senderName, input.content.slice(0, 2000), createdAt);
  database.prepare('UPDATE support_handovers SET updated_at = ? WHERE id = ?').run(createdAt, input.handoverId);
  return { ...input, createdAt };
}

export function updateHandoverStatus(id: string, status: HandoverStatus, officer?: { id: string; name: string }) {
  const now = new Date().toISOString();
  return database.prepare(`UPDATE support_handovers SET status = ?, updated_at = ?,
      officer_id = COALESCE(?, officer_id), officer_name = COALESCE(?, officer_name),
      closed_at = CASE WHEN ? = 'CLOSED' THEN ? ELSE closed_at END
    WHERE id = ?`).run(status, now, officer?.id ?? null, officer?.name ?? null, status, now, id).changes > 0;
}
