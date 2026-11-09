import React, { useState } from 'react';
import { usePassport } from '../../context/PassportContext';
import { ZambianPaymentMethod } from '../../types/passport';
import { OpasPaymentApiInspector } from '../OpasPaymentApiInspector';
import {
  CreditCard,
  ShieldCheck,
  Lock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Smartphone,
  RefreshCw,
  PhoneCall,
  Printer,
  Database,
  FileCheck2,
  QrCode,
  Hash,
} from 'lucide-react';

interface Step6PaymentProps {
  onPaymentSuccess: () => void;
  onBack: () => void;
}

export const Step6Payment: React.FC<Step6PaymentProps> = ({ onPaymentSuccess, onBack }) => {
  const {
    currentApp,
    currentUser,
    submitPayment,
    latestConfirmation,
    latestApiRecord,
  } = usePassport();

  if (!currentApp) return null;

  const fees = currentApp.payment.breakdown;
  const isAlreadyPaid = currentApp.payment.status === 'PAID';

  const [paymentMethod, setPaymentMethod] = useState<ZambianPaymentMethod>('AIRTEL_MONEY');
  const [mobileNumber, setMobileNumber] = useState(
    currentApp.personalDetails.mobilePhone || '+260 97 7451209'
  );
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardHolder, setCardHolder] = useState(
    `${currentApp.personalDetails.givenNames} ${currentApp.personalDetails.surname}`.toUpperCase()
  );
  const [expiry, setExpiry] = useState('11/28');
  const [cvv, setCvv] = useState('741');

  // Amount mode: user can choose either exact ZMW 500 test example or full statutory assessment
  const [paymentAmountChoice, setPaymentAmountChoice] = useState<number>(500);

  // Government Payment Gateway Processing Simulation
  const [isGatewayModalOpen, setIsGatewayModalOpen] = useState(false);
  const [gatewayStage, setGatewayStage] = useState<'AUTHORIZE' | 'PROCESSING' | 'CONFIRMED'>('AUTHORIZE');
  const [ussdPin, setUssdPin] = useState('');
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Toggle for OPAS Payment API Inspector
  const [showApiInspector, setShowApiInspector] = useState(false);

  const handleInitiatePayment = (amountToPay: number) => {
    setPaymentAmountChoice(amountToPay);
    setPaymentError(null);

    if (paymentMethod !== 'CREDIT_DEBIT_CARD' && !mobileNumber.trim()) {
      setPaymentError('Please enter a valid registered Zambian mobile number.');
      return;
    }

    setGatewayStage('AUTHORIZE');
    setUssdPin('');
    setIsGatewayModalOpen(true);
  };

  const handleExecuteGatewayPayment = async () => {
    setGatewayStage('PROCESSING');
    try {
      const cleanNum = cardNumber.replace(/\D/g, '');
      const last4 = cleanNum.slice(-4) || '5192';

      // 1. Calls Simulated Government Payment Gateway (generates test transaction reference & confirmation)
      // 2. Transmits and stores to Simulated OPAS Payment API (receives & stores txn ref, app ref, status, timestamp)
      const result = await submitPayment(paymentMethod, {
        amount: paymentAmountChoice,
        mobileNumber,
        cardNumber,
        cardHolder,
        last4,
      });

      if (result.success && result.confirmation) {
        setGatewayStage('CONFIRMED');
      } else {
        setGatewayStage('AUTHORIZE');
        setPaymentError('Payment was declined by payment gateway provider.');
      }
    } catch {
      setGatewayStage('AUTHORIZE');
      setPaymentError('Network communication error with ZamPay gateway. Please retry.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Top Banner: Simulated Government Payment Gateway & OPAS API Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Government Financial Switch · ZamPay
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500 font-mono">API /api/payment/process</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Lock className="w-5 h-5 text-emerald-800" />
            Simulated Government Payment Gateway
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-xl">
            Ministry of Finance &amp; Single Treasury Account payment switch. Processes applicant fees, generates test transaction references, and integrates with the OPAS Payment API.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowApiInspector(!showApiInspector)}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>{showApiInspector ? 'Hide API Inspector' : 'Inspect OPAS Payment API'}</span>
          </button>
        </div>
      </div>

      {/* Prominent Example Callout: Applicant Pays ZMW 500 */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-2 border-amber-400/80 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-amber-400 text-slate-950 font-black text-[11px] uppercase tracking-wider">
            <Sparkles className="w-3 h-3" />
            Featured User Example
          </div>
          <h3 className="text-base font-bold text-slate-950">
            Example: Applicant pays ZMW 500.00
          </h3>
          <p className="text-xs text-slate-600 max-w-xl">
            Simulate paying exactly <strong>ZMW 500.00</strong> to trigger the gateway, generate a test transaction reference, and store the reference, status, and timestamp in the OPAS Payment API ledger.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleInitiatePayment(500)}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-md shadow-sm transition-transform hover:scale-[1.02] flex items-center gap-2 cursor-pointer"
          >
            <span>Pay ZMW 500.00 (Test Example)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {paymentError && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{paymentError}</span>
        </div>
      )}

      {/* Cleared Payment State Card (If already completed) */}
      {isAlreadyPaid && (
        <div className="bg-emerald-50 border-2 border-emerald-600/40 rounded-xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-700 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                  Official Gateway Confirmation &middot; Cleared
                </span>
                <h3 className="text-lg font-black text-emerald-950">
                  Government Fee Payment Cleared
                </h3>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-emerald-700 block">Total Surcharged</span>
              <span className="text-xl font-bold font-mono text-emerald-950">
                K{currentApp.payment.amount.toFixed(2)} ZMW
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white/80 p-3 rounded border border-emerald-200">
              <span className="text-slate-500 block text-[10px]">Test Transaction Reference</span>
              <strong className="font-mono text-slate-900 block truncate">
                {currentApp.payment.transactionId || 'TXN-GRZ-2026-88192'}
              </strong>
            </div>

            <div className="bg-white/80 p-3 rounded border border-emerald-200">
              <span className="text-slate-500 block text-[10px]">Application Reference</span>
              <strong className="font-mono text-slate-900 block truncate">
                {currentApp.referenceNumber}
              </strong>
            </div>

            <div className="bg-white/80 p-3 rounded border border-emerald-200">
              <span className="text-slate-500 block text-[10px]">Payment Status</span>
              <strong className="text-emerald-800 font-bold block">
                {currentApp.payment.status} (Confirmed)
              </strong>
            </div>

            <div className="bg-white/80 p-3 rounded border border-emerald-200">
              <span className="text-slate-500 block text-[10px]">Timestamp</span>
              <strong className="text-slate-900 text-[11px] block font-mono">
                {currentApp.payment.paidAt ? new Date(currentApp.payment.paidAt).toLocaleTimeString() : 'Recorded'}
              </strong>
            </div>
          </div>

          <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-blue-950 font-bold text-sm"><CheckCircle2 className="w-4 h-4 text-emerald-700" /> Smart Payment Return Assistant</div>
            <p className="text-sm font-semibold text-blue-950">You have successfully paid for your passport service.</p>
            <p className="text-xs text-blue-900">Please return to your passport application and complete the remaining steps. Your payment does not automatically submit your application.</p>
            <p className="text-xs text-blue-900 font-semibold">You do not need to pay again. Select Continue to proceed with your application.</p>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
            <div className="text-[11px] text-emerald-800 flex items-center gap-1.5">
              <FileCheck2 className="w-4 h-4 text-emerald-700" />
              <span>
                Transaction record persisted in <strong>OPAS Payment API Ledger</strong>.
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onPaymentSuccess}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-md transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <span>Proceed to Biometric Office Booking</span>
                <ArrowRight className="w-4 h-4 text-amber-300" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Payment Selection & Billing Assessment Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Payment Channels and Form */}
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              Select Official Payment Channel <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('AIRTEL_MONEY')}
                className={`p-3 rounded-lg border text-center transition-all cursor-pointer ${
                  paymentMethod === 'AIRTEL_MONEY'
                    ? 'border-red-600 bg-red-50/60 ring-2 ring-red-500 font-bold text-red-950'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xs mx-auto mb-1">
                  A
                </div>
                <span className="text-xs block">Airtel Money</span>
                <span className="text-[10px] text-slate-400 font-mono block">*115#</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('MTN_MOMO')}
                className={`p-3 rounded-lg border text-center transition-all cursor-pointer ${
                  paymentMethod === 'MTN_MOMO'
                    ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-400 font-bold text-amber-950'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="w-7 h-7 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-xs mx-auto mb-1">
                  M
                </div>
                <span className="text-xs block">MTN MoMo</span>
                <span className="text-[10px] text-slate-400 font-mono block">*303#</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('ZAMTEL_KWACHA')}
                className={`p-3 rounded-lg border text-center transition-all cursor-pointer ${
                  paymentMethod === 'ZAMTEL_KWACHA'
                    ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500 font-bold text-emerald-950'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs mx-auto mb-1">
                  Z
                </div>
                <span className="text-xs block">Zamtel Kwacha</span>
                <span className="text-[10px] text-slate-400 font-mono block">*344#</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('CREDIT_DEBIT_CARD')}
                className={`p-3 rounded-lg border text-center transition-all cursor-pointer ${
                  paymentMethod === 'CREDIT_DEBIT_CARD'
                    ? 'border-slate-900 bg-slate-900/5 ring-2 ring-slate-900 font-bold text-slate-950'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <CreditCard className="w-6 h-6 mx-auto mb-1 text-slate-700" />
                <span className="text-xs block">Bank Card</span>
                <span className="text-[10px] text-slate-400 block">Visa/Mastercard</span>
              </button>
            </div>
          </div>

          {/* Payment Form Details */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            {paymentMethod !== 'CREDIT_DEBIT_CARD' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-semibold text-slate-900">
                    {paymentMethod === 'AIRTEL_MONEY'
                      ? 'Airtel Money Zambia Payment'
                      : paymentMethod === 'MTN_MOMO'
                      ? 'MTN Mobile Money Zambia'
                      : 'Zamtel Kwacha Mobile Wallet'}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">Instant Mobile Prompt</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Registered Zambian Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={mobileNumber}
                    onChange={e => setMobileNumber(e.target.value)}
                    placeholder="+260 97 0000000"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    A test USSD payment authorization prompt will be pushed to this mobile handset.
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600 flex items-center gap-2">
                  <PhoneCall className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>
                    No agent surcharge. Statutory fee collection for DNRPC Passports.
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-semibold text-slate-900">
                    Visa / Mastercard Debit (Zanaco, Absa, FNB, Stanbic)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setCardNumber('4000 1234 5678 9010');
                      setExpiry('08/29');
                      setCvv('421');
                    }}
                    className="text-[11px] text-emerald-800 hover:text-emerald-900 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    Fill Demo Visa Card
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Card Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={cardNumber}
                    onChange={e => setCardNumber(e.target.value)}
                    placeholder="4000 0000 0000 0000"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Expiry <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={expiry}
                      onChange={e => setExpiry(e.target.value)}
                      placeholder="MM/YY"
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      CVV / Security Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      maxLength={4}
                      value={cvv}
                      onChange={e => setCvv(e.target.value.replace(/\D/g, ''))}
                      placeholder="•••"
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Payment Trigger Buttons */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={() => handleInitiatePayment(500)}
                className="w-full py-3 px-4 bg-emerald-800 hover:bg-emerald-900 text-white font-black text-xs rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Lock className="w-3.5 h-3.5 text-amber-300" />
                <span>Simulate Payment of ZMW 500.00 (Example Trigger)</span>
              </button>

              {fees.total !== 500 && (
                <button
                  type="button"
                  onClick={() => handleInitiatePayment(fees.total)}
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold text-xs rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Pay Assessed Total of K{fees.total.toFixed(2)} ZMW</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Itemized Order & Assessment Sidebar */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
              Ministry Assessment Breakdown
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              Filing: {currentApp.referenceNumber}
            </span>
          </div>

          <div className="space-y-2.5 text-xs text-slate-600">
            <div className="flex items-center justify-between">
              <span>Passport Booklet Base (32p Standard)</span>
              <span className="font-mono font-bold text-slate-900">K{fees.baseFee.toFixed(2)}</span>
            </div>

            {fees.bookletFee > 0 && (
              <div className="flex items-center justify-between">
                <span>48-Page Extended Capacity Booklet</span>
                <span className="font-mono font-bold text-slate-900">+K{fees.bookletFee.toFixed(2)}</span>
              </div>
            )}

            {fees.speedFee > 0 && (
              <div className="flex items-center justify-between">
                <span>Fast-Track Service ({currentApp.processingSpeed})</span>
                <span className="font-mono font-bold text-slate-900">+K{fees.speedFee.toFixed(2)}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span>Biometric Processing &amp; Chip Encoding Levy</span>
              <span className="font-mono font-bold text-slate-900">K{fees.biometricProcessingFee.toFixed(2)}</span>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-sm font-bold text-slate-900">
              <span>Total Assessed</span>
              <span className="font-mono text-lg text-emerald-800">
                K{fees.total.toFixed(2)} <span className="text-xs font-sans">ZMW</span>
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-500 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>OPAS Payment API Architecture</span>
            </div>
            <p className="leading-relaxed">
              When payment is authorized, the Government Gateway issues a test transaction reference. The OPAS Payment API then stores the transaction reference, application reference, status, and timestamp.
            </p>
          </div>
        </div>
      </div>

      {/* Simulated OPAS Payment API Inspector (Inline) */}
      {showApiInspector && (
        <div className="pt-2">
          <OpasPaymentApiInspector inline={true} onClose={() => setShowApiInspector(false)} />
        </div>
      )}

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-md transition-colors flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Declaration
        </button>

        {isAlreadyPaid && (
          <button
            type="button"
            onClick={onPaymentSuccess}
            className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-md transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <span>Continue to Biometrics Booking</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Simulated Government Payment Gateway Interactive Modal */}
      {isGatewayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
            {/* Government Gateway Top Bar */}
            <div className="bg-slate-950 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-sm font-serif">
                  🇿🇲
                </div>
                <div>
                  <h4 className="text-xs font-bold tracking-tight text-white">
                    ZamPay &middot; Republic of Zambia Payment Gateway
                  </h4>
                  <span className="text-[10px] text-amber-400 font-medium">
                    Ministry of Finance Single Treasury Switch
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono bg-emerald-900 text-emerald-200 px-2 py-0.5 rounded font-bold">
                SECURE 256-BIT
              </span>
            </div>

            {/* Gateway Body by Stage */}
            {gatewayStage === 'AUTHORIZE' && (
              <div className="p-6 space-y-4">
                <div className="text-center space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Official Fee Checkout
                  </span>
                  <div className="text-3xl font-black font-mono text-emerald-800">
                    ZMW {paymentAmountChoice.toFixed(2)}
                  </div>
                  <p className="text-xs text-slate-600">
                    Biller: <strong>Ministry of Home Affairs &amp; Internal Security (DNRPC)</strong>
                  </p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs space-y-1.5 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Payment Method:</span>
                    <strong className="text-slate-900">{paymentMethod}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Application Ref:</span>
                    <strong className="text-slate-900">{currentApp.referenceNumber}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Applicant NRC:</span>
                    <strong className="text-slate-900">{currentApp.personalDetails.nrcNumber || '381920/11/1'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Mobile Handset:</span>
                    <strong className="text-slate-900">{mobileNumber}</strong>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 text-center">
                    Simulate Authorizing USSD Mobile PIN
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={ussdPin}
                    onChange={e => setUssdPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="w-32 mx-auto block text-center tracking-widest text-xl font-mono font-bold py-2 border-2 border-slate-300 rounded-md focus:border-emerald-700 focus:outline-none"
                  />
                  <div className="text-center mt-1">
                    <button
                      type="button"
                      onClick={() => setUssdPin('4921')}
                      className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer underline"
                    >
                      Fill Demo PIN (4921)
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsGatewayModalOpen(false)}
                    className="flex-1 py-2 text-xs text-slate-600 hover:text-slate-800 border border-slate-200 rounded-md cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteGatewayPayment}
                    className="flex-1 py-2.5 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-md cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-300" />
                    <span>Authorize &amp; Pay ZMW {paymentAmountChoice.toFixed(2)}</span>
                  </button>
                </div>
              </div>
            )}

            {gatewayStage === 'PROCESSING' && (
              <div className="p-8 text-center space-y-4">
                <RefreshCw className="w-10 h-10 animate-spin text-emerald-700 mx-auto" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900">
                    Connecting to Government Payment Switch...
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Contacting mobile network operator and generating official test transaction reference...
                  </p>
                </div>
                <div className="text-[11px] font-mono text-emerald-800 bg-emerald-50 py-1.5 px-3 rounded border border-emerald-200 inline-block">
                  Transmitting to OPAS Payment API (/api/payment/process)...
                </div>
              </div>
            )}

            {gatewayStage === 'CONFIRMED' && latestConfirmation && (
              <div className="p-6 space-y-5">
                {/* Official Confirmation Banner */}
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                    Government Payment Confirmation
                  </span>
                  <h3 className="text-lg font-black text-slate-950">
                    Payment Surcharged &amp; Confirmed
                  </h3>
                  <p className="text-xs text-slate-500">
                    The payment gateway generated your test transaction reference and registered it with the OPAS Payment API.
                  </p>
                </div>

                {/* Receipt Details Box */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Test Transaction Reference:</span>
                    <span className="font-mono font-bold text-emerald-800 text-sm">
                      {latestConfirmation.transactionReference}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Application Reference:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {currentApp.referenceNumber}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Payment Status:</span>
                    <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
                      {latestConfirmation.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Amount Paid:</span>
                    <span className="font-mono font-black text-slate-900">
                      ZMW {latestConfirmation.amount.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Timestamp:</span>
                    <span className="font-mono text-slate-700 text-[11px]">
                      {latestConfirmation.timestamp}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-200 pb-2 gap-3">
                    <span className="text-slate-500">Payment Registration Number (PRN):</span>
                    <span className="font-mono font-bold text-slate-900">{latestConfirmation.paymentRegistrationNumber}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2 gap-3">
                    <span className="text-slate-500">Gateway Approval Code:</span>
                    <span className="font-mono font-bold text-slate-900">{latestConfirmation.approvalCode}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2 gap-3">
                    <span className="text-slate-500">OPAS Acknowledgement:</span>
                    <span className="font-mono font-bold text-emerald-800">{latestApiRecord?.opasAcknowledgementReference || 'Awaiting OPAS response'}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2 gap-3">
                    <span className="text-slate-500">OPAS Receipt Status:</span>
                    <span className="text-emerald-800 font-bold">{latestApiRecord?.opasConfirmationStatus || 'Not yet acknowledged'}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2 gap-3">
                    <span className="text-slate-500">OPAS Received At:</span>
                    <span className="font-mono text-slate-700 text-[11px]">{latestApiRecord?.opasReceivedAt || 'Pending'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">OPAS API Ledger:</span>
                    <span className="text-emerald-800 font-bold flex items-center gap-1 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {latestApiRecord?.storedInLedger ? 'Received & Stored' : 'Awaiting confirmation'}
                    </span>
                  </div>
                </div>

                {/* Modal Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsGatewayModalOpen(false);
                      setShowApiInspector(true);
                    }}
                    className="flex-1 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 border border-slate-200 rounded-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Database className="w-3.5 h-3.5 text-emerald-700" />
                    <span>View in API Ledger</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsGatewayModalOpen(false);
                      onPaymentSuccess();
                    }}
                    className="flex-1 py-2.5 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-md cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <span>Proceed to Appointment (Step 7)</span>
                    <ArrowRight className="w-4 h-4 text-amber-300" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
