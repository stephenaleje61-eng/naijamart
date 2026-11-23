import React, { useMemo } from 'react';
import {
  Megaphone,
  ArrowRight,
  Sliders,
  ShieldCheck,
  Send
} from 'lucide-react';
import { AdPackageId, Advertisement } from '../types.js';
import {
  ADVERTISING_PACKAGES,
  CEO_ADS_PHONE,
  filterAdsForAudience
} from '../services/ads.js';
import { isAuthorizedCeo } from '../services/events.js';
import { useAuth } from '../context/AuthContext.js';
import { formatNaira } from './ProductCard.js';
import { SponsoredAdCard } from './SponsoredAdCard.js';

interface FuMarketAdsSectionProps {
  ads: Advertisement[];
  loading?: boolean;
  selectedInstitutionId?: string;
  selectedCampus?: string;
  activeInstitutionName?: string;
  onOpenSubmitModal?: (packageId?: AdPackageId) => void;
  onSelectAd: (ad: Advertisement) => void;
  onOpenMasterControl?: () => void;
}

export const FuMarketAdsSection: React.FC<FuMarketAdsSectionProps> = ({
  ads,
  loading = false,
  selectedInstitutionId,
  selectedCampus,
  activeInstitutionName,
  onOpenSubmitModal,
  onSelectAd,
  onOpenMasterControl
}) => {
  const { user } = useAuth();
  const isCeo = isAuthorizedCeo(user);

  const visibleAds = useMemo(
    () =>
      filterAdsForAudience(ads, {
        institutionId: selectedInstitutionId,
        campus: selectedCampus,
        placement: 'homepage_featured'
      }),
    [ads, selectedInstitutionId, selectedCampus]
  );

  return (
    <section
      id="fu-market-ads"
      className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-2xl p-5 sm:p-7 space-y-6 shadow-xs"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#EEEEEE]">
        <div className="space-y-1.5 max-w-2xl">
          <p className="text-xs font-extrabold text-[#FF6A00] tracking-wide flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#F68B1F]" />
            <span>
              Nationwide &amp; Campus Sponsored Network
              {activeInstitutionName ? ` · ${activeInstitutionName}` : ''}
            </span>
          </p>
          <h2 className="font-display text-xl sm:text-2xl font-black text-[#222222] tracking-tight">
            Featured Sponsored Advertisements
          </h2>
          <p className="text-xs sm:text-sm text-[#303030]/75">
            Verified brands, campus services, scholarships, hostel promotions, and university announcements across Nigeria.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onOpenSubmitModal && (
            <button
              type="button"
              onClick={() => onOpenSubmitModal('featured')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FF6A00] hover:bg-[#F68B1F] text-[#FFFFFF] text-xs sm:text-sm font-black rounded-xl transition min-h-[42px] whitespace-nowrap shrink-0 shadow-xs cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Advertise Your Business</span>
            </button>
          )}

          {isCeo && onOpenMasterControl && (
            <button
              type="button"
              onClick={onOpenMasterControl}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#222222] hover:bg-[#303030] text-[#FFFFFF] text-xs sm:text-sm font-black rounded-xl transition min-h-[42px] whitespace-nowrap shrink-0 shadow-xs cursor-pointer"
            >
              <Sliders className="w-4 h-4 text-[#F68B1F]" />
              <span>Manage Ads Studio</span>
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm sm:text-base font-black text-[#222222]">
            Live Sponsored Placements
          </h3>
          <span className="text-xs text-[#FF6A00] tabular-nums font-extrabold">
            {visibleAds.length} live {visibleAds.length === 1 ? 'campaign' : 'campaigns'}
          </span>
        </div>

        {loading && visibleAds.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((slot) => (
              <div
                key={slot}
                className="h-64 rounded-xl border border-[#EEEEEE] bg-[#F7F7F7] animate-pulse"
              />
            ))}
          </div>
        ) : visibleAds.length === 0 ? (
          <div className="p-6 rounded-xl border border-[#EEEEEE] bg-[#F7F7F7] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-black text-[#222222]">
                Promote your business across Nigerian campuses
              </h4>
              <p className="text-xs text-[#303030]/75 max-w-xl leading-relaxed">
                Target all Nigerian universities nationwide, Federal/State/Private groups, or specific campuses. All requests go straight to our admin desk ({CEO_ADS_PHONE}).
              </p>
            </div>
            {isCeo && onOpenMasterControl ? (
              <button
                type="button"
                onClick={onOpenMasterControl}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#FF6A00] hover:bg-[#F68B1F] text-[#FFFFFF] text-xs font-black rounded-xl transition whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Megaphone className="w-4 h-4" />
                <span>Create Official Ad</span>
              </button>
            ) : onOpenSubmitModal ? (
              <button
                type="button"
                onClick={() => onOpenSubmitModal('featured')}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#FF6A00] hover:bg-[#F68B1F] text-[#FFFFFF] text-xs font-black rounded-xl transition whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Request Sponsored Slot</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {visibleAds.map((ad) => (
              <SponsoredAdCard
                key={ad.id}
                ad={ad}
                onSelectAd={onSelectAd}
                variant="card"
              />
            ))}
          </div>
        )}
      </div>

      <div className="pt-5 border-t border-[#EEEEEE] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-sm font-black text-[#222222]">Advertising Packages</h3>
          <p className="text-xs text-[#303030]/70">
            Select a plan to submit an inquiry to the Advertising Request Inbox.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ADVERTISING_PACKAGES.map((pkg) => {
            const isPriority = pkg.id === 'featured';
            return (
              <div
                key={pkg.id}
                className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                  isPriority
                    ? 'border-[#F68B1F] bg-[#FFF9F4] shadow-xs'
                    : 'border-[#EEEEEE] bg-[#FFFFFF]'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-black text-[#222222]">{pkg.name}</h4>
                    <span className="text-xs font-bold text-[#FF6A00] tabular-nums">
                      {pkg.durationDays} days
                    </span>
                  </div>
                  <p className="text-xl font-black text-[#222222] tabular-nums">
                    {formatNaira(pkg.priceNaira)}
                  </p>
                  <ul className="space-y-1 text-xs text-[#303030]/80 pt-1 border-t border-[#EEEEEE]">
                    {pkg.benefits.map((b) => (
                      <li key={b}>· {b}</li>
                    ))}
                  </ul>
                </div>

                {isCeo && onOpenMasterControl ? (
                  <button
                    type="button"
                    onClick={onOpenMasterControl}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-black transition min-h-[38px] cursor-pointer ${
                      isPriority
                        ? 'bg-[#FF6A00] hover:bg-[#F68B1F] text-[#FFFFFF]'
                        : 'bg-[#FFFFFF] border border-[#F68B1F] hover:bg-[#FF6A00] hover:text-[#FFFFFF] text-[#FF6A00]'
                    }`}
                  >
                    Publish {pkg.name}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onOpenSubmitModal?.(pkg.id)}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-black transition min-h-[38px] inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                      isPriority
                        ? 'bg-[#FF6A00] hover:bg-[#F68B1F] text-[#FFFFFF]'
                        : 'bg-[#F7F7F7] border border-[#EEEEEE] hover:border-[#F68B1F] text-[#222222]'
                    }`}
                  >
                    <Send className={`w-3.5 h-3.5 ${isPriority ? 'text-white' : 'text-[#FF6A00]'}`} />
                    <span>Request {pkg.name}</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
