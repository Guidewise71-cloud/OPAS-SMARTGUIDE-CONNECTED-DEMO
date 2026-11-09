import React, { useState } from 'react';
import { usePassport } from '../../context/PassportContext';
import { PreviousPassportDetails } from '../../types/passport';
import { ArrowLeft, ArrowRight, Plane, AlertTriangle, ShieldCheck } from 'lucide-react';

interface Step3TravelHistoryProps {
  onNext: () => void;
  onBack: () => void;
}

export const Step3TravelHistory: React.FC<Step3TravelHistoryProps> = ({ onNext, onBack }) => {
  const { currentApp, updateCurrentApplication } = usePassport();

  if (!currentApp) return null;

  const isRenewalOrLost =
    currentApp.applicationType === 'RENEWAL' || currentApp.applicationType === 'REPLACEMENT_LOST';

  const [details, setDetails] = useState<PreviousPassportDetails>({
    hasPreviousPassport: isRenewalOrLost || currentApp.previousPassportDetails.hasPreviousPassport,
    passportNumber: currentApp.previousPassportDetails.passportNumber || '',
    issueDate: currentApp.previousPassportDetails.issueDate || '',
    expiryDate: currentApp.previousPassportDetails.expiryDate || '',
    issuingAuthority: currentApp.previousPassportDetails.issuingAuthority || 'Zambia Passport Office - Lusaka',
    lossReason: currentApp.previousPassportDetails.lossReason || '',
    policeReportRef: currentApp.previousPassportDetails.policeReportRef || '',
  });

  const [error, setError] = useState<string | null>(null);

  const handleNextClick = () => {
    if (isRenewalOrLost && !details.passportNumber?.trim()) {
      setError('Previous Zambian passport booklet number is required for renewal or replacement filings.');
      return;
    }
    if (currentApp.applicationType === 'REPLACEMENT_LOST' && !details.policeReportRef?.trim()) {
      setError('Zambia Police Service report reference number is mandatory for replacement passports.');
      return;
    }
    updateCurrentApplication({
      previousPassportDetails: details,
    });
    onNext();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Plane className="w-5 h-5 text-emerald-800" />
          Previous Zambian Passport History & Records
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Specify details of any prior Republic of Zambia passport booklets issued by the Chief Passport Officer.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Prior Passport Check */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <span className="text-xs font-bold text-slate-900 block">
              Have you ever held a Zambian passport booklet?
            </span>
            <span className="text-[11px] text-slate-500">
              Includes expired, damaged, or lost ordinary or diplomatic Zambian passports.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isRenewalOrLost}
              onClick={() => setDetails(prev => ({ ...prev, hasPreviousPassport: true }))}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                details.hasPreviousPassport
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Yes
            </button>
            <button
              type="button"
              disabled={isRenewalOrLost}
              onClick={() => setDetails(prev => ({ ...prev, hasPreviousPassport: false }))}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                !details.hasPreviousPassport
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              } ${isRenewalOrLost ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              No
            </button>
          </div>
        </div>

        {details.hasPreviousPassport ? (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Previous Zambian Passport Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={details.passportNumber || ''}
                  onChange={e => {
                    setDetails(prev => ({ ...prev, passportNumber: e.target.value.toUpperCase() }));
                    setError(null);
                  }}
                  placeholder="e.g. ZM-981240"
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-700 uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Issuing Passport Office / Foreign Mission
                </label>
                <input
                  type="text"
                  value={details.issuingAuthority || ''}
                  onChange={e => setDetails(prev => ({ ...prev, issuingAuthority: e.target.value }))}
                  placeholder="e.g. Lusaka Central Office / Ndola"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Date of Issue
                </label>
                <input
                  type="date"
                  value={details.issueDate || ''}
                  onChange={e => setDetails(prev => ({ ...prev, issueDate: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Date of Expiry
                </label>
                <input
                  type="date"
                  value={details.expiryDate || ''}
                  onChange={e => setDetails(prev => ({ ...prev, expiryDate: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>
            </div>

            {currentApp.applicationType === 'REPLACEMENT_LOST' && (
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Zambia Police Service Report Reference Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={details.policeReportRef || ''}
                    onChange={e => setDetails(prev => ({ ...prev, policeReportRef: e.target.value }))}
                    placeholder="e.g. ZP/LUS/CR-8941/2026 (Lusaka Central Police)"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Circumstances of Loss & Date Discovered
                  </label>
                  <textarea
                    rows={2}
                    value={details.lossReason || ''}
                    onChange={e => setDetails(prev => ({ ...prev, lossReason: e.target.value }))}
                    placeholder="Briefly state circumstances under which passport was misplaced or stolen..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-md text-xs text-emerald-900 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
            <div>
              <span className="font-semibold block">First-Time Issuance Record</span>
              <span>
                Your record will be established under the Republic of Zambia Electronic Passport Registry with biometric chip encoding.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-md transition-colors flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Personal Details
        </button>

        <button
          type="button"
          onClick={handleNextClick}
          className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-md transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <span>Continue to Document Uploads</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
