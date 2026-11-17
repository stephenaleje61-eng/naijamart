import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Megaphone,
  Phone,
  MessageCircle,
  MapPin,
  Calendar,
  ArrowRight,
  Sliders,
  ShieldCheck
} from 'lucide-react';
import { AdPackageId, Advertisement } from '../types.js';
import {
  ADVERTISING_PACKAGES,
  CEO_ADS_PHONE,
  filterAdsForInstitution,
  getCeoAdsWhatsAppUrl,
  trackAdEvent
} from '../services/ads.js';
import { isAuthorizedCeo } from '../services/events.js';
import { useAuth } from '../context/AuthContext.js';
import { CeoContactButton } from './CeoContactButton.js';
import { formatNaira } from './ProductCard.js';
import { CeoVerifiedBadge } from './CeoVerifiedBadge.js';

interface FuMarketAdsSectionProps {
  ads: Advertisement[];
  loading?: boolean;
  selectedInstitutionId?: string;
  activeInstitutionName?: string;
  onOpenSubmitModal?: (packageId?: AdPackageId) => void;
  onSelectAd: (ad: Advertisement) => void;
  onOpenMasterControl?: () => void;
}

function buildAdWhatsAppHref(ad: Advertisement): string {
  const digits = (ad.whatsappNumber || ad.phone).replace(/\D/g, '');
  const intl =
    digits.startsWith('0') && digits.length === 11
      ? `234${digits.slice(1)}`
      : digits.startsWith('234')
      ? digits
      : `234${digits}`;
  const msg = `Hello ${ad.businessName}, I saw your sponsored advert "${ad.title}" on NIGERIA CAMPUS MARKET.`;
  return `https://wa.me/${intl}?text=${encodeURIComponent(msg)}`;
}

