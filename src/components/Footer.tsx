import React from 'react';
import {
  ShieldCheck,
  MessageCircle,
  Store,
  Download,
  Home,
  HelpCircle,
  Bike
} from 'lucide-react';
import { Category } from '../types.js';
import { usePWAInstall } from '../hooks/usePWAInstall.js';
import { AppView } from './BottomNav.js';

interface FooterProps {
  categories: Category[];
  onSelectCategory: (catId: string) => void;
  onOpenSellModal: () => void;
  onOpenSafetyModal: () => void;
  onNavigateView: (view: AppView) => void;
  onTriggerPWAHelp: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  categories,
  onSelectCategory,
  onOpenSellModal,
  onOpenSafetyModal,
  onNavigateView,
  onTriggerPWAHelp
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  const handleInstall = async () => {
    if (isInstallable) {
      const res = await install();
      if (res === 'unavailable') onTriggerPWAHelp();
    } else {
      onTriggerPWAHelp();
    }
  };

  return (
    <footer className="bg-[#121212] text-white pt-10 pb-24 sm:pb-10 border-t border-[#333333] text-xs">
      <div className="max-w-7xl mx-auto px-4">
        {/* Top Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 pb-8 border-b border-[#333333]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFFFFF]/15 text-[#FFFFFF] flex items-center justify-center shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">100% Genuine Listings</h4>
              <p className="text-[#BDBDBD] text-xs mt-0.5">
                Every item, request, lodge, and rider comes from real FUWUKARI users.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#25D366]/15 text-[#25D366] flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">Direct Campus Messaging</h4>
              <p className="text-[#BDBDBD] text-xs mt-0.5">
                Message sellers, agents, and students directly inside FU MARKET or WhatsApp.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFFFFF]/15 text-[#FFFFFF] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">Campus Scam Prevention</h4>
              <p className="text-[#BDBDBD] text-xs mt-0.5">
                Inspect items &amp; lodges in person on campus before making payment.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFFFFF]/15 text-[#FFFFFF] flex items-center justify-center shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">Install FU MARKET PWA</h4>
              <p className="text-[#BDBDBD] text-xs mt-0.5 mb-2">
                {isInstalled
                  ? 'FU MARKET app is installed on your device.'
                  : isIOS
                  ? 'Install on iPhone/iPad via Safari Add to Home Screen.'
                  : 'Install as a lightweight app for offline access.'}
              </p>
              {!isInstalled && (
                <button
                  type="button"
                  onClick={handleInstall}
                  className="px-3 py-1 bg-[#FFFFFF] hover:bg-[#E5E5E5] text-black font-black rounded-lg text-[11px]"
                >
                  Install FU MARKET App
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Middle Columns */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-8 py-8 border-b border-[#333333]">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-[#FFFFFF] flex items-center justify-center font-black text-black text-sm">
                FU
              </div>
              <span className="font-black text-xl tracking-tight text-white">
                FU <span className="text-[#FFFFFF]">MARKET</span>
              </span>
            </div>
            <p className="text-[#BDBDBD] text-xs leading-relaxed max-w-sm mb-3">
              Your Campus. Your Marketplace. Your Opportunities. Built for students, sellers, and agents around Federal University Wukari (FUWUKARI).
            </p>
            <div className="text-[11px] text-[#BDBDBD] space-y-1">
              <p>Campus Coverage: FUWUKARI Main Campus • New Site • Behind LT • Puje • Bye Pass • Wukari, Taraba State</p>
            </div>
          </div>

          <div>
            <h5 className="font-bold text-xs uppercase tracking-wider text-white mb-3">
              Popular Categories
            </h5>
            <ul className="space-y-2 text-[#BDBDBD]">
              {categories.slice(0, 6).map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => onSelectCategory(c.id)}
                    className="hover:text-[#FFFFFF] transition text-left"
                  >
                    {c.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h5 className="font-bold text-xs uppercase tracking-wider text-white mb-3">
              Campus Portals
            </h5>
            <ul className="space-y-2 text-[#BDBDBD]">
              <li>
                <button
                  onClick={() => onNavigateView('requests')}
                  className="hover:text-[#FFFFFF] flex items-center gap-1.5"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-[#FFFFFF]" /> What Students Need
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateView('hux')}
                  className="hover:text-[#FFFFFF] flex items-center gap-1.5"
                >
                  <Home className="w-3.5 h-3.5 text-[#FFFFFF]" /> Wukari Agent
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateView('hub')}
                  className="hover:text-[#FFFFFF] flex items-center gap-1.5"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-[#FFFFFF]" /> Single Hub
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateView('bike-riders')}
                  className="hover:text-[#FFFFFF] flex items-center gap-1.5"
                >
                  <Bike className="w-3.5 h-3.5 text-[#FFFFFF]" /> Okada Directory
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h5 className="font-bold text-xs uppercase tracking-wider text-white mb-3">
              Trust &amp; Selling
            </h5>
            <ul className="space-y-2 text-[#BDBDBD]">
              <li>
                <button
                  onClick={onOpenSellModal}
                  className="hover:text-[#FFFFFF] transition font-semibold text-[#FFFFFF]"
                >
                  Post a Product
                </button>
              </li>
              <li>
                <button onClick={onOpenSafetyModal} className="hover:text-[#FFFFFF] transition">
                  Campus Safety Guidelines
                </button>
              </li>
              <li>
                <button onClick={onOpenSafetyModal} className="hover:text-[#FFFFFF] transition">
                  Prohibited Items Policy
                </button>
              </li>
              <li>
                <button onClick={onOpenSafetyModal} className="hover:text-[#FFFFFF] transition">
                  Terms &amp; Privacy
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Disclaimer */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#BDBDBD]">
          <p>© {new Date().getFullYear()} FU MARKET — FUWUKARI Campus Marketplace.</p>
          <p className="text-center sm:text-right">
            Inspect items physically on campus before paying • Zero advance delivery or booking fees
          </p>
        </div>
      </div>
    </footer>
  );
};
