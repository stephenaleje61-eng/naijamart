import React from 'react';
import {
  ShieldCheck,
  MessageCircle,
  Store,
  Download,
  Home,
  HelpCircle,
  Bike,
  Phone,
  MapPin
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
    <footer className="bg-[#14532D] text-white pt-10 pb-24 sm:pb-10 border-t-4 border-[#F2B90D] text-xs">
      <div className="max-w-7xl mx-auto px-4">
        {/* Top Trust Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 pb-8 border-b border-white/15">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0B6B3A] border border-[#F2B90D]/40 text-[#F2B90D] flex items-center justify-center shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">100% Real Student Listings</h4>
              <p className="text-white/80 text-xs mt-0.5">
                Every product, request, lodge, and rider is submitted by real FUWUKARI users.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0B6B3A] border border-[#F2B90D]/40 text-[#F2B90D] flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">Sharp Sharp WhatsApp Deal</h4>
              <p className="text-white/80 text-xs mt-0.5">
                Tap &ldquo;Chat on WhatsApp&rdquo; or message sellers directly inside WukariMart.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0B6B3A] border border-[#F2B90D]/40 text-[#F2B90D] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">Safe Campus Meetups</h4>
              <p className="text-white/80 text-xs mt-0.5">
                Inspect items physically on campus before paying. Zero advance transfer fees.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0B6B3A] border border-[#F2B90D]/40 text-[#F2B90D] flex items-center justify-center shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">WukariMart App (PWA)</h4>
              <p className="text-white/80 text-xs mt-0.5 mb-2">
                {isInstalled
                  ? 'WukariMart app is installed on your device.'
                  : isIOS
                  ? 'Add to Home Screen from Safari for one-tap campus access.'
                  : 'Lightweight app built for fast loading on low campus data.'}
              </p>
              {!isInstalled && (
                <button
                  type="button"
                  onClick={handleInstall}
                  className="px-3 py-1 bg-[#F2B90D] hover:bg-[#FFC107] text-[#111111] font-black rounded-lg text-[11px] transition"
                >
                  Install WukariMart
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Middle Columns: About WukariMart, Categories, Portals, Contact */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-8 py-8 border-b border-white/15">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-[#F2B90D] flex items-center justify-center font-black text-[#111111] text-sm">
                WM
              </div>
              <span className="font-display font-black text-xl tracking-tight text-[#F2B90D]">
                WukariMart
              </span>
            </div>
            <h5 className="font-bold text-xs uppercase tracking-wider text-[#F2B90D] mb-1">
              About WukariMart
            </h5>
            <p className="text-white/85 text-xs leading-relaxed max-w-sm mb-3">
              WukariMart is the dedicated student marketplace for Federal University Wukari (FUWUKARI). Buy and sell hostel items, textbooks &amp; past questions, food, electronics, fashion, and gas &amp; cooking gear safely within campus.
            </p>
            <div className="text-[11px] text-white/80 space-y-1">
              <p className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#F2B90D] shrink-0" />
                <span>Main Campus • New Site • Behind LT • Puje • Bye Pass • Wukari</span>
              </p>
            </div>
          </div>

          <div>
            <h5 className="font-bold text-xs uppercase tracking-wider text-[#F2B90D] mb-3">
              Categories
            </h5>
            <ul className="space-y-2 text-white/85">
              {categories.slice(0, 6).map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onSelectCategory(c.id)}
                    className="hover:text-[#F2B90D] transition text-left"
                  >
                    {c.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h5 className="font-bold text-xs uppercase tracking-wider text-[#F2B90D] mb-3">
              Campus Portals
            </h5>
            <ul className="space-y-2 text-white/85">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigateView('requests')}
                  className="hover:text-[#F2B90D] flex items-center gap-1.5"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-[#F2B90D]" /> What Students Need
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigateView('hux')}
                  className="hover:text-[#F2B90D] flex items-center gap-1.5"
                >
                  <Home className="w-3.5 h-3.5 text-[#F2B90D]" /> Wukari Agent
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigateView('hub')}
                  className="hover:text-[#F2B90D] flex items-center gap-1.5"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-[#F2B90D]" /> Single Hub
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigateView('bike-riders')}
                  className="hover:text-[#F2B90D] flex items-center gap-1.5"
                >
                  <Bike className="w-3.5 h-3.5 text-[#F2B90D]" /> Okada Directory
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h5 className="font-bold text-xs uppercase tracking-wider text-[#F2B90D] mb-3">
              Contact &amp; Support
            </h5>
            <ul className="space-y-2 text-white/85">
              <li className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#F2B90D]" />
                <span>Campus Desk: Wukari, Taraba</span>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenSellModal}
                  className="text-[#F2B90D] hover:text-[#FFC107] font-black transition"
                >
                  Post Item for FREE
                </button>
              </li>
              <li>
                <button type="button" onClick={onOpenSafetyModal} className="hover:text-[#F2B90D] transition">
                  Campus Safety Rules
                </button>
              </li>
              <li>
                <button type="button" onClick={onOpenSafetyModal} className="hover:text-[#F2B90D] transition">
                  Terms &amp; Prohibited Items
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright + Made for FUWUKARI Students */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-white/90">
          <p className="font-semibold">
            © {new Date().getFullYear()} WukariMart — Federal University Wukari.
          </p>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0B6B3A] border border-[#F2B90D]/50 text-[#F2B90D] font-black">
            Made for FUWUKARI Students
          </span>
        </div>
      </div>
    </footer>
  );
};
