import React, { useState } from 'react';
import {
  X,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Send,
  Phone,
  Mail,
  FileText,
  Clock,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { PassportApplication, AITriageAnalysis, NotificationLog, UploadedDocument } from '../../types/passport';
import { validateNRC, validatePhoneNumber, validateEmail } from '../../utils/validation';
import { DocumentViewerModal } from '../common/DocumentViewerModal';

interface CaseTriageModalProps {
  application: PassportApplication;
  onClose: () => void;
  onUpdateStatus: (id: string, newStatus: PassportApplication['status'], notes?: string) => void;
  onAddNotification: (id: string, notif: NotificationLog) => void;
  onUpdateNotificationDelivery: (
    applicationId: string,
    notificationId: string,
    deliveryStatus: NotificationLog['deliveryStatus'],
    failureReason?: string
  ) => void;
}

export const CaseTriageModal: React.FC<CaseTriageModalProps> = ({
  application,
  onClose,
  onUpdateStatus,
  onAddNotification,
  onUpdateNotificationDelivery,
}) => {
  const [activeTab, setActiveTab] = useState<'triage' | 'reminder' | 'documents' | 'history'>('triage');
  const [loadingTriage, setLoadingTriage] = useState(false);
  const [triageData, setTriageData] = useState<AITriageAnalysis | null>(null);

  // Automated Reminder State
  const [channel, setChannel] = useState<'SMS' | 'Email' | 'OPAS Message Board'>('SMS');
  const [generatingReminder, setGeneratingReminder] = useState(false);
  const [reminderDraft, setReminderDraft] = useState({
    subject: `Action Required for Application #${application.trackingNumber}`,
    content: application.status === 'Reverted'
      ? `MoHAIS OPAS: Dear ${application.fullName}, your application #${application.trackingNumber} requires correction: ${application.reversionReason || 'Review document specs'}. Please update on opas.mohais.gov.zm`
      : `MoHAIS OPAS: Dear ${application.fullName}, we received your fee payment for application #${application.trackingNumber}. Please log in to complete submission and biometrics booking.`,
  });
  const [sentSuccess, setSentSuccess] = useState(false);

  // Status update note
  const [officerNote, setOfficerNote] = useState(application.officerNotes || '');
  const [selectedNewStatus, setSelectedNewStatus] = useState<PassportApplication['status']>(application.status);
  const [inspectedDoc, setInspectedDoc] = useState<UploadedDocument | null>(null);

  // Document action handlers from modal
  const handleApproveDocument = (docId: string) => {
    const doc = application.documents.find((d) => d.id === docId);
    if (doc) {
      doc.status = 'APPROVED';
      doc.feedback = undefined;
    }
  };

  const handleRejectDocument = (docId: string, reason: string) => {
    const doc = application.documents.find((d) => d.id === docId);
    if (doc) {
      doc.status = 'REJECTED';
      doc.feedback = reason;
      onUpdateStatus(application.id, 'Reverted', `Document flagged: ${reason}`);
    }
  };

  // Validation diagnostics
  const nrcCheck = validateNRC(application.nrcNumber);
  const phoneCheck = validatePhoneNumber(application.contact.phone, application.contact.phoneCountryCode);
  const emailCheck = validateEmail(application.contact.email);

  // Run AI Triage Analysis
  const handleRunAITriage = async () => {
    setLoadingTriage(true);
    try {
      const res = await fetch('/api/intelligence/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ application }),
      });
      const data = await res.json();
      setTriageData(data);
    } catch (err) {
      console.error(err);
      // Fallback
      setTriageData({
        urgencyLevel: application.status === 'Reverted' ? 'HIGH' : 'MEDIUM',
        rootCauseAnalysis: application.status === 'Reverted'
          ? `Application stalled due to rejected document: ${application.reversionReason}`
          : 'Pending applicant submission completion.',
        recommendedAction: 'Dispatch automated reminder with direct correction link.',
        channelRecommendation: 'SMS',
        slaAgingAlert: application.daysInStatus > 7,
        dataIntegrityScore: 82,
      });
    } finally {
      setLoadingTriage(false);
    }
  };

  // Generate AI Reminder
  const handleGenerateAIReminder = async () => {
    setGeneratingReminder(true);
    try {
      const res = await fetch('/api/notifications/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicantName: application.fullName,
          trackingNumber: application.trackingNumber,
          caseType: application.status,
          details: application.reversionReason || (application.status === 'Paid - Unsubmitted' ? 'Payment confirmed, application draft unsubmitted' : 'Standard status update'),
          channel,
          officerNotes: officerNote,
        }),
      });
      const data = await res.json();
      if (data.content) {
        setReminderDraft({
          subject: data.subject || reminderDraft.subject,
          content: data.content,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingReminder(false);
    }
  };

  // Dispatch Reminder
  const handleDispatchReminder = () => {
    const newNotif: NotificationLog = {
      id: `notif-${Date.now()}`,
      timestamp: new Date().toISOString(),
      channel,
      subject: reminderDraft.subject,
      content: reminderDraft.content,
      deliveryStatus: 'Delivered',
    };
    onAddNotification(application.id, newNotif);
    setSentSuccess(true);
    setTimeout(() => {
      setSentSuccess(false);
      setActiveTab('history');
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header with larger readable fonts */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-700 flex items-center justify-center text-white font-mono text-base font-bold shadow-xs shrink-0">
              OPAS
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg sm:text-xl font-bold">{application.fullName}</h2>
                <span className="font-mono text-sm text-slate-300 bg-slate-800 px-2.5 py-0.5 rounded border border-slate-700">
                  {application.trackingNumber}
                </span>
                {application.isUrgent && (
                  <span className="text-xs font-bold bg-amber-500 text-slate-950 px-2 py-0.5 rounded">
                    EXPRESS
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                NRC: <strong className="text-slate-100 font-mono">{application.nrcNumber}</strong> · Type: {application.passportType} · Location: {application.collectionOffice}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-6 gap-3 text-sm font-bold overflow-x-auto">
          <button
            onClick={() => setActiveTab('triage')}
            className={`py-3.5 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'triage'
                ? 'border-emerald-700 text-emerald-900 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            AI Case Triage &amp; Assessment
          </button>
          <button
            onClick={() => setActiveTab('reminder')}
            className={`py-3.5 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'reminder'
                ? 'border-emerald-700 text-emerald-900 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Send className="w-4 h-4 text-slate-600" />
            Dispatch Automated Reminder
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`py-3.5 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'documents'
                ? 'border-emerald-700 text-emerald-900 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4 text-slate-600" />
            Applicant Documents ({application.documents.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-3.5 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'history'
                ? 'border-emerald-700 text-emerald-900 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4 text-slate-600" />
            Notification Audit Trail ({application.notifications.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* TAB 1: AI Case Triage */}
          {activeTab === 'triage' && (
            <div className="space-y-6">
              {/* Status Banner */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <div className="text-xs sm:text-sm text-slate-500 font-medium">Current Workflow Status</div>
                  <div className="text-lg font-bold text-slate-900 mt-0.5 flex items-center gap-2">
                    <span>{application.status}</span>
                    <span className="text-sm font-normal text-slate-600">
                      ({application.daysInStatus} days in current stage)
                    </span>
                  </div>
                  {application.reversionReason && (
                    <div className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg p-3 mt-2.5">
                      <strong className="text-red-950">Reversion Cause:</strong> {application.reversionReason}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRunAITriage}
                    disabled={loadingTriage}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4 text-emerald-300" />
                    <span>{loadingTriage ? 'Analyzing...' : 'Run Gemini 3.8 AI Triage'}</span>
                  </button>
                </div>
              </div>

              {/* Contact Information Integrity Checks */}
              <div className="border border-slate-200 rounded-xl p-5 bg-white">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3">
                  Contact Information Integrity Analysis
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm text-slate-600 font-semibold flex items-center gap-1.5">
                        <Phone className="w-4 h-4 text-slate-500" /> Mobile Phone
                      </span>
                      {phoneCheck.isValid ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      )}
                    </div>
                    <div className="text-sm font-mono font-bold text-slate-900 mt-1.5">
                      {application.contact.phone}
                    </div>
                    {phoneCheck.warning && (
                      <p className="text-xs text-amber-800 mt-1 font-medium">{phoneCheck.warning}</p>
                    )}
                    {phoneCheck.error && (
                      <p className="text-xs text-red-600 mt-1 font-bold">{phoneCheck.error}</p>
                    )}
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm text-slate-600 font-semibold flex items-center gap-1.5">
                        <Mail className="w-4 h-4 text-slate-500" /> Email Address
                      </span>
                      {emailCheck.isValid && !emailCheck.warning ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      )}
                    </div>
                    <div className="text-sm font-mono font-bold text-slate-900 mt-1.5 truncate">
                      {application.contact.email}
                    </div>
                    {emailCheck.warning && (
                      <p className="text-xs text-amber-800 mt-1 font-medium">{emailCheck.warning}</p>
                    )}
                    {emailCheck.error && (
                      <p className="text-xs text-red-600 mt-1 font-bold">{emailCheck.error}</p>
                    )}
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm text-slate-600 font-semibold">Green NRC Format</span>
                      {nrcCheck.isValid ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <div className="text-sm font-mono font-bold text-slate-900 mt-1.5">
                      {application.nrcNumber}
                    </div>
                    {nrcCheck.message && (
                      <p className="text-xs text-red-600 mt-1 font-semibold">{nrcCheck.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* AI Triage Findings */}
              {triageData ? (
                <div className="border border-emerald-300 rounded-xl p-5 bg-emerald-50/60 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-emerald-700" />
                      <span className="text-sm font-bold text-emerald-950 uppercase tracking-wide">
                        Gemini 3.8 Flash Operational Triage Assessment
                      </span>
                    </div>
                    <span
                      className={`text-xs sm:text-sm font-bold px-3 py-1 rounded-md ${
                        triageData.urgencyLevel === 'CRITICAL' || triageData.urgencyLevel === 'HIGH'
                          ? 'bg-red-100 text-red-900 border border-red-300'
                          : triageData.urgencyLevel === 'MEDIUM'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      }`}
                    >
                      Urgency: {triageData.urgencyLevel}
                    </span>
                  </div>

                  <div className="text-sm text-slate-800 leading-relaxed">
                    <strong className="text-slate-950 font-bold">Root Cause Analysis:</strong> {triageData.rootCauseAnalysis}
                  </div>

                  <div className="text-sm text-slate-800 leading-relaxed">
                    <strong className="text-slate-950 font-bold">Recommended Action for Officer:</strong> {triageData.recommendedAction}
                  </div>

                  <div className="flex items-center gap-4 text-xs sm:text-sm text-slate-700 pt-3 border-t border-emerald-200/80 font-medium">
                    <span>
                      Channel: <strong className="text-slate-900">{triageData.channelRecommendation}</strong>
                    </span>
                    <span>·</span>
                    <span>
                      SLA Alert:{' '}
                      <strong className={triageData.slaAgingAlert ? 'text-red-700 font-bold' : 'text-slate-800'}>
                        {triageData.slaAgingAlert ? 'Aged Beyond Target SLA' : 'Within Normal Bounds'}
                      </strong>
                    </span>
                    <span>·</span>
                    <span>
                      Data Integrity Score: <strong className="text-slate-900">{triageData.dataIntegrityScore}%</strong>
                    </span>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => setActiveTab('reminder')}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 cursor-pointer"
                    >
                      Proceed to Generate Automated Reminder <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 border border-dashed border-slate-300 rounded-lg text-slate-500 text-xs">
                  Click &quot;Run Gemini 3.8 AI Triage&quot; above to perform instant operational risk and root-cause analysis on this case.
                </div>
              )}

              {/* Status Progression Controls */}
              <div className="border-t border-slate-200 pt-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Officer Status Update &amp; Internal Notes
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Update Application Stage
                    </label>
                    <select
                      value={selectedNewStatus}
                      onChange={(e) => setSelectedNewStatus(e.target.value as any)}
                      className="w-full text-xs p-2 border border-slate-300 rounded-md bg-white focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="Draft">Draft</option>
                      <option value="Paid - Unsubmitted">Paid - Unsubmitted</option>
                      <option value="Submitted - Under Review">Submitted - Under Review</option>
                      <option value="Reverted">Reverted (Action Required from Citizen)</option>
                      <option value="Biometrics Scheduled">Biometrics Scheduled</option>
                      <option value="Processing & Printing">Processing &amp; Printing</option>
                      <option value="Ready for Collection">Ready for Collection</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Officer Case Notes
                    </label>
                    <input
                      type="text"
                      value={officerNote}
                      onChange={(e) => setOfficerNote(e.target.value)}
                      placeholder="Add official docket note..."
                      className="w-full text-xs p-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      onUpdateStatus(application.id, selectedNewStatus, officerNote);
                      onClose();
                    }}
                    className="px-4 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-md transition-colors cursor-pointer"
                  >
                    Commit Status Update
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Automated Reminder Composer */}
          {activeTab === 'reminder' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong>Approved Communication Schedule:</strong> Reminders must follow MoHAIS anti-duplicate guidelines. Ensure guidance clearly explains what item is needed and how to upload.
                </div>
              </div>

              {/* Channel Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Select Dispatch Channel
                </label>
                <div className="flex items-center gap-2">
                  {(['SMS', 'Email', 'OPAS Message Board'] as const).map((ch) => (
                    <button
                      key={ch}
                      onClick={() => setChannel(ch)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-all cursor-pointer ${
                        channel === ch
                          ? 'bg-emerald-800 text-white border-emerald-900 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {ch}
                    </button>
                  ))}
                  <button
                    onClick={handleGenerateAIReminder}
                    disabled={generatingReminder}
                    className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{generatingReminder ? 'Generating...' : 'AI Re-Draft Notice'}</span>
                  </button>
                </div>
              </div>

              {/* Subject (for Email / Board) */}
              {channel !== 'SMS' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Notice Subject Line
                  </label>
                  <input
                    type="text"
                    value={reminderDraft.subject}
                    onChange={(e) => setReminderDraft({ ...reminderDraft, subject: e.target.value })}
                    className="w-full text-xs p-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              )}

              {/* Notice Body */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Message Content
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">
                    {reminderDraft.content.length} characters
                    {channel === 'SMS' && reminderDraft.content.length > 160 && ' (2 SMS segments)'}
                  </span>
                </div>
                <textarea
                  rows={channel === 'SMS' ? 3 : 6}
                  value={reminderDraft.content}
                  onChange={(e) => setReminderDraft({ ...reminderDraft, content: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-md font-sans focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Dispatch Action */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="text-xs text-slate-500">
                  Recipient:{' '}
                  <strong>
                    {channel === 'SMS'
                      ? application.contact.phone
                      : channel === 'Email'
                      ? application.contact.email
                      : 'Citizen OPAS Dashboard'}
                  </strong>
                </span>

                <button
                  onClick={handleDispatchReminder}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md text-white transition-all cursor-pointer ${
                    sentSuccess ? 'bg-emerald-600' : 'bg-emerald-800 hover:bg-emerald-900'
                  }`}
                >
                  {sentSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Notification Dispatched!</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Official {channel} Reminder</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Documents Inspection */}
          {activeTab === 'documents' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Uploaded Dossier &amp; Pre-Flight AI Optical Score
              </h4>
              <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden">
                {application.documents.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => setInspectedDoc(doc)}
                    className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-900 flex items-center gap-2">
                          <span>{doc.name}</span>
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-medium flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            Click to Inspect
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Type: {doc.type} · Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                        </div>
                        {doc.feedback && (
                          <div className="text-[11px] text-red-600 mt-1 font-medium bg-red-50 p-1.5 rounded">
                            {doc.feedback}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {doc.aiScore && (
                        <div className="text-right">
                          <span className="text-[10px] uppercase text-slate-400 font-bold block">AI Optical Score</span>
                          <span className={`text-xs font-bold font-mono ${doc.aiScore >= 80 ? 'text-emerald-700' : 'text-red-700'}`}>
                            {doc.aiScore}/100
                          </span>
                        </div>
                      )}

                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded ${
                          doc.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : doc.status === 'REJECTED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {doc.status}
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectedDoc(doc);
                        }}
                        className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 rounded font-semibold transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: Notification Audit Trail */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Logged Communications &amp; Delivery Status
              </h4>
              {application.notifications.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">No notifications dispatched yet.</p>
              ) : (
                <div className="space-y-2">
                  {application.notifications.map((notif) => (
                    <div key={notif.id} className="p-3 border border-slate-200 rounded-md bg-slate-50 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">
                          {notif.channel} · {notif.subject || 'OPAS Alert'}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-slate-500">
                            {new Date(notif.timestamp).toLocaleString()}
                          </span>
                          <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                            {notif.deliveryStatus}
                          </span>
                        </div>
                      </div>
                      <p className="text-slate-700 text-xs leading-relaxed">{notif.content}</p>
                      <div className="pt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
                        <span>Audit: {notif.auditId || 'Legacy record'}</span>
                        <span>Trigger: {(notif.trigger || 'LEGACY').replace(/_/g, ' ')}</span>
                        <span>Actor: {notif.dispatchedBy?.name || 'Not recorded'}</span>
                        <span>Delivery checked: {new Date(notif.deliveryUpdatedAt || notif.timestamp).toLocaleString()}</span>
                      </div>
                      {notif.auditTrail && notif.auditTrail.length > 0 && (
                        <div className="pt-1.5 mt-1.5 border-t border-slate-200 text-[10px] text-slate-600 space-y-1">
                          {notif.auditTrail.map((event) => (
                            <div key={event.id}>
                              <span className="font-semibold text-slate-700">{event.event.replace(/_/g, ' ')}</span>
                              {' · '}{new Date(event.timestamp).toLocaleString()} · {event.actor}
                            </div>
                          ))}
                        </div>
                      )}
                      {notif.deliveryStatus !== 'Action Taken' && (
                        <div className="pt-2 flex flex-wrap gap-1.5">
                          {(['Delivered', 'Read', 'Action Taken'] as const)
                            .filter((status) => status !== notif.deliveryStatus)
                            .map((status) => (
                              <button
                                key={status}
                                onClick={() => onUpdateNotificationDelivery(application.id, notif.id, status)}
                                className="px-2 py-1 rounded border border-slate-300 bg-white text-[10px] font-semibold text-slate-700 hover:border-blue-400 hover:text-blue-800"
                              >
                                Mark {status}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>MoHAIS OPAS Audit Identifier: {application.id}</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* Interactive High-Fidelity Document & Optical AI Viewer */}
      {inspectedDoc && (
        <DocumentViewerModal
          document={inspectedDoc}
          application={application}
          onClose={() => setInspectedDoc(null)}
          onApproveDocument={handleApproveDocument}
          onRejectDocument={handleRejectDocument}
          isOfficerRole={true}
        />
      )}
    </div>
  );
};
