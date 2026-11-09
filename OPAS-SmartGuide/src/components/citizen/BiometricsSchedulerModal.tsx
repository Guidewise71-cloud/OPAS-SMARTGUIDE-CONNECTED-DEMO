import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Shield,
  Printer,
  Download,
  AlertTriangle,
  QrCode,
  Sparkles,
} from 'lucide-react';
import { PassportApplication } from '../../types/passport';

interface BiometricsSchedulerModalProps {
  application: PassportApplication;
  onClose: () => void;
  onConfirmSchedule: (dateString: string, office: string) => void;
}

const PASSPORT_STATIONS = [
  { id: 'lusaka', name: 'Lusaka Central Passport Office', address: 'Plot 104, Makishi Road, Lusaka', counters: 'Counters 1-8' },
  { id: 'ndola', name: 'Ndola Regional Passport Office', address: 'President Avenue, Civic Centre, Ndola', counters: 'Counters 1-4' },
  { id: 'livingstone', name: 'Livingstone Regional Passport Office', address: 'Mosi-oa-Tunya Road, Livingstone', counters: 'Counters 1-3' },
  { id: 'kitwe', name: 'Kitwe Provincial Passport Office', address: 'Independence Avenue, Kitwe', counters: 'Counters 1-3' },
  { id: 'chipata', name: 'Chipata Provincial Passport Center', address: 'Umodzi Highway, Chipata', counters: 'Counters 1-2' },
];

const TIME_SLOTS = [
  '08:30 AM - 09:30 AM',
  '09:30 AM - 10:30 AM',
  '10:30 AM - 11:30 AM',
  '11:30 AM - 12:30 PM',
  '02:00 PM - 03:00 PM',
  '03:00 PM - 04:00 PM',
];

export const BiometricsSchedulerModal: React.FC<BiometricsSchedulerModalProps> = ({
  application,
  onClose,
  onConfirmSchedule,
}) => {
  const [selectedStation, setSelectedStation] = useState(
    PASSPORT_STATIONS.find((s) => s.name === application.collectionOffice) || PASSPORT_STATIONS[0]
  );
  const [selectedDate, setSelectedDate] = useState('2026-11-04');
  const [selectedTime, setSelectedTime] = useState(TIME_SLOTS[1]);
  const [isBooked, setIsBooked] = useState(false);

  const appointmentString = `${selectedDate} ${selectedTime.split(' - ')[0]}`;

  const handleBook = () => {
    setIsBooked(true);
    onConfirmSchedule(appointmentString, selectedStation.name);
  };

  const handlePrintSlip = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-emerald-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center text-white">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Biometrics Enrollment Booking</h3>
              <p className="text-xs text-emerald-200/90">
                Ministry of Home Affairs &bull; National Biometric Capture
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-emerald-300 hover:text-white rounded hover:bg-emerald-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {!isBooked ? (
            <>
              {/* Context Pill */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-500 block">Applicant Dossier:</span>
                  <span className="font-bold text-slate-900 text-sm">{application.fullName}</span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs text-slate-600 block">{application.trackingNumber}</span>
                  <span className="text-[11px] text-emerald-700 font-semibold">Green NRC: {application.nrcNumber}</span>
                </div>
              </div>

              {/* Station Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  1. Select Passport Office Center
                </label>
                <div className="space-y-2">
                  {PASSPORT_STATIONS.map((station) => (
                    <div
                      key={station.id}
                      onClick={() => setSelectedStation(station)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                        selectedStation.id === station.id
                          ? 'border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-500'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-slate-900">{station.name}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{station.address}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono bg-white px-2 py-1 rounded border border-slate-200 text-slate-600">
                        {station.counters}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Date & Time Slot */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                    2. Appointment Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min="2026-10-30"
                    max="2026-11-30"
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-emerald-500 font-sans"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Operating Mon-Fri, 08:00 - 16:30
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                    3. Available Time Window
                  </label>
                  <select
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-emerald-500"
                  >
                    {TIME_SLOTS.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-emerald-700 font-semibold mt-1 block">
                    &bull; 4 slots available in this window
                  </span>
                </div>
              </div>

              {/* Instructions checklist */}
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl space-y-1.5 text-blue-900">
                <span className="font-bold flex items-center gap-1.5 text-xs">
                  <Shield className="w-4 h-4 text-blue-700" />
                  Mandatory Physical Items for Enrollment:
                </span>
                <ul className="list-disc list-inside text-[11px] space-y-0.5 text-blue-800 ml-1">
                  <li>Original physical Green National Registration Card (NRC).</li>
                  <li>Certified copy of official Birth Certificate.</li>
                  <li>Original signed and stamped Guarantor Section page.</li>
                  <li>Proof of OPAS payment receipt (ZMW {application.feeAmount}).</li>
                </ul>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  onClick={handleBook}
                  className="w-full py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Biometrics Appointment &amp; Issue Slip</span>
                </button>
              </div>
            </>
          ) : (
            /* Confirmation & Printable Slip */
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-center space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-1" />
                <h4 className="text-sm font-bold text-emerald-950">Appointment Successfully Confirmed!</h4>
                <p className="text-xs text-emerald-800">
                  An automated confirmation SMS has been dispatched to {application.contact.phone}.
                </p>
              </div>

              {/* Official Slip Printable Card */}
              <div className="border-2 border-slate-300 rounded-xl p-5 bg-white space-y-4 print:border-black">
                {/* Government Header */}
                <div className="text-center border-b border-slate-200 pb-3">
                  <div className="text-[10px] font-bold text-emerald-900 uppercase tracking-widest">
                    Republic of Zambia &bull; Ministry of Home Affairs
                  </div>
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight mt-0.5">
                    Biometric Enrollment &amp; Verification Slip
                  </h4>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    OPAS Reference: {application.trackingNumber}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1.5 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Applicant Name:</span>
                      <span className="font-bold text-slate-900 text-xs">{application.fullName}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-400 text-[10px] block">Green NRC:</span>
                        <span className="font-mono font-semibold text-slate-800">{application.nrcNumber}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Passport Type:</span>
                        <span className="font-semibold text-slate-800">{application.passportType}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Appointment Schedule:</span>
                      <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block font-mono">
                        {selectedDate} @ {selectedTime}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Station &amp; Address:</span>
                      <span className="font-semibold text-slate-900">{selectedStation.name}</span>
                      <span className="text-[10px] text-slate-500 block">{selectedStation.address}</span>
                    </div>
                  </div>

                  {/* QR Verification Placeholder */}
                  <div className="flex flex-col items-center justify-center p-2 bg-slate-50 rounded-lg border border-slate-200 text-center">
                    <QrCode className="w-16 h-16 text-slate-800" />
                    <span className="text-[8px] font-mono font-bold text-slate-500 mt-1">
                      SCAN AT COUNTER
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-500 flex items-center justify-between">
                  <span>Present this slip alongside original Green NRC</span>
                  <span className="font-mono font-semibold">Valid 30 Days</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={handlePrintSlip}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Appointment Slip</span>
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
