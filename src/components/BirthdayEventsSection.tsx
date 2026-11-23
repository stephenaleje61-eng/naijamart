import React, { useState } from 'react';
import {
  Calendar,
  MapPin,
  Sparkles,
  ArrowRight,
  MessageCircle,
  Settings,
  Clock,
  PartyPopper
} from 'lucide-react';
import { CampusEvent } from '../types.js';
import { useAuth } from '../context/AuthContext.js';
import {
  CEO_DISPLAY_PHONE,
  categorizePublicEvents,
  formatEventDate,
  getCeoWhatsAppUrl,
  getEventCountdownBadge,
  isAuthorizedCeo
} from '../services/events.js';
import { EventPosterImage } from './EventPosterImage.js';

interface BirthdayEventsSectionProps {
  events: CampusEvent[];
  loading: boolean;
  onSelectEvent: (event: CampusEvent) => void;
  onOpenCeoManager?: () => void;
}

export const BirthdayEventsSection: React.FC<BirthdayEventsSectionProps> = ({
  events,
  loading,
  onSelectEvent,
  onOpenCeoManager
}) => {
  const { user } = useAuth();
  const isCeo = isAuthorizedCeo(user);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  const { upcoming, past } = categorizePublicEvents(events);
  const displayedEvents = activeTab === 'upcoming' ? upcoming : past;
  const whatsappFeatureUrl = getCeoWhatsAppUrl();

  return (
    <section
      id="birthday-events-centre"
      className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-2xl overflow-hidden shadow-xs"
    >
      {/* Clean Orange & Charcoal Header */}
      <div className="bg-[#FFFFFF] text-[#222222] px-5 py-5 sm:px-7 sm:py-6 border-b border-[#EEEEEE]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FFF4E8] text-[#FF6A00] text-[10px] font-black uppercase tracking-wider">
                <PartyPopper className="w-3.5 h-3.5" />
                Campus Celebrations
              </span>
              <span className="text-[11px] font-bold text-[#666666]">
                Official NIGERIA CAMPUS MARKET Announcements
              </span>
            </div>
            <h2 className="font-display text-xl sm:text-2xl lg:text-3xl font-black text-[#222222] tracking-tight">
              BIRTHDAY &amp; CAMPUS EVENTS CENTRE
            </h2>
            <p className="text-xs sm:text-sm font-medium text-[#666666]">
              Celebrate Your Special Moments With NIGERIA CAMPUS MARKET.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {isCeo && onOpenCeoManager && (
              <button
                type="button"
                onClick={onOpenCeoManager}
                className="px-4 py-2.5 rounded-xl bg-[#222222] hover:bg-[#303030] text-[#FFFFFF] text-xs font-black flex items-center gap-1.5 shadow-xs transition min-h-[44px]"
              >
                <Settings className="w-4 h-4 text-[#F68B1F]" />
                <span>CEO: Publish &amp; Manage Events</span>
              </button>
            )}

            <a
              href={whatsappFeatureUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-[#FF6A00] hover:bg-[#F68B1F] text-[#FFFFFF] text-xs font-black flex items-center gap-1.5 shadow-xs transition min-h-[44px]"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Feature Your Birthday / Event</span>
            </a>
          </div>
        </div>

        {/* Upcoming vs Past Events Tabs */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('upcoming')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 min-h-[40px] ${
              activeTab === 'upcoming'
                ? 'bg-[#FF6A00] text-[#FFFFFF] shadow-xs'
                : 'bg-[#F7F7F7] text-[#303030] hover:bg-[#EEEEEE]'
            }`}
          >
            <span>Upcoming Birthdays &amp; Events</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                activeTab === 'upcoming' ? 'bg-[#FFFFFF]/20 text-[#FFFFFF]' : 'bg-[#FFFFFF] text-[#222222]'
              }`}
            >
              {upcoming.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('past')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 min-h-[40px] ${
              activeTab === 'past'
                ? 'bg-[#FF6A00] text-[#FFFFFF] shadow-xs'
                : 'bg-[#F7F7F7] text-[#303030] hover:bg-[#EEEEEE]'
            }`}
          >
            <span>Past Events</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                activeTab === 'past' ? 'bg-[#FFFFFF]/20 text-[#FFFFFF]' : 'bg-[#FFFFFF] text-[#222222]'
              }`}
            >
              {past.length}
            </span>
          </button>
        </div>
      </div>

      {/* Events Content Grid */}
      <div className="p-5 sm:p-7 bg-[#FFFFFF] space-y-5">
        {loading && events.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <div className="w-9 h-9 border-4 border-[#EEEEEE] border-t-[#FF6A00] rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-[#666666]">
              Loading NIGERIA CAMPUS MARKET celebrations &amp; events...
            </p>
          </div>
        ) : displayedEvents.length === 0 ? (
          <div className="rounded-2xl bg-[#F7F7F7] border border-[#EEEEEE] p-6 sm:p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FF6A00] text-[#FFFFFF] flex items-center justify-center mx-auto shadow-xs">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-lg mx-auto">
              <h3 className="font-display text-base sm:text-lg font-black text-[#222222]">
                {activeTab === 'upcoming'
                  ? 'No Upcoming Birthdays or Events Published Yet'
                  : 'No Past Events Archived Yet'}
              </h3>
              <p className="text-xs sm:text-sm text-[#666666]">
                {activeTab === 'upcoming' && past.length > 0
                  ? 'All recent celebrations have concluded — check Past Events or book your upcoming birthday announcement with the NIGERIA CAMPUS MARKET CEO.'
                  : `Want your birthday, graduation, party, or campus event featured on NIGERIA CAMPUS MARKET? Contact CEO: ${CEO_DISPLAY_PHONE}.`}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <a
                href={whatsappFeatureUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-xl bg-[#FF6A00] hover:bg-[#F68B1F] text-[#FFFFFF] text-xs font-black flex items-center gap-2 transition min-h-[44px]"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp CEO ({CEO_DISPLAY_PHONE})</span>
              </a>
              {activeTab === 'upcoming' && past.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('past')}
                  className="px-4 py-2.5 rounded-xl bg-[#222222] hover:bg-[#303030] text-[#FFFFFF] text-xs font-black transition min-h-[44px]"
                >
                  View Past Events ({past.length})
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {displayedEvents.map((event) => {
              const countdown = getEventCountdownBadge(event.eventDate);
              const dateLabel = formatEventDate(event.eventDate);

              return (
                <article
                  key={event.id}
                  onClick={() => onSelectEvent(event)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectEvent(event);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className="group bg-[#FFFFFF] border border-[#EEEEEE] hover:border-[#F68B1F] rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col text-left focus:outline-none focus:ring-2 focus:ring-[#F68B1F]"
                >
                  {/* Celebrant Photo / Event Poster */}
                  <div className="relative aspect-[4/3] bg-[#222222] overflow-hidden">
                    <EventPosterImage
                      src={event.photoUrl}
                      alt={`${event.celebrantName} — ${event.eventType}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-[#FF6A00] text-[#FFFFFF] text-[10px] font-black uppercase tracking-wider shadow">
                        {event.eventType}
                      </span>
                      {countdown && (
                        <span className="px-2.5 py-1 rounded-lg bg-[#222222]/90 text-[#F68B1F] text-[10px] font-extrabold">
                          {countdown}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Details */}
                  <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                    <div className="space-y-1.5">
                      <h3 className="font-display text-base sm:text-lg font-black text-[#222222] group-hover:text-[#FF6A00] transition-colors line-clamp-2 leading-snug">
                        {event.celebrantName}
                      </h3>
                      <div className="space-y-1 text-xs text-[#666666]">
                        <p className="flex items-center gap-1.5 font-bold text-[#222222]">
                          <Calendar className="w-3.5 h-3.5 text-[#F68B1F] shrink-0" />
                          <span>{dateLabel}</span>
                        </p>
                        {event.eventTime && (
                          <p className="flex items-center gap-1.5 font-medium">
                            <Clock className="w-3.5 h-3.5 text-[#F68B1F] shrink-0" />
                            <span className="truncate">{event.eventTime}</span>
                          </p>
                        )}
                        <p className="flex items-center gap-1.5 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-[#F68B1F] shrink-0" />
                          <span className="truncate">{event.venue}</span>
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#EEEEEE] flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#666666]">
                        Tap to view full details
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-black text-[#FF6A00] group-hover:translate-x-0.5 transition-transform">
                        <span>Celebrate</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Quiet Footer Promotion Strip inside Section */}
        <div className="pt-2 border-t border-[#EEEEEE] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#666666]">
          <span className="font-semibold">
            Have an upcoming birthday, graduation, or campus ceremony?
          </span>
          <a
            href={whatsappFeatureUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-black text-[#FF6A00] hover:text-[#F68B1F] inline-flex items-center gap-1.5"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Contact NIGERIA CAMPUS MARKET CEO ({CEO_DISPLAY_PHONE})</span>
          </a>
        </div>
      </div>
    </section>
  );
};
