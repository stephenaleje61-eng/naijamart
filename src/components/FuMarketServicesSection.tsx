import React, { useMemo, useState } from 'react';
import {
  Briefcase,
  Search,
  PlusCircle,
  LayoutDashboard,
  Star,
  MapPin,
  X,
  SlidersHorizontal,
  ShieldCheck
} from 'lucide-react';
import { Institution, ServiceCategory, ServiceListing } from '../types.js';
import {
  SERVICE_PROMOTION_PLANS,
  isServicePromotionLive
} from '../services/servicesMarketplace.js';
import { isAuthorizedCeo } from '../services/events.js';
import { useAuth } from '../context/AuthContext.js';
import { ServiceCard } from './ServiceCard.js';
import { formatNaira } from './ProductCard.js';
import { belongsToInstitution, DEFAULT_INSTITUTION_ID } from '../constants/institutions.js';

type ServiceSortKey = 'newest' | 'price-asc' | 'price-desc' | 'popular';

interface FuMarketServicesSectionProps {
  services: ServiceListing[];
  categories: ServiceCategory[];
  loading?: boolean;
  selectedInstitutionId?: string;
  activeInstitution?: Institution;
  onPostService: () => void;
  onOpenProviderDashboard: () => void;
  onOpenAdminServices?: () => void;
  onViewDetails: (service: ServiceListing) => void;
  onContactProvider: (service: ServiceListing) => void;
  onOpenPromoteService: (service: ServiceListing) => void;
}

