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
import { trackAdEvent } from '../services/ads.js';
import { formatNaira } from './ProductCard.js';
import { CeoVerifiedBadge } from './CeoVerifiedBadge.js';

interface AdDetailModalProps {
  ad: Advertisement;
  onClose: () => void;
  onAdvertiseNow: () => void;
}

function toWhatsAppLink(rawPhone: string, businessName: string, title: string): string {
  const digits = rawPhone.replace(/\D/g, '');
  const intl = digits.startsWith('0') && digits.length === 11
    ? `234${digits.slice(1)}`
    : digits.startsWith('234')
    ? digits
    : `234${digits}`;
  const msg = `Hello ${businessName}, I saw your sponsored advert "${title}" on FU MARKET and would like to make an inquiry.`;
  return `https://wa.me/${intl}?text=${encodeURIComponent(msg)}`;
}

export const AdDetailModal: React.FC<AdDetailModalProps> = ({
  ad,
  onClose,
  onAdvertiseNow
}) => {
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
      <div className="relative w-full max-w-2xl bg-white border border-[#E5E7EB] rounded-2xl shadow-xl overflow-hidden text-[#111111]">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-[#E5E7EB] bg-[#F9FAFB]">
          <div className="flex items-center gap-2 text-xs text-[#555555]">
            <span className="font-black text-[#0B6B3A]">Sponsored</span>
            <span aria-hidden="true">·</span>
            <span>{ad.businessCategory}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{ad.location}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close advertisement details"
            className="w-9 h-9 rounded-lg border border-[#E5E7EB] bg-white hover:bg-[#F5F5F5] flex items-center justify-center text-[#111111] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Banner Image */}
        <div className="w-full aspect-[16/9] bg-[#F5F5F5] relative overflow-hidden border-b border-[#E5E7EB]">
          {!bannerError && ad.imageUrl ? (
            <img
              src={ad.imageUrl}
              alt={`${ad.businessName} — ${ad.title}`}
              referrerPolicy="no-referrer"
              onError={() => setBannerError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-[#14532D] text-white p-6 text-center">
              <Megaphone className="w-10 h-10 text-[#F2B90D]" />
              <p className="font-bold text-base">{ad.businessName}</p>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Business Identity */}
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] overflow-hidden flex items-center justify-center shrink-0">
              {ad.logoUrl && !logoError ? (
                <img
                  src={ad.logoUrl}
                  alt={ad.businessName}
                  referrerPolicy="no-referrer"
                  onError={() => setLogoError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-black text-base text-[#0B6B3A]">
                  {ad.businessName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#0B6B3A]">{ad.businessName}</p>
              <h2 className="text-lg sm:text-xl font-black text-[#111111] leading-snug mt-0.5">
                {ad.title}
              </h2>
              <p className="text-xs text-[#555555] mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#0B6B3A]" />
                  {ad.location}
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <Calendar className="w-3.5 h-3.5 text-[#0B6B3A]" />
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
          <div className="text-sm text-[#333333] leading-relaxed whitespace-pre-line">
            {ad.description}
          </div>

          {/* Advertiser Direct Contacts */}
          <div className="pt-4 border-t border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs text-[#555555]">Advertiser Contact</p>
              <p className="text-sm font-black text-[#111111] tabular-nums">{ad.phone}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <a
                href={`tel:${ad.phone}`}
                onClick={() => trackAdEvent(ad.id, 'click')}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#F5F5F5] hover:bg-[#E5E7EB] text-[#111111] font-bold text-xs rounded-xl transition min-h-[42px] whitespace-nowrap"
              >
                <Phone className="w-3.5 h-3.5 text-[#0B6B3A]" />
                <span>Call Business</span>
              </a>

              <a
                href={toWhatsAppLink(ad.whatsappNumber || ad.phone, ad.businessName, ad.title)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackAdEvent(ad.id, 'whatsapp_click')}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#0B6B3A] hover:bg-[#14532D] text-white font-black text-xs rounded-xl transition min-h-[42px] whitespace-nowrap"
              >
                <MessageCircle className="w-4 h-4 text-[#F2B90D]" />
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
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 border border-[#E5E7EB] hover:border-[#0B6B3A] text-[#111111] font-bold text-xs rounded-xl transition min-h-[42px] whitespace-nowrap"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#0B6B3A]" />
                  <span>Visit Link</span>
                </a>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-[#E5E7EB] flex flex-wrap items-center justify-between gap-2 text-xs text-[#555555]">
            <span>
              Placement: <strong className="text-[#111111]">{ad.packageName || ad.packageId}</strong> ({formatNaira(ad.packagePrice)})
            </span>
            <button
              type="button"
              onClick={() => {
                onClose();
                onAdvertiseNow();
              }}
              className="font-black text-[#0B6B3A] hover:underline"
            >
              Advertise your business here
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
