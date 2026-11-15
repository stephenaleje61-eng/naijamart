import React, { useEffect, useRef, useState } from 'react';
import {
  Megaphone,
  Phone,
  MessageCircle,
  MapPin,
  Calendar,
  ArrowRight,
  Sliders
} from 'lucide-react';
import { AdPackageId, Advertisement } from '../types.js';
import {
  ADVERTISING_PACKAGES,
  CEO_ADS_PHONE,
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
  onOpenSubmitModal: (packageId?: AdPackageId) => void;
  onSelectAd: (ad: Advertisement) => void;
  onOpenMasterControl?: () => void;
}

function buildAdWhatsAppHref(ad: Advertisement): string {
  const digits = (ad.whatsappNumber || ad.phone).replace(/\D/g, '');
  const intl = digits.startsWith('0') && digits.length === 11
    ? `234${digits.slice(1)}`
    : digits.startsWith('234')
    ? digits
    : `234${digits}`;
  const msg = `Hello ${ad.businessName}, I saw your sponsored advert "${ad.title}" on FU MARKET.`;
  return `https://wa.me/${intl}?text=${encodeURIComponent(msg)}`;
}

export const FuMarketAdsSection: React.FC<FuMarketAdsSectionProps> = ({
  ads,
  loading = false,
  onOpenSubmitModal,
  onSelectAd,
  onOpenMasterControl
}) => {
  const { user } = useAuth();
  const isCeo = isAuthorizedCeo(user);
  const trackedImpressions = useRef<Set<string>>(new Set());
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    for (const ad of ads) {
      if (!trackedImpressions.current.has(ad.id)) {
        trackedImpressions.current.add(ad.id);
        trackAdEvent(ad.id, 'impression');
      }
    }
  }, [ads]);

  return (
    <section
      id="fu-market-ads"
      className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-7 space-y-8 shadow-xs"
    >
      {/* Section Header + Primary Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-6 border-b border-[#E5E7EB]">
        <div className="space-y-1.5 max-w-2xl">
          <p className="text-xs font-extrabold text-[#0B6B3A] tracking-wide">
            Official Campus Advertising Network
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
            FU MARKET ADS
          </h2>
          <p className="text-sm text-[#444444]">
            Advertise Your Business. Reach More Students. Grow Your Sales.
          </p>
        </div>

        <div className="flex flex-wrap items-start gap-3">
          <button
            type="button"
            onClick={() => onOpenSubmitModal('basic')}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#0B6B3A] hover:bg-[#14532D] text-white text-xs sm:text-sm font-black rounded-xl transition min-h-[44px] whitespace-nowrap shrink-0"
          >
            <Megaphone className="w-4 h-4 text-[#F2B90D]" />
            <span>ADVERTISE YOUR BUSINESS</span>
          </button>

          <CeoContactButton compact showSubLabel />

          {isCeo && onOpenMasterControl && (
            <button
              type="button"
              onClick={onOpenMasterControl}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#111111] hover:bg-[#14532D] text-[#F2B90D] text-xs font-black rounded-xl transition min-h-[40px] whitespace-nowrap shrink-0"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>CEO Master Control</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Approved Paid Sponsored Advertisements */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-black text-[#111111]">
            Sponsored Campus Businesses
          </h3>
          <span className="text-xs text-[#555555] tabular-nums">
            {ads.length} active {ads.length === 1 ? 'advert' : 'adverts'}
          </span>
        </div>

        {loading && ads.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((slot) => (
              <div
                key={slot}
                className="h-64 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] animate-pulse"
              />
            ))}
          </div>
        ) : ads.length === 0 ? (
          <div className="p-6 sm:p-8 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-black text-[#111111]">
                Sponsored spots are open for your business
              </h4>
              <p className="text-xs text-[#555555] max-w-xl">
                Only verified, paid and CEO-approved business advertisements are displayed here. Showcase your brand, event, food spot or service to thousands of FUWUKARI students.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenSubmitModal('featured')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#F2B90D] hover:bg-[#FFC107] text-[#111111] text-xs font-black rounded-xl transition whitespace-nowrap shrink-0"
            >
              <span>ADVERTISE YOUR BUSINESS</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {ads.map((ad) => {
              const startText = ad.startDate
                ? new Date(ad.startDate).toLocaleDateString('en-NG')
                : 'Active';
              const expiryText = ad.expiryDate
                ? new Date(ad.expiryDate).toLocaleDateString('en-NG')
                : 'Ongoing';

              return (
                <article
                  key={ad.id}
                  className="rounded-xl border border-[#E5E7EB] bg-white overflow-hidden flex flex-col justify-between transition hover:border-[#0B6B3A]"
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
                      <div className="aspect-[16/10] bg-[#F5F5F5] overflow-hidden border-b border-[#E5E7EB]">
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
                          <div className="w-full h-full bg-[#14532D] text-white flex flex-col items-center justify-center p-4 text-center">
                            <Megaphone className="w-8 h-8 text-[#F2B90D] mb-1" />
                            <span className="text-xs font-bold">{ad.businessName}</span>
                          </div>
                        )}
                      </div>

                      <div className="p-4 space-y-2.5">
                        {/* Top metadata line: Sponsored + Business Category */}
                        <div className="flex items-center gap-2 text-xs text-[#555555]">
                          <span className="font-black text-[#0B6B3A]">Sponsored</span>
                          <span aria-hidden="true">·</span>
                          <span className="truncate">{ad.businessCategory}</span>
                        </div>

                        {/* Business logo & name */}
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] overflow-hidden flex items-center justify-center shrink-0">
                            {ad.logoUrl ? (
                              <img
                                src={ad.logoUrl}
                                alt={ad.businessName}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-xs font-black text-[#0B6B3A]">
                                {ad.businessName.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-extrabold text-[#111111] truncate block">
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

                        <h4 className="text-sm font-black text-[#111111] group-hover:text-[#0B6B3A] line-clamp-2 leading-snug">
                          {ad.title}
                        </h4>

                        <p className="text-xs text-[#555555] line-clamp-2 leading-relaxed">
                          {ad.description}
                        </p>

                        <div className="pt-1 space-y-1 text-[11px] text-[#555555]">
                          <p className="flex items-center gap-1.5 truncate">
                            <MapPin className="w-3.5 h-3.5 text-[#0B6B3A] shrink-0" />
                            <span className="truncate">{ad.location}</span>
                          </p>
                          <p className="flex items-center gap-1.5 tabular-nums">
                            <Calendar className="w-3.5 h-3.5 text-[#0B6B3A] shrink-0" />
                            <span>
                              {startText} – {expiryText}
                            </span>
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* Direct Phone & WhatsApp Contact Footer */}
                  <div className="px-4 py-3 border-t border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-between gap-2">
                    <a
                      href={`tel:${ad.phone}`}
                      onClick={() => trackAdEvent(ad.id, 'click')}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#111111] hover:text-[#0B6B3A] tabular-nums truncate"
                    >
                      <Phone className="w-3.5 h-3.5 text-[#0B6B3A] shrink-0" />
                      <span className="truncate">{ad.phone}</span>
                    </a>

                    <a
                      href={buildAdWhatsAppHref(ad)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackAdEvent(ad.id, 'whatsapp_click')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0B6B3A] hover:bg-[#14532D] text-white text-xs font-black rounded-lg transition whitespace-nowrap shrink-0"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-[#F2B90D]" />
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
            <h3 className="text-base sm:text-lg font-black text-[#111111]">
              Advertising Packages
            </h3>
            <p className="text-xs text-[#555555]">
              Transparent campus advertising rates for businesses, vendors, events and service providers.
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
                    ? 'border-[#0B6B3A] bg-[#F0FDF4]'
                    : 'border-[#E5E7EB] bg-[#F9FAFB]'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-black text-[#111111]">{pkg.name}</h4>
                    <span className="text-xs font-bold text-[#0B6B3A] tabular-nums">
                      {pkg.durationDays} days
                    </span>
                  </div>

                  <p className="text-2xl font-black text-[#0B6B3A] tabular-nums">
                    {formatNaira(pkg.priceNaira)}
                  </p>

                  <ul className="space-y-1.5 text-xs text-[#333333] pt-1 border-t border-[#E5E7EB]">
                    {pkg.benefits.map((b) => (
                      <li key={b} className="leading-relaxed">
                        · {b}
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenSubmitModal(pkg.id)}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-black transition min-h-[42px] ${
                    isPriority
                      ? 'bg-[#0B6B3A] hover:bg-[#14532D] text-white'
                      : 'bg-white border border-[#E5E7EB] hover:border-[#0B6B3A] text-[#111111]'
                  }`}
                >
                  Choose {pkg.name}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Advertising Support Section */}
      <div className="p-5 rounded-xl border border-[#FDBA74] bg-[#FFF7ED] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-sm font-black text-[#111111]">
            Advertising Support &amp; Direct CEO Approval
          </h3>
          <p className="text-xs text-[#444444] max-w-2xl">
            Submit your advert online or chat directly with FU MARKET CEO ({CEO_ADS_PHONE}) for fast package selection, payment confirmation, and activation.
          </p>
        </div>
        <CeoContactButton compact />
      </div>
    </section>
  );
};
