import React, { useState } from 'react';
import {
  ShieldCheck,
  MessageCircle,
  Download,
  Home,
  HelpCircle,
  MapPin,
  Briefcase,
  Siren,
  Megaphone,
  Globe,
  Utensils,
  Calculator,
  BookOpen,
  Gift,
  Mail,
  CheckCircle2,
  Loader2,
  Share2,
  GraduationCap,
  FileText
} from 'lucide-react';
import { Category, Institution } from '../types.js';
import { usePWAInstall } from '../hooks/usePWAInstall.js';
import { AppView } from './BottomNav.js';
import { CEO_ADS_PHONE, getCeoAdsWhatsAppUrl } from '../services/ads.js';
import { PlatformInfoTopic } from './PlatformInfoModal.js';

interface FooterProps {
  categories: Category[];
  onSelectCategory: (catId: string) => void;
  onOpenSellModal: () => void;
  onOpenSafetyModal: () => void;
  onNavigateView: (view: AppView) => void;
  onTriggerPWAHelp: () => void;
  onOpenAdvertiseModal?: () => void;
  onOpenServicesSection?: () => void;
  onOpenEmergencySection?: () => void;
  onOpenPostServiceModal?: () => void;
  onOpenServiceProviderDashboard?: () => void;
  onOpenCeoPortal?: () => void;
  activeInstitution?: Institution;
  onOpenDownloadApp?: () => void;
  onOpenNationwideSearch?: () => void;
  onOpenSubscriptions?: () => void;
  onOpenInstitutionSwitcher?: () => void;
  onOpenInfoModal?: (topic: PlatformInfoTopic) => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenSellModal,
  onOpenSafetyModal,
  onNavigateView,
  onTriggerPWAHelp,
  onOpenAdvertiseModal,
  onOpenEmergencySection,
  onOpenCeoPortal,
  activeInstitution,
  onOpenDownloadApp,
  onOpenNationwideSearch,
  onOpenInstitutionSwitcher,
  onOpenInfoModal
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [newsletterStatus, setNewsletterStatus] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  const handleInstall = async () => {
    if (isInstallable) {
      const res = await install();
      if (res === 'unavailable') onTriggerPWAHelp();
    } else {
      onTriggerPWAHelp();
    }
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newsletterEmail.trim();
    if (!trimmed) return;
    setNewsletterLoading(true);
    setNewsletterStatus(null);
    try {
      const resp = await fetch('/api/ecosystem/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, source: 'footer' })
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(json?.error || 'Could not subscribe. Please check your email.');
      }
      setNewsletterStatus({
        type: 'success',
        text: json?.message || 'Subscribed to NIGERIA CAMPUS MARKET updates!'
      });
      setNewsletterEmail('');
    } catch (err: any) {
      setNewsletterStatus({
        type: 'error',
        text: err?.message || 'Unable to subscribe right now.'
      });
    } finally {
      setNewsletterLoading(false);
    }
  };

