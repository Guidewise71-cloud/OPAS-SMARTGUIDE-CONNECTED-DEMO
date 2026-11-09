import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Shield,
  CheckCircle2,
  Building2,
  Sparkles,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { PassportApplication } from '../../types/passport';

export interface CaseDetailsState {
  caseNumber: string;
  creationDate: string;
  agency: string;
  province: string;
  district: string;
  interviewLocation: string;
  serviceName: string;
  serviceCategory: string;
  serviceType: string;
  filingOnBehalf: string;
  applicantType: string;
}

interface CaseDetailsFormProps {
  application?: PassportApplication;
  mode?: 'verification' | 'form';
  onDetailsChange?: (details: CaseDetailsState) => void;
  onSaveVerification?: (details: CaseDetailsState) => void;
}

const ZAMBIAN_PROVINCES = [
  'Lusaka Province',
  'Copperbelt Province',
  'Central Province',
  'Southern Province',
  'Eastern Province',
  'Luapula Province',
  'Northern Province',
  'Muchinga Province',
  'North-Western Province',
  'Western Province',
];

const ZAMBIAN_DISTRICTS = [
  'Chililabombwe',
  'Lusaka',
  'Ndola',
  'Kitwe',
  'Livingstone',
  'Solwezi',
  'Chipata',
  'Kasama',
  'Choma',
  'Kabwe',
  'Mufulira',
  'Luanshya',
  'Chingola',
  'Kalulushi',
  'Mazabuka',
  'Mongu',
  'Mansa',
  'Kafue',
  'Chongwe',
  'Kapiri Mposhi',
];

const PASSPORT_INTERVIEW_LOCATIONS = [
  'Lusaka Passport Office',
  'Lusaka Central Passport Office (Makishi Road)',
  'Ndola Regional Passport Office (President Avenue)',
  'Livingstone Regional Passport Office',
  'Kitwe Provincial Passport Office',
  'Solwezi Provincial Passport Center',
  'Chipata Provincial Center',
  'Kasama Provincial Center',
  'Choma Provincial Passport Center',
];

const SERVICE_CATEGORIES = [
  'Passport Services',
  'Citizenship Services',
  'National Registration (NRC)',
  'Travel Documents',
];

const SERVICE_TYPES = [
  'New Ordinary Passport (32 Pages)',
  'Frequent Traveler Passport (48 Pages)',
  'Replacement of Lost/Stolen Passport',
  'Renewal/Expired Passport',
  'Express Fast-Track Passport Service',
];

const FILING_OPTIONS = [
  'No (Self-Application)',
  'Yes (Minor child under 16)',
  'Yes (Legal Guardian/Ward)',
  'Yes (Elderly/Assisted relative)',
];

const APPLICANT_TYPES = [
  'Individual Citizen',
  'Organisation / Corporate Delegation',
  'Diplomatic / Official Mission',
  'Statutory Body',
];

