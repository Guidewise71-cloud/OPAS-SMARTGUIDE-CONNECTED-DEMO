import React from 'react';
import { Check } from 'lucide-react';

interface WizardProgressProps {
  currentStep: number;
  onStepClick: (step: number) => void;
  maxAccessibleStep: number;
}

const STEPS = [
  { step: 1, title: 'Passport Type', subtitle: 'Category & Speed' },
  { step: 2, title: 'Personal Details', subtitle: 'Mandatory Identity' },
  { step: 3, title: 'Travel & History', subtitle: 'Citizenship & Prior Passports' },
  { step: 4, title: 'Upload Documents', subtitle: 'Biometric Photo & Records' },
  { step: 5, title: 'Review & Declare', subtitle: 'Legal Sworn Oath' },
  { step: 6, title: 'Payment Gateway', subtitle: 'Secure Fee Clearance' },
  { step: 7, title: 'Biometrics & Slip', subtitle: 'Center Booking & Voucher' },
];

export const WizardProgress: React.FC<WizardProgressProps> = ({
  currentStep,
  onStepClick,
  maxAccessibleStep,
}) => {
  return (
    <div className="bg-white border-b border-slate-200 py-3.5 px-4 sm:px-8 shadow-xs">
      <div className="max-w-6xl mx-auto">
        <div className="hidden lg:grid lg:grid-cols-7 gap-2">
          {STEPS.map(s => {
            const isCompleted = s.step < currentStep;
            const isCurrent = s.step === currentStep;
            const isClickable = s.step <= maxAccessibleStep;

            return (
              <button
                key={s.step}
                type="button"
                onClick={() => isClickable && onStepClick(s.step)}
                disabled={!isClickable}
                className={`text-left p-2 rounded transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-slate-900 text-white shadow-xs'
                    : isCompleted
                    ? 'hover:bg-slate-50 text-slate-800'
                    : 'opacity-50 cursor-not-allowed text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isCurrent
                        ? 'bg-amber-400 text-slate-950'
                        : isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isCompleted ? <Check className="w-3 h-3 stroke-[3]" /> : s.step}
                  </div>
                  <span
                    className={`text-xs font-semibold truncate ${
                      isCurrent ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {s.title}
                  </span>
                </div>
                <p
                  className={`text-[10px] truncate pl-7 ${
                    isCurrent ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  {s.subtitle}
                </p>
              </button>
            );
          })}
        </div>

        {/* Mobile / Tablet Compact Step Bar */}
        <div className="lg:hidden flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
              {currentStep}
            </span>
            <div>
              <div className="text-xs font-bold text-slate-900">
                Step {currentStep} of 7: {STEPS[currentStep - 1]?.title}
              </div>
              <div className="text-[10px] text-slate-500">
                {STEPS[currentStep - 1]?.subtitle}
              </div>
            </div>
          </div>
          <span className="text-xs font-medium text-slate-500 font-mono">
            {Math.round((currentStep / 7) * 100)}% Complete
          </span>
        </div>
      </div>
    </div>
  );
};
