// Follow-up for reverted and paid-but-unsubmitted applications:
// - status transitions -> n8n reminder engine + applicant confirmation messages
// - server-confirmed status changes from the SmartGuide UI (officer revert, applicant resubmit)
// - background reminder cycle with real delivery and channel fallback
// - live officer handover API for the AI assistant
import { randomUUID } from 'node:crypto';
import type express from 'express';
import type { ApplicationStatus, NotificationLog, PassportApplication } from '../types/passport.ts';
import type { UserAccount } from '../types/auth.ts';
import { detectReminderCandidates, availableChannels, type ReminderRule } from '../utils/reminderRules.ts';
import { classifyCorrectionField } from '../utils/correctionLinks.ts';
import { saveApplicantMessage, saveIntegrationEvent, saveReminderRun } from './persistence.ts';
import {
  createHandover, getHandover, findOpenHandoverForApplicant, listHandovers, addHandoverMessage, updateHandoverStatus,
} from './handoverStore.ts';
import {
  buildReminderMessage, deliverWithFallback, forwardToReminderEngine, isReminderEngineConfigured, type ReminderEngineEvent,
} from './reminderDispatch.ts';

type Session = { userId: string; role: string; authSource?: string } | null;

export interface ReminderAuditRecord {
  id: string; timestamp: string; source: string; applicationId: string; trackingNumber: string;
  channel: string; outcome: 'QUEUED' | 'SKIPPED'; reason: string;
}

export interface FollowupDeps {
  users: UserAccount[];
  getApplications: () => PassportApplication[];
  replaceApplication: (updated: PassportApplication) => void;
  saveApplication: (application: PassportApplication) => Promise<void>;
  getSession: (req: express.Request) => Session;
  requireStaff: (...roles: Array<'officer' | 'supervisor' | 'admin'>) => express.RequestHandler;
  findApplicantAccount: (application: PassportApplication) => UserAccount | undefined;
}

export function reminderEventFor(previous: ApplicationStatus | undefined, next: ApplicationStatus): ReminderEngineEvent | null {
  if (previous === next) return null;
  if (next === 'Reverted') return 'REVERTED';
  if (next === 'Paid - Unsubmitted') return 'PAID_UNSUBMITTED';
  if (next === 'Submitted - Under Review') return previous === 'Reverted' ? 'RESUBMITTED' : 'SUBMITTED';
  if (previous === 'Reverted' || previous === 'Paid - Unsubmitted') return 'SUBMITTED';
  return null;
}

const HANDOVER_WAIT_NOTE = 'You are in the queue for a passport officer (Mon-Fri 08:00-17:00). Keep this window open; replies appear here. You will also get an OPAS message if you leave.';

