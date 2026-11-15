import React, { useEffect, useState } from 'react';
import {
  X,
  MapPin,
  Phone,
  MessageCircle,
  UserCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  Flag,
  Sparkles,
  Calendar,
  Briefcase
} from 'lucide-react';
import { ServiceListing } from '../types.js';
import {
  buildServiceCallHref,
  buildServiceWhatsAppHref,
  submitServiceReport,
  trackServiceView,
  trackServiceWhatsAppClick
} from '../services/servicesMarketplace.js';
import { useAuth } from '../context/AuthContext.js';
import { formatNaira } from './ProductCard.js';
import { CeoVerifiedBadge } from './CeoVerifiedBadge.js';

interface ServiceDetailModalProps {
  service: ServiceListing;
  initialShowContact?: boolean;
  onClose: () => void;
  onOpenPromotion?: (service: ServiceListing) => void;
  onStartDirectChat?: (target: { id: string; name: string }) => void;
  onToast?: (msg: string) => void;
}

export const ServiceDetailModal: React.FC<ServiceDetailModalProps> = ({
  service,
  initialShowContact = false,
  onClose,
  onOpenPromotion,
  onStartDirectChat,
  onToast
}) => {
  const { user } = useAuth();
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [showContactCard, setShowContactCard] = useState(initialShowContact);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState('Suspicious pricing or scam');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    trackServiceView(service.serviceId);
  }, [service.serviceId]);

  const photos = service.images || [];
  const activePhoto = photos[activePhotoIdx] || photos[0] || '';
  const priceLabel =
    service.priceDisplay ||
    (service.priceMax && service.priceMax > service.price
      ? `${formatNaira(service.price)} – ${formatNaira(service.priceMax)}`
      : formatNaira(service.price));

  const isOwner = Boolean(
    user && (user.id === service.providerId || user.role === 'admin')
  );

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportDetails.trim()) return;
    setSubmittingReport(true);
    try {
      await submitServiceReport({
        serviceId: service.serviceId,
        serviceName: service.serviceName,
        providerId: service.providerId,
        reason: reportReason,
        details: reportDetails.trim(),
        reporterId: user?.id,
        reporterName: user?.name || 'FU MARKET Visitor'
      });
      setReportSubmitted(true);
      setShowReportForm(false);
      onToast?.('Service report submitted for CEO moderation review.');
    } catch {
      onToast?.('Could not submit report right now. Please try again.');
    } finally {
      setSubmittingReport(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs overflow-y-auto flex items-center justify-center p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label={service.serviceName}
    >
      <div className="relative w-full max-w-3xl bg-white border border-[#E5E7EB] rounded-2xl shadow-2xl overflow-hidden my-4 text-[#111111]">
        {/* Header */}
        <div className="bg-[#0B6B3A] text-white px-5 py-4 flex items-center justify-between gap-4 border-b border-[#14532D]">
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-[#F2B90D] truncate">{service.category}</p>
            <h2 className="text-base sm:text-lg font-black truncate">{service.serviceName}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close service details"
            className="w-9 h-9 rounded-lg bg-[#14532D] hover:bg-[#F2B90D] text-white hover:text-[#111111] flex items-center justify-center transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 max-h-[82vh] overflow-y-auto space-y-5">
          {/* Gallery */}
          <div className="space-y-2.5">
            <div className="w-full aspect-[16/9] rounded-xl overflow-hidden bg-[#F5F5F5] border border-[#E5E7EB]">
              {activePhoto && !imgFailed ? (
                <img
                  src={activePhoto}
                  alt={service.serviceName}
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-[#F0FDF4]">
                  <Briefcase className="w-10 h-10 text-[#0B6B3A] mb-2" />
                  <span className="text-xs font-bold text-[#14532D]">{service.serviceName}</span>
                </div>
              )}
            </div>

            {photos.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {photos.map((url, idx) => (
                  <button
                    key={`${url.slice(0, 20)}-${idx}`}
                    type="button"
                    onClick={() => {
                      setActivePhotoIdx(idx);
                      setImgFailed(false);
                    }}
                    className={`w-16 h-12 rounded-lg overflow-hidden border-2 shrink-0 transition ${
                      idx === activePhotoIdx ? 'border-[#0B6B3A]' : 'border-[#E5E7EB] opacity-75'
                    }`}
                  >
                    <img
                      src={url}
                      alt={`Photo ${idx + 1}`}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Core Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-2 space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#555555]">
                <span className="font-bold text-[#0B6B3A]">{service.category}</span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{service.location}</span>
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <Eye className="w-3.5 h-3.5" />
                  <span>{service.views} views</span>
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Posted {new Date(service.createdAt).toLocaleDateString('en-NG')}</span>
                </span>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-sm font-black text-[#111111]">About This Service</h3>
                <p className="text-xs sm:text-sm text-[#333333] whitespace-pre-line leading-relaxed">
                  {service.description}
                </p>
              </div>
            </div>

            {/* Pricing & Provider Box */}
            <div className="p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl space-y-3 h-fit">
              <div>
                <span className="text-[11px] font-bold text-[#555555]">Service Rate</span>
                <p className="text-xl font-black text-[#0B6B3A] tabular-nums">{priceLabel}</p>
              </div>

              <div className="pt-2 border-t border-[#E5E7EB] space-y-1.5 text-xs">
                <p className="flex items-center gap-1.5 font-bold text-[#111111]">
                  <UserCheck className="w-4 h-4 text-[#0B6B3A] shrink-0" />
                  <span>{service.providerName}</span>
                </p>
                <CeoVerifiedBadge
                  verified={Boolean(service.ceoVerified || service.isVerified)}
                  entityIds={[service.providerId]}
                  customText={service.verifiedBadgeText}
                  variant="compact"
                />
                <p className="flex items-center gap-1.5 font-semibold text-[#444444]">
                  {service.availability === 'available' ? (
                    <CheckCircle2 className="w-4 h-4 text-[#0B6B3A] shrink-0" />
                  ) : service.availability === 'busy' ? (
                    <Clock className="w-4 h-4 text-[#B45309] shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-[#B91C1C] shrink-0" />
                  )}
                  <span>
                    {service.availability === 'available'
                      ? 'Available Now'
                      : service.availability === 'busy'
                      ? 'Busy / By Appointment'
                      : 'Unavailable'}
                  </span>
                </p>
                {service.availabilityNote && (
                  <p className="text-[11px] text-[#555555]">{service.availabilityNote}</p>
                )}
              </div>

              <div className="pt-2 space-y-2">
                <a
                  href={buildServiceWhatsAppHref(service)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackServiceWhatsAppClick(service.serviceId)}
                  className="w-full px-4 py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-black rounded-xl transition flex items-center justify-center gap-2 min-h-[42px]"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp Provider</span>
                </a>

                <a
                  href={buildServiceCallHref(service.phone)}
                  className="w-full px-4 py-2.5 bg-[#F2B90D] hover:bg-[#FFC107] text-[#111111] text-xs font-black rounded-xl transition flex items-center justify-center gap-2 min-h-[42px]"
                >
                  <Phone className="w-4 h-4" />
                  <span>Call {service.phone}</span>
                </a>

                <button
                  type="button"
                  onClick={() => setShowContactCard((prev) => !prev)}
                  className="w-full px-4 py-2.5 bg-[#0B6B3A] hover:bg-[#14532D] text-white text-xs font-bold rounded-xl transition min-h-[40px]"
                >
                  {showContactCard ? 'Hide Contact Info' : 'Contact Provider'}
                </button>
              </div>
            </div>
          </div>

          {showContactCard && (
            <div className="p-4 bg-[#F0FDF4] border border-[#86EFAC] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1 text-xs">
                <p className="font-black text-[#14532D]">
                  Direct Provider Contact — {service.providerName}
                </p>
                <p className="text-[#333333] tabular-nums">
                  Phone: <strong>{service.phone}</strong> · WhatsApp: <strong>{service.whatsapp}</strong>
                </p>
              </div>
              {onStartDirectChat && service.providerId && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onStartDirectChat({
                      id: service.providerId,
                      name: service.providerName
                    });
                  }}
                  className="px-4 py-2 bg-[#111111] hover:bg-[#14532D] text-[#F2B90D] text-xs font-black rounded-xl transition whitespace-nowrap"
                >
                  In-App Direct Chat
                </button>
              )}
            </div>
          )}

          {/* Footer Utilities: Promote (if owner/provider) + Report */}
          <div className="pt-3 border-t border-[#E5E7EB] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {onOpenPromotion && (isOwner || !service.featured) && (
                <button
                  type="button"
                  onClick={() => onOpenPromotion(service)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#FFF7ED] border border-[#FDBA74] hover:bg-[#EA580C] hover:text-white text-[#9A3412] text-xs font-black rounded-xl transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Promote This Service</span>
                </button>
              )}
            </div>

            {reportSubmitted ? (
              <span className="text-xs font-bold text-[#0B6B3A]">
                Report submitted to FU MARKET CEO.
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setShowReportForm((v) => !v)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#666666] hover:text-[#B91C1C] transition"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Report Suspicious Service</span>
              </button>
            )}
          </div>

          {showReportForm && (
            <form
              onSubmit={handleReportSubmit}
              className="p-4 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl space-y-3"
            >
              <p className="text-xs font-black text-[#991B1B]">Report This Service Listing</p>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#FCA5A5] rounded-lg bg-white"
              >
                <option value="Suspicious pricing or scam">Suspicious pricing or scam</option>
                <option value="Fake contact information">Fake contact information</option>
                <option value="Inappropriate or prohibited content">Inappropriate or prohibited content</option>
                <option value="Spam or duplicate listing">Spam or duplicate listing</option>
              </select>
              <textarea
                required
                rows={2}
                maxLength={1000}
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Explain the issue briefly for CEO moderation review..."
                className="w-full px-3 py-2 text-xs border border-[#FCA5A5] rounded-lg bg-white"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReportForm(false)}
                  className="px-3 py-1.5 text-xs font-bold bg-white border border-[#E5E7EB] rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReport}
                  className="px-4 py-1.5 text-xs font-black bg-[#B91C1C] text-white rounded-lg"
                >
                  {submittingReport ? 'Sending...' : 'Submit Report'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
