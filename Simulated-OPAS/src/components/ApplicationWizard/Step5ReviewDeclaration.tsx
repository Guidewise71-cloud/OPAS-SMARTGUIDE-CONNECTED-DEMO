import React, { useState } from 'react';
import { usePassport } from '../../context/PassportContext';
import {
  FileText,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Lock,
} from 'lucide-react';

interface Step5ReviewDeclarationProps {
  onNext: () => void;
  onBack: () => void;
  onEditSection: (step: number) => void;
}

export const Step5ReviewDeclaration: React.FC<Step5ReviewDeclarationProps> = ({
  onNext,
  onBack,
  onEditSection,
}) => {
  const { currentApp, updateCurrentApplication } = usePassport();

  if (!currentApp) return null;

  const [agreed, setAgreed] = useState(currentApp.declaration.agreed);
  const [signature, setSignature] = useState(
    currentApp.declaration.digitalSignature ||
      `${currentApp.personalDetails.givenNames} ${currentApp.personalDetails.surname}`.trim()
  );
  const [error, setError] = useState<string | null>(null);

  const handleProceed = () => {
    if (!agreed) {
      setError('You must accept the statutory sworn declaration under the Laws of Zambia to proceed.');
      return;
    }
    if (!signature.trim()) {
      setError('Digital signature (full legal name as on NRC) is required.');
      return;
    }

    updateCurrentApplication({
      declaration: {
        agreed: true,
        digitalSignature: signature.trim(),
        signedAt: new Date().toISOString(),
      },
      status: 'PAYMENT_PENDING',
    });
    setError(null);
    onNext();
  };

  const p = currentApp.personalDetails;
  const fees = currentApp.payment.breakdown;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-800" />
              Review Zambian Passport Application & Sworn Oath
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Verify your biographical credentials, Green NRC records, and execute the statutory oath under the Passports Act (Cap 103).
            </p>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-slate-500 block">Zambia OPAS Ref</span>
            <span className="text-sm font-mono font-bold text-slate-950">
              {currentApp.referenceNumber}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Review Section 1: Passport Type */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            1. Passport Category & Booklet Capacity
          </span>
          <button
            type="button"
            onClick={() => onEditSection(1)}
            className="text-xs text-emerald-800 hover:text-emerald-900 font-semibold cursor-pointer"
          >
            Edit
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-slate-500 block">Category:</span>
            <span className="font-semibold text-slate-900">{currentApp.applicationType}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Booklet Size:</span>
            <span className="font-semibold text-slate-900">
              {currentApp.bookletType === 'STANDARD_32' ? 'Standard 32 Pages' : 'Frequent Traveler 48 Pages'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Processing Urgency:</span>
            <span className="font-semibold text-slate-900">{currentApp.processingSpeed}</span>
          </div>
        </div>
      </div>

      {/* Review Section 2: Personal Details Summary */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            2. Personal Details, NRC & Ancestral Heritage
          </span>
          <button
            type="button"
            onClick={() => onEditSection(2)}
            className="text-xs text-emerald-800 hover:text-emerald-900 font-semibold cursor-pointer"
          >
            Edit
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-500 block">Full Legal Name:</span>
            <span className="font-semibold text-slate-900">{p.surname}, {p.givenNames}</span>
          </div>
          <div>
            <span className="text-slate-500 block">National Registration Card (NRC):</span>
            <span className="font-mono font-bold text-emerald-900">{p.nrcNumber}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Date of Birth:</span>
            <span className="font-semibold text-slate-900">{p.dateOfBirth}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Gender / Status:</span>
            <span className="font-semibold text-slate-900">{p.gender} · {p.maritalStatus}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Place of Birth:</span>
            <span className="font-semibold text-slate-900">{p.placeOfBirthTown}, {p.placeOfBirthProvince}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Village & Chief:</span>
            <span className="font-semibold text-slate-900">{p.village} (Chief {p.chief})</span>
          </div>
          <div>
            <span className="text-slate-500 block">District of Origin:</span>
            <span className="font-semibold text-slate-900">{p.districtOfOrigin}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Citizenship Acquired By:</span>
            <span className="font-semibold text-slate-900">{p.citizenshipAcquiredBy}</span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-500 block">Father & Mother:</span>
            <span className="font-semibold text-slate-900">
              Father: {p.fatherFullName} ({p.fatherNrc || 'N/A'}) · Mother: {p.motherFullName} ({p.motherNrc || 'N/A'})
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Residential & Mobile:</span>
            <span className="font-semibold text-slate-900">
              {p.residentialAddress}, {p.townCity}, {p.province} · {p.mobilePhone}
            </span>
          </div>
        </div>
      </div>

      {/* Review Section 3: Uploaded Documents */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            3. Attached Government Document Scans
          </span>
          <button
            type="button"
            onClick={() => onEditSection(4)}
            className="text-xs text-emerald-800 hover:text-emerald-900 font-semibold cursor-pointer"
          >
            Edit
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded flex items-center justify-between">
            <span className="truncate pr-2">
              Green NRC: <strong>{currentApp.documents.nrcFrontBack?.name}</strong>
            </span>
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          </div>
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded flex items-center justify-between">
            <span className="truncate pr-2">
              Birth Cert: <strong>{currentApp.documents.birthCertificate?.name}</strong>
            </span>
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          </div>
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded flex items-center justify-between">
            <span className="truncate pr-2">
              Photo: <strong>{currentApp.documents.passportPhoto?.name}</strong>
            </span>
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          </div>
        </div>
      </div>

      {/* Total Statutory Fee in ZMW */}
      <div className="p-4 bg-emerald-950 text-white rounded-lg flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-amber-400">Total Statutory Application Fee</span>
          <p className="text-[11px] text-emerald-200">
            Treasury Single Account · Ministry of Home Affairs and Internal Security
          </p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold font-mono text-white">
            K{fees.total.toFixed(2)} <span className="text-xs font-sans text-amber-400">ZMW</span>
          </span>
        </div>
      </div>

      {/* Zambian Sworn Oath & Digital Signature */}
      <div className="bg-emerald-50/50 border border-emerald-300 rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-800" />
          <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
            Section 5: Statutory Sworn Declaration (Passports Act Cap 103)
          </h3>
        </div>

        <div className="text-xs text-slate-800 leading-relaxed bg-white/80 p-4 rounded border border-emerald-200 font-serif">
          "I solemnly declare that I am a citizen of the Republic of Zambia by birth/descent/registration; that the statements made on this form are true in every respect; that the photograph submitted herewith is a true likeness of myself; and that I have not lost or renounced my Zambian citizenship. I understand that knowingly furnishing false information to obtain a Zambian passport is an offence punishable by imprisonment under Section 8 of the Passports Act."
        </div>

        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="legalConsent"
            checked={agreed}
            onChange={e => {
              setAgreed(e.target.checked);
              setError(null);
            }}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-700 cursor-pointer"
          />
          <label htmlFor="legalConsent" className="text-xs text-slate-800 cursor-pointer select-none">
            <strong>I solemnly declare and affirm the statutory statement above.</strong> I authorize the Department of National Registration, Passport and Citizenship to verify my NRC and civil registry records.
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-medium text-slate-800 mb-1">
              Digital Signature (Full Legal Name as on NRC) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={signature}
              onChange={e => setSignature(e.target.value)}
              placeholder="e.g. Chileshe Natasha Mwape"
              className="w-full px-3 py-2 text-sm font-serif italic border border-slate-300 bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-800 mb-1">
              Date of Digital Execution
            </label>
            <input
              type="text"
              readOnly
              value={new Date().toLocaleDateString('en-GB', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
              className="w-full px-3 py-2 text-sm border border-slate-200 bg-slate-50 text-slate-600 rounded-md font-mono"
            />
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-md transition-colors flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Documents
        </button>

        <button
          type="button"
          onClick={handleProceed}
          className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-md transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <Lock className="w-4 h-4 text-amber-400" />
          <span>Proceed to ZamPay Secure Payment Gateway</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
