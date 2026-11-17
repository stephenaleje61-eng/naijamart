import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Flame,
  Globe2,
  MapPin,
  ShoppingBag,
  Sparkles,
  Trophy,
  Wrench
} from 'lucide-react';
import {
  AccommodationProperty,
  Advertisement,
  GeneralAnnouncementPost,
  Institution,
  Product,
  ServiceListing,
  SportUpdatePost
} from '../types.js';
import {
  computeTrendingAcrossCampuses,
  TrendingCampusItem,
  TrendingScope
} from '../services/trending.js';

interface TrendingCampusesSectionProps {
  activeInstitution: Institution;
  institutions: Institution[];
  products: Product[];
  services: ServiceListing[];
  advertisements: Advertisement[];
  sports: SportUpdatePost[];
  announcements: GeneralAnnouncementPost[];
  accommodations?: AccommodationProperty[];
  onSelectItem: (item: TrendingCampusItem) => void;
  onOpenNationwideSearch: () => void;
}

export const TrendingCampusesSection: React.FC<TrendingCampusesSectionProps> = ({
  activeInstitution,
  institutions,
  products,
  services,
  advertisements,
  sports,
  announcements,
  accommodations,
  onSelectItem,
  onOpenNationwideSearch
}) => {
  const [scope, setScope] = useState<TrendingScope>('nationwide');

  const trendingItems = useMemo(
    () =>
      computeTrendingAcrossCampuses({
        scope,
        activeInstitutionId: activeInstitution.id,
        activeState: activeInstitution.state,
        institutions,
        products,
        services,
        advertisements,
        sports,
        announcements,
        accommodations,
        maxItems: 8
      }),
    [
      scope,
      activeInstitution.id,
      activeInstitution.state,
      institutions,
      products,
      services,
      advertisements,
      sports,
      announcements,
      accommodations
    ]
  );

  const renderBadgeIcon = (type: TrendingCampusItem['entityType']) => {
    switch (type) {
      case 'product':
        return <ShoppingBag className="w-3.5 h-3.5 text-[#087443]" />;
      case 'service':
        return <Wrench className="w-3.5 h-3.5 text-[#087443]" />;
      case 'sport':
        return <Trophy className="w-3.5 h-3.5 text-[#D4A62A]" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-[#10251D]" />;
    }
  };

  return (
    <section
      aria-label="Trending Across Nigerian Campuses"
      className="bg-white border-b border-[#D9E5DF] py-6 sm:py-8"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#087443] uppercase tracking-wider">
              <Flame className="w-4 h-4 text-[#D4A62A]" />
              <span>Real Campus Activity</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#10251D] tracking-tight mt-1">
              TRENDING ACROSS NIGERIAN CAMPUSES
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Ranked dynamically from genuine student views, likes, saved listings, and inquiries.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center p-1 bg-[#F4F8F5] rounded-lg border border-[#D9E5DF]">
              <button
                type="button"
                onClick={() => setScope('nationwide')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition whitespace-nowrap shrink-0 ${
                  scope === 'nationwide'
                    ? 'bg-[#10251D] text-white'
                    : 'text-[#10251D] hover:bg-white'
                }`}
              >
                Nationwide
              </button>
              <button
                type="button"
                onClick={() => setScope('state')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition whitespace-nowrap shrink-0 ${
                  scope === 'state'
                    ? 'bg-[#10251D] text-white'
                    : 'text-[#10251D] hover:bg-white'
                }`}
              >
                {activeInstitution.state} State
              </button>
              <button
                type="button"
                onClick={() => setScope('institution')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition whitespace-nowrap shrink-0 ${
                  scope === 'institution'
                    ? 'bg-[#087443] text-white'
                    : 'text-[#10251D] hover:bg-white'
                }`}
              >
                {activeInstitution.shortName}
              </button>
            </div>

            <button
              type="button"
              onClick={onOpenNationwideSearch}
              className="px-3.5 py-2 rounded-lg border border-[#D9E5DF] hover:border-[#087443] text-xs font-bold text-[#10251D] flex items-center gap-1.5 transition whitespace-nowrap shrink-0"
            >
              <span>Explore All</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#087443]" />
            </button>
          </div>
        </div>

        {trendingItems.length === 0 ? (
          <div className="rounded-xl border border-[#D9E5DF] bg-[#F4F8F5] p-6 text-center">
            <Globe2 className="w-8 h-8 text-[#10251D]/40 mx-auto mb-2" />
            <p className="text-sm font-bold text-[#10251D]">
              No trending engagement recorded in this filter yet
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Listings automatically appear here once students view, like, save, or inquire on live posts.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {trendingItems.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectItem(item)}
                className="text-left bg-white border border-[#D9E5DF] hover:border-[#087443] rounded-xl overflow-hidden shadow-2xs hover:shadow-md transition flex flex-col"
              >
                {item.imageUrl ? (
                  <div className="h-32 w-full bg-[#F4F8F5] overflow-hidden">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-24 w-full bg-gradient-to-br from-[#10251D]/10 to-[#087443]/15 flex items-center justify-center">
                    {renderBadgeIcon(item.entityType)}
                  </div>
                )}

                <div className="p-3.5 flex-1 flex flex-col justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                      <span className="font-extrabold text-[#10251D] tabular-nums">#{idx + 1}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-[#087443] truncate">{item.institutionShortName}</span>
                      <span aria-hidden="true">·</span>
                      <span className="capitalize truncate">{item.entityType}</span>
                    </div>
                    <h3 className="text-sm font-bold text-[#10251D] mt-1 line-clamp-2">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">{item.subtitle}</p>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 pt-2 border-t border-slate-100 tabular-nums">
                    <span>{item.metricsLabel}</span>
                    <span className="flex items-center gap-0.5 text-[#10251D] font-semibold shrink-0">
                      <MapPin className="w-3 h-3" />
                      <span>{item.state}</span>
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
