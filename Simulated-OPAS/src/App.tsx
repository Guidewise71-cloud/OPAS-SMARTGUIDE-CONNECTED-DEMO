import React, { useEffect, useState } from 'react';
import { PassportProvider, usePassport } from './context/PassportContext';
import { Header } from './components/Header';
import { AuthModal } from './components/AuthModal';
import { LoginPage } from './components/LoginPage';
import { RegisterPage } from './components/RegisterPage';
import { ApplicantDashboard } from './components/ApplicantDashboard';
import {
  AiApplicationAssistant,
  AI_ASSISTANT_ACTOR,
  buildAiPrefillUpdates,
  type AiApplicationDraft,
} from './components/AiApplicationAssistant';
import { WizardProgress } from './components/ApplicationWizard/WizardProgress';
import { Step1Category } from './components/ApplicationWizard/Step1Category';
import { Step2PersonalDetails } from './components/ApplicationWizard/Step2PersonalDetails';
import { Step3TravelHistory } from './components/ApplicationWizard/Step3TravelHistory';
import { Step4Documents } from './components/ApplicationWizard/Step4Documents';
import { Step5ReviewDeclaration } from './components/ApplicationWizard/Step5ReviewDeclaration';
import { Step6Payment } from './components/ApplicationWizard/Step6Payment';
import { Step7Appointment } from './components/ApplicationWizard/Step7Appointment';
import { ArrowLeft, Bot, Loader2 } from 'lucide-react';

