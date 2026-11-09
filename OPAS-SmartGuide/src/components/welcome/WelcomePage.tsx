import React from 'react';
import { LogIn, ArrowRight, Bot, ExternalLink } from 'lucide-react';
import { PassportApplication } from '../../types/passport';

interface WelcomePageProps {
  onOpenLogin: () => void;
  onOpenSignUp?: () => void;
  applications?: PassportApplication[];
  onSelectApplication?: (app: PassportApplication) => void;
  onApplyNow?: () => void;
  onTrackApplication?: (appId?: string) => void;
  onQuickEnterCitizen?: (scenarioId?: string) => void;
  onQuickEnterOfficer?: () => void;
}

export const WelcomePage: React.FC<WelcomePageProps> = ({
  onOpenLogin,
}) => {
  const opasOfficialUrl =
    'https://pass.gsb.gov.zm/login?flow=e4f9ee5b-d96c-454f-bb11-8cbde6d56110';

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center py-0 sm:py-2 select-none font-sans">
      {/* =========================================================================
          MASTER VISUAL STAGE: 100% MATCH TO USER'S SPECIFICATION
          - Help and Contact nav are removed.
          - The ONLY two clickable buttons on the entire landing page are:
            1. Access My OPAS (Redirects to https://pass.gsb.gov.zm/login?flow=e4f9ee5b-d96c-454f-bb11-8cbde6d56110)
            2. Ask SmartGuide (Opens the login page)
          - All other buttons, cards, and areas are strictly unclickable.
         ========================================================================= */}
      <div className="w-full max-w-[1672px] mx-auto relative shadow-2xl bg-white overflow-hidden sm:rounded-2xl border border-slate-200/80">
        {/* Main Mockup Graphic (1672 x 941 Aspect Ratio) */}
        <div className="relative w-full aspect-[1672/941]">
          <img
            src="/assets/opas_smartguide_landing.png"
            alt="OPAS SmartGuide - Your Passport Journey, Made Simpler | Republic of Zambia"
            className="w-full h-full object-contain pointer-events-none select-none block"
            draggable={false}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (!target.src.includes('image_48e2f364.png')) {
                target.src = '/assets/aistudio/image_48e2f364.png';
              }
            }}
          />

          {/* Top right nav area cover to guarantee Help and Contact are completely removed */}
          <div
            className="absolute bg-white pointer-events-none"
            style={{
              left: '80%',
              top: '0%',
              width: '20%',
              height: '11.5%',
            }}
            aria-hidden="true"
          />

          {/* =====================================================================
              THE ONLY TWO CLICKABLE BUTTONS ON THE LANDING PAGE
             ===================================================================== */}

          {/* 1. BUTTON: Access My OPAS
                 Redirects / opens https://pass.gsb.gov.zm/login?flow=e4f9ee5b-d96c-454f-bb11-8cbde6d56110 */}
          <a
            href={opasOfficialUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Open Government OPAS Portal (pass.gsb.gov.zm)"
            aria-label="Access My OPAS - Opens official Government Portal"
            className="absolute z-20 cursor-pointer rounded-full hover:ring-4 hover:ring-blue-400/50 hover:bg-white/10 active:scale-98 transition-all flex items-center justify-center group"
            style={{
              left: '3.82%',
              top: '52.92%',
              width: '24.70%',
              height: '9.35%',
            }}
          >
            <span className="sr-only">Access My OPAS</span>
          </a>

          {/* 2. BUTTON: Ask SmartGuide
                 Opens the login page to access the 24/7 AI-guided console */}
          <button
            type="button"
            onClick={onOpenLogin}
            title="Launch SmartGuide Assistant & Sign In"
            aria-label="Ask SmartGuide - Opens login page"
            className="absolute z-20 cursor-pointer rounded-full hover:ring-4 hover:ring-blue-400/50 hover:bg-blue-600/10 active:scale-98 transition-all flex items-center justify-center group"
            style={{
              left: '30.02%',
              top: '52.92%',
              width: '24.10%',
              height: '9.35%',
            }}
          >
            <span className="sr-only">Ask SmartGuide</span>
          </button>
        </div>
      </div>

      {/* Mobile Accessible Quick Toolbar: Strictly contains ONLY Access My OPAS & Ask SmartGuide */}
      <div className="sm:hidden w-full px-4 py-3 bg-white border-t border-slate-200 mt-2 flex items-center justify-between gap-2 shadow-sm">
        <a
          href={opasOfficialUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-2.5 px-3 bg-[#0B3B73] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>Access My OPAS</span>
          <ExternalLink className="w-3 h-3 text-white/70" />
        </a>

        <button
          type="button"
          onClick={onOpenLogin}
          className="flex-1 py-2.5 px-3 bg-white border-2 border-[#1E64AF] text-[#0F4C81] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
        >
          <Bot className="w-3.5 h-3.5 text-[#1E64AF]" />
          <span>Ask SmartGuide</span>
          <ArrowRight className="w-3 h-3 text-[#1E64AF]" />
        </button>
      </div>
    </div>
  );
};