export const FuMarketServicesSection: React.FC<FuMarketServicesSectionProps> = ({
  services,
  categories,
  loading = false,
  selectedInstitutionId = DEFAULT_INSTITUTION_ID,
  activeInstitution,
  onPostService,
  onOpenProviderDashboard,
  onOpenAdminServices,
  onViewDetails,
  onContactProvider,
  onOpenPromoteService
}) => {
  const { user } = useAuth();
  const isCeo = isAuthorizedCeo(user);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [sortBy, setSortBy] = useState<ServiceSortKey>('newest');
  const [availableOnly, setAvailableOnly] = useState(false);

  const instShort =
    selectedInstitutionId === 'all'
      ? 'All Campuses'
      : activeInstitution?.shortName || 'FUWUKARI';

  const institutionScopedServices = useMemo(
    () =>
      services.filter((s) =>
        belongsToInstitution(s.institutionId, selectedInstitutionId)
      ),
    [services, selectedInstitutionId]
  );

  const featuredServices = useMemo(
    () => institutionScopedServices.filter((s) => isServicePromotionLive(s)),
    [institutionScopedServices]
  );

  const distinctLocations = useMemo(() => {
    const set = new Set<string>();
    for (const s of institutionScopedServices) {
      if (s.location) set.add(s.location);
    }
    return Array.from(set).sort();
  }, [institutionScopedServices]);

  const filteredServices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const min = minPrice.trim() ? Number(minPrice) : null;
    const max = maxPrice.trim() ? Number(maxPrice) : null;

    const result = institutionScopedServices.filter((s) => {
      if (selectedCategory !== 'all' && s.category !== selectedCategory) return false;
      if (selectedLocation !== 'all' && s.location !== selectedLocation) return false;
      if (availableOnly && s.availability !== 'available') return false;
      if (min !== null && !isNaN(min) && s.price < min) return false;
      if (max !== null && !isNaN(max) && s.price > max) return false;

      if (q) {
        const hay = `${s.serviceName} ${s.category} ${s.location} ${s.providerName} ${s.description} ${s.priceDisplay || s.price}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return [...result].sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'popular') {
        const scoreA = (a.views || 0) + (a.whatsappClicks || 0) * 3;
        const scoreB = (b.views || 0) + (b.whatsappClicks || 0) * 3;
        if (scoreB !== scoreA) return scoreB - scoreA;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [institutionScopedServices, searchQuery, selectedCategory, selectedLocation, minPrice, maxPrice, sortBy, availableOnly]);

  const hasFilters =
    Boolean(searchQuery) ||
    selectedCategory !== 'all' ||
    selectedLocation !== 'all' ||
    Boolean(minPrice) ||
    Boolean(maxPrice) ||
    availableOnly ||
    sortBy !== 'newest';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedLocation('all');
    setMinPrice('');
    setMaxPrice('');
    setSortBy('newest');
    setAvailableOnly(false);
  };

  return (
    <div id="fu-market-services" className="space-y-6">
      {/* SECTION A: FEATURED SERVICES – PROMOTE YOUR BUSINESS */}
      <section className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#EEEEEE]">
          <div>
            <p className="text-xs font-extrabold text-[#FF6A00] tracking-wide">
              Priority Campus Placement
            </p>
            <h2 className="font-display text-lg sm:text-xl font-black text-[#222222] flex items-center gap-2 mt-0.5">
              <Star className="w-5 h-5 text-[#F68B1F] fill-[#F68B1F] shrink-0" />
              <span>FEATURED SERVICES – PROMOTE YOUR BUSINESS</span>
            </h2>
            <p className="text-xs text-[#666666] mt-0.5">
              Boost your service to the top of NIGERIA CAMPUS MARKET with verified Homepage, Weekly, or Monthly placements.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenProviderDashboard}
            className="px-4 py-2.5 bg-[#F68B1F] hover:bg-[#FF6A00] text-[#FFFFFF] text-xs font-black rounded-xl transition flex items-center gap-2 self-start lg:self-auto whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Star className="w-4 h-4 text-[#FFFFFF]" />
            <span>Promote My Service</span>
          </button>
        </div>

        {featuredServices.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredServices.map((service) => (
              <ServiceCard
                key={`featured-${service.serviceId}`}
                service={service}
                onViewDetails={onViewDetails}
                onContactProvider={onContactProvider}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {SERVICE_PROMOTION_PLANS.map((plan) => (
              <div
                key={plan.id}
                className="p-4 rounded-2xl border border-[#EEEEEE] bg-[#F7F7F7] flex flex-col justify-between gap-3"
              >
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-[#222222]">{plan.name}</h3>
                  <p className="text-xl font-black text-[#FF6A00] tabular-nums">
                    {formatNaira(plan.priceNaira)}
                    <span className="text-xs font-normal text-[#666666]">
                      {' '}
                      · {plan.durationDays} days
                    </span>
                  </p>
                  <p className="text-xs text-[#666666]">{plan.placementLabel}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (institutionScopedServices.length > 0) {
                      onOpenProviderDashboard();
                    } else {
                      onPostService();
                    }
                  }}
                  className="w-full px-3.5 py-2 bg-[#FFFFFF] hover:bg-[#F68B1F] hover:text-[#FFFFFF] border border-[#EEEEEE] hover:border-[#F68B1F] text-xs font-bold text-[#222222] rounded-xl transition cursor-pointer"
                >
                  Select in Provider Dashboard
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECTION B: STUDENT SERVICES DIRECTORY */}
      <section className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
        {/* Header Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#EEEEEE]">
          <div className="space-y-1 max-w-2xl">
            <p className="text-xs font-extrabold text-[#FF6A00]">
              {instShort} Student &amp; Local Services Directory
            </p>
            <h2 className="font-display text-xl sm:text-2xl font-black text-[#222222] flex items-center gap-2">
              <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-[#F68B1F] shrink-0" />
              <span>NIGERIA CAMPUS MARKET SERVICES – FIND ANY SERVICE YOU NEED</span>
            </h2>
            <p className="text-xs sm:text-sm text-[#666666]">
              Discover trusted services offered by students and businesses around {instShort}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onPostService}
              className="px-5 py-3 bg-[#FF6A00] hover:bg-[#F68B1F] text-[#FFFFFF] text-xs sm:text-sm font-black rounded-xl transition flex items-center gap-2 min-h-[44px] whitespace-nowrap cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>POST YOUR SERVICE</span>
            </button>

            <button
              type="button"
              onClick={onOpenProviderDashboard}
              className="px-4 py-3 bg-[#222222] hover:bg-[#303030] text-[#FFFFFF] text-xs font-bold rounded-xl transition flex items-center gap-1.5 min-h-[44px] whitespace-nowrap cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4 text-[#F68B1F]" />
              <span>Provider Dashboard</span>
            </button>

            {isCeo && onOpenAdminServices && (
              <button
                type="button"
                onClick={onOpenAdminServices}
                className="px-4 py-3 bg-[#FFF4E8] hover:bg-[#F68B1F] hover:text-[#FFFFFF] border border-[#F68B1F] text-[#FF6A00] text-xs font-black rounded-xl transition flex items-center gap-1.5 min-h-[44px] whitespace-nowrap cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Manage Services</span>
              </button>
            )}
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="space-y-3 bg-[#F7F7F7] border border-[#EEEEEE] rounded-2xl p-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
            <div className="md:col-span-5 relative">
              <Search className="w-4 h-4 text-[#F68B1F] absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search services, category, location or price..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#FFFFFF] border border-[#EEEEEE] rounded-xl focus:border-[#F68B1F] outline-none text-[#303030]"
              />
            </div>

            <div className="md:col-span-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                aria-label="Filter by service category"
                className="w-full px-3 py-2 text-xs font-bold bg-[#FFFFFF] border border-[#EEEEEE] rounded-xl focus:border-[#F68B1F] outline-none text-[#222222]"
              >
                <option value="all">All Categories ({categories.length})</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 relative">
              <MapPin className="w-3.5 h-3.5 text-[#F68B1F] absolute left-2.5 top-2.5 pointer-events-none" />
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                aria-label="Filter by location"
                className="w-full pl-8 pr-2 py-2 text-xs font-bold bg-[#FFFFFF] border border-[#EEEEEE] rounded-xl focus:border-[#F68B1F] outline-none text-[#222222]"
              >
                <option value="all">All Locations</option>
                {distinctLocations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as ServiceSortKey)}
                aria-label="Sort services"
                className="w-full px-3 py-2 text-xs font-bold bg-[#FFFFFF] border border-[#EEEEEE] rounded-xl focus:border-[#F68B1F] outline-none text-[#222222]"
              >
                <option value="newest">Recently posted</option>
                <option value="price-asc">Lowest price</option>
                <option value="price-desc">Highest price</option>
                <option value="popular">Popular services</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#EEEEEE]">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-[#222222] flex items-center gap-1">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#F68B1F]" />
                <span>Price &amp; Availability:</span>
              </span>
              <input
                type="number"
                min={0}
                placeholder="Min ₦"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-24 px-2.5 py-1.5 bg-[#FFFFFF] border border-[#EEEEEE] rounded-lg text-xs tabular-nums outline-none focus:border-[#F68B1F]"
              />
              <span className="text-[#666666]">–</span>
              <input
                type="number"
                min={0}
                placeholder="Max ₦"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-24 px-2.5 py-1.5 bg-[#FFFFFF] border border-[#EEEEEE] rounded-lg text-xs tabular-nums outline-none focus:border-[#F68B1F]"
              />

              <button
                type="button"
                onClick={() => setAvailableOnly((v) => !v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                  availableOnly
                    ? 'bg-[#FF6A00] border-[#FF6A00] text-[#FFFFFF]'
                    : 'bg-[#FFFFFF] border-[#EEEEEE] text-[#303030] hover:border-[#F68B1F]'
                }`}
              >
                Available providers only
              </button>

              {hasFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#222222] text-[#FFFFFF] flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3 h-3 text-[#F68B1F]" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            <span className="text-xs text-[#666666] tabular-nums">
              {filteredServices.length}{' '}
              {filteredServices.length === 1 ? 'service found' : 'services found'}
            </span>
          </div>

          {/* Quick Scrollable Category Strip */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-[#FF6A00] text-[#FFFFFF]'
                  : 'bg-[#FFFFFF] border border-[#EEEEEE] text-[#303030] hover:border-[#F68B1F]'
              }`}
            >
              All Services
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition cursor-pointer ${
                  selectedCategory === cat.name
                    ? 'bg-[#FF6A00] text-[#FFFFFF]'
                    : 'bg-[#FFFFFF] border border-[#EEEEEE] text-[#303030] hover:border-[#F68B1F]'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Service Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((slot) => (
              <div
                key={slot}
                className="h-72 rounded-2xl border border-[#EEEEEE] bg-[#F7F7F7] animate-pulse"
              />
            ))}
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="p-8 rounded-2xl border border-[#EEEEEE] bg-[#F7F7F7] text-center space-y-3">
            <Briefcase className="w-10 h-10 text-[#F68B1F] mx-auto" />
            <h3 className="text-sm sm:text-base font-black text-[#222222]">
              {hasFilters
                ? 'No services match your current filters'
                : `No student services posted for ${instShort} yet — be the first provider!`}
            </h3>
            <p className="text-xs text-[#666666] max-w-md mx-auto">
              {hasFilters
                ? `Try clearing your search or category filter to discover services around ${instShort}.`
                : 'Offer barbing, braiding, laundry, repairs, design, tutoring, catering, typing, or any campus skill.'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              {hasFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-4 py-2 bg-[#FFFFFF] border border-[#EEEEEE] text-[#222222] text-xs font-bold rounded-xl cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
              <button
                type="button"
                onClick={onPostService}
                className="px-5 py-2.5 bg-[#FF6A00] hover:bg-[#F68B1F] text-[#FFFFFF] text-xs font-black rounded-xl transition cursor-pointer"
              >
                POST YOUR SERVICE
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredServices.map((service) => (
              <ServiceCard
                key={service.serviceId}
                service={service}
                onViewDetails={onViewDetails}
                onContactProvider={onContactProvider}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
