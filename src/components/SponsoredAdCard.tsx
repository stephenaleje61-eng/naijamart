import React, { useEffect, useRef, useState } from 'react';
import {
  Phone,
  MessageCircle,
  MapPin,
  ExternalLink,
  Megaphone,
  PlayCircle,
  Pin,
  Globe
} from 'lucide-react';
import { Advertisement } from '../types.js';
import { getAdTypeLabel, getAudienceScopeLabel, trackAdEvent } from '../services/ads.js';
import { CeoVerifiedBadge } from './CeoVerifiedBadge.js';

interface SponsoredAdCardProps {
  ad: Advertisement;
  onSelectAd: (ad: Advertisement) => void;
  variant?: 'card' | 'banner' | 'feed';
  compact?: boolean;
  trackImpressionOnMount?: boolean;
}

export function buildAdWhatsAppHref(ad: Advertisement): string {
  const digits = (ad.whatsappNumber || ad.phone || '').replace(/\D/g, '');
  const intl =
    digits.startsWith('0') && digits.length === 11
      ? `234${digits.slice(1)}`
      : digits.startsWith('234')
      ? digits
      : `234${digits}`;
  const msg = `Hello ${ad.businessName}, I saw your sponsored advert "${ad.title}" on NIGERIA CAMPUS MARKET.`;
  return `https://wa.me/${intl}?text=${encodeURIComponent(msg)}`;
}

export function normalizeExternalUrl(raw?: string): string | null {
  if (!raw || !raw.trim()) return null;
  const trimmed = raw.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return `https://${trimmed}`;
}

