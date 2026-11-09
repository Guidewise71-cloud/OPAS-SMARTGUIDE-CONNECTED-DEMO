import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { ChatMessage, PassportApplication, NotificationLog } from '../types/passport';

interface ChatContextType {
  messages: ChatMessage[];
  sendMessage: (text: string) => Promise<void>;
  loading: boolean;
  isAssistantOpen: boolean;
  setIsAssistantOpen: (open: boolean) => void;
  isGuidanceScreen: boolean;
  setIsGuidanceScreen: (isGuidance: boolean) => void;
  currentSection: string;
  setCurrentSection: (section: string) => void;
  activeApplication: PassportApplication | undefined;
  setActiveApplication: (app: PassportApplication | undefined) => void;
  resetConversation: (application?: PassportApplication) => void;
  autoVoice: boolean;
  setAutoVoice: (val: boolean) => void;
  isSpeaking: string | null;
  handlePlayVoice: (msgId: string, text: string, audioBase64?: string) => Promise<void>;
  stopSpeech: () => void;
  unreadNotificationsCount: number;
  prefilledQuery: string;
  setPrefilledQuery: (query: string) => void;
  populateQuery: (query: string, autoSend?: boolean) => void;
  isLiveAiOnline: boolean;
  aiProviders: string[];
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeApplication, setActiveApplication] = useState<PassportApplication | undefined>(undefined);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isGuidanceScreen, setIsGuidanceScreen] = useState(false);
  const [currentSection, setCurrentSection] = useState<string>('Dashboard');
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);
  const [autoVoice, setAutoVoice] = useState(false);
  const [prefilledQuery, setPrefilledQuery] = useState<string>('');
  const [isLiveAiOnline, setIsLiveAiOnline] = useState<boolean>(false);
  const [aiProviders, setAiProviders] = useState<string[]>([]);

  // Probe live backend AI readiness
  useEffect(() => {
    fetch('/api/assistant/status')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Assistant status check failed: HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setIsLiveAiOnline(Boolean(data.live));
        setAiProviders(Array.isArray(data.providers) ? data.providers : []);
      })
      .catch(() => {
        setIsLiveAiOnline(false);
        setAiProviders([]);
      });
  }, []);

  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const populateQuery = (query: string, autoSend: boolean = false) => {
    setIsAssistantOpen(true);
    setPrefilledQuery(query);
    if (autoSend) {
      sendMessage(query);
    }
  };

  // Initialize conversation held above the pages
  const welcomeMessage = (application?: PassportApplication): ChatMessage => ({
    id: `init-${Date.now()}`,
    sender: 'assistant',
    text: application
      ? `Hello! I can help explain the sample application #${application.trackingNumber} (${application.status}) shown in this prototype. This is not a live OPAS record. What would you like to know?`
      : 'Welcome to the Zambia passport guidance assistant. This prototype is not connected to official OPAS. I can help explain common application steps, documents, and photo requirements; please confirm current requirements with MoHAIS.',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  });
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage()]);

  const resetConversation = (application?: PassportApplication) => {
    stopSpeech();
    setActiveApplication(application);
    setMessages([welcomeMessage(application)]);
  };

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const stopSpeech = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(null);
  };

  const handlePlayVoice = async (msgId: string, text: string, audioBase64?: string) => {
    if (isSpeaking === msgId) {
      stopSpeech();
      return;
    }

    setIsSpeaking(msgId);

    try {
      let b64 = audioBase64;
      if (!b64) {
        const res = await fetch('/api/assistant/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voice: 'Kore' }),
        });
        const data = await res.json();
        b64 = data.audioBase64;
      }

      if (b64) {
        const audio = new Audio(`data:audio/wav;base64,${b64}`);
        audioPlayerRef.current = audio;
        audio.onended = () => setIsSpeaking(null);
        audio.onerror = () => {
          fallbackSpeech(text, msgId);
        };
        await audio.play();
      } else {
        fallbackSpeech(text, msgId);
      }
    } catch {
      fallbackSpeech(text, msgId);
    }
  };

  const fallbackSpeech = (text: string, msgId: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.replace(/[\*\_#`]/g, '').substring(0, 300));
      utterance.rate = 1.0;
      utterance.onend = () => setIsSpeaking(null);
      utterance.onerror = () => setIsSpeaking(null);
      window.speechSynthesis.speak(utterance);
    } else {
      setIsSpeaking(null);
    }
  };

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    const botMsgId = `bot-${Date.now()}`;
    let botText = '';

    try {
      let metadata: any = {};
      setMessages((prev) => [...prev, {
        id: botMsgId,
        sender: 'assistant',
        text: '',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);

      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify({
          message: messageText,
          history: messages.map((m) => ({ sender: m.sender, text: m.text })),
          contextData: {
            currentSection,
            ...(activeApplication
              ? {
                  applicantName: activeApplication.fullName,
                  trackingNumber: activeApplication.trackingNumber,
                  applicationStatus: activeApplication.status,
                  reversionReason: activeApplication.reversionReason,
                  officerNotes: activeApplication.officerNotes,
                  collectionOffice: activeApplication.collectionOffice,
                  feeAmount: activeApplication.feeAmount,
                  feePaid: activeApplication.feePaid,
                  daysInStatus: activeApplication.daysInStatus,
                  passportType: activeApplication.passportType,
                  isUrgent: activeApplication.isUrgent,
                }
              : {}),
          },
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Assistant request failed with HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const handleEvent = (block: string) => {
        let eventName = 'message';
        const dataLines: string[] = [];
        for (const line of block.split(/\r?\n/)) {
          if (line.startsWith('event: ')) eventName = line.slice(7);
          if (line.startsWith('data: ')) dataLines.push(line.slice(6));
        }
        if (!dataLines.length) return;
        const data = JSON.parse(dataLines.join('\n'));
        if (eventName === 'delta') {
          botText += data.text || '';
          setMessages((prev) => prev.map((item) => item.id === botMsgId ? { ...item, text: botText } : item));
        } else if (eventName === 'metadata') {
          metadata = data;
        } else if (eventName === 'error') {
          throw new Error(data.message || 'The assistant response was interrupted.');
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() || '';
        events.forEach(handleEvent);
      }
      if (buffer.trim()) handleEvent(buffer);
      if (!botText) throw new Error('The assistant returned an empty response.');

      setMessages((prev) => prev.map((item) => item.id === botMsgId ? {
        ...item,
        groundingSources: metadata.groundingSources || undefined,
        isLiveGrounded: metadata.isLiveGrounded ?? undefined,
        provider: metadata.provider,
      } : item));

      if (autoVoice) {
        handlePlayVoice(botMsgId, botText);
      }
    } catch (err) {
      console.error('Chat error:', err);
      const fallbackText = botText
        ? `${botText}\n\n(Response interrupted. Please try again.)`
        : 'I could not reach the assistant. Please check your connection and try again.';
      setMessages((prev) => prev.map((item) => item.id === botMsgId ? { ...item, text: fallbackText } : item));
    } finally {
      setLoading(false);
    }
  };

  const unreadNotificationsCount = activeApplication?.notifications?.length || 0;

  return (
    <ChatContext.Provider
      value={{
        messages,
        sendMessage,
        loading,
        isAssistantOpen,
        setIsAssistantOpen,
        isGuidanceScreen,
        setIsGuidanceScreen,
        currentSection,
        setCurrentSection,
        activeApplication,
        setActiveApplication,
        resetConversation,
        autoVoice,
        setAutoVoice,
        isSpeaking,
        handlePlayVoice,
        stopSpeech,
        unreadNotificationsCount,
        prefilledQuery,
        setPrefilledQuery,
        populateQuery,
        isLiveAiOnline,
        aiProviders,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
