import React from 'react';
import { ShoppingBag, ShieldCheck, X } from 'lucide-react';

interface WelcomeNoticeProps {
  onDismiss: () => void;
}

export const WelcomeNotice: React.FC<WelcomeNoticeProps> = ({ onDismiss }) => {
  return (
    <section
      aria-label="Welcome to NIGERIA CAMPUS MARKET"
      className="bg-[#F4F8F5] border-b border-[#10251D]/15"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3">
        <div className="relative bg-white border border-[#10251D]/15 border-l-4 border-l-[#D4A62A] rounded-2xl shadow-sm px-3.5 py-3 sm:px-5 sm:py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#10251D] border-2 border-[#D4A62A] flex items-center justify-center shrink-0 shadow-sm">
              <ShoppingBag className="w-5 h-5 text-[#D4A62A]" aria-hidden="true" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-sm sm:text-base font-black tracking-tight text-[#10251D] uppercase leading-tight">
                  WELCOME TO NIGERIA CAMPUS MARKET!
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#087443] text-[#D4A62A] text-[10px] font-black uppercase tracking-wider">
                  <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                  <span>ALL CAMPUSES</span>
                </span>
              </div>
              <p className="text-[11px] sm:text-xs font-bold tracking-wide text-[#10251D]/85 uppercase mt-0.5 leading-snug">
                BUY. SELL. CONNECT. GROW ACROSS NIGERIAN CAMPUSES.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss welcome message"
            className="shrink-0 w-9 h-9 rounded-xl bg-[#F4F8F5] hover:bg-[#10251D] text-[#10251D] hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
};
