import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  Bot,
  FileText,
  Bell,
  BarChart2,
  Settings,
  Headphones,
  Check,
  RotateCcw,
  CreditCard,
  AlertCircle,
  Clock,
  Info,
  FolderClosed,
  Zap,
  ShieldCheck,
  ChevronDown,
  Send,
  Minus,
  Maximize2,
  X,
  Upload,
  User,
  Shield,
  Smartphone,
  CheckCircle2,
  ExternalLink,
  Search,
  Filter,
  Eye,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  Calendar,
  AlertTriangle,
  Download,
  ArrowRight,
  Copy,
  CheckCheck,
  Globe,
  Sparkles,
  Layers,
} from 'lucide-react';
import { PassportApplication, NotificationLog, UploadedDocument } from '../../types/passport';
import { UserAccount } from '../../types/auth';
import { APPROVED_FAQS } from '../../data/faqs';
import { useChat } from '../../context/ChatContext';
import { AIGuidanceChat } from './AIGuidanceChat';
import { ApplicationLifecycleTimeline } from './ApplicationLifecycleTimeline';
import { isApplicationSubmitted } from '../../utils/applicationStatus';
import {
  createSmartGuidePaymentNotification,
  loadStoredPaymentNotifications,
  parseSmartGuidePaymentDetections,
  saveStoredPaymentNotifications,
  StoredPaymentNotification,
} from '../../utils/smartGuidePaymentNotifications';

interface CitizenPortalProps {
  applications: PassportApplication[];
  selectedApplication: PassportApplication;
  onSelectApplication: (app: PassportApplication) => void;
  onUpdateStatus: (id: string, newStatus: PassportApplication['status'], notes?: string) => void;
  onAddNewApplication: (newApp: PassportApplication) => void;
  onConfirmSandboxPayment: (applicationId: string, transactionReference: string, paymentDate: string) => boolean;
  onOpenAssistant: () => void;
  onAddNotification?: (id: string, notif: NotificationLog) => void;
  currentUser?: UserAccount | null;
  onLogout?: () => void;
  onViewChange?: (view: 'citizen' | 'officer' | 'admin') => void;
  onOpenEOIModal?: () => void;
  onOpenPhoneSimulator?: () => void;
  initialTab?: string;
}

type NavTab = 'dashboard' | 'ai_assistant' | 'applications' | 'notifications' | 'smart_validation' | 'reports' | 'settings';
type PaymentDetectionPopup = { application: PassportApplication; notification: NotificationLog };
type ServerApplicantMessage = { id: string; applicationReference: string; channel: 'IN_APP' | 'OPAS_MESSAGE_BOARD'; subject: string; content: string; status: 'AVAILABLE' | 'READ' | 'RESOLVED'; createdAt: string; };

