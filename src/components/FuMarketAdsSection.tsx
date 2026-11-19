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
      className="bg-[#FFFFFF] border border-[#D9E5DF] rounded-2xl p-5 sm:p-7 space-y-6 shadow-xs"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#E6EFEA]">
        <div className="space-y-1.5 max-w-2xl">
          <p className="text-xs font-extrabold text-[#075B3B] tracking-wide flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#F2C94C]" />
            <span>
              Nationwide &amp; Campus Sponsored Network
              {activeInstitutionName ? ` · ${activeInstitutionName}` : ''}
            </span>
          </p>
          <h2 className="font-display text-xl sm:text-2xl font-black text-[#202B26] tracking-tight">
            Featured Sponsored Advertisements
          </h2>
          <p className="text-xs sm:text-sm text-[#202B26]/75">
            Verified brands, campus services, scholarships, hostel promotions, and university announcements across Nigeria.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onOpenSubmitModal && (
            <button
              type="button"
              onClick={() => onOpenSubmitModal('featured')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#F2C94C] hover:brightness-95 text-[#202B26] text-xs sm:text-sm font-black rounded-xl transition min-h-[42px] whitespace-nowrap shrink-0 shadow-xs"
            >
              <Send className="w-4 h-4" />
              <span>Advertise Your Business</span>
            </button>
          )}

          {isCeo && onOpenMasterControl && (
            <button
              type="button"
              onClick={onOpenMasterControl}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#075B3B] hover:bg-[#0B8050] text-[#FFFFFF] text-xs sm:text-sm font-black rounded-xl transition min-h-[42px] whitespace-nowrap shrink-0 shadow-xs"
            >
              <Sliders className="w-4 h-4 text-[#F2C94C]" />
              <span>Manage Ads Studio</span>
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm sm:text-base font-black text-[#202B26]">
            Live Sponsored Placements
          </h3>
          <span className="text-xs text-[#075B3B] tabular-nums font-extrabold">
            {visibleAds.length} live {visibleAds.length === 1 ? 'campaign' : 'campaigns'}
          </span>
        </div>

        {loading && visibleAds.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((slot) => (
              <div
                key={slot}
                className="h-64 rounded-xl border border-[#D9E5DF] bg-[#F4F7F5] animate-pulse"
              />
            ))}
          </div>
        ) : visibleAds.length === 0 ? (
          <div className="p-6 rounded-xl border border-[#D9E5DF] bg-[#F4F7F5] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-black text-[#202B26]">
                Promote your business across Nigerian campuses
              </h4>
              <p className="text-xs text-[#202B26]/75 max-w-xl leading-relaxed">
                Target all Nigerian universities nationwide, Federal/State/Private groups, or specific campuses. All requests go straight to our admin desk ({CEO_ADS_PHONE}).
              </p>
            </div>
            {isCeo && onOpenMasterControl ? (
              <button
                type="button"
                onClick={onOpenMasterControl}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#075B3B] hover:bg-[#0B8050] text-[#FFFFFF] text-xs font-black rounded-xl transition whitespace-nowrap shrink-0"
              >
                <Megaphone className="w-4 h-4 text-[#F2C94C]" />
                <span>Create Official Ad</span>
              </button>
            ) : onOpenSubmitModal ? (
              <button
                type="button"
                onClick={() => onOpenSubmitModal('featured')}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#075B3B] hover:bg-[#0B8050] text-[#FFFFFF] text-xs font-black rounded-xl transition whitespace-nowrap shrink-0"
              >
                <span>Request Sponsored Slot</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#F2C94C]" />
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

      <div className="pt-5 border-t border-[#E6EFEA] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-sm font-black text-[#202B26]">Advertising Packages</h3>
          <p className="text-xs text-[#202B26]/70">
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
                    ? 'border-[#075B3B] bg-[#F4F7F5] shadow-xs'
                    : 'border-[#D9E5DF] bg-[#FFFFFF]'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-black text-[#202B26]">{pkg.name}</h4>
                    <span className="text-xs font-bold text-[#075B3B] tabular-nums">
                      {pkg.durationDays} days
                    </span>
                  </div>
                  <p className="text-xl font-black text-[#075B3B] tabular-nums">
                    {formatNaira(pkg.priceNaira)}
                  </p>
                  <ul className="space-y-1 text-xs text-[#202B26]/80 pt-1 border-t border-[#E6EFEA]">
                    {pkg.benefits.map((b) => (
                      <li key={b}>· {b}</li>
                    ))}
                  </ul>
                </div>

                {isCeo && onOpenMasterControl ? (
                  <button
                    type="button"
                    onClick={onOpenMasterControl}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-black transition min-h-[38px] ${
                      isPriority
                        ? 'bg-[#075B3B] hover:bg-[#0B8050] text-[#FFFFFF]'
                        : 'bg-[#FFFFFF] border border-[#075B3B] hover:bg-[#075B3B] hover:text-[#FFFFFF] text-[#075B3B]'
                    }`}
                  >
                    Publish {pkg.name}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onOpenSubmitModal?.(pkg.id)}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-black transition min-h-[38px] inline-flex items-center justify-center gap-1.5 ${
                      isPriority
                        ? 'bg-[#075B3B] hover:bg-[#0B8050] text-[#FFFFFF]'
                        : 'bg-[#F4F7F5] border border-[#D9E5DF] hover:border-[#075B3B] text-[#202B26]'
                    }`}
                  >
                    <Send className="w-3.5 h-3.5 text-[#075B3B]" />
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
