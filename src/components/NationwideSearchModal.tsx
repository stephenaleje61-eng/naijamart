import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Calendar,
  Compass,
  Filter,
  Globe2,
  Home,
  Loader2,
  MapPin,
  Search,
  ShoppingBag,
  Sparkles,
  Trophy,
  Wrench,
  X
} from 'lucide-react';
import {
  AccommodationProperty,
  Advertisement,
  CampusEvent,
  GeneralAnnouncementPost,
  HouseAgentProfile,
  Institution,
  InstitutionType,
  NationalSearchCategory,
  NationalSearchFilters,
  NationalSearchResult,
  NationalSearchScope,
  Product,
  ServiceListing,
  SportUpdatePost,
  StudentRequest
} from '../types.js';
import { INSTITUTION_TYPE_OPTIONS } from '../constants/institutions.js';
import { NIGERIA_STATES } from '../constants/states.js';
import { ALL_MARKETPLACE_CATEGORIES as CATEGORIES } from '../constants/categories.js';
import {
  executeNationalSearch,
  fetchMissingNationwideCollections,
  SearchableCollections
} from '../services/search.js';

interface NationwideSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeInstitution: Institution;
  institutions: Institution[];
  initialQuery?: string;
  initialScope?: NationalSearchScope;
  initialCategory?: NationalSearchCategory;
  products: Product[];
  services: ServiceListing[];
  advertisements: Advertisement[];
  sports: SportUpdatePost[];
  announcements: GeneralAnnouncementPost[];
  events: CampusEvent[];
  accommodations?: AccommodationProperty[];
  houseAgents?: HouseAgentProfile[];
  studentRequests?: StudentRequest[];
  onSelectResult: (result: NationalSearchResult) => void;
}

const CATEGORY_TABS: { value: NationalSearchCategory; label: string }[] = [
  { value: 'all', label: 'All Results' },
  { value: 'products', label: 'Products' },
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'house_agents', label: 'House Agents' },
  { value: 'businesses', label: 'Businesses' },
  { value: 'services', label: 'Services' },
  { value: 'sports', label: 'Sports' },
  { value: 'announcements', label: 'Announcements' },
  { value: 'events', label: 'Events' },
  { value: 'student_requests', label: 'Requests' }
];