  const handleSharePlatform = async () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.origin : '';
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'NIGERIA CAMPUS MARKET',
          text: 'Buy. Sell. Connect. Grow Across Nigerian Campuses.',
          url: shareUrl
        });
        return;
      }
      if (navigator.clipboard && shareUrl) {
        await navigator.clipboard.writeText(shareUrl);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2500);
      }
    } catch {
      // Ignore cancelled native share
    }
  };

  const instShort = activeInstitution?.shortName || 'NATIONWIDE';

  return (
    <footer className="bg-[#202B26] text-white pt-10 pb-24 sm:pb-10 border-t-4 border-[#F2C94C] text-xs">
      <div className="max-w-7xl mx-auto px-4">
        {/* 5-Column Professional Footer */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-7 pb-8 border-b border-white/15">
          {/* Column 1: Brand Information and Social Media */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#F2C94C] flex items-center justify-center font-black text-[#202B26] text-xs shrink-0">
                NCM
              </div>
              <div>
                <span className="font-display font-black text-base tracking-tight text-[#F2C94C] block leading-none">
                  NIGERIA CAMPUS MARKET
                </span>
                <span className="text-[10px] font-bold tracking-wider uppercase text-white/85 block mt-0.5">
                  Your Campus Network
                </span>
              </div>
            </div>

            <p className="text-white/80 text-xs leading-relaxed">
              Buy. Sell. Connect. Grow Across Nigerian Campuses. Verified student marketplace, hostels, jobs, food ordering, and academic tools across 36 states &amp; FCT.
            </p>

            <p className="text-[11px] text-white/80 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#F2C94C] shrink-0" />
              <span className="truncate">
                {activeInstitution
                  ? `${activeInstitution.shortName} · ${activeInstitution.state} State`
                  : 'All Nigerian Campuses'}
              </span>
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <a
                href={getCeoAdsWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1.5 rounded-lg bg-[#075B3B] hover:bg-[#0B8050] text-white font-bold text-[11px] inline-flex items-center gap-1"
              >
                <MessageCircle className="w-3.5 h-3.5 text-[#F2C94C]" />
                <span>WhatsApp</span>
              </a>
              <button
                type="button"
                onClick={handleSharePlatform}
                className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-[#F2C94C]" />
                <span>{shareCopied ? 'Link Copied' : 'Share'}</span>
              </button>
              <button
                type="button"
                onClick={() => (onOpenDownloadApp ? onOpenDownloadApp() : handleInstall())}
                className="px-2.5 py-1.5 rounded-lg bg-[#F2C94C] hover:bg-[#E0B43B] text-[#202B26] font-black text-[11px] inline-flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isInstalled ? 'PWA Options' : isIOS ? 'iOS App' : 'Install App'}</span>
              </button>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h5 className="font-bold text-xs uppercase tracking-wider text-[#F2C94C] mb-3">
              Quick Links
            </h5>
            <ul className="space-y-2 text-white/85">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigateView('home')}
                  className="hover:text-[#F2C94C] transition cursor-pointer"
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigateView('marketplace')}
                  className="hover:text-[#F2C94C] transition cursor-pointer"
                >
                  Marketplace
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenInstitutionSwitcher?.()}
                  className="hover:text-[#F2C94C] flex items-center gap-1.5 transition cursor-pointer"
                >
                  <GraduationCap className="w-3.5 h-3.5 text-[#F2C94C]" />
                  <span>Explore Universities</span>
                </button>
              </li>
              {onOpenNationwideSearch && (
                <li>
                  <button
                    type="button"
                    onClick={onOpenNationwideSearch}
                    className="hover:text-[#F2C94C] flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Globe className="w-3.5 h-3.5 text-[#F2C94C]" />
                    <span>Nationwide Search</span>
                  </button>
                </li>
              )}
              <li>
                <button
                  type="button"
                  onClick={() => onNavigateView('requests')}
                  className="hover:text-[#F2C94C] flex items-center gap-1.5 transition cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-[#F2C94C]" />
                  <span>What Students Need</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenSellModal}
                  className="text-[#F2C94C] hover:text-[#E0B43B] font-black transition cursor-pointer"
                >
                  Start Selling for Free
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Student Services */}
          <div>
            <h5 className="font-bold text-xs uppercase tracking-wider text-[#F2C94C] mb-3">
              Student Services
            </h5>
            <ul className="space-y-2 text-white/85">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigateView('hux')}
                  className="hover:text-[#F2C94C] flex items-center gap-1.5 cursor-pointer"
                >
                  <Home className="w-3.5 h-3.5 text-[#F2C94C]" /> Accommodation &amp; Hostels
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigateView('jobs')}
                  className="hover:text-[#F2C94C] flex items-center gap-1.5 cursor-pointer"
                >
                  <Briefcase className="w-3.5 h-3.5 text-[#F2C94C]" /> Jobs &amp; Internships
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigateView('food')}
                  className="hover:text-[#F2C94C] flex items-center gap-1.5 cursor-pointer"
                >
                  <Utensils className="w-3.5 h-3.5 text-[#F2C94C]" /> Campus Food Ordering
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigateView('books')}
                  className="hover:text-[#F2C94C] flex items-center gap-1.5 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 text-[#F2C94C]" /> Books &amp; Study Materials
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigateView('gpa')}
                  className="hover:text-[#F2C94C] flex items-center gap-1.5 cursor-pointer"
                >
                  <Calculator className="w-3.5 h-3.5 text-[#F2C94C]" /> GPA &amp; CGPA Calculator
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigateView('deals')}
                  className="hover:text-[#F2C94C] flex items-center gap-1.5 cursor-pointer"
                >
                  <Gift className="w-3.5 h-3.5 text-[#F2C94C]" /> Student Deals &amp; Giveaways
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Help and Support */}
          <div>
            <h5 className="font-bold text-xs uppercase tracking-wider text-[#F2C94C] mb-3">
              Help and Support
            </h5>
            <ul className="space-y-2 text-white/85">
              <li>
                <button
                  type="button"
                  onClick={() => onOpenInfoModal?.('privacy')}
                  className="hover:text-[#F2C94C] flex items-center gap-1.5 cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#F2C94C]" /> Privacy Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenInfoModal?.('terms')}
                  className="hover:text-[#F2C94C] flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-[#F2C94C]" /> Terms of Service
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenInfoModal?.('contact')}
                  className="hover:text-[#F2C94C] flex items-center gap-1.5 cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5 text-[#F2C94C]" /> Contact Us
                </button>
              </li>
              {onOpenEmergencySection && (
                <li>
                  <button
                    type="button"
                    onClick={onOpenEmergencySection}
                    className="text-[#F87171] hover:text-white font-black flex items-center gap-1.5 cursor-pointer"
                  >
                    <Siren className="w-3.5 h-3.5" /> Report Scam &amp; Emergency
                  </button>
                </li>
              )}
              <li>
                <button
                  type="button"
                  onClick={onOpenSafetyModal}
                  className="hover:text-[#F2C94C] transition cursor-pointer"
                >
                  Campus Safety Rules
                </button>
              </li>
              {onOpenAdvertiseModal && (
                <li>
                  <button
                    type="button"
                    onClick={onOpenAdvertiseModal}
                    className="text-[#F2C94C] hover:text-white font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Megaphone className="w-3.5 h-3.5" /> Advertise Your Business
                  </button>
                </li>
              )}
              <li>
                <a
                  href={getCeoAdsWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/80 hover:text-[#F2C94C] font-semibold inline-flex items-center gap-1.5"
                >
                  <Megaphone className="w-3.5 h-3.5 text-[#F2C94C]" /> Ads WhatsApp ({CEO_ADS_PHONE})
                </a>
              </li>
            </ul>
          </div>

          {/* Column 5: Stay Connected and Newsletter */}
          <div className="space-y-3">
            <h5 className="font-bold text-xs uppercase tracking-wider text-[#F2C94C]">
              Stay Connected &amp; Newsletter
            </h5>
            <p className="text-white/80 text-xs leading-relaxed">
              Get weekly campus deals, hostel alerts, job openings, and safety notices straight in your inbox.
            </p>
            <form onSubmit={handleSubscribe} className="space-y-2">
              <input
                type="email"
                required
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="you@university.edu.ng"
                aria-label="Email address for newsletter"
                className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 focus:border-[#F2C94C] text-white placeholder-white/50 text-xs outline-none"
              />
              <button
                type="submit"
                disabled={newsletterLoading}
                className="w-full py-2 px-3 rounded-xl bg-[#075B3B] hover:bg-[#0B8050] border border-[#F2C94C]/50 text-white font-black text-xs flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-60"
              >
                {newsletterLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Mail className="w-3.5 h-3.5 text-[#F2C94C]" />
                )}
                <span>{newsletterLoading ? 'Subscribing...' : 'Subscribe'}</span>
              </button>
            </form>
            {newsletterStatus && (
              <p
                className={`text-[11px] font-semibold flex items-start gap-1.5 ${
                  newsletterStatus.type === 'success' ? 'text-[#F2C94C]' : 'text-[#F87171]'
                }`}
              >
                {newsletterStatus.type === 'success' && (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                )}
                <span>{newsletterStatus.text}</span>
              </p>
            )}
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-white/90">
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-semibold">
              © {new Date().getFullYear()} NIGERIA CAMPUS MARKET — Buy. Sell. Connect. Grow Across Nigerian Campuses.
            </p>
            {onOpenCeoPortal && (
              <button
                type="button"
                onClick={onOpenCeoPortal}
                className="text-white/65 hover:text-[#F2C94C] font-bold underline-offset-2 hover:underline transition cursor-pointer"
              >
                CEO Portal
              </button>
            )}
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#075B3B] border border-[#F2C94C]/50 text-[#F2C94C] font-black">
            Active Scope: {instShort}
          </span>
        </div>
      </div>
    </footer>
  );
};
