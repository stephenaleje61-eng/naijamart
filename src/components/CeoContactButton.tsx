import React from 'react';
import { MessageCircle } from 'lucide-react';
import { CEO_ADS_PHONE, getCeoAdsWhatsAppUrl } from '../services/ads.js';

interface CeoContactButtonProps {
  businessName?: string;
  compact?: boolean;
  fullWidth?: boolean;
  className?: string;
  showSubLabel?: boolean;
}

export const CeoContactButton: React.FC<CeoContactButtonProps> = ({
  businessName,
  compact = false,
  fullWidth = false,
  className = '',
  showSubLabel = true
}) => {
  const url = getCeoAdsWhatsAppUrl(businessName);

  return (
    <div className={`inline-flex flex-col ${fullWidth ? 'w-full' : ''} gap-1.5 ${className}`}>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center justify-center gap-2 bg-[#EA580C] hover:bg-[#C2410C] text-white font-black rounded-xl transition shadow-xs whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EA580C] ${
          compact ? 'px-4 py-2.5 text-xs min-h-[40px]' : 'px-5 py-3 text-xs sm:text-sm min-h-[44px]'
        } ${fullWidth ? 'w-full' : ''}`}
      >
        <MessageCircle className="w-4 h-4 shrink-0" />
        <span>MESSAGE CEO FOR ANY ADVERT</span>
      </a>
      {showSubLabel && (
        <span className="text-xs font-extrabold tracking-tight text-current/90 tabular-nums">
          FU MARKET CEO – {CEO_ADS_PHONE}
        </span>
      )}
    </div>
  );
};