const OPASAppContent: React.FC = () => {
  const {
    currentUser,
    currentApp,
    setCurrentAppId,
    startNewApplication,
    updateCurrentApplication,
    setIsAuthModalOpen,
    setAuthModalMode,
    authPageMode,
    setAuthPageMode,
  } = usePassport();

  // AI-Assisted Application: draft waiting to be written into the newly created application.
  const [pendingPrefill, setPendingPrefill] = useState<{ appId: string; draft: AiApplicationDraft } | null>(null);

  const handleStartNew = () => {
    if (!currentUser) {
      setAuthPageMode('REGISTER');
      setAuthModalMode('REGISTER');
      return;
    }
    const newApp = startNewApplication('NEW');
    setCurrentAppId(newApp.id);
  };

  const handleAiApply = (draft: AiApplicationDraft) => {
    if (!currentUser) return;
    const newApp = startNewApplication(draft.applicationType || 'NEW');
    setCurrentAppId(newApp.id);
    setPendingPrefill({ appId: newApp.id, draft });
  };

  // Once the new application is the current one, write the AI draft into it.
  // The wizard steps are not rendered until this is done, so they mount with the filled values.
  useEffect(() => {
    if (!pendingPrefill || !currentApp || currentApp.id !== pendingPrefill.appId) return;
    updateCurrentApplication(buildAiPrefillUpdates(currentApp, pendingPrefill.draft));
    setPendingPrefill(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPrefill, currentApp]);

  const handleResumeApp = (appId: string) => {
    setCurrentAppId(appId);
  };

  const currentStep = currentApp?.currentStep || 1;
  const isApplyingAiPrefill = !!pendingPrefill && currentApp?.id === pendingPrefill.appId;
  const wasAiPrefilled = !!currentApp?.statusHistory.some(entry => entry.updatedBy === AI_ASSISTANT_ACTOR);

  const goToStep = (step: number) => {
    if (!currentApp) return;
    updateCurrentApplication({ currentStep: step });
  };

  const nextStep = () => {
    if (!currentApp) return;
    const next = Math.min(currentStep + 1, 7);
    updateCurrentApplication({ currentStep: next });
  };

  const prevStep = () => {
    if (!currentApp) return;
    const prev = Math.max(currentStep - 1, 1);
    updateCurrentApplication({ currentStep: prev });
  };

  const getMaxAccessibleStep = (): number => {
    if (!currentApp) return 1;
    if (
      currentApp.status === 'BIOMETRICS_SCHEDULED' ||
      currentApp.status === 'PAID_UNSUBMITTED' ||
      currentApp.status === 'REVERTED_ACTION_REQUIRED' ||
      currentApp.payment.status === 'PAID'
    ) {
      return 7;
    }
    if (currentApp.status === 'PAYMENT_PENDING') {
      return 6;
    }
    return 5;
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <Header />
      <AuthModal />

      {/* Main Container */}
      <main className="flex-1 pb-16">
        {!currentUser ? (
          /* Gated: Applicant MUST log in or create an account first */
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
            {authPageMode === 'LOGIN' ? (
              <LoginPage onSwitchToRegister={() => setAuthPageMode('REGISTER')} />
            ) : (
              <RegisterPage onSwitchToLogin={() => setAuthPageMode('LOGIN')} />
            )}
          </div>
        ) : currentApp ? (
          /* Active Application Multi-Step Form */
          <div className="space-y-6">
            {/* Back to Applications Link */}
            <div className="no-print bg-white border-b border-slate-200 py-2.5 px-4 sm:px-8">
              <div className="max-w-6xl mx-auto flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentAppId(null)}
                  className="text-xs text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to My Applications
                </button>

                <div className="flex items-center gap-2 text-xs font-mono text-slate-600">
                  <span className="hidden sm:inline">Application Reference:</span>
                  <strong className="text-slate-900">{currentApp.referenceNumber}</strong>
                </div>
              </div>
            </div>

            {/* Multi-Step Indicator */}
            <div className="no-print">
              <WizardProgress
                currentStep={currentStep}
                onStepClick={goToStep}
                maxAccessibleStep={getMaxAccessibleStep()}
              />
            </div>

            {/* AI pre-fill notice */}
            {wasAiPrefilled && !isApplyingAiPrefill && currentStep <= 5 && (
              <div className="no-print px-4 sm:px-8 max-w-6xl mx-auto">
                <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg flex items-start gap-2 text-xs text-sky-900">
                  <Bot className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
                  <span>
                    This form was pre-filled by the AI-Assisted Application from your answers. Check every field and
                    correct anything that is wrong before you sign the declaration and pay. Documents still need to be
                    uploaded by you.
                  </span>
                </div>
              </div>
            )}

            {/* Form Step Bodies */}
            <div className="px-4 sm:px-8 max-w-6xl mx-auto">
              {isApplyingAiPrefill ? (
                <div className="bg-white border border-slate-200 rounded-xl p-12 flex flex-col items-center gap-3 text-sm text-slate-600">
                  <Loader2 className="w-6 h-6 animate-spin text-sky-700" />
                  Filling your application form…
                </div>
              ) : (
                <>
                  {currentStep === 1 && <Step1Category onNext={nextStep} />}

                  {currentStep === 2 && (
                    <Step2PersonalDetails onNext={nextStep} onBack={prevStep} />
                  )}

                  {currentStep === 3 && (
                    <Step3TravelHistory onNext={nextStep} onBack={prevStep} />
                  )}

                  {currentStep === 4 && (
                    <Step4Documents onNext={nextStep} onBack={prevStep} />
                  )}

                  {currentStep === 5 && (
                    <Step5ReviewDeclaration
                      onNext={nextStep}
                      onBack={prevStep}
                      onEditSection={step => goToStep(step)}
                    />
                  )}

                  {currentStep === 6 && (
                    <Step6Payment
                      onPaymentSuccess={() => goToStep(7)}
                      onBack={prevStep}
                    />
                  )}

                  {currentStep === 7 && (
                    <Step7Appointment
                      onViewDashboard={() => setCurrentAppId(null)}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          /* Logged In: Citizen Dashboard */
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
            <div className="max-w-6xl mx-auto">
              <AiApplicationAssistant onApply={handleAiApply} />
            </div>
            <ApplicantDashboard
              onStartNew={handleStartNew}
              onResumeApp={handleResumeApp}
            />
          </div>
        )}
      </main>

      {/* Official Government of Zambia Footer */}
      <footer className="no-print bg-slate-900 text-slate-400 border-t border-slate-800 text-xs py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🇿🇲</span>
            <div>
              <p className="text-slate-200 font-bold">
                Republic of Zambia · Online Passport Application System (OPAS)
              </p>
              <p className="text-[11px] text-slate-500">
                Department of National Registration, Passport and Citizenship · Ministry of Home Affairs and Internal Security
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-500">
            <span>Passports Act (Cap 103)</span>
            <span aria-hidden="true">·</span>
            <span>ICAO 9303 Compliant</span>
            <span aria-hidden="true">·</span>
            <span>ZamPay Single Treasury Account</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <PassportProvider>
      <OPASAppContent />
    </PassportProvider>
  );
}
