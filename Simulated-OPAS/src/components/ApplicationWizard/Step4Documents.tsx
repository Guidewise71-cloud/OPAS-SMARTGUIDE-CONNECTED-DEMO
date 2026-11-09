import React, { useState, useRef } from 'react';
import { SmartValidationFixBanner } from '../SmartValidationPanel'
import { usePassport } from '../../context/PassportContext';
import type { UploadedDoc, PhotoComplianceReport } from '../../types/passport';
import {
  SAMPLE_PASSPORT_PHOTO_SVG,
  SAMPLE_ZAMBIAN_NRC_SVG,
  SAMPLE_ZAMBIAN_BIRTH_CERT_SVG,
} from '../../data/mockData';
import {
  Upload,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  Trash2,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Camera,
  ShieldCheck,
  Info,
} from 'lucide-react';

interface Step4DocumentsProps {
  onNext: () => void;
  onBack: () => void;
}

export const Step4Documents: React.FC<Step4DocumentsProps> = ({ onNext, onBack }) => {

  
 const { currentApp, updateCurrentApplication } = usePassport();

  // All hooks run before any early return (Rules of Hooks).
  const [previewDoc, setPreviewDoc] = useState<UploadedDoc | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const nrcFileRef = useRef<HTMLInputElement>(null);
  const birthCertFileRef = useRef<HTMLInputElement>(null);
  const photoFileRef = useRef<HTMLInputElement>(null);
  const parentsNrcRef = useRef<HTMLInputElement>(null);

  if (!currentApp) return null;

  const docs = currentApp.documents;
  const isRenewal = currentApp.applicationType === 'RENEWAL';

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    docKey: keyof typeof docs,
    isPhoto: boolean = false
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('File exceeds 10MB limit. Please upload a smaller scan.');
      return;
    }

    const reader = new FileReader();
    reader.onload = event => {
      const dataUrl = event.target?.result as string;

      let compliance: PhotoComplianceReport | undefined = undefined;
      if (isPhoto) {
        compliance = {
          neutralBackground: true,
          eyesVisible: true,
          centered: true,
          lightingGood: true,
          scorePercent: 98,
        };
      }

      const newDoc: UploadedDoc = {
        id: `DOC-ZM-${Date.now()}`,
        name: file.name,
        type: file.type,
        sizeKb: Math.round(file.size / 1024),
        dataUrl,
        uploadedAt: new Date().toISOString(),
        verified: true,
        compliance,
      };

      updateCurrentApplication({
        documents: {
          ...currentApp.documents,
          [docKey]: newDoc,
        },
      });
      setErrorMsg(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSetSample = (docKey: keyof typeof docs, sampleType: 'NRC' | 'BIRTH_CERT' | 'PHOTO') => {
    let newDoc: UploadedDoc;

    if (sampleType === 'NRC') {
      newDoc = {
        id: `DOC-NRC-${Date.now()}`,
        name: 'Zambian_Green_NRC_Scan.pdf',
        type: 'application/pdf',
        sizeKb: 1200,
        dataUrl: SAMPLE_ZAMBIAN_NRC_SVG,
        uploadedAt: new Date().toISOString(),
        verified: true,
      };
    } else if (sampleType === 'BIRTH_CERT') {
      newDoc = {
        id: `DOC-BC-${Date.now()}`,
        name: 'Zambian_Birth_Certificate_Certified.pdf',
        type: 'application/pdf',
        sizeKb: 1450,
        dataUrl: SAMPLE_ZAMBIAN_BIRTH_CERT_SVG,
        uploadedAt: new Date().toISOString(),
        verified: true,
      };
    } else {
      newDoc = {
        id: `DOC-PHOTO-${Date.now()}`,
        name: 'Zambian_Passport_Headshot_ICAO.jpg',
        type: 'image/jpeg',
        sizeKb: 520,
        dataUrl: SAMPLE_PASSPORT_PHOTO_SVG,
        uploadedAt: new Date().toISOString(),
        verified: true,
        compliance: {
          neutralBackground: true,
          eyesVisible: true,
          centered: true,
          lightingGood: true,
          scorePercent: 99,
        },
      };
    }

    updateCurrentApplication({
      documents: {
        ...currentApp.documents,
        [docKey]: newDoc,
      },
    });
    setErrorMsg(null);
  };

  const handleRemoveDoc = (docKey: keyof typeof docs) => {
    const updated = { ...currentApp.documents };
    delete updated[docKey];
    updateCurrentApplication({ documents: updated });
  };

  const handleNextClick = () => {
    if (!docs.nrcFrontBack) {
      setErrorMsg('Mandatory National Registration Card (Green NRC) scan is required.');
      return;
    }
    if (!docs.birthCertificate) {
      setErrorMsg('Mandatory Certified Zambian Birth Certificate is required.');
      return;
    }
    if (!docs.passportPhoto) {
      setErrorMsg('Mandatory Biometric Passport Photograph is required.');
      return;
    }
    setErrorMsg(null);
    onNext();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
            <SmartValidationFixBanner referenceNumber={currentApp.referenceNumber} step={4} />
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Upload className="w-5 h-5 text-emerald-800" />
          Mandatory Zambian Passport Document Uploads
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Upload certified clear scans of your statutory civil credentials as prescribed by the Ministry of Home Affairs.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* DNRPC Revert Notice Banner if Application was Reverted */}
      {currentApp.revertDetails && (
        <div className="p-4 bg-purple-50 border-2 border-purple-400 rounded-xl space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-200 pb-2">
            <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-purple-700" />
              DNRPC Action Notice &middot; Reverted Case #{currentApp.revertDetails.caseNumber}
            </span>
            <span className="text-[11px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded border border-red-200">
              Correction Deadline: {currentApp.revertDetails.deadlineDate}
            </span>
          </div>
          <div className="text-xs text-purple-900 space-y-1">
            <p>
              <strong>Revert Reason:</strong> {currentApp.revertDetails.reason}
            </p>
            <p>
              <strong>Officer Note ({currentApp.revertDetails.officerName}):</strong> {currentApp.revertDetails.requiredCorrection}
            </p>
          </div>
          <p className="text-[11px] text-purple-700">
            Please re-upload compliant replacements below to re-submit your file for DNRPC vetting.
          </p>
        </div>
      )}

      {/* Document Matrix */}
      <div className="space-y-6">
        {/* 1. Green National Registration Card (NRC) */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  1. Green National Registration Card (NRC) - Front & Back Scan
                </span>
                <span className="text-[10px] text-red-600 font-bold bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                  Mandatory
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Clear color copy showing NRC number, holder photo, thumbprint, and village/chief details (PDF, JPG, PNG).
              </p>
            </div>

            {!docs.nrcFrontBack && (
              <button
                type="button"
                onClick={() => handleSetSample('nrcFrontBack', 'NRC')}
                className="text-xs text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2.5 py-1.5 rounded flex items-center gap-1.5 font-medium shrink-0 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Use Sample Green NRC Scan
              </button>
            )}
          </div>

          {docs.nrcFrontBack ? (
            <div className="flex items-center justify-between p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block truncate max-w-xs">
                    {docs.nrcFrontBack.name}
                  </span>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span>{docs.nrcFrontBack.sizeKb} KB</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-emerald-700 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> NRC Verified
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewDoc(docs.nrcFrontBack!)}
                  className="px-2.5 py-1.5 text-xs text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveDoc('nrcFrontBack')}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div>
              <input
                type="file"
                ref={nrcFileRef}
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={e => handleFileUpload(e, 'nrcFrontBack')}
                className="hidden"
              />
              <div
                onClick={() => nrcFileRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-lg p-6 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-slate-50"
              >
                <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <span className="text-xs font-semibold text-slate-800 block">
                  Click to select Green NRC scan or drag & drop
                </span>
                <span className="text-[11px] text-slate-500">PDF, PNG, JPG (Max 10 MB)</span>
              </div>
            </div>
          )}
        </div>

        {/* 2. Certified Zambian Birth Certificate */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  2. Certified Zambian Birth Certificate / Record of Birth
                </span>
                <span className="text-[10px] text-red-600 font-bold bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                  Mandatory
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Official certificate issued by the Registrar General of Births, Deaths and Marriages.
              </p>
            </div>

            {!docs.birthCertificate && (
              <button
                type="button"
                onClick={() => handleSetSample('birthCertificate', 'BIRTH_CERT')}
                className="text-xs text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2.5 py-1.5 rounded flex items-center gap-1.5 font-medium shrink-0 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Use Sample Birth Certificate
              </button>
            )}
          </div>

          {docs.birthCertificate ? (
            <div className="flex items-center justify-between p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block truncate max-w-xs">
                    {docs.birthCertificate.name}
                  </span>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span>{docs.birthCertificate.sizeKb} KB</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-emerald-700 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Certified Copy Verified
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewDoc(docs.birthCertificate!)}
                  className="px-2.5 py-1.5 text-xs text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveDoc('birthCertificate')}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div>
              <input
                type="file"
                ref={birthCertFileRef}
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={e => handleFileUpload(e, 'birthCertificate')}
                className="hidden"
              />
              <div
                onClick={() => birthCertFileRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-lg p-6 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-slate-50"
              >
                <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <span className="text-xs font-semibold text-slate-800 block">
                  Click to select Birth Certificate or drag & drop
                </span>
                <span className="text-[11px] text-slate-500">PDF, PNG, JPG (Max 10 MB)</span>
              </div>
            </div>
          )}
        </div>

        {/* 3. Official Biometric Passport Photo */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  3. Biometric Passport Photograph (ICAO Compliant)
                </span>
                <span className="text-[10px] text-red-600 font-bold bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                  Mandatory
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Plain white background, neutral facial expression, front facing, no headwear/glasses. 35x45mm standard.
              </p>
            </div>

            {!docs.passportPhoto && (
              <button
                type="button"
                onClick={() => handleSetSample('passportPhoto', 'PHOTO')}
                className="text-xs text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2.5 py-1.5 rounded flex items-center gap-1.5 font-medium shrink-0 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Use Sample Compliant Photo
              </button>
            )}
          </div>

          {docs.passportPhoto ? (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-5">
                <div className="relative w-32 h-40 bg-white border-2 border-slate-300 rounded overflow-hidden shadow-xs shrink-0 flex items-center justify-center">
                  <img
                    src={docs.passportPhoto.dataUrl}
                    alt="Zambian Passport Photo"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 border border-emerald-600/40 pointer-events-none flex flex-col justify-between p-1">
                    <span className="text-[8px] font-mono text-emerald-800 bg-white/90 px-1 rounded self-start">
                      35x45mm
                    </span>
                    <div className="border border-dashed border-emerald-600/60 rounded-full w-20 h-24 mx-auto my-auto" />
                  </div>
                </div>

                <div className="flex-1 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        {docs.passportPhoto.name}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        ICAO 9303 Compliance Score: {docs.passportPhoto.compliance?.scorePercent || 99}%
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Approved
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Plain white background</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Eyes open & mouth closed</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Full face forward centering</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Clean balanced lighting</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setPreviewDoc(docs.passportPhoto!)}
                      className="px-2.5 py-1 text-xs text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Enlarge
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveDoc('passportPhoto')}
                      className="px-2.5 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Replace
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <input
                type="file"
                ref={photoFileRef}
                accept=".jpg,.jpeg,.png"
                onChange={e => handleFileUpload(e, 'passportPhoto', true)}
                className="hidden"
              />
              <div
                onClick={() => photoFileRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-lg p-6 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-slate-50"
              >
                <Camera className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <span className="text-xs font-semibold text-slate-800 block">
                  Upload Digital Passport Headshot
                </span>
                <span className="text-[11px] text-slate-500">
                  JPEG or PNG. 35mm x 45mm, high resolution.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 4. Parents' Green NRC Scan (Optional or for Citizenship Proof) */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  4. Parents' Green NRCs or Citizenship Evidence
                </span>
                <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                  Descent Verification
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Father or Mother's Zambian NRC copy to substantiate citizenship by descent.
              </p>
            </div>

            {!docs.parentsNrcOrAffidavit && (
              <button
                type="button"
                onClick={() => handleSetSample('parentsNrcOrAffidavit', 'NRC')}
                className="text-xs text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2.5 py-1.5 rounded flex items-center gap-1.5 font-medium shrink-0 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Attach Sample Parents' NRC
              </button>
            )}
          </div>

          {docs.parentsNrcOrAffidavit ? (
            <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block truncate max-w-xs">
                    {docs.parentsNrcOrAffidavit.name}
                  </span>
                  <span className="text-[11px] text-slate-500">{docs.parentsNrcOrAffidavit.sizeKb} KB</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewDoc(docs.parentsNrcOrAffidavit!)}
                  className="px-2.5 py-1.5 text-xs text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveDoc('parentsNrcOrAffidavit')}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div>
              <input
                type="file"
                ref={parentsNrcRef}
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={e => handleFileUpload(e, 'parentsNrcOrAffidavit')}
                className="hidden"
              />
              <div
                onClick={() => parentsNrcRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-lg p-6 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-slate-50"
              >
                <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <span className="text-xs font-semibold text-slate-800 block">
                  Upload Parents' NRC or Affidavit
                </span>
                <span className="text-[11px] text-slate-500">PDF, PNG, JPG (Optional / Recommended)</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Security notice */}
      <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-lg flex items-start gap-3 text-xs text-emerald-900">
        <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold block">Important Physical Verification Notice</span>
          <p className="mt-0.5 leading-relaxed">
            All original documents (Original Green NRC and Certified Birth Certificate) must be brought to your physical biometrics enrollment appointment at the designated Provincial Passport Office.
          </p>
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
          Back to History
        </button>

        <button
          type="button"
          onClick={handleNextClick}
          className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-md transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <span>Review Application & Sworn Declaration</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-lg max-w-xl w-full p-4 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-bold text-xs text-slate-900 truncate">{previewDoc.name}</span>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="text-slate-400 hover:text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
            <div className="max-h-[60vh] overflow-auto flex items-center justify-center bg-slate-100 rounded p-2">
              {previewDoc.dataUrl ? (
                <img
                  src={previewDoc.dataUrl}
                  alt={previewDoc.name}
                  className="max-h-[50vh] object-contain rounded shadow-sm"
                />
              ) : (
                <span className="text-xs text-slate-500">Document encrypted for government verification.</span>
              )}
            </div>
            <div className="text-right">
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
