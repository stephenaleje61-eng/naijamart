import React from 'react';
import {
  ShoppingBag,
  ArrowRight,
  PlusCircle,
  MessageSquare,
  Home,
  Bike,
  HelpCircle
} from 'lucide-react';
import { AppView } from './BottomNav.js';

interface HeroBannerProps {
  onStartShopping: () => void;
  onOpenSellModal: () => void;
  onNavigateView: (view: AppView) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  onStartShopping,
  onOpenSellModal,
  onNavigateView
}) => {
  return (
    <section aria-label="Welcome Banner" className="max-w-7xl mx-auto px-4 pt-5 pb-2">
      <div className="relative overflow-hidden rounded-3xl bg-[#121212] border border-[#333333] text-white shadow-2xl">
        <div className="px-6 py-8 sm:px-10 sm:py-11 flex flex-col lg:flex-row items-center justify-between gap-8">
          {/* Left Column */}
          <div className="max-w-2xl text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#1C1C1C] border border-[#FFFFFF]/50 rounded-full text-[11px] font-black text-[#FFFFFF] mb-4 uppercase tracking-wider">
              <span>FUWUKARI Campus Platform • Wukari, Taraba</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight text-white mb-3">
              WELCOME TO <span className="text-[#FFFFFF]">FU MARKET!</span>
            </h1>

            <p className="text-[#BDBDBD] text-sm sm:text-base font-normal mb-2 max-w-xl leading-relaxed">
              Buy, sell, connect and discover opportunities within the FUWUKARI student community.
            </p>
            <p className="text-xs font-bold text-[#FFFFFF] mb-6">
              Your Campus. Your Marketplace. Your Opportunities.
            </p>

            {/* Primary CTAs */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
              <button
                type="button"
                onClick={onStartShopping}
                className="px-6 py-3 bg-[#FFFFFF] hover:bg-[#E5E5E5] text-black font-black text-sm rounded-xl active:scale-95 transition flex items-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Browse Marketplace</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onOpenSellModal}
                className="px-6 py-3 bg-[#1C1C1C] hover:bg-black border border-[#333333] hover:border-[#FFFFFF] text-white font-bold text-sm rounded-xl active:scale-95 transition flex items-center gap-2"
              >
                <PlusCircle className="w-4 h-4 text-[#FFFFFF]" />
                <span>Sell a Product</span>
              </button>
            </div>
          </div>

          {/* Right Column: Quick Campus Portal Grid */}
          <div className="w-full lg:w-[360px] shrink-0 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => onNavigateView('requests')}
              className="p-3.5 rounded-2xl bg-[#1C1C1C] border border-[#333333] hover:border-[#FFFFFF] text-left transition group"
            >
              <HelpCircle className="w-5 h-5 text-[#FFFFFF] mb-2" />
              <div className="text-xs font-black text-white group-hover:text-[#FFFFFF]">
                What Students Need
              </div>
              <div className="text-[11px] text-[#BDBDBD] mt-0.5">Post &amp; fulfill requests</div>
            </button>

            <button
              type="button"
              onClick={() => onNavigateView('hux')}
              className="p-3.5 rounded-2xl bg-[#1C1C1C] border border-[#333333] hover:border-[#FFFFFF] text-left transition group"
            >
              <Home className="w-5 h-5 text-[#FFFFFF] mb-2" />
              <div className="text-xs font-black text-white group-hover:text-[#FFFFFF]">
                Wukari Agent
              </div>
              <div className="text-[11px] text-[#BDBDBD] mt-0.5">Lodges &amp; roommates</div>
            </button>

            <button
              type="button"
              onClick={() => onNavigateView('hub')}
              className="p-3.5 rounded-2xl bg-[#1C1C1C] border border-[#333333] hover:border-[#FFFFFF] text-left transition group"
            >
              <MessageSquare className="w-5 h-5 text-[#FFFFFF] mb-2" />
              <div className="text-xs font-black text-white group-hover:text-[#FFFFFF]">
                Single Hub Chat
              </div>
              <div className="text-[11px] text-[#BDBDBD] mt-0.5">Open FUWUKARI hub</div>
            </button>

            <button
              type="button"
              onClick={() => onNavigateView('bike-riders')}
              className="p-3.5 rounded-2xl bg-[#1C1C1C] border border-[#333333] hover:border-[#FFFFFF] text-left transition group"
            >
              <Bike className="w-5 h-5 text-[#FFFFFF] mb-2" />
              <div className="text-xs font-black text-white group-hover:text-[#FFFFFF]">
                Okada Directory
              </div>
              <div className="text-[11px] text-[#BDBDBD] mt-0.5">Wukari Bike Man</div>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
