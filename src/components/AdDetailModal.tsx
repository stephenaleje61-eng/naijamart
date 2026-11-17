import React, { useState } from 'react';
import {
  X,
  Phone,
  MessageCircle,
  MapPin,
  Calendar,
  ExternalLink,
  Megaphone
} from 'lucide-react';
import { Advertisement } from '../types.js';
import {
  CEO_ADS_PHONE,
  getCeoAdsWhatsAppUrl,
  trackAdEvent
} from '../services/ads.js';
import { isAuthorizedCeo } from '../services/events.js';
import { useAuth } from '../context/AuthContext.js';
import { formatNaira } from './ProductCard.js';
import { CeoVerifiedBadge } from './CeoVerifiedBadge.js';

interface AdDetailModalProps {
  ad: Advertisement;
  onClose: () => void;
  onAdvertiseNow?: () => void;
}

function toWhatsAppLink(rawPhone: string, businessName: string, title: string): string {
  const digits = rawPhone.replace(/\D/g, '');
  const intl =
    digits.startsWith('0') && digits.length === 11
      ? `234${digits.slice(1)}`
      : digits.startsWith('234')
      ? digits
      : `234${digits}`;
  const msg = `Hello ${businessName}, I saw your sponsored advert "${title}" on NIGERIA CAMPUS MARKET and would like to make an inquiry.`;
  return `https://wa.me/${intl}?text=${encodeURIComponent(msg)}`;
}

export const AdDetailModal: React.FC<AdDetailModalProps> = ({
  ad,
  onClose,
  onAdvertiseNow
}) => {
  const { user } = useAuth();
  const isCeo = isAuthorizedCeo(user);
  const [bannerError, setBannerError] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const startStr = ad.startDate ? new Date(ad.startDate).toLocaleDateString('en-NG') : 'Active now';
  const expStr = ad.expiryDate ? new Date(ad.expiryDate).toLocaleDateString('en-NG') : 'Active';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs overflow-y-auto flex items-center justify-center p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label={ad.title}
    >
      <div className="relative w-full max-w-2xl bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl shadow-xl overflow-hidden text-[#10251D]">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-[#E5E7EB] bg-[#F4F8F5]">
          <div className="flex items-center gap-2 text-xs text-[#10251D]/70">
            <span className="font-black text-[#087443]">Sponsored</span>
            <span aria-hidden="true">·</span>
            <span>{ad.businessCategory}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{ad.location}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close advertisement details"
            className="w-9 h-9 rounded-lg border border-[#E5E7EB] bg-[#FFFFFF] hover:bg-[#F4F8F5] flex items-center justify-center text-[#10251D] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Banner Image */}
        <div className="w-full aspect-[16/9] bg-[#F4F8F5] relative overflow-hidden border-b border-[#E5E7EB]">
          {!bannerError && ad.imageUrl ? (
            <img
              src={ad.imageUrl}
              alt={`${ad.businessName} — ${ad.title}`}
              referrerPolicy="no-referrer"
              onError={() => setBannerError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-[#065D36] text-[#FFFFFF] p-6 text-center">
              <Megaphone className="w-10 h-10 text-[#D4A62A]" />
              <p className="font-bold text-base">{ad.businessName}</p>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Business Identity */}
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl border border-[#E5E7EB] bg-[#F4F8F5] overflow-hidden flex items-center justify-center shrink-0">
              {ad.logoUrl && !logoError ? (
                <img
                  src={ad.logoUrl}
                  alt={ad.businessName}
                  referrerPolicy="no-referrer"
                  onError={() => setLogoError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-black text-base text-[#087443]">
                  {ad.businessName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#087443]">{ad.businessName}</p>
              <h2 className="text-lg sm:text-xl font-black text-[#10251D] leading-snug mt-0.5">
                {ad.title}
              </h2>
              <p className="text-xs text-[#10251D]/70 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#087443]" />
                  {ad.location}
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <Calendar className="w-3.5 h-3.5 text-[#087443]" />
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

          {/* Description */}
          <div className="text-sm text-[#10251D]/85 leading-relaxed whitespace-pre-line">
            {ad.description}
          </div>

          {/* Advertiser Direct Contacts */}
          <div className="pt-4 border-t border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs text-[#10251D]/70">Advertiser Contact</p>
              <p className="text-sm font-black text-[#10251D] tabular-nums">{ad.phone}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <a
                href={`tel:${ad.phone}`}
                onClick={() => trackAdEvent(ad.id, 'click')}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#F4F8F5] hover:bg-[#E5E7EB] text-[#10251D] font-bold text-xs rounded-xl transition min-h-[42px] whitespace-nowrap"
              >
                <Phone className="w-3.5 h-3.5 text-[#087443]" />
                <span>Call Business</span>
              </a>

              <a
                href={toWhatsAppLink(ad.whatsappNumber || ad.phone, ad.businessName, ad.title)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackAdEvent(ad.id, 'whatsapp_click')}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#087443] hover:bg-[#065D36] text-[#FFFFFF] font-black text-xs rounded-xl transition min-h-[42px] whitespace-nowrap"
              >
                <MessageCircle className="w-4 h-4 text-[#D4A62A]" />
                <span>Chat on WhatsApp</span>
              </a>

              {ad.websiteOrSocialLink && (
                <a
                  href={
                    ad.websiteOrSocialLink.startsWith('http')
                      ? ad.websiteOrSocialLink
                      : `https://${ad.websiteOrSocialLink}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackAdEvent(ad.id, 'click')}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 border border-[#E5E7EB] hover:border-[#087443] text-[#10251D] font-bold text-xs rounded-xl transition min-h-[42px] whitespace-nowrap"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#087443]" />
                  <span>Visit Link</span>
                </a>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-[#E5E7EB] flex flex-wrap items-center justify-between gap-2 text-xs text-[#10251D]/70">
            <span>
              Placement: <strong className="text-[#10251D]">{ad.packageName || ad.packageId}</strong> ({formatNaira(ad.packagePrice)})
            </span>
            {isCeo && onAdvertiseNow ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onAdvertiseNow();
                }}
                className="font-black text-[#087443] hover:underline"
              >
                Manage Official Ads (CEO)
              </button>
            ) : (
              <a
                href={getCeoAdsWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="font-black text-[#087443] hover:underline"
              >
                Contact CEO to Advertise ({CEO_ADS_PHONE})
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
