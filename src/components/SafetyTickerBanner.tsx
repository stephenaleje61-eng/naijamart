import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const SAFETY_ANNOUNCEMENT_TEXT =
  'WELCOME TO NIGERIA CAMPUS MARKET! PLEASE MAKE SURE YOUR ORDER ARRIVES AND YOU CONFIRM THAT YOU HAVE RECEIVED IT BEFORE MAKING ANY PAYMENT. NO HALF PAYMENT. DO NOT PAY BEFORE RECEIVING YOUR ORDER. SHOP SAFELY!';

export const SafetyTickerBanner: React.FC = () => {
  return (
    <div
      role="region"
      aria-label="NIGERIA CAMPUS MARKET Payment Safety Notice"
      className="w-full overflow-hidden bg-[#202B26] text-[#F2C94C] border-b-2 border-[#F2C94C] py-1.5 fu-marquee-container select-none"
    >
      <div className="fu-marquee-track flex items-center">
        {[0, 1].map((copyIndex) => (
          <div
            key={copyIndex}
            aria-hidden={copyIndex === 1}
            className="flex items-center shrink-0 gap-4 sm:gap-6 pr-6 sm:pr-10"
          >
            <span className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-black tracking-wide uppercase whitespace-nowrap">
              <ShieldCheck className="w-3.5 h-3.5 text-[#F2C94C] shrink-0" aria-hidden="true" />
              <span>{SAFETY_ANNOUNCEMENT_TEXT}</span>
            </span>
            <span className="text-[#FFFFFF]/60 text-xs font-black" aria-hidden="true">
              ◆
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
