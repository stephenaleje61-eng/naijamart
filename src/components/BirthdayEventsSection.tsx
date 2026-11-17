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
      className="bg-white border-2 border-[#087443]/20 rounded-3xl overflow-hidden shadow-sm"
    >
      {/* Celebratory Royal Navy + Emerald + Gold Section Header */}
      <div className="bg-gradient-to-r from-[#10251D] to-[#087443] text-white px-5 py-5 sm:px-7 sm:py-6 border-b-4 border-[#D4A62A]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#D4A62A] text-[#10251D] text-[10px] font-black uppercase tracking-wider">
                <PartyPopper className="w-3.5 h-3.5" />
                Campus Celebrations
              </span>
              <span className="text-[11px] font-bold text-[#F4F8F5]/90">
                Official NIGERIA CAMPUS MARKET Announcements
              </span>
            </div>
            <h2 className="font-display text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
              BIRTHDAY &amp; CAMPUS EVENTS CENTRE
            </h2>
            <p className="text-xs sm:text-sm font-medium text-white/85">
              Celebrate Your Special Moments With NIGERIA CAMPUS MARKET.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Strict CEO-only publish button — completely invisible to regular visitors, buyers & sellers */}
            {isCeo && onOpenCeoManager && (
              <button
                type="button"
                onClick={onOpenCeoManager}
                className="px-4 py-2.5 rounded-xl bg-[#D4A62A] hover:bg-[#E0B43B] text-[#10251D] text-xs font-black flex items-center gap-1.5 shadow-md transition min-h-[44px]"
              >
                <Settings className="w-4 h-4" />
                <span>CEO: Publish &amp; Manage Events</span>
              </button>
            )}

            <a
              href={whatsappFeatureUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#F4F8F5] text-[#10251D] text-xs font-black flex items-center gap-1.5 shadow-md transition min-h-[44px]"
            >
              <MessageCircle className="w-4 h-4 text-[#087443]" />
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
                ? 'bg-[#D4A62A] text-[#10251D] shadow'
                : 'bg-[#065D36]/80 text-white hover:bg-[#10251D]'
            }`}
          >
            <span>Upcoming Birthdays &amp; Events</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                activeTab === 'upcoming' ? 'bg-[#10251D] text-white' : 'bg-white/15 text-white'
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
                ? 'bg-[#D4A62A] text-[#10251D] shadow'
                : 'bg-[#065D36]/80 text-white hover:bg-[#10251D]'
            }`}
          >
            <span>Past Events</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                activeTab === 'past' ? 'bg-[#10251D] text-white' : 'bg-white/15 text-white'
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
            <div className="w-9 h-9 border-4 border-[#10251D] border-t-[#087443] rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-[#555555]">
              Loading NIGERIA CAMPUS MARKET celebrations &amp; events...
            </p>
          </div>
        ) : displayedEvents.length === 0 ? (
          <div className="rounded-2xl bg-[#F4F8F5] border border-[#D4A62A]/40 p-6 sm:p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#087443] text-[#D4A62A] flex items-center justify-center mx-auto shadow">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-lg mx-auto">
              <h3 className="font-display text-base sm:text-lg font-black text-[#10251D]">
                {activeTab === 'upcoming'
                  ? 'No Upcoming Birthdays or Events Published Yet'
                  : 'No Past Events Archived Yet'}
              </h3>
              <p className="text-xs sm:text-sm text-[#4B5563]">
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
                className="px-5 py-2.5 rounded-xl bg-[#087443] hover:bg-[#065D36] text-white text-xs font-black flex items-center gap-2 transition min-h-[44px]"
              >
                <MessageCircle className="w-4 h-4 text-[#D4A62A]" />
                <span>WhatsApp CEO ({CEO_DISPLAY_PHONE})</span>
              </a>
              {activeTab === 'upcoming' && past.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('past')}
                  className="px-4 py-2.5 rounded-xl bg-[#10251D] hover:bg-[#065D36] text-white text-xs font-black transition min-h-[44px]"
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
                  className="group bg-white border border-[#E5E7EB] hover:border-[#087443] rounded-2xl overflow-hidden shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col text-left focus:outline-none focus:ring-2 focus:ring-[#087443]"
                >
                  {/* Celebrant Photo / Event Poster */}
                  <div className="relative aspect-[4/3] bg-[#10251D] overflow-hidden">
                    <EventPosterImage
                      src={event.photoUrl}
                      alt={`${event.celebrantName} — ${event.eventType}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-[#087443] text-white text-[10px] font-black uppercase tracking-wider shadow">
                        {event.eventType}
                      </span>
                      {countdown && (
                        <span className="px-2.5 py-1 rounded-lg bg-[#10251D]/90 text-[#D4A62A] text-[10px] font-extrabold border border-[#D4A62A]/30">
                          {countdown}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Details */}
                  <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                    <div className="space-y-1.5">
                      <h3 className="font-display text-base sm:text-lg font-black text-[#10251D] group-hover:text-[#087443] transition-colors line-clamp-2 leading-snug">
                        {event.celebrantName}
                      </h3>
                      <div className="space-y-1 text-xs text-[#4B5563]">
                        <p className="flex items-center gap-1.5 font-bold text-[#10251D]">
                          <Calendar className="w-3.5 h-3.5 text-[#087443] shrink-0" />
                          <span>{dateLabel}</span>
                        </p>
                        {event.eventTime && (
                          <p className="flex items-center gap-1.5 font-medium">
                            <Clock className="w-3.5 h-3.5 text-[#087443] shrink-0" />
                            <span className="truncate">{event.eventTime}</span>
                          </p>
                        )}
                        <p className="flex items-center gap-1.5 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-[#087443] shrink-0" />
                          <span className="truncate">{event.venue}</span>
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#F4F8F5] flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#6B7280]">
                        Tap to view full details
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-black text-[#087443] group-hover:translate-x-0.5 transition-transform">
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
        <div className="pt-2 border-t border-[#F4F8F5] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#4B5563]">
          <span className="font-semibold">
            Have an upcoming birthday, graduation, or campus ceremony?
          </span>
          <a
            href={whatsappFeatureUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-black text-[#087443] hover:text-[#065D36] inline-flex items-center gap-1.5"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Contact NIGERIA CAMPUS MARKET CEO ({CEO_DISPLAY_PHONE})</span>
          </a>
        </div>
      </div>
    </section>
  );
};
