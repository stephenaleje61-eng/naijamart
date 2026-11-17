import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  MessageCircle,
  Copy,
  Check,
  Share2,
  Info,
  PartyPopper
} from 'lucide-react';
import { CampusEvent } from '../types.js';
import {
  CEO_DISPLAY_PHONE,
  formatEventDate,
  getCeoWhatsAppUrl,
  getEventCountdownBadge,
  isEventPast
} from '../services/events.js';
import { EventPosterImage } from './EventPosterImage.js';

interface EventDetailModalProps {
  event: CampusEvent;
  onClose: () => void;
  isPreview?: boolean;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event,
  onClose,
  isPreview = false
}) => {
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const past = isEventPast(event);
  const countdown = getEventCountdownBadge(event.eventDate);
  const formattedDate = formatEventDate(event.eventDate);
  const whatsappUrl = getCeoWhatsAppUrl();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleCopyPhone = async () => {
    try {
      await navigator.clipboard.writeText(CEO_DISPLAY_PHONE);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2500);
    } catch {
      // Fallback ignored if clipboard blocked
    }
  };

  const handleShareEvent = async () => {
    const url = `${window.location.origin}/?event=${encodeURIComponent(event.id)}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${event.celebrantName} — ${event.eventType} | FU MARKET`,
          text: `${event.celebrantName}'s ${event.eventType} on ${formattedDate} at ${event.venue}. Celebrate on FU MARKET!`,
          url
        });
        return;
      } catch {
        // Fall through to copy link
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-detail-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden my-2 sm:my-4 border border-[#E5E7EB]">
        {/* Top FU MARKET Emerald + Gold Branding Header */}
        <div className="bg-[#087443] text-white px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 border-b-4 border-[#D4A62A]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white p-0.5 flex items-center justify-center shrink-0 border border-[#D4A62A]">
              <img
                src="/fuwukari-crest.png"
                alt="FU MARKET Crest"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-xs sm:text-sm text-[#D4A62A] tracking-wide uppercase truncate">
                  FU MARKET BIRTHDAY &amp; EVENTS CENTRE
                </span>
                {isPreview && (
                  <span className="px-2 py-0.5 rounded bg-[#D4A62A] text-[#10251D] text-[10px] font-black uppercase">
                    Preview
                  </span>
                )}
              </div>
              <p className="text-[11px] text-white/80 truncate">
                Celebrate Your Special Moments With FU MARKET.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isPreview && (
              <button
                type="button"
                onClick={handleShareEvent}
                className="px-3 py-2 rounded-xl bg-[#065D36] hover:bg-[#10251D] text-white text-xs font-bold flex items-center gap-1.5 transition min-h-[40px]"
                title="Share Announcement"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#D4A62A]" />
                    <span className="hidden sm:inline">Copied Link</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5 text-[#D4A62A]" />
                    <span className="hidden sm:inline">Share</span>
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close event details"
              className="w-10 h-10 rounded-xl bg-[#D4A62A] hover:bg-[#E0B43B] text-[#10251D] flex items-center justify-center transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Large Celebrant Photograph / Event Poster */}
        <div className="relative bg-[#10251D] w-full aspect-[4/3] sm:aspect-[16/10] max-h-[460px] overflow-hidden">
          <EventPosterImage
            src={event.photoUrl}
            alt={`${event.celebrantName} — ${event.eventType}`}
            className="w-full h-full object-contain bg-[#10251D]"
          />
          <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#087443] text-white text-xs font-black shadow-lg uppercase tracking-wide">
              <PartyPopper className="w-3.5 h-3.5 text-[#D4A62A]" />
              {event.eventType}
            </span>
            {countdown && (
              <span
                className={`px-3 py-1 rounded-lg text-xs font-black shadow-lg ${
                  past
                    ? 'bg-[#10251D]/90 text-white/90 border border-white/20'
                    : 'bg-[#D4A62A] text-[#10251D]'
                }`}
              >
                {countdown}
              </span>
            )}
          </div>
        </div>

        {/* Event Details Body */}
        <div className="p-5 sm:p-7 space-y-6 bg-white">
          <div className="space-y-3">
            <h1
              id="event-detail-title"
              className="font-display text-2xl sm:text-3xl font-black text-[#10251D] tracking-tight leading-tight"
            >
              {event.celebrantName}
            </h1>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-[#F4F8F5] border border-[#087443]/25">
                <Calendar className="w-4 h-4 text-[#087443] shrink-0 mt-0.5" />
                <div>
                  <span className="block text-[10px] font-black uppercase tracking-wider text-[#087443]">
                    Event Date
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold text-[#10251D]">
                    {formattedDate}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-[#F4F8F5] border border-[#E2E8F0]">
                <Clock className="w-4 h-4 text-[#087443] shrink-0 mt-0.5" />
                <div>
                  <span className="block text-[10px] font-black uppercase tracking-wider text-[#475569]">
                    Event Time
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold text-[#10251D]">
                    {event.eventTime?.trim() || 'Open / All Day'}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-[#F4F8F5] border border-[#E2E8F0]">
                <MapPin className="w-4 h-4 text-[#087443] shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-[#475569]">
                    Venue
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold text-[#10251D] break-words">
                    {event.venue}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <h2 className="text-xs font-black uppercase tracking-wider text-[#087443] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#D4A62A]" />
              <span>Celebration &amp; Announcement Details</span>
            </h2>
            <p className="text-sm sm:text-base text-[#10251D] leading-relaxed whitespace-pre-line">
              {event.description}
            </p>
          </div>

          {/* Optional Additional Info */}
          {event.additionalInfo?.trim() && (
            <div className="p-4 rounded-2xl bg-[#F4F8F5] border border-[#D4A62A]/45 space-y-1.5">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#087443] flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                <span>Additional Information</span>
              </h3>
              <p className="text-xs sm:text-sm text-[#10251D] leading-relaxed whitespace-pre-line">
                {event.additionalInfo}
              </p>
            </div>
          )}

          {/* CEO Feature Call-To-Action Block */}
          <div className="bg-[#087443] text-white rounded-3xl p-5 sm:p-6 border-2 border-[#D4A62A] shadow-lg space-y-4">
            <div className="space-y-1.5">
              <span className="inline-block px-2.5 py-0.5 rounded bg-[#D4A62A] text-[#10251D] text-[10px] font-black uppercase tracking-wider">
                Official FU MARKET Promotion
              </span>
              <h3 className="font-display text-base sm:text-xl font-black text-white leading-snug">
                WANT YOUR BIRTHDAY OR EVENT FEATURED ON FU MARKET?
              </h3>
              <p className="text-xs sm:text-sm font-extrabold text-[#D4A62A] tracking-wide uppercase">
                CONTACT THE FU MARKET CEO
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#065D36] border border-white/15 rounded-2xl p-3.5">
              <div>
                <span className="text-[11px] text-white/80 block font-semibold">
                  Direct WhatsApp / Call Line
                </span>
                <span className="text-base sm:text-lg font-black text-white tracking-wide">
                  FU MARKET CEO: {CEO_DISPLAY_PHONE}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyPhone}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#F4F8F5] text-[#10251D] text-xs font-black flex items-center justify-center gap-1.5 transition min-h-[44px] shrink-0"
              >
                {copiedPhone ? (
                  <>
                    <Check className="w-4 h-4 text-[#087443]" />
                    <span>Number Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-[#087443]" />
                    <span>Copy Number</span>
                  </>
                )}
              </button>
            </div>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 px-5 rounded-2xl bg-[#D4A62A] hover:bg-[#E0B43B] text-[#10251D] font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg transition min-h-[48px]"
            >
              <MessageCircle className="w-5 h-5 shrink-0" />
              <span>Chat FU MARKET CEO on WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
