import React, { useState } from 'react';
import { usePassport } from '../../context/PassportContext';
import { ZAMBIAN_PASSPORT_OFFICES, TIME_SLOTS } from '../../data/mockData';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Printer,
  QrCode,
  AlertCircle,
  FileText,
} from 'lucide-react';

interface Step7AppointmentProps {
  onViewDashboard: () => void;
}

export const Step7Appointment: React.FC<Step7AppointmentProps> = ({
  onViewDashboard,
}) => {
  const { currentApp, confirmAppointment } = usePassport();

  if (!currentApp) return null;

  const [selectedOfficeId, setSelectedOfficeId] = useState(
    currentApp.appointment?.officeId || ZAMBIAN_PASSPORT_OFFICES[0].id
  );
  const [selectedDate, setSelectedDate] = useState(
    currentApp.appointment?.appointmentDate || '2026-11-20'
  );
  const [selectedSlot, setSelectedSlot] = useState(
    currentApp.appointment?.appointmentTimeSlot || TIME_SLOTS[1]
  );
  const [isBooked, setIsBooked] = useState(!!currentApp.appointment);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const selectedOffice =
    ZAMBIAN_PASSPORT_OFFICES.find(o => o.id === selectedOfficeId) || ZAMBIAN_PASSPORT_OFFICES[0];

  const handleBookAppointment = () => {
    if (!selectedDate) {
      setBookingError('Please select a valid appointment date.');
      return;
    }
    confirmAppointment(selectedOfficeId, selectedDate, selectedSlot);
    setIsBooked(true);
    setBookingError(null);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="no-print">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Calendar className="w-5 h-5 text-emerald-800" />
          Biometric Capture Appointment & Official Application Slip
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          {isBooked
            ? 'Your biometric appointment is scheduled. Print or save your official Republic of Zambia application voucher below.'
            : 'Select your preferred Provincial Passport Office and appointment slot for biometric data enrollment.'}
        </p>
      </div>

      {bookingError && (
        <div className="no-print p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{bookingError}</span>
        </div>
      )}

      {/* Booking Form (If not yet confirmed) */}
      {!isBooked && (
        <div className="no-print bg-white border border-slate-200 rounded-lg p-6 space-y-6">
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              1. Select Provincial Passport Office <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {ZAMBIAN_PASSPORT_OFFICES.map(o => {
                const isSelected = selectedOfficeId === o.id;
                return (
                  <div
                    key={o.id}
                    onClick={() => setSelectedOfficeId(o.id)}
                    className={`p-4 rounded-lg border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'border-emerald-800 bg-emerald-50/60 ring-2 ring-emerald-700 ring-offset-1'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="w-4 h-4 text-emerald-800 shrink-0" />
                      <span className="text-xs font-bold text-slate-900 truncate">{o.name}</span>
                    </div>
                    <p className="text-xs text-slate-600 mb-2">{o.address}</p>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{o.operatingHours}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                2. Select Appointment Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={selectedDate}
                min="2026-11-09"
                max="2027-02-28"
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
              <span className="text-[11px] text-slate-500">
                Operating Days: Monday to Friday (excluding public holidays)
              </span>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                3. Select Time Window <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedSlot}
                onChange={e => setSelectedSlot(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-700 font-mono"
              >
                {TIME_SLOTS.map(slot => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-slate-500">
                Arrive 15 minutes before your scheduled window
              </span>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleBookAppointment}
              className="w-full py-2.5 px-4 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Calendar className="w-4 h-4 text-amber-300" />
              <span>Confirm Appointment & Generate Zambian Passport Slip</span>
            </button>
          </div>
        </div>
      )}

      {/* Official Printable Zambian Passport Application Slip */}
      {isBooked && (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="no-print flex flex-wrap items-center justify-between gap-3 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-700" />
              <span className="text-xs font-bold text-emerald-950">
                Application Filed & Biometrics Booked Successfully
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 text-xs font-bold text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5 text-slate-700" />
                Print / Save PDF Slip
              </button>

              <button
                type="button"
                onClick={onViewDashboard}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors cursor-pointer shadow-2xs"
              >
                Return to My Applications
              </button>
            </div>
          </div>

          {/* Official Voucher Paper */}
          <div className="bg-white border-2 border-slate-400 rounded-xl p-8 shadow-md space-y-6 max-w-3xl mx-auto print:border-none print:shadow-none print:p-0">
            {/* Republic of Zambia Header */}
            <div className="border-b-2 border-slate-900 pb-5 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded bg-emerald-950 border border-emerald-600 text-amber-400 flex items-center justify-center text-2xl font-serif">
                  🇿🇲
                </div>
                <div>
                  <h1 className="text-sm font-black text-slate-950 uppercase tracking-tight">
                    Republic of Zambia
                  </h1>
                  <h2 className="text-xs font-bold text-slate-800 uppercase">
                    Ministry of Home Affairs & Internal Security
                  </h2>
                  <p className="text-[11px] text-slate-600 font-semibold">
                    Department of National Registration, Passport and Citizenship (DNRPC)
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    FORM OPAS-ZM-01 · OFFICIAL PASSPORT APPOINTMENT VOUCHER
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                  OPAS Reference Number
                </span>
                <span className="text-base font-bold font-mono text-slate-950 block">
                  {currentApp.referenceNumber}
                </span>
                <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded inline-block mt-1">
                  GRZ FEES PAID (K{currentApp.payment.amount.toFixed(2)})
                </span>
              </div>
            </div>

            {/* Barcode & QR Code Section */}
            <div className="p-3 bg-slate-50 border border-slate-300 rounded flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-semibold text-slate-500 block">
                  SCAN FOR CITIZEN APPOINTMENT CHECK-IN
                </span>
                <div className="font-mono text-2xl tracking-[0.25em] font-extrabold text-slate-900 select-none py-1">
                  || ||| | || |||| | ||| || ||| |
                </div>
                <span className="text-[10px] font-mono text-slate-600">
                  *{currentApp.referenceNumber.replace(/[^A-Z0-9]/g, '')}*
                </span>
              </div>

              <div className="flex items-center gap-3 border-l border-slate-300 pl-4">
                <div className="w-14 h-14 bg-white border border-slate-300 rounded p-1 flex items-center justify-center">
                  <QrCode className="w-12 h-12 text-slate-900" />
                </div>
                <div className="text-left text-[10px]">
                  <span className="font-bold text-slate-800 block">Pass Code</span>
                  <span className="font-mono text-slate-600 block">
                    {currentApp.appointment?.confirmationCode}
                  </span>
                </div>
              </div>
            </div>

            {/* Applicant Profile Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs border-b border-slate-200 pb-5">
              <div>
                <span className="text-slate-500 block text-[11px]">Applicant Full Name:</span>
                <span className="font-bold text-slate-950 uppercase">
                  {currentApp.personalDetails.surname}, {currentApp.personalDetails.givenNames}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Green NRC Number:</span>
                <span className="font-mono font-bold text-emerald-950">
                  {currentApp.personalDetails.nrcNumber}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Date of Birth:</span>
                <span className="font-bold text-slate-950">
                  {currentApp.personalDetails.dateOfBirth}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Village & Chief:</span>
                <span className="font-bold text-slate-950">
                  {currentApp.personalDetails.village} (Chief {currentApp.personalDetails.chief})
                </span>
              </div>
            </div>

            {/* Confirmed Appointment Details */}
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs uppercase tracking-wider">
                <MapPin className="w-4 h-4 text-emerald-800" />
                <span>Confirmed Biometric Enrollment Slot</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Passport Office:</span>
                  <span className="font-bold text-slate-900">{currentApp.appointment?.officeName}</span>
                  <span className="text-[11px] text-slate-600 block">{currentApp.appointment?.address}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Date:</span>
                  <span className="font-bold text-slate-900 font-mono text-sm">
                    {currentApp.appointment?.appointmentDate}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Time Window:</span>
                  <span className="font-bold text-slate-900 font-mono text-sm">
                    {currentApp.appointment?.appointmentTimeSlot}
                  </span>
                </div>
              </div>
            </div>

            {/* Mandatory Physical Checklist to Bring */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                Mandatory Physical Documents to Present at Enrollment Center:
              </span>
              <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-5">
                <li>
                  <strong>Original Green National Registration Card (NRC)</strong> of the applicant.
                </li>
                <li>
                  <strong>Original Certified Zambian Birth Certificate</strong> or Affidavit of Birth.
                </li>
                <li>
                  <strong>Two (2) Hardcopy Passport Photographs</strong> (35x45mm, plain white background, certified on reverse).
                </li>
                <li>
                  <strong>This Printed OPAS Acknowledgment Slip</strong> with legible barcode.
                </li>
                <li>
                  <strong>GRZ Official Receipt Reference ({currentApp.payment.receiptNumber || 'GRZ-2026'})</strong> for K{currentApp.payment.amount.toFixed(2)} ZMW.
                </li>
                {currentApp.applicationType === 'RENEWAL' && (
                  <li>
                    <strong>Previous Zambian Passport Booklet</strong> for physical perforation / voiding.
                  </li>
                )}
                {currentApp.applicationType === 'REPLACEMENT_LOST' && (
                  <li>
                    <strong>Original Zambia Police Service Loss Report</strong> and affidavit.
                  </li>
                )}
              </ul>
            </div>

            {/* Official Signatures */}
            <div className="pt-6 border-t border-slate-300 grid grid-cols-2 gap-8 text-[11px] text-slate-500">
              <div>
                <div className="h-10 border-b border-dashed border-slate-400 mb-1" />
                <span>Applicant Signature: <em>{currentApp.declaration.digitalSignature}</em></span>
              </div>
              <div>
                <div className="h-10 border-b border-dashed border-slate-400 mb-1" />
                <span>DNRPC Passport Intake Officer Signature & Official Date Stamp</span>
              </div>
            </div>
          </div>

          {/* Bottom Action */}
          <div className="no-print flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onViewDashboard}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
            >
              Return to My Applications
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-md transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Print Official Application Slip</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
