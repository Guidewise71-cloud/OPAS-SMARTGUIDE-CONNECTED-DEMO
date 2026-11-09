import React from 'react';
import { usePassport } from '../../context/PassportContext';
import { ApplicationType, BookletType, ProcessingSpeed } from '../../types/passport';
import { calculatePassportFees } from '../../data/mockData';
import { BookOpen, Zap, Clock, Shield, ArrowRight } from 'lucide-react';

interface Step1CategoryProps {
  onNext: () => void;
}

export const Step1Category: React.FC<Step1CategoryProps> = ({ onNext }) => {
  const { currentApp, updateCurrentApplication } = usePassport();

  if (!currentApp) return null;

  const currentType = currentApp.applicationType;
  const currentBooklet = currentApp.bookletType;
  const currentSpeed = currentApp.processingSpeed;

  const fees = calculatePassportFees(currentBooklet, currentSpeed);

  const handleTypeChange = (type: ApplicationType) => {
    updateCurrentApplication({
      applicationType: type,
      previousPassportDetails: {
        ...currentApp.previousPassportDetails,
        hasPreviousPassport: type === 'RENEWAL' || type === 'REPLACEMENT_LOST',
      },
    });
  };

  const handleBookletChange = (booklet: BookletType) => {
    updateCurrentApplication({ bookletType: booklet });
  };

  const handleSpeedChange = (speed: ProcessingSpeed) => {
    updateCurrentApplication({ processingSpeed: speed });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Interactive Title Banner: Clicking triggers starting passport application */}
      <div
        onClick={onNext}
        className="p-5 bg-white hover:bg-emerald-50/40 border-2 border-emerald-600/30 hover:border-emerald-700 rounded-xl transition-all shadow-xs hover:shadow-md cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        title="Click here to start applying for passport"
      >
        <div>
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200 inline-block mb-1">
            Step 1 of 7 · Category &amp; Booklet Choice
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 group-hover:text-emerald-800 transition-colors flex items-center gap-2">
            Select Zambian Passport Type &amp; Service Urgency
            <ArrowRight className="w-5 h-5 text-emerald-700 group-hover:translate-x-1 transition-transform" />
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Click here or choose your category below to trigger and start applying for your Zambian passport.
          </p>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          className="px-5 py-2.5 bg-emerald-800 group-hover:bg-emerald-900 text-white font-bold text-xs rounded-md transition-colors flex items-center justify-center gap-2 shrink-0 shadow-sm cursor-pointer"
        >
          <span>Start Applying for Passport</span>
          <ArrowRight className="w-4 h-4 text-amber-300" />
        </button>
      </div>

      {/* 1. Application Type Selection */}
      <div className="space-y-3">
        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
          1. Passport Category <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            {
              id: 'NEW' as ApplicationType,
              title: 'First-Time Adult Issuance',
              desc: 'Never held a Zambian e-passport before or applying as an adult with a green NRC.',
              badge: 'First Issuance',
            },
            {
              id: 'RENEWAL' as ApplicationType,
              title: 'Passport Renewal',
              desc: 'Expired or expiring Zambian machine-readable passport booklet.',
              badge: 'Standard Renewal',
            },
            {
              id: 'REPLACEMENT_LOST' as ApplicationType,
              title: 'Replacement (Lost / Damaged)',
              desc: 'Passport was misplaced, stolen, or damaged. Requires police report.',
              badge: 'Police Report Req.',
            },
          ].map(opt => {
            const isSelected = currentType === opt.id;
            return (
              <div
                key={opt.id}
                onClick={() => handleTypeChange(opt.id)}
                className={`p-4 rounded-lg border text-left cursor-pointer transition-all ${
                  isSelected
                    ? 'border-emerald-800 bg-emerald-50/50 ring-2 ring-emerald-700 ring-offset-1'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-900">{opt.title}</span>
                  <span className="text-[10px] text-slate-500 font-medium">{opt.badge}</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{opt.desc}</p>

                {isSelected && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNext();
                    }}
                    className="mt-3 w-full py-1.5 px-3 bg-emerald-800 hover:bg-emerald-900 text-white text-[11px] font-bold rounded flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <span>Start Applying with this Category</span>
                    <ArrowRight className="w-3 h-3 text-amber-300" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Booklet Size */}
      <div className="space-y-3">
        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
          2. Passport Booklet Capacity <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div
            onClick={() => handleBookletChange('STANDARD_32')}
            className={`p-4 rounded-lg border text-left cursor-pointer transition-all ${
              currentBooklet === 'STANDARD_32'
                ? 'border-emerald-800 bg-emerald-50/50 ring-2 ring-emerald-700 ring-offset-1'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-800" />
                <span className="text-xs font-bold text-slate-900">Standard 32 Pages</span>
              </div>
              <span className="text-xs font-mono font-bold text-slate-900">K500.00 ZMW</span>
            </div>
            <p className="text-xs text-slate-600">
              Standard Zambian ordinary e-passport for tourists and general international travel. 10-year validity.
            </p>
          </div>

          <div
            onClick={() => handleBookletChange('FREQUENT_48')}
            className={`p-4 rounded-lg border text-left cursor-pointer transition-all ${
              currentBooklet === 'FREQUENT_48'
                ? 'border-emerald-800 bg-emerald-50/50 ring-2 ring-emerald-700 ring-offset-1'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-700" />
                <span className="text-xs font-bold text-slate-900">Frequent Traveler 48 Pages</span>
              </div>
              <span className="text-xs font-mono font-bold text-slate-900">K700.00 ZMW</span>
            </div>
            <p className="text-xs text-slate-600">
              Extended 48-page booklet for business executives and cross-border commercial travelers.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Processing Speed */}
      <div className="space-y-3">
        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
          3. Processing Urgency & Dispatch <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            {
              id: 'STANDARD' as ProcessingSpeed,
              title: 'Standard Service',
              time: '14 - 21 Working Days',
              fee: 'Included (K0)',
              icon: Clock,
              note: 'Standard production batch',
            },
            {
              id: 'EXPRESS' as ProcessingSpeed,
              title: 'Express Fast-Track',
              time: '3 - 5 Working Days',
              fee: '+ K300.00 ZMW',
              icon: Zap,
              note: 'Priority queue verification',
            },
            {
              id: 'URGENT_24H' as ProcessingSpeed,
              title: 'Urgent 24-48H Emergency',
              time: '24 - 48 Hours',
              fee: '+ K600.00 ZMW',
              icon: Shield,
              note: 'Emergency medical / diplomatic',
            },
          ].map(tier => {
            const isSelected = currentSpeed === tier.id;
            const Icon = tier.icon;
            return (
              <div
                key={tier.id}
                onClick={() => handleSpeedChange(tier.id)}
                className={`p-4 rounded-lg border text-left cursor-pointer transition-all ${
                  isSelected
                    ? 'border-emerald-800 bg-emerald-50/50 ring-2 ring-emerald-700 ring-offset-1'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Icon className="w-4 h-4 text-slate-800" />
                    <span className="text-xs font-bold text-slate-900">{tier.title}</span>
                  </div>
                </div>
                <div className="text-sm font-semibold text-slate-900 mb-1">{tier.time}</div>
                <div className="text-xs font-mono font-bold text-emerald-800 mb-1">{tier.fee}</div>
                <p className="text-[11px] text-slate-500">{tier.note}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fee Calculation Summary Box in ZMW */}
      <div className="p-4 bg-emerald-950 text-white rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-emerald-900">
        <div>
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
            Statutory Ministry of Home Affairs Fee Breakdown
          </span>
          <div className="flex flex-wrap items-center gap-3 text-xs text-emerald-100 mt-1">
            <span>Passport Booklet: <strong className="font-mono text-white">K{(fees.baseFee + fees.bookletFee).toFixed(2)}</strong></span>
            <span aria-hidden="true">·</span>
            <span>Urgency Surcharge: <strong className="font-mono text-white">K{fees.speedFee.toFixed(2)}</strong></span>
            <span aria-hidden="true">·</span>
            <span>Biometric Capture Levy: <strong className="font-mono text-white">K{fees.biometricProcessingFee.toFixed(2)}</strong></span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[11px] text-emerald-300">Total Statutory Payable</div>
          <div className="text-2xl font-bold font-mono text-white">
            K{fees.total.toFixed(2)} <span className="text-xs font-sans text-amber-400">ZMW</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-end pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={onNext}
          className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-md transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <span>Continue to Personal & NRC Details</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
