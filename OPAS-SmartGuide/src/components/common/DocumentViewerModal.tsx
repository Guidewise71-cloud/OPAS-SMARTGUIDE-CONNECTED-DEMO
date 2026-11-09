import React, { useState } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Shield,
  Eye,
  Camera,
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Info,
  Check,
} from 'lucide-react';
import { UploadedDocument, PassportApplication } from '../../types/passport';

interface DocumentViewerModalProps {
  document: UploadedDocument;
  application: PassportApplication;
  onClose: () => void;
  onApproveDocument?: (docId: string) => void;
  onRejectDocument?: (docId: string, reason: string) => void;
  isOfficerRole?: boolean;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  document,
  application,
  onClose,
  onApproveDocument,
  onRejectDocument,
  isOfficerRole = false,
}) => {
  const [showAiOverlay, setShowAiOverlay] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const isPhoto = document.type === 'Passport Photo';
  const isNrc = document.type === 'National Registration Card (NRC)';
  const isBirthCert = document.type === 'Birth Certificate';
  const isGuarantor = document.type === 'Guarantor Form';

  const score = document.aiScore ?? (document.status === 'APPROVED' ? 94 : document.status === 'REJECTED' ? 48 : 80);

  const handleApprove = () => {
    if (onApproveDocument) {
      onApproveDocument(document.id);
      setActionNotice('Document marked as APPROVED by Vetting Officer.');
      setTimeout(() => {
        setActionNotice(null);
        onClose();
      }, 1200);
    }
  };

  const handleReject = () => {
    if (onRejectDocument && rejectionReasonInput.trim()) {
      onRejectDocument(document.id, rejectionReasonInput.trim());
      setActionNotice('Document marked as REJECTED. Reversion logged.');
      setTimeout(() => {
        setActionNotice(null);
        onClose();
      }, 1200);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in duration-200">
        {/* Top Header */}
        <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center text-white shrink-0">
              {isPhoto ? <Camera className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight">{document.name}</h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    document.status === 'APPROVED'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : document.status === 'REJECTED'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {document.status}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {document.type} &bull; Dossier: <strong className="text-slate-300">{application.fullName}</strong> ({application.trackingNumber})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAiOverlay(!showAiOverlay)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                showAiOverlay
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
              title="Toggle optical inspection overlay"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Optical Overlay: {showAiOverlay ? 'ON' : 'OFF'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewport Control Bar */}
        <div className="bg-slate-100 px-6 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-800">Optical Pre-Flight Quality:</span>
            <div className="flex items-center gap-1.5">
              <div className="w-20 bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full ${
                    score >= 80 ? 'bg-emerald-600' : score >= 60 ? 'bg-amber-500' : 'bg-red-600'
                  }`}
                  style={{ width: `${score}%` }}
                />
              </div>
              <span className="font-mono font-bold text-slate-900">{score}/100</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoomLevel((z) => Math.max(z - 15, 70))}
              className="p-1 hover:bg-slate-200 rounded text-slate-700 cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="font-mono text-[11px] w-12 text-center">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(z + 15, 150))}
              className="p-1 hover:bg-slate-200 rounded text-slate-700 cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="p-1 hover:bg-slate-200 rounded text-slate-700 cursor-pointer ml-1"
              title="Rotate 90 degrees"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notice Banner */}
        {actionNotice && (
          <div className="bg-emerald-50 border-b border-emerald-200 p-2.5 text-xs text-emerald-900 font-semibold text-center flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Main Inspection Canvas */}
        <div className="flex-1 p-6 overflow-y-auto bg-slate-200/60 flex flex-col md:flex-row gap-6 items-center justify-center">
          {/* Document Canvas Render */}
          <div
            className="transition-transform duration-200 flex items-center justify-center"
            style={{
              transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
            }}
          >
            {/* TYPE 1: PASSPORT PHOTO INSPECTION RENDER */}
            {isPhoto && (
              <div className="w-[280px] h-[360px] bg-white rounded-lg shadow-xl border-4 border-white relative overflow-hidden flex flex-col items-center justify-center">
                {/* Simulated portrait image container */}
                <div
                  className={`w-full h-full relative flex flex-col items-center justify-center ${
                    document.status === 'REJECTED'
                      ? 'bg-gradient-to-br from-slate-300 via-slate-400 to-slate-500' // Dark shadow on right
                      : 'bg-[#f4f4f4]' // Compliant light grey plain
                  }`}
                >
                  {/* Portrait silhouette */}
                  <div className="relative z-10 flex flex-col items-center">
                    {/* Head */}
                    <div
                      className={`w-28 h-36 rounded-[50%/60%] shadow-md border relative ${
                        document.status === 'REJECTED'
                          ? 'bg-[#845233] border-amber-900 shadow-slate-900/50'
                          : 'bg-[#7a482b] border-[#5a321c]'
                      }`}
                    >
                      {/* Hair/Head contour */}
                      <div className="w-24 h-12 bg-slate-950 rounded-t-full mx-auto mt-0.5 opacity-90" />
                      {/* Eyes / Face markings */}
                      <div className="flex justify-between w-16 mx-auto mt-4 px-1">
                        <div className="w-2.5 h-1.5 bg-slate-900 rounded-full" />
                        <div className="w-2.5 h-1.5 bg-slate-900 rounded-full" />
                      </div>
                      <div className="w-1.5 h-3 bg-amber-950/40 rounded-full mx-auto mt-2" />
                      <div className="w-6 h-1 bg-amber-950/50 rounded-full mx-auto mt-3" />
                    </div>
                    {/* Shoulders */}
                    <div className="w-52 h-24 bg-slate-800 rounded-t-[50px] -mt-5 z-0" />
                  </div>

                  {/* AI Optical Inspection Overlay */}
                  {showAiOverlay && (
                    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-3">
                      {/* 45x35mm dimension bounding box */}
                      <div className="absolute inset-4 border-2 border-dashed border-emerald-500/80 rounded-md">
                        <span className="absolute -top-3 left-2 bg-emerald-600 text-white font-mono text-[9px] px-1.5 py-0.2 rounded font-bold">
                          ICAO 45mm x 35mm
                        </span>
                        {/* Eye level guideline */}
                        <div className="absolute top-[38%] left-0 right-0 border-b border-emerald-400/80 flex items-center justify-between px-1">
                          <span className="text-[8px] font-mono text-emerald-700 bg-white/80 px-1 rounded">
                            Eye Level 32-36mm
                          </span>
                        </div>
                        {/* Center vertical axis */}
                        <div className="absolute top-0 bottom-0 left-1/2 border-l border-emerald-400/80" />
                        {/* Chin guideline */}
                        <div className="absolute bottom-[24%] left-0 right-0 border-b border-emerald-400/80" />
                      </div>

                      {/* Optical status pill */}
                      <div className="mt-auto self-start z-30">
                        {score >= 80 ? (
                          <div className="bg-emerald-900/90 text-white px-2 py-1 rounded text-[10px] font-semibold flex items-center gap-1 shadow-md">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>ICAO 9303 Compliant</span>
                          </div>
                        ) : (
                          <div className="bg-red-900/90 text-white px-2 py-1 rounded text-[10px] font-semibold flex items-center gap-1 shadow-md">
                            <AlertTriangle className="w-3 h-3 text-red-400" />
                            <span>Shadow Detected (Right Contour)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {/* Physical Photo Bottom Bar */}
                <div className="w-full bg-slate-900 text-white py-1 text-center font-mono text-[10px]">
                  MoHAIS OPAS &bull; {application.trackingNumber}
                </div>
              </div>
            )}

            {/* TYPE 2: GREEN NRC (NATIONAL REGISTRATION CARD) */}
            {isNrc && (
              <div className="w-[380px] h-[240px] bg-[#dcfce7] rounded-xl shadow-xl border-2 border-emerald-600/80 p-3 relative flex flex-col justify-between text-slate-900 font-sans">
                {/* NRC Top Official Bar */}
                <div className="border-b border-emerald-700/60 pb-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded bg-emerald-800 text-white flex items-center justify-center font-bold text-[10px]">
                      ZM
                    </div>
                    <div>
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-950">
                        Republic of Zambia
                      </div>
                      <div className="text-[9px] font-bold text-emerald-800 uppercase">
                        National Registration Card (Green Card)
                      </div>
                    </div>
                  </div>
                  <span className="font-mono font-black text-xs text-emerald-950 bg-emerald-200/80 px-2 py-0.5 rounded border border-emerald-400">
                    {application.nrcNumber}
                  </span>
                </div>

                {/* NRC Body details */}
                <div className="grid grid-cols-3 gap-2 my-1 text-[10px]">
                  <div className="col-span-2 space-y-1">
                    <div>
                      <span className="text-[8px] uppercase text-emerald-900 block font-bold">Full Names:</span>
                      <span className="font-bold text-slate-950 uppercase text-xs">{application.fullName}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[9px]">
                      <div>
                        <span className="text-[8px] uppercase text-emerald-900 block font-bold">Date of Birth:</span>
                        <span className="font-mono font-semibold">{application.dateOfBirth}</span>
                      </div>
                      <div>
                        <span className="text-[8px] uppercase text-emerald-900 block font-bold">Gender:</span>
                        <span className="font-semibold">{application.gender}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[9px]">
                      <div>
                        <span className="text-[8px] uppercase text-emerald-900 block font-bold">Place of Birth:</span>
                        <span className="font-semibold">{application.placeOfBirth}</span>
                      </div>
                      <div>
                        <span className="text-[8px] uppercase text-emerald-900 block font-bold">District / Chief:</span>
                        <span className="font-semibold">{application.contact.district}</span>
                      </div>
                    </div>
                  </div>

                  {/* Photo & Thumbprint Box on NRC */}
                  <div className="flex flex-col items-center justify-between gap-1">
                    <div className="w-16 h-20 bg-slate-300 rounded border border-emerald-700 flex items-center justify-center text-[8px] text-slate-600 font-bold">
                      NRC Photo
                    </div>
                    <div className="w-14 h-9 bg-emerald-100 rounded border border-dashed border-emerald-600 flex items-center justify-center text-[7px] text-emerald-800 font-bold">
                      Right Thumb
                    </div>
                  </div>
                </div>

                {/* Official Certification Stamp */}
                <div className="pt-1 border-t border-emerald-700/40 flex items-center justify-between text-[8px] text-emerald-900">
                  <span>Certified True Copy of Original Record</span>
                  <span className="font-mono font-bold">Registrar of National Registration</span>
                </div>

                {/* AI Overlay Check */}
                {showAiOverlay && (
                  <div className="absolute -top-3 -right-2 bg-emerald-800 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>OCR Syntax Verified</span>
                  </div>
                )}
              </div>
            )}

            {/* TYPE 3: BIRTH CERTIFICATE */}
            {isBirthCert && (
              <div className="w-[340px] h-[440px] bg-[#fffdfa] rounded-lg shadow-xl border border-amber-300 p-4 relative flex flex-col justify-between text-slate-900 font-serif">
                <div className="text-center border-b border-amber-900/30 pb-2">
                  <div className="text-[11px] font-bold tracking-widest text-slate-800 uppercase">
                    Republic of Zambia
                  </div>
                  <div className="text-xs font-bold text-amber-900 mt-0.5 uppercase tracking-wide">
                    Birth Registration Certificate
                  </div>
                  <div className="text-[9px] text-slate-500 font-sans mt-0.5">
                    Extract from the General Register of Births
                  </div>
                </div>

                <div className="space-y-2 text-[10px] font-sans my-2">
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-500">Certificate No:</span>
                    <span className="font-mono font-bold text-slate-900">BC-ZM-2026-9481</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-500">Child&apos;s Name:</span>
                    <span className="font-bold text-slate-950 uppercase">{application.fullName}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-500">Date of Birth:</span>
                    <span className="font-mono font-semibold">{application.dateOfBirth}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-500">Place of Birth:</span>
                    <span className="font-semibold">{application.placeOfBirth}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-500">Father&apos;s Name:</span>
                    <span className="font-semibold">Banda {application.fullName.split(' ')[1] || 'Phiri'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-500">Mother&apos;s Maiden Name:</span>
                    <span className="font-semibold">Mary Mwape</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-amber-900/30 flex items-center justify-between text-[9px] font-sans">
                  <div>
                    <span className="block font-bold text-slate-800">Registrar General</span>
                    <span className="text-slate-500 text-[8px]">Ministry of Home Affairs</span>
                  </div>
                  <div className="w-12 h-12 rounded-full border-2 border-red-700/70 text-red-700 flex items-center justify-center font-bold text-[8px] uppercase tracking-tighter rotate-[-12deg]">
                    Official Seal
                  </div>
                </div>
              </div>
            )}

            {/* TYPE 4: GUARANTOR FORM */}
            {isGuarantor && (
              <div className="w-[340px] h-[440px] bg-white rounded-lg shadow-xl border border-slate-300 p-4 relative flex flex-col justify-between text-slate-900">
                <div className="text-center border-b border-slate-200 pb-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-900">
                    Passport Application Form &bull; Section 7
                  </div>
                  <div className="text-xs font-bold text-slate-900 mt-0.5 uppercase">
                    Guarantor Declaration &amp; Certificate
                  </div>
                  <div className="text-[9px] text-slate-500 mt-0.5">
                    Authorized Professional or Minister of Religion
                  </div>
                </div>

                <div className="space-y-2 text-[10px] my-2">
                  <div>
                    <span className="text-slate-500 text-[9px] block">Guarantor Legal Names:</span>
                    <span className="font-bold text-slate-900">{application.guarantor.fullName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[9px] block">Profession / Official Capacity:</span>
                    <span className="font-semibold text-slate-800">{application.guarantor.profession}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[9px] block">Organization / Court / Church:</span>
                    <span className="text-slate-800">{application.guarantor.organization}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-500 text-[9px] block">Green NRC:</span>
                      <span className="font-mono font-semibold">{application.guarantor.nrcNumber}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[9px] block">Contact Phone:</span>
                      <span className="font-mono font-semibold">{application.guarantor.phoneNumber}</span>
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-600 italic bg-slate-50 p-2 rounded border border-slate-200">
                    &quot;I declare that I have known the applicant personally for not less than 2 years and certify that their photograph and particulars are correct.&quot;
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[9px]">
                  <div>
                    <span className="block font-bold">Guarantor Signature</span>
                    <span className="font-serif italic text-emerald-800 text-xs font-semibold">
                      {application.guarantor.fullName}
                    </span>
                  </div>
                  <div
                    className={`w-14 h-14 rounded-full border-2 flex items-center justify-center font-bold text-[8px] uppercase tracking-tighter rotate-[-8deg] ${
                      document.status === 'REJECTED'
                        ? 'border-dashed border-red-500 text-red-500 bg-red-50'
                        : 'border-emerald-700 text-emerald-800 bg-emerald-50'
                    }`}
                  >
                    {document.status === 'REJECTED' ? 'Missing Stamp' : 'Official Stamp'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Inspection Checklist & Optical Findings */}
          <div className="w-full md:w-80 bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-4 text-xs self-stretch flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-700" />
                  Pre-Flight Optical Audit
                </span>
                <span className="font-mono font-bold text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-800">
                  {score}% Score
                </span>
              </div>

              {/* Optical Parameters Breakdown */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600">Background Uniformity:</span>
                  <span className={`font-semibold ${score >= 70 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {score >= 70 ? 'Off-White Plain (Pass)' : 'Shadow Detected (Fail)'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600">Facial Centering &amp; Oval:</span>
                  <span className="font-semibold text-emerald-700">Centered (45x35mm)</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600">Flash Glare &amp; Reflections:</span>
                  <span className={`font-semibold ${score >= 80 ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {score >= 80 ? 'None (Pass)' : 'Minor Glare (Review)'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600">Legibility &amp; Resolution:</span>
                  <span className="font-semibold text-emerald-700">300 DPI High-Res</span>
                </div>
              </div>

              {/* Document Feedback Note */}
              {document.feedback && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900 space-y-1">
                  <span className="font-bold block text-red-950 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                    Officer Reversion Note:
                  </span>
                  <p className="text-[11px] leading-relaxed">{document.feedback}</p>
                </div>
              )}
            </div>

            {/* Officer Action Controls (if officer role) */}
            {isOfficerRole && (
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Passport Officer Decision
                </span>

                {!isRejecting ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleApprove}
                      className="py-2 px-3 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => setIsRejecting(true)}
                      className="py-2 px-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-300 rounded-lg font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Revert / Flag</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 bg-red-50 p-3 rounded-lg border border-red-200">
                    <label className="block text-[11px] font-bold text-red-900">
                      Reversion Cause / Guidance for Citizen:
                    </label>
                    <textarea
                      rows={2}
                      value={rejectionReasonInput}
                      onChange={(e) => setRejectionReasonInput(e.target.value)}
                      placeholder="e.g. Please retake photo against a plain light wall..."
                      className="w-full text-xs p-1.5 border border-red-300 rounded bg-white"
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => setIsRejecting(false)}
                        className="px-2 py-1 text-xs text-slate-600 hover:text-slate-800 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleReject}
                        disabled={!rejectionReasonInput.trim()}
                        className="px-3 py-1 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded shadow-xs cursor-pointer disabled:opacity-40"
                      >
                        Commit Revert
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Official MoHAIS OPAS Document ID: {document.id}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded-lg font-semibold cursor-pointer"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};
