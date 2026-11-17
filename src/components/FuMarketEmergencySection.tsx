import React, { useMemo, useState } from 'react';
import {
  Phone,
  AlertOctagon,
  ShieldAlert,
  HeartPulse,
  Flame,
  PackageSearch,
  ShieldCheck,
  Search,
  Bell,
  BellOff,
  Sliders,
  Megaphone,
  CheckCircle2
} from 'lucide-react';
import { EmergencyContact, SafetyAnnouncement } from '../types.js';
import {
  SAFETY_ANNOUNCEMENT_CATEGORIES,
  buildEmergencyCallHref,
  getNotificationPermissionState,
  isSafetyNotificationsOptedIn,
  isWebNotificationSupported,
  requestSafetyNotificationPermission,
  setSafetyNotificationsOptedIn
} from '../services/emergencyCentre.js';
import { isAuthorizedCeo } from '../services/events.js';
import { useAuth } from '../context/AuthContext.js';
import { DirectoryFilter } from './EmergencyContactDirectoryModal.js';

interface FuMarketEmergencySectionProps {
  contacts: EmergencyContact[];
  announcements: SafetyAnnouncement[];
  lostFoundCount: number;
  onOpenContacts: (filter?: DirectoryFilter) => void;
  onOpenReportEmergency: (defaultCategory?: string) => void;
  onOpenSecurityConcern: () => void;
  onOpenLostAndFound: () => void;
  onOpenSafetyInfo: () => void;
  onOpenTrackReport: () => void;
  onOpenAdminEmergency?: () => void;
}

