import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  CreditCard,
  FileWarning,
  Image as ImageIcon,
  Lock,
  LogOut,
  Megaphone,
  Package,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Store,
  Trash2,
  Upload,
  Users,
  X
} from 'lucide-react';
import {
  CeoDashboardSnapshot,
  CEO_EMAIL,
  CEO_ROLE_LABEL,
  CEO_VERIFIED_BADGE_TEXT,
  ceoDeleteAnnouncement,
  ceoDeleteCampusEvent,
  ceoPublishSafetyAnnouncement,
  ceoRemoveVerificationLogo,
  ceoResolveReport,
  ceoUpdateSecuritySettings,
  ceoUpdateUserSuspension,
  ceoUploadAndSaveVerificationLogo,
  ceoVerifyOrUnverifyEntity,
  fetchCeoDashboardSnapshot,
  logoutCeoSession,
  reauthenticateCeoWithGoogle,
  reauthenticateCeoWithPassword
} from '../services/ceoAdmin.js';
import { CeoSessionState, SafetyAnnouncement } from '../types.js';
import { formatNaira } from './ProductCard.js';
import { CeoVerifiedBadge } from './CeoVerifiedBadge.js';
import {
  adminUpdateFirestoreProduct,
  auth,
  deleteProductFromFirestore
} from '../services/firebase.js';
import { adminApproveAndActivateAd, adminUpdateAdvertisement } from '../services/ads.js';
import { adminFeatureService } from '../services/servicesMarketplace.js';

type CeoSectionId =
  | 'verification'
  | 'users'
  | 'sellers'
  | 'businesses'
  | 'ads'
  | 'subscriptions'
  | 'products'
  | 'reports'
  | 'announcements'
  | 'events'
  | 'revenue'
  | 'analytics'
  | 'security_logs'
  | 'settings';

const CEO_SECTIONS: Array<{
  id: CeoSectionId;
  label: string;
  icon: React.FC<{ className?: string }>;
}> = [
  { id: 'verification', label: '1. CEO Verification Centre', icon: BadgeCheck },
  { id: 'users', label: '2. User Management', icon: Users },
  { id: 'sellers', label: '3. Seller Management', icon: Store },
  { id: 'businesses', label: '4. Business Management', icon: Building2 },
  { id: 'ads', label: '5. Advertisement Management', icon: Megaphone },
  { id: 'subscriptions', label: '6. Business Subscriptions', icon: CreditCard },
  { id: 'products', label: '7. Product Moderation', icon: Package },
  { id: 'reports', label: '8. Reports & Complaints', icon: FileWarning },
  { id: 'announcements', label: '9. Website Announcements', icon: AlertTriangle },
  { id: 'events', label: '10. Event Promotions', icon: Calendar },
  { id: 'revenue', label: '11. Revenue & Payments', icon: CreditCard },
  { id: 'analytics', label: '12. Website Analytics', icon: BarChart3 },
  { id: 'security_logs', label: '13. Security Activity Logs', icon: Activity },
  { id: 'settings', label: '14. CEO Settings', icon: Settings }
];

interface CeoSuperAdminDashboardProps {
  session: CeoSessionState;
  onSessionUpdate: (next: CeoSessionState) => void;
  onSessionExpired: () => void;
  onLoggedOut: () => void;
  onBackToMarketplace: () => void;
  onOpenEventsManager?: () => void;
  onOpenAdsMasterModal?: () => void;
}