export const SponsoredAdCard: React.FC<SponsoredAdCardProps> = ({
  ad,
  onSelectAd,
  variant = 'card',
  compact = false,
  trackImpressionOnMount = true
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const impressionTrackedRef = useRef<string | null>(null);
  const primaryImage = ad.imageUrl || (ad.images && ad.images[0]) || '';
  const extraPhotosCount = ad.images && ad.images.length > 1 ? ad.images.length - 1 : 0;
  const typeLabel = getAdTypeLabel(ad.adType);
  const websiteHref = normalizeExternalUrl(ad.websiteOrSocialLink);

  useEffect(() => {
    if (!trackImpressionOnMount || !ad.id) return;
    if (impressionTrackedRef.current === ad.id) return;
    impressionTrackedRef.current = ad.id;
    trackAdEvent(ad.id, 'impression');
  }, [ad.id, trackImpressionOnMount]);

  const handleCardOpen = () => {
    trackAdEvent(ad.id, 'click');
    onSelectAd(ad);
  };

  if (variant === 'banner') {
    return (
      <article className="bg-[#FFFFFF] border border-[#EEEEEE] hover:border-[#F68B1F] rounded-2xl overflow-hidden shadow-xs transition">
        <div className="grid grid-cols-1 md:grid-cols-12">
          <button
            type="button"
            onClick={handleCardOpen}
            className="md:col-span-5 aspect-[16/10] md:aspect-auto md:min-h-[210px] bg-[#F7F7F7] relative overflow-hidden group text-left cursor-pointer"
          >
            {!imgFailed && primaryImage ? (
              <img
                src={primaryImage}
                alt={`${ad.businessName} — ${ad.title}`}
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
              />
            ) : (
              <div className="w-full h-full bg-[#222222] text-[#FFFFFF] flex flex-col items-center justify-center p-6 text-center">
                <Megaphone className="w-9 h-9 text-[#F68B1F] mb-1.5" />
                <span className="text-sm font-black">{ad.businessName}</span>
              </div>
            )}
          </button>

          <div className="md:col-span-7 p-4 sm:p-5 flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#FF6A00] text-[#FFFFFF] text-[10px] font-extrabold uppercase tracking-wider">
                    Sponsored
                  </span>
                  <span className="text-[11px] font-bold text-[#F68B1F]">{typeLabel}</span>
                  {ad.isPinned && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#FF6A00]">
                      <Pin className="w-3 h-3" /> Pinned
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-[#303030]/65 font-medium flex items-center gap-1">
                  <Globe className="w-3 h-3 text-[#F68B1F]" />
                  {getAudienceScopeLabel(ad.visibilityScope)}
                </span>
              </div>

              <button type="button" onClick={handleCardOpen} className="text-left block group cursor-pointer">
                <p className="text-xs font-extrabold text-[#FF6A00]">{ad.businessName}</p>
                <h4 className="font-display text-base sm:text-lg font-extrabold text-[#222222] group-hover:text-[#FF6A00] leading-snug mt-0.5">
                  {ad.title}
                </h4>
              </button>

              <p className="text-xs sm:text-sm text-[#303030]/75 line-clamp-2 leading-relaxed">
                {ad.description}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-[#EEEEEE]">
              <span className="text-xs text-[#303030]/70 inline-flex items-center gap-1 truncate max-w-[220px]">
                <MapPin className="w-3.5 h-3.5 text-[#FF6A00] shrink-0" />
                <span className="truncate">{ad.location}</span>
              </span>

              <div className="flex flex-wrap items-center gap-2">
                {ad.phone && (
                  <a
                    href={`tel:${ad.phone}`}
                    onClick={() => trackAdEvent(ad.id, 'click')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#F7F7F7] hover:bg-[#EEEEEE] text-[#222222] text-xs font-bold transition tabular-nums"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#FF6A00]" />
                    <span>Call</span>
                  </a>
                )}
                <a
                  href={buildAdWhatsAppHref(ad)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackAdEvent(ad.id, 'whatsapp_click')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#F68B1F] hover:bg-[#FF6A00] text-[#FFFFFF] text-xs font-extrabold transition"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-white" />
                  <span>WhatsApp</span>
                </a>
                {websiteHref && (
                  <a
                    href={websiteHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackAdEvent(ad.id, 'click')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#EEEEEE] hover:border-[#F68B1F] text-[#222222] text-xs font-bold transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#FF6A00]" />
                    <span>Visit</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      className={`rounded-xl border border-[#EEEEEE] bg-[#FFFFFF] overflow-hidden flex flex-col justify-between transition hover:border-[#F68B1F] shadow-xs ${
        variant === 'feed' ? 'ring-1 ring-[#F68B1F]/40' : ''
      }`}
    >
      <div>
        <button type="button" onClick={handleCardOpen} className="w-full text-left block group cursor-pointer">
          <div
            className={`${
              compact ? 'aspect-[16/9]' : 'aspect-[16/10]'
            } bg-[#F7F7F7] overflow-hidden border-b border-[#EEEEEE] relative`}
          >
            {!imgFailed && primaryImage ? (
              <img
                src={primaryImage}
                alt={`${ad.businessName} — ${ad.title}`}
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
              />
            ) : (
              <div className="w-full h-full bg-[#222222] text-[#FFFFFF] flex flex-col items-center justify-center p-4 text-center">
                <Megaphone className="w-8 h-8 text-[#F68B1F] mb-1" />
                <span className="text-xs font-bold">{ad.businessName}</span>
              </div>
            )}
            <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-[#FF6A00] text-[#FFFFFF] text-[10px] font-extrabold uppercase tracking-wider shadow-xs">
              Sponsored
            </span>
          </div>

          <div className={`${compact ? 'p-3.5 space-y-2' : 'p-4 space-y-2.5'}`}>
            <div className="flex items-center justify-between gap-2 text-[11px] text-[#303030]/70">
              <span className="font-extrabold text-[#FF6A00] truncate">
                {typeLabel} · {ad.businessCategory}
              </span>
              <span className="flex items-center gap-1.5 shrink-0">
                {extraPhotosCount > 0 && (
                  <span className="font-bold text-[#303030]/60 tabular-nums">
                    +{extraPhotosCount} photos
                  </span>
                )}
                {ad.videoUrl && <PlayCircle className="w-3.5 h-3.5 text-[#FF6A00]" />}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg border border-[#EEEEEE] bg-[#F7F7F7] overflow-hidden flex items-center justify-center shrink-0">
                {ad.logoUrl ? (
                  <img
                    src={ad.logoUrl}
                    alt={ad.businessName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-black text-[#FF6A00]">
                    {ad.businessName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-extrabold text-[#222222] truncate block">
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

            <h4 className="font-display text-sm font-extrabold text-[#222222] group-hover:text-[#FF6A00] line-clamp-2 leading-snug">
              {ad.title}
            </h4>

            <p className="text-xs text-[#303030]/75 line-clamp-2 leading-relaxed">
              {ad.description}
            </p>

            <p className="flex items-center gap-1.5 text-[11px] text-[#303030]/70 truncate pt-0.5">
              <MapPin className="w-3.5 h-3.5 text-[#FF6A00] shrink-0" />
              <span className="truncate">{ad.location}</span>
            </p>
          </div>
        </button>
      </div>

      <div className="px-4 py-2.5 border-t border-[#EEEEEE] bg-[#F7F7F7] flex items-center justify-between gap-2">
        <a
          href={`tel:${ad.phone}`}
          onClick={() => trackAdEvent(ad.id, 'click')}
          className="inline-flex items-center gap-1 text-xs font-bold text-[#222222] hover:text-[#FF6A00] tabular-nums truncate"
        >
          <Phone className="w-3.5 h-3.5 text-[#FF6A00] shrink-0" />
          <span className="truncate">{ad.phone}</span>
        </a>

        <div className="flex items-center gap-1.5 shrink-0">
          {websiteHref && (
            <a
              href={websiteHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackAdEvent(ad.id, 'click')}
              title="Visit website"
              className="p-1.5 rounded-lg border border-[#EEEEEE] bg-[#FFFFFF] hover:border-[#F68B1F] text-[#FF6A00] transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <a
            href={buildAdWhatsAppHref(ad)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackAdEvent(ad.id, 'whatsapp_click')}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#F68B1F] hover:bg-[#FF6A00] text-[#FFFFFF] text-xs font-extrabold rounded-lg transition whitespace-nowrap"
          >
            <MessageCircle className="w-3.5 h-3.5 text-white" />
            <span>WhatsApp</span>
          </a>
        </div>
      </div>
    </article>
  );
};
