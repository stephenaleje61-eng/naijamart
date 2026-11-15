import React, { useEffect, useState } from 'react';
import {
  X,
  Briefcase,
  Eye,
  MessageCircle,
  Edit3,
  Trash2,
  Star,
  PlusCircle,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';
import {
  ServiceAvailability,
  ServiceCategory,
  ServiceListing
} from '../types.js';
import {
  deleteServiceListing,
  subscribeToProviderServices,
  toggleServiceAvailability
} from '../services/servicesMarketplace.js';
import { auth } from '../services/firebase.js';
import { useAuth } from '../context/AuthContext.js';
import { getOrCreateGuestId } from '../utils/studentAuth.js';
import { formatNaira } from './ProductCard.js';

interface ServiceProviderDashboardModalProps {
  categories: ServiceCategory[];
  onClose: () => void;
  onPostNew: () => void;
  onEditService: (service: ServiceListing) => void;
  onPromoteService: (service: ServiceListing) => void;
  onViewService: (service: ServiceListing) => void;
  onToast?: (msg: string) => void;
}

export const ServiceProviderDashboardModal: React.FC<ServiceProviderDashboardModalProps> = ({
  onClose,
  onPostNew,
  onEditService,
  onPromoteService,
  onViewService,
  onToast
}) => {
  const { user } = useAuth();
  const [services, setServices] = useState<ServiceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const candidateIds = [
      user?.id || '',
      auth.currentUser?.uid || '',
      getOrCreateGuestId()
    ].filter(Boolean);

    const unsub = subscribeToProviderServices(
      candidateIds,
      (list) => {
        setServices(list);
        setLoading(false);
      },
      (err) => {
        setErrorMsg(err?.message || 'Could not load your services.');
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user?.id]);

  const totalViews = services.reduce((sum, s) => sum + (s.views || 0), 0);
  const totalWhatsAppClicks = services.reduce((sum, s) => sum + (s.whatsappClicks || 0), 0);
  const activeCount = services.filter((s) => s.status === 'active').length;

  const handleAvailabilityChange = async (
    service: ServiceListing,
    availability: ServiceAvailability
  ) => {
    setBusyId(service.serviceId);
    setErrorMsg(null);
    try {
      await toggleServiceAvailability(service.serviceId, availability);
      onToast?.(`Availability updated to "${availability}".`);
    } catch (err: any) {
      setErrorMsg(
        err?.message?.includes('permission-denied')
          ? 'Sign in with Google or ensure Firebase Anonymous Auth is active to edit guest listings.'
          : err?.message || 'Could not update availability.'
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (serviceId: string) => {
    setBusyId(serviceId);
    setErrorMsg(null);
    try {
      await deleteServiceListing(serviceId);
      setConfirmDeleteId(null);
      onToast?.('Service listing deleted.');
    } catch (err: any) {
      setErrorMsg(
        err?.message?.includes('permission-denied')
          ? 'Only signed-in service owners or FU MARKET CEO can delete this listing.'
          : err?.message || 'Could not delete service listing.'
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs overflow-y-auto flex items-center justify-center p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label="Service Provider Dashboard"
    >
      <div className="relative w-full max-w-4xl bg-white border border-[#E5E7EB] rounded-2xl shadow-2xl overflow-hidden my-4 text-[#111111]">
        {/* Header */}
        <div className="bg-[#0B6B3A] text-white px-5 py-4 flex items-center justify-between gap-4 border-b border-[#14532D]">
          <div>
            <h2 className="text-base sm:text-lg font-black text-[#F2B90D]">
              SERVICE PROVIDER DASHBOARD
            </h2>
            <p className="text-xs text-white/90">
              Manage your listings, pricing, photos, availability, views &amp; WhatsApp leads
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                onClose();
                onPostNew();
              }}
              className="px-3.5 py-2 bg-[#F2B90D] hover:bg-[#FFC107] text-[#111111] text-xs font-black rounded-xl flex items-center gap-1.5 transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Post Service</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dashboard"
              className="w-9 h-9 rounded-lg bg-[#14532D] hover:bg-[#F2B90D] text-white hover:text-[#111111] flex items-center justify-center transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-6 max-h-[82vh] overflow-y-auto space-y-5 bg-[#F9FAFB]">
          {/* Analytics KPI Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-3.5">
              <p className="text-[11px] font-bold text-[#555555]">My Services</p>
              <p className="text-2xl font-black text-[#111111] tabular-nums mt-0.5">
                {services.length}
              </p>
            </div>
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-3.5">
              <p className="text-[11px] font-bold text-[#555555]">Active Listings</p>
              <p className="text-2xl font-black text-[#0B6B3A] tabular-nums mt-0.5">
                {activeCount}
              </p>
            </div>
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-3.5">
              <p className="text-[11px] font-bold text-[#555555]">Service Views</p>
              <p className="text-2xl font-black text-[#111111] tabular-nums mt-0.5 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-[#0B6B3A]" />
                <span>{totalViews}</span>
              </p>
            </div>
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-3.5">
              <p className="text-[11px] font-bold text-[#555555]">WhatsApp Clicks</p>
              <p className="text-2xl font-black text-[#16A34A] tabular-nums mt-0.5 flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4" />
                <span>{totalWhatsAppClicks}</span>
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl text-xs font-bold text-[#B91C1C]">
              {errorMsg}
            </div>
          )}

          {loading ? (
            <div className="py-10 text-center text-xs font-semibold text-[#555555]">
              Loading your services...
            </div>
          ) : services.length === 0 ? (
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-8 text-center space-y-3">
              <Briefcase className="w-10 h-10 text-[#0B6B3A] mx-auto" />
              <h3 className="text-sm font-black text-[#111111]">
                You haven&apos;t posted any service yet
              </h3>
              <p className="text-xs text-[#555555] max-w-md mx-auto">
                Publish your barbing, braiding, laundry, repair, design, tutoring, or delivery service so FUWUKARI students can find and contact you directly.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onPostNew();
                }}
                className="px-5 py-2.5 bg-[#0B6B3A] hover:bg-[#14532D] text-white text-xs font-black rounded-xl transition"
              >
                POST YOUR SERVICE
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {services.map((service) => {
                const isBusy = busyId === service.serviceId;
                const priceLabel =
                  service.priceDisplay ||
                  (service.priceMax && service.priceMax > service.price
                    ? `${formatNaira(service.price)} – ${formatNaira(service.priceMax)}`
                    : formatNaira(service.price));

                return (
                  <div
                    key={service.serviceId}
                    className="bg-white border border-[#E5E7EB] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <img
                        src={service.images?.[0] || ''}
                        alt={service.serviceName}
                        loading="lazy"
                        className="w-20 h-16 rounded-lg object-cover border border-[#E5E7EB] bg-[#F5F5F5] shrink-0"
                      />
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#555555]">
                          <span className="font-bold text-[#0B6B3A]">{service.category}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-bold capitalize">{service.status}</span>
                          {service.featured && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-black text-[#B45309]">Featured</span>
                            </>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => onViewService(service)}
                          className="text-sm font-black text-[#111111] hover:text-[#0B6B3A] text-left truncate block max-w-full"
                        >
                          {service.serviceName}
                        </button>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-[#444444] tabular-nums">
                          <span className="font-black text-[#0B6B3A]">{priceLabel}</span>
                          <span>Views: <strong>{service.views}</strong></span>
                          <span>WhatsApp Clicks: <strong>{service.whatsappClicks}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {/* Availability Switcher */}
                      <div className="flex items-center gap-1 bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl p-1 text-[11px] font-bold">
                        {(
                          [
                            { id: 'available', label: 'Available', Icon: CheckCircle2 },
                            { id: 'busy', label: 'Busy', Icon: Clock },
                            { id: 'unavailable', label: 'Off', Icon: AlertCircle }
                          ] as const
                        ).map(({ id, label, Icon }) => (
                          <button
                            key={id}
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleAvailabilityChange(service, id)}
                            className={`px-2 py-1 rounded-lg flex items-center gap-1 transition ${
                              service.availability === id
                                ? 'bg-[#0B6B3A] text-white'
                                : 'text-[#555555] hover:text-[#111111]'
                            }`}
                          >
                            <Icon className="w-3 h-3" />
                            <span>{label}</span>
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => onEditService(service)}
                        className="px-3 py-2 bg-[#F5F5F5] hover:bg-[#E5E7EB] text-[#111111] text-xs font-bold rounded-xl flex items-center gap-1 transition"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onPromoteService(service)}
                        className="px-3 py-2 bg-[#FFF7ED] hover:bg-[#EA580C] text-[#9A3412] hover:text-white border border-[#FDBA74] text-xs font-black rounded-xl flex items-center gap-1 transition"
                      >
                        <Star className="w-3.5 h-3.5" />
                        <span>Promote</span>
                      </button>

                      {confirmDeleteId === service.serviceId ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleDelete(service.serviceId)}
                            className="px-2.5 py-2 bg-[#B91C1C] text-white text-xs font-black rounded-xl"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2.5 py-2 bg-[#E5E7EB] text-[#111111] text-xs font-bold rounded-xl"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(service.serviceId)}
                          className="px-3 py-2 bg-[#FEF2F2] hover:bg-[#B91C1C] text-[#B91C1C] hover:text-white text-xs font-bold rounded-xl flex items-center gap-1 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
