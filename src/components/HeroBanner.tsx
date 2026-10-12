import React from 'react';
import {
  Sparkles,
  ShoppingBag,
  Clock,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  Flame
} from 'lucide-react';

interface HeroBannerProps {
  onStartShopping: () => void;
  onOpenSellModal: () => void;
  onSelectCategory: (catId: string) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  onStartShopping,
  onOpenSellModal,
  onSelectCategory
}) => {
  return (
    <div className="max-w-7xl mx-auto px-4 pt-4 pb-2">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#D96B07] via-[#F68B1F] to-[#FFA03A] text-white shadow-xl">
        {/* Subtle decorative background circles */}
        <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-white/10 blur-2xl pointer-events-none"></div>
        <div className="absolute right-1/4 -top-20 w-60 h-60 rounded-full bg-yellow-300/10 blur-xl pointer-events-none"></div>

        <div className="relative px-6 py-8 sm:px-10 sm:py-12 md:py-14 flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Left Column: Headlines & Call to Actions */}
          <div className="max-w-xl text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold text-white mb-4 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-yellow-200" />
              <span>NIGERIA'S NEXT-GEN SHOPPING REVOLUTION</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight mb-3">
              Shop More. Save More.{' '}
              <span className="text-yellow-200 underline decoration-white/40">Sell to Everyone.</span>
            </h1>

            <p className="text-white/90 text-sm sm:text-base font-normal mb-6 max-w-lg leading-relaxed">
              Connect directly with verified sellers across Lagos, Abuja, Port Harcourt and nationwide.
              Negotiate and buy seamlessly over WhatsApp with zero hidden fees.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <button
                onClick={onStartShopping}
                className="px-6 py-3 bg-white text-[#222222] hover:bg-gray-100 font-extrabold text-sm rounded-full shadow-lg hover:shadow-xl active:scale-95 transition flex items-center gap-2"
              >
                <ShoppingBag className="w-4 h-4 text-[#F68B1F]" />
                Start Shopping Now
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onOpenSellModal}
                className="px-6 py-3 bg-[#1C1917] hover:bg-black text-white font-extrabold text-sm rounded-full shadow-md active:scale-95 transition flex items-center gap-2"
              >
                <span>Sell Goods (Free)</span>
              </button>
            </div>

            {/* Micro feature pills */}
            <div className="mt-6 flex flex-wrap items-center justify-center md:justify-start gap-3 text-xs text-white/90 font-medium">
              <div className="flex items-center gap-1 bg-black/15 px-3 py-1 rounded-full backdrop-blur-sm">
                <Clock className="w-3.5 h-3.5 text-yellow-300" />
                <span>Strict 7-Day Fresh Listings</span>
              </div>
              <div className="flex items-center gap-1 bg-black/15 px-3 py-1 rounded-full backdrop-blur-sm">
                <span className="text-[#25D366] font-bold">●</span>
                <span>Direct WhatsApp Dealings</span>
              </div>
              <div className="flex items-center gap-1 bg-black/15 px-3 py-1 rounded-full backdrop-blur-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                <span>Zero Commission</span>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Showcase Card */}
          <div className="w-full md:w-auto shrink-0 flex justify-center">
            <div className="bg-white/10 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-white/20 shadow-2xl max-w-xs text-white">
              <div className="flex items-center justify-between gap-4 mb-3 border-b border-white/20 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#25D366] flex items-center justify-center font-bold text-white text-xs">
                    WA
                  </div>
                  <div>
                    <div className="text-xs font-bold leading-none">Instant WhatsApp Deals</div>
                    <div className="text-[10px] text-white/80">No middleman markups</div>
                  </div>
                </div>
                <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-0.5">
                  <Flame className="w-3 h-3 fill-current" /> Hot
                </span>
              </div>

              {/* Fast Category Quicklinks */}
              <div className="space-y-1.5 text-xs">
                <div className="text-[11px] font-bold uppercase tracking-wider text-yellow-200">
                  Trending Departments:
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => onSelectCategory('phones-tablets')}
                    className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-left transition font-semibold text-xs flex items-center justify-between"
                  >
                    <span>Phones & Tech</span>
                    <span className="text-[10px] text-yellow-200">₦</span>
                  </button>
                  <button
                    onClick={() => onSelectCategory('fashion')}
                    className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-left transition font-semibold text-xs flex items-center justify-between"
                  >
                    <span>Ankara & Fabrics</span>
                    <span className="text-[10px] text-yellow-200">₦</span>
                  </button>
                  <button
                    onClick={() => onSelectCategory('food-groceries')}
                    className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-left transition font-semibold text-xs flex items-center justify-between"
                  >
                    <span>Benue & Farm</span>
                    <span className="text-[10px] text-yellow-200">₦</span>
                  </button>
                  <button
                    onClick={() => onSelectCategory('furniture-appliances')}
                    className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-left transition font-semibold text-xs flex items-center justify-between"
                  >
                    <span>Solar & Inverter</span>
                    <span className="text-[10px] text-yellow-200">₦</span>
                  </button>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-white/20 text-[11px] text-white/80 flex items-center justify-between">
                <span>Active Listings: 100% Genuine</span>
                <span className="text-yellow-300 font-bold">Free to Post</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
