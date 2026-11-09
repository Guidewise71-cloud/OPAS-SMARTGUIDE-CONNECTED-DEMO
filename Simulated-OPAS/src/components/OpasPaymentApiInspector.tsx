import React, { useState } from 'react';
import { usePassport } from '../context/PassportContext';
import {
  Database,
  CheckCircle2,
  Code2,
  RefreshCw,
  Send,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface OpasPaymentApiInspectorProps {
  isOpen?: boolean;
  onClose?: () => void;
  inline?: boolean;
}

export const OpasPaymentApiInspector: React.FC<OpasPaymentApiInspectorProps> = ({
  isOpen = true,
  onClose,
  inline = false,
}) => {
  const {
    currentApp,
    latestConfirmation,
    latestApiRecord,
    storedLedgerRecords,
    testOpasPaymentApiDirectly,
  } = usePassport();

  const [activeTab, setActiveTab] = useState<'LEDGER' | 'PAYLOAD' | 'TEST'>('LEDGER');
  const [copied, setCopied] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testAmount, setTestAmount] = useState<number>(500);
  const [testResult, setTestResult] = useState<any>(null);

  const samplePayload = latestApiRecord
    ? {
        endpoint: 'POST /api/payment/process',
        status: 200,
        requestBody: {
          transactionReference: latestApiRecord.transactionReference,
          applicationReference: latestApiRecord.applicationReference,
          paymentStatus: latestApiRecord.paymentStatus,
          timestamp: latestApiRecord.timestamp,
          amount: latestApiRecord.amount,
          currency: latestApiRecord.currency,
          payerName: latestApiRecord.payerName,
          payerNrc: latestApiRecord.payerNrc,
          paymentMethod: latestApiRecord.paymentMethod,
          paymentRegistrationNumber: latestApiRecord.paymentRegistrationNumber,
          approvalCode: latestApiRecord.approvalCode,
          digitalReceiptHash: latestApiRecord.digitalReceiptHash,
        },
        responseBody: {
          success: true,
          message: 'Gateway confirmation received and recorded by simulated OPAS.',
          timestamp: latestApiRecord.receivedAt,
          opasAcknowledgement: {
            acknowledgementReference: latestApiRecord.opasAcknowledgementReference,
            status: latestApiRecord.opasConfirmationStatus,
            receivedAt: latestApiRecord.opasReceivedAt,
          },
          record: latestApiRecord,
        },
      }
    : {
        endpoint: 'POST /api/payment/process',
        status: 200,
        requestBody: {
          transactionReference: 'TXN-GRZ-2026-38291',
          applicationReference: currentApp?.referenceNumber || 'ZM-PAS-2026-819203',
          paymentStatus: 'PAID',
          timestamp: '2026-11-06T14:30:00.000Z',
          amount: 500,
          currency: 'ZMW',
          payerName: 'Mulenga Banda',
          payerNrc: '381920/11/1',
          paymentMethod: 'AIRTEL_MONEY',
        },
        responseBody: {
          success: true,
          message: 'Payment transaction successfully received and stored in OPAS Treasury Ledger',
          timestamp: '2026-11-06T14:30:01.210Z',
          record: {
            id: 'LEDGER-ZM-2026-00109',
            transactionReference: 'TXN-GRZ-2026-38291',
            applicationReference: currentApp?.referenceNumber || 'ZM-PAS-2026-819203',
            paymentStatus: 'PAID',
            timestamp: '2026-11-06T14:30:00.000Z',
            amount: 500,
            currency: 'ZMW',
            storedInLedger: true,
          },
        },
      };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(samplePayload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRunApiTest = async () => {
    setIsSendingTest(true);
    try {
      const res = await testOpasPaymentApiDirectly(testAmount);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ error: err?.message || 'API request failed' });
    } finally {
      setIsSendingTest(false);
    }
  };

  const content = (
    <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-lg text-slate-200 overflow-hidden text-xs">
      {/* Top Banner */}
      <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-white tracking-wide">
            Simulated OPAS Payment API &amp; Treasury Ledger
          </span>
          <span className="bg-emerald-950 text-emerald-400 border border-emerald-800/80 px-2 py-0.5 rounded text-[10px] font-mono">
            /api/payment/process
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Stored Records: <strong className="text-white font-mono">{storedLedgerRecords.length}</strong>
          </span>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white px-2 py-1 rounded cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-4 flex items-center gap-4">
        <button
          type="button"
          onClick={() => setActiveTab('LEDGER')}
          className={`py-2.5 font-semibold text-xs border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'LEDGER'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Stored Transactions ({storedLedgerRecords.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('PAYLOAD')}
          className={`py-2.5 font-semibold text-xs border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'PAYLOAD'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>API Payload &amp; Response Inspector</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('TEST')}
          className={`py-2.5 font-semibold text-xs border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'TEST'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>Direct API Tester (Pay ZMW 500)</span>
        </button>
      </div>

      {/* Tab 1: Stored Ledger Records */}
      {activeTab === 'LEDGER' && (
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>
              Transactions received by the <strong>Simulated OPAS Payment API</strong> and persisted in the treasury ledger.
            </span>
            <span className="text-emerald-400 flex items-center gap-1 font-mono">
              <CheckCircle2 className="w-3 h-3" />
              Live Ledger Active
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-lg">
            <table className="w-full text-left font-mono text-[11px]">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2 px-3">Ledger ID</th>
                  <th className="py-2 px-3">Transaction Ref</th>
                  <th className="py-2 px-3">Application Ref</th>
                  <th className="py-2 px-3">PRN</th>
                  <th className="py-2 px-3">OPAS Acknowledgement</th>
                  <th className="py-2 px-3">Amount (ZMW)</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                {storedLedgerRecords.map(rec => (
                  <tr key={rec.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-3 text-slate-400">{rec.id}</td>
                    <td className="py-2 px-3 font-bold text-amber-300">{rec.transactionReference}</td>
                    <td className="py-2 px-3 text-slate-300">{rec.applicationReference}</td>
                    <td className="py-2 px-3 text-slate-300">{rec.paymentRegistrationNumber || '—'}</td>
                    <td className="py-2 px-3 text-emerald-300">{rec.opasAcknowledgementReference || '—'}</td>
                    <td className="py-2 px-3 text-emerald-400 font-bold">K{rec.amount.toFixed(2)}</td>
                    <td className="py-2 px-3">
                      <span className="bg-emerald-950 text-emerald-300 border border-emerald-700/60 px-1.5 py-0.5 rounded text-[10px] font-sans font-bold">
                        {rec.paymentStatus}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-400 text-[10px] whitespace-nowrap">
                      {new Date(rec.timestamp).toLocaleDateString()} {new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: JSON Payload Inspector */}
      {activeTab === 'PAYLOAD' && (
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Contract: Receives gateway transaction and application references, PRN, approval details, and returns an OPAS acknowledgement reference with its recorded timestamp.
            </span>
            <button
              onClick={handleCopyJson}
              className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded flex items-center gap-1 cursor-pointer transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy JSON'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Request */}
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-amber-400">
                <span>Incoming HTTP POST Request</span>
                <span className="text-[10px] font-mono bg-amber-400/10 px-1.5 py-0.5 rounded">POST</span>
              </div>
              <pre className="font-mono text-[10px] text-slate-300 overflow-x-auto max-h-56 p-2 bg-slate-900 rounded">
                {JSON.stringify(samplePayload.requestBody, null, 2)}
              </pre>
            </div>

            {/* Response */}
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-emerald-400">
                <span>OPAS API Response (200 OK)</span>
                <span className="text-[10px] font-mono bg-emerald-400/10 px-1.5 py-0.5 rounded">HTTP 200</span>
              </div>
              <pre className="font-mono text-[10px] text-emerald-200 overflow-x-auto max-h-56 p-2 bg-slate-900 rounded">
                {JSON.stringify(samplePayload.responseBody, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Direct API Tester */}
      {activeTab === 'TEST' && (
        <div className="p-4 space-y-3">
          <div className="text-slate-300 text-xs">
            Trigger a simulated gateway test transaction directly to verify that the <strong>OPAS Payment API</strong> stores the transaction reference and payment confirmation.
          </div>

          <div className="flex items-center gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Amount (Zambian Kwacha)
              </label>
              <div className="flex items-center gap-1 font-mono">
                <span className="text-slate-400">K</span>
                <input
                  type="number"
                  value={testAmount}
                  onChange={e => setTestAmount(Number(e.target.value) || 500)}
                  className="w-28 px-2 py-1 bg-slate-950 border border-slate-700 rounded text-white text-xs font-mono"
                />
                <span className="text-slate-400 text-xs">ZMW</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRunApiTest}
              disabled={isSendingTest}
              className="mt-4 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
            >
              {isSendingTest ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing Test Payment...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 text-amber-300" />
                  <span>Execute Test Payment of ZMW {testAmount}</span>
                </>
              )}
            </button>
          </div>

          {testResult && (
            <div className="mt-3 p-3 bg-slate-950 border border-emerald-900/60 rounded-lg space-y-1">
              <span className="text-emerald-400 font-bold block text-[11px] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                API Received &amp; Stored Record:
              </span>
              <pre className="text-[10px] font-mono text-emerald-200 overflow-x-auto max-h-48 p-2 bg-slate-900 rounded">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (inline) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="max-w-4xl w-full">{content}</div>
    </div>
  );
};
