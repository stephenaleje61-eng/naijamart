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
      ? 'text-[#B45309]'
      : 'text-[#087443]';

  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    trackServiceWhatsAppClick(service.serviceId);
  };

  return (
    <article className="bg-white border border-[#E5E7EB] hover:border-[#087443] rounded-2xl overflow-hidden flex flex-col justify-between transition duration-200 hover:-translate-y-0.5 shadow-xs">
      <div>
        {/* Compressed Lazy-Loaded Service Thumbnail */}
        <button
          type="button"
          onClick={() => onViewDetails(service)}
          className="relative w-full aspect-[4/3] bg-[#F4F8F5] overflow-hidden block text-left"
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
            <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#F0FDF4] to-[#E5E7EB] text-center">
              <Briefcase className="w-8 h-8 text-[#087443] mb-1.5" />
              <span className="text-xs font-bold text-[#065D36] line-clamp-2">
                {service.serviceName}
              </span>
            </div>
          )}

          {service.featured && (
            <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 bg-[#10251D]/90 text-[#D4A62A] text-[10px] font-black px-2.5 py-1 rounded-md">
              <Star className="w-3 h-3 fill-[#D4A62A]" />
              <span>Featured</span>
            </span>
          )}
        </button>

        {/* Body Metadata */}
        <div className="p-4 space-y-2.5">
          {/* Unboxed clean metadata row */}
          <div className="flex items-center flex-wrap gap-1.5 text-[11px] font-semibold text-[#555555]">
            <span className="text-[#087443] font-bold truncate max-w-[170px]">
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
            <h3 className="text-sm sm:text-base font-black text-[#10251D] group-hover:text-[#087443] line-clamp-1 transition">
              {service.serviceName}
            </h3>
          </button>

          <p className="text-base font-black text-[#087443] tabular-nums">{priceLabel}</p>

          <p className="text-xs text-[#555555] line-clamp-2 leading-relaxed">
            {service.description}
          </p>

          <div className="pt-2 border-t border-[#E5E7EB] space-y-1 text-[11px] text-[#444444]">
            <div className="flex items-center gap-1.5 truncate">
              <UserCheck className="w-3.5 h-3.5 text-[#087443] shrink-0" />
              <span className="font-bold text-[#10251D] truncate">{service.providerName}</span>
            </div>
            <CeoVerifiedBadge
              verified={Boolean(service.ceoVerified || service.isVerified)}
              entityIds={[service.providerId]}
              customText={service.verifiedBadgeText}
              variant="compact"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1 truncate">
                <MapPin className="w-3.5 h-3.5 text-[#555555] shrink-0" />
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
          className="px-3 py-2.5 bg-[#F4F8F5] hover:bg-[#E5E7EB] text-[#10251D] text-xs font-bold rounded-xl transition min-h-[40px] whitespace-nowrap"
        >
          View Details
        </button>

        <button
          type="button"
          onClick={() => onContactProvider(service)}
          className="px-3 py-2.5 bg-[#087443] hover:bg-[#065D36] text-white text-xs font-bold rounded-xl transition min-h-[40px] whitespace-nowrap"
        >
          Contact Provider
        </button>

        <a
          href={buildServiceWhatsAppHref(service)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleWhatsAppClick}
          className="px-3 py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 min-h-[40px] whitespace-nowrap"
        >
          <MessageCircle className="w-3.5 h-3.5 shrink-0" />
          <span>WhatsApp</span>
        </a>

        <a
          href={buildServiceCallHref(service.phone)}
          className="px-3 py-2.5 bg-[#D4A62A] hover:bg-[#E0B43B] text-[#10251D] text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 min-h-[40px] whitespace-nowrap"
        >
          <Phone className="w-3.5 h-3.5 shrink-0" />
          <span>Call Provider</span>
        </a>
      </div>
    </article>
  );
};