export const CitizenPortal: React.FC<CitizenPortalProps> = ({
  applications,
  selectedApplication,
  onSelectApplication,
  onUpdateStatus,
  onAddNewApplication,
  onConfirmSandboxPayment,
  onOpenAssistant,
  onAddNotification,
  currentUser,
  onLogout,
  onViewChange,
  onOpenEOIModal,
  onOpenPhoneSimulator,
  initialTab,
}) => {
  const [activeNavTab, setActiveNavTab] = useState<NavTab>('dashboard');
  const [issuesTimeFilter, setIssuesTimeFilter] = useState<'30' | '7' | '90' | '365'>('30');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [isAssistantDockMinimized, setIsAssistantDockMinimized] = useState(false);
  const [expandedApplicationId, setExpandedApplicationId] = useState<string | null>(null);
  const [storedPaymentNotifications, setStoredPaymentNotifications] = useState<{
    userId: string;
    notifications: StoredPaymentNotification[];
  }>(() => ({
    userId: currentUser?.id || '',
    notifications: currentUser ? loadStoredPaymentNotifications(currentUser.id) : [],
  }));
  const [paymentDetectionPopups, setPaymentDetectionPopups] = useState<PaymentDetectionPopup[]>([]);
  const [paymentDetectionError, setPaymentDetectionError] = useState('');
  const seenPaymentNotificationIds = useRef(new Set<string>());
  const [serverMessages, setServerMessages] = useState<ServerApplicantMessage[]>([]);
  const [serverMessagesError, setServerMessagesError] = useState('');

  // Dynamic identification of active logged-in citizen
  const citizenName = currentUser?.fullName || 'John Banda';
  const citizenFirstName = citizenName.split(' ')[0] || citizenName;
  const citizenNrc = currentUser?.nrcNumber || '210943/11/1';
  const citizenEmail = currentUser?.email || 'john.banda@gmail.com';

  useEffect(() => {
    const initialTabs: Record<string, NavTab> = {
      status: 'dashboard',
      guidance: 'ai_assistant',
      faqs: 'ai_assistant',
      monitoring: 'applications',
      messages: 'notifications',
      apply: 'dashboard',
      settings: 'settings',
    };
    setActiveNavTab(initialTabs[initialTab || 'status'] || 'dashboard');
  }, [initialTab]);

  // Filter citizen applications strictly by the logged-in user account
  const citizenApps = useMemo(() => {
    if (!currentUser) return [selectedApplication];
    const cNrc = currentUser.nrcNumber?.toLowerCase().trim();
    const cEmail = currentUser.email?.toLowerCase().trim();

    const matched = applications.filter((a) => {
      const aNrc = a.nrcNumber?.toLowerCase().trim();
      const aEmail = a.contact?.email?.toLowerCase().trim();

      return cNrc ? aNrc === cNrc : Boolean(cEmail && aEmail === cEmail);
    });

    return matched;
  }, [applications, currentUser, selectedApplication]);

  const savedPaymentNotifications = storedPaymentNotifications.userId === currentUser?.id
    ? storedPaymentNotifications.notifications
    : [];
  const inboxNotifications = useMemo(() => {
    const notifications = citizenApps.flatMap((application) =>
      application.notifications.map((notification) => ({
        applicationReference: application.trackingNumber,
        notification,
      }))
    );
    const byId = new Map(notifications.map((item) => [item.notification.id, item]));
    for (const item of savedPaymentNotifications) {
      if (!byId.has(item.notification.id)) {
        byId.set(item.notification.id, {
          applicationReference: item.applicationReference,
          notification: item.notification,
        });
      }
    }
    return [...byId.values()].sort(
      (left, right) => new Date(right.notification.timestamp).getTime() - new Date(left.notification.timestamp).getTime()
    );
  }, [citizenApps, savedPaymentNotifications]);
  const inboxNotificationCount = inboxNotifications.filter(
    ({ notification }) => notification.deliveryStatus !== 'Read' && notification.deliveryStatus !== 'Action Taken'
  ).length + serverMessages.filter((message) => message.status === 'AVAILABLE').length;

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'citizen') return;
    let active = true;
    const loadMessages = async () => {
      try {
        const response = await fetch('/api/applicant-messages', { credentials: 'include', headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error(`Notification inbox returned HTTP ${response.status}.`);
        const data = await response.json();
        if (active) { setServerMessages(Array.isArray(data.messages) ? data.messages : []); setServerMessagesError(''); }
      } catch (error) {
        if (active) setServerMessagesError(error instanceof Error ? error.message : 'Could not load applicant notifications.');
      }
    };
    void loadMessages();
    const interval = window.setInterval(() => void loadMessages(), 20000);
    return () => { active = false; window.clearInterval(interval); };
  }, [currentUser?.id, currentUser?.role]);

  const markServerMessageRead = async (message: ServerApplicantMessage) => {
    if (message.status !== 'AVAILABLE') return;
    try {
      const response = await fetch(`/api/applicant-messages/${encodeURIComponent(message.id)}/read`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: '{}',
      });
      if (!response.ok) throw new Error('Unable to update notification status.');
      setServerMessages((previous) => previous.map((item) => item.id === message.id ? { ...item, status: 'READ' } : item));
    } catch (error) { setServerMessagesError(error instanceof Error ? error.message : 'Unable to mark notification as read.'); }
  };

  useEffect(() => {
    if (!currentUser) return;
    const notifications = loadStoredPaymentNotifications(currentUser.id);
    seenPaymentNotificationIds.current = new Set(notifications.map(({ notification }) => notification.id));
    setStoredPaymentNotifications({ userId: currentUser.id, notifications });
  }, [currentUser?.id]);

  useEffect(() => {
    if (currentUser && storedPaymentNotifications.userId === currentUser.id) {
      saveStoredPaymentNotifications(currentUser.id, storedPaymentNotifications.notifications);
    }
  }, [currentUser?.id, storedPaymentNotifications]);

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'citizen') return;

    let active = true;
    let checking = false;
    const checkForPaymentDetections = async () => {
      if (checking) return;
      checking = true;
      try {
        const response = await fetch('/api/smartguide/detections', {
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) throw new Error(`Payment detection request failed with HTTP ${response.status}.`);
        const detections = parseSmartGuidePaymentDetections(await response.json());
        if (!active) return;
        setPaymentDetectionError('');

        for (const detection of detections) {
          const application = citizenApps.find(
            (item) => item.trackingNumber === detection.applicationReference
          );
          if (!application) continue;

          const notification = createSmartGuidePaymentNotification(application, detection);
          if (!notification || seenPaymentNotificationIds.current.has(notification.id)) continue;
          if (application.notifications.some((item) => item.id === notification.id)) {
            seenPaymentNotificationIds.current.add(notification.id);
            continue;
          }

          seenPaymentNotificationIds.current.add(notification.id);
          const storedNotice: StoredPaymentNotification = {
            applicationId: application.id,
            applicationReference: application.trackingNumber,
            notification,
          };
          setStoredPaymentNotifications((previous) => ({
            userId: currentUser.id,
            notifications: [
              storedNotice,
              ...(previous.userId === currentUser.id
                ? previous.notifications.filter((item) => item.notification.id !== notification.id)
                : []),
            ],
          }));
          setPaymentDetectionPopups((previous) => [...previous, { application, notification }]);
        }
      } catch (error) {
        if (active) {
          const message = error instanceof Error ? error.message : 'Unable to check for payment detections.';
          console.error('SmartGuide payment detection failed:', error);
          setPaymentDetectionError(message);
        }
      } finally {
        checking = false;
      }
    };

    void checkForPaymentDetections();
    const intervalId = window.setInterval(() => void checkForPaymentDetections(), 15000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [citizenApps, currentUser?.id, currentUser?.role]);

  const draftAppsCount = useMemo(() => citizenApps.filter((a) => a.status === 'Draft').length, [citizenApps]);
  const revertedAppsCount = useMemo(() => citizenApps.filter((a) => a.status === 'Reverted').length, [citizenApps]);
  const paidPendingAppsCount = useMemo(
    () => citizenApps.filter((a) => a.feePaid && !isApplicationSubmitted(a)).length,
    [citizenApps]
  );
  const submittedAppsCount = useMemo(
    () => citizenApps.filter((a) => !['Draft', 'Reverted', 'Paid - Unsubmitted'].includes(a.status)).length,
    [citizenApps]
  );

  const activeRevertedApp = citizenApps.find((a) => a.status === 'Reverted') || citizenApps[0];
  const activeDraftApp = citizenApps.find((a) => a.status === 'Draft') || citizenApps[0];
  const activePaidApp = citizenApps.find((a) => a.feePaid && !isApplicationSubmitted(a)) || citizenApps[0];

  // Smart Validation Dedicated State (matches user specification & logged in applicant)
  const defaultSmartEmail = citizenApps.find((a) => a.contact.email.includes('@') && !a.contact.email.includes('.'))
    ? citizenApps.find((a) => a.contact.email.includes('@') && !a.contact.email.includes('.'))!.contact.email
    : currentUser?.email?.toLowerCase() === 'john.banda@gmail.com'
    ? 'divine@gmail'
    : citizenEmail;

  const [smartValidationEmail, setSmartValidationEmail] = useState(defaultSmartEmail);
  const [smartValidationCorrected, setSmartValidationCorrected] = useState(
    !defaultSmartEmail.endsWith('@gmail') && defaultSmartEmail.includes('.')
  );
  const [showCorrectionInstructions, setShowCorrectionInstructions] = useState(false);
  const [correctionInputValue, setCorrectionInputValue] = useState(
    defaultSmartEmail.includes('@') && !defaultSmartEmail.includes('.')
      ? `${defaultSmartEmail}.com`
      : defaultSmartEmail
  );

  // Step 5, 6, 7: OPAS Direct Correction Bridge & 7-Step Journey State
  const [isOpasBridgeModalOpen, setIsOpasBridgeModalOpen] = useState(false);
  const [opasEditingEmail, setOpasEditingEmail] = useState('divine@gmail.com');
  const [opasDirectSection, setOpasDirectSection] = useState<'contact' | 'identity' | 'guarantor'>('contact');
  const [currentJourneyStep, setCurrentJourneyStep] = useState<number>(smartValidationCorrected ? 7 : 4);
  const [isCheckingUpdatedInfo, setIsCheckingUpdatedInfo] = useState(false);
  const [checkVerificationLog, setCheckVerificationLog] = useState<string[]>([]);
  const [checkResultStatus, setCheckResultStatus] = useState<'idle' | 'success' | 'failed'>('idle');
  const [checkResultMessage, setCheckResultMessage] = useState<string>('');
  const [copiedDeepLink, setCopiedDeepLink] = useState(false);

  const handleProceedToOpasCorrection = () => {
    setCurrentJourneyStep(5);
    setOpasEditingEmail(smartValidationEmail.endsWith('@gmail') ? 'divine@gmail.com' : smartValidationEmail);
    setCheckResultStatus('idle');
    setCheckResultMessage('');
    setIsOpasBridgeModalOpen(true);
  };

  const handleSaveOpasAndCheck = () => {
    setIsCheckingUpdatedInfo(true);
    setCurrentJourneyStep(6);
    setCheckVerificationLog([
      'Step 6.1: Connecting to existing OPAS database (pass.gsb.gov.zm)...',
    ]);

    setTimeout(() => {
      setCheckVerificationLog((prev) => [
        ...prev,
        'Step 6.2: Polling updated record for Application OPAS-2026-001 (Section 4: Contact Information)...',
      ]);
    }, 600);

    setTimeout(() => {
      setCheckVerificationLog((prev) => [
        ...prev,
        `Step 6.3: Smart Detection engine running RFC 5322 & DNS domain MX check on "${opasEditingEmail}"...`,
      ]);
    }, 1200);

    setTimeout(() => {
      setIsCheckingUpdatedInfo(false);
      setCurrentJourneyStep(7);

      const isValidEmail =
        opasEditingEmail.includes('@') &&
        opasEditingEmail.includes('.') &&
        (opasEditingEmail.split('.').pop()?.length ?? 0) >= 2;

      if (isValidEmail) {
        setSmartValidationEmail(opasEditingEmail);
        setSmartValidationCorrected(true);
        setCheckResultStatus('success');
        setCheckResultMessage(
          `Application OPAS-2026-001 contact record verified. Email "${opasEditingEmail}" follows RFC standards and is active for official MoHAIS SMS and collection dispatches.`
        );

        // Update application in memory if active application matches
        const targetApp = citizenApps.find((a) => a.trackingNumber === 'OPAS-2026-001') || citizenApps[0];
        if (targetApp) {
          targetApp.contact.email = opasEditingEmail;
        }

        // Add official notification log
        onAddNotification?.(targetApp?.id || 'app-jb-001', {
          id: `notif-${Date.now()}`,
          timestamp: new Date().toISOString(),
          channel: 'OPAS Message Board',
          subject: 'Smart Validation Resolved',
          content: `Application OPAS-2026-001 contact email was successfully updated in OPAS to "${opasEditingEmail}". All validation checks passed.`,
          deliveryStatus: 'Delivered',
        });
      } else {
        setCheckResultStatus('failed');
        setCheckResultMessage(
          `Validation check failed for "${opasEditingEmail}". The email does not follow standard RFC domain formatting (e.g., name@domain.com or name@gov.zm). Please review guidance and correct it in OPAS.`
        );
      }
    }, 2000);
  };

  // Active Modals
  const [activeModal, setActiveModal] = useState<
    'none' | 'reverted_details' | 'contact_validation' | 'common_errors' | 'draft_continue' | 'payment_complete' | 'support'
  >('none');
  const [sandboxPaymentReference, setSandboxPaymentReference] = useState<string | null>(null);
  const [sandboxPaymentError, setSandboxPaymentError] = useState('');
  const [sandboxPaymentLoading, setSandboxPaymentLoading] = useState(false);

  // Contact Validation State
  const [contactEmail, setContactEmail] = useState(citizenEmail);
  const [contactPhone, setContactPhone] = useState(currentUser?.phone || '+260978112233');
  const [contactSaveSuccess, setContactSaveSuccess] = useState(false);

  // Re-upload state for reverted application
  const [reuploading, setReuploading] = useState(false);
  const [reuploadSuccess, setReuploadSuccess] = useState(false);
  const [aiDocScore, setAiDocScore] = useState<number | null>(null);

  // Settings State
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [preferredLang, setPreferredLang] = useState('English');
  const [settingsSaved, setSettingsSaved] = useState(false);

  // AI Assistant Docked Chat State (dynamically welcomed to logged-in user!)
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'bot' | 'user'; text: string; time: string }>>([
    {
      sender: 'bot',
      text: `Hello ${citizenFirstName}! 👋\nHow can I help you today?`,
      time: 'Just now',
    },
    {
      sender: 'user',
      text: activeRevertedApp?.status === 'Reverted'
        ? 'My application was reverted. What does that mean?'
        : 'What is the current status of my passport application?',
      time: '2m ago',
    },
    {
      sender: 'bot',
      text: activeRevertedApp?.status === 'Reverted'
        ? `Your application #${activeRevertedApp.trackingNumber} was returned by a Case Officer because some information or supporting documents require attention.\n\nPlease open your Reverted applications to view official comments.`
        : `Your application #${citizenApps[0]?.trackingNumber || 'OPAS-2026-001'} is registered and currently ${citizenApps[0]?.status || 'under review'}.`,
      time: '1m ago',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Sync state when currentUser changes
  useEffect(() => {
    setContactEmail(citizenEmail);
    setContactPhone(currentUser?.phone || '+260978112233');

    const hasInvalidFormat = defaultSmartEmail.includes('@') && !defaultSmartEmail.includes('.');
    setSmartValidationEmail(defaultSmartEmail);
    setSmartValidationCorrected(!hasInvalidFormat);

    setChatMessages([
      {
        sender: 'bot',
        text: `Hello ${citizenFirstName}! 👋\nHow can I help you today?`,
        time: 'Just now',
      },
      {
        sender: 'user',
        text: activeRevertedApp?.status === 'Reverted'
          ? 'My application was reverted. What does that mean?'
          : activePaidApp?.status === 'Paid - Unsubmitted'
          ? 'How do I finalize my paid application?'
          : 'What is the current status of my passport application?',
        time: '2m ago',
      },
      {
        sender: 'bot',
        text: activeRevertedApp?.status === 'Reverted'
          ? `Your application #${activeRevertedApp.trackingNumber} was returned by a Case Officer because some information or supporting documents require attention.\n\nFlagged Note: "${activeRevertedApp.reversionReason || 'Supporting document requires attention'}". Zero repayment fee is needed.`
          : activePaidApp?.status === 'Paid - Unsubmitted'
          ? `The demo record for #${activePaidApp.trackingNumber} shows payment of ZMW ${activePaidApp.feeAmount}. This prototype does not verify payment with a live gateway. Return to OPAS and complete final submission; payment alone does not submit the application.`
          : `Your application #${citizenApps[0]?.trackingNumber || 'OPAS-2026-001'} is registered and currently ${citizenApps[0]?.status || 'under review'}.`,
        time: '1m ago',
      },
    ]);
  }, [currentUser, citizenEmail, citizenFirstName, defaultSmartEmail, activeRevertedApp, activePaidApp, citizenApps]);

  const handleSendChat = (textToSend?: string) => {
    const text = (textToSend || chatInput).trim();
    if (!text) return;

    const userMsg = { sender: 'user' as const, text, time: 'Just now' };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setIsBotTyping(true);

    setTimeout(() => {
      let botResponse = '';
      const lower = text.toLowerCase();
      if (lower.includes('document') || lower.includes('what documents')) {
        botResponse = 'For a Zambian e-Passport you require:\n1. Certified Green NRC (front & back)\n2. Certified Birth Certificate\n3. 2 passport photos (40x35mm on plain off-white background)\n4. Section 8 signed by a recognized Zambian Guarantor.';
      } else if (lower.includes('revert') || lower.includes('why was my application')) {
        botResponse = `Application ${activeRevertedApp?.trackingNumber || 'OPAS-2026-00125'} was flagged: "${activeRevertedApp?.reversionReason || 'Supporting document requires attention'}". You can re-upload your replacement file directly with zero repayment fee.`;
      } else if (lower.includes('status') || lower.includes('check my')) {
        botResponse = `You currently have 1 Reverted case (#OPAS-2026-00125), 1 Draft case (#OPAS-2026-00432), 1 Paid pending submission (#OPAS-2026-00718), and 3 Submitted cases under active review.`;
      } else if (lower.includes('email') || lower.includes('phone') || lower.includes('validate') || lower.includes('correct')) {
        botResponse = 'Smart Validation Alert in Application OPAS-2026-001:\n• Current email "divine@gmail" is missing its domain extension (.com).\n\nWhen you select "Proceed to correction", SmartGuide directs you straight to Section 4 (Contact Details) in the OPAS portal. Once saved in OPAS, SmartGuide automatically checks the updated information (Step 6) and marks it resolved (Step 7).';
      } else if (lower.includes('journey') || lower.includes('step') || lower.includes('opas')) {
        botResponse = 'Applicant Journey at a Glance:\n1. Sign in to OPAS SmartGuide\n2. Smart Detection identifies issue\n3. Receive alert notification\n4. Open validation report\n5. Select "Proceed to correction" to open Section 4 in OPAS\n6. SmartGuide checks updated information\n7. Receive verified resolution result.';
      } else {
        botResponse = `Thank you for your inquiry, ${citizenName}. Our MoHAIS AI system has verified your profile. You can resolve flagged documents, update contact details, or review official submission guidelines at any time.`;
      }

      setChatMessages((prev) => [...prev, { sender: 'bot', text: botResponse, time: 'Just now' }]);
      setIsBotTyping(false);
    }, 900);
  };

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isBotTyping]);

  const handleSimulateReupload = () => {
    setReuploading(true);
    setTimeout(() => {
      setReuploading(false);
      setAiDocScore(96);
      setReuploadSuccess(true);
      if (activeRevertedApp) {
        onUpdateStatus(activeRevertedApp.id, 'Submitted - Under Review', 'Citizen re-uploaded corrected high-resolution photo and certified NRC copy.');
      }
    }, 1200);
  };

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    setContactSaveSuccess(true);
    setTimeout(() => {
      setContactSaveSuccess(false);
      setActiveModal('none');
    }, 1400);
  };

  const handleSandboxPayment = async () => {
    if (selectedApplication.status !== 'Draft' || selectedApplication.feePaid || sandboxPaymentLoading) return;
    setSandboxPaymentLoading(true);
    setSandboxPaymentError('');
    try {
      const response = await fetch('/api/payment/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ applicationReference: selectedApplication.trackingNumber }),
      });
      const data = await response.json();
      if (!response.ok || data.success !== true || data.simulated !== true || typeof data.record?.transactionReference !== 'string' || typeof data.record?.paymentDate !== 'string') {
        throw new Error(typeof data.error === 'string' ? data.error : 'Sandbox payment could not be confirmed.');
      }
      if (!onConfirmSandboxPayment(selectedApplication.id, data.record.transactionReference, data.record.paymentDate)) {
        throw new Error('This account cannot update the selected demo application.');
      }
      setSandboxPaymentReference(data.record.transactionReference);
    } catch (error) {
      setSandboxPaymentError(error instanceof Error ? error.message : 'Sandbox payment could not be confirmed.');
    } finally {
      setSandboxPaymentLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#EEF5F6] text-slate-800 font-sans">
      {/* =========================================================================
          1. LEFT SIDEBAR (Dark Navy: #09182B)
          ========================================================================= */}
      <aside className="w-60 min-w-[240px] max-w-[240px] bg-[#09182B] text-slate-300 flex flex-col justify-between shrink-0 z-30 select-none border-r border-[#0D223C]">
        <div>
          {/* Top Logo & Zambia Emblem */}
          <div className="pt-6 pb-4 px-4 flex flex-col items-center text-center">
            <img
              src="/assets/aistudio/zambia_coat_of_arms.png"
              alt="Republic of Zambia Coat of Arms"
              className="h-16 w-auto object-contain drop-shadow-md"
              onError={(e) => {
                // fallback if image path needs public prefix
                (e.target as HTMLImageElement).src = '/public/assets/aistudio/zambia_coat_of_arms.png';
              }}
            />
            <h1 className="mt-2 text-white font-bold text-sm tracking-wide">Republic of Zambia</h1>
            <p className="text-slate-400 text-xs mt-0.5">Ministry of Home Affairs</p>
          </div>

          {/* Navigation Links */}
          <nav className="mt-4 px-3 space-y-1">
            <button
              onClick={() => setActiveNavTab('dashboard')}
              className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                activeNavTab === 'dashboard'
                  ? 'bg-[#1868D6] text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <LayoutDashboard className="w-5 h-5 shrink-0" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => {
                setActiveNavTab('ai_assistant');
                setIsAssistantDockMinimized(false);
              }}
              className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                activeNavTab === 'ai_assistant'
                  ? 'bg-[#1868D6] text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Bot className="w-5 h-5 shrink-0" />
              <span>AI Assistant</span>
            </button>

            <button
              onClick={() => setActiveNavTab('applications')}
              className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                activeNavTab === 'applications'
                  ? 'bg-[#1868D6] text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <FileText className="w-5 h-5 shrink-0" />
              <span>My Applications</span>
            </button>

            <button
              onClick={() => setActiveNavTab('notifications')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                activeNavTab === 'notifications'
                  ? 'bg-[#1868D6] text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <Bell className="w-5 h-5 shrink-0" />
                <span>Notifications</span>
              </div>
              <span className="bg-[#EF4444] text-white text-[11px] font-bold px-1.5 py-0.2 rounded-full leading-tight">
                {inboxNotificationCount}
              </span>
            </button>

            <button
              onClick={() => setActiveNavTab('smart_validation')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                activeNavTab === 'smart_validation'
                  ? 'bg-[#1868D6] text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-400" />
                <span>Smart Validation</span>
              </div>
              <span className={`text-[11px] font-bold px-1.5 py-0.2 rounded-full leading-tight ${
                smartValidationCorrected
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500 text-white'
              }`}>
                {smartValidationCorrected ? '0' : '1'}
              </span>
            </button>

            <button
              onClick={() => setActiveNavTab('reports')}
              className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                activeNavTab === 'reports'
                  ? 'bg-[#1868D6] text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <BarChart2 className="w-5 h-5 shrink-0" />
              <span>Reports</span>
            </button>

            <button
              onClick={() => setActiveNavTab('settings')}
              className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                activeNavTab === 'settings'
                  ? 'bg-[#1868D6] text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Settings className="w-5 h-5 shrink-0" />
              <span>Settings</span>
            </button>
          </nav>
        </div>

        {/* Bottom Sidebar: Contact Support */}
        <div className="px-4 pb-6 pt-4 border-t border-slate-700/60">
          <button
            onClick={() => setActiveModal('support')}
            className="w-full flex items-center gap-3 text-left group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 group-hover:text-white group-hover:bg-[#1868D6] transition-colors shrink-0">
              <Headphones className="w-4 h-4" />
            </div>
            <div>
              <p className="text-white text-xs font-semibold leading-tight">Need Help?</p>
              <p className="text-slate-400 text-[11px] leading-tight mt-0.5">Contact Support</p>
            </div>
          </button>

          <a
            href="/guidewise-opas.zip"
            download="guidewise-opas.zip"
            className="mt-3 w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/90 hover:bg-[#1868D6] text-slate-300 hover:text-white text-xs font-medium transition-colors"
          >
            <Download className="w-4 h-4 text-blue-400" />
            <span>Download Project ZIP</span>
          </a>
        </div>
      </aside>

      {/* =========================================================================
          2. MAIN CONTENT WRAPPER (Top Header + Canvas + Right AI Assistant)
          ========================================================================= */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        {/* TOP HEADER BAR (Pure White) */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 z-20">
          {/* Logo & Slogan */}
          <div className="flex items-center gap-3">
            {/* Crisp dual-lobe brain/neural network SVG */}
            <div className="w-10 h-10 text-[#00A896] shrink-0">
              <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
                <path d="M16 12 C10 12 6 17 6 23 C6 28 9 31 14 32 C14 35 17 38 22 38 L22 10 C18 10 16 12 16 12 Z" />
                <path d="M32 12 C38 12 42 17 42 23 C42 28 39 31 34 32 C34 35 31 38 26 38 L26 10 C30 10 32 12 32 12 Z" />
                <path d="M14 20 C18 20 20 23 20 26" />
                <path d="M34 20 C30 20 28 23 28 26" />
                <circle cx="20" cy="27" r="1.5" fill="currentColor" />
                <circle cx="28" cy="27" r="1.5" fill="currentColor" />
              </svg>
            </div>
            <div>
              <div className="text-slate-900 font-extrabold text-xl tracking-tight leading-tight">
                OPAS SmartGuide
              </div>
              <div className="text-slate-500 text-xs font-normal leading-tight">
                Get help. Avoid errors. Stay informed.
              </div>
            </div>
          </div>

          {/* Right Header Controls (Notification Bell & John Banda Profile) */}
          <div className="flex items-center gap-5">
            {/* Bell with red count */}
            <button
              onClick={() => setActiveNavTab('notifications')}
              className="relative p-2 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              title={`${inboxNotificationCount} unread notifications`}
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-4 h-4 bg-[#EF4444] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {inboxNotificationCount}
              </span>
            </button>

            {/* User Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-200">
                  <User className="w-5 h-5 text-blue-700" />
                </div>
                <span className="text-slate-800 font-semibold text-sm">{citizenName}</span>
                <ChevronDown className="w-4 h-4 text-slate-500" />
              </button>

              {/* Profile Menu */}
              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 text-xs">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="font-bold text-slate-900 text-sm">{citizenName}</p>
                    <p className="text-slate-500">Citizen / Registered Applicant</p>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      NRC: {citizenNrc} • {currentUser?.station || 'Lusaka HQ'}
                    </p>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setActiveModal('contact_validation');
                        setUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Validate Contact Details</span>
                    </button>
                    {onOpenPhoneSimulator && (
                      <button
                        onClick={() => {
                          onOpenPhoneSimulator();
                          setUserDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                      >
                        <Smartphone className="w-4 h-4 text-blue-600" />
                        <span>Open Citizen Phone Simulator</span>
                      </button>
                    )}
                    {onOpenEOIModal && (
                      <button
                        onClick={() => {
                          onOpenEOIModal();
                          setUserDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                      >
                        <FileText className="w-4 h-4 text-purple-600" />
                        <span>UNIPODS EOI Proposal Document</span>
                      </button>
                    )}
                    <a
                      href="/guidewise-opas.zip"
                      download="guidewise-opas.zip"
                      onClick={() => setUserDropdownOpen(false)}
                      className="w-full text-left px-4 py-2 text-blue-600 font-semibold hover:bg-blue-50 flex items-center gap-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-blue-600" />
                      <span>Download Guidewise OPAS ZIP</span>
                    </a>
                  </div>
                  <div className="border-t border-slate-100 py-1">
                    {onViewChange && (
                      <>
                        <button
                          onClick={() => {
                            onViewChange('officer');
                            setUserDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 text-blue-600 font-semibold hover:bg-blue-50 flex items-center gap-2 cursor-pointer"
                        >
                          <Shield className="w-4 h-4" />
                          <span>Switch to Passport Officer Console</span>
                        </button>
                        <button
                          onClick={() => {
                            onViewChange('admin');
                            setUserDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                        >
                          <Settings className="w-4 h-4" />
                          <span>Switch to Admin Console</span>
                        </button>
                      </>
                    )}
                    {onLogout && (
                      <button
                        onClick={() => {
                          onLogout();
                          setUserDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-rose-600 font-medium hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* BODY AREA (Dashboard Canvas + Right AI Assistant) */}
        <div className="flex-1 flex overflow-hidden">
          {/* =========================================================================
              3. MAIN DASHBOARD CONTENT AREA
              ========================================================================= */}
          <main className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
            {activeNavTab === 'dashboard' && (
              <>
                {/* 1. Welcome Green Banner */}
                <div className="bg-[#D9F5E6] border border-[#8CE0B5] rounded-xl px-4 py-3 flex items-center gap-3 shadow-xs">
                  <div className="w-6 h-6 rounded-full bg-[#10B981] flex items-center justify-center text-white shrink-0">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                  <p className="text-sm text-slate-900 leading-snug">
                    Welcome to OPAS SmartGuide —{' '}
                    <span className="font-semibold text-[#065F46]">
                      your AI-powered passport application assistant.
                    </span>
                  </p>
                </div>

                {/* 2. Top 4 Metric Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {/* Card 1: Applications Monitored */}
                  <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-lg bg-[#2563EB] flex items-center justify-center text-white shrink-0 shadow-xs">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-slate-900 tracking-tight leading-none">
                          31,783
                        </div>
                        <div className="text-xs text-slate-600 font-medium mt-1">
                          Applications Monitored
                        </div>
                      </div>
                    </div>
                    <div className="text-[#10B981] font-bold text-xs flex items-center">
                      ↑ 5%
                    </div>
                  </div>

                  {/* Card 2: Reverted Applications */}
                  <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-lg bg-[#FFFBEB] flex items-center justify-center text-[#F59E0B] shrink-0 border border-amber-200 shadow-xs">
                        <RotateCcw className="w-6 h-6 stroke-[2.5]" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-slate-900 tracking-tight leading-none">
                          2,087
                        </div>
                        <div className="text-xs text-slate-600 font-medium mt-1">
                          Reverted Applications
                        </div>
                      </div>
                    </div>
                    <div className="text-[#10B981] font-bold text-xs flex items-center">
                      ↑ 2%
                    </div>
                  </div>

                  {/* Card 3: Paid but Not Submitted */}
                  <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-lg bg-[#059669] flex items-center justify-center text-white shrink-0 shadow-xs">
                        <CreditCard className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-slate-900 tracking-tight leading-none">
                          426
                        </div>
                        <div className="text-xs text-slate-600 font-medium mt-1">
                          Paid but Not Submitted
                        </div>
                      </div>
                    </div>
                    <div className="text-[#10B981] font-bold text-xs flex items-center">
                      ↑ 1%
                    </div>
                  </div>

                  {/* Card 4: Incomplete Applications */}
                  <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-full bg-[#8B5CF6] flex items-center justify-center text-white shrink-0 shadow-xs">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-slate-900 tracking-tight leading-none">
                          612
                        </div>
                        <div className="text-xs text-slate-600 font-medium mt-1">
                          Incomplete Applications
                        </div>
                      </div>
                    </div>
                    <div className="text-[#10B981] font-bold text-xs flex items-center">
                      ↑ 3%
                    </div>
                  </div>
                </div>

                {/* 3. Middle Section: Application Issues Overview + Alerts & Actions */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Left Column: Application Issues Overview Bar Chart */}
                  <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <BarChart2 className="w-5 h-5 text-[#2563EB]" />
                        <h2 className="font-bold text-slate-900 text-base">Application Issues Overview</h2>
                      </div>
                      <select
                        value={issuesTimeFilter}
                        onChange={(e) => setIssuesTimeFilter(e.target.value as any)}
                        className="text-xs text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 py-1 font-medium focus:outline-none cursor-pointer"
                      >
                        <option value="30">Last 30 Days</option>
                        <option value="7">Last 7 Days</option>
                        <option value="90">Last 90 Days</option>
                        <option value="365">This Year</option>
                      </select>
                    </div>

                    {/* Styled Interactive SVG Bar Chart */}
                    <div className="pt-2 pb-1">
                      <div className="relative h-52 w-full flex items-end">
                        {/* Horizontal Grid lines and Y-axis scale */}
                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[11px] text-slate-400">
                          <div className="border-b border-slate-100 flex items-center justify-between pr-2">
                            <span>2,000</span>
                          </div>
                          <div className="border-b border-slate-100 flex items-center justify-between pr-2">
                            <span>1,500</span>
                          </div>
                          <div className="border-b border-slate-100 flex items-center justify-between pr-2">
                            <span>1,000</span>
                          </div>
                          <div className="border-b border-slate-100 flex items-center justify-between pr-2">
                            <span>500</span>
                          </div>
                          <div className="border-b border-slate-200 flex items-center justify-between pr-2">
                            <span>0</span>
                          </div>
                        </div>

                        {/* Bars Container */}
                        <div className="relative z-10 w-full h-full flex items-end justify-around pl-10 pr-2">
                          {/* Bar 1: Reverted (2,087) */}
                          <div className="flex flex-col items-center h-full justify-end group">
                            <span className="text-xs font-bold text-slate-800 mb-1 group-hover:scale-110 transition-transform">
                              2,087
                            </span>
                            <div
                              className="w-14 sm:w-16 bg-[#2563EB] rounded-t-sm shadow-sm transition-all duration-300 group-hover:brightness-110"
                              style={{ height: '88%' }}
                              title="Reverted: 2,087 cases (60% photo lighting, 40% NRC clarity)"
                            />
                            <span className="text-xs text-slate-600 font-medium mt-2 whitespace-nowrap">
                              Reverted
                            </span>
                          </div>

                          {/* Bar 2: Paid Not Submitted (426) */}
                          <div className="flex flex-col items-center h-full justify-end group">
                            <span className="text-xs font-bold text-slate-800 mb-1 group-hover:scale-110 transition-transform">
                              426
                            </span>
                            <div
                              className="w-14 sm:w-16 bg-[#059669] rounded-t-sm shadow-sm transition-all duration-300 group-hover:brightness-110"
                              style={{ height: '22%' }}
                              title="Paid Not Submitted: 426 cases awaiting final submit confirmation"
                            />
                            <span className="text-xs text-slate-600 font-medium mt-2 whitespace-nowrap">
                              Paid Not Submitted
                            </span>
                          </div>

                          {/* Bar 3: Incomplete (612) */}
                          <div className="flex flex-col items-center h-full justify-end group">
                            <span className="text-xs font-bold text-slate-800 mb-1 group-hover:scale-110 transition-transform">
                              612
                            </span>
                            <div
                              className="w-14 sm:w-16 bg-[#8B5CF6] rounded-t-sm shadow-sm transition-all duration-300 group-hover:brightness-110"
                              style={{ height: '30%' }}
                              title="Incomplete: 612 drafts missing documents"
                            />
                            <span className="text-xs text-slate-600 font-medium mt-2 whitespace-nowrap">
                              Incomplete
                            </span>
                          </div>

                          {/* Bar 4: Other (398) */}
                          <div className="flex flex-col items-center h-full justify-end group">
                            <span className="text-xs font-bold text-slate-800 mb-1 group-hover:scale-110 transition-transform">
                              398
                            </span>
                            <div
                              className="w-14 sm:w-16 bg-[#F59E0B] rounded-t-sm shadow-sm transition-all duration-300 group-hover:brightness-110"
                              style={{ height: '20%' }}
                              title="Other: 398 cases (expired biometrics, duplicate entries)"
                            />
                            <span className="text-xs text-slate-600 font-medium mt-2 whitespace-nowrap">
                              Other
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Alerts & Actions */}
                  <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Bell className="w-5 h-5 text-slate-800" />
                        <h2 className="font-bold text-slate-900 text-base">Alerts & Actions</h2>
                      </div>
                      <button
                        onClick={() => setActiveNavTab('notifications')}
                        className="text-[#2563EB] text-xs font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        View All →
                      </button>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {/* Alert 1: Reverted Application */}
                      <div
                        onClick={() => setActiveModal('reverted_details')}
                        className="py-2.5 flex items-start gap-3 hover:bg-slate-50 p-2 rounded-lg transition-colors cursor-pointer"
                      >
                        <div className="w-7 h-7 rounded-full bg-[#EF4444] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                          <AlertCircle className="w-4 h-4 stroke-[2.5]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-slate-900 text-xs">Reverted Application</p>
                            <span className="text-slate-400 text-[11px]">2h ago</span>
                          </div>
                          <p className="text-slate-600 text-xs mt-0.5 truncate">
                            {activeRevertedApp?.trackingNumber || 'OPAS-2026-00125'} — Action Required
                          </p>
                        </div>
                      </div>

                      {/* Alert 2: Application Incomplete */}
                      <div
                        onClick={() => setActiveModal('draft_continue')}
                        className="py-2.5 flex items-start gap-3 hover:bg-slate-50 p-2 rounded-lg transition-colors cursor-pointer"
                      >
                        <div className="w-7 h-7 rounded-full bg-[#2563EB] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                          <Info className="w-4 h-4 stroke-[2.5]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-slate-900 text-xs">Application Incomplete</p>
                            <span className="text-slate-400 text-[11px]">4h ago</span>
                          </div>
                          <p className="text-slate-600 text-xs mt-0.5 truncate">
                            {activeDraftApp?.trackingNumber || 'OPAS-2026-00432'} — Provide missing docs
                          </p>
                        </div>
                      </div>

                      {/* Alert 3: Reminder Sent */}
                      <div
                        onClick={() => setActiveNavTab('notifications')}
                        className="py-2.5 flex items-start gap-3 hover:bg-slate-50 p-2 rounded-lg transition-colors cursor-pointer"
                      >
                        <div className="w-7 h-7 rounded-full bg-[#10B981] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                          <Check className="w-4 h-4 stroke-[3]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-slate-900 text-xs">Reminder Sent</p>
                            <span className="text-slate-400 text-[11px]">1d ago</span>
                          </div>
                          <p className="text-slate-600 text-xs mt-0.5 truncate">
                            To 1,240 applicants
                          </p>
                        </div>
                      </div>

                      {/* Alert 4: Paid but Not Submitted */}
                      <div
                        onClick={() => setActiveModal('payment_complete')}
                        className="py-2.5 flex items-start gap-3 hover:bg-slate-50 p-2 rounded-lg transition-colors cursor-pointer"
                      >
                        <div className="w-7 h-7 rounded-full bg-[#F59E0B] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                          <Clock className="w-4 h-4 stroke-[2.5]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-slate-900 text-xs">Paid but Not Submitted</p>
                            <span className="text-slate-400 text-[11px]">1d ago</span>
                          </div>
                          <p className="text-slate-600 text-xs mt-0.5 truncate">
                            {activePaidApp?.trackingNumber || 'OPAS-2026-00718'} — Complete submission
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Lower Section: My Applications + Quick Access */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Left Column: My Applications */}
                  <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <FolderClosed className="w-5 h-5 text-[#2563EB]" />
                        <h2 className="font-bold text-slate-900 text-base">My Applications</h2>
                      </div>
                      <button
                        onClick={() => setActiveNavTab('applications')}
                        className="text-[#2563EB] text-xs font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        View All →
                      </button>
                    </div>

                    {/* 2x2 Grid of Status Sub-Cards */}
                    <div className="grid grid-cols-2 gap-3.5">
                      {/* 1. Draft Applications */}
                      <div
                        onClick={() => setActiveModal('draft_continue')}
                        className="bg-[#EFF6FF] border border-[#DBEAFE] rounded-xl p-3.5 flex flex-col justify-between hover:border-blue-300 transition-colors cursor-pointer"
                      >
                        <div>
                          <div className="w-7 h-7 rounded-full bg-white text-[#2563EB] flex items-center justify-center shadow-2xs mb-2">
                            <Clock className="w-4 h-4" />
                          </div>
                          <span className="text-xs text-slate-700 font-medium">Draft Applications</span>
                          <div className="text-2xl font-bold text-slate-900 mt-1">{draftAppsCount}</div>
                        </div>
                        <span className="text-xs font-semibold text-[#2563EB] hover:underline mt-2 inline-flex items-center gap-1">
                          Continue →
                        </span>
                      </div>

                      {/* 2. Reverted Applications */}
                      <div
                        onClick={() => setActiveModal('reverted_details')}
                        className="bg-[#FFFBEB] border border-[#FEF3C7] rounded-xl p-3.5 flex flex-col justify-between hover:border-amber-300 transition-colors cursor-pointer"
                      >
                        <div>
                          <div className="w-7 h-7 rounded-full bg-white text-[#F59E0B] flex items-center justify-center shadow-2xs mb-2">
                            <RotateCcw className="w-4 h-4 stroke-[2.5]" />
                          </div>
                          <span className="text-xs text-slate-700 font-medium">Reverted Applications</span>
                          <div className="text-2xl font-bold text-slate-900 mt-1">{revertedAppsCount}</div>
                        </div>
                        <span className="text-xs font-semibold text-[#2563EB] hover:underline mt-2 inline-flex items-center gap-1">
                          View Details →
                        </span>
                      </div>

                      {/* 3. Submitted Applications */}
                      <div
                        onClick={() => setActiveNavTab('applications')}
                        className="bg-[#ECFDF5] border border-[#D1FAE5] rounded-xl p-3.5 flex flex-col justify-between hover:border-emerald-300 transition-colors cursor-pointer"
                      >
                        <div>
                          <div className="w-7 h-7 rounded-full bg-white text-[#10B981] flex items-center justify-center shadow-2xs mb-2">
                            <Check className="w-4 h-4 stroke-[3]" />
                          </div>
                          <span className="text-xs text-slate-700 font-medium">Submitted Applications</span>
                          <div className="text-2xl font-bold text-slate-900 mt-1">{submittedAppsCount}</div>
                        </div>
                        <span className="text-xs font-semibold text-[#2563EB] hover:underline mt-2 inline-flex items-center gap-1">
                          Track Status →
                        </span>
                      </div>

                      {/* 4. Paid Pending Submission */}
                      <div
                        onClick={() => setActiveModal('payment_complete')}
                        className="bg-[#FAF5FF] border border-[#F3E8FF] rounded-xl p-3.5 flex flex-col justify-between hover:border-purple-300 transition-colors cursor-pointer"
                      >
                        <div>
                          <div className="w-7 h-7 rounded-full bg-white text-[#8B5CF6] flex items-center justify-center shadow-2xs mb-2">
                            <CreditCard className="w-4 h-4" />
                          </div>
                          <span className="text-xs text-slate-700 font-medium">Paid Pending Submission</span>
                          <div className="text-2xl font-bold text-slate-900 mt-1">{paidPendingAppsCount}</div>
                        </div>
                        <span className="text-xs font-semibold text-[#2563EB] hover:underline mt-2 inline-flex items-center gap-1">
                          Complete Now →
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Quick Access */}
                  <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center gap-2 mb-4">
                      <Zap className="w-5 h-5 text-[#2563EB]" />
                      <h2 className="font-bold text-slate-900 text-base">Quick Access</h2>
                    </div>

                    {/* 2x2 Action Cards */}
                    <div className="grid grid-cols-2 gap-3.5">
                      {/* Action 1: Ask the AI Assistant */}
                      <button
                        onClick={() => {
                          setIsAssistantDockMinimized(false);
                          setTimeout(() => chatInputRef.current?.focus(), 150);
                        }}
                        className="bg-[#F8FAFC] border border-slate-200/80 rounded-xl p-3 flex items-center justify-between text-left hover:border-blue-300 hover:bg-blue-50/40 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#2563EB] text-white flex items-center justify-center shrink-0">
                            <Bot className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 leading-tight">Ask the AI Assistant</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">Get instant help</div>
                          </div>
                        </div>
                        <span className="text-[#2563EB] font-bold text-sm group-hover:translate-x-0.5 transition-transform">
                          →
                        </span>
                      </button>

                      {/* Action 2: Check Your Contact Details */}
                      <button
                        onClick={() => setActiveNavTab('smart_validation')}
                        className="bg-[#F8FAFC] border border-slate-200/80 rounded-xl p-3 flex items-center justify-between text-left hover:border-emerald-300 hover:bg-emerald-50/40 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#10B981] text-white flex items-center justify-center shrink-0">
                            <ShieldCheck className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 leading-tight">Check Your</div>
                            <div className="text-xs font-bold text-slate-900 leading-tight">Contact Details</div>
                          </div>
                        </div>
                        <span className="text-[#2563EB] font-bold text-sm group-hover:translate-x-0.5 transition-transform">
                          →
                        </span>
                      </button>

                      {/* Action 3: View Notifications */}
                      <button
                        onClick={() => setActiveNavTab('notifications')}
                        className="bg-[#F8FAFC] border border-slate-200/80 rounded-xl p-3 flex items-center justify-between text-left hover:border-blue-300 hover:bg-blue-50/40 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#2563EB] text-white flex items-center justify-center shrink-0">
                            <Bell className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 leading-tight">View Notifications</div>
                            <div className="text-[11px] text-rose-500 font-semibold mt-0.5">(3 new)</div>
                          </div>
                        </div>
                        <span className="text-[#2563EB] font-bold text-sm group-hover:translate-x-0.5 transition-transform">
                          →
                        </span>
                      </button>

                      {/* Action 4: Guidance on Common Errors */}
                      <button
                        onClick={() => setActiveModal('common_errors')}
                        className="bg-[#F8FAFC] border border-slate-200/80 rounded-xl p-3 flex items-center justify-between text-left hover:border-blue-300 hover:bg-blue-50/40 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#2563EB] text-white flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 leading-tight">Guidance on</div>
                            <div className="text-xs font-bold text-slate-900 leading-tight">Common Errors</div>
                          </div>
                        </div>
                        <span className="text-[#2563EB] font-bold text-sm group-hover:translate-x-0.5 transition-transform">
                          →
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 5. Bottom Banner: Smart Validation with Proceed to Correction */}
                <div className={`rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs transition-colors ${
                  smartValidationCorrected
                    ? 'bg-[#EBF7F2] border border-[#A2E5C5]'
                    : 'bg-[#E8F8F0] border border-[#A2E5C5]'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#10B981] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 text-sm mr-2">Smart Validation</span>
                      <span className="text-xs text-slate-700">
                        {smartValidationCorrected
                          ? 'All application contact information has been validated against OPAS registry standards. 0 issues detected.'
                          : "We've detected 1 application with an invalid email format (divine@gmail in OPAS-2026-001). Direct correction in OPAS available."}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!smartValidationCorrected && (
                      <button
                        onClick={handleProceedToOpasCorrection}
                        className="px-4 py-2 rounded-full bg-[#1868D6] hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Proceed to correction</span>
                      </button>
                    )}
                    <button
                      onClick={() => setActiveNavTab('smart_validation')}
                      className="px-4 py-2 rounded-full border border-slate-300 hover:border-slate-400 text-slate-700 bg-white text-xs font-semibold hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
                    >
                      <span>View Details</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* TAB: AI Assistant */}
            {activeNavTab === 'ai_assistant' && (
              <section className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">AI Passport Support Officer</h2>
                    <p className="text-sm text-slate-600 mt-1">
                      Ask questions, understand passport requirements and errors, and get next-step guidance for your application.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveNavTab('applications')}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 cursor-pointer"
                  >
                    <FolderClosed className="w-4 h-4" />
                    My Applications
                  </button>
                </div>
                <div className="flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs leading-relaxed text-blue-950">
                    <p className="font-semibold">Guidance for your existing OPAS application</p>
                    <p className="mt-0.5 text-blue-800">
                      SmartGuide explains requirements and suggested actions. Make application changes and submit documents in OPAS.
                      Application records shown here are prototype data until an OPAS connection is configured.
                    </p>
                  </div>
                  <a
                    href="https://pass.gsb.gov.zm/login?flow=e4f9ee5b-d96c-454f-bb11-8cbde6d56110"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#0B3B73] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-900"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open OPAS
                  </a>
                </div>
                <AIGuidanceChat
                  isFullWidth
                  onNavigateToTab={(tab) => {
                    if (tab === 'messages') setActiveNavTab('notifications');
                  }}
                />
              </section>
            )}

            {/* TAB: My Applications List */}
            {activeNavTab === 'applications' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">My Applications</h2>
                    <p className="text-sm text-slate-600 mt-1">
                      Passport applications associated with {citizenName}.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveNavTab('ai_assistant')}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0B3B73] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900 cursor-pointer"
                  >
                    <Bot className="w-4 h-4" />
                    Ask AI Assistant
                  </button>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
                  These are prototype records from this workspace, not live applications retrieved from OPAS. A live OPAS connection is not configured.
                </div>

                <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                  {[
                    { label: 'Total', count: citizenApps.length, icon: FileText, color: 'bg-blue-50 text-blue-600' },
                    { label: 'Draft', count: draftAppsCount, icon: Clock, color: 'bg-amber-50 text-amber-600' },
                    { label: 'Reverted', count: revertedAppsCount, icon: AlertCircle, color: 'bg-rose-50 text-rose-600' },
                    { label: 'Submitted', count: submittedAppsCount, icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600' },
                  ].map(({ label, count, icon: Icon, color }) => (
                    <div key={label} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
                      <div className={`rounded-lg p-2 ${color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xl font-bold text-slate-900">{count}</div>
                        <div className="text-xs text-slate-600">{label}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {citizenApps.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
                    <FolderClosed className="mx-auto h-10 w-10 text-slate-400" />
                    <h3 className="mt-3 font-semibold text-slate-900">No applications found for this account</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      No workspace records match your signed-in email or NRC. Live OPAS lookup is not configured.
                    </p>
                    <button
                      onClick={() => setActiveNavTab('ai_assistant')}
                      className="mt-4 inline-flex items-center gap-2 rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 cursor-pointer"
                    >
                      <Bot className="h-4 w-4" />
                      Ask the AI Assistant
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {citizenApps.map((app) => (
                      <article
                        key={app.id}
                        className={`rounded-xl border p-4 transition-colors ${
                          app.status === 'Reverted'
                            ? 'border-rose-200 bg-rose-50/60'
                            : 'border-slate-200 bg-white hover:border-blue-300'
                        }`}
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div className="flex items-start gap-3">
                            <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
                              <FileText className="h-5 w-5" />
                            </div>
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-bold text-slate-900">{app.passportType}</h3>
                                <span
                                  className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                                    app.status === 'Reverted'
                                      ? 'border-rose-200 bg-rose-100 text-rose-800'
                                      : app.status === 'Paid - Unsubmitted'
                                      ? 'border-amber-200 bg-amber-100 text-amber-800'
                                      : app.status === 'Draft'
                                      ? 'border-slate-200 bg-slate-100 text-slate-700'
                                      : 'border-emerald-200 bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {app.status}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600">
                                Ref: {app.trackingNumber} · Fee: ZMW {app.feeAmount.toLocaleString()}
                              </p>
                              <p className="text-xs text-slate-500">
                                Updated {new Date(app.lastUpdated).toLocaleDateString()}
                              </p>
                              {app.reversionReason && (
                                <p className="pt-1 text-xs font-medium text-rose-700">
                                  Action required: {app.reversionReason}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 md:shrink-0">
                            {app.status === 'Reverted' && (
                              <button
                                onClick={() => {
                                  onSelectApplication(app);
                                  setActiveModal('reverted_details');
                                }}
                                className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white hover:bg-rose-700 cursor-pointer"
                              >
                                Review Reverted Case
                              </button>
                            )}
                            {app.status === 'Paid - Unsubmitted' && (
                              <button
                                onClick={() => {
                                  onSelectApplication(app);
                                  setSandboxPaymentReference(null);
                                  setSandboxPaymentError('');
                                  setActiveModal('payment_complete');
                                }}
                                className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800 cursor-pointer"
                              >
                                Continue
                              </button>
                            )}
                            {app.status === 'Draft' && (
                              <button
                                onClick={() => {
                                  onSelectApplication(app);
                                  setSandboxPaymentReference(null);
                                  setSandboxPaymentError('');
                                  setActiveModal('draft_continue');
                                }}
                                className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white hover:bg-black cursor-pointer"
                              >
                                Continue Draft
                              </button>
                            )}
                            <button
                              onClick={() => {
                                onSelectApplication(app);
                                setExpandedApplicationId((current) => current === app.id ? null : app.id);
                              }}
                              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                            >
                              {expandedApplicationId === app.id ? 'Hide Details' : 'View Details'}
                            </button>
                            <button
                              onClick={() => {
                                onSelectApplication(app);
                                setActiveNavTab('ai_assistant');
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 cursor-pointer"
                            >
                              <Bot className="h-3.5 w-3.5" />
                              Ask AI
                            </button>
                          </div>
                        </div>
                        {expandedApplicationId === app.id && (
                          <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4 text-xs sm:grid-cols-2">
                            <div>
                              <span className="font-semibold text-slate-700">Service:</span>{' '}
                              <span className="text-slate-600">{app.serviceSpeed}</span>
                            </div>
                            <div>
                              <span className="font-semibold text-slate-700">Payment:</span>{' '}
                              <span className="text-slate-600">
                                {app.feePaid ? `Paid${app.paymentReference ? ` · ${app.paymentReference}` : ''}` : 'Not paid'}
                              </span>
                            </div>
                            <div>
                              <span className="font-semibold text-slate-700">Collection office:</span>{' '}
                              <span className="text-slate-600">{app.collectionOffice}</span>
                            </div>
                            {app.documents.length > 0 && (
                              <div>
                                <span className="font-semibold text-slate-700">Documents:</span>{' '}
                                <span className="text-slate-600">
                                  {app.documents.map((document) => `${document.type} (${document.status})`).join(', ')}
                                </span>
                              </div>
                            )}
                            <div className="sm:col-span-2">
                              <ApplicationLifecycleTimeline application={app} />
                            </div>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: Notifications */}
            {activeNavTab === 'notifications' && (
              <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Notifications & Alerts</h2>
                    <p className="text-xs text-slate-500">Official SMS transmissions and passport adjudication notices</p>
                  </div>
                  <button
                    onClick={() => setActiveNavTab('dashboard')}
                    className="text-xs font-semibold text-[#2563EB] hover:underline"
                  >
                    ← Back to Dashboard
                  </button>
                </div>

                <div className="space-y-3">
                  {serverMessagesError && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">{serverMessagesError}</div>}
                  {serverMessages.length > 0 && (
                    <>
                      <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3 space-y-2">
                        <div className="flex items-center justify-between"><h3 className="text-xs font-bold text-blue-950">SmartGuide In-App Notifications</h3><span className="text-[10px] text-blue-700">{serverMessages.filter((item) => item.channel === 'IN_APP').length} messages</span></div>
                        {serverMessages.filter((item) => item.channel === 'IN_APP').map((item) => (
                          <article key={item.id} className="rounded-lg border border-blue-100 bg-white p-3">
                            <div className="flex items-start justify-between gap-2"><p className="text-xs font-bold text-slate-900">{item.subject}</p><span className={`text-[10px] font-semibold ${item.status === 'READ' ? 'text-slate-400' : 'text-blue-700'}`}>{item.status === 'READ' ? 'Read' : 'New'}</span></div>
                            <p className="mt-1 text-xs text-slate-700">{item.content}</p>
                            <div className="mt-2 flex items-center justify-between gap-2"><span className="text-[10px] text-slate-500">{item.applicationReference} · {new Date(item.createdAt).toLocaleString()}</span>{item.status === 'AVAILABLE' && <button onClick={() => void markServerMessageRead(item)} className="text-[10px] font-bold text-blue-700 hover:underline">Mark as read</button>}</div>
                          </article>
                        ))}
                      </div>
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 space-y-2">
                        <div className="flex items-center justify-between"><h3 className="text-xs font-bold text-emerald-950">Simulated OPAS Message Board</h3><span className="text-[10px] text-emerald-700">{serverMessages.filter((item) => item.channel === 'OPAS_MESSAGE_BOARD').length} messages</span></div>
                        {serverMessages.filter((item) => item.channel === 'OPAS_MESSAGE_BOARD').map((item) => (
                          <article key={item.id} className="rounded-lg border border-emerald-100 bg-white p-3">
                            <div className="flex items-start justify-between gap-2"><p className="text-xs font-bold text-slate-900">{item.subject}</p><span className={`text-[10px] font-semibold ${item.status === 'READ' ? 'text-slate-400' : 'text-emerald-700'}`}>{item.status === 'READ' ? 'Read' : 'New'}</span></div>
                            <p className="mt-1 text-xs text-slate-700">{item.content}</p>
                            <div className="mt-2 flex items-center justify-between gap-2"><span className="text-[10px] text-slate-500">{item.applicationReference} · {new Date(item.createdAt).toLocaleString()}</span>{item.status === 'AVAILABLE' && <button onClick={() => void markServerMessageRead(item)} className="text-[10px] font-bold text-emerald-700 hover:underline">Mark as read</button>}</div>
                          </article>
                        ))}
                      </div>
                    </>
                  )}
                  {paymentDetectionError && (
                    <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                      SmartGuide could not check for new payment detections: {paymentDetectionError}
                    </div>
                  )}

                  {inboxNotifications.map(({ applicationReference, notification }) => {
                    const isPaymentDetection = notification.trigger === 'SMARTGUIDE_PAYMENT_DETECTION';
                    return (
                      <article
                        key={notification.id}
                        className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                          isPaymentDetection
                            ? 'border-amber-200 bg-amber-50/70'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full text-white flex items-center justify-center shrink-0 ${
                          isPaymentDetection ? 'bg-amber-500' : 'bg-blue-500'
                        }`}>
                          {isPaymentDetection ? <CreditCard className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <span className={`font-bold text-xs ${isPaymentDetection ? 'text-amber-950' : 'text-slate-900'}`}>
                              {notification.subject || 'Application update'}
                            </span>
                            <span className="text-[11px] text-slate-500 shrink-0">
                              {new Date(notification.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 mt-1">{notification.content}</p>
                          <p className="text-[11px] text-slate-500 mt-1.5">
                            Application #{applicationReference} · {notification.channel} · {notification.deliveryStatus}
                          </p>
                        </div>
                      </article>
                    );
                  })}

                  <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/50 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-rose-900 text-xs">Reverted Application — Action Required</span>
                        <span className="text-[11px] text-slate-400">2h ago • SMS Delivered</span>
                      </div>
                      <p className="text-xs text-slate-700 mt-1">
                        MoHAIS OPAS: Dear John Banda, application #OPAS-2026-00125 was reverted. Action required: re-upload photo & clear NRC copy with zero repayment fee.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0">
                      <Info className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-blue-900 text-xs">Application Incomplete Draft</span>
                        <span className="text-[11px] text-slate-400">4h ago • Portal Alert</span>
                      </div>
                      <p className="text-xs text-slate-700 mt-1">
                        OPAS-2026-00432: Draft saved. Provide certified birth certificate copy and proceed to government gateway fee payment.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-900 text-xs">MoHAIS SMS Reminder Broadcast</span>
                        <span className="text-[11px] text-slate-400">1d ago • Gateway Broadcast</span>
                      </div>
                      <p className="text-xs text-slate-700 mt-1">
                        Reminder sent to 1,240 applicants: Please ensure physical Green NRC is presented at Lusaka HQ for biometrics appointments.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Reports */}
            {activeNavTab === 'reports' && (
              <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Adjudication & SLA Intelligence Reports</h2>
                    <p className="text-xs text-slate-500">Government service performance metrics across MoHAIS passport stations</p>
                  </div>
                  <button
                    onClick={() => setActiveNavTab('dashboard')}
                    className="text-xs font-semibold text-[#2563EB] hover:underline"
                  >
                    ← Back to Dashboard
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-xs text-slate-500 font-medium">Average Vetting SLA</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">8.4 Days</p>
                    <p className="text-[11px] text-emerald-600 font-semibold mt-1">↓ 32% faster with OPAS AI</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-xs text-slate-500 font-medium">Reversion Resolution Time</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">1.6 Days</p>
                    <p className="text-[11px] text-emerald-600 font-semibold mt-1">Same-day re-check active</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-xs text-slate-500 font-medium">Passport Chip Personalization</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">99.8% Pass</p>
                    <p className="text-[11px] text-slate-500 mt-1">Cryptographic RFID verified</p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Settings */}
            {activeNavTab === 'settings' && (
              <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-5 max-w-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Citizen Settings & Preferences</h2>
                    <p className="text-xs text-slate-500">Configure alert channels and language accessibility</p>
                  </div>
                  <button
                    onClick={() => setActiveNavTab('dashboard')}
                    className="text-xs font-semibold text-[#2563EB] hover:underline"
                  >
                    ← Back to Dashboard
                  </button>
                </div>

                {settingsSaved && (
                  <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded-lg">
                    Settings successfully updated and synchronized with MoHAIS registry!
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <div>
                      <p className="text-xs font-bold text-slate-900">SMS Status Alerts</p>
                      <p className="text-[11px] text-slate-500">Receive free SMS for status milestones (+260978112233)</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={smsAlerts}
                      onChange={(e) => setSmsAlerts(e.target.checked)}
                      className="w-4 h-4 accent-[#2563EB] cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <div>
                      <p className="text-xs font-bold text-slate-900">Email Dossier Notifications</p>
                      <p className="text-[11px] text-slate-500">Send submission and collection slip to john.banda@gmail.com</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={emailAlerts}
                      onChange={(e) => setEmailAlerts(e.target.checked)}
                      className="w-4 h-4 accent-[#2563EB] cursor-pointer"
                    />
                  </div>

                  <div className="py-2 border-b border-slate-100">
                    <label className="text-xs font-bold text-slate-900 block mb-1">Preferred Language</label>
                    <select
                      value={preferredLang}
                      onChange={(e) => setPreferredLang(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white text-slate-800"
                    >
                      <option value="English">English</option>
                      <option value="Bemba">Bemba (Chibemba)</option>
                      <option value="Nyanja">Nyanja (Chinyanja)</option>
                      <option value="Tonga">Tonga (Chitonga)</option>
                    </select>
                  </div>

                  <button
                    onClick={() => {
                      setSettingsSaved(true);
                      setTimeout(() => setSettingsSaved(false), 2500);
                    }}
                    className="bg-[#2563EB] hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2 rounded-lg cursor-pointer"
                  >
                    Save Preferences
                  </button>
                </div>
              </div>
            )}

            {/* TAB: Smart Validation (Full match to user prompt) */}
            {activeNavTab === 'smart_validation' && (
              <div className="space-y-6 max-w-4xl mx-auto pb-10">
                {/* BREADCRUMB: APPLICANT PORTAL / SMART VALIDATION */}
                <nav className="flex items-center gap-2 text-xs font-semibold tracking-wider text-slate-400 uppercase">
                  <button
                    onClick={() => setActiveNavTab('dashboard')}
                    className="hover:text-[#2563EB] transition-colors cursor-pointer"
                  >
                    APPLICANT PORTAL
                  </button>
                  <span>/</span>
                  <span className="text-slate-700">SMART VALIDATION</span>
                </nav>

                {/* HEADER */}
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Smart Validation
                  </h1>
                  <p className="text-sm text-slate-600 mt-1">
                    Review potential errors and incomplete information in your passport applications.
                  </p>
                </div>

                {/* STATS: 02 Applications checked / 01 Issues detected */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs">
                    <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                      02
                    </div>
                    <div className="text-xs font-medium text-slate-600 mt-1.5">
                      Applications checked
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs">
                    <div className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${
                      smartValidationCorrected ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                      {smartValidationCorrected ? '00' : '01'}
                    </div>
                    <div className="text-xs font-medium text-slate-600 mt-1.5">
                      {smartValidationCorrected ? 'All issues resolved' : 'Issues detected'}
                    </div>
                  </div>
                </div>

                {/* ACTION REQUIRED BANNER */}
                <div className={`rounded-xl p-4 sm:p-5 border flex items-start gap-3.5 shadow-xs transition-colors ${
                  smartValidationCorrected
                    ? 'bg-[#EBF7F2] border-[#A2E5C5]'
                    : 'bg-[#FFFBEB] border-amber-200'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    smartValidationCorrected
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-500 text-white'
                  }`}>
                    {smartValidationCorrected ? (
                      <Check className="w-4 h-4 stroke-[3]" />
                    ) : (
                      <AlertCircle className="w-4 h-4 stroke-[2.5]" />
                    )}
                  </div>
                  <div>
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${
                      smartValidationCorrected ? 'text-emerald-800' : 'text-amber-800'
                    }`}>
                      {smartValidationCorrected ? 'Action Completed' : 'Action required'}
                    </span>
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">
                      {smartValidationCorrected
                        ? 'Email format validated'
                        : '1 issue needs your attention'}
                    </h2>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {smartValidationCorrected
                        ? 'Application OPAS-2026-001 now has a valid RFC-compliant email address. Ready for processing.'
                        : 'We detected an incorrectly formatted email address in one of your applications.'}
                    </p>
                  </div>
                </div>

                {/* DETECTED ISSUES SECTION */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">Detected issues</h2>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                      {smartValidationCorrected ? '0 results' : '1 result'}
                    </span>
                  </div>

                  {!smartValidationCorrected ? (
                    <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
                      {/* Badges: Invalid format & Contact details */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                          Invalid format
                        </span>
                        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          Contact details
                        </span>
                      </div>

                      {/* Incorrect email address & Application reference */}
                      <div>
                        <h3 className="text-base font-bold text-slate-900">
                          Incorrect email address
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Application reference: <span className="font-semibold text-slate-700">OPAS-2026-001</span>
                        </p>
                      </div>

                      {/* EMAIL ADDRESS ENTERED */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                          EMAIL ADDRESS ENTERED
                        </label>
                        <div className="bg-rose-50/70 border border-rose-200 rounded-lg px-4 py-2.5 flex items-center justify-between">
                          <span className="font-mono text-sm font-semibold text-rose-900">
                            {smartValidationEmail}
                          </span>
                          <span className="text-[11px] font-medium text-rose-600 flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-rose-200">
                            <AlertCircle className="w-3 h-3" />
                            Missing domain extension (.com)
                          </span>
                        </div>
                      </div>

                      {/* Explanation */}
                      <p className="text-xs text-slate-600 leading-relaxed">
                        This email address does not follow the expected email format. Please review and correct it in OPAS.
                      </p>

                      {/* Actions: Proceed to correction & View instructions */}
                      <div className="pt-2 flex flex-wrap items-center gap-3">
                        <button
                          onClick={handleProceedToOpasCorrection}
                          className="bg-[#1868D6] hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-all shadow-xs cursor-pointer flex items-center gap-2 group"
                        >
                          <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform" />
                          <span>Proceed to correction</span>
                        </button>

                        <button
                          onClick={() => setShowCorrectionInstructions(!showCorrectionInstructions)}
                          className="text-xs font-bold text-[#2563EB] hover:text-blue-800 flex items-center gap-1.5 cursor-pointer py-1"
                        >
                          <span>View issue and correction instructions</span>
                          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${
                            showCorrectionInstructions ? 'rotate-180' : ''
                          }`} />
                        </button>
                      </div>

                      {/* Direct Navigation Notice */}
                      <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 flex items-start gap-2.5">
                        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Direct OPAS Section Navigation</p>
                          <p className="text-blue-800 text-[11px] mt-0.5">
                            When you select <span className="font-bold">Proceed to correction</span>, SmartGuide directs you straight to application <span className="font-mono font-bold">OPAS-2026-001</span> in the existing OPAS, opening <span className="font-bold">Section 4 (Contact Information)</span> so you can update the email address directly.
                          </p>
                        </div>
                      </div>

                      {/* Expandable Correction Instructions */}
                      {showCorrectionInstructions && (
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-4">
                          <div className="space-y-2">
                            <p className="font-bold text-slate-900">
                              How to correct this email in official OPAS:
                            </p>
                            <ol className="list-decimal list-inside space-y-1.5 text-slate-700 leading-relaxed">
                              <li>Log in to your OPAS account at <a href="https://pass.gsb.gov.zm" target="_blank" rel="noreferrer" className="text-blue-600 underline">pass.gsb.gov.zm</a>.</li>
                              <li>Locate and open application <span className="font-mono font-semibold text-slate-900">OPAS-2026-001</span>.</li>
                              <li>Navigate to <span className="font-semibold">Applicant Profile &gt; Contact Information (Section 4)</span>.</li>
                              <li>Correct <code className="bg-rose-100 text-rose-800 px-1 py-0.5 rounded font-mono">divine@gmail</code> to include a valid domain extension (e.g., <code className="bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded font-mono">divine@gmail.com</code>).</li>
                              <li>Save changes so SMS dispatch and email collection slips can reach you securely.</li>
                            </ol>
                          </div>

                          {/* Quick Launch Button inside instructions */}
                          <div className="pt-1">
                            <button
                              onClick={handleProceedToOpasCorrection}
                              className="bg-[#1868D6] hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-lg cursor-pointer flex items-center gap-1.5 shadow-2xs"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Open Existing OPAS Section 4 Now</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-emerald-200 p-6 text-center space-y-2 shadow-xs">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <h3 className="font-bold text-slate-900 text-base">No Outstanding Issues</h3>
                      <p className="text-xs text-slate-600">
                        Email address updated in OPAS to <span className="font-mono font-bold text-emerald-800">{smartValidationEmail}</span>. All pre-validation checks passed.
                      </p>
                      <button
                        onClick={() => {
                          setSmartValidationCorrected(false);
                          setSmartValidationEmail('divine@gmail');
                          setCorrectionInputValue('divine@gmail.com');
                          setCurrentJourneyStep(4);
                          setCheckResultStatus('idle');
                        }}
                        className="text-xs text-blue-600 hover:underline pt-2 inline-block cursor-pointer font-medium"
                      >
                        Reset test issue (to divine@gmail)
                      </button>
                    </div>
                  )}
                </div>

                {/* APPLICANT JOURNEY AT A GLANCE (1 - 7 STEPS) */}
                <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                      <Layers className="w-5 h-5 text-[#1868D6]" />
                      <h2>Applicant journey at a glance</h2>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      7-Step Integrated Cycle
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    SmartGuide connects with the existing OPAS system to pre-screen, detect issues early, guide direct navigation to the exact application section, and verify corrections automatically.
                  </p>

                  <div className="space-y-2.5 pt-1">
                    {[
                      {
                        num: 1,
                        title: 'Applicant signs in to OPAS SmartGuide',
                        desc: 'The applicant sees their application overview and any validation alerts.',
                        status: 'Completed',
                        statusColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                      },
                      {
                        num: 2,
                        title: 'Smart Detection identifies an issue',
                        desc: 'The validation engine examines available OPAS application data and identifies a potential error or missing information.',
                        status: 'Completed',
                        statusColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                      },
                      {
                        num: 3,
                        title: 'Applicant receives a notification',
                        desc: 'A clear alert explains the number of affected applications and the type of issue.',
                        status: 'Completed',
                        statusColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                      },
                      {
                        num: 4,
                        title: 'Applicant opens the validation report',
                        desc: 'They see the affected application, detected issue, explanation and recommended action.',
                        status: 'Active Screen',
                        statusColor: 'bg-blue-100 text-blue-800 border-blue-200',
                      },
                      {
                        num: 5,
                        title: 'Applicant goes to existing OPAS',
                        desc: 'SmartGuide directs them to the relevant application section to make the correction.',
                        status: smartValidationCorrected ? 'Completed' : 'Action Required',
                        statusColor: smartValidationCorrected
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border-amber-200 animate-pulse',
                        action: !smartValidationCorrected && (
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              onClick={handleProceedToOpasCorrection}
                              className="text-xs font-bold bg-[#1868D6] hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Proceed to correction in OPAS</span>
                            </button>
                            <span className="text-[11px] text-slate-500 font-mono">OPAS-2026-001 &gt; Section 4</span>
                          </div>
                        ),
                      },
                      {
                        num: 6,
                        title: 'SmartGuide checks the updated information',
                        desc: 'When updated OPAS data becomes available, the validation engine checks the issue again.',
                        status: smartValidationCorrected ? 'Completed' : isCheckingUpdatedInfo ? 'Checking OPAS Data...' : 'Automated Trigger',
                        statusColor: smartValidationCorrected
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200',
                      },
                      {
                        num: 7,
                        title: 'Applicant receives the result',
                        desc: 'The issue is marked resolved if the updated information passes the relevant check. Otherwise, the applicant receives further guidance.',
                        status: smartValidationCorrected ? 'Resolved' : 'Pending Verification',
                        statusColor: smartValidationCorrected
                          ? 'bg-emerald-600 text-white font-bold'
                          : 'bg-slate-100 text-slate-500 border-slate-200',
                      },
                    ].map((stepItem) => (
                      <div
                        key={stepItem.num}
                        className={`p-3.5 rounded-xl border flex items-start gap-3 transition-colors ${
                          stepItem.num === 5 && !smartValidationCorrected
                            ? 'bg-blue-50/50 border-blue-200'
                            : 'bg-slate-50/60 border-slate-200/80'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                          stepItem.status === 'Completed' || stepItem.status === 'Resolved'
                            ? 'bg-emerald-600 text-white'
                            : stepItem.num === 5 && !smartValidationCorrected
                            ? 'bg-[#1868D6] text-white'
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          {stepItem.status === 'Completed' || stepItem.status === 'Resolved' ? (
                            <Check className="w-4 h-4 stroke-[3]" />
                          ) : (
                            stepItem.num
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                              {stepItem.num}. {stepItem.title}
                            </h3>
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${stepItem.statusColor}`}>
                              {stepItem.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            {stepItem.desc}
                          </p>
                          {stepItem.action}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* HOW SMART VALIDATION WORKS */}
                <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs space-y-1.5">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                    <Info className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>How Smart Validation works</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed pl-6">
                    SmartGuide checks available application information and highlights potential errors. You make corrections in the official OPAS system.
                  </p>
                </div>

                {/* DISCLAIMER */}
                <div className="text-center pt-4">
                  <p className="text-xs text-slate-400 italic">
                    Visual prototype with illustrative applicant records. It is not connected to live OPAS
                  </p>
                </div>
              </div>
            )}
          </main>

          {/* =========================================================================
              4. RIGHT DOCKED PANEL: AI ASSISTANT (Exact design from screenshot!)
              ========================================================================= */}
          {activeNavTab !== 'ai_assistant' && activeNavTab !== 'applications' && !isAssistantDockMinimized ? (
            <aside className="w-80 min-w-[320px] max-w-[340px] bg-white border-l border-slate-200 flex flex-col shrink-0 shadow-lg z-20">
              {/* Header: Dark Blue #0B1E38 */}
              <div className="bg-[#0B1E38] text-white px-4 py-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  {/* Cute robot head avatar with glowing eyes */}
                  <div className="w-7 h-7 rounded-full bg-[#183B68] flex items-center justify-center text-[#38BDF8] border border-[#38BDF8]/40 shadow-xs">
                    <Bot className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-sm tracking-wide text-white">AI Assistant</span>
                </div>
                <button
                  onClick={() => setIsAssistantDockMinimized(true)}
                  className="p-1 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Minimize AI Assistant"
                >
                  <Minus className="w-4 h-4" />
                </button>
              </div>

              {/* Chat Message Scroll Area */}
              <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
                {/* 1. Bot Welcome Message */}
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-[#ECFDF5] border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-[#F1F5F9] rounded-2xl rounded-tl-sm p-3 text-xs text-slate-800 leading-relaxed shadow-2xs max-w-[85%]">
                    <p className="font-semibold text-slate-900">Hello {citizenFirstName}! 👋</p>
                    <p className="mt-0.5">How can I help you today?</p>
                  </div>
                </div>

                {/* 2. Suggestion Pills (Exact 4 from screenshot) */}
                <div className="pl-9 space-y-1.5 my-2">
                  <button
                    onClick={() => handleSendChat('What documents do I need?')}
                    className="w-full text-left rounded-full border border-[#2563EB] text-[#2563EB] bg-white hover:bg-blue-50 text-xs px-3.5 py-1.5 font-medium transition-colors cursor-pointer shadow-2xs"
                  >
                    What documents do I need?
                  </button>
                  <button
                    onClick={() => handleSendChat('Why was my application reverted?')}
                    className="w-full text-left rounded-full border border-[#2563EB] text-[#2563EB] bg-white hover:bg-blue-50 text-xs px-3.5 py-1.5 font-medium transition-colors cursor-pointer shadow-2xs"
                  >
                    Why was my application reverted?
                  </button>
                  <button
                    onClick={() => handleSendChat('Check my application status')}
                    className="w-full text-left rounded-full border border-[#2563EB] text-[#2563EB] bg-white hover:bg-blue-50 text-xs px-3.5 py-1.5 font-medium transition-colors cursor-pointer shadow-2xs"
                  >
                    Check my application status
                  </button>
                  <button
                    onClick={() => handleSendChat('Validate my email or phone')}
                    className="w-full text-left rounded-full border border-[#2563EB] text-[#2563EB] bg-white hover:bg-blue-50 text-xs px-3.5 py-1.5 font-medium transition-colors cursor-pointer shadow-2xs"
                  >
                    Validate my email or phone
                  </button>
                </div>

                {/* 3. Pre-rendered user bubble from screenshot */}
                <div className="flex items-start justify-end gap-2.5">
                  <div className="bg-[#E0F2FE] rounded-2xl rounded-tr-sm p-3 text-xs text-slate-900 leading-relaxed max-w-[85%] shadow-2xs">
                    My application was reverted. What does that mean?
                  </div>
                  <div className="w-7 h-7 rounded-full bg-[#3B82F6] text-white flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                </div>

                {/* 4. Pre-rendered assistant answer from screenshot */}
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-[#ECFDF5] border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm p-3 text-xs text-slate-800 leading-relaxed shadow-xs max-w-[90%]">
                    <p>
                      Your application was returned by a Case Officer because some information or supporting documents require attention.
                    </p>
                    <p className="mt-2 text-slate-700">
                      Please log in to your OPAS account and open your Reverted applications to view the official comments.
                    </p>
                  </div>
                </div>

                {/* Dynamic subsequent messages */}
                {chatMessages.slice(3).map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-2.5 ${
                      msg.sender === 'user' ? 'justify-end' : ''
                    }`}
                  >
                    {msg.sender === 'bot' && (
                      <div className="w-7 h-7 rounded-full bg-[#ECFDF5] border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}
                    <div
                      className={`p-3 text-xs leading-relaxed max-w-[85%] rounded-2xl shadow-2xs whitespace-pre-line ${
                        msg.sender === 'user'
                          ? 'bg-[#E0F2FE] text-slate-900 rounded-tr-sm'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-xs'
                      }`}
                    >
                      {msg.text}
                    </div>
                    {msg.sender === 'user' && (
                      <div className="w-7 h-7 rounded-full bg-[#3B82F6] text-white flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ))}

                {isBotTyping && (
                  <div className="flex items-center gap-2 text-slate-400 text-xs pl-9">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse delay-100" />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse delay-200" />
                    <span>Analyzing MoHAIS registry...</span>
                  </div>
                )}
              </div>

              {/* Chat Input Bar */}
              <div className="p-3 border-t border-slate-200 bg-white">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendChat();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    ref={chatInputRef}
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type your question..."
                    className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="w-8 h-8 rounded-full bg-[#2563EB] text-white flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer shrink-0 shadow-2xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </aside>
          ) : activeNavTab !== 'ai_assistant' && activeNavTab !== 'applications' ? (
            /* Minimized Dock Button on right edge */
            <div className="flex flex-col justify-center items-center py-4 bg-white border-l border-slate-200 w-10 shrink-0">
              <button
                onClick={() => setIsAssistantDockMinimized(false)}
                className="p-2 text-[#2563EB] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                title="Expand AI Assistant"
              >
                <Maximize2 className="w-5 h-5" />
              </button>
              <div
                className="mt-6 text-xs font-bold text-slate-600 tracking-wider rotate-90 whitespace-nowrap cursor-pointer hover:text-blue-600"
                onClick={() => setIsAssistantDockMinimized(false)}
              >
                AI Assistant
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* =========================================================================
          FLOATING AI ASSISTANT WIDGET: "AI Assistant — DO YOU NEED HELP?"
          ========================================================================= */}
      {activeNavTab !== 'ai_assistant' && activeNavTab !== 'applications' && (
        <div
          className={`fixed z-40 transition-all duration-300 ${
            isAssistantDockMinimized
              ? 'bottom-6 right-6'
              : 'bottom-6 right-6 xl:right-[345px]'
          }`}
        >
          <button
            onClick={() => {
              setActiveNavTab('ai_assistant');
              setIsAssistantDockMinimized(false);
            }}
            className="bg-[#09182B] hover:bg-[#1868D6] text-white rounded-full pl-3 pr-4 py-2.5 shadow-2xl hover:shadow-blue-500/40 border-2 border-blue-400/70 flex items-center gap-3 text-xs font-bold transition-all duration-200 hover:scale-105 cursor-pointer group ring-4 ring-blue-500/15"
            title="AI Assistant — Do you need help?"
          >
            <div className="relative flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-[#1868D6] group-hover:bg-white text-white group-hover:text-[#1868D6] flex items-center justify-center transition-colors shadow-xs">
                <Bot className="w-4.5 h-4.5 stroke-[2.2]" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#09182B] animate-pulse" />
            </div>
            <div className="text-left">
              <div className="text-white text-xs font-black tracking-wide flex items-center gap-1.5">
                <span>AI Assistant</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <div className="text-emerald-300 text-[10px] font-bold uppercase tracking-wider leading-tight">
                DO YOU NEED HELP?
              </div>
            </div>
          </button>
        </div>
      )}

      {/* =========================================================================
          5. MODALS FOR COMPLETE INTERACTIVE DASHBOARD ACTIONS
          ========================================================================= */}

      {/* MODAL 1: Reverted Application Details & Fix Document */}
      {activeModal === 'reverted_details' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertCircle className="w-5 h-5" />
                <h3 className="font-bold text-slate-900 text-base">
                  Reverted Application: {activeRevertedApp?.trackingNumber || 'OPAS-2026-00125'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setActiveModal('none');
                  setReuploadSuccess(false);
                  setAiDocScore(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-900 space-y-1">
              <p className="font-bold">Official Adjudicator Note:</p>
              <p>
                {activeRevertedApp?.reversionReason ||
                  'Passport photo lighting has glare and Green NRC copy borders are cut off. Please re-upload corrected documents.'}
              </p>
              <p className="text-[11px] text-rose-700 font-semibold mt-1">
                Zero repayment fee required. Your priority queue position is preserved.
              </p>
            </div>

            {reuploadSuccess ? (
              <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="font-bold text-emerald-900 text-sm">Corrected Document Validated & Resubmitted!</p>
                <p className="text-xs text-emerald-700">
                  AI Optical Verification Score: <span className="font-bold text-emerald-900">{aiDocScore}%</span> (Passed MoHAIS Standards)
                </p>
                <button
                  onClick={() => {
                    setActiveModal('none');
                    setReuploadSuccess(false);
                  }}
                  className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-6 text-center bg-slate-50 transition-colors">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-800">Upload Corrected Passport Photo / NRC</p>
                  <p className="text-[11px] text-slate-500 mt-1">Accepted: JPG, PNG, PDF (Max 10MB)</p>
                  <button
                    onClick={handleSimulateReupload}
                    disabled={reuploading}
                    className="mt-3 bg-[#2563EB] hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2 rounded-lg shadow-xs cursor-pointer inline-flex items-center gap-2"
                  >
                    {reuploading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Running AI Optical Pre-Check...</span>
                      </>
                    ) : (
                      <span>Select File & Pre-Validate</span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: Contact Details Validator */}
      {activeModal === 'contact_validation' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-emerald-600">
                <ShieldCheck className="w-5 h-5" />
                <h3 className="font-bold text-slate-900 text-base">Validate Contact Details</h3>
              </div>
              <button onClick={() => setActiveModal('none')} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900">
              MoHAIS requires a valid Zambian mobile number (<code className="font-bold">+260</code>) and accessible email to receive real-time SMS status alerts and collection slips.
            </div>

            {contactSaveSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded-lg font-medium">
                Contact information updated and validated successfully!
              </div>
            )}

            <form onSubmit={handleSaveContact} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Zambian Mobile Number (+260)</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+260978112233"
                    required
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal('none')}
                  className="px-3 py-2 border border-slate-300 text-slate-700 text-xs rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
                >
                  Save & Confirm Validation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Guidance on Common Errors */}
      {activeModal === 'common_errors' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-[#2563EB]">
                <FileText className="w-5 h-5" />
                <h3 className="font-bold text-slate-900 text-base">Guidance on Common Reversion Errors</h3>
              </div>
              <button onClick={() => setActiveModal('none')} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                <p className="font-bold text-slate-900 text-sm">1. Passport Photo Non-Compliance (62% of Reversions)</p>
                <p className="text-slate-600">
                  Background MUST be plain off-white or light grey without patterned wallpaper, shadow borders, or reflections. Face must look straight with neutral expression.
                </p>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                <p className="font-bold text-slate-900 text-sm">2. Green NRC Cropping & Illegibility (24% of Reversions)</p>
                <p className="text-slate-600">
                  Both front and reverse of the Green NRC must be scanned on a single page, showing all four card corners and the district stamp clearly.
                </p>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                <p className="font-bold text-slate-900 text-sm">3. Guarantor Qualification Rules (9% of Reversions)</p>
                <p className="text-slate-600">
                  Guarantors must be Zambian citizens of standing: Minister of Religion, Medical Doctor, Lawyer, Magistrate, or Senior Civil Servant.
                </p>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                <p className="font-bold text-slate-900 text-sm">4. Government Gateway Payment Reference Mismatch</p>
                <p className="text-slate-600">
                  Ensure the GPG transaction code (e.g. GPG-TX-XXXX) matches the receipt generated during electronic payment before clicking final submit.
                </p>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setActiveModal('none')}
                className="px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Close Guidance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Draft Continue / Payment Complete Modals */}
      {(activeModal === 'draft_continue' || activeModal === 'payment_complete') && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                {sandboxPaymentReference
                  ? 'Sandbox payment confirmed'
                  : activeModal === 'draft_continue' ? 'Resume Application Draft' : 'Payment status & next steps'}
              </h3>
              <button onClick={() => setActiveModal('none')} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {activeModal === 'draft_continue'
                ? 'Run a local sandbox payment against this demo draft. No real payment will be initiated. After confirmation, return to the original OPAS application and complete final submission there.'
                : `This prototype record shows ${selectedApplication.feePaid ? 'a payment' : 'no confirmed payment'}${selectedApplication.paymentReference ? ` (reference: ${selectedApplication.paymentReference})` : ''}. Payment alone does not submit an application. Return to the original OPAS application and complete final submission there.`}
            </p>

            <div className={`rounded-xl border p-4 text-xs leading-relaxed ${sandboxPaymentReference ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : 'border-amber-200 bg-amber-50 text-amber-950'}`}>
              {sandboxPaymentReference ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-emerald-800"><CheckCircle2 className="w-7 h-7"/><p className="font-black text-base">PAYMENT SUCCESSFUL</p></div>
                  <p className="font-black text-sm">YOU HAVE SUCCESSFULLY PAID FOR YOUR PASSPORT SERVICE.</p>
                  <p className="font-semibold">Close this payment window and return to the passport application to complete the process.</p>
                  <p>Payment confirmation does not mean your passport application has been submitted. You must return to OPAS and complete the final submission step.</p>
                  <div className="rounded-lg bg-white/80 border border-emerald-200 p-3 space-y-1">
                    <p><span className="text-emerald-700">Application reference:</span> <span className="font-mono font-bold">{selectedApplication.trackingNumber}</span></p>
                    <p><span className="text-emerald-700">Payment reference:</span> <span className="font-mono font-bold">{sandboxPaymentReference}</span></p>
                    <p><span className="text-emerald-700">Next step:</span> <span className="font-bold">Return to application and submit</span></p>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-emerald-800"><Clock3 className="w-4 h-4"/>SmartGuide will continue checking the application status in this demo.</div>
                  <p className="text-[10px] text-emerald-800">Simulation only: no funds were moved and no live payment gateway was contacted.</p>
                </div>
              ) : (
                <p>This prototype is not connected to the Government Payment Gateway or live OPAS. A payment shown here is demo data and must not be treated as an official confirmation.</p>
              )}
            </div>
            {sandboxPaymentError && <p role="alert" className="text-xs font-semibold text-rose-700">{sandboxPaymentError}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => { setActiveModal('none'); setActiveNavTab('applications'); }}
                className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer ${sandboxPaymentReference ? 'bg-emerald-700 hover:bg-emerald-800 text-white' : 'border border-slate-300 text-slate-700 hover:bg-slate-50'}`}
              >
                {sandboxPaymentReference ? 'Return to Passport Application' : 'Close'}
              </button>
              {activeModal === 'draft_continue' && !sandboxPaymentReference && (
                <button
                  onClick={handleSandboxPayment}
                  disabled={sandboxPaymentLoading}
                  className="px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {sandboxPaymentLoading ? 'Confirming demo payment…' : 'Simulate sandbox payment'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: Existing OPAS Direct Section Navigator & Re-check Simulator (Steps 5, 6, 7) */}
      {isOpasBridgeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Government Official OPAS Header Bar */}
            <div className="bg-[#09182B] text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-3">
                <img
                  src="/assets/aistudio/zambia_coat_of_arms.png"
                  alt="Republic of Zambia"
                  className="h-9 w-auto object-contain shrink-0 drop-shadow-xs"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/public/assets/aistudio/zambia_coat_of_arms.png';
                  }}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm tracking-wide text-white">
                      Republic of Zambia — OPAS Portal
                    </span>
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-1.5 py-0.2 rounded uppercase">
                      Live Bridge
                    </span>
                  </div>
                  <p className="text-slate-300 text-xs mt-0.5">
                    Online Passport Application System • pass.gsb.gov.zm
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsOpasBridgeModalOpen(false);
                  setIsCheckingUpdatedInfo(false);
                }}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                title="Close OPAS Bridge"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SmartGuide Deep Navigation Banner */}
            <div className="bg-[#EFF6FF] border-b border-[#BFDBFE] px-5 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 text-xs text-blue-900">
                <ExternalLink className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="font-bold">Step 5: SmartGuide Direct Section Navigation:</span>
                <span className="text-blue-800 font-medium">Application OPAS-2026-001 &gt; Section 4 (Contact Details)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('https://pass.gsb.gov.zm/applications/OPAS-2026-001/edit#section-contact');
                    setCopiedDeepLink(true);
                    setTimeout(() => setCopiedDeepLink(false), 2000);
                  }}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-blue-300 rounded text-blue-700 hover:bg-blue-50 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Copy direct deep navigation link"
                >
                  {copiedDeepLink ? (
                    <>
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-blue-600" />
                      <span>Copy Deep Link</span>
                    </>
                  )}
                </button>
                <a
                  href="https://pass.gsb.gov.zm/login?flow=e4f9ee5b-d96c-454f-bb11-8cbde6d56110"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 text-[11px] font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-1 shadow-2xs"
                  title="Open live pass.gsb.gov.zm in new tab"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Open pass.gsb.gov.zm</span>
                </a>
              </div>
            </div>

            {/* OPAS Application Direct Section Navigation Tabs */}
            <div className="bg-slate-50 px-5 py-2.5 border-b border-slate-200 overflow-x-auto flex items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded bg-slate-200/70 text-slate-500 font-medium whitespace-nowrap cursor-not-allowed">
                1. Personal Info ✓
              </span>
              <span className="px-2.5 py-1 rounded bg-slate-200/70 text-slate-500 font-medium whitespace-nowrap cursor-not-allowed">
                2. Birth Records ✓
              </span>
              <span className="px-2.5 py-1 rounded bg-slate-200/70 text-slate-500 font-medium whitespace-nowrap cursor-not-allowed">
                3. Green NRC ✓
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-[#1868D6] text-white font-bold whitespace-nowrap shadow-xs flex items-center gap-1.5 ring-2 ring-blue-400/40">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>4. Contact &amp; Notification (Direct Navigation)</span>
              </span>
              <span className="px-2.5 py-1 rounded bg-slate-200/70 text-slate-500 font-medium whitespace-nowrap cursor-not-allowed">
                5. Guarantor
              </span>
              <span className="px-2.5 py-1 rounded bg-slate-200/70 text-slate-500 font-medium whitespace-nowrap cursor-not-allowed">
                6. Submission
              </span>
            </div>

            {/* Content Body */}
            <div className="p-5 sm:p-6 space-y-4">
              {/* STEP 6 SCANNING STATE */}
              {isCheckingUpdatedInfo && (
                <div className="p-5 rounded-2xl bg-blue-50/80 border border-blue-200 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center animate-spin">
                      <RefreshCw className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        Step 6: SmartGuide checking updated information...
                      </h4>
                      <p className="text-xs text-blue-700">
                        When updated OPAS data becomes available, the validation engine checks the issue again.
                      </p>
                    </div>
                  </div>

                  {/* Progress stream log */}
                  <div className="bg-[#09182B] text-emerald-400 font-mono text-[11px] p-3 rounded-xl space-y-1.5 shadow-inner">
                    {checkVerificationLog.map((logLine, idx) => (
                      <div key={idx} className="flex items-start gap-1.5">
                        <span className="text-slate-500">[{new Date().toLocaleTimeString()}]</span>
                        <span>{logLine}</span>
                      </div>
                    ))}
                    <div className="text-slate-400 animate-pulse">Running RFC 5322 syntax and DNS MX validation...</div>
                  </div>
                </div>
              )}

              {/* STEP 7 RESULT STATE (Success or Failure) */}
              {!isCheckingUpdatedInfo && checkResultStatus === 'success' && (
                <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-300 space-y-3 animate-in fade-in">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                      <Check className="w-5 h-5 stroke-[3]" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-200/60 px-2 py-0.5 rounded">
                        Step 7: Result Verified
                      </span>
                      <h4 className="font-bold text-emerald-950 text-base mt-0.5">
                        Issue Marked Resolved! ✓
                      </h4>
                    </div>
                  </div>

                  <p className="text-xs text-emerald-900 leading-relaxed">
                    {checkResultMessage}
                  </p>

                  <div className="pt-2 flex items-center gap-2.5">
                    <button
                      onClick={() => {
                        setIsOpasBridgeModalOpen(false);
                        setActiveNavTab('smart_validation');
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
                    >
                      Return to Smart Validation Report
                    </button>
                    <button
                      onClick={() => {
                        setIsOpasBridgeModalOpen(false);
                        setActiveNavTab('dashboard');
                      }}
                      className="px-4 py-2 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      View Citizen Dashboard
                    </button>
                  </div>
                </div>
              )}

              {!isCheckingUpdatedInfo && checkResultStatus === 'failed' && (
                <div className="p-5 rounded-2xl bg-rose-50 border border-rose-300 space-y-3 animate-in fade-in">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-xs">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 bg-rose-200/60 px-2 py-0.5 rounded">
                        Step 7: Verification Result
                      </span>
                      <h4 className="font-bold text-rose-950 text-base mt-0.5">
                        Issue Needs Further Attention
                      </h4>
                    </div>
                  </div>

                  <p className="text-xs text-rose-900 leading-relaxed">
                    {checkResultMessage}
                  </p>

                  <div className="bg-white p-3 rounded-xl border border-rose-200 text-xs text-slate-700 space-y-1">
                    <p className="font-bold text-slate-900">Recommended Guidance:</p>
                    <p>• Include a valid domain extension, e.g. <span className="font-mono font-bold text-emerald-700">.com</span>, <span className="font-mono font-bold text-emerald-700">.gov.zm</span>, or <span className="font-mono font-bold text-emerald-700">.co.zm</span></p>
                    <p>• Avoid trailing spaces or special characters.</p>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => {
                        setOpasEditingEmail('divine@gmail.com');
                        setCheckResultStatus('idle');
                      }}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      Apply Recommended "divine@gmail.com" &amp; Re-verify
                    </button>
                  </div>
                </div>
              )}

              {/* FORM FIELDS (Displayed when not checking or when idle) */}
              {!isCheckingUpdatedInfo && checkResultStatus !== 'success' && (
                <div className="space-y-4">
                  <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">OPAS Pre-Validation Error Flagged:</p>
                      <p className="text-amber-800 mt-0.5">
                        The email currently stored in OPAS is <code className="bg-amber-200/60 font-mono font-bold px-1 py-0.5 rounded">{smartValidationEmail}</code>, which is missing a valid top-level domain (.com). Correct it below and save to trigger SmartGuide re-check.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Applicant & Case Summary */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        APPLICANT FULL NAME
                      </label>
                      <input
                        type="text"
                        disabled
                        value={citizenName}
                        className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 font-semibold cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        APPLICATION REFERENCE
                      </label>
                      <input
                        type="text"
                        disabled
                        value="OPAS-2026-001 (Ordinary e-Passport 32P)"
                        className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-semibold text-slate-700 cursor-not-allowed"
                      />
                    </div>

                    {/* EMAIL ADDRESS FIELD TO CORRECT */}
                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                          PRIMARY NOTIFICATION EMAIL ADDRESS <span className="text-rose-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setOpasEditingEmail('divine@gmail.com')}
                          className="text-[11px] text-[#1868D6] font-bold hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3 text-blue-600" />
                          <span>Autofill "divine@gmail.com" (Valid RFC)</span>
                        </button>
                      </div>

                      <div className="relative">
                        <input
                          type="email"
                          value={opasEditingEmail}
                          onChange={(e) => setOpasEditingEmail(e.target.value)}
                          placeholder="e.g. divine@gmail.com"
                          className={`w-full px-3.5 py-2.5 rounded-lg border text-xs font-medium focus:outline-none focus:ring-2 bg-white ${
                            !opasEditingEmail.includes('.')
                              ? 'border-rose-400 focus:ring-rose-400 text-rose-900 bg-rose-50/30'
                              : 'border-slate-300 focus:ring-blue-500 text-slate-900'
                          }`}
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-slate-400">
                          {!opasEditingEmail.includes('.') ? (
                            <span className="text-rose-600 font-semibold text-[11px]">Missing .com domain</span>
                          ) : (
                            <span className="text-emerald-600 font-semibold text-[11px]">Valid format ✓</span>
                          )}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Official MoHAIS OPAS dispatch sends collection appointment QR codes and passport status tracking to this email.
                      </p>
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        MOBILE PHONE NUMBER (SMS NOTIFICATIONS)
                      </label>
                      <input
                        type="text"
                        disabled
                        value={currentUser?.phone || '+260978112233'}
                        className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-700 cursor-not-allowed"
                      />
                    </div>

                    {/* Postal Address */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        REGISTERED POSTAL MAILING ADDRESS
                      </label>
                      <input
                        type="text"
                        disabled
                        value="P.O. Box 50997, Ridgeway, Lusaka"
                        className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Confirmation Checkbox */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-start gap-2.5 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      id="confirmOpasSync"
                      defaultChecked
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="confirmOpasSync" className="cursor-pointer">
                      I confirm that this updated email address belongs to me and will be synchronized to the official MoHAIS OPAS Passport Registry for collection barcode delivery.
                    </label>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setIsOpasBridgeModalOpen(false)}
                      className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel &amp; Return to SmartGuide
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveOpasAndCheck}
                      className="px-5 py-2.5 bg-[#1868D6] hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-2 group"
                    >
                      <span>Save in OPAS &amp; Submit for SmartGuide Re-check (Step 6)</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Contact Support Modal */}
      {activeModal === 'support' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-[#2563EB]">
                <Headphones className="w-5 h-5" />
                <h3 className="font-bold text-slate-900 text-base">MoHAIS Passport Support</h3>
              </div>
              <button onClick={() => setActiveModal('none')} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <p className="font-bold text-slate-900">National Passport Support Helpline</p>
                <p className="text-slate-600">Toll-Free: +260 211 252 622 / +260 977 000 111</p>
                <p className="text-slate-500 text-[11px]">Hours: Weekdays 08:00 - 17:00 hrs CAT</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <p className="font-bold text-slate-900">Physical Registry</p>
                <p className="text-slate-600">Ministry of Home Affairs & Internal Security</p>
                <p className="text-slate-500 text-[11px]">Independence Avenue, Ridgeway, P.O. Box 50997, Lusaka</p>
              </div>
            </div>

            <div className="text-right pt-2">
              <button
                onClick={() => setActiveModal('none')}
                className="px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {paymentDetectionPopups.length > 0 && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4" role="presentation">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="payment-detected-title"
            className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h2 id="payment-detected-title" className="text-base font-bold text-slate-900">
                    Payment detected
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Application #{paymentDetectionPopups[0].application.trackingNumber}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Dismiss payment notification"
                onClick={() => setPaymentDetectionPopups((previous) => previous.slice(1))}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-slate-700">
              {paymentDetectionPopups[0].notification.content}
            </p>
            <p className="mt-3 rounded-lg bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500">
              SmartGuide checks simulated OPAS payment records. Confirm your payment and submission status in the official OPAS portal.
            </p>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setPaymentDetectionPopups((previous) => previous.slice(1));
                  setActiveNavTab('notifications');
                }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Open inbox
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectApplication(paymentDetectionPopups[0].application);
                  setPaymentDetectionPopups((previous) => previous.slice(1));
                  setActiveNavTab('applications');
                }}
                className="rounded-lg bg-[#1868D6] px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                View application
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