export const FuMarketEmergencySection: React.FC<FuMarketEmergencySectionProps> = ({
  contacts,
  announcements,
  lostFoundCount,
  onOpenContacts,
  onOpenReportEmergency,
  onOpenSecurityConcern,
  onOpenLostAndFound,
  onOpenSafetyInfo,
  onOpenTrackReport,
  onOpenAdminEmergency
}) => {
  const { user } = useAuth();
  const isCeo = isAuthorizedCeo(user);
  const notificationsSupported = isWebNotificationSupported();
  const [notifyOptedIn, setNotifyOptedIn] = useState<boolean>(() =>
    isSafetyNotificationsOptedIn()
  );
  const [notifyFeedback, setNotifyFeedback] = useState<string | null>(null);

  const verifiedContacts = useMemo(
    () => contacts.filter((c) => c.verified),
    [contacts]
  );

  const urgentAnnouncement = useMemo(() => announcements[0] || null, [announcements]);

  const handleToggleAlerts = async () => {
    setNotifyFeedback(null);
    if (!notificationsSupported) {
      setNotifyFeedback('Browser push notifications are not supported on this device.');
      return;
    }

    if (notifyOptedIn) {
      setSafetyNotificationsOptedIn(false);
      setNotifyOptedIn(false);
      setNotifyFeedback('Campus safety browser alerts paused on this device.');
      return;
    }

    const res = await requestSafetyNotificationPermission();
    setNotifyOptedIn(res.granted);
    if (res.granted) {
      setNotifyFeedback('Safety alert notifications enabled for new official FUWUKARI notices.');
    } else if (res.status === 'denied') {
      setNotifyFeedback('Notification permission blocked in browser settings.');
    } else {
      setNotifyFeedback('Permission request dismissed.');
    }
  };

  const categoryLabel = (cat: SafetyAnnouncement['category']) =>
    SAFETY_ANNOUNCEMENT_CATEGORIES.find((c) => c.id === cat)?.label || 'Safety Notice';

  const permissionState = getNotificationPermissionState();

  return (
    <section
      id="fu-market-campus-emergency"
      className="scroll-mt-24 rounded-3xl overflow-hidden border border-[#0F1E3D]/15 bg-white shadow-sm"
    >
      {/* Royal Navy Safety Banner Header */}
      <div className="bg-[#10251D] text-white p-5 sm:p-7 border-b border-[#18362B]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <span className="inline-block text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded bg-[#DC2626] text-white">
              National Campus Safety Desk
            </span>
            <h2 className="font-display text-xl sm:text-2xl font-black tracking-tight text-white">
              NIGERIA CAMPUS MARKET CAMPUS EMERGENCY &amp; HELP CENTRE
            </h2>
            <p className="text-xs sm:text-sm text-white/85 font-medium">
              Your Safety Matters. Get Help. Report Concerns. Stay Informed.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenTrackReport}
              className="min-h-[44px] px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/25 text-white text-xs font-black rounded-xl inline-flex items-center gap-2 transition"
            >
              <Search className="w-4 h-4" />
              <span>Track Report Status</span>
            </button>

            {notificationsSupported && (
              <button
                type="button"
                onClick={handleToggleAlerts}
                className={`min-h-[44px] px-4 py-2 text-xs font-black rounded-xl inline-flex items-center gap-2 transition ${
                  notifyOptedIn
                    ? 'bg-[#087443] hover:bg-[#065D36] text-white border border-[#16A34A]'
                    : 'bg-white text-[#0F1E3D] hover:bg-[#F8FAFC]'
                }`}
              >
                {notifyOptedIn ? (
                  <>
                    <Bell className="w-4 h-4" />
                    <span>Safety Alerts On</span>
                  </>
                ) : (
                  <>
                    <BellOff className="w-4 h-4" />
                    <span>Enable Safety Alerts</span>
                  </>
                )}
              </button>
            )}

            {isCeo && onOpenAdminEmergency && (
              <button
                type="button"
                onClick={onOpenAdminEmergency}
                className="min-h-[44px] px-4 py-2 bg-[#D4A62A] hover:bg-[#E0B43B] text-[#10251D] text-xs font-black rounded-xl inline-flex items-center gap-1.5 transition"
              >
                <Sliders className="w-4 h-4" />
                <span>Manage Emergency Centre</span>
              </button>
            )}
          </div>
        </div>

        {(notifyFeedback || permissionState === 'denied') && (
          <p className="text-[11px] text-white/85 mt-3">
            {notifyFeedback ||
              'Browser notifications are currently blocked in your browser settings.'}
          </p>
        )}
      </div>

      {/* Body */}
      <div className="p-5 sm:p-6 space-y-5 bg-white">
        {/* Live Official Safety Announcement Strip (Only when real active alerts exist) */}
        {urgentAnnouncement && (
          <div
            className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-start justify-between gap-3 ${
              urgentAnnouncement.severity === 'urgent'
                ? 'bg-[#FEF2F2] border-[#FECACA] text-[#7F1D1D]'
                : urgentAnnouncement.severity === 'important'
                ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#78350F]'
                : 'bg-[#F8FAFC] border-[#CBD5E1] text-[#0F1E3D]'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white ${
                  urgentAnnouncement.severity === 'urgent'
                    ? 'bg-[#DC2626]'
                    : urgentAnnouncement.severity === 'important'
                    ? 'bg-[#D97706]'
                    : 'bg-[#0F1E3D]'
                }`}
              >
                <Megaphone className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-wide">
                  <span>{categoryLabel(urgentAnnouncement.category)}</span>
                  <span>·</span>
                  <span className="tabular-nums">
                    {new Date(urgentAnnouncement.publishedAt).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-sm font-black">{urgentAnnouncement.title}</h3>
                <p className="text-xs leading-relaxed opacity-90">
                  {urgentAnnouncement.description}
                </p>
              </div>
            </div>
            {announcements.length > 1 && (
              <span className="text-[11px] font-bold shrink-0 tabular-nums opacity-80">
                +{announcements.length - 1} more alert{announcements.length - 1 === 1 ? '' : 's'}
              </span>
            )}
          </div>
        )}

        {/* Quick Verified Emergency Contacts Strip (Strictly real verified records only) */}
        {verifiedContacts.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-black text-[#087443]">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Verified Quick-Dial Numbers:</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {verifiedContacts.slice(0, 3).map((contact) => (
                <a
                  key={contact.id}
                  href={buildEmergencyCallHref(contact.phone)}
                  className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#087443] hover:bg-[#065D36] text-white text-xs font-black inline-flex items-center gap-1.5 transition"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>
                    {contact.name} ({contact.phone})
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Required 7 Core Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Emergency Contacts */}
          <button
            type="button"
            onClick={() => onOpenContacts('all')}
            className="min-h-[60px] p-4 rounded-2xl bg-[#0F1E3D] hover:bg-[#16294F] text-white text-left flex items-center gap-3 transition"
          >
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <Phone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="font-black text-sm block">Emergency Contacts</span>
              <span className="text-[11px] text-white/80 tabular-nums">
                {contacts.length > 0
                  ? `${verifiedContacts.length} verified · ${contacts.length} listed`
                  : 'Verified campus & local lines'}
              </span>
            </div>
          </button>

          {/* 2. Report an Emergency */}
          <button
            type="button"
            onClick={() => onOpenReportEmergency()}
            className="min-h-[60px] p-4 rounded-2xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-left flex items-center gap-3 transition"
          >
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="font-black text-sm block">Report an Emergency</span>
              <span className="text-[11px] text-white/90">
                Urgent incident &amp; Help Centre log
              </span>
            </div>
          </button>

          {/* 3. Report a Security Concern */}
          <button
            type="button"
            onClick={onOpenSecurityConcern}
            className="min-h-[60px] p-4 rounded-2xl bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#CBD5E1] text-[#0F1E3D] text-left flex items-center gap-3 transition"
          >
            <div className="w-10 h-10 rounded-xl bg-[#0F1E3D] text-white flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="font-black text-sm block">Report a Security Concern</span>
              <span className="text-[11px] text-[#475569]">
                Confidential safety &amp; scam alerts
              </span>
            </div>
          </button>

          {/* 4. Medical Assistance */}
          <button
            type="button"
            onClick={() => onOpenContacts('medical')}
            className="min-h-[60px] p-4 rounded-2xl bg-[#F8FAFC] hover:bg-[#FEF2F2] border border-[#CBD5E1] hover:border-[#FECACA] text-[#0F1E3D] text-left flex items-center gap-3 transition"
          >
            <div className="w-10 h-10 rounded-xl bg-[#DC2626] text-white flex items-center justify-center shrink-0">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="font-black text-sm block">Medical Assistance</span>
              <span className="text-[11px] text-[#475569]">
                University Health Centre &amp; clinic
              </span>
            </div>
          </button>

          {/* 5. Fire Emergency */}
          <button
            type="button"
            onClick={() => onOpenContacts('fire')}
            className="min-h-[60px] p-4 rounded-2xl bg-[#F8FAFC] hover:bg-[#FEF2F2] border border-[#CBD5E1] hover:border-[#FECACA] text-[#0F1E3D] text-left flex items-center gap-3 transition"
          >
            <div className="w-10 h-10 rounded-xl bg-[#B91C1C] text-white flex items-center justify-center shrink-0">
              <Flame className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="font-black text-sm block">Fire Emergency</span>
              <span className="text-[11px] text-[#475569]">
                Fire &amp; Rescue lines &amp; evacuation
              </span>
            </div>
          </button>

          {/* 6. Lost and Found */}
          <button
            type="button"
            onClick={onOpenLostAndFound}
            className="min-h-[60px] p-4 rounded-2xl bg-[#F8FAFC] hover:bg-[#ECFDF5] border border-[#CBD5E1] hover:border-[#A7F3D0] text-[#0F1E3D] text-left flex items-center gap-3 transition"
          >
            <div className="w-10 h-10 rounded-xl bg-[#087443] text-white flex items-center justify-center shrink-0">
              <PackageSearch className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="font-black text-sm block">Lost and Found</span>
              <span className="text-[11px] text-[#475569] tabular-nums">
                {lostFoundCount > 0
                  ? `${lostFoundCount} active campus item${lostFoundCount === 1 ? '' : 's'}`
                  : 'Phones, ID cards, wallets & bags'}
              </span>
            </div>
          </button>

          {/* 7. Campus Safety Information */}
          <button
            type="button"
            onClick={onOpenSafetyInfo}
            className="min-h-[60px] sm:col-span-2 p-4 rounded-2xl bg-[#ECFDF5] hover:bg-[#D1FAE5] border border-[#A7F3D0] text-[#087443] text-left flex items-center gap-3 transition"
          >
            <div className="w-10 h-10 rounded-xl bg-[#087443] text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="font-black text-sm block">Campus Safety Information</span>
              <span className="text-[11px] text-[#065D36]">
                Personal safety, night movement, scam awareness, phone theft tips &amp; emergency procedures
              </span>
            </div>
          </button>
        </div>
      </div>
    </section>
  );
};
