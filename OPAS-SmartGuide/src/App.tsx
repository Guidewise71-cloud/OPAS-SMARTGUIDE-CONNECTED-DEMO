/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { AuthPortal } from './components/auth/AuthPortal';
import { OfficerDashboard } from './components/officer/OfficerDashboard';
import { CitizenPortal } from './components/citizen/CitizenPortal';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { SupervisorDashboard } from './components/officer/SupervisorDashboard';
import { AIGuidanceChat } from './components/citizen/AIGuidanceChat';
import { INITIAL_APPLICATIONS } from './data/mockApplications';
import { INITIAL_USERS } from './data/mockUsers';
import { PassportApplication, NotificationLog } from './types/passport';
import { UserAccount } from './types/auth';
import { Shield, Sparkles, MessageSquareQuote, Bell } from 'lucide-react';
import { EOIDocumentModal } from './components/common/EOIDocumentModal';
import { CitizenPhoneSimulatorModal } from './components/common/CitizenPhoneSimulatorModal';
import { WelcomePage } from './components/welcome/WelcomePage';
import { ChatProvider, useChat } from './context/ChatContext';
import { canAccessView, hasPermission } from './utils/accessControl';

interface AppContentProps {
  users: UserAccount[];
  setUsers: React.Dispatch<React.SetStateAction<UserAccount[]>>;
  currentUser: UserAccount | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<UserAccount | null>>;
  currentView: 'citizen' | 'officer' | 'admin';
  setCurrentView: React.Dispatch<React.SetStateAction<'citizen' | 'officer' | 'admin'>>;
  applications: PassportApplication[];
  setApplications: React.Dispatch<React.SetStateAction<PassportApplication[]>>;
  selectedApplicationId: string;
  setSelectedApplicationId: React.Dispatch<React.SetStateAction<string>>;
  selectedApplication: PassportApplication;
  isEOIModalOpen: boolean;
  setIsEOIModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isPhoneSimOpen: boolean;
  setIsPhoneSimOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

function AppContent({
  users,
  setUsers,
  currentUser,
  setCurrentUser,
  currentView,
  setCurrentView,
  applications,
  setApplications,
  selectedApplicationId,
  setSelectedApplicationId,
  selectedApplication,
  isEOIModalOpen,
  setIsEOIModalOpen,
  isPhoneSimOpen,
  setIsPhoneSimOpen,
}: AppContentProps) {
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | null>(null);
  const [authModalPrompt, setAuthModalPrompt] = useState<string | undefined>(undefined);

  const {
    isAssistantOpen,
    setIsAssistantOpen,
    isGuidanceScreen,
    unreadNotificationsCount,
    setActiveApplication,
    resetConversation,
  } = useChat();
  const isCompactCitizenDashboard = currentView === 'citizen';
  const [citizenInitialTab, setCitizenInitialTab] = useState<
    'status' | 'guidance' | 'monitoring' | 'messages' | 'apply' | 'faqs' | 'settings'
  >('status');

  // Keep assistant case context limited to the signed-in account.
  useEffect(() => {
    if (!currentUser) {
      setActiveApplication(undefined);
      return;
    }
    if (currentUser.role === 'citizen') {
      const ownsApplication = (application: PassportApplication) => currentUser.nrcNumber
        ? application.nrcNumber.trim().toLowerCase() === currentUser.nrcNumber.trim().toLowerCase()
        : application.contact.email.trim().toLowerCase() === currentUser.email.trim().toLowerCase();
      const ownApplication = selectedApplication && ownsApplication(selectedApplication)
        ? selectedApplication
        : applications.find(ownsApplication);
      setActiveApplication(ownApplication);
      return;
    }
    setActiveApplication(selectedApplication);
  }, [applications, currentUser, selectedApplication, setActiveApplication]);

  // Auth Handlers
  const handleLogin = (user: UserAccount) => {
    setCurrentUser(user);
    const linkedApplication = user.role === 'citizen'
      ? applications.find((application) =>
          user.nrcNumber
            ? application.nrcNumber.trim().toLowerCase() === user.nrcNumber.trim().toLowerCase()
            : application.contact.email.trim().toLowerCase() === user.email.trim().toLowerCase()
        )
      : selectedApplication;
    if (linkedApplication) setSelectedApplicationId(linkedApplication.id);
    resetConversation(linkedApplication);
    setAuthModalMode(null);
    if (user.role === 'admin') {
      setCurrentView('admin');
    } else if (user.role === 'officer' || user.role === 'supervisor') {
      setCurrentView('officer');
    } else {
      setCurrentView('citizen');
    }
  };

  const handleLogout = () => {
    void fetch('/api/auth/logout', { method: 'POST' });
    setCurrentUser(null);
    resetConversation(undefined);
    setAuthModalMode(null);
    setCurrentView('citizen');
    setIsAssistantOpen(false);
  };

  const handleRegisterCitizen = (newCitizen: UserAccount) => {
    setUsers((prev) => [newCitizen, ...prev]);
  };

  // Admin Officer Provisioning Handlers
  const handleAddOfficer = (newOfficer: UserAccount) => {
    setUsers((prev) => [newOfficer, ...prev]);
  };

  const handleUpdateOfficerStatus = (userId: string, newStatus: 'ACTIVE' | 'SUSPENDED') => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u))
    );
  };

  const handleResetPassword = (userId: string, newPass: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, password: newPass } : u))
    );
  };

  // Application Updates
  const handleUpdateStatus = (
    id: string,
    newStatus: PassportApplication['status'],
    notes?: string
  ) => {
    const targetApplication = applications.find((app) => app.id === id);
    const citizenOwnsApplication = Boolean(
      currentUser?.role === 'citizen' &&
        targetApplication &&
        ((currentUser.nrcNumber && targetApplication.nrcNumber === currentUser.nrcNumber) ||
          targetApplication.contact.email.toLowerCase() === currentUser.email.toLowerCase())
    );
    const citizenCanResubmit = citizenOwnsApplication && newStatus === 'Submitted - Under Review';

    if (!hasPermission(currentUser, 'case:update') && !(hasPermission(currentUser, 'application:resubmit') && citizenCanResubmit)) {
      console.warn('OPAS access denied: this account cannot update the selected application.');
      return;
    }

    setApplications((prev) =>
      prev.map((app) => {
        if (app.id === id) {
          return {
            ...app,
            status: newStatus,
            officerNotes: notes || app.officerNotes,
            daysInStatus: 0,
            lastUpdated: new Date().toISOString(),
            ...(currentUser?.role === 'officer' || currentUser?.role === 'admin' ? {
              assignedOfficer: app.assignedOfficer || currentUser.fullName,
              assignedAt: app.assignedAt || new Date().toISOString(),
              firstReviewedAt: app.firstReviewedAt || new Date().toISOString(),
              lastOfficerActionAt: new Date().toISOString(),
            } : {}),
            ...(newStatus === 'Reverted' ? { revertedAt: new Date().toISOString(), waitingForApplicantSince: new Date().toISOString() } : {}),
            ...(newStatus === 'Submitted - Under Review' ? { waitingForApplicantSince: undefined } : {}),
            lifecycleEvents: [...(app.lifecycleEvents || []), {
              id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              type: newStatus === 'Reverted' ? 'REVERTED' : newStatus === 'Submitted - Under Review' ? (currentUser?.role === 'citizen' ? 'RESUBMITTED' : 'SUBMITTED') : newStatus === 'Biometrics Scheduled' ? 'BIOMETRICS_SCHEDULED' : newStatus === 'Processing & Printing' ? 'PROCESSING_STARTED' : newStatus === 'Ready for Collection' ? 'READY_FOR_COLLECTION' : newStatus === 'Completed' ? 'COMPLETED' : 'STATUS_UPDATED',
              title: newStatus === 'Reverted' ? 'Application returned for correction' : newStatus === 'Submitted - Under Review' ? (currentUser?.role === 'citizen' ? 'Application resubmitted' : 'Application submitted for review') : `Application status changed to ${newStatus}`,
              description: notes || (currentUser?.role === 'citizen' ? 'Applicant updated and resubmitted the application.' : 'Application status updated by an authorised staff account.'),
              timestamp: new Date().toISOString(),
              actorId: currentUser?.id,
              actorName: currentUser?.fullName || 'System',
              actorRole: currentUser?.role || 'system',
            }],
          };
        }
        return app;
      })
    );
  };

  const handleAddNotification = (id: string, notif: NotificationLog) => {
    if (!hasPermission(currentUser, 'notification:dispatch')) {
      console.warn('OPAS access denied: this account cannot dispatch applicant notifications.');
      return;
    }
    const recordedAt = new Date().toISOString();
    const actor = currentUser
      ? {
          userId: currentUser.id,
          name: currentUser.fullName,
          role: currentUser.role,
        }
      : { userId: 'system', name: 'OPAS Workflow Service', role: 'system' as const };
    const recordedNotification: NotificationLog = {
      ...notif,
      timestamp: notif.timestamp || recordedAt,
      auditId: notif.auditId || `AUD-${Date.now()}-${id.toUpperCase()}`,
      trigger: notif.trigger || 'MANUAL_OFFICER',
      dispatchedBy: notif.dispatchedBy || actor,
      deliveryUpdatedAt: notif.deliveryUpdatedAt || recordedAt,
      auditTrail: [
        ...(notif.auditTrail || []),
        {
          id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp: recordedAt,
          event: notif.deliveryStatus === 'Delivered'
            ? 'DELIVERED'
            : notif.deliveryStatus === 'Failed'
            ? 'FAILED'
            : notif.deliveryStatus === 'Queued' || notif.deliveryStatus === 'Scheduled'
            ? 'CREATED'
            : 'DISPATCHED',
          actor: actor.name,
          details: `${notif.channel} notification recorded with status: ${notif.deliveryStatus}.`,
        },
      ],
    };

    setApplications((prev) =>
      prev.map((app) => {
        if (app.id === id) {
          return {
            ...app,
            notifications: [recordedNotification, ...app.notifications],
            lastUpdated: recordedAt,
          };
        }
        return app;
      })
    );
  };

  const handleUpdateNotificationDelivery = (
    applicationId: string,
    notificationId: string,
    deliveryStatus: NotificationLog['deliveryStatus'],
    failureReason?: string
  ) => {
    if (!hasPermission(currentUser, 'notification:dispatch')) {
      console.warn('OPAS access denied: this account cannot update notification delivery records.');
      return;
    }

    const timestamp = new Date().toISOString();
    const eventByStatus = {
      Queued: 'CREATED',
      Scheduled: 'CREATED',
      Failed: 'FAILED',
      Cancelled: 'CANCELLED',
      Sent: 'DISPATCHED',
      Delivered: 'DELIVERED',
      Read: 'READ',
      'Action Taken': 'ACTION_TAKEN',
    } as const;

    setApplications((prev) => prev.map((app) => {
      if (app.id !== applicationId) return app;
      return {
        ...app,
        lastUpdated: timestamp,
        notifications: app.notifications.map((notification) => notification.id !== notificationId ? notification : {
          ...notification,
          deliveryStatus,
          failureReason: deliveryStatus === 'Failed' ? failureReason : undefined,
          deliveryUpdatedAt: timestamp,
          actionTakenAt: deliveryStatus === 'Action Taken' ? timestamp : notification.actionTakenAt,
          auditTrail: [
            ...(notification.auditTrail || []),
            {
              id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              timestamp,
              event: eventByStatus[deliveryStatus],
              actor: currentUser?.fullName || 'OPAS Workflow Service',
              details: `Delivery status updated to ${deliveryStatus}.`,
            },
          ],
        }),
      };
    }));
  };

  const handleAddNewApplication = (newApp: PassportApplication) => {
    if (!hasPermission(currentUser, 'application:create')) {
      console.warn('OPAS access denied: only authenticated citizen accounts can create applications.');
      return;
    }
    setApplications((prev) => [newApp, ...prev]);
    setSelectedApplicationId(newApp.id);
  };

  const handleConfirmSandboxPayment = (id: string, transactionReference: string, paymentDate: string) => {
    const application = applications.find((record) => record.id === id);
    const citizenOwnsApplication = Boolean(
      currentUser?.role === 'citizen' && application &&
      ((currentUser.nrcNumber && application.nrcNumber === currentUser.nrcNumber) ||
        application.contact.email.toLowerCase() === currentUser.email.toLowerCase())
    );
    if (!hasPermission(currentUser, 'application:create') || !citizenOwnsApplication || !application || application.status !== 'Draft') {
      console.warn('OPAS access denied: this account cannot record a sandbox payment for the selected application.');
      return false;
    }

    setApplications((prev) => prev.map((record) => record.id === id ? {
      ...record,
      feePaid: true,
      paymentReference: transactionReference,
      paidAt: paymentDate,
      status: 'Paid - Unsubmitted',
      lastUpdated: paymentDate,
      lifecycleEvents: [...(record.lifecycleEvents || []), {
        id: `evt-payment-${Date.now()}`,
        type: 'PAYMENT_CONFIRMED',
        title: 'Payment confirmed',
        description: `Sandbox payment confirmed. Transaction reference: ${transactionReference}. No real funds were moved.`,
        timestamp: paymentDate,
        actorId: currentUser?.id,
        actorName: currentUser?.fullName || 'Applicant',
        actorRole: 'citizen',
      }],
    } : record));
    return true;
  };

  const handleSelectScenario = (scenarioId: string) => {
    setSelectedApplicationId(scenarioId);
    // If switching scenario while in citizen view, align demo user
    if (scenarioId === 'app-002') {
      const mutinta = users.find((u) => u.email === 'mutinta.mweetwa@gmail.com');
      if (mutinta && currentUser?.role === 'citizen') setCurrentUser(mutinta);
    } else if (scenarioId === 'app-001') {
      const kondwani = users.find((u) => u.email === 'k.phiri@outlook.com');
      if (kondwani && currentUser?.role === 'citizen') setCurrentUser(kondwani);
    }
  };

  // View changes are permission-checked; permissions are also enforced again at each state-changing action.
  useEffect(() => {
    if (currentUser && !canAccessView(currentUser, currentView)) {
      setCurrentView(currentUser.role === 'admin' ? 'admin' : (currentUser.role === 'officer' || currentUser.role === 'supervisor') ? 'officer' : 'citizen');
    }
  }, [currentUser, currentView, setCurrentView]);

  if (!currentUser) {
    return (
      <div className="min-h-screen flex flex-col font-sans bg-[#f8fafc] text-slate-900">
        <WelcomePage
          onOpenLogin={() => {
            setAuthModalPrompt(undefined);
            setAuthModalMode('login');
          }}
          onOpenSignUp={() => {
            setAuthModalPrompt('Please sign in with your registered OPAS account.');
            setAuthModalMode('login');
          }}
          applications={applications}
          onSelectApplication={(app) => setSelectedApplicationId(app.id)}
          onApplyNow={() => {
            setCitizenInitialTab('apply');
            setAuthModalPrompt('Please sign in with your registered OPAS account to begin your new passport application.');
            setAuthModalMode('login');
          }}
          onTrackApplication={(appId?: string) => {
            setCitizenInitialTab('monitoring');
            if (appId) {
              setSelectedApplicationId(appId);
            }
            setAuthModalPrompt('Please sign in to view your application status and secure messages.');
            setAuthModalMode('login');
          }}
          onQuickEnterCitizen={(scenarioId?: string) => {
            setCitizenInitialTab('status');
            if (scenarioId) {
              setSelectedApplicationId(scenarioId);
            }
            setAuthModalPrompt('Please sign in with your registered OPAS account to access your dashboard.');
            setAuthModalMode('login');
          }}
          onQuickEnterOfficer={() => {
            setAuthModalPrompt('Passport Office access requires an active registered staff account.');
            setAuthModalMode('login');
          }}
        />
        {authModalMode && (
          <AuthPortal
            users={users}
            onLogin={(user) => {
              setAuthModalMode(null);
              setAuthModalPrompt(undefined);
              handleLogin(user);
            }}
            onRegisterCitizen={handleRegisterCitizen}
            initialMode={authModalMode}
            isModal={true}
            promptMessage={authModalPrompt}
            onClose={() => {
              setAuthModalMode(null);
              setAuthModalPrompt(undefined);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
      currentView === 'officer' && currentUser ? 'bg-[#18202c] text-slate-200' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Official MoHAIS Top Header */}
      {!isCompactCitizenDashboard && <Header
        currentUser={currentUser}
        currentView={currentView}
        onViewChange={(view) => {
          if (canAccessView(currentUser, view)) setCurrentView(view);
        }}
        onOpenAssistant={() => setIsAssistantOpen(true)}
        onSelectScenario={handleSelectScenario}
        activeScenarioId={selectedApplicationId}
        onLogout={handleLogout}
        onOpenEOIModal={() => setIsEOIModalOpen(true)}
        onOpenPhoneSimulator={() => setIsPhoneSimOpen(true)}
      />}

      {/* Main Content Area */}
      <main className={`flex-1 w-full mx-auto transition-all ${
        isCompactCitizenDashboard
          ? ''
          : currentView === 'officer'
          ? 'max-w-[1750px] px-2 sm:px-4 lg:px-6 py-4'
          : 'max-w-7xl px-4 sm:px-8 py-6'
      }`}>
        {currentView === 'admin' ? (
          /* MoHAIS Administrator Dashboard (Officer Provisioning & System Management) */
          <AdminDashboard
            users={users}
            onAddOfficer={(officer) => {
              if (hasPermission(currentUser, 'user:manage')) handleAddOfficer(officer);
            }}
            onUpdateOfficerStatus={(id, status) => {
              if (hasPermission(currentUser, 'user:manage')) handleUpdateOfficerStatus(id, status);
            }}
            onResetPassword={(id, password) => {
              if (hasPermission(currentUser, 'user:manage')) handleResetPassword(id, password);
            }}
            onViewOfficerConsole={() => setCurrentView('officer')}
          />
        ) : currentView === 'officer' && currentUser.role === 'supervisor' ? (
          <SupervisorDashboard applications={applications} onSelectApplication={(app) => setSelectedApplicationId(app.id)} />
        ) : currentView === 'officer' ? (
          /* Passport Officer Operational Console (completely isolated from Citizen Portal) */
          <OfficerDashboard
            applications={applications}
            onUpdateStatus={handleUpdateStatus}
            onAddNotification={handleAddNotification}
            onUpdateNotificationDelivery={handleUpdateNotificationDelivery}
            onSelectApplication={(app) => {
              // Officer stays strictly on officer dashboard
              setSelectedApplicationId(app.id);
            }}
            onLogout={handleLogout}
            selectedAppForCitizenView={selectedApplication}
            onOpenAssistant={() => setIsAssistantOpen(true)}
          />
        ) : (
          /* Citizen Portal */
          <CitizenPortal
            applications={applications}
            selectedApplication={selectedApplication}
            onSelectApplication={(app) => setSelectedApplicationId(app.id)}
            onUpdateStatus={handleUpdateStatus}
            onAddNewApplication={handleAddNewApplication}
            onConfirmSandboxPayment={handleConfirmSandboxPayment}
            onOpenAssistant={() => setIsAssistantOpen(true)}
            onAddNotification={handleAddNotification}
            currentUser={currentUser}
            onLogout={handleLogout}
            onViewChange={(view) => setCurrentView(view)}
            onOpenEOIModal={() => setIsEOIModalOpen(true)}
            initialTab={citizenInitialTab}
          />
        )}
      </main>

      {/* Persistent AI Assistant Widget (available on citizen view EXCEPT when already viewing the Guidance screen) */}
      {currentUser && currentView !== 'officer' && !isGuidanceScreen && !isCompactCitizenDashboard && (
        <AIGuidanceChat isFullWidth={false} />
      )}

      {/* Floating "Need help?" Button in Bottom-Right
          - Visible on citizen portal when logged in
          - Hidden on officer dashboard & admin console
          - Features a top notification badge when unread alerts exist
      */}
      {currentUser && currentView !== 'officer' && !isGuidanceScreen && !isAssistantOpen && !isCompactCitizenDashboard && (
        <button
          onClick={() => setIsAssistantOpen(true)}
          className="fixed bottom-5 right-5 z-40 bg-emerald-800 hover:bg-emerald-900 text-white rounded-full pl-3.5 pr-4.5 py-3 shadow-xl hover:shadow-2xl flex items-center gap-2.5 text-xs font-bold transition-all duration-200 hover:scale-105 cursor-pointer border border-emerald-700/80 ring-2 ring-emerald-500/20 group"
          title="Need help? Open 24/7 MoHAIS Passport Assistant"
          aria-label="Need help? Open 24/7 MoHAIS Passport Assistant"
        >
          <div className="relative flex items-center justify-center">
            <div className="w-6 h-6 rounded-full bg-emerald-700 flex items-center justify-center text-emerald-200 group-hover:text-white transition-colors">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-red-500 rounded-full border-2 border-emerald-800 animate-pulse" />
            )}
          </div>
          <span className="tracking-wide">Need help?</span>
          {unreadNotificationsCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold shadow-xs">
              {unreadNotificationsCount}
            </span>
          )}
        </button>
      )}

      {/* Official UNIPODS EOI Proposal Document Modal */}
      {isEOIModalOpen && (
        <EOIDocumentModal onClose={() => setIsEOIModalOpen(false)} />
      )}

      {/* Citizen Mobile Phone & SMS Simulator Modal */}
      {isPhoneSimOpen && (
        <CitizenPhoneSimulatorModal
          application={selectedApplication}
          onClose={() => setIsPhoneSimOpen(false)}
        />
      )}

      {/* Official Government Footer */}
      {!isCompactCitizenDashboard && <footer className={`mt-auto border-t py-6 text-sm transition-colors ${
        currentView === 'officer' && currentUser
          ? 'border-[#283548] bg-[#141b26] text-slate-300'
          : 'border-slate-200 bg-white text-slate-600'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-emerald-800 flex items-center justify-center text-white shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <span className={`font-semibold block ${currentView === 'officer' && currentUser ? 'text-slate-200' : 'text-slate-800'}`}>
                Republic of Zambia · Ministry of Home Affairs and Internal Security (MoHAIS)
              </span>
              <p className={`text-xs ${currentView === 'officer' && currentUser ? 'text-slate-400' : 'text-slate-500'}`}>
                {currentView === 'officer' && currentUser
                  ? 'Online Passport Application System (OPAS) · Department of National Registration, Passport and Citizenship'
                  : 'Online Passport Application System (OPAS) Enhancement Pilot · UNIPODS AI for Public Good Challenge'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-600">
            <span>Passport Office, Makishi Road, Lusaka</span>
            <span aria-hidden="true">·</span>
            <span>Support: +260 211 252 649</span>
            <span aria-hidden="true">·</span>
            <span>opas-support@mohais.gov.zm</span>
          </div>
        </div>
      </footer>}
    </div>
  );
}

export default function App() {
  const [users, setUsers] = useState<UserAccount[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null); // Displays Welcome Page by default
  const [currentView, setCurrentView] = useState<'citizen' | 'officer' | 'admin'>('citizen');
  const [applications, setApplications] = useState<PassportApplication[]>(INITIAL_APPLICATIONS);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string>('app-002');
  const [isEOIModalOpen, setIsEOIModalOpen] = useState(false);
  const [isPhoneSimOpen, setIsPhoneSimOpen] = useState(false);

  const selectedApplication =
    applications.find((a) => a.id === selectedApplicationId) || applications[0];

  return (
    <ChatProvider>
      <AppContent
        users={users}
        setUsers={setUsers}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        currentView={currentView}
        setCurrentView={setCurrentView}
        applications={applications}
        setApplications={setApplications}
        selectedApplicationId={selectedApplicationId}
        setSelectedApplicationId={setSelectedApplicationId}
        selectedApplication={selectedApplication}
        isEOIModalOpen={isEOIModalOpen}
        setIsEOIModalOpen={setIsEOIModalOpen}
        isPhoneSimOpen={isPhoneSimOpen}
        setIsPhoneSimOpen={setIsPhoneSimOpen}
      />
    </ChatProvider>
  );
}