export const CaseDetailsForm: React.FC<CaseDetailsFormProps> = ({
  application,
  mode = 'verification',
  onDetailsChange,
  onSaveVerification,
}) => {
  // Format current date/time to match screenshot: "10 / 26 / 2026 , 08:35 AM"
  const defaultCreationDate = application?.lastUpdated
    ? new Date(application.lastUpdated).toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
      }).replace(/\//g, ' / ') +
      ' , ' +
      new Date(application.lastUpdated).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : '10 / 26 / 2026 , 08:35 AM';

  const [details, setDetails] = useState<CaseDetailsState>({
    caseNumber: application?.trackingNumber || 'Auto-numbered when saved',
    creationDate: defaultCreationDate,
    agency: 'Department of National Registration, Passports and Citizenship',
    province: application?.contact?.province || 'Copperbelt Province',
    district: application?.contact?.district || 'Chililabombwe',
    interviewLocation: application?.collectionOffice || 'Lusaka Passport Office',
    serviceName: 'Application for Zambian Passport',
    serviceCategory: 'Passport Services',
    serviceType:
      application?.passportType === '48-Page Frequent Traveler'
        ? 'Frequent Traveler Passport (48 Pages)'
        : 'New Ordinary Passport (32 Pages)',
    filingOnBehalf: 'No (Self-Application)',
    applicantType: 'Individual Citizen',
  });

  const [isVerifiedNotice, setIsVerifiedNotice] = useState(false);

  useEffect(() => {
    if (application) {
      setDetails((prev) => ({
        ...prev,
        caseNumber: application.trackingNumber || prev.caseNumber,
        province: application.contact?.province || prev.province,
        district: application.contact?.district || prev.district,
        interviewLocation: application.collectionOffice || prev.interviewLocation,
        serviceType:
          application.passportType === '48-Page Frequent Traveler'
            ? 'Frequent Traveler Passport (48 Pages)'
            : 'New Ordinary Passport (32 Pages)',
      }));
    }
  }, [application]);

  const handleChange = (field: keyof CaseDetailsState, value: string) => {
    const updated = { ...details, [field]: value };
    setDetails(updated);
    if (onDetailsChange) {
      onDetailsChange(updated);
    }
  };

  const handleVerify = () => {
    setIsVerifiedNotice(true);
    if (onSaveVerification) {
      onSaveVerification(details);
    }
    setTimeout(() => {
      setIsVerifiedNotice(false);
    }, 3500);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      {/* Header bar matching screenshot */}
      <div className="bg-[#f0f4f1] border-b border-slate-200/80 px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-600"></div>
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            CASE DETAILS
          </h3>
          <span className="text-[10px] bg-white text-emerald-800 font-semibold px-2 py-0.5 rounded border border-emerald-200">
            Official OPAS Intake Record
          </span>
        </div>

        {mode === 'verification' && (
          <div className="flex items-center gap-2">
            {isVerifiedNotice ? (
              <span className="text-[11px] text-emerald-800 bg-emerald-100 font-bold px-2.5 py-1 rounded flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                Case Details Confirmed &amp; Verified!
              </span>
            ) : (
              <button
                type="button"
                onClick={handleVerify}
                className="text-[11px] bg-emerald-800 hover:bg-emerald-900 text-white font-bold px-3 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirm &amp; Verify Case Details</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Form Fields matching the 2-column screenshot layout */}
      <div className="p-5 sm:p-6 space-y-4 text-xs">
        {mode === 'verification' && (
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-[11px] text-blue-900 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Verify your case routing, interview location, and applicant classification below. These details are cross-referenced with your National Registration Card (NRC) and appointment scheduling records.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          {/* Row 1: Case no. & Creation date */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1">
              Case no.
            </label>
            <input
              type="text"
              readOnly
              value={details.caseNumber}
              className="w-full text-xs p-2.5 bg-slate-100/90 border border-slate-200 rounded-lg text-slate-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1">
              Creation date
            </label>
            <div className="relative">
              <input
                type="text"
                readOnly
                value={details.creationDate}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 pr-9 font-medium"
              />
              <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Row 2: Service provider (Agency) * & Service location (Province) * */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1">
              Service provider (Agency) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              readOnly
              value={details.agency}
              title={details.agency}
              className="w-full text-xs p-2.5 bg-slate-100/90 border border-slate-200 rounded-lg text-slate-500 truncate"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1">
              Service location (Province) <span className="text-red-500">*</span>
            </label>
            <select
              value={details.province}
              onChange={(e) => handleChange('province', e.target.value)}
              className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="">Select an option</option>
              {ZAMBIAN_PROVINCES.map((prov) => (
                <option key={prov} value={prov}>
                  {prov}
                </option>
              ))}
            </select>
          </div>

          {/* Row 3: District * & Preferred service location (for interviews) * */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1">
              District <span className="text-red-500">*</span>
            </label>
            <select
              value={details.district}
              onChange={(e) => handleChange('district', e.target.value)}
              className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="">Select an option</option>
              {ZAMBIAN_DISTRICTS.map((dist) => (
                <option key={dist} value={dist}>
                  {dist}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1">
              Preferred service location (for interviews) <span className="text-red-500">*</span>
            </label>
            <select
              value={details.interviewLocation}
              onChange={(e) => handleChange('interviewLocation', e.target.value)}
              className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="">Select an option</option>
              {PASSPORT_INTERVIEW_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* Row 4: Service name * (Full width) */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-800 mb-1">
              Service name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              readOnly
              value={details.serviceName}
              className="w-full text-xs p-2.5 bg-slate-100/90 border border-slate-200 rounded-lg text-slate-500"
            />
          </div>

          {/* Row 5: Service category * & Service type * */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1">
              Service category <span className="text-red-500">*</span>
            </label>
            <select
              value={details.serviceCategory}
              onChange={(e) => handleChange('serviceCategory', e.target.value)}
              className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="">Select an option</option>
              {SERVICE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1">
              Service type <span className="text-red-500">*</span>
            </label>
            <select
              value={details.serviceType}
              onChange={(e) => handleChange('serviceType', e.target.value)}
              className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="">Select an option</option>
              {SERVICE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Row 6: Filing on behalf of someone else? * & Applicant type (Individual or Organisation) * */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1">
              Filing on behalf of someone else? <span className="text-red-500">*</span>
            </label>
            <select
              value={details.filingOnBehalf}
              onChange={(e) => handleChange('filingOnBehalf', e.target.value)}
              className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="">Select an option</option>
              {FILING_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1">
              Applicant type (Individual or Organisation) <span className="text-red-500">*</span>
            </label>
            <select
              value={details.applicantType}
              onChange={(e) => handleChange('applicantType', e.target.value)}
              className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="">Select an option</option>
              {APPLICANT_TYPES.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
