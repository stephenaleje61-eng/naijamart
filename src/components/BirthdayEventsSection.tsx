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
      className="bg-white border-2 border-[#EA580C]/25 rounded-3xl overflow-hidden shadow-sm"
    >
      {/* Celebratory Dark + Orange Section Header */}
      <div className="bg-[#111111] text-white px-5 py-5 sm:px-7 sm:py-6 border-b-4 border-[#EA580C]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#EA580C] text-white text-[10px] font-black uppercase tracking-wider">
                <PartyPopper className="w-3.5 h-3.5" />
                Campus Celebrations
              </span>
              <span className="text-[11px] font-bold text-[#FDBA74]">
                Official FU MARKET Announcements
              </span>
            </div>
            <h2 className="font-display text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
              FU MARKET BIRTHDAY &amp; EVENTS CENTRE
            </h2>
            <p className="text-xs sm:text-sm font-medium text-white/85">
              Celebrate Your Special Moments With FU MARKET.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Strict CEO-only publish button — completely invisible to regular visitors, buyers & sellers */}
            {isCeo && onOpenCeoManager && (
              <button
                type="button"
                onClick={onOpenCeoManager}
                className="px-4 py-2.5 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-black flex items-center gap-1.5 shadow-md transition min-h-[44px]"
              >
                <Settings className="w-4 h-4" />
                <span>CEO: Publish &amp; Manage Events</span>
              </button>
            )}

            <a
              href={whatsappFeatureUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#FFF7ED] text-[#111111] text-xs font-black flex items-center gap-1.5 shadow-md transition min-h-[44px]"
            >
              <MessageCircle className="w-4 h-4 text-[#EA580C]" />
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
                ? 'bg-[#EA580C] text-white shadow'
                : 'bg-white/10 text-white/85 hover:bg-white/20'
            }`}
          >
            <span>Upcoming Birthdays &amp; Events</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                activeTab === 'upcoming' ? 'bg-[#111111] text-white' : 'bg-white/15 text-white'
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
                ? 'bg-[#EA580C] text-white shadow'
                : 'bg-white/10 text-white/85 hover:bg-white/20'
            }`}
          >
            <span>Past Events</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                activeTab === 'past' ? 'bg-[#111111] text-white' : 'bg-white/15 text-white'
              }`}
            >
              {past.length}
            </span>
          </button>
        </div>
      </div>

      {/* Events Content Grid */}
      <div className="p-5 sm:p-7 bg-white space-y-5">
        {loading && events.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <div className="w-9 h-9 border-4 border-[#111111] border-t-[#EA580C] rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-[#555555]">
              Loading FU MARKET celebrations &amp; events...
            </p>
          </div>
        ) : displayedEvents.length === 0 ? (
          <div className="rounded-2xl bg-[#FFF7ED] border border-[#FED7AA] p-6 sm:p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#EA580C] text-white flex items-center justify-center mx-auto shadow">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-lg mx-auto">
              <h3 className="font-display text-base sm:text-lg font-black text-[#111111]">
                {activeTab === 'upcoming'
                  ? 'No Upcoming Birthdays or Events Published Yet'
                  : 'No Past Events Archived Yet'}
              </h3>
              <p className="text-xs sm:text-sm text-[#4B5563]">
                {activeTab === 'upcoming' && past.length > 0
                  ? 'All recent celebrations have concluded — check Past Events or book your upcoming birthday announcement with the FU MARKET CEO.'
                  : `Want your birthday, graduation, party, or campus event featured on FU MARKET? Contact FU MARKET CEO: ${CEO_DISPLAY_PHONE}.`}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <a
                href={whatsappFeatureUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-black flex items-center gap-2 transition min-h-[44px]"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp CEO ({CEO_DISPLAY_PHONE})</span>
              </a>
              {activeTab === 'upcoming' && past.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('past')}
                  className="px-4 py-2.5 rounded-xl bg-[#111111] hover:bg-black text-white text-xs font-black transition min-h-[44px]"
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
                  className="group bg-white border border-[#E5E7EB] hover:border-[#EA580C] rounded-2xl overflow-hidden shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col text-left focus:outline-none focus:ring-2 focus:ring-[#EA580C]"
                >
                  {/* Celebrant Photo / Event Poster */}
                  <div className="relative aspect-[4/3] bg-[#111111] overflow-hidden">
                    <EventPosterImage
                      src={event.photoUrl}
                      alt={`${event.celebrantName} — ${event.eventType}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-[#EA580C] text-white text-[10px] font-black uppercase tracking-wider shadow">
                        {event.eventType}
                      </span>
                      {countdown && (
                        <span className="px-2.5 py-1 rounded-lg bg-[#111111]/90 text-white text-[10px] font-extrabold border border-white/15">
                          {countdown}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Details */}
                  <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                    <div className="space-y-1.5">
                      <h3 className="font-display text-base sm:text-lg font-black text-[#111111] group-hover:text-[#EA580C] transition-colors line-clamp-2 leading-snug">
                        {event.celebrantName}
                      </h3>
                      <div className="space-y-1 text-xs text-[#4B5563]">
                        <p className="flex items-center gap-1.5 font-bold text-[#111111]">
                          <Calendar className="w-3.5 h-3.5 text-[#EA580C] shrink-0" />
                          <span>{dateLabel}</span>
                        </p>
                        {event.eventTime && (
                          <p className="flex items-center gap-1.5 font-medium">
                            <Clock className="w-3.5 h-3.5 text-[#EA580C] shrink-0" />
                            <span className="truncate">{event.eventTime}</span>
                          </p>
                        )}
                        <p className="flex items-center gap-1.5 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-[#EA580C] shrink-0" />
                          <span className="truncate">{event.venue}</span>
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#F3F4F6] flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#6B7280]">
                        Tap to view full details
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-black text-[#EA580C] group-hover:translate-x-0.5 transition-transform">
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
        <div className="pt-2 border-t border-[#F3F4F6] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#4B5563]">
          <span className="font-semibold">
            Have an upcoming birthday, graduation, or campus ceremony?
          </span>
          <a
            href={whatsappFeatureUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-black text-[#EA580C] hover:text-[#C2410C] inline-flex items-center gap-1.5"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Contact FU MARKET CEO ({CEO_DISPLAY_PHONE})</span>
          </a>
        </div>
      </div>
    </section>
  );
};
