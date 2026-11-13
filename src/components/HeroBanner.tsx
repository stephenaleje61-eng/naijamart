import React, { useState, useEffect } from 'react';
import {
  Search,
  PlusCircle,
  MessageSquare,
  Home,
  Bike,
  HelpCircle,
  Star
} from 'lucide-react';
import { AppView } from './BottomNav.js';

interface HeroBannerProps {
  searchQuery: string;
  onSearchSubmit: (query: string) => void;
  onStartShopping: () => void;
  onOpenSellModal: () => void;
  onNavigateView: (view: AppView) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  searchQuery,
  onSearchSubmit,
  onStartShopping,
  onOpenSellModal,
  onNavigateView
}) => {
  const [heroInput, setHeroInput] = useState(searchQuery);

  useEffect(() => {
    setHeroInput(searchQuery);
  }, [searchQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchSubmit(heroInput);
    onStartShopping();
  };

  return (
    <section aria-label="FU MARKET Hero" className="bg-[#0B6B3A] border-b-4 border-[#F2B90D] text-white">
      <div className="max-w-7xl mx-auto px-4 py-7 sm:py-10 flex flex-col lg:flex-row items-center justify-between gap-7">
        {/* Left Column: Headline & Hero Search */}
        <div className="max-w-2xl w-full text-center lg:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#14532D] border border-[#F2B90D]/50 rounded-lg text-[11px] font-black text-[#F2B90D] mb-3 uppercase tracking-wider">
            <Star className="w-3.5 h-3.5 fill-[#F2B90D] text-[#F2B90D]" />
            <span>Federal University Wukari Official Student Hub</span>
          </div>

          <h1 className="font-display text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-[#F2B90D] mb-3">
            Buy and Sell Sharp Sharp Inside FUWUKARI
          </h1>

          <p className="text-white/90 text-sm sm:text-base font-medium mb-5 max-w-xl mx-auto lg:mx-0">
            Hostel mattresses, textbooks &amp; past questions, food, phones, fashion, and gas cylinders — direct from verified FUWUKARI students.
          </p>

          {/* Hero Search Input + Gold Search Button */}
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5 max-w-xl mx-auto lg:mx-0 mb-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#0B6B3A] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={heroInput}
                onChange={(e) => setHeroInput(e.target.value)}
                placeholder="What do you want to buy? (e.g. Fan, GST 101, Gas...)"
                className="w-full pl-10 pr-4 py-3.5 bg-white text-[#111111] placeholder-[#666666] rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-[#F2B90D] shadow-md"
              />
            </div>
            <button
              type="submit"
              className="px-7 py-3.5 bg-[#F2B90D] hover:bg-[#FFC107] text-[#111111] font-black text-sm rounded-xl shadow-md active:scale-95 transition shrink-0"
            >
              Search
            </button>
          </form>

          {/* Quick Secondary Action */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 text-xs">
            <button
              type="button"
              onClick={onStartShopping}
              className="px-4 py-2 bg-[#14532D] hover:bg-black/30 border border-white/25 text-white font-bold rounded-xl transition"
            >
              Browse All Items
            </button>
            <button
              type="button"
              onClick={onOpenSellModal}
              className="px-4 py-2 bg-white hover:bg-[#F5F5F5] text-[#0B6B3A] font-black rounded-xl transition flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Post Item for FREE</span>
            </button>
          </div>
        </div>

        {/* Right Column: Compact Campus Portal Shortcuts */}
        <div className="w-full lg:w-[360px] shrink-0 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => onNavigateView('requests')}
            className="p-3.5 rounded-2xl bg-[#14532D] border border-white/15 hover:border-[#F2B90D] text-left transition group"
          >
            <HelpCircle className="w-5 h-5 text-[#F2B90D] mb-1.5" />
            <div className="text-xs font-black text-white group-hover:text-[#F2B90D]">
              What Students Need
            </div>
            <div className="text-[11px] text-white/80 mt-0.5">Post &amp; fulfill requests</div>
          </button>

          <button
            type="button"
            onClick={() => onNavigateView('hux')}
            className="p-3.5 rounded-2xl bg-[#14532D] border border-white/15 hover:border-[#F2B90D] text-left transition group"
          >
            <Home className="w-5 h-5 text-[#F2B90D] mb-1.5" />
            <div className="text-xs font-black text-white group-hover:text-[#F2B90D]">
              Wukari Agent
            </div>
            <div className="text-[11px] text-white/80 mt-0.5">Lodges &amp; roommates</div>
          </button>

          <button
            type="button"
            onClick={() => onNavigateView('hub')}
            className="p-3.5 rounded-2xl bg-[#14532D] border border-white/15 hover:border-[#F2B90D] text-left transition group"
          >
            <MessageSquare className="w-5 h-5 text-[#F2B90D] mb-1.5" />
            <div className="text-xs font-black text-white group-hover:text-[#F2B90D]">
              Single Hub Chat
            </div>
            <div className="text-[11px] text-white/80 mt-0.5">Open FUWUKARI hub</div>
          </button>

          <button
            type="button"
            onClick={() => onNavigateView('bike-riders')}
            className="p-3.5 rounded-2xl bg-[#14532D] border border-white/15 hover:border-[#F2B90D] text-left transition group"
          >
            <Bike className="w-5 h-5 text-[#F2B90D] mb-1.5" />
            <div className="text-xs font-black text-white group-hover:text-[#F2B90D]">
              Okada Directory
            </div>
            <div className="text-[11px] text-white/80 mt-0.5">Wukari Bike Man</div>
          </button>
        </div>
      </div>
    </section>
  );
};
