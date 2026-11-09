import React, { useRef, useState } from 'react';
import { usePassport } from '../../context/PassportContext';
import type { PassportApplication } from '../../types/passport';
import { SmartValidationPanel } from '../SmartValidationPanel';
import {
  validateApplication,
  loadValidationResult,
  type SmartValidationResult,
} from '../../services/smartValidation';
import {
  FileText,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Lock,
  Loader2,
  Sparkles,
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

  // All hooks run before any early return (Rules of Hooks).
  const [agreed, setAgreed] = useState<boolean>(currentApp?.declaration.agreed ?? false);
  const [signature, setSignature] = useState<string>(
    currentApp?.declaration.digitalSignature ||
      `${currentApp?.personalDetails.givenNames ?? ''} ${currentApp?.personalDetails.surname ?? ''}`.trim()
  );
  const [error, setError] = useState<string | null>(null);

  // Smart Validation state
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<SmartValidationResult | null>(() =>
    currentApp ? loadValidationResult(currentApp.referenceNumber) : null
  );
  const [warningsAcknowledged, setWarningsAcknowledged] = useState(false);
  const validationPanelRef = useRef<HTMLDivElement>(null);

  if (!currentApp) return null;

  const scrollToValidation = () => {
    requestAnimationFrame(() =>
      validationPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    );
  };

  // Any change to the declaration invalidates a previous warning acknowledgement.
  const resetAcknowledgement = () => {
    setWarningsAcknowledged(false);
  };

  const proceedToPayment = (declaration: PassportApplication['declaration']) => {
    updateCurrentApplication({
      declaration,
      status: 'PAYMENT_PENDING',
    });
    setError(null);
    onNext();
  };

  const handleValidateAndProceed = async () => {
    if (validating) return;

    // 1. Local declaration checks
    if (!agreed) {
      setError('You must accept the statutory sworn declaration under the Laws of Zambia to proceed.');
      return;
    }
    if (!signature.trim()) {
      setError('Digital signature (full legal name as on NRC) is required.');
      return;
    }
    setError(null);

    const declaration: PassportApplication['declaration'] = {
      agreed: true,
      digitalSignature: signature.trim(),
      signedAt: new Date().toISOString(),
    };

    // 2. Warnings already shown and acknowledged on the previous click: proceed.
    if (
      warningsAcknowledged &&
      validationResult?.status === 'PASSED_WITH_WARNINGS' &&
      validationResult.canProceed
    ) {
      proceedToPayment(declaration);
      return;
    }

    // 3. Run Smart Validation against the full application including the signed declaration.
    const appForValidation: PassportApplication = { ...currentApp, declaration };

    setValidating(true);
    setValidationError(null);
    const outcome = await validateApplication(appForValidation);
    setValidating(false);

    if (!outcome.ok) {
      setValidationResult(null);
      setValidationError(outcome.error);
      scrollToValidation();
      return;
    }

    const result = outcome.result;
    setValidationResult(result);

    // Keep the signed declaration saved, without moving to payment yet.
    updateCurrentApplication({ declaration });

    if (!result.canProceed || result.status === 'FAILED') {
      setWarningsAcknowledged(false);
      scrollToValidation();
      return;
    }

    if (result.status === 'PASSED_WITH_WARNINGS') {
      // Show warnings first; the next click proceeds.
      setWarningsAcknowledged(true);
      scrollToValidation();
      return;
    }

    // PASSED
    proceedToPayment(declaration);
  };

  const p = currentApp.personalDetails;
  const fees = currentApp.payment.breakdown;

  const hasBlockingErrors =
    !!validationResult && (!validationResult.canProceed || validationResult.status === 'FAILED');
  const awaitingWarningConfirmation =
    warningsAcknowledged && validationResult?.status === 'PASSED_WITH_WARNINGS';

  let primaryLabel = 'Validate & Proceed to ZamPay Secure Payment';
  if (validating) primaryLabel = 'Validating application…';
  else if (awaitingWarningConfirmation) primaryLabel = 'Acknowledge Warnings & Proceed to Payment';
  else if (hasBlockingErrors || validationError) primaryLabel = 'Re-validate & Proceed';

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

      {/* Smart Validation results */}
      <div ref={validationPanelRef} className="scroll-mt-6">
        <SmartValidationPanel
          result={validationResult}
          error={validationError}
          loading={validating}
          onFix={onEditSection}
        />
      </div>

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
              Green NRC: <strong>{currentApp.documents.nrcFrontBack?.name || 'Not uploaded'}</strong>
            </span>
            {currentApp.documents.nrcFrontBack
              ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              : <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />}
          </div>
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded flex items-center justify-between">
            <span className="truncate pr-2">
              Birth Cert: <strong>{currentApp.documents.birthCertificate?.name || 'Not uploaded'}</strong>
            </span>
            {currentApp.documents.birthCertificate
              ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              : <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />}
          </div>
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded flex items-center justify-between">
            <span className="truncate pr-2">
              Photo: <strong>{currentApp.documents.passportPhoto?.name || 'Not uploaded'}</strong>
            </span>
            {currentApp.documents.passportPhoto
              ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              : <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />}
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
              resetAcknowledgement();
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
              onChange={e => {
                setSignature(e.target.value);
                setError(null);
                resetAcknowledgement();
              }}
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

      {/* Smart Validation notice */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-700 flex items-start gap-2">
        <Sparkles className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" />
        <span>
          When you select <strong>Validate &amp; Proceed</strong>, SmartGuide checks your whole application for errors before payment.
          If anything needs correcting, use the <strong>Fix</strong> buttons to return to the right step.
        </span>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={onBack}
          disabled={validating}
          className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-md transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Documents
        </button>

        <button
          type="button"
          onClick={handleValidateAndProceed}
          disabled={validating}
          aria-busy={validating}
          className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-md transition-colors flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-60 disabled:cursor-wait"
        >
          {validating
            ? <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
            : <Lock className="w-4 h-4 text-amber-400" />}
          <span>{primaryLabel}</span>
          {!validating && <ArrowRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