export const NationwideSearchModal: React.FC<NationwideSearchModalProps> = ({
  isOpen,
  onClose,
  activeInstitution,
  institutions,
  initialQuery = '',
  initialScope = 'nationwide',
  initialCategory = 'all',
  products,
  services,
  advertisements,
  sports,
  announcements,
  events,
  accommodations,
  houseAgents,
  studentRequests,
  onSelectResult
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [scope, setScope] = useState<NationalSearchScope>(initialScope);
  const [category, setCategory] = useState<NationalSearchCategory>(initialCategory);
  const [institutionFilterId, setInstitutionFilterId] = useState<string>(
    initialScope === 'institution' ? activeInstitution.id : 'all'
  );
  const [institutionType, setInstitutionType] = useState<InstitutionType | 'all'>('all');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [listingCategory, setListingCategory] = useState<string>('all');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [datePosted, setDatePosted] = useState<'all' | '24h' | '7d' | '30d'>('all');
  const [sort, setSort] = useState<NationalSearchFilters['sort']>('newest');
  const [page, setPage] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [extraCollections, setExtraCollections] = useState<SearchableCollections>({});
  const [loadingCollections, setLoadingCollections] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setQuery(initialQuery);
    setScope(initialScope);
    setCategory(initialCategory);
    setInstitutionFilterId(initialScope === 'institution' ? activeInstitution.id : 'all');
    setPage(1);
  }, [isOpen, initialQuery, initialScope, initialCategory, activeInstitution.id]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setLoadingCollections(true);
    fetchMissingNationwideCollections({
      products,
      services,
      advertisements,
      sports,
      announcements,
      events,
      accommodations,
      houseAgents,
      studentRequests,
      institutions
    })
      .then((hydrated) => {
        if (active) setExtraCollections(hydrated);
      })
      .finally(() => {
        if (active) setLoadingCollections(false);
      });
    return () => {
      active = false;
    };
  }, [
    isOpen,
    products,
    services,
    advertisements,
    sports,
    announcements,
    events,
    accommodations,
    houseAgents,
    studentRequests,
    institutions
  ]);

  const handleScopeSwitch = (nextScope: NationalSearchScope) => {
    setScope(nextScope);
    setPage(1);
    if (nextScope === 'institution') {
      setInstitutionFilterId(activeInstitution.id);
      setInstitutionType('all');
      setStateFilter('all');
    } else {
      setInstitutionFilterId('all');
    }
  };

  const searchFilters: NationalSearchFilters = useMemo(
    () => ({
      query,
      scope,
      category,
      institutionId: scope === 'institution' ? activeInstitution.id : institutionFilterId,
      institutionType,
      state: stateFilter,
      listingCategory,
      minPrice: minPrice.trim() ? Number(minPrice) : undefined,
      maxPrice: maxPrice.trim() ? Number(maxPrice) : undefined,
      location: locationFilter.trim() || undefined,
      datePosted,
      sort
    }),
    [
      query,
      scope,
      category,
      activeInstitution.id,
      institutionFilterId,
      institutionType,
      stateFilter,
      listingCategory,
      minPrice,
      maxPrice,
      locationFilter,
      datePosted,
      sort
    ]
  );

  const searchResult = useMemo(() => {
    const merged: SearchableCollections = {
      products,
      services,
      advertisements,
      sports,
      announcements,
      events,
      accommodations: extraCollections.accommodations ?? accommodations,
      houseAgents: extraCollections.houseAgents ?? houseAgents,
      studentRequests: extraCollections.studentRequests ?? studentRequests,
      institutions
    };
    return executeNationalSearch(searchFilters, merged, page, 24);
  }, [
    searchFilters,
    products,
    services,
    advertisements,
    sports,
    announcements,
    events,
    accommodations,
    houseAgents,
    studentRequests,
    extraCollections,
    institutions,
    page
  ]);

  if (!isOpen) return null;

  const getTypeIcon = (entityType: NationalSearchResult['entityType']) => {
    switch (entityType) {
      case 'products':
        return <ShoppingBag className="w-4 h-4 text-[#087443]" />;
      case 'accommodation':
      case 'house_agents':
        return <Home className="w-4 h-4 text-[#10251D]" />;
      case 'services':
        return <Wrench className="w-4 h-4 text-[#087443]" />;
      case 'sports':
        return <Trophy className="w-4 h-4 text-[#D4A62A]" />;
      case 'events':
        return <Calendar className="w-4 h-4 text-[#10251D]" />;
      default:
        return <Sparkles className="w-4 h-4 text-[#087443]" />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#10251D]/65 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="NIGERIA CAMPUS MARKET Search"
    >
      <div className="bg-white w-full max-w-5xl max-h-[92vh] rounded-2xl shadow-2xl border border-[#D9E5DF] flex flex-col overflow-hidden">
        {/* Top Royal Navy Header */}
        <div className="bg-[#10251D] text-white px-4 sm:px-6 py-4 flex items-center justify-between gap-4 border-b border-[#D4A62A]/40">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-extrabold tracking-tight flex items-center gap-2 truncate">
              <Compass className="w-5 h-5 text-[#D4A62A] shrink-0" />
              <span className="truncate">NIGERIA CAMPUS MARKET SEARCH</span>
            </h2>
            <p className="text-xs text-slate-200 mt-0.5 truncate">
              Switch seamlessly between {activeInstitution.shortName} campus listings or nationwide search across all Nigerian institutions.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-10 min-w-10 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition shrink-0"
            aria-label="Close search modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scope Segmented Toggle & Main Search Input */}
        <div className="bg-[#F4F8F5] px-4 sm:px-6 py-4 border-b border-[#D9E5DF] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Explicit Scope Toggle */}
            <div
              className="inline-flex items-center p-1 bg-white rounded-xl border border-[#D9E5DF] shadow-xs"
              role="group"
              aria-label="Search Scope Toggle"
            >
              <button
                type="button"
                onClick={() => handleScopeSwitch('institution')}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap shrink-0 ${
                  scope === 'institution'
                    ? 'bg-[#087443] text-white shadow-xs'
                    : 'text-[#10251D] hover:bg-[#F4F8F5]'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>INSTITUTION SEARCH ({activeInstitution.shortName})</span>
              </button>
              <button
                type="button"
                onClick={() => handleScopeSwitch('nationwide')}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap shrink-0 ${
                  scope === 'nationwide'
                    ? 'bg-[#10251D] text-white shadow-xs'
                    : 'text-[#10251D] hover:bg-[#F4F8F5]'
                }`}
              >
                <Globe2 className="w-3.5 h-3.5 text-[#D4A62A]" />
                <span>NATIONWIDE SEARCH</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold border border-[#D9E5DF] bg-white text-[#10251D] hover:border-[#087443] flex items-center gap-1.5 transition whitespace-nowrap shrink-0"
            >
              <Filter className="w-3.5 h-3.5 text-[#087443]" />
              <span>{showAdvanced ? 'Hide Filters' : 'More Filters'}</span>
            </button>
          </div>

          {/* Search Input Row */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder={
                  scope === 'institution'
                    ? `Search ${activeInstitution.shortName} products, hostels, services, sports, announcements...`
                    : 'Search across Nigerian Universities, Polytechnics & Colleges...'
                }
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#D9E5DF] rounded-xl text-sm text-[#10251D] placeholder:text-slate-400 focus:outline-none focus:border-[#087443] focus:ring-2 focus:ring-[#087443]/15"
                autoFocus
              />
            </div>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as NationalSearchFilters['sort'])}
              className="px-3 py-2.5 bg-white border border-[#D9E5DF] rounded-xl text-xs font-semibold text-[#10251D] focus:outline-none focus:border-[#087443]"
              aria-label="Sort search results"
            >
              <option value="relevance">Sort: Best Match</option>
              <option value="newest">Sort: Newest First</option>
              <option value="popular">Sort: Most Popular</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>

          {/* Category Horizontal Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => {
                  setCategory(tab.value);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap shrink-0 ${
                  category === tab.value
                    ? 'bg-[#087443] text-white'
                    : 'bg-white text-[#10251D] border border-[#D9E5DF] hover:border-[#087443]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Advanced Multi-Criteria Filter Grid */}
          {showAdvanced && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-[#D9E5DF]">
              {scope === 'nationwide' && (
                <>
                  <select
                    value={institutionFilterId}
                    onChange={(e) => {
                      setInstitutionFilterId(e.target.value);
                      setPage(1);
                    }}
                    className="px-3 py-2 bg-white border border-[#D9E5DF] rounded-lg text-xs text-[#10251D]"
                  >
                    <option value="all">All Nigerian Institutions</option>
                    {institutions.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.shortName} — {inst.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={institutionType}
                    onChange={(e) => {
                      setInstitutionType(e.target.value as InstitutionType | 'all');
                      setPage(1);
                    }}
                    className="px-3 py-2 bg-white border border-[#D9E5DF] rounded-lg text-xs text-[#10251D]"
                  >
                    {INSTITUTION_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={stateFilter}
                    onChange={(e) => {
                      setStateFilter(e.target.value);
                      setPage(1);
                    }}
                    className="px-3 py-2 bg-white border border-[#D9E5DF] rounded-lg text-xs text-[#10251D]"
                  >
                    <option value="all">All Nigerian States</option>
                    {NIGERIA_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </>
              )}

              <select
                value={listingCategory}
                onChange={(e) => {
                  setListingCategory(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 bg-white border border-[#D9E5DF] rounded-lg text-xs text-[#10251D]"
              >
                <option value="all">All Product Categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <input
                type="number"
                min={0}
                value={minPrice}
                onChange={(e) => {
                  setMinPrice(e.target.value);
                  setPage(1);
                }}
                placeholder="Min Price (₦)"
                className="px-3 py-2 bg-white border border-[#D9E5DF] rounded-lg text-xs text-[#10251D]"
              />

              <input
                type="number"
                min={0}
                value={maxPrice}
                onChange={(e) => {
                  setMaxPrice(e.target.value);
                  setPage(1);
                }}
                placeholder="Max Price (₦)"
                className="px-3 py-2 bg-white border border-[#D9E5DF] rounded-lg text-xs text-[#10251D]"
              />

              <input
                type="text"
                value={locationFilter}
                onChange={(e) => {
                  setLocationFilter(e.target.value);
                  setPage(1);
                }}
                placeholder="Campus area / Hostel / Town"
                className="px-3 py-2 bg-white border border-[#D9E5DF] rounded-lg text-xs text-[#10251D]"
              />

              <select
                value={datePosted}
                onChange={(e) => {
                  setDatePosted(e.target.value as 'all' | '24h' | '7d' | '30d');
                  setPage(1);
                }}
                className="px-3 py-2 bg-white border border-[#D9E5DF] rounded-lg text-xs text-[#10251D]"
              >
                <option value="all">Any Time Posted</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
            </div>
          )}
        </div>

        {/* Results Feed */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white">
          <div className="flex items-center justify-between gap-2 mb-4 pb-2 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-600 tabular-nums">
              {searchResult.total} matching result{searchResult.total === 1 ? '' : 's'}
              {scope === 'institution' ? ` · Scoped to ${activeInstitution.shortName}` : ' · Nationwide Network'}
            </p>
            {loadingCollections && (
              <span className="text-xs text-[#087443] flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Syncing campus indexes...</span>
              </span>
            )}
          </div>

          {searchResult.items.length === 0 ? (
            <div className="py-12 text-center bg-[#F4F8F5] rounded-xl border border-[#D9E5DF] px-4">
              <Search className="w-10 h-10 text-[#10251D]/40 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-[#10251D]">
                No matching listings found {scope === 'institution' ? `in ${activeInstitution.shortName}` : 'nationwide'}
              </h3>
              <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
                {scope === 'institution'
                  ? 'Try switching to Nationwide Search to explore products, hostels, services, and updates from other Nigerian campuses.'
                  : 'Try broadening your keywords, price range, or institution filter.'}
              </p>
              {scope === 'institution' && (
                <button
                  type="button"
                  onClick={() => handleScopeSwitch('nationwide')}
                  className="mt-4 px-4 py-2 rounded-lg bg-[#10251D] text-white text-xs font-bold hover:bg-[#091812] transition"
                >
                  Search Across All Campuses Nationwide
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {searchResult.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectResult(item)}
                  className="text-left bg-white border border-[#D9E5DF] hover:border-[#087443] rounded-xl overflow-hidden shadow-2xs hover:shadow-md transition flex flex-col"
                >
                  {item.imageUrl ? (
                    <div className="h-36 w-full bg-[#F4F8F5] overflow-hidden">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-24 w-full bg-gradient-to-br from-[#10251D]/8 to-[#087443]/10 flex items-center justify-center">
                      {getTypeIcon(item.entityType)}
                    </div>
                  )}

                  <div className="p-3.5 flex-1 flex flex-col justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                        {getTypeIcon(item.entityType)}
                        <span className="truncate">{item.categoryLabel}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#10251D] truncate">{item.institutionName}</span>
                      </div>
                      <h4 className="text-sm font-bold text-[#10251D] mt-1 line-clamp-2">
                        {item.title}
                      </h4>
                      <p className="text-xs font-semibold text-[#087443] mt-0.5 tabular-nums line-clamp-1">
                        {item.subtitle}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{item.location || item.state || 'Nigeria'}</span>
                      </span>
                      <span className="shrink-0 font-semibold text-[#10251D]">Open &rarr;</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {searchResult.hasMore && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                className="px-5 py-2.5 rounded-xl bg-[#F4F8F5] border border-[#D9E5DF] hover:border-[#087443] text-xs font-bold text-[#10251D] transition"
              >
                Load More Results
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