export const CeoSuperAdminDashboard: React.FC<CeoSuperAdminDashboardProps> = ({
  session,
  onSessionUpdate,
  onSessionExpired,
  onLoggedOut,
  onBackToMarketplace,
  onOpenEventsManager,
  onOpenAdsMasterModal
}) => {
  const [activeSection, setActiveSection] = useState<CeoSectionId>('verification');
  const [snapshot, setSnapshot] = useState<CeoDashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [verificationTab, setVerificationTab] = useState<'users' | 'sellers' | 'ads' | 'services' | 'history'>('sellers');
  const [verificationNote, setVerificationNote] = useState('');
  const [logoProgress, setLogoProgress] = useState<number>(0);

  // Session countdown timer
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    Math.max(0, Math.floor((session.sessionExpiresAt - Date.now()) / 1000))
  );

  // Sensitive action Reauthentication modal state
  const [reauthOpen, setReauthOpen] = useState(false);
  const [reauthPassword, setReauthPassword] = useState('');
  const [reauthPhone, setReauthPhone] = useState('');
  const [reauthError, setReauthError] = useState<string | null>(null);
  const [reauthBusy, setReauthBusy] = useState(false);
  const pendingSensitiveActionRef = useRef<(() => Promise<void>) | null>(null);

  // Safety announcement composer
  const [annTitle, setAnnTitle] = useState('');
  const [annDesc, setAnnDesc] = useState('');
  const [annCat, setAnnCat] = useState<SafetyAnnouncement['category']>('safety_notice');
  const [annSev, setAnnSev] = useState<SafetyAnnouncement['severity']>('important');
  const [annPinned, setAnnPinned] = useState(true);

  // CEO Security settings form
  const [timeoutMins, setTimeoutMins] = useState<number>(60);
  const [requirePhoneCheck, setRequirePhoneCheck] = useState<boolean>(false);
  const [reauthWindowMins, setReauthWindowMins] = useState<number>(10);

  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const flash = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetchCeoDashboardSnapshot();
      setSnapshot(data);
      setTimeoutMins(data.settings.sessionTimeoutMinutes || 60);
      setRequirePhoneCheck(Boolean(data.settings.requirePhoneCheckOnLogin));
      setReauthWindowMins(data.settings.reauthWindowMinutes || 10);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to load CEO dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  // Enforce automatic CEO session timeout
  useEffect(() => {
    const timer = setInterval(() => {
      const secs = Math.max(0, Math.floor((session.sessionExpiresAt - Date.now()) / 1000));
      setRemainingSeconds(secs);
      if (secs <= 0) {
        clearInterval(timer);
        logoutCeoSession().finally(() => onSessionExpired());
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [session.sessionExpiresAt, onSessionExpired]);

  const executeSensitiveAction = async (fn: () => Promise<void>) => {
    setErrorMsg(null);
    try {
      await fn();
    } catch (err: any) {
      if (err?.code === 'CEO_REAUTH_REQUIRED' || String(err?.message || '').includes('reauthentication')) {
        pendingSensitiveActionRef.current = fn;
        setReauthError(null);
        setReauthOpen(true);
      } else {
        setErrorMsg(err?.message || 'Sensitive action failed.');
      }
    }
  };

  const handlePasswordReauth = async (e: React.FormEvent) => {
    e.preventDefault();
    setReauthError(null);
    setReauthBusy(true);
    try {
      const nextSession = await reauthenticateCeoWithPassword(
        reauthPassword,
        reauthPhone.trim() || undefined
      );
      onSessionUpdate(nextSession);
      setReauthPassword('');
      setReauthOpen(false);
      flash('CEO identity reauthenticated.');
      const pending = pendingSensitiveActionRef.current;
      pendingSensitiveActionRef.current = null;
      if (pending) {
        await pending();
      }
    } catch (err: any) {
      setReauthError(err?.message || 'Password reauthentication failed.');
    } finally {
      setReauthBusy(false);
    }
  };

  const handleGoogleReauth = async () => {
    setReauthError(null);
    setReauthBusy(true);
    try {
      const nextSession = await reauthenticateCeoWithGoogle(reauthPhone.trim() || undefined);
      onSessionUpdate(nextSession);
      setReauthOpen(false);
      flash('CEO identity reauthenticated via Google.');
      const pending = pendingSensitiveActionRef.current;
      pendingSensitiveActionRef.current = null;
      if (pending) {
        await pending();
      }
    } catch (err: any) {
      setReauthError(err?.message || 'Google reauthentication failed.');
    } finally {
      setReauthBusy(false);
    }
  };

  const handleLogoFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await executeSensitiveAction(async () => {
      setBusyAction('upload-logo');
      setLogoProgress(5);
      try {
        await ceoUploadAndSaveVerificationLogo(file, (pct) => setLogoProgress(pct));
        flash('Official CEO Verification Logo updated across all verified badges!');
        await loadSnapshot();
      } finally {
        setBusyAction(null);
        setLogoProgress(0);
      }
    });
  };

  const handleRemoveLogo = async () => {
    await executeSensitiveAction(async () => {
      setBusyAction('remove-logo');
      try {
        await ceoRemoveVerificationLogo();
        flash('Official CEO Verification Logo removed. Default shield badge restored.');
        await loadSnapshot();
      } finally {
        setBusyAction(null);
      }
    });
  };

  const handleToggleVerification = async (params: {
    targetType: 'user' | 'seller' | 'advertisement' | 'service';
    targetId: string;
    targetName: string;
    currentlyVerified: boolean;
    linkedUserId?: string;
  }) => {
    setBusyAction(`verify-${params.targetId}`);
    setErrorMsg(null);
    try {
      await ceoVerifyOrUnverifyEntity({
        targetType: params.targetType,
        targetId: params.targetId,
        targetName: params.targetName,
        verify: !params.currentlyVerified,
        linkedUserId: params.linkedUserId,
        notes: verificationNote.trim() || undefined
      });
      setVerificationNote('');
      flash(
        `${params.targetName} is now ${!params.currentlyVerified ? CEO_VERIFIED_BADGE_TEXT : 'UNVERIFIED'}.`
      );
      await loadSnapshot();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update verification status.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeSensitiveAction(async () => {
      setBusyAction('save-settings');
      try {
        await ceoUpdateSecuritySettings({
          sessionTimeoutMinutes: timeoutMins,
          requirePhoneCheckOnLogin: requirePhoneCheck,
          reauthWindowMinutes: reauthWindowMins
        });
        flash('CEO security settings updated.');
        await loadSnapshot();
      } finally {
        setBusyAction(null);
      }
    });
  };

  const handleSecureLogout = async () => {
    await logoutCeoSession();
    onLoggedOut();
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  };

  const q = searchTerm.trim().toLowerCase();

  // Real Analytics & Revenue calculations (ZERO fake data)
  const analytics = useMemo(() => {
    if (!snapshot) {
      return {
        totalUsers: 0,
        totalSellers: 0,
        verifiedSellers: 0,
        verifiedUsers: 0,
        totalProducts: 0,
        activeProducts: 0,
        productViews: 0,
        productWhatsappClicks: 0,
        totalAds: 0,
        liveAds: 0,
        adImpressions: 0,
        adClicks: 0,
        totalServices: 0,
        activeServices: 0,
        serviceViews: 0,
        pendingReports: 0,
        verifiedAdRevenueNaira: 0,
        verifiedServicePromoNaira: 0
      };
    }

    const totalProductViews = snapshot.products.reduce((s, p) => s + (p.views || 0), 0);
    const totalProductWa = snapshot.products.reduce((s, p) => s + (p.whatsappClicks || 0), 0);
    const totalAdImp = snapshot.advertisements.reduce((s, a) => s + (a.impressions || 0), 0);
    const totalAdClicks = snapshot.advertisements.reduce(
      (s, a) => s + (a.clicks || 0) + (a.whatsappClicks || 0),
      0
    );
    const totalSvcViews = snapshot.services.reduce((s, sv) => s + (sv.views || 0), 0);

    const pendingReports =
      snapshot.reports.productReports.filter((r) => r.status === 'pending').length +
      snapshot.reports.announcementReports.filter((r) => r.status === 'pending').length +
      snapshot.reports.serviceReports.filter((r) => r.status === 'pending').length +
      snapshot.reports.huxReports.filter((r) => !r.status || r.status === 'pending').length;

    const paymentRecordsTotal = snapshot.adPayments
      .filter((p) => p.status === 'verified')
      .reduce((s, p) => s + (Number(p.amountNaira) || 0), 0);

    const paidAdsFallback =
      paymentRecordsTotal > 0
        ? paymentRecordsTotal
        : snapshot.advertisements
            .filter((a) => a.paymentStatus === 'paid')
            .reduce((s, a) => s + (Number(a.packagePrice) || 0), 0);

    const paidSvcPromo = snapshot.services
      .filter((sv) => sv.promotionStatus === 'active' && (sv.promotionPrice || 0) > 0)
      .reduce((s, sv) => s + (Number(sv.promotionPrice) || 0), 0);

    return {
      totalUsers: snapshot.users.length,
      totalSellers: snapshot.sellers.length,
      verifiedSellers: snapshot.sellers.filter((s) => s.ceoVerified || s.isVerified).length,
      verifiedUsers: snapshot.users.filter((u) => u.ceoVerified || u.isVerified).length,
      totalProducts: snapshot.products.length,
      activeProducts: snapshot.products.filter((p) => p.status === 'active').length,
      productViews: totalProductViews,
      productWhatsappClicks: totalProductWa,
      totalAds: snapshot.advertisements.length,
      liveAds: snapshot.advertisements.filter((a) => a.status === 'active' && !a.isDeleted).length,
      adImpressions: totalAdImp,
      adClicks: totalAdClicks,
      totalServices: snapshot.services.length,
      activeServices: snapshot.services.filter((sv) => sv.status === 'active').length,
      serviceViews: totalSvcViews,
      pendingReports,
      verifiedAdRevenueNaira: paidAdsFallback,
      verifiedServicePromoNaira: paidSvcPromo
    };
  }, [snapshot]);

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#111111] flex flex-col">
      {/* Executive Header */}
      <header className="sticky top-0 z-30 bg-[#0B6B3A] text-white border-b-4 border-[#F2B90D] shadow-md">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#111111] border border-[#F2B90D]/60 text-[#F2B90D] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-base sm:text-lg font-black tracking-tight truncate">
                  FU MARKET CEO SUPER ADMIN DASHBOARD
                </h1>
                <span className="px-2 py-0.5 rounded bg-[#F2B90D] text-[#111111] text-[10px] font-black uppercase tracking-wider">
                  {CEO_ROLE_LABEL}
                </span>
              </div>
              <p className="text-[11px] text-emerald-100 truncate">
                Authenticated: <strong>{auth.currentUser?.email || session.email}</strong>
                {session.phoneVerified ? ' • Phone Verified (08167258121)' : ''} • Session expires in{' '}
                <strong className="font-mono text-[#F2B90D]">{formatTimer(remainingSeconds)}</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={loadSnapshot}
              disabled={loading}
              className="px-3 py-2 rounded-xl bg-[#14532D] hover:bg-black/30 border border-white/20 text-xs font-bold flex items-center gap-1.5 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#F2B90D] ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              type="button"
              onClick={() => {
                pendingSensitiveActionRef.current = null;
                setReauthOpen(true);
              }}
              className="px-3 py-2 rounded-xl bg-[#14532D] hover:bg-black/30 border border-white/20 text-xs font-bold flex items-center gap-1.5 transition"
            >
              <Lock className="w-3.5 h-3.5 text-[#F2B90D]" />
              <span>Reauthenticate</span>
            </button>
            <button
              type="button"
              onClick={onBackToMarketplace}
              className="px-3 py-2 rounded-xl bg-white hover:bg-[#F5F5F5] text-[#0B6B3A] text-xs font-black flex items-center gap-1.5 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Marketplace</span>
            </button>
            <button
              type="button"
              onClick={handleSecureLogout}
              className="px-3 py-2 rounded-xl bg-[#111111] hover:bg-black text-[#F2B90D] text-xs font-black flex items-center gap-1.5 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Secure Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-5 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Navigation Sidebar */}
        <aside className="lg:col-span-3 space-y-3">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-3 shadow-xs">
            <div className="relative mb-2">
              <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search records..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] text-xs font-medium outline-none focus:border-[#0B6B3A]"
              />
            </div>
            <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
              {CEO_SECTIONS.map((sec) => {
                const Icon = sec.icon;
                const active = activeSection === sec.id;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => setActiveSection(sec.id)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-left whitespace-nowrap transition shrink-0 ${
                      active
                        ? 'bg-[#0B6B3A] text-white shadow-xs'
                        : 'text-[#333333] hover:bg-[#F5F5F5]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#F2B90D]' : 'text-[#0B6B3A]'}`} />
                    <span className="truncate">{sec.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Live Summary Mini Stats */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 shadow-xs space-y-2 text-xs">
            <p className="font-black uppercase tracking-wider text-[10px] text-[#555555]">
              Live Platform Pulse
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
                <span className="text-[10px] text-[#555555] block">Users</span>
                <strong className="text-base font-black text-[#111111] tabular-nums">
                  {analytics.totalUsers}
                </strong>
              </div>
              <div className="p-2.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
                <span className="text-[10px] text-[#555555] block">Verified</span>
                <strong className="text-base font-black text-[#0B6B3A] tabular-nums">
                  {analytics.verifiedSellers + analytics.verifiedUsers}
                </strong>
              </div>
              <div className="p-2.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
                <span className="text-[10px] text-[#555555] block">Products</span>
                <strong className="text-base font-black text-[#111111] tabular-nums">
                  {analytics.totalProducts}
                </strong>
              </div>
              <div className="p-2.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
                <span className="text-[10px] text-[#555555] block">Open Reports</span>
                <strong className="text-base font-black text-[#B45309] tabular-nums">
                  {analytics.pendingReports}
                </strong>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Panel */}
        <main className="lg:col-span-9 space-y-4">
          {statusMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-[#0B6B3A] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{statusMsg}</span>
            </div>
          )}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs font-bold text-red-800 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                {errorMsg}
              </span>
              <button type="button" onClick={() => setErrorMsg(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {loading && !snapshot ? (
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-12 text-center text-sm font-bold text-[#555555]">
              Loading live Firestore and CEO security records...
            </div>
          ) : snapshot ? (
            <>
              {/* 1. CEO VERIFICATION CENTRE */}
              {activeSection === 'verification' && (
                <div className="space-y-4">
                  {/* Official Verification Logo Manager */}
                  <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h2 className="text-base sm:text-lg font-black text-[#111111]">
                          Official CEO Verification Logo & Badge Preview
                        </h2>
                        <p className="text-xs text-[#555555] mt-0.5">
                          Only you ({CEO_EMAIL}) can upload, replace, or remove this logo or verify users, sellers, businesses, ads, and services.
                        </p>
                      </div>
                      <CeoVerifiedBadge verified variant="banner" />
                    </div>

                    <div className="flex flex-wrap items-center gap-4 p-4 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB]">
                      <div className="w-16 h-16 rounded-2xl border-2 border-[#0B6B3A] bg-white overflow-hidden flex items-center justify-center shrink-0">
                        {snapshot.verificationConfig.logoUrl ? (
                          <img
                            src={snapshot.verificationConfig.logoUrl}
                            alt="Official CEO Verification Logo"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="w-7 h-7 text-[#0B6B3A]/50" />
                        )}
                      </div>

                      <div className="flex-1 min-w-[220px] space-y-1">
                        <p className="text-xs font-black text-[#111111]">
                          Badge Wording: <span className="text-[#0B6B3A]">{CEO_VERIFIED_BADGE_TEXT}</span>
                        </p>
                        <p className="text-[11px] text-[#555555]">
                          {snapshot.verificationConfig.logoUrl
                            ? `Custom official logo active${
                                snapshot.verificationConfig.updatedAt
                                  ? ` • Updated ${new Date(snapshot.verificationConfig.updatedAt).toLocaleString()}`
                                  : ''
                              }`
                            : 'No custom verification logo uploaded yet. Shield icon is active.'}
                        </p>
                        {logoProgress > 0 && (
                          <div className="w-full max-w-xs h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden mt-1">
                            <div
                              className="h-full bg-[#0B6B3A] transition-all"
                              style={{ width: `${logoProgress}%` }}
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={handleLogoFileSelected}
                        />
                        <button
                          type="button"
                          onClick={() => logoInputRef.current?.click()}
                          disabled={busyAction === 'upload-logo'}
                          className="px-3.5 py-2 rounded-xl bg-[#0B6B3A] hover:bg-[#14532D] text-white text-xs font-black flex items-center gap-1.5 transition"
                        >
                          <Upload className="w-3.5 h-3.5 text-[#F2B90D]" />
                          <span>
                            {busyAction === 'upload-logo'
                              ? 'Uploading...'
                              : snapshot.verificationConfig.logoUrl
                              ? 'Replace Logo'
                              : 'Upload Official Logo'}
                          </span>
                        </button>
                        {snapshot.verificationConfig.logoUrl && (
                          <button
                            type="button"
                            onClick={handleRemoveLogo}
                            disabled={busyAction === 'remove-logo'}
                            className="px-3.5 py-2 rounded-xl bg-[#111111] hover:bg-black text-[#F2B90D] text-xs font-black flex items-center gap-1.5 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove Logo</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Verification Target Tabs */}
                  <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-1.5">
                        {(
                          [
                            ['sellers', `Sellers (${snapshot.sellers.length})`],
                            ['users', `Users (${snapshot.users.length})`],
                            ['ads', `Businesses & Ads (${snapshot.advertisements.length})`],
                            ['services', `Services (${snapshot.services.length})`],
                            ['history', `Audit History (${snapshot.verificationLogs.length})`]
                          ] as const
                        ).map(([tabId, label]) => (
                          <button
                            key={tabId}
                            type="button"
                            onClick={() => setVerificationTab(tabId)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                              verificationTab === tabId
                                ? 'bg-[#0B6B3A] text-white'
                                : 'bg-[#F5F5F5] text-[#333333] hover:bg-[#E5E7EB]'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={verificationNote}
                        onChange={(e) => setVerificationNote(e.target.value)}
                        placeholder="Optional CEO verification note..."
                        className="px-3 py-1.5 rounded-xl border border-[#E5E7EB] text-xs w-full sm:w-64 outline-none focus:border-[#0B6B3A]"
                      />
                    </div>

                    {verificationTab === 'sellers' && (
                      <div className="divide-y divide-[#E5E7EB]">
                        {snapshot.sellers
                          .filter(
                            (s) =>
                              !q ||
                              s.shopName.toLowerCase().includes(q) ||
                              s.whatsappNumber.toLowerCase().includes(q)
                          )
                          .map((s) => {
                            const verified = Boolean(s.ceoVerified || s.isVerified);
                            return (
                              <div
                                key={s.id}
                                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                              >
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-black text-sm text-[#111111]">
                                      {s.shopName}
                                    </span>
                                    <CeoVerifiedBadge verified={verified} variant="compact" />
                                  </div>
                                  <p className="text-[11px] text-[#555555] mt-0.5">
                                    {s.city}, {s.state} • WhatsApp: {s.whatsappNumber || 'N/A'}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  disabled={busyAction === `verify-${s.id}`}
                                  onClick={() =>
                                    handleToggleVerification({
                                      targetType: 'seller',
                                      targetId: s.id,
                                      targetName: s.shopName,
                                      currentlyVerified: verified,
                                      linkedUserId: s.userId
                                    })
                                  }
                                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition shrink-0 ${
                                    verified
                                      ? 'bg-[#111111] text-[#F2B90D] hover:bg-black'
                                      : 'bg-[#0B6B3A] text-white hover:bg-[#14532D]'
                                  }`}
                                >
                                  {busyAction === `verify-${s.id}`
                                    ? 'Updating...'
                                    : verified
                                    ? 'Revoke Verification'
                                    : 'Verify Seller'}
                                </button>
                              </div>
                            );
                          })}
                      </div>
                    )}

                    {verificationTab === 'users' && (
                      <div className="divide-y divide-[#E5E7EB]">
                        {snapshot.users
                          .filter(
                            (u) =>
                              !q ||
                              u.name.toLowerCase().includes(q) ||
                              u.email.toLowerCase().includes(q)
                          )
                          .map((u) => {
                            const verified = Boolean(u.ceoVerified || u.isVerified);
                            return (
                              <div
                                key={u.id}
                                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                              >
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-black text-sm text-[#111111]">
                                      {u.name}
                                    </span>
                                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#F5F5F5] text-[#555555]">
                                      {u.role}
                                    </span>
                                    <CeoVerifiedBadge verified={verified} variant="compact" />
                                  </div>
                                  <p className="text-[11px] text-[#555555] mt-0.5">
                                    {u.email} • {u.phone || u.whatsappNumber || 'No phone'}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  disabled={busyAction === `verify-${u.id}`}
                                  onClick={() =>
                                    handleToggleVerification({
                                      targetType: 'user',
                                      targetId: u.id,
                                      targetName: u.name,
                                      currentlyVerified: verified
                                    })
                                  }
                                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition shrink-0 ${
                                    verified
                                      ? 'bg-[#111111] text-[#F2B90D]'
                                      : 'bg-[#0B6B3A] text-white'
                                  }`}
                                >
                                  {busyAction === `verify-${u.id}`
                                    ? 'Updating...'
                                    : verified
                                    ? 'Unverify User'
                                    : 'Verify User'}
                                </button>
                              </div>
                            );
                          })}
                      </div>
                    )}

                    {verificationTab === 'ads' && (
                      <div className="divide-y divide-[#E5E7EB]">
                        {snapshot.advertisements
                          .filter(
                            (a) =>
                              !q ||
                              a.businessName.toLowerCase().includes(q) ||
                              a.title.toLowerCase().includes(q)
                          )
                          .map((ad) => {
                            const verified = Boolean(ad.ceoVerified || ad.isVerified);
                            return (
                              <div
                                key={ad.id}
                                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                              >
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-black text-sm text-[#111111]">
                                      {ad.businessName}
                                    </span>
                                    <CeoVerifiedBadge verified={verified} variant="compact" />
                                  </div>
                                  <p className="text-[11px] text-[#555555] mt-0.5 truncate">
                                    {ad.title} • {ad.status.toUpperCase()} ({ad.paymentStatus})
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  disabled={busyAction === `verify-${ad.id}`}
                                  onClick={() =>
                                    handleToggleVerification({
                                      targetType: 'advertisement',
                                      targetId: ad.id,
                                      targetName: ad.businessName,
                                      currentlyVerified: verified
                                    })
                                  }
                                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition shrink-0 ${
                                    verified
                                      ? 'bg-[#111111] text-[#F2B90D]'
                                      : 'bg-[#0B6B3A] text-white'
                                  }`}
                                >
                                  {verified ? 'Unverify Business' : 'Verify Business'}
                                </button>
                              </div>
                            );
                          })}
                      </div>
                    )}

                    {verificationTab === 'services' && (
                      <div className="divide-y divide-[#E5E7EB]">
                        {snapshot.services
                          .filter(
                            (sv) =>
                              !q ||
                              sv.serviceName.toLowerCase().includes(q) ||
                              sv.providerName.toLowerCase().includes(q)
                          )
                          .map((sv) => {
                            const verified = Boolean(sv.ceoVerified || sv.isVerified);
                            return (
                              <div
                                key={sv.serviceId}
                                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                              >
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-black text-sm text-[#111111]">
                                      {sv.serviceName}
                                    </span>
                                    <CeoVerifiedBadge verified={verified} variant="compact" />
                                  </div>
                                  <p className="text-[11px] text-[#555555] mt-0.5">
                                    Provider: {sv.providerName} • {sv.category} • {formatNaira(sv.price)}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  disabled={busyAction === `verify-${sv.serviceId}`}
                                  onClick={() =>
                                    handleToggleVerification({
                                      targetType: 'service',
                                      targetId: sv.serviceId,
                                      targetName: sv.serviceName,
                                      currentlyVerified: verified
                                    })
                                  }
                                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition shrink-0 ${
                                    verified
                                      ? 'bg-[#111111] text-[#F2B90D]'
                                      : 'bg-[#0B6B3A] text-white'
                                  }`}
                                >
                                  {verified ? 'Unverify Service' : 'Verify Service'}
                                </button>
                              </div>
                            );
                          })}
                      </div>
                    )}

                    {verificationTab === 'history' && (
                      <div className="space-y-2 max-h-[460px] overflow-y-auto">
                        {snapshot.verificationLogs.length === 0 ? (
                          <p className="text-xs text-[#555555] py-6 text-center">
                            No CEO verification changes recorded yet.
                          </p>
                        ) : (
                          snapshot.verificationLogs.map((log) => (
                            <div
                              key={log.id}
                              className="p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                            >
                              <div>
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase mr-2 ${
                                    log.action === 'VERIFIED' || log.action === 'LOGO_UPDATED'
                                      ? 'bg-emerald-100 text-[#0B6B3A]'
                                      : 'bg-amber-100 text-amber-900'
                                  }`}
                                >
                                  {log.action}
                                </span>
                                <strong className="text-[#111111]">{log.targetName}</strong>{' '}
                                <span className="text-[#555555]">({log.targetType})</span>
                                {log.notes && <p className="text-[11px] text-[#555555] mt-1">Note: {log.notes}</p>}
                              </div>
                              <span className="text-[11px] text-[#6B7280] shrink-0">
                                {new Date(log.createdAt).toLocaleString()}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 2. USER MANAGEMENT */}
              {activeSection === 'users' && (
                <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base sm:text-lg font-black">
                      User Management ({snapshot.users.length})
                    </h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F9FAFB] text-[#555555] uppercase text-[10px] border-b border-[#E5E7EB]">
                        <tr>
                          <th className="p-3">User</th>
                          <th className="p-3">Role</th>
                          <th className="p-3">Verification</th>
                          <th className="p-3">Actions (Reauth Protected)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E7EB]">
                        {snapshot.users
                          .filter(
                            (u) =>
                              !q ||
                              u.name.toLowerCase().includes(q) ||
                              u.email.toLowerCase().includes(q)
                          )
                          .map((u) => {
                            const verified = Boolean(u.ceoVerified || u.isVerified);
                            const isSelfCeo = u.email.toLowerCase() === CEO_EMAIL;
                            return (
                              <tr key={u.id}>
                                <td className="p-3">
                                  <p className="font-bold text-[#111111]">{u.name}</p>
                                  <p className="text-[11px] text-[#555555]">{u.email}</p>
                                </td>
                                <td className="p-3 uppercase font-bold text-[10px]">{u.role}</td>
                                <td className="p-3">
                                  {verified ? (
                                    <CeoVerifiedBadge verified variant="compact" />
                                  ) : (
                                    <span className="text-[11px] text-[#6B7280]">Unverified</span>
                                  )}
                                </td>
                                <td className="p-3">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleToggleVerification({
                                          targetType: 'user',
                                          targetId: u.id,
                                          targetName: u.name,
                                          currentlyVerified: verified
                                        })
                                      }
                                      className="px-2.5 py-1 rounded-lg bg-emerald-50 text-[#0B6B3A] border border-emerald-200 font-bold text-[11px]"
                                    >
                                      {verified ? 'Unverify' : 'Verify'}
                                    </button>
                                    {!isSelfCeo && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          executeSensitiveAction(async () => {
                                            await ceoUpdateUserSuspension({
                                              userId: u.id,
                                              suspend: !u.isSuspended,
                                              reason: u.isSuspended
                                                ? undefined
                                                : 'Suspended by FU MARKET CEO'
                                            });
                                            flash(
                                              `${u.name} is now ${
                                                !u.isSuspended ? 'SUSPENDED' : 'ACTIVE'
                                              }.`
                                            );
                                            await loadSnapshot();
                                          })
                                        }
                                        className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${
                                          u.isSuspended
                                            ? 'bg-[#0B6B3A] text-white'
                                            : 'bg-[#111111] text-[#F2B90D]'
                                        }`}
                                      >
                                        {u.isSuspended ? 'Reactivate' : 'Suspend'}
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 3. SELLER MANAGEMENT */}
              {activeSection === 'sellers' && (
                <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-xs space-y-4">
                  <h2 className="text-base sm:text-lg font-black">
                    Seller Management ({snapshot.sellers.length} Storefronts)
                  </h2>
                  <div className="divide-y divide-[#E5E7EB]">
                    {snapshot.sellers
                      .filter(
                        (s) =>
                          !q ||
                          s.shopName.toLowerCase().includes(q) ||
                          s.city.toLowerCase().includes(q)
                      )
                      .map((s) => {
                        const verified = Boolean(s.ceoVerified || s.isVerified);
                        const listingsCount = snapshot.products.filter(
                          (p) => p.sellerId === s.userId || p.sellerId === s.id
                        ).length;
                        return (
                          <div
                            key={s.id}
                            className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-black text-sm">{s.shopName}</span>
                                <CeoVerifiedBadge verified={verified} variant="compact" />
                                {s.isSuspended && (
                                  <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-black">
                                    SUSPENDED
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-[#555555]">
                                {s.city}, {s.state} • {listingsCount} Listings • WhatsApp:{' '}
                                {s.whatsappNumber}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                handleToggleVerification({
                                  targetType: 'seller',
                                  targetId: s.id,
                                  targetName: s.shopName,
                                  currentlyVerified: verified,
                                  linkedUserId: s.userId
                                })
                              }
                              className={`px-3.5 py-2 rounded-xl text-xs font-black ${
                                verified ? 'bg-[#111111] text-[#F2B90D]' : 'bg-[#0B6B3A] text-white'
                              }`}
                            >
                              {verified ? 'Unverify Storefront' : 'Verify Storefront'}
                            </button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* 4. BUSINESS MANAGEMENT */}
              {activeSection === 'businesses' && (
                <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-xs space-y-4">
                  <h2 className="text-base sm:text-lg font-black">
                    Business Directory (Advertisers & Service Providers)
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {snapshot.advertisements.map((ad) => (
                      <div key={ad.id} className="p-3.5 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB]">
                        <div className="flex items-center justify-between gap-2">
                          <strong className="text-sm">{ad.businessName}</strong>
                          <CeoVerifiedBadge verified={Boolean(ad.ceoVerified || ad.isVerified)} variant="compact" />
                        </div>
                        <p className="text-[11px] text-[#555555] mt-1">
                          Advertiser • {ad.businessCategory} • Owner: {ad.ownerName}
                        </p>
                      </div>
                    ))}
                    {snapshot.services.map((sv) => (
                      <div key={sv.serviceId} className="p-3.5 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB]">
                        <div className="flex items-center justify-between gap-2">
                          <strong className="text-sm">{sv.providerName}</strong>
                          <CeoVerifiedBadge verified={Boolean(sv.ceoVerified || sv.isVerified)} variant="compact" />
                        </div>
                        <p className="text-[11px] text-[#555555] mt-1">
                          Service Provider • {sv.serviceName} ({sv.category})
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 5. ADVERTISEMENT MANAGEMENT */}
              {activeSection === 'ads' && (
                <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-base sm:text-lg font-black">
                      Advertisement Management ({snapshot.advertisements.length})
                    </h2>
                    {onOpenAdsMasterModal && (
                      <button
                        type="button"
                        onClick={onOpenAdsMasterModal}
                        className="px-3.5 py-2 rounded-xl bg-[#0B6B3A] text-white text-xs font-black"
                      >
                        Open Full Ads Master Control
                      </button>
                    )}
                  </div>
                  <div className="divide-y divide-[#E5E7EB]">
                    {snapshot.advertisements.map((ad) => (
                      <div
                        key={ad.id}
                        className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-black text-sm">{ad.businessName}</span>
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#F5F5F5] border border-[#E5E7EB]">
                              {ad.status}
                            </span>
                            <CeoVerifiedBadge verified={Boolean(ad.ceoVerified || ad.isVerified)} variant="compact" />
                          </div>
                          <p className="text-[11px] text-[#555555]">
                            {ad.title} • {ad.packageName} ({formatNaira(ad.packagePrice)}) •{' '}
                            {ad.impressions} views / {ad.clicks} clicks
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              await adminApproveAndActivateAd(ad);
                              flash(`Approved ad "${ad.businessName}".`);
                              await loadSnapshot();
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#0B6B3A] text-white text-xs font-bold"
                          >
                            Approve & Publish
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await adminUpdateAdvertisement(ad, { status: 'paused' }, 'pause');
                              flash(`Paused ad "${ad.businessName}".`);
                              await loadSnapshot();
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#F5F5F5] border border-[#E5E7EB] text-xs font-bold"
                          >
                            Pause
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 6. BUSINESS SUBSCRIPTIONS */}
              {activeSection === 'subscriptions' && (
                <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-xs space-y-4">
                  <h2 className="text-base sm:text-lg font-black">
                    Business Subscription & Promotion Plans
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB]">
                      <h3 className="text-xs font-black uppercase text-[#0B6B3A] mb-2">
                        Active Ad Subscriptions ({snapshot.advertisements.filter((a) => a.status === 'active').length})
                      </h3>
                      <div className="space-y-2 text-xs">
                        {snapshot.advertisements
                          .filter((a) => a.paymentStatus === 'paid')
                          .map((a) => (
                            <div key={a.id} className="flex justify-between gap-2 bg-white p-2.5 rounded-lg border border-[#E5E7EB]">
                              <div>
                                <strong>{a.businessName}</strong>
                                <span className="block text-[10px] text-[#555555]">
                                  {a.packageId.toUpperCase()} • Expires{' '}
                                  {a.expiryDate ? new Date(a.expiryDate).toLocaleDateString() : 'N/A'}
                                </span>
                              </div>
                              <strong className="text-[#0B6B3A]">{formatNaira(a.packagePrice)}</strong>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB]">
                      <h3 className="text-xs font-black uppercase text-[#0B6B3A] mb-2">
                        Promoted Student Services (
                        {snapshot.services.filter((s) => s.promotionStatus === 'active').length})
                      </h3>
                      <div className="space-y-2 text-xs">
                        {snapshot.services
                          .filter((s) => s.promotionPlan && s.promotionPlan !== 'none')
                          .map((sv) => (
                            <div key={sv.serviceId} className="flex justify-between gap-2 bg-white p-2.5 rounded-lg border border-[#E5E7EB]">
                              <div>
                                <strong>{sv.serviceName}</strong>
                                <span className="block text-[10px] text-[#555555]">
                                  Plan: {sv.promotionPlan} ({sv.promotionStatus})
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={async () => {
                                  await adminFeatureService(sv, { featured: true });
                                  flash(`Activated service promotion for ${sv.serviceName}`);
                                  await loadSnapshot();
                                }}
                                className="px-2.5 py-1 rounded bg-[#0B6B3A] text-white text-[10px] font-bold self-center"
                              >
                                Activate
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 7. PRODUCT MODERATION */}
              {activeSection === 'products' && (
                <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-xs space-y-4">
                  <h2 className="text-base sm:text-lg font-black">
                    Product Moderation ({snapshot.products.length} Live Listings)
                  </h2>
                  <div className="divide-y divide-[#E5E7EB] max-h-[540px] overflow-y-auto">
                    {snapshot.products
                      .filter(
                        (p) =>
                          !q ||
                          p.title.toLowerCase().includes(q) ||
                          p.sellerName.toLowerCase().includes(q)
                      )
                      .slice(0, 80)
                      .map((p) => (
                        <div
                          key={p.id}
                          className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="font-bold text-sm truncate">{p.title}</p>
                            <p className="text-[11px] text-[#555555]">
                              {formatNaira(p.price)} • {p.sellerName} • Status:{' '}
                              <strong>{p.moderationStatus || 'approved'}</strong>
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={async () => {
                                await adminUpdateFirestoreProduct(p.id, { moderationStatus: 'approved' });
                                flash(`Approved "${p.title}".`);
                                await loadSnapshot();
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#0B6B3A] text-white text-[11px] font-bold"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                await adminUpdateFirestoreProduct(p.id, { moderationStatus: 'rejected' });
                                flash(`Rejected "${p.title}".`);
                                await loadSnapshot();
                              }}
                              className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 text-[11px] font-bold"
                            >
                              Reject
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                await deleteProductFromFirestore(p.id);
                                flash(`Deleted "${p.title}".`);
                                await loadSnapshot();
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#111111] text-[#F2B90D] text-[11px] font-bold"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* 8. REPORTS & COMPLAINTS */}
              {activeSection === 'reports' && (
                <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-xs space-y-4">
                  <h2 className="text-base sm:text-lg font-black">
                    Reports & Complaints ({analytics.pendingReports} Pending)
                  </h2>
                  <div className="space-y-2.5">
                    {snapshot.reports.productReports.map((r) => (
                      <div key={r.id} className="p-3.5 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div>
                          <span className="font-black text-[#0B6B3A]">Product Report • {r.reason}</span>
                          <p className="font-bold text-[#111111]">{r.productTitle || r.productId}</p>
                          <p className="text-[#555555]">{r.details}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={async () => {
                              await ceoResolveReport('reports', r.id, 'resolved');
                              await loadSnapshot();
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#0B6B3A] text-white font-bold"
                          >
                            Resolve ({r.status})
                          </button>
                        </div>
                      </div>
                    ))}
                    {snapshot.reports.serviceReports.map((r) => (
                      <div key={r.id} className="p-3.5 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div>
                          <span className="font-black text-[#0B6B3A]">Service Report • {r.reason}</span>
                          <p className="font-bold text-[#111111]">{r.serviceName}</p>
                          <p className="text-[#555555]">{r.details}</p>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            await ceoResolveReport('serviceReports', r.id, 'resolved');
                            await loadSnapshot();
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#0B6B3A] text-white font-bold shrink-0"
                        >
                          Resolve ({r.status})
                        </button>
                      </div>
                    ))}
                    {snapshot.reports.announcementReports.map((r) => (
                      <div key={r.id} className="p-3.5 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div>
                          <span className="font-black text-[#0B6B3A]">Announcement Report • {r.reason}</span>
                          <p className="font-bold text-[#111111]">{r.postTitle}</p>
                          <p className="text-[#555555]">{r.details}</p>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            await ceoResolveReport('announcement_reports', r.id, 'resolved');
                            await loadSnapshot();
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#0B6B3A] text-white font-bold shrink-0"
                        >
                          Resolve ({r.status})
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 9. WEBSITE ANNOUNCEMENTS */}
              {activeSection === 'announcements' && (
                <div className="space-y-4">
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!annTitle.trim() || !annDesc.trim()) return;
                      await ceoPublishSafetyAnnouncement({
                        title: annTitle,
                        description: annDesc,
                        category: annCat,
                        severity: annSev,
                        isPinned: annPinned
                      });
                      setAnnTitle('');
                      setAnnDesc('');
                      flash('Official CEO campus safety/website notice published.');
                      await loadSnapshot();
                    }}
                    className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-xs space-y-3"
                  >
                    <h2 className="text-base font-black">Publish Official Website / Safety Notice</h2>
                    <input
                      type="text"
                      required
                      value={annTitle}
                      onChange={(e) => setAnnTitle(e.target.value)}
                      placeholder="Announcement headline..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] text-xs font-semibold"
                    />
                    <textarea
                      required
                      rows={3}
                      value={annDesc}
                      onChange={(e) => setAnnDesc(e.target.value)}
                      placeholder="Detailed announcement content..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] text-xs"
                    />
                    <div className="flex flex-wrap items-center gap-3">
                      <select
                        value={annCat}
                        onChange={(e) => setAnnCat(e.target.value as any)}
                        className="px-3 py-2 rounded-xl border border-[#E5E7EB] text-xs font-bold"
                      >
                        <option value="safety_notice">Safety Notice</option>
                        <option value="security_warning">Security Warning</option>
                        <option value="fire_safety">Fire Safety</option>
                        <option value="service_update">Service Update</option>
                      </select>
                      <select
                        value={annSev}
                        onChange={(e) => setAnnSev(e.target.value as any)}
                        className="px-3 py-2 rounded-xl border border-[#E5E7EB] text-xs font-bold"
                      >
                        <option value="info">Info</option>
                        <option value="important">Important</option>
                        <option value="urgent">Urgent</option>
                      </select>
                      <label className="flex items-center gap-1.5 text-xs font-bold">
                        <input
                          type="checkbox"
                          checked={annPinned}
                          onChange={(e) => setAnnPinned(e.target.checked)}
                        />
                        Pin Notice
                      </label>
                      <button
                        type="submit"
                        className="ml-auto px-4 py-2 rounded-xl bg-[#0B6B3A] text-white text-xs font-black"
                      >
                        Publish Announcement
                      </button>
                    </div>
                  </form>

                  <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-xs space-y-2">
                    <h3 className="text-sm font-black">
                      Active Safety, General & Sports Announcements (
                      {snapshot.announcements.safety.length +
                        snapshot.announcements.general.length +
                        snapshot.announcements.sports.length}
                      )
                    </h3>
                    {snapshot.announcements.safety.map((a) => (
                      <div key={a.id} className="p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] flex justify-between gap-2 text-xs">
                        <div>
                          <strong className="block">{a.title}</strong>
                          <span className="text-[#555555]">Safety ({a.severity})</span>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            await ceoDeleteAnnouncement('safety_announcements', a.id);
                            await loadSnapshot();
                          }}
                          className="text-red-700 font-bold"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 10. EVENT PROMOTIONS */}
              {activeSection === 'events' && (
                <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-base sm:text-lg font-black">
                      Event Promotions ({snapshot.events.length})
                    </h2>
                    {onOpenEventsManager && (
                      <button
                        type="button"
                        onClick={onOpenEventsManager}
                        className="px-3.5 py-2 rounded-xl bg-[#0B6B3A] text-white text-xs font-black"
                      >
                        Open Birthday & Events Publisher
                      </button>
                    )}
                  </div>
                  <div className="divide-y divide-[#E5E7EB]">
                    {snapshot.events.map((ev) => (
                      <div key={ev.id} className="py-3 flex justify-between items-center gap-3 text-xs">
                        <div>
                          <strong className="text-sm block">{ev.celebrantName}</strong>
                          <span className="text-[#555555]">
                            {ev.eventType} • {ev.eventDate} • {ev.venue} ({ev.status})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            await ceoDeleteCampusEvent(ev.id);
                            flash(`Removed event "${ev.celebrantName}".`);
                            await loadSnapshot();
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#111111] text-[#F2B90D] font-bold"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 11. REVENUE & PAYMENT REPORTS */}
              {activeSection === 'revenue' && (
                <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-xs space-y-4">
                  <h2 className="text-base sm:text-lg font-black">
                    Revenue & Payment Reports (Real Records Only)
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                      <span className="text-[11px] font-bold text-[#0B6B3A] block">Verified Ad Revenue</span>
                      <strong className="text-xl font-black text-[#111111] tabular-nums">
                        {formatNaira(analytics.verifiedAdRevenueNaira)}
                      </strong>
                    </div>
                    <div className="p-4 rounded-xl bg-[#FFF8DB] border border-[#F2B90D]/50">
                      <span className="text-[11px] font-bold text-[#111111] block">Service Promo Revenue</span>
                      <strong className="text-xl font-black text-[#111111] tabular-nums">
                        {formatNaira(analytics.verifiedServicePromoNaira)}
                      </strong>
                    </div>
                    <div className="p-4 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
                      <span className="text-[11px] font-bold text-[#555555] block">Combined Total</span>
                      <strong className="text-xl font-black text-[#0B6B3A] tabular-nums">
                        {formatNaira(analytics.verifiedAdRevenueNaira + analytics.verifiedServicePromoNaira)}
                      </strong>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {snapshot.adPayments.length === 0 ? (
                      <p className="text-xs text-[#555555] py-4">No verified payment transactions recorded yet.</p>
                    ) : (
                      snapshot.adPayments.map((pay) => (
                        <div key={pay.id} className="p-3 rounded-xl border border-[#E5E7EB] flex justify-between text-xs">
                          <div>
                            <strong>{pay.businessName}</strong>
                            <span className="block text-[11px] text-[#555555]">
                              Ref: {pay.reference} • {pay.provider} ({pay.status})
                            </span>
                          </div>
                          <strong className="text-[#0B6B3A]">{formatNaira(pay.amountNaira)}</strong>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* 12. WEBSITE ANALYTICS */}
              {activeSection === 'analytics' && (
                <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-xs space-y-4">
                  <h2 className="text-base sm:text-lg font-black">
                    Live FU MARKET Website Analytics (Real Firestore Totals)
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
                      <span className="text-[#555555] block">Registered Users</span>
                      <strong className="text-lg font-black">{analytics.totalUsers}</strong>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
                      <span className="text-[#555555] block">Active Products</span>
                      <strong className="text-lg font-black">{analytics.activeProducts}</strong>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
                      <span className="text-[#555555] block">Product Views</span>
                      <strong className="text-lg font-black">{analytics.productViews.toLocaleString()}</strong>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
                      <span className="text-[#555555] block">WhatsApp Clicks</span>
                      <strong className="text-lg font-black">{analytics.productWhatsappClicks.toLocaleString()}</strong>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
                      <span className="text-[#555555] block">Live Sponsored Ads</span>
                      <strong className="text-lg font-black">{analytics.liveAds}</strong>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
                      <span className="text-[#555555] block">Ad Impressions</span>
                      <strong className="text-lg font-black">{analytics.adImpressions.toLocaleString()}</strong>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
                      <span className="text-[#555555] block">Active Services</span>
                      <strong className="text-lg font-black">{analytics.activeServices}</strong>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
                      <span className="text-[#555555] block">Service Views</span>
                      <strong className="text-lg font-black">{analytics.serviceViews.toLocaleString()}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* 13. SECURITY ACTIVITY LOGS */}
              {activeSection === 'security_logs' && (
                <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-xs space-y-4">
                  <h2 className="text-base sm:text-lg font-black">
                    Security Activity Logs ({snapshot.securityLogs.length} Events)
                  </h2>
                  <div className="space-y-2 max-h-[540px] overflow-y-auto">
                    {snapshot.securityLogs.length === 0 ? (
                      <p className="text-xs text-[#555555] py-6 text-center">No security events recorded yet.</p>
                    ) : (
                      snapshot.securityLogs.map((log) => (
                        <div
                          key={log.id}
                          className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                            log.severity === 'critical'
                              ? 'bg-red-50 border-red-200'
                              : log.severity === 'warning'
                              ? 'bg-amber-50 border-amber-200'
                              : 'bg-[#F9FAFB] border-[#E5E7EB]'
                          }`}
                        >
                          <div className="min-w-0">
                            <span className="font-black uppercase text-[10px] tracking-wider mr-2">
                              {log.eventType}
                            </span>
                            {log.actorEmail && (
                              <span className="text-[11px] font-bold text-[#0B6B3A]">
                                {log.actorEmail}
                              </span>
                            )}
                            <p className="text-[#111111] mt-0.5">{log.summary}</p>
                          </div>
                          <span className="text-[11px] text-[#555555] shrink-0">
                            {new Date(log.createdAt).toLocaleString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* 14. CEO SETTINGS */}
              {activeSection === 'settings' && (
                <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-xs space-y-5">
                  <div>
                    <h2 className="text-base sm:text-lg font-black">CEO Security & Session Settings</h2>
                    <p className="text-xs text-[#555555] mt-0.5">
                      Modifying security policies requires recent CEO identity reauthentication.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] text-xs space-y-1">
                    <p>
                      <strong>Authorized CEO Email:</strong> {CEO_EMAIL}
                    </p>
                    <p>
                      <strong>Authorized CEO Phone:</strong> 08167258121
                    </p>
                    <p>
                      <strong>Token Verification:</strong> {session.verificationMethod || 'Cryptographic Firebase JWT'}
                    </p>
                    <p>
                      <strong>Firebase Custom Claim Status:</strong>{' '}
                      <span className="font-bold text-[#0B6B3A]">
                        {session.customClaim?.message ||
                          (snapshot.adminSdkConfigured
                            ? 'Custom claim { ceoAdmin: true } active'
                            : 'Verified via RS256 JWKS + Identity Toolkit (set FIREBASE_SERVICE_ACCOUNT_KEY to attach Admin SDK custom claims)')}
                      </span>
                    </p>
                  </div>

                  <form onSubmit={handleSaveSettings} className="space-y-4 max-w-md">
                    <div>
                      <label className="block text-xs font-bold text-[#333333] mb-1">
                        Session Timeout Duration (Minutes: 10–240)
                      </label>
                      <input
                        type="number"
                        min={10}
                        max={240}
                        value={timeoutMins}
                        onChange={(e) => setTimeoutMins(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#333333] mb-1">
                        Sensitive Action Reauth Window (Minutes: 2–30)
                      </label>
                      <input
                        type="number"
                        min={2}
                        max={30}
                        value={reauthWindowMins}
                        onChange={(e) => setReauthWindowMins(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] text-xs font-bold"
                      />
                    </div>
                    <label className="flex items-center gap-2 text-xs font-bold">
                      <input
                        type="checkbox"
                        checked={requirePhoneCheck}
                        onChange={(e) => setRequirePhoneCheck(e.target.checked)}
                      />
                      <span>Require CEO phone check (08167258121) on every CEO login</span>
                    </label>
                    <button
                      type="submit"
                      disabled={busyAction === 'save-settings'}
                      className="px-4 py-2.5 rounded-xl bg-[#0B6B3A] hover:bg-[#14532D] text-white text-xs font-black"
                    >
                      {busyAction === 'save-settings' ? 'Saving...' : 'Save Security Settings'}
                    </button>
                  </form>
                </div>
              )}
            </>
          ) : null}
        </main>
      </div>

      {/* Sensitive Action Reauthentication Modal */}
      {reauthOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-[#E5E7EB] shadow-2xl overflow-hidden">
            <div className="bg-[#0B6B3A] text-white px-5 py-4 flex items-center justify-between border-b-4 border-[#F2B90D]">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#F2B90D]" />
                <h3 className="text-sm font-black uppercase tracking-wider">
                  CEO Sensitive Action Reauthentication
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  pendingSensitiveActionRef.current = null;
                  setReauthOpen(false);
                }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-[#555555]">
                Confirm your identity for <strong>{CEO_EMAIL}</strong> to proceed with this sensitive CEO operation.
              </p>

              {reauthError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-800">
                  {reauthError}
                </div>
              )}

              <form onSubmit={handlePasswordReauth} className="space-y-3">
                <input
                  type="password"
                  required
                  value={reauthPassword}
                  onChange={(e) => setReauthPassword(e.target.value)}
                  placeholder="Enter your CEO Firebase password"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D1D5DB] text-xs font-medium"
                />
                <input
                  type="tel"
                  value={reauthPhone}
                  onChange={(e) => setReauthPhone(e.target.value)}
                  placeholder="Optional CEO phone verification"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D1D5DB] text-xs font-medium"
                />
                <button
                  type="submit"
                  disabled={reauthBusy}
                  className="w-full py-2.5 rounded-xl bg-[#0B6B3A] text-white text-xs font-black"
                >
                  {reauthBusy ? 'Verifying...' : 'Confirm Password & Continue'}
                </button>
              </form>

              <button
                type="button"
                onClick={handleGoogleReauth}
                disabled={reauthBusy}
                className="w-full py-2.5 rounded-xl bg-[#111111] text-[#F2B90D] text-xs font-black"
              >
                Reauthenticate via Google Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
