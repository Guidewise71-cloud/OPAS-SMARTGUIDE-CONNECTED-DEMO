import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  X,
  Bot,
  User,
  Shield,
  HelpCircle,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  ChevronRight,
  RefreshCw,
  Bell,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Compass,
} from 'lucide-react';
import { useChat } from '../../context/ChatContext';

interface AIGuidanceChatProps {
  isFullWidth?: boolean;
  onNavigateToTab?: (tab: string) => void;
}

const QUICK_PROMPTS = [
  'Contact information format rules (+260 & email)',
  'How do I fix my reverted application?',
  'Explain my Case Officer comments',
  'What should I do next for my application?',
  'Why is my case Paid-but-Unsubmitted?',
  'What are the passport photo requirements?',
  'How much is a 32-page vs 48-page passport?',
  'What documents are needed for first-time applicants?',
];

export const AIGuidanceChat: React.FC<AIGuidanceChatProps> = ({
  isFullWidth = false,
  onNavigateToTab,
}) => {
  const {
    messages,
    sendMessage,
    loading,
    isAssistantOpen,
    setIsAssistantOpen,
    currentSection,
    activeApplication,
    autoVoice,
    setAutoVoice,
    isSpeaking,
    handlePlayVoice,
    stopSpeech,
    unreadNotificationsCount,
    prefilledQuery,
    setPrefilledQuery,
    isLiveAiOnline,
    aiProviders,
  } = useChat();

  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [prefilledBanner, setPrefilledBanner] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Pre-populate input when a Quick Action is clicked
  useEffect(() => {
    if (prefilledQuery) {
      setInput(prefilledQuery);
      setPrefilledBanner(prefilledQuery);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
      setPrefilledQuery('');
    }
  }, [prefilledQuery, setPrefilledQuery]);

  // Scroll to bottom as messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Speech Recognition
  const handleToggleMic = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please type your message in the chat.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput(transcript);
          sendMessage(transcript);
        }
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognition.start();
    } catch (err) {
      console.error(err);
      setIsListening(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const text = input;
    setInput('');
    await sendMessage(text);
  };

  // If this is the compact floating widget and it's closed, don't render
  if (!isFullWidth && !isAssistantOpen) {
    return null;
  }

  return (
    <div
      className={
        isFullWidth
          ? 'w-full bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col h-[650px] relative'
          : 'fixed bottom-4 right-4 z-50 w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-300 overflow-hidden flex flex-col h-[580px] animate-in fade-in slide-in-from-bottom-4 duration-200'
      }
    >
      {/* Top Header with Notification Icon */}
      <div className="bg-emerald-900 text-white px-4 py-3 flex items-center justify-between relative z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center text-emerald-100 shadow-xs shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold">MoHAIS Passport Assistant</span>
              <span className="inline-flex items-center gap-1.5 text-[10px] bg-emerald-800 text-emerald-100 px-2 py-0.5 rounded-full font-mono font-bold border border-emerald-600 shadow-2xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                <span>{isLiveAiOnline ? 'AI PROVIDER CONFIGURED' : 'MoHAIS KNOWLEDGE ENGINE'}</span>
              </span>
              <span className="text-[10px] text-emerald-300 font-mono hidden md:inline">
                {isLiveAiOnline
                  ? `${aiProviders.map((provider) => provider === 'gemini-api' ? 'Gemini API' : provider === 'deepseek' ? 'DeepSeek' : 'Vertex AI').join(' → ')}`
                  : 'Local guidance • Online providers unavailable'}
              </span>
              {isFullWidth && (
                <span className="text-[10px] bg-emerald-700 text-emerald-100 px-1.5 py-0.2 rounded font-bold uppercase hidden sm:inline">
                  Full Guidance Console
                </span>
              )}
            </div>
            <p className="text-[11px] text-emerald-200/90 flex items-center gap-1.5 flex-wrap">
              <span>Section:</span>
              <span className="inline-flex items-center gap-1 bg-emerald-800 text-white font-semibold px-2 py-0.5 rounded text-[10px]">
                <Compass className="w-3 h-3 text-emerald-300 shrink-0" />
                <span>{currentSection || 'Dashboard'}</span>
              </span>
            </p>
          </div>
        </div>

        {/* Top Header Controls: Notification Bell, Voice Toggle, Close */}
        <div className="flex items-center gap-1.5">
          {/* Notification Icon on Top */}
          <div className="relative">
            <button
              onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer relative ${
                showNotificationsDropdown
                  ? 'bg-emerald-800 text-white'
                  : 'text-emerald-300 hover:text-white hover:bg-emerald-800'
              }`}
              title="Official OPAS Case Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Panel */}
            {showNotificationsDropdown && (
              <div className="absolute right-0 top-10 w-72 sm:w-80 bg-white border border-slate-200 rounded-xl shadow-2xl p-3 z-40 text-slate-900 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs font-bold text-slate-800">
                  <span className="flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Official Case Notifications</span>
                  </span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-800 px-1.5 py-0.2 rounded">
                    {unreadNotificationsCount} Active
                  </span>
                </div>

                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 my-1 text-xs">
                  {activeApplication && activeApplication.notifications.length > 0 ? (
                    activeApplication.notifications.map((notif) => (
                      <div key={notif.id} className="py-2 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-900 flex items-center gap-1">
                            {notif.subject || 'OPAS Alert'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {notif.channel}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug line-clamp-2">
                          {notif.content}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="py-4 text-center text-xs text-slate-400">
                      No pending notifications for this application.
                    </div>
                  )}
                </div>

                {onNavigateToTab && (
                  <button
                    onClick={() => {
                      setShowNotificationsDropdown(false);
                      onNavigateToTab('messages');
                    }}
                    className="w-full mt-1 pt-1.5 border-t border-slate-100 text-[11px] text-emerald-800 font-bold hover:text-emerald-950 text-center block cursor-pointer"
                  >
                    View All in Message Board &rarr;
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Voice Auto-Play Toggle */}
          <button
            onClick={() => setAutoVoice(!autoVoice)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              autoVoice ? 'text-emerald-200 bg-emerald-800' : 'text-emerald-400/70 hover:text-white'
            }`}
            title={autoVoice ? 'Auto Voice Playback: ON' : 'Auto Voice Playback: OFF'}
          >
            {autoVoice ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Close button (only on compact panel) */}
          {!isFullWidth && (
            <button
              onClick={() => setIsAssistantOpen(false)}
              className="text-emerald-300 hover:text-white p-1 rounded-lg hover:bg-emerald-800 transition-colors cursor-pointer"
              title="Minimize chat panel"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Navigated Section & Application Context Banner */}
      <div className="bg-emerald-50 px-3.5 py-1.5 border-b border-emerald-100 text-xs flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 text-[11px] font-medium">Navigating:</span>
          <span className="inline-flex items-center gap-1 bg-white border border-emerald-300 text-emerald-950 font-bold px-2 py-0.5 rounded text-[11px] shadow-2xs">
            <Compass className="w-3 h-3 text-emerald-700 shrink-0" />
            <span>{currentSection || 'Dashboard'}</span>
          </span>
        </div>

        {activeApplication ? (
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-slate-500 hidden sm:inline">Case:</span>
            <span className="font-bold text-slate-800">{activeApplication.trackingNumber}</span>
            <span
              className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${
                activeApplication.status === 'Reverted'
                  ? 'bg-red-100 text-red-800'
                  : activeApplication.status === 'Paid - Unsubmitted'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {activeApplication.status}
            </span>
          </div>
        ) : (
          <span className="text-[10px] text-slate-400 italic">Prototype guidance</span>
        )}
      </div>

      {/* Chat Messages Body */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/70 text-xs">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start gap-2 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.sender === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-emerald-800 text-white flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold shadow-2xs">
                OPAS
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-2xl p-3.5 shadow-xs relative ${
                m.sender === 'user'
                  ? 'bg-emerald-800 text-white rounded-br-xs'
                  : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
              }`}
            >
              {m.sender === 'assistant' && m.provider && (
                <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                  {m.provider === 'gemini-api'
                    ? 'Google Gemini API'
                    : m.provider === 'deepseek'
                    ? 'DeepSeek'
                    : m.provider === 'vertex-ai'
                    ? 'Google Vertex AI'
                    : 'Local guidance fallback'}
                </div>
              )}
              <div className="whitespace-pre-wrap leading-relaxed">{m.text}</div>

              {m.groundingSources && m.groundingSources.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                    Web Sources:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {m.groundingSources.map((source, idx) => (
                      <a
                        key={idx}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded hover:bg-emerald-100 transition-colors"
                      >
                        <ExternalLink className="w-2.5 h-2.5 text-emerald-600" />
                        <span className="truncate max-w-[170px]">{source.title}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mt-2 pt-1 border-t border-black/5 text-[10px]">
                {m.sender === 'assistant' ? (
                  <button
                    onClick={() => handlePlayVoice(m.id, m.text, m.audioBase64)}
                    className="text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    {isSpeaking === m.id ? (
                      <>
                        <VolumeX className="w-3.5 h-3.5 text-red-600 animate-pulse" />
                        <span className="text-red-600">Stop Speech</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Listen to Voice</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div />
                )}
                <span className={m.sender === 'user' ? 'text-emerald-200' : 'text-slate-400'}>
                  {m.timestamp}
                </span>
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-slate-500 text-xs py-2">
            <div className="w-6 h-6 rounded-full bg-emerald-800 text-white flex items-center justify-center shrink-0 text-[10px]">
              ...
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-slate-500 italic shadow-2xs flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
              <span>MoHAIS Assistant is generating guidance...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Questions Chips */}
      <div className="p-2 bg-white border-t border-slate-100 overflow-x-auto whitespace-nowrap flex gap-1.5 scrollbar-thin">
        {QUICK_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => sendMessage(prompt)}
            className="text-[11px] bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 border border-slate-200 hover:border-emerald-300 px-3 py-1 rounded-full shrink-0 transition-colors cursor-pointer"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Pre-populated Query Indicator Banner */}
      {prefilledBanner && input === prefilledBanner && (
        <div className="mx-3 my-1 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-900 flex items-center justify-between animate-in fade-in slide-in-from-bottom-1">
          <div className="flex items-center gap-1.5 font-medium truncate mr-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">Quick Action query loaded. Press Enter or click Send to submit.</span>
          </div>
          <button
            type="button"
            onClick={() => setPrefilledBanner(null)}
            className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer shrink-0"
            title="Dismiss indicator"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Input Form with Voice Input */}
      <form
        onSubmit={handleFormSubmit}
        className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
      >
        <button
          type="button"
          onClick={handleToggleMic}
          className={`p-2 rounded-lg transition-colors cursor-pointer ${
            isListening
              ? 'bg-red-600 text-white animate-pulse'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
          title={isListening ? 'Listening to voice...' : 'Speak your question (Microphone)'}
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (prefilledBanner && e.target.value !== prefilledBanner) {
              setPrefilledBanner(null);
            }
          }}
          placeholder={isListening ? 'Listening... speak clearly now' : 'Ask about requirements, photo rules, fees, or your case...'}
          className="flex-1 text-xs px-3.5 py-2.5 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
        />

        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="p-2.5 rounded-lg bg-emerald-800 text-white hover:bg-emerald-900 disabled:opacity-40 transition-colors cursor-pointer shadow-xs"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