export const FuMarketAdsSection: React.FC<FuMarketAdsSectionProps> = ({
  ads,
  loading = false,
  selectedInstitutionId,
  activeInstitutionName,
  onOpenSubmitModal,
  onSelectAd,
  onOpenMasterControl
}) => {
  const { user } = useAuth();
  const isCeo = isAuthorizedCeo(user);
  const trackedImpressions = useRef<Set<string>>(new Set());
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const visibleAds = useMemo(
    () => filterAdsForInstitution(ads, selectedInstitutionId),
    [ads, selectedInstitutionId]
  );

  useEffect(() => {
    for (const ad of visibleAds) {
      if (!trackedImpressions.current.has(ad.id)) {
        trackedImpressions.current.add(ad.id);
        trackAdEvent(ad.id, 'impression');
      }
    }
  }, [visibleAds]);

  return (
    <section
      id="fu-market-ads"
      className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-5 sm:p-7 space-y-8 shadow-xs"
    >
      {/* Section Header + CEO-Exclusive Ad Management & Contact Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-6 border-b border-[#E5E7EB]">
        <div className="space-y-1.5 max-w-2xl">
          <p className="text-xs font-extrabold text-[#087443] tracking-wide flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#D4A62A]" />
            <span>
              Official Campus Advertising Network
              {activeInstitutionName ? ` · ${activeInstitutionName}` : ''}
            </span>
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-black text-[#10251D] tracking-tight">
            NIGERIA CAMPUS MARKET ADS
          </h2>
          <p className="text-sm text-[#10251D]/75">
            Advertise Your Business Across Nigerian Campuses. Reach More Students. Grow Your Sales.
          </p>
        </div>

        <div className="flex flex-wrap items-start gap-3">
          {isCeo && (onOpenMasterControl || onOpenSubmitModal) && (
            <button
              type="button"
              onClick={() => {
                if (onOpenMasterControl) {
                  onOpenMasterControl();
                } else if (onOpenSubmitModal) {
                  onOpenSubmitModal('featured');
                }
              }}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#087443] hover:bg-[#065D36] text-[#FFFFFF] text-xs sm:text-sm font-black rounded-xl transition min-h-[44px] whitespace-nowrap shrink-0 shadow-xs"
            >
              <Sliders className="w-4 h-4 text-[#D4A62A]" />
              <span>Manage Official Ads (CEO)</span>
            </button>
          )}

          <a
            href={getCeoAdsWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#D4A62A] hover:bg-[#E0B43B] text-[#10251D] text-xs sm:text-sm font-black rounded-xl transition min-h-[44px] whitespace-nowrap shrink-0 shadow-xs"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Contact CEO on WhatsApp</span>
          </a>

          <CeoContactButton compact showSubLabel />
        </div>
      </div>

      {/* Active Approved Paid Sponsored Advertisements */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-black text-[#10251D]">
            Sponsored Campus Businesses
          </h3>
          <span className="text-xs text-[#10251D]/70 tabular-nums font-bold">
            {visibleAds.length} active {visibleAds.length === 1 ? 'advert' : 'adverts'}
          </span>
        </div>

        {loading && visibleAds.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((slot) => (
              <div
                key={slot}
                className="h-64 rounded-xl border border-[#E5E7EB] bg-[#F4F8F5] animate-pulse"
              />
            ))}
          </div>
        ) : visibleAds.length === 0 ? (
          <div className="p-6 sm:p-8 rounded-xl border border-[#E5E7EB] bg-[#F4F8F5] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-black text-[#10251D]">
                Official sponsored placements open on NIGERIA CAMPUS MARKET
              </h4>
              <p className="text-xs text-[#10251D]/75 max-w-xl leading-relaxed">
                All official advertisements on NIGERIA CAMPUS MARKET are uploaded, verified, and published exclusively by the CEO ({CEO_ADS_PHONE}) to protect campus buyers and guarantee authentic business promotions.
              </p>
            </div>
            {isCeo && onOpenMasterControl ? (
              <button
                type="button"
                onClick={onOpenMasterControl}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#087443] hover:bg-[#065D36] text-[#FFFFFF] text-xs font-black rounded-xl transition whitespace-nowrap shrink-0"
              >
                <Megaphone className="w-4 h-4 text-[#D4A62A]" />
                <span>Publish Official Ad (CEO)</span>
              </button>
            ) : (
              <a
                href={getCeoAdsWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#D4A62A] hover:bg-[#E0B43B] text-[#10251D] text-xs font-black rounded-xl transition whitespace-nowrap shrink-0"
              >
                <span>Contact CEO to Advertise</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {visibleAds.map((ad) => {
              const startText = ad.startDate
                ? new Date(ad.startDate).toLocaleDateString('en-NG')
                : 'Active';
              const expiryText = ad.expiryDate
                ? new Date(ad.expiryDate).toLocaleDateString('en-NG')
                : 'Ongoing';

              return (
                <article
                  key={ad.id}
                  className="rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] overflow-hidden flex flex-col justify-between transition hover:border-[#087443] shadow-xs"
                >
                  <div>
                    {/* Clickable Media + Copy */}
                    <button
                      type="button"
                      onClick={() => {
                        trackAdEvent(ad.id, 'click');
                        onSelectAd(ad);
                      }}
                      className="w-full text-left block group"
                    >
                      <div className="aspect-[16/10] bg-[#F4F8F5] overflow-hidden border-b border-[#E5E7EB]">
                        {!failedImages[ad.id] && ad.imageUrl ? (
                          <img
                            src={ad.imageUrl}
                            alt={`${ad.businessName} — ${ad.title}`}
                            referrerPolicy="no-referrer"
                            onError={() =>
                              setFailedImages((prev) => ({ ...prev, [ad.id]: true }))
                            }
                            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                          />
                        ) : (
                          <div className="w-full h-full bg-[#065D36] text-[#FFFFFF] flex flex-col items-center justify-center p-4 text-center">
                            <Megaphone className="w-8 h-8 text-[#D4A62A] mb-1" />
                            <span className="text-xs font-bold">{ad.businessName}</span>
                          </div>
                        )}
                      </div>

                      <div className="p-4 space-y-2.5">
                        {/* Top metadata line: Sponsored + Business Category */}
                        <div className="flex items-center gap-2 text-xs text-[#10251D]/70">
                          <span className="font-black text-[#087443]">Sponsored</span>
                          <span aria-hidden="true">·</span>
                          <span className="truncate">{ad.businessCategory}</span>
                        </div>

                        {/* Business logo & name */}
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg border border-[#E5E7EB] bg-[#F4F8F5] overflow-hidden flex items-center justify-center shrink-0">
                            {ad.logoUrl ? (
                              <img
                                src={ad.logoUrl}
                                alt={ad.businessName}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-xs font-black text-[#087443]">
                                {ad.businessName.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-extrabold text-[#10251D] truncate block">
                              {ad.businessName}
                            </span>
                            <CeoVerifiedBadge
                              verified={Boolean(ad.ceoVerified || ad.isVerified)}
                              entityIds={[ad.ownerUid]}
                              customText={ad.verifiedBadgeText}
                              variant="compact"
                              className="mt-0.5"
                            />
                          </div>
                        </div>

                        <h4 className="text-sm font-black text-[#10251D] group-hover:text-[#087443] line-clamp-2 leading-snug">
                          {ad.title}
                        </h4>

                        <p className="text-xs text-[#10251D]/75 line-clamp-2 leading-relaxed">
                          {ad.description}
                        </p>

                        <div className="pt-1 space-y-1 text-[11px] text-[#10251D]/70">
                          <p className="flex items-center gap-1.5 truncate">
                            <MapPin className="w-3.5 h-3.5 text-[#087443] shrink-0" />
                            <span className="truncate">{ad.location}</span>
                          </p>
                          <p className="flex items-center gap-1.5 tabular-nums">
                            <Calendar className="w-3.5 h-3.5 text-[#087443] shrink-0" />
                            <span>
                              {startText} – {expiryText}
                            </span>
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* Direct Phone & WhatsApp Contact Footer */}
                  <div className="px-4 py-3 border-t border-[#E5E7EB] bg-[#F4F8F5] flex items-center justify-between gap-2">
                    <a
                      href={`tel:${ad.phone}`}
                      onClick={() => trackAdEvent(ad.id, 'click')}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#10251D] hover:text-[#087443] tabular-nums truncate"
                    >
                      <Phone className="w-3.5 h-3.5 text-[#087443] shrink-0" />
                      <span className="truncate">{ad.phone}</span>
                    </a>

                    <a
                      href={buildAdWhatsAppHref(ad)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackAdEvent(ad.id, 'whatsapp_click')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#087443] hover:bg-[#065D36] text-[#FFFFFF] text-xs font-black rounded-lg transition whitespace-nowrap shrink-0"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-[#D4A62A]" />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* 3 Official Advertising Packages */}
      <div className="pt-6 border-t border-[#E5E7EB] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-black text-[#10251D]">
              Advertising Packages
            </h3>
            <p className="text-xs text-[#10251D]/75">
              Book an official campaign slot directly with NIGERIA CAMPUS MARKET CEO ({CEO_ADS_PHONE}) for verified placement across your target campus or nationwide.
            </p>
          </div>
          <CeoContactButton compact showSubLabel />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ADVERTISING_PACKAGES.map((pkg) => {
            const isPriority = pkg.id === 'featured';
            return (
              <div
                key={pkg.id}
                className={`p-5 rounded-xl border flex flex-col justify-between gap-4 ${
                  isPriority
                    ? 'border-[#087443] bg-[#F4F8F5] shadow-xs'
                    : 'border-[#E5E7EB] bg-[#F4F8F5]/60'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-black text-[#10251D]">{pkg.name}</h4>
                    <span className="text-xs font-bold text-[#087443] tabular-nums">
                      {pkg.durationDays} days
                    </span>
                  </div>

                  <p className="text-2xl font-black text-[#087443] tabular-nums">
                    {formatNaira(pkg.priceNaira)}
                  </p>

                  <ul className="space-y-1.5 text-xs text-[#10251D]/85 pt-1 border-t border-[#E5E7EB]">
                    {pkg.benefits.map((b) => (
                      <li key={b} className="leading-relaxed">
                        · {b}
                      </li>
                    ))}
                  </ul>
                </div>

                {isCeo && onOpenMasterControl ? (
                  <button
                    type="button"
                    onClick={onOpenMasterControl}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-black transition min-h-[42px] ${
                      isPriority
                        ? 'bg-[#087443] hover:bg-[#065D36] text-[#FFFFFF]'
                        : 'bg-[#FFFFFF] border border-[#087443] hover:bg-[#087443] hover:text-[#FFFFFF] text-[#087443]'
                    }`}
                  >
                    Create {pkg.name} Ad (CEO)
                  </button>
                ) : (
                  <a
                    href={getCeoAdsWhatsAppUrl(pkg.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-black transition min-h-[42px] inline-flex items-center justify-center gap-1.5 ${
                      isPriority
                        ? 'bg-[#087443] hover:bg-[#065D36] text-[#FFFFFF]'
                        : 'bg-[#FFFFFF] border border-[#E5E7EB] hover:border-[#087443] text-[#10251D]'
                    }`}
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-[#D4A62A]" />
                    <span>Book {pkg.name} with CEO</span>
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Advertising Support Section */}
      <div className="p-5 rounded-xl border border-[#D4A62A]/60 bg-[#F4F8F5] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-sm font-black text-[#10251D]">
            CEO-Managed Official Advertising Support
          </h3>
          <p className="text-xs text-[#10251D]/80 max-w-2xl">
            Every advertisement banner, logo, campus targeting rule, and schedule is professionally uploaded and published by the NIGERIA CAMPUS MARKET CEO ({CEO_ADS_PHONE}) after direct WhatsApp confirmation.
          </p>
        </div>
        <CeoContactButton compact />
      </div>
    </section>
  );
};
