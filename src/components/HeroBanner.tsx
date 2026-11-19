import React, { useState, useEffect } from 'react';
import {
  Search,
  ShoppingBag,
  Home,
  Utensils,
  Briefcase,
  PartyPopper,
  BookOpen,
  Megaphone,
  MessageSquare,
  Gift,
  ShieldCheck,
  GraduationCap,
  PlusCircle,
  ExternalLink
} from 'lucide-react';
import heroMarketplaceImg from '../assets/images/nigeria_campus_marketplace_hero_1794904561530.jpg';
import { AppView } from './BottomNav.js';
import { Advertisement, Institution } from '../types.js';
import { CeoVerifiedBadge } from './CeoVerifiedBadge.js';
import { trackAdEvent } from '../services/ads.js';

interface HeroBannerProps {
  searchQuery: string;
  onSearchSubmit: (query: string) => void;
  onStartShopping: () => void;
  onOpenSellModal: () => void;
  onNavigateView: (view: AppView) => void;
  activeInstitution?: Institution;
  activeCampus?: string;
  onOpenInstitutionSwitcher?: () => void;
  onExploreUniversitiesSection?: () => void;
  heroAds?: Advertisement[];
  onSelectAd?: (ad: Advertisement) => void;
  onOpenNationwideSearch?: () => void;
  onOpenEventsSection?: () => void;
  onOpenAdsSection?: () => void;
  onOpenEmergencySection?: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  searchQuery,
  onSearchSubmit,
  onStartShopping,
  onOpenSellModal,
  onNavigateView,
  activeInstitution,
  activeCampus,
  onOpenInstitutionSwitcher,
  onExploreUniversitiesSection,
  heroAds = [],
  onSelectAd,
  onOpenEventsSection,
  onOpenAdsSection,
  onOpenEmergencySection
}) => {
  const [heroInput, setHeroInput] = useState(searchQuery);

  useEffect(() => {
    setHeroInput(searchQuery);
  }, [searchQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchSubmit(heroInput);
    onStartShopping();
  };

  const instLabel = activeInstitution
    ? `${activeInstitution.name} · ${activeCampus || activeInstitution.campus}`
    : 'Nigerian Universities, Polytechnics & Colleges';

  // Exact 10 Quick Access Features in ONE straight horizontal row on desktop
  const quickAccessItems: Array<{
    id: string;
    label: string;
    icon: React.FC<{ className?: string }>;
    onClick: () => void;
  }> = [
    {
      id: 'qa-marketplace',
      label: 'Marketplace',
      icon: ShoppingBag,
      onClick: () => onNavigateView('marketplace')
    },
    {
      id: 'qa-hostels',
      label: 'Hostels',
      icon: Home,
      onClick: () => onNavigateView('hux')
    },
    {
      id: 'qa-jobs',
      label: 'Jobs',
      icon: Briefcase,
      onClick: () => onNavigateView('jobs')
    },
    {
      id: 'qa-events',
      label: 'Events',
      icon: PartyPopper,
      onClick: () => (onOpenEventsSection ? onOpenEventsSection() : onNavigateView('hub'))
    },
    {
      id: 'qa-books',
      label: 'Books',
      icon: BookOpen,
      onClick: () => onNavigateView('books')
    },
    {
      id: 'qa-food',
      label: 'Food',
      icon: Utensils,
      onClick: () => onNavigateView('food')
    },
    {
      id: 'qa-ads',
      label: 'Advertisements',
      icon: Megaphone,
      onClick: () => (onOpenAdsSection ? onOpenAdsSection() : onNavigateView('marketplace'))
    },
    {
      id: 'qa-community',
      label: 'Community',
      icon: MessageSquare,
      onClick: () => onNavigateView('hub')
    },
    {
      id: 'qa-giveaways',
      label: 'Giveaways',
      icon: Gift,
      onClick: () => onNavigateView('giveaways')
    },
    {
      id: 'qa-safety',
      label: 'Safety',
      icon: ShieldCheck,
      onClick: () => (onOpenEmergencySection ? onOpenEmergencySection() : onNavigateView('marketplace'))
    }
  ];

  return (
    <section
      aria-label="NIGERIA CAMPUS MARKET Hero"
      className="bg-[#F4F7F5] border-b border-[#D9E5DF]"
    >
      {/* Hero Banner Showcase */}
      <div className="relative overflow-hidden bg-[#075B3B] text-[#FFFFFF] border-b-4 border-[#F2C94C]">
        <img
          src={heroMarketplaceImg}
          alt="Nigerian university students in campus marketplace plaza"
          className="absolute inset-0 w-full h-full object-cover opacity-35"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(105deg, rgba(7, 91, 59, 0.95) 0%, rgba(11, 128, 80, 0.84) 55%, rgba(32, 43, 38, 0.92) 100%)'
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 py-8 sm:py-12 grid grid-cols-1 lg:grid-cols-12 gap-7 items-center">
          <div className="lg:col-span-7 text-center lg:text-left">
            <div className="inline-flex flex-wrap items-center justify-center lg:justify-start gap-2 px-3 py-1 bg-[#202B26]/80 border border-[#F2C94C]/55 rounded-lg text-[11px] font-black text-[#F2C94C] mb-3.5">
              <GraduationCap className="w-3.5 h-3.5 shrink-0" />
              <span>{instLabel}</span>
              {onOpenInstitutionSwitcher && (
                <button
                  type="button"
                  onClick={onOpenInstitutionSwitcher}
                  className="ml-1 px-2 py-0.5 rounded bg-[#F2C94C] text-[#202B26] text-[10px] font-black hover:opacity-90 transition whitespace-nowrap cursor-pointer"
                >
                  Change Campus
                </button>
              )}
            </div>

            <h1 className="font-display text-2xl sm:text-4xl lg:text-[2.75rem] font-black tracking-tight leading-[1.1] text-[#FFFFFF] mb-2.5 text-balance">
              EVERYTHING STUDENTS NEED,{' '}
              <span className="text-[#F2C94C]">IN ONE PLACE.</span>
            </h1>

            <p className="text-sm sm:text-base font-bold text-[#FFFFFF]/95 mb-5 max-w-xl mx-auto lg:mx-0">
              Buy, Sell, Discover and Connect Across Nigerian Campuses.
            </p>

            {/* Primary Search Input */}
            <form
              onSubmit={handleSubmit}
              className="flex flex-col sm:flex-row gap-2 max-w-xl mx-auto lg:mx-0 mb-5"
            >
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#075B3B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={heroInput}
                  onChange={(e) => setHeroInput(e.target.value)}
                  placeholder="Search products, hostels, jobs and events..."
                  className="w-full pl-10 pr-4 py-3 bg-[#FFFFFF] text-[#202B26] placeholder-[#202B26]/55 rounded-xl text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-[#F2C94C] shadow-md"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-3 bg-[#0B8050] hover:bg-[#075B3B] border border-[#F2C94C]/70 text-[#FFFFFF] font-black text-xs sm:text-sm rounded-xl shadow-md active:scale-95 transition whitespace-nowrap shrink-0 cursor-pointer"
              >
                Search
              </button>
            </form>

            {/* Primary Hero CTAs */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 text-xs mb-3.5">
              <button
                type="button"
                onClick={() => {
                  if (onExploreUniversitiesSection) {
                    onExploreUniversitiesSection();
                  } else if (onOpenInstitutionSwitcher) {
                    onOpenInstitutionSwitcher();
                  } else {
                    onStartShopping();
                  }
                }}
                className="px-5 py-2.5 bg-[#F2C94C] hover:opacity-95 text-[#202B26] font-black rounded-xl shadow-sm transition inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <GraduationCap className="w-4 h-4" />
                <span>Explore All Nigerian Universities</span>
              </button>

              <button
                type="button"
                onClick={onOpenSellModal}
                className="px-4 py-2.5 bg-[#FFFFFF] hover:bg-[#F4F7F5] text-[#075B3B] font-black rounded-xl shadow-sm transition inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-[#0B8050]" />
                <span>Start Selling Free</span>
              </button>
            </div>

            <p className="text-xs font-extrabold tracking-wider uppercase text-[#F2C94C]">
              Shop More. Save More. Sell to Everyone.
            </p>
          </div>

          {/* Right Wide Campus Photography Frame */}
          <div className="hidden lg:block lg:col-span-5">
            <div className="rounded-2xl overflow-hidden border-2 border-[#F2C94C]/75 shadow-2xl bg-[#202B26]">
              <div className="aspect-[16/9] w-full overflow-hidden">
                <img
                  src={heroMarketplaceImg}
                  alt="Students shopping and connecting across Nigerian university campuses"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="px-4 py-3 flex items-center justify-between gap-3 bg-[#202B26]">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#F2C94C]">
                    NIGERIA CAMPUS MARKET
                  </p>
                  <p className="text-xs font-bold text-[#FFFFFF] truncate mt-0.5">
                    36 States &amp; FCT Campus Commerce &amp; Student Ecosystem
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateView('marketplace')}
                  className="px-3.5 py-1.5 rounded-lg bg-[#075B3B] hover:bg-[#0B8050] text-[#FFFFFF] text-[11px] font-black whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Open Market
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* CEO Hero Ads Spotlight Strip (Genuine Active Ads Only) */}
        {heroAds.length > 0 && (
          <div className="relative z-10 bg-[#075B3B]/90 border-t border-white/15">
            <div className="max-w-7xl mx-auto px-4 py-2.5">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-[#F2C94C] mb-2">
                <Megaphone className="w-3.5 h-3.5" />
                <span>Official Campus Spotlight</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {heroAds.slice(0, 3).map((ad) => (
                  <div
                    key={ad.id}
                    onClick={() => {
                      trackAdEvent(ad.id, 'click');
                      onSelectAd?.(ad);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        trackAdEvent(ad.id, 'click');
                        onSelectAd?.(ad);
                      }
                    }}
                    className="bg-[#FFFFFF] text-[#202B26] rounded-xl p-2 flex items-center gap-3 border border-[#F2C94C]/60 hover:border-[#F2C94C] shadow-sm transition cursor-pointer group"
                  >
                    <img
                      src={ad.imageUrl}
                      alt={ad.title}
                      className="w-14 h-14 rounded-lg object-cover border border-[#D9E5DF] shrink-0 bg-[#F4F7F5]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-black text-[#075B3B] truncate">
                          {ad.businessName}
                        </span>
                        <CeoVerifiedBadge
                          verified={Boolean(ad.ceoVerified || ad.isVerified)}
                          variant="compact"
                        />
                      </div>
                      <p className="text-xs font-extrabold text-[#202B26] line-clamp-1 group-hover:text-[#075B3B]">
                        {ad.title}
                      </p>
                      <p className="text-[11px] text-[#202B26]/70 line-clamp-1">
                        {ad.location}
                      </p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-[#075B3B] shrink-0 mr-1" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Access Strip */}
      <div className="bg-[#FFFFFF] border-b border-[#D9E5DF]">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5">
          <nav
            aria-label="Campus Quick Access Menu"
            className="flex lg:grid lg:grid-cols-10 items-center gap-2 overflow-x-auto scrollbar-none pb-0.5 lg:pb-0"
          >
            {quickAccessItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.onClick}
                  className="inline-flex lg:flex-col items-center justify-center gap-1.5 lg:gap-1 px-3 lg:px-1.5 py-2 rounded-xl bg-[#F4F7F5] hover:bg-[#075B3B] text-[#202B26] hover:text-[#FFFFFF] border border-[#D9E5DF] hover:border-[#075B3B] text-xs lg:text-[11px] font-bold whitespace-nowrap shrink-0 transition cursor-pointer group"
                >
                  <Icon className="w-4 h-4 text-[#075B3B] group-hover:text-[#F2C94C] shrink-0 transition" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </section>
  );
};
