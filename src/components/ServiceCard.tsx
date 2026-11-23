import React, { useState } from 'react';
import {
  Briefcase,
  Eye,
  MapPin,
  MessageCircle,
  Phone,
  UserCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Star
} from 'lucide-react';
import { ServiceListing } from '../types.js';
import {
  buildServiceCallHref,
  buildServiceWhatsAppHref,
  trackServiceWhatsAppClick
} from '../services/servicesMarketplace.js';
import { formatNaira } from './ProductCard.js';
import { CeoVerifiedBadge } from './CeoVerifiedBadge.js';

interface ServiceCardProps {
  service: ServiceListing;
  onViewDetails: (service: ServiceListing) => void;
  onContactProvider: (service: ServiceListing) => void;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  onViewDetails,
  onContactProvider
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const coverImage = service.images?.[0] || '';
  const priceLabel =
    service.priceDisplay ||
    (service.priceMax && service.priceMax > service.price
      ? `${formatNaira(service.price)} – ${formatNaira(service.priceMax)}`
      : formatNaira(service.price));

  const availabilityLabel =
    service.availability === 'unavailable'
      ? 'Unavailable'
      : service.availability === 'busy'
      ? 'Busy / Limited'
      : 'Available';

  const availabilityColor =
    service.availability === 'unavailable'
      ? 'text-[#B91C1C]'
      : service.availability === 'busy'
      ? 'text-[#D97706]'
      : 'text-[#F68B1F]';

  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    trackServiceWhatsAppClick(service.serviceId);
  };

  return (
    <article className="bg-[#FFFFFF] border border-[#EEEEEE] hover:border-[#F68B1F] rounded-2xl overflow-hidden flex flex-col justify-between transition duration-200 hover:-translate-y-0.5 shadow-xs">
      <div>
        {/* Compressed Lazy-Loaded Service Thumbnail */}
        <button
          type="button"
          onClick={() => onViewDetails(service)}
          className="relative w-full aspect-[4/3] bg-[#F7F7F7] overflow-hidden block text-left"
        >
          {coverImage && !imgFailed ? (
            <img
              src={coverImage}
              alt={`${service.serviceName} by ${service.providerName}`}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="w-full h-full object-cover transition duration-300 hover:scale-[1.03]"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-[#F7F7F7] text-center">
              <Briefcase className="w-8 h-8 text-[#F68B1F] mb-1.5" />
              <span className="text-xs font-bold text-[#222222] line-clamp-2">
                {service.serviceName}
              </span>
            </div>
          )}

          {service.featured && (
            <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 bg-[#FF6A00] text-[#FFFFFF] text-[10px] font-black px-2.5 py-1 rounded-md shadow-xs">
              <Star className="w-3 h-3 fill-[#FFFFFF]" />
              <span>Featured</span>
            </span>
          )}
        </button>

        {/* Body Metadata */}
        <div className="p-4 space-y-2.5">
          {/* Unboxed clean metadata row */}
          <div className="flex items-center flex-wrap gap-1.5 text-[11px] font-semibold text-[#666666]">
            <span className="text-[#FF6A00] font-bold truncate max-w-[170px]">
              {service.category}
            </span>
            <span aria-hidden="true">·</span>
            <span className={`inline-flex items-center gap-1 font-bold ${availabilityColor}`}>
              {service.availability === 'available' ? (
                <CheckCircle2 className="w-3 h-3" />
              ) : service.availability === 'busy' ? (
                <Clock className="w-3 h-3" />
              ) : (
                <AlertCircle className="w-3 h-3" />
              )}
              <span>{availabilityLabel}</span>
            </span>
          </div>

          <button
            type="button"
            onClick={() => onViewDetails(service)}
            className="text-left block w-full group"
          >
            <h3 className="text-sm sm:text-base font-black text-[#222222] group-hover:text-[#FF6A00] line-clamp-1 transition">
              {service.serviceName}
            </h3>
          </button>

          <p className="text-base font-black text-[#FF6A00] tabular-nums">{priceLabel}</p>

          <p className="text-xs text-[#303030]/80 line-clamp-2 leading-relaxed">
            {service.description}
          </p>

          <div className="pt-2 border-t border-[#EEEEEE] space-y-1 text-[11px] text-[#303030]">
            <div className="flex items-center gap-1.5 truncate">
              <UserCheck className="w-3.5 h-3.5 text-[#F68B1F] shrink-0" />
              <span className="font-bold text-[#222222] truncate">{service.providerName}</span>
            </div>
            <CeoVerifiedBadge
              verified={Boolean(service.ceoVerified || service.isVerified)}
              entityIds={[service.providerId]}
              customText={service.verifiedBadgeText}
              variant="compact"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1 truncate text-[#666666]">
                <MapPin className="w-3.5 h-3.5 text-[#F68B1F] shrink-0" />
                <span className="truncate">{service.location}</span>
              </span>
              <span className="flex items-center gap-1 text-[#666666] tabular-nums shrink-0">
                <Eye className="w-3 h-3" />
                <span>{service.views}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Required 4 Action Controls */}
      <div className="px-4 pb-4 pt-1 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onViewDetails(service)}
          className="px-3 py-2.5 bg-[#F7F7F7] hover:bg-[#EEEEEE] text-[#222222] text-xs font-bold rounded-xl transition min-h-[40px] whitespace-nowrap"
        >
          View Details
        </button>

        <button
          type="button"
          onClick={() => onContactProvider(service)}
          className="px-3 py-2.5 bg-[#F68B1F] hover:bg-[#FF6A00] text-[#FFFFFF] text-xs font-bold rounded-xl transition min-h-[40px] whitespace-nowrap"
        >
          Contact Provider
        </button>

        <a
          href={buildServiceWhatsAppHref(service)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleWhatsAppClick}
          className="px-3 py-2.5 bg-[#FF6A00] hover:bg-[#F68B1F] text-[#FFFFFF] text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 min-h-[40px] whitespace-nowrap"
        >
          <MessageCircle className="w-3.5 h-3.5 shrink-0" />
          <span>WhatsApp</span>
        </a>

        <a
          href={buildServiceCallHref(service.phone)}
          className="px-3 py-2.5 bg-[#222222] hover:bg-[#303030] text-[#FFFFFF] text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 min-h-[40px] whitespace-nowrap"
        >
          <Phone className="w-3.5 h-3.5 shrink-0 text-[#F68B1F]" />
          <span>Call Provider</span>
        </a>
      </div>
    </article>
  );
};
