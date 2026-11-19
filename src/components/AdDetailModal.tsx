import React, { useMemo, useState } from 'react';
import {
  X,
  Phone,
  MessageCircle,
  MapPin,
  Calendar,
  ExternalLink,
  Megaphone,
  PlayCircle,
  Globe
} from 'lucide-react';
import { Advertisement } from '../types.js';
import {
  getAdTypeLabel,
  getAudienceScopeLabel,
  trackAdEvent
} from '../services/ads.js';
import { isAuthorizedCeo } from '../services/events.js';
import { useAuth } from '../context/AuthContext.js';
import { CeoVerifiedBadge } from './CeoVerifiedBadge.js';
import { buildAdWhatsAppHref, normalizeExternalUrl } from './SponsoredAdCard.js';

interface AdDetailModalProps {
  ad: Advertisement;
  onClose: () => void;
  onAdvertiseNow?: () => void;
  onRequestAd?: () => void;
}

export const AdDetailModal: React.FC<AdDetailModalProps> = ({
  ad,
  onClose,
  onAdvertiseNow,
  onRequestAd
}) => {
  const { user } = useAuth();
  const isCeo = isAuthorizedCeo(user);

  const galleryImages = useMemo(() => {
    const list = [ad.imageUrl, ...(ad.images || [])].map((u) => String(u || '').trim()).filter(Boolean);
    return Array.from(new Set(list));
  }, [ad.imageUrl, ad.images]);

  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [bannerError, setBannerError] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const activeImage = galleryImages[activeImageIdx] || ad.imageUrl;
  const startStr = ad.startDate ? new Date(ad.startDate).toLocaleDateString('en-NG') : 'Active now';
  const expStr = ad.expiryDate ? new Date(ad.expiryDate).toLocaleDateString('en-NG') : 'Ongoing';
  const websiteHref = normalizeExternalUrl(ad.websiteOrSocialLink);
  const videoHref = normalizeExternalUrl(ad.videoUrl);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs overflow-y-auto flex items-center justify-center p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label={ad.title}
    >
      <div className="relative w-full max-w-2xl bg-[#FFFFFF] border border-[#D9E5DF] rounded-2xl shadow-xl overflow-hidden text-[#202B26] my-4">
        <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-[#D9E5DF] bg-[#F4F7F5]">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#202B26]/75">
            <span className="px-2 py-0.5 rounded-md bg-[#F2C94C] text-[#202B26] text-[10px] font-extrabold uppercase tracking-wider">
              Sponsored
            </span>
            <span className="font-extrabold text-[#075B3B]">{getAdTypeLabel(ad.adType)}</span>
            <span aria-hidden="true">·</span>
            <span>{ad.businessCategory}</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <Globe className="w-3 h-3 text-[#0B8050]" />
              {getAudienceScopeLabel(ad.visibilityScope)}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close advertisement details"
            className="w-9 h-9 rounded-lg border border-[#D9E5DF] bg-[#FFFFFF] hover:bg-[#E6EFEA] flex items-center justify-center text-[#202B26] transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[84vh] overflow-y-auto">
          <div className="w-full aspect-[16/9] bg-[#F4F7F5] relative overflow-hidden border-b border-[#D9E5DF]">
            {!bannerError && activeImage ? (
              <img
                src={activeImage}
                alt={`${ad.businessName} — ${ad.title}`}
                referrerPolicy="no-referrer"
                onError={() => setBannerError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-[#075B3B] text-[#FFFFFF] p-6 text-center">
                <Megaphone className="w-10 h-10 text-[#F2C94C]" />
                <p className="font-bold text-base">{ad.businessName}</p>
              </div>
            )}
          </div>

          {galleryImages.length > 1 && (
            <div className="px-5 py-2.5 bg-[#F4F7F5] border-b border-[#D9E5DF] flex items-center gap-2 overflow-x-auto">
              {galleryImages.map((imgUrl, idx) => (
                <button
                  key={`${imgUrl}-${idx}`}
                  type="button"
                  onClick={() => {
                    setBannerError(false);
                    setActiveImageIdx(idx);
                  }}
                  className={`w-16 h-12 rounded-lg overflow-hidden border-2 shrink-0 transition ${
                    idx === activeImageIdx
                      ? 'border-[#075B3B] ring-1 ring-[#F2C94C]'
                      : 'border-[#D9E5DF] opacity-75 hover:opacity-100'
                  }`}
                >
                  <img
                    src={imgUrl}
                    alt={`Preview ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          <div className="p-5 sm:p-6 space-y-5">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-xl border border-[#D9E5DF] bg-[#F4F7F5] overflow-hidden flex items-center justify-center shrink-0">
                {ad.logoUrl && !logoError ? (
                  <img
                    src={ad.logoUrl}
                    alt={ad.businessName}
                    referrerPolicy="no-referrer"
                    onError={() => setLogoError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-black text-base text-[#075B3B]">
                    {ad.businessName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold text-[#0B8050]">{ad.businessName}</p>
                <h2 className="font-display text-lg sm:text-xl font-black text-[#202B26] leading-snug mt-0.5">
                  {ad.title}
                </h2>
                <p className="text-xs text-[#202B26]/70 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#075B3B]" />
                    {ad.location}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Calendar className="w-3.5 h-3.5 text-[#075B3B]" />
                    {startStr} – {expStr}
                  </span>
                </p>
                <CeoVerifiedBadge
                  verified={Boolean(ad.ceoVerified || ad.isVerified)}
                  entityIds={[ad.ownerUid]}
                  customText={ad.verifiedBadgeText}
                  variant="banner"
                  className="mt-2.5"
                />
              </div>
            </div>

            <div className="text-sm text-[#202B26]/85 leading-relaxed whitespace-pre-line">
              {ad.description}
            </div>

            {videoHref && (
              <div className="p-3.5 rounded-xl bg-[#F4F7F5] border border-[#D9E5DF] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#202B26]">
                  <PlayCircle className="w-4 h-4 text-[#075B3B] shrink-0" />
                  <span>Campaign Promo Video Available</span>
                </div>
                <a
                  href={videoHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackAdEvent(ad.id, 'click')}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#075B3B] hover:bg-[#0B8050] text-[#FFFFFF] text-xs font-extrabold transition"
                >
                  <span>Watch Video</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#F2C94C]" />
                </a>
              </div>
            )}

            <div className="pt-4 border-t border-[#D9E5DF] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs text-[#202B26]/70">Advertiser Contact</p>
                <p className="text-sm font-black text-[#202B26] tabular-nums">{ad.phone}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <a
                  href={`tel:${ad.phone}`}
                  onClick={() => trackAdEvent(ad.id, 'click')}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#F4F7F5] hover:bg-[#E6EFEA] text-[#202B26] font-bold text-xs rounded-xl transition min-h-[42px] whitespace-nowrap"
                >
                  <Phone className="w-3.5 h-3.5 text-[#075B3B]" />
                  <span>Call Business</span>
                </a>

                <a
                  href={buildAdWhatsAppHref(ad)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackAdEvent(ad.id, 'whatsapp_click')}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#075B3B] hover:bg-[#0B8050] text-[#FFFFFF] font-black text-xs rounded-xl transition min-h-[42px] whitespace-nowrap"
                >
                  <MessageCircle className="w-4 h-4 text-[#F2C94C]" />
                  <span>Chat on WhatsApp</span>
                </a>

                {websiteHref && (
                  <a
                    href={websiteHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackAdEvent(ad.id, 'click')}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 border border-[#D9E5DF] hover:border-[#075B3B] text-[#202B26] font-bold text-xs rounded-xl transition min-h-[42px] whitespace-nowrap"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#075B3B]" />
                    <span>Visit Link</span>
                  </a>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-[#D9E5DF] flex flex-wrap items-center justify-between gap-2 text-xs text-[#202B26]/70">
              <span>
                Campaign Tier: <strong className="text-[#202B26]">{ad.packageName || ad.packageId}</strong>
              </span>
              {isCeo && onAdvertiseNow ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onAdvertiseNow();
                  }}
                  className="font-black text-[#075B3B] hover:underline"
                >
                  Manage Official Ads (Admin)
                </button>
              ) : onRequestAd ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onRequestAd();
                  }}
                  className="font-black text-[#075B3B] hover:underline"
                >
                  Want to advertise your business? Submit Request
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