export function createFollowup(deps: FollowupDeps) {
  const activeAccount = (req: express.Request) => {
    const session = deps.getSession(req);
    return session ? deps.users.find((u) => u.id === session.userId && u.role === session.role && u.status === 'ACTIVE') : undefined;
  };

  /** Called after every status change. Forwards to the reminder engine and posts a confirmation on (re)submission. */
  function afterStatusChange(previous: ApplicationStatus | undefined, application: PassportApplication, officerComment?: string) {
    const event = reminderEventFor(previous, application.status);
    if (!event) return null;
    if (event === 'RESUBMITTED' || event === 'SUBMITTED') {
      const applicant = deps.findApplicantAccount(application);
      if (applicant) saveApplicantMessage({
        id: `msg-${event.toLowerCase()}-${application.id}-${Date.now()}`, applicantUserId: applicant.id,
        applicationReference: application.trackingNumber, channel: 'IN_APP',
        subject: event === 'RESUBMITTED' ? `Resubmission received: ${application.trackingNumber}` : `Application submitted: ${application.trackingNumber}`,
        content: event === 'RESUBMITTED'
          ? `We received your corrected application ${application.trackingNumber} on ${new Date().toLocaleString('en-GB', { timeZone: 'Africa/Lusaka' })}. It is back in the review queue. You do not need to resubmit again, and reminders have stopped.`
          : `Your application ${application.trackingNumber} is submitted and in the review queue. Reminders have stopped.`,
        status: 'AVAILABLE', createdAt: new Date().toISOString(), batchId: `status-${application.trackingNumber}`,
        dedupeKey: `status:${event}:${application.trackingNumber}:${application.lastUpdated}`,
      });
    }
    void forwardToReminderEngine(event, application, { officerComment }).then((result) => {
      if (result.skipped) return;
      saveIntegrationEvent({
        id: `reminder-engine-${application.trackingNumber}-${Date.now()}`, kind: 'REMINDER_ENGINE',
        applicationReference: application.trackingNumber, outcome: result.ok ? 'FORWARDED' : 'FORWARD_FAILED',
        detail: result.ok ? `${event} forwarded to the n8n reminder engine.` : `${event} could not be forwarded: ${result.reason}`,
        receivedAt: new Date().toISOString(),
      });
      if (!result.ok) console.warn(`Reminder engine forward failed for ${application.trackingNumber}: ${result.reason}`);
    });
    return event;
  }

  /** One reminder pass. Marks a reminder Sent only when Twilio/Resend accepted it; otherwise falls back. */
  async function runReminderCycle(source: string, rules: ReminderRule[], audit: ReminderAuditRecord[]) {
    const now = new Date();
    const candidates = detectReminderCandidates(deps.getApplications(), rules, now);
    // With the n8n engine connected it owns SMS/email (receipts, escalation); here we only post the Message Board copy.
    const delegated = isReminderEngineConfigured();
    let sent = 0; let failed = 0; let queued = 0;

    for (const candidate of candidates) {
      const { application, reason, rule } = candidate;
      const reminderNumber = application.notifications.filter((n) => n.trigger === 'AUTOMATED_WORKFLOW').length + 1;
      const message = buildReminderMessage(application, reminderNumber);
      const channels = delegated ? ['OPAS Message Board' as const] : availableChannels(application, rule.channelPriority);
      if (!channels.includes('OPAS Message Board')) channels.push('OPAS Message Board');
      const outcome = await deliverWithFallback(application, channels, message);
      if (outcome.deliveryStatus === 'Sent') sent += 1; else if (outcome.deliveryStatus === 'Failed') failed += 1; else queued += 1;

      const notification: NotificationLog = {
        id: `scheduled-${now.getTime()}-${application.id}`,
        timestamp: now.toISOString(),
        channel: outcome.channel,
        subject: message.subject,
        content: outcome.channel === 'SMS' ? message.sms : message.text,
        deliveryStatus: outcome.deliveryStatus,
        failureReason: outcome.failureReason,
        auditId: `AUD-SCHEDULED-${now.getTime()}-${application.id}`,
        trigger: 'AUTOMATED_WORKFLOW',
        dispatchedBy: { userId: 'opas-reminder-scheduler', name: 'OPAS Reminder Scheduler', role: 'system' },
        deliveryUpdatedAt: now.toISOString(),
        auditTrail: outcome.attempts.map((attempt, index) => ({
          id: `evt-scheduled-${now.getTime()}-${application.id}-${index}`,
          timestamp: now.toISOString(),
          event: attempt.ok ? 'DISPATCHED' : 'FAILED',
          actor: 'OPAS Reminder Scheduler',
          details: `${source} cycle, reminder ${reminderNumber}: ${attempt.channel} ${attempt.ok ? `accepted${attempt.providerMessageId ? ` (provider id ${attempt.providerMessageId})` : ''}` : `failed - ${attempt.reason}`}. ${delegated ? 'SMS/email delegated to the n8n reminder engine.' : ''} ${reason}`.trim(),
        })),
      };

      application.notifications.unshift(notification);
      application.lastUpdated = now.toISOString();
      await deps.saveApplication(application);
      const applicant = deps.findApplicantAccount(application);
      if (applicant) saveApplicantMessage({
        id: `msg-reminder-${application.id}-${now.getTime()}`, applicantUserId: applicant.id,
        applicationReference: application.trackingNumber, channel: 'OPAS_MESSAGE_BOARD',
        subject: message.subject, content: message.text, status: 'AVAILABLE', createdAt: now.toISOString(),
        batchId: `reminder-${now.toISOString().slice(0, 13)}`, dedupeKey: `reminder:${application.trackingNumber}:${reminderNumber}`,
      });
      audit.unshift({
        id: `run-${now.getTime()}-${application.id}`, timestamp: now.toISOString(), source,
        applicationId: application.id, trackingNumber: application.trackingNumber, channel: outcome.channel,
        outcome: outcome.deliveryStatus === 'Failed' ? 'SKIPPED' : 'QUEUED',
        reason: outcome.failureReason ? `${reason} ${outcome.failureReason}` : reason,
      });
    }

    const summary = { ranAt: now.toISOString(), source, eligible: candidates.length, queued, sent, failed, delegatedToN8n: delegated };
    await saveReminderRun(summary);
    return summary;
  }

  function registerRoutes(app: express.Express) {
    // SmartGuide UI status changes (officer revert, applicant resubmit). Server-side so the change is persisted,
    // reminders start/stop, and the applicant only sees "resubmitted" once it is really saved.
    app.post('/api/applications/status-events', async (req, res) => {
      const account = activeAccount(req);
      if (!account) return res.status(401).json({ success: false, error: 'Please sign in again. Your change was NOT saved.' });
      const reference = String(req.body?.applicationReference || '').trim();
      const status = String(req.body?.status || '') as ApplicationStatus;
      const note = String(req.body?.note || '').slice(0, 1000);
      if (!reference || !['Reverted', 'Submitted - Under Review'].includes(status)) {
        return res.status(400).json({ success: false, error: 'applicationReference and a status of Reverted or Submitted - Under Review are required.' });
      }
      const application = deps.getApplications().find((a) => a.trackingNumber === reference || a.id === reference);
      if (!application) return res.status(404).json({ success: false, error: `Application ${reference} was not found. Your change was NOT saved.` });
      if (account.role === 'citizen') {
        const owns = (account.nrcNumber && application.nrcNumber && account.nrcNumber.trim().toLowerCase() === application.nrcNumber.trim().toLowerCase())
          || (account.email && application.contact.email && account.email.trim().toLowerCase() === application.contact.email.trim().toLowerCase());
        if (!owns || status !== 'Submitted - Under Review') return res.status(403).json({ success: false, error: 'You can only resubmit your own application.' });
        if (!['Reverted', 'Paid - Unsubmitted', 'Draft'].includes(application.status)) {
          return res.json({ success: true, unchanged: true, applicationReference: application.trackingNumber, status: application.status,
            message: 'This application is already submitted. You do not need to submit it again.' });
        }
      } else if (!['officer', 'supervisor', 'admin'].includes(account.role)) {
        return res.status(403).json({ success: false, error: 'Your role cannot change application status.' });
      }
      const previous = application.status;
      const now = new Date().toISOString();
      const updated = {
        ...application, status, daysInStatus: 0, lastUpdated: now,
        ...(status === 'Reverted' ? { reversionReason: note || application.reversionReason, revertedAt: now, waitingForApplicantSince: now } : { waitingForApplicantSince: undefined }),
        submissionStatus: status === 'Submitted - Under Review' ? 'SUBMITTED' : application.submissionStatus,
      } as PassportApplication;
      await deps.saveApplication(updated);
      deps.replaceApplication(updated);
      const event = afterStatusChange(previous, updated, status === 'Reverted' ? note : undefined);
      return res.json({
        success: true, applicationReference: updated.trackingNumber, status: updated.status, previousStatus: previous, event,
        confirmedAt: now, confirmationNumber: `SG-ACK-${updated.trackingNumber}-${Date.now().toString(36).toUpperCase()}`,
        correctionTarget: status === 'Reverted' ? classifyCorrectionField(note) : undefined,
      });
    });

    // ---- Live officer handover from the AI assistant ----
    app.post('/api/support/handovers', (req, res) => {
      const applicant = activeAccount(req);
      if (!applicant || applicant.role !== 'citizen') return res.status(401).json({ success: false, error: 'Please sign in to talk to an officer.' });
      const existing = findOpenHandoverForApplicant(applicant.id);
      if (existing) return res.json({ success: true, handover: existing, reused: true });
      const question = String(req.body?.question || '').trim().slice(0, 1000) || 'Applicant asked to speak to an officer.';
      const transcript = Array.isArray(req.body?.transcript)
        ? req.body.transcript.slice(-20).map((m: any) => ({ role: String(m?.role || ''), text: String(m?.text || '').slice(0, 1000) }))
        : [];
      const ownApp = deps.getApplications().find((a) =>
        (applicant.nrcNumber && a.nrcNumber?.toLowerCase() === applicant.nrcNumber.toLowerCase()) ||
        (applicant.email && a.contact.email?.toLowerCase() === applicant.email.toLowerCase()));
      const requested = String(req.body?.applicationReference || '').trim();
      const handover = createHandover({
        id: `hnd-${randomUUID()}`, applicantUserId: applicant.id, applicantName: applicant.fullName,
        applicationReference: requested || ownApp?.trackingNumber || '', question, transcript,
      });
      addHandoverMessage({ id: `hmsg-${randomUUID()}`, handoverId: handover.id, senderRole: 'system', senderName: 'OPAS', content: HANDOVER_WAIT_NOTE });
      return res.status(201).json({ success: true, handover: getHandover(handover.id) });
    });

    app.get('/api/support/handovers/mine', (req, res) => {
      const applicant = activeAccount(req);
      if (!applicant || applicant.role !== 'citizen') return res.status(401).json({ success: false, error: 'Please sign in.' });
      return res.json({ success: true, handover: findOpenHandoverForApplicant(applicant.id) || null });
    });

    app.get('/api/support/handovers', deps.requireStaff('officer', 'supervisor', 'admin'), (req, res) => {
      return res.json({ success: true, handovers: listHandovers(String(req.query.includeClosed) === 'true') });
    });

    app.post('/api/support/handovers/:id/messages', (req, res) => {
      const handover = getHandover(String(req.params.id));
      if (!handover) return res.status(404).json({ success: false, error: 'Conversation not found.' });
      if (handover.status === 'CLOSED') return res.status(409).json({ success: false, error: 'This conversation is closed. Start a new one from the assistant.' });
      const content = String(req.body?.content || '').trim();
      if (!content) return res.status(400).json({ success: false, error: 'Message is empty.' });
      const account = activeAccount(req);
      if (!account) return res.status(401).json({ success: false, error: 'Please sign in.' });
      if (account.role === 'citizen') {
        if (account.id !== handover.applicantUserId) return res.status(403).json({ success: false, error: 'Not your conversation.' });
        addHandoverMessage({ id: `hmsg-${randomUUID()}`, handoverId: handover.id, senderRole: 'applicant', senderName: account.fullName, content });
      } else {
        if (handover.status === 'WAITING') {
          updateHandoverStatus(handover.id, 'ACTIVE', { id: account.id, name: account.fullName });
          addHandoverMessage({ id: `hmsg-${randomUUID()}`, handoverId: handover.id, senderRole: 'system', senderName: 'OPAS', content: `${account.fullName} (passport officer) has joined the conversation.` });
        }
        addHandoverMessage({ id: `hmsg-${randomUUID()}`, handoverId: handover.id, senderRole: 'officer', senderName: account.fullName, content });
        saveApplicantMessage({
          id: `msg-handover-${handover.id}-${Date.now()}`, applicantUserId: handover.applicantUserId,
          applicationReference: handover.applicationReference || 'GENERAL', channel: 'IN_APP',
          subject: 'A passport officer replied to your question', content: `${account.fullName}: ${content}`,
          status: 'AVAILABLE', createdAt: new Date().toISOString(), batchId: `handover-${handover.id}`, dedupeKey: `handover:${handover.id}:${Date.now()}`,
        });
      }
      return res.json({ success: true, handover: getHandover(handover.id) });
    });

    app.post('/api/support/handovers/:id/close', (req, res) => {
      const handover = getHandover(String(req.params.id));
      if (!handover) return res.status(404).json({ success: false, error: 'Conversation not found.' });
      const account = activeAccount(req);
      if (!account || (account.role === 'citizen' && account.id !== handover.applicantUserId)) return res.status(403).json({ success: false, error: 'Not allowed.' });
      updateHandoverStatus(handover.id, 'CLOSED', account.role === 'citizen' ? undefined : { id: account.id, name: account.fullName });
      addHandoverMessage({ id: `hmsg-${randomUUID()}`, handoverId: handover.id, senderRole: 'system', senderName: 'OPAS', content: `Conversation closed by ${account.role === 'citizen' ? 'the applicant' : account.fullName}.` });
      return res.json({ success: true, handover: getHandover(handover.id) });
    });
  }

  return { afterStatusChange, runReminderCycle, registerRoutes };
}
