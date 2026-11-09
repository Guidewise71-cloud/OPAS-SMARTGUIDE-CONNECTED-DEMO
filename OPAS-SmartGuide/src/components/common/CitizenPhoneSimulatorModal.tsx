import React, { useState } from 'react';
import {
  X,
  Phone,
  MessageSquare,
  Signal,
  Wifi,
  Battery,
  Send,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { PassportApplication, NotificationLog } from '../../types/passport';

interface CitizenPhoneSimulatorModalProps {
  application: PassportApplication;
  onClose: () => void;
  onOpenCitizenPortal?: () => void;
  onSendTestSms?: (content: string) => void;
}

export const CitizenPhoneSimulatorModal: React.FC<CitizenPhoneSimulatorModalProps> = ({
  application,
  onClose,
  onOpenCitizenPortal,
  onSendTestSms,
}) => {
  const [network, setNetwork] = useState<'Airtel ZM' | 'MTN Zambia' | 'Zamtel'>('Airtel ZM');
  const [replyText, setReplyText] = useState('');
  const [repliedNotice, setRepliedNotice] = useState<string | null>(null);

  const smsNotifications = application.notifications.filter(
    (n) => n.channel === 'SMS' || n.channel === 'OPAS Message Board'
  );

  const handleSendQuickReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setRepliedNotice(`Reply sent: "${replyText}". MoHAIS OPAS Gateway acknowledged.`);
    setReplyText('');
    setTimeout(() => setRepliedNotice(null), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col h-[640px] relative animate-in fade-in duration-200">
        {/* Smartphone Speaker & Camera Notch */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-950 rounded-full z-30 flex items-center justify-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
          <div className="w-8 h-1 rounded-full bg-slate-850" />
        </div>

        {/* Status Bar */}
        <div className="px-5 pt-3 pb-1.5 bg-slate-950 text-white flex items-center justify-between text-[11px] font-semibold select-none z-20">
          <div className="flex items-center gap-1.5">
            <span className="font-bold">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <span className="text-slate-400 text-[10px]">&bull; {network}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <Signal className="w-3.5 h-3.5" />
            <Wifi className="w-3.5 h-3.5" />
            <Battery className="w-4 h-4 text-emerald-400" />
          </div>
        </div>

        {/* Phone App Bar (SMS Message Thread Header) */}
        <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 text-white flex items-center justify-between z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              ZM
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white">MoHAIS-OPAS</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                {application.contact.phone} &bull; Verified
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close mobile preview"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Telecom Switcher Bar */}
        <div className="bg-slate-950/70 px-4 py-1.5 border-b border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
          <span>Carrier SIM:</span>
          <div className="flex gap-1.5">
            {(['Airtel ZM', 'MTN Zambia', 'Zamtel'] as const).map((net) => (
              <button
                key={net}
                onClick={() => setNetwork(net)}
                className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                  network === net
                    ? 'bg-emerald-900 text-emerald-200 font-bold'
                    : 'hover:text-slate-200'
                }`}
              >
                {net}
              </button>
            ))}
          </div>
        </div>

        {/* Message Thread Body */}
        <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-[#0b1320] text-xs">
          {/* Day Header */}
          <div className="text-center my-2">
            <span className="text-[10px] bg-slate-800/80 text-slate-400 px-2 py-0.5 rounded-full font-mono">
              Today &bull; Official Government SMS
            </span>
          </div>

          {smsNotifications.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <p>No SMS dispatched yet to {application.contact.phone}.</p>
              <p className="text-[11px] text-slate-600 mt-1">
                Dispatch reminders from the Officer Action Queue or Case Triage to see real-time alerts appear here.
              </p>
            </div>
          ) : (
            smsNotifications.map((sms) => (
              <div key={sms.id} className="space-y-1">
                <div className="max-w-[90%] bg-slate-800 text-slate-100 p-3 rounded-2xl rounded-tl-xs border border-slate-700 shadow-md space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-emerald-400 font-bold border-b border-slate-700/60 pb-1">
                    <span>{sms.subject || 'MoHAIS Notification'}</span>
                    <span className="text-slate-400 font-mono text-[9px]">
                      {new Date(sms.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed font-sans">{sms.content}</p>
                  <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" />
                      Delivered via {network}
                    </span>
                    <span className="font-mono text-[9px] text-slate-500">Ref #{application.trackingNumber}</span>
                  </div>
                </div>
              </div>
            ))
          )}

          {repliedNotice && (
            <div className="p-2 bg-emerald-950/80 border border-emerald-700 rounded-lg text-[11px] text-emerald-200 text-center animate-in fade-in">
              {repliedNotice}
            </div>
          )}
        </div>

        {/* Citizen Quick Reply Box */}
        <form
          onSubmit={handleSendQuickReply}
          className="p-2.5 bg-slate-900 border-t border-slate-800 flex items-center gap-2"
        >
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="SMS reply to 260971204481..."
            className="flex-1 bg-slate-950 text-white text-xs px-3 py-2 rounded-full border border-slate-700 focus:outline-hidden focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={!replyText.trim()}
            className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full transition-colors cursor-pointer disabled:opacity-40"
            title="Send SMS reply"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Home Navigation Pill Bar */}
        <div className="py-2 bg-slate-950 flex items-center justify-center">
          <div className="w-24 h-1 bg-slate-700 rounded-full" />
        </div>
      </div>
    </div>
  );
};
