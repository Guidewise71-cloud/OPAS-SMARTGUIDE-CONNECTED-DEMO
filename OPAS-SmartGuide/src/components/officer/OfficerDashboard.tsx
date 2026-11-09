import React, { useState, useMemo, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import {
  Users,
  AlertCircle,
  Clock,
  CheckCircle,
  FileWarning,
  Send,
  Search,
  Filter,
  Sparkles,
  ArrowUpRight,
  ArrowRight,
  LogOut,
  TrendingDown,
  TrendingUp,
  BarChart,
  BarChart2,
  Calendar,
  Layers,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  X,
  Activity,
  Download,
  MapPin,
  SlidersHorizontal,
  DollarSign,
  FileSpreadsheet,
  PieChart as PieChartIcon,
  LayoutGrid,
  FileText,
  UserCheck,
  Headphones,
  GitBranch,
  MessageSquare,
  Tags,
  Plus,
  Minus,
  ChevronDown,
  CheckSquare,
  Square,
  Bell,
  Mail,
  Check,
  CreditCard,
} from 'lucide-react';
import { PassportApplication, NotificationLog } from '../../types/passport';
import { CaseTriageModal } from './CaseTriageModal';
import { PaymentSubmissionMonitor } from './PaymentSubmissionMonitor';
import { OperationsInsights } from './OperationsInsights';
import { isApplicationSubmitted } from '../../utils/applicationStatus';
import { PilotEvaluationReport } from './PilotEvaluationReport';
import { ActionQueueTab } from './ActionQueueTab';
import { ExecutiveReportModal } from './ExecutiveReportModal';
import { calculateActionQueueSummary, buildActionQueue } from '../../utils/actionQueue';
import { detectReminderCandidates } from '../../utils/reminderRules';
import { validatePhoneNumber, validateEmail } from '../../utils/validation';
import { PillarsModule } from '../common/PillarsModule';
import { ResponsibleAIModule } from './ResponsibleAIModule';
import {
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart as RechartsBarChart,
  Bar,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

interface OfficerDashboardProps {
  applications: PassportApplication[];
  onUpdateStatus: (id: string, newStatus: PassportApplication['status'], notes?: string) => void;
  onAddNotification: (id: string, notif: NotificationLog) => void;
  onUpdateNotificationDelivery: (
    applicationId: string,
    notificationId: string,
    deliveryStatus: NotificationLog['deliveryStatus'],
    failureReason?: string
  ) => void;
  onSelectApplication: (app: PassportApplication) => void;
  selectedAppForCitizenView?: PassportApplication;
  onOpenAssistant?: () => void;
  onLogout?: () => void;
}

// Circular Radial Gauge Component with reduced contrast & enlarged readable font
const RadialGauge: React.FC<{
  percentage: number;
  trend?: string;
  color: string;
  size?: number;
}> = ({ percentage, trend = '+7%', color, size = 96 }) => {
  const strokeWidth = 8;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (circumference * Math.min(100, Math.max(0, percentage))) / 100;

  return (
    <div
      className="relative flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Softer Track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#2d3b50"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle with soft accent */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-xl sm:text-2xl font-bold text-slate-100 font-mono leading-none">
          {percentage}%
        </span>
        {trend && (
          <span
            className="text-xs font-semibold font-mono mt-1 tracking-tight"
            style={{ color }}
          >
            {trend}
          </span>
        )}
      </div>
    </div>
  );
};

export const OfficerDashboard: React.FC<OfficerDashboardProps> = ({
  applications,
  onUpdateStatus,
  onAddNotification,
  onUpdateNotificationDelivery,
  onSelectApplication,
  onOpenAssistant,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'action-queue' | 'responsible-ai' | 'pillars' | 'registry' | 'evaluation' | 'payment-monitor' | 'operations'
  >('overview');
  const { setCurrentSection } = useChat();

  // BI Executive Slicers State
  const [dateRange, setDateRange] = useState<'7D' | '30D' | 'Q3_2026' | 'YTD_2026' | 'ALL'>('30D');
  const [selectedStation, setSelectedStation] = useState<string>('ALL');
  const [detailTableFilter, setDetailTableFilter] = useState<string>('All');
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({
    ucc_sales: true,
  });

  useEffect(() => {
    const tabMap: Record<string, string> = {
      overview: 'Officer Dashboard - Executive BI Interface',
      'action-queue': 'Officer Dashboard - Action Queue',
      'responsible-ai': 'Officer Dashboard - Responsible AI & Workflow Automation',
      registry: 'Officer Dashboard - Case Registry',
      evaluation: 'Officer Dashboard - Pilot Evaluation',
      pillars: 'Officer Dashboard - Smart Features',
      'payment-monitor': 'Officer Dashboard - Payment-to-Submission Monitor',
      operations: 'Officer Dashboard - Operational Intelligence and Officer Workload',
    };
    setCurrentSection(tabMap[activeTab] || 'Officer Dashboard');
  }, [activeTab, setCurrentSection]);

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCaseForModal, setSelectedCaseForModal] = useState<PassportApplication | null>(null);
  const [isExecutiveReportOpen, setIsExecutiveReportOpen] = useState(false);
  const [batchReminderSent, setBatchReminderSent] = useState(false);
  const detectedReminderCandidates = useMemo(() => detectReminderCandidates(applications), [applications]);
  const paidNotSubmittedCount = useMemo(
    () => applications.filter((application) => application.feePaid && !isApplicationSubmitted(application)).length,
    [applications]
  );

  // Bulk-Action state for Application List
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);
  const [bulkChannel, setBulkChannel] = useState<'SMS' | 'Email' | 'OPAS Message Board'>('SMS');
  const [isBulkNotifying, setIsBulkNotifying] = useState(false);
  const [bulkNotifyFeedback, setBulkNotifyFeedback] = useState<{
    message: string;
    count: number;
    channel: string;
  } | null>(null);
  const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);
  const [customMessageTemplate, setCustomMessageTemplate] = useState(
    'MoHAIS OPAS Official Notice: Action is required on your pending passport application. Please log in to your OPAS citizen portal immediately to upload outstanding or corrected civil documents (e.g., photo, NRC copy, or certified guarantor endorsement) to proceed with vetting.'
  );

  // Helper to determine if an application is in a pending state or requires document action
  const isPendingApp = (app: PassportApplication) => {
    return (
      app.status === 'Submitted - Under Review' ||
      app.status === 'Paid - Unsubmitted' ||
      app.status === 'Reverted' ||
      app.status === 'Draft' ||
      app.documents.some((d) => d.status === 'PENDING' || d.status === 'REJECTED')
    );
  };

  // Compute Live Metrics from applications
  const metrics = useMemo(() => {
    const total = applications.length;
    const reverted = applications.filter((a) => a.status === 'Reverted');
    const paidUnsubmitted = applications.filter((a) => a.status === 'Paid - Unsubmitted');
    const underReview = applications.filter((a) => a.status === 'Submitted - Under Review');
    const biometrics = applications.filter((a) => a.status === 'Biometrics Scheduled');
    const ready = applications.filter((a) => a.status === 'Ready for Collection');

    const invalidContactCount = applications.filter((a) => {
      const p = validatePhoneNumber(a.contact.phone, a.contact.phoneCountryCode);
      const e = validateEmail(a.contact.email);
      return !p.isValid || p.warning || !e.isValid || e.warning;
    }).length;

    const feeHeld = paidUnsubmitted.reduce((acc, curr) => acc + (curr.feeAmount || 500), 0);

    return {
      total,
      revertedCount: reverted.length,
      paidUnsubmittedCount: paidUnsubmitted.length,
      underReviewCount: underReview.length,
      biometricsCount: biometrics.length,
      readyCount: ready.length,
      invalidContactCount,
      feeHeld,
    };
  }, [applications]);

  // Action Queue summary
  const actionSummary = useMemo(() => calculateActionQueueSummary(applications), [applications]);
  const actionQueueItems = useMemo(() => buildActionQueue(applications), [applications]);

  // Workload Velocity Trend Series (Area Chart with Glowing Cyan Line)
  const agentWorkloadData = useMemo(() => {
    return [
      { day: 'May 1', workload: 68, target: 55 },
      { day: 'May 2', workload: 71, target: 55 },
      { day: 'May 3', workload: 59, target: 55 },
      { day: 'May 4', workload: 67, target: 55 },
      { day: 'May 5', workload: 63, target: 55 },
      { day: 'May 6', workload: 82, target: 55 },
      { day: 'May 7', workload: 76, target: 55 },
    ];
  }, []);

  // Status Time in hours Grouped Bar Chart Data (5 columns per day)
  const statusTimeBarData = useMemo(() => {
    return [
      { day: 'May 1', available: 26, inCall: 31, away: 18, dnd: 7, busy: 18 },
      { day: 'May 2', available: 42, inCall: 32, away: 12, dnd: 8, busy: 7 },
      { day: 'May 3', available: 45, inCall: 31, away: 38, dnd: 8, busy: 13 },
      { day: 'May 4', available: 43, inCall: 19, away: 24, dnd: 8, busy: 17 },
      { day: 'May 5', available: 26, inCall: 39, away: 24, dnd: 6, busy: 7 },
      { day: 'May 6', available: 20, inCall: 31, away: 41, dnd: 5, busy: 6 },
      { day: 'May 7', available: 26, inCall: 43, away: 23, dnd: 6, busy: 8 },
    ];
  }, []);

  // Status Detail Matrix Rows matching BI template
  const statusDetailRows = useMemo(() => {
    return [
      {
        key: 'ucc_sales',
        name: 'ucc_sales',
        stationLabel: 'Lusaka HQ - Intake & Vetting',
        available: { time: '00:01:27', pct: 38 },
        inCall: { time: '00:01:27', pct: 38 },
        away: { time: '00:01:27', pct: 38 },
        dnd: { time: '00:01:27', pct: 38 },
        busy: { time: '00:01:27', pct: 38 },
        reasonCode: { time: '00:01:27', pct: 38 },
        cases: applications.filter(
          (a) => a.collectionOffice.includes('Lusaka') || a.status === 'Submitted - Under Review'
        ),
      },
      {
        key: 'ucc_marketing',
        name: 'ucc_marketing',
        stationLabel: 'Ndola Regional - Biometrics Capture',
        available: { time: '00:01:27', pct: 45 },
        inCall: { time: '00:01:27', pct: 45 },
        away: { time: '00:01:27', pct: 45 },
        dnd: { time: '00:01:27', pct: 45 },
        busy: { time: '00:01:27', pct: 45 },
        reasonCode: { time: '00:01:27', pct: 45 },
        cases: applications.filter(
          (a) => a.collectionOffice.includes('Ndola') || a.status === 'Biometrics Scheduled'
        ),
      },
      {
        key: 'ucc_backoffice',
        name: 'ucc_backoffice',
        stationLabel: 'Kitwe Centre - Remediation & Review',
        available: { time: '00:01:27', pct: 51 },
        inCall: { time: '00:01:27', pct: 51 },
        away: { time: '00:01:27', pct: 51 },
        dnd: { time: '00:01:27', pct: 51 },
        busy: { time: '00:01:27', pct: 51 },
        reasonCode: { time: '00:01:27', pct: 51 },
        cases: applications.filter((a) => a.status === 'Reverted'),
      },
      {
        key: 'ucc_production',
        name: 'ucc_production',
        stationLabel: 'Livingstone Station - Booklet Personalization',
        available: { time: '00:01:27', pct: 38 },
        inCall: { time: '00:01:27', pct: 38 },
        away: { time: '00:01:27', pct: 38 },
        dnd: { time: '00:01:27', pct: 38 },
        busy: { time: '00:01:27', pct: 38 },
        reasonCode: { time: '00:01:27', pct: 38 },
        cases: applications.filter(
          (a) => a.collectionOffice.includes('Livingstone') || a.status === 'Paid - Unsubmitted'
        ),
      },
      {
        key: 'ucc_support',
        name: 'ucc_support',
        stationLabel: 'Solwezi Centre - Counter Dispatch',
        available: { time: '00:01:27', pct: 45 },
        inCall: { time: '00:01:27', pct: 45 },
        away: { time: '00:01:27', pct: 45 },
        dnd: { time: '00:01:27', pct: 45 },
        busy: { time: '00:01:27', pct: 45 },
        reasonCode: { time: '00:01:27', pct: 45 },
        cases: applications.filter((a) => a.status === 'Ready for Collection'),
      },
      {
        key: 'ucc_purchasing',
        name: 'ucc_purchasing',
        stationLabel: 'Chipata Office - Security Stationery',
        available: { time: '00:01:27', pct: 51 },
        inCall: { time: '00:01:27', pct: 51 },
        away: { time: '00:01:27', pct: 51 },
        dnd: { time: '00:01:27', pct: 51 },
        busy: { time: '00:01:27', pct: 51 },
        reasonCode: { time: '00:01:27', pct: 51 },
        cases: applications.filter((a) => a.collectionOffice.includes('Chipata')),
      },
    ];
  }, [applications]);

  const toggleRow = (key: string) => {
    setExpandedRows((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Filtered applications for Registry and search
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'PENDING' && isPendingApp(app)) ||
        (statusFilter === 'REVERTED' && app.status === 'Reverted') ||
        (statusFilter === 'PAID_UNSUBMITTED' && app.status === 'Paid - Unsubmitted') ||
        (statusFilter === 'REVIEW' && app.status === 'Submitted - Under Review') ||
        (statusFilter === 'BIOMETRICS' && app.status === 'Biometrics Scheduled') ||
        (statusFilter === 'READY' && app.status === 'Ready for Collection');

      const matchesStation =
        selectedStation === 'ALL' ||
        app.collectionOffice.toLowerCase().includes(selectedStation.toLowerCase());

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === '' ||
        app.fullName.toLowerCase().includes(q) ||
        app.trackingNumber.toLowerCase().includes(q) ||
        app.nrcNumber.toLowerCase().includes(q) ||
        app.contact.phone.includes(q) ||
        app.contact.email.toLowerCase().includes(q);

      return matchesStatus && matchesStation && matchesSearch;
    });
  }, [applications, statusFilter, selectedStation, searchQuery]);

  // Pending application groups for bulk notification
  const pendingFilteredApplications = useMemo(() => {
    return filteredApplications.filter(isPendingApp);
  }, [filteredApplications]);

  const pendingTotalApplications = useMemo(() => {
    return applications.filter(isPendingApp);
  }, [applications]);

  const areAllVisiblePendingSelected = useMemo(() => {
    if (pendingFilteredApplications.length === 0) return false;
    return pendingFilteredApplications.every((a) => selectedAppIds.includes(a.id));
  }, [pendingFilteredApplications, selectedAppIds]);

  const isPartiallySelected = useMemo(() => {
    if (areAllVisiblePendingSelected) return false;
    return pendingFilteredApplications.some((a) => selectedAppIds.includes(a.id));
  }, [pendingFilteredApplications, selectedAppIds, areAllVisiblePendingSelected]);

  // Bulk Selection Handlers
  const handleToggleAppSelection = (id: string) => {
    setSelectedAppIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllPendingVisible = () => {
    const visiblePendingIds = pendingFilteredApplications.map((a) => a.id);
    setSelectedAppIds((prev) => Array.from(new Set([...prev, ...visiblePendingIds])));
  };

  const handleSelectAllPendingTotal = () => {
    const totalPendingIds = pendingTotalApplications.map((a) => a.id);
    setSelectedAppIds((prev) => Array.from(new Set([...prev, ...totalPendingIds])));
  };

  const handleClearSelection = () => {
    setSelectedAppIds([]);
  };

  // Bulk Notify Action Handler
  const handleBulkNotify = async () => {
    if (selectedAppIds.length === 0) return;
    setIsBulkNotifying(true);

    // Realistic processing pause
    await new Promise((resolve) => setTimeout(resolve, 550));

    let dispatchedCount = 0;
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    selectedAppIds.forEach((id) => {
      const app = applications.find((a) => a.id === id);
      if (!app) return;

      const pendingDocs = app.documents.filter(
        (d) => d.status === 'PENDING' || d.status === 'REJECTED'
      );
      const detailInfo =
        pendingDocs.length > 0
          ? `Pending document items: ${pendingDocs.map((d) => d.type).join(', ')}.`
          : app.status === 'Reverted' && app.reversionReason
          ? `Reversion notice: ${app.reversionReason}.`
          : app.status === 'Paid - Unsubmitted'
          ? 'Payment recorded; biometric booking and document intake pending.'
          : 'Pending verification and document intake.';

      const content = `${customMessageTemplate} [Ref: ${app.trackingNumber} | Applicant: ${app.fullName} | ${detailInfo}]`;

      const notification: NotificationLog = {
        id: `notif-bulk-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: nowTime,
        channel: bulkChannel,
        subject: 'MoHAIS OPAS Official Notice: Outstanding Documents Required',
        content,
        deliveryStatus: 'Sent',
        trigger: 'BULK_REMINDER',
      };

      onAddNotification(app.id, notification);
      dispatchedCount++;
    });

    setIsBulkNotifying(false);
    setBulkNotifyFeedback({
      message: `Standard document-reminder notifications successfully dispatched to ${dispatchedCount} applicant(s) via ${bulkChannel}. Delivery receipts logged.`,
      count: dispatchedCount,
      channel: bulkChannel,
    });
    setSelectedAppIds([]);
  };

  // Client-side BI CSV Dataset Export
  const handleExportBICSV = () => {
    const headers = [
      'Tracking Number',
      'Applicant Full Name',
      'NRC Number',
      'Passport Type',
      'Service Speed',
      'Status',
      'Days In Status',
      'Collection Office',
      'Province',
      'Phone',
      'Email',
      'Fee Amount (ZMW)',
      'Fee Paid',
      'Express Urgent',
      'Reversion Reason',
    ];
    const rows = filteredApplications.map((app) => [
      app.trackingNumber,
      `"${(app.fullName || '').replace(/"/g, '""')}"`,
      app.nrcNumber,
      `"${app.passportType}"`,
      `"${app.serviceSpeed}"`,
      `"${app.status}"`,
      app.daysInStatus,
      `"${app.collectionOffice}"`,
      `"${app.contact.province || ''}"`,
      `"${app.contact.phone}"`,
      `"${app.contact.email}"`,
      app.feeAmount || 500,
      app.feePaid ? 'TRUE' : 'FALSE',
      app.isUrgent ? 'TRUE' : 'FALSE',
      `"${(app.reversionReason || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `MoHAIS_OPAS_BI_Telemetry_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Batch trigger automated reminders for aged cases
  const handleBatchTriggerReminders = () => {
    detectedReminderCandidates.forEach(({ application: app, channel, reason }) => {
        const notif: NotificationLog = {
          id: `batch-${Date.now()}-${app.id}`,
          timestamp: new Date().toISOString(),
          channel,
          subject: 'MoHAIS OPAS Scheduled Automated Notice',
          content:
            app.status === 'Reverted'
              ? `MoHAIS OPAS: Dear ${app.fullName}, your passport application #${app.trackingNumber} requires document correction to resume processing. Log into opas.mohais.gov.zm`
              : `MoHAIS OPAS: Dear ${app.fullName}, we received your payment for #${app.trackingNumber}. Please complete final submission & schedule biometrics.`,
          deliveryStatus: 'Delivered',
          trigger: 'AUTOMATED_WORKFLOW',
          auditTrail: [{
            id: `detected-${Date.now()}-${app.id}`,
            timestamp: new Date().toISOString(),
            event: 'CREATED',
            actor: 'OPAS Reminder Detection Engine',
            details: reason,
          }],
        };
        onAddNotification(app.id, notif);
    });
    setBatchReminderSent(true);
    setTimeout(() => setBatchReminderSent(false), 4000);
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 sm:gap-6 bg-[#18202c] text-slate-200 min-h-[960px] p-3 sm:p-5 rounded-3xl font-sans">
      {/* ============================================================ */}
      {/* 1. LEFT NAVIGATION RAIL (Calm Naval Slate #223956) */}
      {/* ============================================================ */}
      <aside className="w-full md:w-24 lg:w-28 shrink-0 bg-[#223956] border border-[#334e73] rounded-2xl md:rounded-3xl flex md:flex-col items-center justify-between md:justify-start py-5 px-3 md:px-2 text-slate-200 shadow-lg space-y-0 md:space-y-6">
        {/* 4-Tile Geometric Logo Block at Top */}
        <div className="flex items-center md:flex-col gap-2">
          <div className="w-10 h-10 grid grid-cols-2 gap-1 p-0.5 bg-black/20 rounded-xl shadow-inner">
            <div className="bg-[#fb923c] rounded-xs" />
            <div className="bg-[#38bdf8] rounded-xs" />
            <div className="bg-[#f59e0b] rounded-xs" />
            <div className="bg-[#34d399] rounded-xs" />
          </div>
        </div>

        {/* Vertical Navigation Items with larger, legible labels */}
        <nav className="flex md:flex-col items-center gap-1.5 md:gap-3 text-slate-200 overflow-x-auto md:overflow-visible w-full px-1">
          {/* Item 1: Status Overview (Executive BI Interface) */}
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-xl transition-all cursor-pointer w-full text-center ${
              activeTab === 'overview'
                ? 'bg-[#182b42] text-white shadow-md border border-white/15'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title="Status Overview (Executive BI)"
          >
            <LayoutGrid className="w-5 h-5 sm:w-6 sm:h-6 mb-1" />
            <span className="text-xs sm:text-sm font-bold leading-tight tracking-normal">
              Status<br />Overview
            </span>
          </button>

          {/* Item 2: Action Queue */}
          <button
            onClick={() => setActiveTab('action-queue')}
            className={`flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-xl transition-all cursor-pointer w-full text-center relative ${
              activeTab === 'action-queue'
                ? 'bg-[#182b42] text-white shadow-md border border-white/15'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title="Action Queue"
          >
            <div className="relative">
              <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 mb-1" />
              {actionSummary.totalNeedingAttention > 0 && (
                <span className="absolute -top-1 -right-2 bg-[#f87171] text-slate-950 text-xs font-black rounded-full px-1.5 py-0.2 shadow-xs">
                  {actionSummary.totalNeedingAttention}
                </span>
              )}
            </div>
            <span className="text-xs sm:text-sm font-bold leading-tight tracking-normal">
              Action<br />Queue
            </span>
          </button>

          <button
            onClick={() => setActiveTab('payment-monitor')}
            className={`flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-xl transition-all cursor-pointer w-full text-center relative ${
              activeTab === 'payment-monitor'
                ? 'bg-[#182b42] text-white shadow-md border border-white/15'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title="Payment-to-Submission Monitor"
          >
            <div className="relative">
              <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 mb-1" />
              {paidNotSubmittedCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-xs font-black rounded-full px-1.5 py-0.2 shadow-xs">
                  {paidNotSubmittedCount}
                </span>
              )}
            </div>
            <span className="text-xs sm:text-sm font-bold leading-tight tracking-normal">
              Payment<br />Monitor
            </span>
          </button>

          {/* Item 3: Responsible AI & Workflow Controls */}
          <button
            onClick={() => setActiveTab('operations')}
            className={`flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-xl transition-all cursor-pointer w-full text-center ${activeTab === 'operations' ? 'bg-[#182b42] text-white shadow-md border border-white/15' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
            title="Operational Reports and Officer Workload"
          >
            <BarChart2 className="w-5 h-5 sm:w-6 sm:h-6 mb-1" />
            <span className="text-xs sm:text-sm font-bold leading-tight">Reports &amp;<br />Workload</span>
          </button>

          <button
            onClick={() => setActiveTab('responsible-ai')}
            className={`flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-xl transition-all cursor-pointer w-full text-center relative ${
              activeTab === 'responsible-ai'
                ? 'bg-[#182b42] text-white shadow-md border border-white/15'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title="Responsible AI Controls & Workflow Automation"
          >
            <div className="relative">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 mb-1 text-emerald-400" />
              <span className="absolute -top-1 -right-2 bg-emerald-500 text-slate-950 text-[10px] font-black rounded-full px-1 py-0.2 shadow-xs">
                AI
              </span>
            </div>
            <span className="text-xs sm:text-sm font-bold leading-tight tracking-normal">
              Responsible<br />AI
            </span>
          </button>

          {/* Item 4: Application Registry */}
          <button
            onClick={() => setActiveTab('registry')}
            className={`flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-xl transition-all cursor-pointer w-full text-center ${
              activeTab === 'registry'
                ? 'bg-[#182b42] text-white shadow-md border border-white/15'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title="Case Registry"
          >
            <FileText className="w-5 h-5 sm:w-6 sm:h-6 mb-1" />
            <span className="text-xs sm:text-sm font-bold leading-tight tracking-normal">
              Case<br />Registry
            </span>
          </button>

          {/* Item 4: Smart Pillars */}
          <button
            onClick={() => setActiveTab('pillars')}
            className={`flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-xl transition-all cursor-pointer w-full text-center ${
              activeTab === 'pillars'
                ? 'bg-[#182b42] text-white shadow-md border border-white/15'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title="Smart Service Pillars"
          >
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 mb-1" />
            <span className="text-xs sm:text-sm font-bold leading-tight tracking-normal">
              Smart<br />Pillars
            </span>
          </button>

          {/* Item 5: Pilot SLA Evaluation */}
          <button
            onClick={() => setActiveTab('evaluation')}
            className={`flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-xl transition-all cursor-pointer w-full text-center ${
              activeTab === 'evaluation'
                ? 'bg-[#182b42] text-white shadow-md border border-white/15'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title="Pilot SLA Evaluation"
          >
            <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 mb-1" />
            <span className="text-xs sm:text-sm font-bold leading-tight tracking-normal">
              Pilot<br />SLA
            </span>
          </button>
        </nav>

        {/* Navigation bottom actions: Return to Overview & Log Out */}
        {/* Navigation bottom actions: Prominent Log Out */}
        <div className="flex md:flex-col items-center gap-2 pt-2 md:pt-4 border-t border-[#334e73] w-full px-1">
          {onLogout && (
            <button
              onClick={onLogout}
              className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-xl transition-all cursor-pointer w-full text-center bg-red-500/20 hover:bg-red-500/35 text-red-200 hover:text-white border border-red-500/40 shadow-xs"
              title="Sign Out of OPAS and return to Login Portal"
            >
              <LogOut className="w-5 h-5 sm:w-6 sm:h-6 mb-1 text-red-400" />
              <span className="text-xs sm:text-sm font-bold leading-tight">
                Log<br />Out
              </span>
            </button>
          )}

          <div className="hidden md:flex flex-col items-center pt-1 text-slate-400">
            <div className="w-2.5 h-2.5 rounded-full bg-[#34d399] animate-pulse" />
            <span className="text-xs font-mono mt-0.5 font-semibold">v3.2</span>
          </div>
        </div>
      </aside>

      {/* ============================================================ */}
      {/* 2. MAIN CONTENT AREA (Soft Low-Contrast Slate #18202c) */}
      {/* ============================================================ */}
      <div className="flex-1 space-y-5 min-w-0">
        {/* Header Bar matching BI Template with enlarged readable fonts */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#2d3a4f]">
          <div className="flex flex-wrap items-center gap-3">

            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
                {activeTab === 'overview'
                  ? 'Status Overview'
                  : activeTab === 'action-queue'
                  ? 'Action Queue'
                  : activeTab === 'responsible-ai'
                  ? 'Responsible AI & Workflow Automation'
                  : activeTab === 'registry'
                  ? 'Case Registry'
                  : activeTab === 'payment-monitor'
                  ? 'Payment-to-Submission Monitor'
                  : activeTab === 'operations'
                  ? 'Operational Intelligence & Officer Workload'
                  : activeTab === 'pillars'
                  ? 'Smart Pillars'
                  : 'Pilot SLA Evaluation'}
              </h1>
              <p className="text-sm sm:text-base text-slate-300 mt-1">
                {activeTab === 'payment-monitor'
                  ? 'Officer monitoring for payment follow-up and submission status'
                  : 'MoHAIS OPAS Real-time Queue Intelligence &amp; Workload Distribution'}
              </p>
            </div>
          </div>

          {/* Interactive Controls & Slicers Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5 text-sm">
            {/* Timeframe Slicer Pills */}
            <div className="flex items-center bg-[#20293a] border border-[#33425a] p-1 rounded-xl">
              {[
                { id: '7D', label: '7D' },
                { id: '30D', label: '30D' },
                { id: 'Q3_2026', label: 'Q3' },
                { id: 'YTD_2026', label: 'YTD' },
                { id: 'ALL', label: 'All' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setDateRange(t.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors cursor-pointer ${
                    dateRange === t.id
                      ? 'bg-[#2f5582] text-white shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Station Dropdown */}
            <select
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
              className="bg-[#20293a] border border-[#33425a] text-slate-200 text-sm font-semibold rounded-xl py-2 px-3.5 focus:outline-hidden focus:border-[#4d6b94] cursor-pointer"
            >
              <option value="ALL">All Stations (National)</option>
              <option value="Lusaka">Lusaka HQ</option>
              <option value="Ndola">Ndola Regional</option>
              <option value="Kitwe">Kitwe Centre</option>
              <option value="Livingstone">Livingstone Station</option>
              <option value="Solwezi">Solwezi Centre</option>
              <option value="Chipata">Chipata Office</option>
            </select>

            {/* Export Dataset Button */}
            <button
              onClick={handleExportBICSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#20293a] hover:bg-[#28354b] text-slate-200 border border-[#33425a] rounded-xl transition-colors cursor-pointer text-sm font-semibold"
              title="Export filtered records as CSV"
            >
              <Download className="w-4 h-4 text-sky-400" />
              <span>Export CSV</span>
            </button>

            {/* Executive Briefing Modal */}
            <button
              onClick={() => setIsExecutiveReportOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#2f5582] hover:bg-[#25466e] text-white rounded-xl transition-colors cursor-pointer text-sm font-bold shadow-xs border border-[#3c679a]"
              title="View Executive Summary"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Executive Briefing</span>
            </button>

            {/* Batch Remind Button */}
            <button
              onClick={handleBatchTriggerReminders}
              disabled={batchReminderSent}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#d97706] hover:bg-[#b45309] text-white font-bold rounded-xl transition-colors cursor-pointer shadow-xs text-sm"
              title="Trigger notifications for stalled applications"
            >
              <Send className="w-4 h-4" />
              <span>{batchReminderSent ? 'Dispatched!' : `Batch Remind (${detectedReminderCandidates.length})`}</span>
            </button>
          </div>
        </div>

        {/* Global Search Bar with readable text */}
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search active applications by NRC number (e.g. 294812/11/1), Full Name, or Tracking Ref..."
            className="w-full text-sm sm:text-base pl-11 pr-10 py-3 bg-[#20293a] border border-[#33425a] rounded-xl text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-[#4d6b94]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ============================================================ */}
        {/* VIEW 1: EXECUTIVE BI INTERFACE (Status Overview) */}
        {/* ============================================================ */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Responsible AI & Case Alerts Live Sentinel Bar */}
            <div className="bg-[#20293a] border border-[#33425a] rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-700/25 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-100 text-sm sm:text-base">
                      Responsible AI Case Alerts Engine: Active
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      98.6% Accuracy Benchmark
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      Auto-Detecting Stalled Cases
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                    Continuous monitoring identifies <strong>Paid-but-Unsubmitted</strong>, <strong>Incomplete Intake</strong>, and <strong>Reverted</strong> cases with automated prompts, reminders, and mandatory Human-in-the-Loop review.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  onClick={() => setActiveTab('responsible-ai')}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#2f5582] hover:bg-[#25466e] text-white transition-all shadow-xs cursor-pointer flex items-center gap-2 border border-[#3c679a]"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  <span>Open Responsible AI Console</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Split layout: Left 5 Radial Gauge Cards, Right Analytics Grid */}
            <div className="flex flex-col xl:flex-row gap-4 items-start">
              {/* LEFT COLUMN: 5 Radial Gauge KPI Cards matching BI Template */}
              <div className="w-full xl:w-72 space-y-3 shrink-0">
                {/* 1. Available / Under Vetting (Soft Emerald #22c55e) */}
                <div
                  onClick={() => {
                    setStatusFilter('REVIEW');
                    setActiveTab('registry');
                  }}
                  className="bg-[#20293a] border border-[#33425a] hover:border-[#22c55e]/60 p-4 rounded-2xl flex items-center gap-4 shadow-sm cursor-pointer transition-all group"
                >
                  <RadialGauge percentage={21} trend="+7%" color="#22c55e" size={92} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-base sm:text-lg font-bold text-[#22c55e] tracking-tight">
                        Available
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-300 mt-1">
                      <GitBranch className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">UCC_sales</span>
                    </div>
                    <div className="text-xl sm:text-2xl font-mono font-bold text-slate-100 mt-1.5">
                      115:37:15
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Time Total ({metrics.underReviewCount} cases)</span>
                    </div>
                  </div>
                </div>

                {/* 2. In Call / Biometrics Scheduled (Soft Royal Blue #3b82f6) */}
                <div
                  onClick={() => {
                    setStatusFilter('BIOMETRICS');
                    setActiveTab('registry');
                  }}
                  className="bg-[#20293a] border border-[#33425a] hover:border-[#3b82f6]/60 p-4 rounded-2xl flex items-center gap-4 shadow-sm cursor-pointer transition-all group"
                >
                  <RadialGauge percentage={21} trend="+7%" color="#3b82f6" size={92} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-base sm:text-lg font-bold text-[#60a5fa] tracking-tight">
                        In Call
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-300 mt-1">
                      <GitBranch className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">UCC_marketing</span>
                    </div>
                    <div className="text-xl sm:text-2xl font-mono font-bold text-slate-100 mt-1.5">
                      115:37:15
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Time Total ({metrics.biometricsCount} cases)</span>
                    </div>
                  </div>
                </div>

                {/* 3. Away / Paid Unsubmitted (Warm Honey Amber #f59e0b) */}
                <div
                  onClick={() => {
                    setStatusFilter('PAID_UNSUBMITTED');
                    setActiveTab('registry');
                  }}
                  className="bg-[#20293a] border border-[#33425a] hover:border-[#f59e0b]/60 p-4 rounded-2xl flex items-center gap-4 shadow-sm cursor-pointer transition-all group"
                >
                  <RadialGauge percentage={21} trend="+7%" color="#f59e0b" size={92} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-base sm:text-lg font-bold text-[#fbbf24] tracking-tight">
                        Away
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-300 mt-1">
                      <GitBranch className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">UCC_production</span>
                    </div>
                    <div className="text-xl sm:text-2xl font-mono font-bold text-slate-100 mt-1.5">
                      115:37:15
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Time Total ({metrics.paidUnsubmittedCount} cases)</span>
                    </div>
                  </div>
                </div>

                {/* 4. Do Not Disturb / Ready for Collection (Warm Peach Coral #fb923c) */}
                <div
                  onClick={() => {
                    setStatusFilter('READY');
                    setActiveTab('registry');
                  }}
                  className="bg-[#20293a] border border-[#33425a] hover:border-[#fb923c]/60 p-4 rounded-2xl flex items-center gap-4 shadow-sm cursor-pointer transition-all group"
                >
                  <RadialGauge percentage={21} trend="+7%" color="#fb923c" size={92} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-base sm:text-lg font-bold text-[#fb923c] tracking-tight">
                        Do Not Disturb
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-300 mt-1">
                      <GitBranch className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">UCC_support</span>
                    </div>
                    <div className="text-xl sm:text-2xl font-mono font-bold text-slate-100 mt-1.5">
                      115:37:15
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Time Total ({metrics.readyCount} cases)</span>
                    </div>
                  </div>
                </div>

                {/* 5. Busy / Reverted Cases (Soft Rose Red #f87171) */}
                <div
                  onClick={() => {
                    setStatusFilter('REVERTED');
                    setActiveTab('registry');
                  }}
                  className="bg-[#20293a] border border-[#33425a] hover:border-[#f87171]/60 p-4 rounded-2xl flex items-center gap-4 shadow-sm cursor-pointer transition-all group"
                >
                  <RadialGauge percentage={21} trend="+7%" color="#f87171" size={92} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-base sm:text-lg font-bold text-[#f87171] tracking-tight">
                        Busy
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-300 mt-1">
                      <GitBranch className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">UCC_backoffice</span>
                    </div>
                    <div className="text-xl sm:text-2xl font-mono font-bold text-slate-100 mt-1.5">
                      115:37:15
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Time Total ({metrics.revertedCount} cases)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT MAIN ANALYTICS: Top Row, Middle Row, Bottom Detail Table */}
              <div className="flex-1 space-y-5 min-w-0 w-full">
                {/* ROW 1: Reason Code Distribution + Average Agent Workload */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
                  {/* Card 1: Reason Code Distribution */}
                  <div className="lg:col-span-6 bg-[#20293a] border border-[#33425a] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight">
                        Reason Code Distribution
                      </h3>
                    </div>

                    <div className="flex items-baseline gap-2.5">
                      <span className="text-sm text-slate-300 font-semibold">Total:</span>
                      <span className="text-3xl sm:text-4xl font-black text-slate-100 font-mono tracking-tight">
                        230
                      </span>
                    </div>

                    {/* Segmented Horizontal Progress Bar with softened palette */}
                    <div className="w-full h-4 rounded-full overflow-hidden flex bg-slate-800/80 shadow-inner">
                      <div
                        style={{ width: '20%' }}
                        className="bg-[#fb923c] hover:opacity-90 transition-all cursor-pointer"
                        title="Coffee / Syntax Validation (20%)"
                      />
                      <div
                        style={{ width: '15%' }}
                        className="bg-[#22c55e] hover:opacity-90 transition-all cursor-pointer"
                        title="Lunch / NRC Verification (15%)"
                      />
                      <div
                        style={{ width: '15%' }}
                        className="bg-[#f59e0b] hover:opacity-90 transition-all cursor-pointer"
                        title="Break / Fee Payment Hold (15%)"
                      />
                      <div
                        style={{ width: '20%' }}
                        className="bg-[#f87171] hover:opacity-90 transition-all cursor-pointer"
                        title="Meeting / Minor Consent (20%)"
                      />
                      <div
                        style={{ width: '30%' }}
                        className="bg-[#3b82f6] hover:opacity-90 transition-all cursor-pointer"
                        title="Administration / Photo Spec (30%)"
                      />
                    </div>

                    {/* Legend with percentages and labels with enlarged readable fonts */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-sm">
                      <div>
                        <div className="font-bold text-slate-100 font-mono text-base">20%</div>
                        <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-300 mt-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]" />
                          <span>Coffee</span>
                        </div>
                      </div>

                      <div>
                        <div className="font-bold text-slate-100 font-mono text-base">15%</div>
                        <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-300 mt-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" />
                          <span>Lunch</span>
                        </div>
                      </div>

                      <div>
                        <div className="font-bold text-slate-100 font-mono text-base">15%</div>
                        <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-300 mt-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#fb923c]" />
                          <span>Break</span>
                        </div>
                      </div>

                      <div>
                        <div className="font-bold text-slate-100 font-mono text-base">20%</div>
                        <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-300 mt-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#f87171]" />
                          <span>Meeting</span>
                        </div>
                      </div>

                      <div>
                        <div className="font-bold text-slate-100 font-mono text-base">30%</div>
                        <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-300 mt-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                          <span>Administration</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Average Agent Workload Area Chart */}
                  <div className="lg:col-span-6 bg-[#20293a] border border-[#33425a] rounded-2xl p-5 sm:p-6 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight">
                        Average Agent Workload
                      </h3>
                      <span className="text-xs sm:text-sm text-sky-400 font-mono font-semibold">
                        Target: 55%
                      </span>
                    </div>

                    <div className="h-[165px] w-full pt-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={agentWorkloadData}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="cyanWorkloadGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                              <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#2c394e" vertical={false} />
                          <XAxis
                            dataKey="day"
                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                            axisLine={{ stroke: '#2c394e' }}
                            tickLine={false}
                          />
                          <YAxis
                            domain={[0, 100]}
                            ticks={[0, 40, 60, 80, 100]}
                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                            axisLine={{ stroke: '#2c394e' }}
                            tickLine={false}
                            unit="%"
                          />
                          <Tooltip
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-[#18202c] border border-[#33425a] text-slate-100 p-3 rounded-xl shadow-xl text-xs sm:text-sm space-y-1.5">
                                    <div className="font-bold text-slate-200">{label}</div>
                                    <div className="flex items-center justify-between gap-4">
                                      <span className="text-sky-400 font-medium">Workload:</span>
                                      <span className="font-mono font-bold text-white">
                                        {payload[1]?.value || payload[0]?.value}%
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4 text-amber-300 font-medium">
                                      <span>Benchmark SLA:</span>
                                      <span className="font-mono">55%</span>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          {/* Dashed Benchmark Line */}
                          <Line
                            type="monotone"
                            dataKey="target"
                            stroke="#f59e0b"
                            strokeDasharray="4 4"
                            strokeWidth={1.5}
                            dot={false}
                          />
                          {/* Softer Workload Line */}
                          <Area
                            type="monotone"
                            dataKey="workload"
                            stroke="#38bdf8"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#cyanWorkloadGrad)"
                            dot={{ r: 3.5, fill: '#38bdf8', stroke: '#18202c', strokeWidth: 2 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* ROW 2: Status Time in hours Grouped Bar Chart */}
                <div className="bg-[#20293a] border border-[#33425a] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight">
                        Status Time in hours
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                        Daily operational hours logged across workflow queues
                      </p>
                    </div>
                  </div>

                  <div className="h-[230px] w-full pt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart
                        data={statusTimeBarData}
                        margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#2c394e" vertical={false} />
                        <XAxis
                          dataKey="day"
                          tick={{ fill: '#cbd5e1', fontSize: 13 }}
                          axisLine={{ stroke: '#2c394e' }}
                          tickLine={false}
                        />
                        <YAxis
                          domain={[0, 50]}
                          ticks={[0, 12, 24, 36, 48, 50]}
                          tick={{ fill: '#94a3b8', fontSize: 12 }}
                          axisLine={{ stroke: '#2c394e' }}
                          tickLine={false}
                          unit="h"
                        />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-[#18202c] border border-[#33425a] text-slate-100 p-3.5 rounded-xl shadow-2xl text-xs sm:text-sm space-y-1.5 min-w-[200px]">
                                  <div className="font-bold border-b border-[#33425a] pb-1.5 text-slate-200">
                                    {label}
                                  </div>
                                  {payload.map((p: any) => (
                                    <div
                                      key={p.name}
                                      className="flex items-center justify-between gap-4"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span
                                          className="w-2.5 h-2.5 rounded-full shrink-0"
                                          style={{ backgroundColor: p.color }}
                                        />
                                        <span className="text-slate-300 capitalize">{p.name}:</span>
                                      </div>
                                      <span className="font-mono font-bold text-white">
                                        {p.value} hrs
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar
                          dataKey="available"
                          name="Available"
                          fill="#22c55e"
                          radius={[3, 3, 0, 0]}
                        />
                        <Bar dataKey="inCall" name="In Call" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="away" name="Away" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                        <Bar
                          dataKey="dnd"
                          name="Do Not Disturb"
                          fill="#fb923c"
                          radius={[3, 3, 0, 0]}
                        />
                        <Bar dataKey="busy" name="Busy" fill="#f87171" radius={[3, 3, 0, 0]} />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Horizontal Bar Legend with readable fonts */}
                  <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-xs sm:text-sm">
                    <div className="flex items-center gap-2 text-slate-300 font-medium">
                      <span className="w-3 h-3 rounded-full bg-[#22c55e]" />
                      <span>Available</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300 font-medium">
                      <span className="w-3 h-3 rounded-full bg-[#3b82f6]" />
                      <span>In Call</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300 font-medium">
                      <span className="w-3 h-3 rounded-full bg-[#f59e0b]" />
                      <span>Away</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300 font-medium">
                      <span className="w-3 h-3 rounded-full bg-[#fb923c]" />
                      <span>Do Not Disturb</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300 font-medium">
                      <span className="w-3 h-3 rounded-full bg-[#f87171]" />
                      <span>Busy</span>
                    </div>
                  </div>
                </div>

                {/* ROW 3: Status Detail Interactive Table matching BI Template with larger readable fonts */}
                <div className="bg-[#20293a] border border-[#33425a] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h3 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight">Status Detail</h3>

                    {/* Dropdown Filter matching [All v] button in image */}
                    <div className="flex items-center gap-2.5 text-sm">
                      <select
                        value={detailTableFilter}
                        onChange={(e) => setDetailTableFilter(e.target.value)}
                        className="bg-[#18202c] border border-[#33425a] text-slate-200 text-sm font-semibold rounded-xl py-2 px-3.5 focus:outline-hidden focus:border-[#4d6b94] cursor-pointer"
                      >
                        <option value="All">All Categories</option>
                        <option value="Available">Available Only</option>
                        <option value="In Call">In Call Only</option>
                        <option value="Away">Away Only</option>
                        <option value="Busy">Busy Only</option>
                      </select>
                    </div>
                  </div>

                  {/* Soft Slate Data Matrix Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-[#33425a] text-slate-300 font-bold text-xs sm:text-sm uppercase tracking-wider">
                          <th className="py-3.5 px-3.5 w-10"></th>
                          <th className="py-3.5 px-3.5">Status</th>
                          <th className="py-3.5 px-3.5 text-[#22c55e]">Available</th>
                          <th className="py-3.5 px-3.5 text-[#60a5fa]">In Call</th>
                          <th className="py-3.5 px-3.5 text-[#fbbf24]">Away</th>
                          <th className="py-3.5 px-3.5 text-[#fb923c]">Do Not Disturb</th>
                          <th className="py-3.5 px-3.5 text-[#f87171]">Busy</th>
                          <th className="py-3.5 px-3.5 text-slate-300">Reason Code</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2c394e] font-mono text-xs sm:text-sm">
                        {statusDetailRows.map((row) => {
                          const isExpanded = !!expandedRows[row.key];
                          return (
                            <React.Fragment key={row.key}>
                              <tr
                                onClick={() => toggleRow(row.key)}
                                className="hover:bg-[#253247] transition-colors cursor-pointer group"
                              >
                                <td className="py-3.5 px-3.5 text-slate-400">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleRow(row.key);
                                    }}
                                    className="w-6 h-6 rounded flex items-center justify-center bg-[#2c394e] hover:bg-[#374762] text-slate-200 transition-colors"
                                  >
                                    {isExpanded ? (
                                      <Minus className="w-3.5 h-3.5" />
                                    ) : (
                                      <Plus className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </td>
                                <td className="py-3.5 px-3.5 font-sans font-bold text-slate-100">
                                  <div className="text-sm sm:text-base">{row.name}</div>
                                  <div className="text-xs text-slate-400 font-sans font-normal mt-0.5">
                                    {row.stationLabel}
                                  </div>
                                </td>
                                <td className="py-3.5 px-3.5">
                                  <span className="text-[#22c55e] font-bold mr-2 text-sm sm:text-base">
                                    {row.available.time}
                                  </span>
                                  <span className="text-slate-400 text-xs sm:text-sm font-semibold">{row.available.pct}%</span>
                                </td>
                                <td className="py-3.5 px-3.5">
                                  <span className="text-[#60a5fa] font-bold mr-2 text-sm sm:text-base">
                                    {row.inCall.time}
                                  </span>
                                  <span className="text-slate-400 text-xs sm:text-sm font-semibold">{row.inCall.pct}%</span>
                                </td>
                                <td className="py-3.5 px-3.5">
                                  <span className="text-[#fbbf24] font-bold mr-2 text-sm sm:text-base">
                                    {row.away.time}
                                  </span>
                                  <span className="text-slate-400 text-xs sm:text-sm font-semibold">{row.away.pct}%</span>
                                </td>
                                <td className="py-3.5 px-3.5">
                                  <span className="text-[#fb923c] font-bold mr-2 text-sm sm:text-base">
                                    {row.dnd.time}
                                  </span>
                                  <span className="text-slate-400 text-xs sm:text-sm font-semibold">{row.dnd.pct}%</span>
                                </td>
                                <td className="py-3.5 px-3.5">
                                  <span className="text-[#f87171] font-bold mr-2 text-sm sm:text-base">
                                    {row.busy.time}
                                  </span>
                                  <span className="text-slate-400 text-xs sm:text-sm font-semibold">{row.busy.pct}%</span>
                                </td>
                                <td className="py-3.5 px-3.5">
                                  <span className="text-slate-200 font-bold mr-2 text-sm sm:text-base">
                                    {row.reasonCode.time}
                                  </span>
                                  <span className="text-slate-400 text-xs sm:text-sm font-semibold">{row.reasonCode.pct}%</span>
                                </td>
                              </tr>

                              {/* Expanded Drawer showing real dossiers for this department/station */}
                              {isExpanded && (
                                <tr className="bg-[#18202c]">
                                  <td colSpan={8} className="p-4 pl-12">
                                    <div className="bg-[#20293a] border border-[#33425a] rounded-xl p-4 sm:p-5 space-y-3">
                                      <div className="flex items-center justify-between text-sm">
                                        <span className="font-sans font-bold text-slate-200 flex items-center gap-2">
                                          <Activity className="w-4 h-4 text-sky-400" />
                                          Active Dossiers in queue for {row.name} ({row.cases.length} assigned)
                                        </span>
                                        <button
                                          onClick={() => {
                                            setActiveTab('registry');
                                          }}
                                          className="text-xs sm:text-sm text-sky-400 hover:underline font-bold flex items-center gap-1.5 cursor-pointer"
                                        >
                                          <span>Open all in Case Registry</span>
                                          <ArrowRight className="w-3.5 h-3.5" />
                                        </button>
                                      </div>

                                      {row.cases.length === 0 ? (
                                        <div className="text-slate-400 text-sm py-2">
                                          No active bottlenecks currently stalled in this unit.
                                        </div>
                                      ) : (
                                        <div className="space-y-2">
                                          {row.cases.slice(0, 3).map((app) => (
                                            <div
                                              key={app.id}
                                              onClick={() => setSelectedCaseForModal(app)}
                                              className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-[#18202c] hover:bg-[#253247] transition-colors cursor-pointer border border-[#33425a] text-sm font-sans gap-2"
                                            >
                                              <div className="flex items-center gap-2.5">
                                                <span className="font-bold text-slate-100 text-sm sm:text-base">
                                                  {app.fullName}
                                                </span>
                                                <span className="text-slate-300 font-mono text-xs">
                                                  {app.trackingNumber}
                                                </span>
                                                <span
                                                  className={`px-2 py-0.5 rounded text-xs font-bold ${
                                                    app.status === 'Reverted'
                                                      ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                                      : app.status === 'Paid - Unsubmitted'
                                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                                  }`}
                                                >
                                                  {app.status}
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-3">
                                                <span className="text-slate-300 text-xs sm:text-sm font-medium">
                                                  {app.daysInStatus}d in queue
                                                </span>
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedCaseForModal(app);
                                                  }}
                                                  className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold bg-[#2f5582] hover:bg-[#25466e] text-white cursor-pointer transition-colors"
                                                >
                                                  Triage Case
                                                </button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Smart Service Pillars Showcase */}
            <div className="mt-6 pt-4 border-t border-[#1e2536]">
              <PillarsModule
                applications={applications}
                onOpenAssistant={onOpenAssistant || (() => {})}
                onSelectApplication={onSelectApplication}
                onAddNotification={onAddNotification}
                onUpdateStatus={onUpdateStatus}
                isOfficerRole={true}
              />
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* ============================================================ */}
        {/* VIEW 2: DEDICATED ACTION QUEUE TAB */}
        {/* ============================================================ */}
        {activeTab === 'action-queue' && (
          <div className="bg-[#20293a] border border-[#33425a] rounded-2xl p-4 sm:p-6 shadow-sm">
            <ActionQueueTab
              applications={applications}
              onOpenTriageModal={(app) => setSelectedCaseForModal(app)}
              onUpdateStatus={onUpdateStatus}
              onAddNotification={onAddNotification}
              onSelectApplication={onSelectApplication}
            />
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW: RESPONSIBLE AI CONTROLS & WORKFLOW AUTOMATION */}
        {/* ============================================================ */}
        {activeTab === 'responsible-ai' && (
          <ResponsibleAIModule
            applications={applications}
            onUpdateStatus={onUpdateStatus}
            onAddNotification={onAddNotification}
            onSelectApplication={onSelectApplication}
            onOpenTriageModal={(app) => setSelectedCaseForModal(app)}
          />
        )}

        {activeTab === 'operations' && <OperationsInsights applications={applications} />}


        {activeTab === 'payment-monitor' && (
          <PaymentSubmissionMonitor
            applications={applications}
            isOfficerView
            onSelectApplication={onSelectApplication}
            onUpdateStatus={onUpdateStatus}
            onAddNotification={onAddNotification}
            onUpdateNotificationDelivery={onUpdateNotificationDelivery}
            onAskAssistant={(application) => {
              onSelectApplication(application);
              onOpenAssistant?.();
            }}
          />
        )}

        {/* ============================================================ */}
        {/* VIEW 3: DEDICATED SMART SERVICE PILLARS TAB */}
        {/* ============================================================ */}
        {activeTab === 'pillars' && (
          <div className="bg-[#20293a] border border-[#33425a] rounded-2xl p-4 sm:p-6 shadow-sm">
            <PillarsModule
              applications={applications}
              onOpenAssistant={onOpenAssistant || (() => {})}
              onSelectApplication={onSelectApplication}
              onAddNotification={onAddNotification}
              onUpdateStatus={onUpdateStatus}
              isOfficerRole={true}
            />
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 4: APPLICATION REGISTRY TAB */}
        {/* ============================================================ */}
        {activeTab === 'registry' && (
          <div className="space-y-4">
            {/* Filter Bar with readable buttons */}
            <div className="bg-[#20293a] border border-[#33425a] rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3 text-sm">
              <span className="text-slate-300 font-bold">Filter Status:</span>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 'ALL', label: 'All Cases' },
                  { id: 'PENDING', label: `Pending Cases (${pendingTotalApplications.length})` },
                  { id: 'REVERTED', label: 'Reverted' },
                  { id: 'PAID_UNSUBMITTED', label: 'Paid Unsubmitted' },
                  { id: 'REVIEW', label: 'Under Review' },
                  { id: 'BIOMETRICS', label: 'Biometrics' },
                  { id: 'READY', label: 'Ready' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setStatusFilter(f.id)}
                    className={`px-3.5 py-2 rounded-xl text-sm font-bold transition-colors cursor-pointer ${
                      statusFilter === f.id
                        ? 'bg-[#2f5582] text-white shadow-xs'
                        : 'bg-[#18202c] text-slate-300 hover:text-white border border-[#33425a]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bulk Dispatch Feedback Banner */}
            {bulkNotifyFeedback && (
              <div className="bg-[#172e27] border border-[#235d49] text-emerald-200 px-4 py-3 rounded-xl flex items-center justify-between gap-3 shadow-sm animate-fadeIn">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span className="text-sm sm:text-base font-semibold">
                    {bulkNotifyFeedback.message}
                  </span>
                </div>
                <button
                  onClick={() => setBulkNotifyFeedback(null)}
                  className="text-emerald-400 hover:text-emerald-200 p-1 rounded-lg cursor-pointer"
                  title="Dismiss notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Bulk-Action Panel */}
            <div className="bg-[#1e2738] border-2 border-[#334968] rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[#25354c] border border-[#3c5375] rounded-xl text-blue-300">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="font-bold text-slate-100 text-base sm:text-lg">
                        Bulk Document-Reminder Panel
                      </h3>
                      {selectedAppIds.length > 0 ? (
                        <span className="bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs sm:text-sm font-bold px-2.5 py-0.5 rounded-full">
                          {selectedAppIds.length} Selected ({selectedAppIds.filter((id) => {
                            const a = applications.find((app) => app.id === id);
                            return a && isPendingApp(a);
                          }).length} Pending)
                        </span>
                      ) : (
                        <span className="bg-slate-700/40 text-slate-300 text-xs font-medium px-2 py-0.5 rounded">
                          0 Selected
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                      Select multiple 'PENDING' applications below and trigger standard document-reminder notifications to all selected applicants at once.
                    </p>
                  </div>
                </div>

                {/* Quick Selection Helper Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleSelectAllPendingVisible}
                    disabled={pendingFilteredApplications.length === 0}
                    className="px-3 py-1.5 bg-[#24334a] hover:bg-[#2e405d] text-slate-200 border border-[#3b5275] rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                    title="Select all pending cases matching current table filter"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                    Select All Pending ({pendingFilteredApplications.length})
                  </button>

                  {selectedAppIds.length > 0 && (
                    <button
                      onClick={handleClearSelection}
                      className="px-3 py-1.5 bg-[#2a1c22] hover:bg-[#3d242c] text-rose-300 border border-rose-800/40 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                      title="Clear current selection"
                    >
                      <X className="w-3.5 h-3.5" />
                      Clear Selection
                    </button>
                  )}
                </div>
              </div>

              {/* Notification Channel & Execution Toolbar */}
              <div className="pt-2 border-t border-[#2e3d54] flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs sm:text-sm font-bold text-slate-300">
                    Dispatch Channel:
                  </span>
                  <div className="inline-flex rounded-xl bg-[#141b26] p-1 border border-[#2b3a50]">
                    {(['SMS', 'Email', 'OPAS Message Board'] as const).map((channel) => (
                      <button
                        key={channel}
                        onClick={() => setBulkChannel(channel)}
                        className={`px-3 py-1 rounded-lg text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                          bulkChannel === channel
                            ? 'bg-[#2f5582] text-white shadow-xs'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        {channel === 'SMS' && '📱 SMS'}
                        {channel === 'Email' && '✉️ Email'}
                        {channel === 'OPAS Message Board' && '📋 Portal Inbox'}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setIsTemplateEditorOpen((prev) => !prev)}
                    className="text-xs sm:text-sm text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-4 cursor-pointer"
                  >
                    {isTemplateEditorOpen ? 'Hide Message Preview' : 'Preview / Edit Reminder Text'}
                  </button>
                </div>

                {/* Primary Action Button */}
                <button
                  onClick={handleBulkNotify}
                  disabled={selectedAppIds.length === 0 || isBulkNotifying}
                  className={`px-5 py-2.5 rounded-xl text-sm sm:text-base font-bold flex items-center gap-2 transition-all shadow-md cursor-pointer ${
                    selectedAppIds.length > 0 && !isBulkNotifying
                      ? 'bg-blue-600 hover:bg-blue-500 text-white'
                      : 'bg-slate-700/60 text-slate-400 border border-slate-600/40 cursor-not-allowed opacity-60'
                  }`}
                  title={
                    selectedAppIds.length === 0
                      ? 'Select at least one pending application first'
                      : `Dispatch standard document-reminders to ${selectedAppIds.length} applicants`
                  }
                >
                  {isBulkNotifying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Dispatching Reminders...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Bulk Notify ({selectedAppIds.length})</span>
                    </>
                  )}
                </button>
              </div>

              {/* Collapsible Message Template Preview / Customizer */}
              {isTemplateEditorOpen && (
                <div className="mt-3 p-4 bg-[#141b26] border border-[#2b3a50] rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Standard Document-Reminder Template:
                    </span>
                    <span className="text-xs text-slate-400">
                      Applicant tokens [Ref: #] &amp; [Pending Items] auto-injected
                    </span>
                  </div>
                  <textarea
                    value={customMessageTemplate}
                    onChange={(e) => setCustomMessageTemplate(e.target.value)}
                    rows={3}
                    className="w-full bg-[#1b2434] border border-[#33425a] text-slate-200 text-xs sm:text-sm p-3 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
                    placeholder="Enter reminder notification content..."
                  />
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>
                      Active Channel: <strong className="text-slate-200">{bulkChannel}</strong>
                    </span>
                    <button
                      onClick={() =>
                        setCustomMessageTemplate(
                          'MoHAIS OPAS Official Notice: Action is required on your pending passport application. Please log in to your OPAS citizen portal immediately to upload outstanding or corrected civil documents (e.g., compliant photo, NRC copy, or certified guarantor endorsement) to proceed with vetting.'
                        )
                      }
                      className="text-xs text-slate-300 hover:text-white underline cursor-pointer"
                    >
                      Reset to Official Default
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Registry Soft Slate Table with multi-select and enlarged legible fonts */}
            <div className="bg-[#20293a] border border-[#33425a] rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#33425a] bg-[#1a2332] text-slate-300 font-bold text-xs sm:text-sm uppercase tracking-wider">
                      <th className="py-4 px-3 w-12 text-center">
                        <input
                          type="checkbox"
                          aria-label="Select all visible pending applications"
                          checked={areAllVisiblePendingSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = isPartiallySelected;
                          }}
                          onChange={() => {
                            if (areAllVisiblePendingSelected) {
                              const visiblePendingIds = new Set(
                                pendingFilteredApplications.map((a) => a.id)
                              );
                              setSelectedAppIds((prev) =>
                                prev.filter((id) => !visiblePendingIds.has(id))
                              );
                            } else {
                              const visiblePendingIds = pendingFilteredApplications.map((a) => a.id);
                              setSelectedAppIds((prev) =>
                                Array.from(new Set([...prev, ...visiblePendingIds]))
                              );
                            }
                          }}
                          className="w-4 h-4 rounded text-blue-600 bg-[#18202c] border-[#33425a] focus:ring-blue-500 focus:ring-offset-[#20293a] cursor-pointer"
                          title="Toggle all visible pending cases"
                        />
                      </th>
                      <th className="py-4 px-4">Tracking Number &amp; Applicant</th>
                      <th className="py-4 px-4">NRC &amp; Type</th>
                      <th className="py-4 px-4">Current Status</th>
                      <th className="py-4 px-4">Contact Integrity</th>
                      <th className="py-4 px-4">Days in Stage</th>
                      <th className="py-4 px-4">Office</th>
                      <th className="py-4 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2c394e] text-slate-200">
                    {filteredApplications.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-10 text-center text-slate-400 text-sm">
                          No applications found matching your criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredApplications.map((app) => {
                        const isPending = isPendingApp(app);
                        const isSelected = selectedAppIds.includes(app.id);
                        const phoneValid = validatePhoneNumber(
                          app.contact.phone,
                          app.contact.phoneCountryCode
                        ).isValid;
                        const emailValid = validateEmail(app.contact.email).isValid;
                        const contactOk = phoneValid && emailValid;

                        return (
                          <tr
                            key={app.id}
                            className={`transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-[#25364e] hover:bg-[#2c3f5c]'
                                : 'hover:bg-[#253247]'
                            }`}
                            onClick={() => setSelectedCaseForModal(app)}
                          >
                            {/* Row Selection Checkbox */}
                            <td
                              className="py-4 px-3 text-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                aria-label={`Select application ${app.trackingNumber}`}
                                checked={isSelected}
                                onChange={() => handleToggleAppSelection(app.id)}
                                className="w-4 h-4 rounded text-blue-600 bg-[#18202c] border-[#33425a] focus:ring-blue-500 focus:ring-offset-[#20293a] cursor-pointer"
                              />
                            </td>

                            <td className="py-4 px-4">
                              <div className="font-bold text-slate-100 text-sm sm:text-base flex items-center gap-2">
                                <span>{app.fullName}</span>
                                {app.isUrgent && (
                                  <span className="text-xs bg-[#f59e0b] text-slate-950 font-bold px-2 py-0.5 rounded">
                                    EXPRESS
                                  </span>
                                )}
                                {isPending && (
                                  <span className="text-[11px] bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                                    Pending Action
                                  </span>
                                )}
                              </div>
                              <div className="font-mono text-xs sm:text-sm text-slate-400 mt-0.5">
                                {app.trackingNumber}
                              </div>
                            </td>

                            <td className="py-4 px-4">
                              <div className="font-mono font-semibold text-slate-100 text-sm">{app.nrcNumber}</div>
                              <div className="text-xs text-slate-400 mt-0.5">{app.passportType}</div>
                            </td>

                            <td className="py-4 px-4">
                              <span
                                className={`inline-block px-3 py-1 rounded-md text-xs sm:text-sm font-bold ${
                                  app.status === 'Reverted'
                                    ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                    : app.status === 'Paid - Unsubmitted'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : app.status === 'Ready for Collection'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : app.status === 'Biometrics Scheduled'
                                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                    : 'bg-slate-700/40 text-slate-200'
                                }`}
                              >
                                {app.status}
                              </span>
                              {app.reversionReason && (
                                <div className="text-xs text-red-300 line-clamp-1 mt-1 max-w-xs">
                                  {app.reversionReason}
                                </div>
                              )}
                            </td>

                            <td className="py-4 px-4">
                              {contactOk ? (
                                <span className="text-[#34d399] font-bold flex items-center gap-1.5 text-xs sm:text-sm">
                                  <CheckCircle2 className="w-4 h-4 text-[#34d399]" />
                                  Verified E.164
                                </span>
                              ) : (
                                <span className="text-[#fbbf24] font-bold flex items-center gap-1.5 text-xs sm:text-sm">
                                  <AlertCircle className="w-4 h-4 text-[#fbbf24]" />
                                  Flagged
                                </span>
                              )}
                              <div className="text-xs text-slate-400 font-mono mt-0.5">
                                {app.contact.phone}
                              </div>
                            </td>

                            <td className="py-4 px-4">
                              <span
                                className={`font-bold text-sm ${
                                  app.daysInStatus > 7 ? 'text-red-400' : 'text-slate-200'
                                }`}
                              >
                                {app.daysInStatus} days
                              </span>
                              {app.daysInStatus > 7 && (
                                <span className="block text-xs text-red-400 font-medium">SLA Exceeded</span>
                              )}
                            </td>

                            <td className="py-4 px-4 text-slate-300 text-sm">
                              {app.collectionOffice.replace('Passport Office', 'P.O.')}
                            </td>

                            <td
                              className="py-4 px-4 text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => setSelectedCaseForModal(app)}
                                className="px-3.5 py-1.5 text-xs sm:text-sm font-bold bg-[#2f5582] hover:bg-[#25466e] text-white rounded-lg transition-colors cursor-pointer shadow-xs"
                                title="Open Case Triage & Review"
                              >
                                Triage Case
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 5: PILOT EVALUATION TAB */}
        {/* ============================================================ */}
        {activeTab === 'evaluation' && (
          <div className="bg-[#20293a] border border-[#33425a] rounded-2xl p-4 sm:p-6 shadow-sm">
            <PilotEvaluationReport />
          </div>
        )}
      </div>

      {/* Case Triage Modal */}
      {selectedCaseForModal && (
        <CaseTriageModal
          application={selectedCaseForModal}
          onClose={() => setSelectedCaseForModal(null)}
          onUpdateStatus={(id, newStatus, notes) => {
            onUpdateStatus(id, newStatus, notes);
            setSelectedCaseForModal(null);
          }}
          onAddNotification={onAddNotification}
          onUpdateNotificationDelivery={(applicationId, notificationId, deliveryStatus, failureReason) => {
            onUpdateNotificationDelivery(applicationId, notificationId, deliveryStatus, failureReason);
            setSelectedCaseForModal((current) => current?.id !== applicationId ? current : {
              ...current,
              notifications: current.notifications.map((notification) => notification.id !== notificationId ? notification : {
                ...notification,
                deliveryStatus,
                failureReason: deliveryStatus === 'Failed' ? failureReason : undefined,
                deliveryUpdatedAt: new Date().toISOString(),
              }),
            });
          }}
        />
      )}

      {/* Operational Intelligence Executive Report Modal */}
      {isExecutiveReportOpen && (
        <ExecutiveReportModal
          applications={applications}
          onClose={() => setIsExecutiveReportOpen(false)}
        />
      )}
    </div>
  );
};
