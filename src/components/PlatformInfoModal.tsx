import React from 'react';
import { X, ShieldCheck, FileText, Mail, Phone, MapPin, MessageCircle } from 'lucide-react';
import { CEO_ADS_PHONE, getCeoAdsWhatsAppUrl } from '../services/ads.js';

export type PlatformInfoTopic = 'privacy' | 'terms' | 'contact';

interface PlatformInfoModalProps {
  topic: PlatformInfoTopic | null;
  onClose: () => void;
  onOpenReportScam?: () => void;
}

export const PlatformInfoModal: React.FC<PlatformInfoModalProps> = ({
  topic,
  onClose,
  onOpenReportScam
}) => {
  if (!topic) return null;

  const meta = {
    privacy: {
      title: 'Privacy Policy',
      subtitle: 'How NIGERIA CAMPUS MARKET protects your student & seller data',
      icon: ShieldCheck
    },
    terms: {
      title: 'Terms of Service',
      subtitle: 'Platform guidelines for campus buyers, sellers, agents, and food vendors',
      icon: FileText
    },
    contact: {
      title: 'Contact NIGERIA CAMPUS MARKET',
      subtitle: 'Official support, institution onboarding & CEO desk channels',
      icon: Mail
    }
  }[topic];

  const Icon = meta.icon;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={meta.title}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg border border-[#D9E5DF] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#10251D] text-white px-5 py-4 flex items-center justify-between gap-3 border-b-2 border-[#D4A62A]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#087443] text-[#D4A62A] flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black">{meta.title}</h3>
              <p className="text-[11px] text-white/80">{meta.subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3 text-xs sm:text-sm text-[#10251D] leading-relaxed max-h-[70vh] overflow-y-auto">
          {topic === 'privacy' && (
            <>
              <p>
                <strong>Data Minimization:</strong> NIGERIA CAMPUS MARKET only stores profile details, listings, campus selections, and order history required to operate student commerce, accommodation inspections, food delivery, and community tools.
              </p>
              <p>
                <strong>Protected Records:</strong> Private messages, confidential emergency reports, and buyer phone numbers are never publicly indexed. Sensitive moderation and verification records require verified administrator authorization.
              </p>
              <p>
                <strong>Newsletter &amp; Alerts:</strong> Email subscriptions and browser alerts are strictly opt-in and can be managed or disabled anytime from your Account or Notification preferences.
              </p>
            </>
          )}

          {topic === 'terms' && (
            <>
              <p>
                <strong>Honest Listings Only:</strong> Sellers, house agents, and food vendors must publish accurate prices, real item photos, and true availability around their selected Nigerian campus.
              </p>
              <p>
                <strong>Physical Inspection Rule:</strong> Buyers are encouraged to inspect items, hostels, and electronic gadgets physically in well-lit, busy campus areas before making direct payment. Never send advance inspection fees without verification.
              </p>
              <p>
                <strong>Zero Scam Tolerance:</strong> Fraudulent listings, impersonation, spam, or abusive behaviour result in immediate account suspension and security audit logging by platform administrators.
              </p>
            </>
          )}

          {topic === 'contact' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-[#F4F8F5] border border-[#D9E5DF] space-y-2 text-xs">
                <p className="flex items-center gap-2 font-bold">
                  <Phone className="w-4 h-4 text-[#087443] shrink-0" />
                  <span className="tabular-nums">Official CEO &amp; Ads Desk: {CEO_ADS_PHONE}</span>
                </p>
                <p className="flex items-center gap-2 font-bold">
                  <MapPin className="w-4 h-4 text-[#087443] shrink-0" />
                  <span>Coverage: All 36 States &amp; FCT Nigerian Campuses (HQ: Wukari, Taraba)</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href={getCeoAdsWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-[#087443] hover:bg-[#065D36] text-white text-xs font-black inline-flex items-center gap-1.5"
                >
                  <MessageCircle className="w-4 h-4 text-[#D4A62A]" />
                  <span>Message Support on WhatsApp</span>
                </a>
                {onOpenReportScam && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenReportScam();
                    }}
                    className="px-4 py-2.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-black cursor-pointer"
                  >
                    Report Scam / Suspicious Activity
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
