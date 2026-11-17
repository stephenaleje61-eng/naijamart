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
  Layers,
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
  X,
  GraduationCap,
  Smartphone,
  UserCheck,
  Download,
  Plus,
  Edit3
} from 'lucide-react';
import {
  CeoDashboardSnapshot,
  CEO_EMAIL,
  CEO_ROLE_LABEL,
  CEO_VERIFIED_BADGE_TEXT,
  ceoDeleteAnnouncement,
  ceoDeleteCampusEvent,
  ceoDeleteModerator,
  ceoPublishSafetyAnnouncement,
  ceoRemoveVerificationLogo,
  ceoResolveReport,
  ceoSaveModerator,
  ceoUpdateAppSettings,
  ceoUpdateModeratorStatus,
  ceoUpdateSecuritySettings,
  ceoUpdateUserSuspension,
  ceoUploadAndSaveVerificationLogo,
  ceoVerifyOrUnverifyEntity,
  fetchCeoDashboardSnapshot,
  logoutCeoSession,
  reauthenticateCeoWithGoogle,
  reauthenticateCeoWithPassword
} from '../services/ceoAdmin.js';
import {
  ceoSaveInstitution,
  ceoToggleInstitutionStatus,
  syncVerifiedInstitutionsIfMissing
} from '../services/institutions.js';
import {
  ceoSaveSubscriptionPlans,
  ceoSaveCodPolicy,
  ceoSaveGradingConfig
} from '../services/monetization.js';
import {
  subscribeToAgentVerificationRequests,
  subscribeToFoodVendors,
  subscribeToDeliveryPartners,
  subscribeToCampusJobs,
  subscribeToCampusBooks,
  subscribeToStudentDeals,
  subscribeToStudentGiveaways,
  subscribeToAmbassadorApplications,
  fetchCodPolicy,
  ceoReviewAgentVerification,
  ceoToggleFoodVendorVerification,
  ceoToggleDeliveryPartnerVerification,
  ceoReviewAmbassadorApplication,
  ceoModerateEcosystemRecord,
  ceoSyncInstitutionGradingToFirestore
} from '../services/campusEcosystem.js';
import {
  STANDARD_NIGERIAN_5_0_GRADES,
  STANDARD_NIGERIAN_4_0_GRADES,
  fetchInstitutionGradingConfig
} from '../services/gpaService.js';
import { INSTITUTION_TYPE_OPTIONS } from '../constants/institutions.js';
import {
  AmbassadorApplication,
  AppSettings,
  CampusBookListing,
  CampusJobListing,
  CeoSessionState,
  CodPolicySettings,
  DeliveryPartner,
  FoodVendor,
  GradingScaleGrade,
  HouseAgentVerificationRequest,
  Institution,
  InstitutionType,
  SafetyAnnouncement,
  StudentDeal,
  StudentGiveaway,
  SubscriptionPlan
} from '../types.js';
import { formatNaira } from './ProductCard.js';
import { CeoVerifiedBadge } from './CeoVerifiedBadge.js';
import { CeoOfficialAdsPanel } from './CeoOfficialAdsPanel.js';
import { CeoContentManagementPanel } from './CeoContentManagementPanel.js';
import {
  adminUpdateFirestoreProduct,
  auth,
  deleteProductFromFirestore
} from '../services/firebase.js';
import { adminFeatureService } from '../services/servicesMarketplace.js';

export type CeoSectionId =
  | 'verification'
  | 'institutions'
  | 'moderators'
  | 'app_distribution'
  | 'users'
  | 'sellers'
  | 'businesses'
  | 'ads'
  | 'content'
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
  { id: 'institutions', label: '2. Institutions & Campuses', icon: GraduationCap },
  { id: 'moderators', label: '3. Regional Moderators', icon: UserCheck },
  { id: 'app_distribution', label: '4. App & PWA Management', icon: Smartphone },
  { id: 'users', label: '5. User Management', icon: Users },
  { id: 'sellers', label: '6. Seller Management', icon: Store },
  { id: 'businesses', label: '7. Business & Agents', icon: Building2 },
  { id: 'ads', label: '8. Official Ad Manager', icon: Megaphone },
  { id: 'content', label: '9. Content Management', icon: Layers },
  { id: 'subscriptions', label: '10. Subscriptions & Pricing', icon: CreditCard },
  { id: 'products', label: '11. Product Moderation', icon: Package },
  { id: 'reports', label: '12. Reports & Complaints', icon: FileWarning },
  { id: 'announcements', label: '13. Website Announcements', icon: AlertTriangle },
  { id: 'events', label: '14. Event Promotions', icon: Calendar },
  { id: 'revenue', label: '15. Revenue & Payments', icon: CreditCard },
  { id: 'analytics', label: '16. Website Analytics', icon: BarChart3 },
  { id: 'security_logs', label: '17. Security Activity Logs', icon: Activity },
  { id: 'settings', label: '18. CEO Settings', icon: Settings }
];

interface CeoSuperAdminDashboardProps {
  session: CeoSessionState;
  onSessionUpdate: (next: CeoSessionState) => void;
  onSessionExpired: () => void;
  onLoggedOut: () => void;
  onBackToMarketplace: () => void;
  onOpenEventsManager?: () => void;
  onOpenAdsMasterModal?: () => void;
  initialSection?: CeoSectionId;
}

export const CeoSuperAdminDashboard: React.FC<CeoSuperAdminDashboardProps> = ({
  session,
  onSessionUpdate,
  onSessionExpired,
  onLoggedOut,
  onBackToMarketplace,
  onOpenEventsManager,
  onOpenAdsMasterModal,
  initialSection = 'verification'
}) => {
  const [activeSection, setActiveSection] = useState<CeoSectionId>(initialSection);
  const [snapshot, setSnapshot] = useState<CeoDashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [verificationTab, setVerificationTab] = useState<'users' | 'sellers' | 'house_agents' | 'ads' | 'services' | 'history'>('sellers');
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

  // National Control Centre: Institutions editor state
  const [instForm, setInstForm] = useState<{
    id: string;
    name: string;
    shortName: string;
    type: InstitutionType;
    state: string;
    location: string;
    campusesText: string;
    logoUrl: string;
    bannerUrl: string;
    description: string;
  }>({
    id: '',
    name: '',
    shortName: '',
    type: 'Federal University',
    state: 'Taraba',
    location: '',
    campusesText: 'Main Campus',
    logoUrl: '',
    bannerUrl: '',
    description: ''
  });

  // National Control Centre: Moderator creator state
  const [modName, setModName] = useState('');
  const [modEmail, setModEmail] = useState('');
  const [modInstId, setModInstId] = useState('');
  const [modState, setModState] = useState('');
  const [modPerms, setModPerms] = useState<Array<'moderate_listings' | 'review_reports' | 'manage_announcements'>>([
    'moderate_listings',
    'review_reports'
  ]);

  // App distribution settings state
  const [appDraft, setAppDraft] = useState<AppSettings>({
    id: 'app_distribution',
    apkUrl: '',
    playStoreUrl: '',
    apkEnabled: false,
    appVersion: '2.0.0',
    releaseNotes: '',
    installAnnouncement: '',
    installInstructions: ''
  });

  // Editable subscription plans
  const [plansDraft, setPlansDraft] = useState<SubscriptionPlan[]>([]);

  // Campus Ecosystem CEO Controls State
  const [agentKycRequests, setAgentKycRequests] = useState<HouseAgentVerificationRequest[]>([]);
  const [foodVendors, setFoodVendors] = useState<FoodVendor[]>([]);
  const [deliveryPartners, setDeliveryPartners] = useState<DeliveryPartner[]>([]);
  const [campusJobs, setCampusJobs] = useState<CampusJobListing[]>([]);
  const [campusBooks, setCampusBooks] = useState<CampusBookListing[]>([]);
  const [studentDeals, setStudentDeals] = useState<StudentDeal[]>([]);
  const [studentGiveaways, setStudentGiveaways] = useState<StudentGiveaway[]>([]);
  const [ambassadorApps, setAmbassadorApps] = useState<AmbassadorApplication[]>([]);

  // Pay-on-Delivery (COD) Policy Form State
  const [codPolicyDraft, setCodPolicyDraft] = useState<CodPolicySettings>({
    codEnabled: true,
    codFoodEnabled: true,
    codMaxOrderNaira: 150000,
    codNote: 'Pay on delivery / campus handover available for eligible campus orders.'
  });

  // Institution Grading System Editor State
  const [gradingInstId, setGradingInstId] = useState('fuwukari');
  const [gradingScaleMax, setGradingScaleMax] = useState<5 | 4>(5);
  const [gradingScaleLabel, setGradingScaleLabel] = useState('Standard Nigerian 5.0 Grading System');
  const [gradingVerifiedOfficial, setGradingVerifiedOfficial] = useState(false);
  const [gradingRows, setGradingRows] = useState<GradingScaleGrade[]>(STANDARD_NIGERIAN_5_0_GRADES);

  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const flash = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [data, codPolicy] = await Promise.all([
        fetchCeoDashboardSnapshot(),
        fetchCodPolicy().catch(() => null)
      ]);
      setSnapshot(data);
      setTimeoutMins(data.settings.sessionTimeoutMinutes || 60);
      setRequirePhoneCheck(Boolean(data.settings.requirePhoneCheckOnLogin));
      setReauthWindowMins(data.settings.reauthWindowMinutes || 10);
      if (data.appSettings) setAppDraft(data.appSettings);
      if (Array.isArray(data.subscriptionPlans)) setPlansDraft(data.subscriptionPlans);
      if (codPolicy) setCodPolicyDraft(codPolicy);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to load CEO dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  useEffect(() => {
    const unsubs = [
      subscribeToAgentVerificationRequests(setAgentKycRequests),
      subscribeToFoodVendors(setFoodVendors),
      subscribeToDeliveryPartners(setDeliveryPartners),
      subscribeToCampusJobs(setCampusJobs),
      subscribeToCampusBooks(setCampusBooks),
      subscribeToStudentDeals(setStudentDeals),
      subscribeToStudentGiveaways(setStudentGiveaways),
      subscribeToAmbassadorApplications(setAmbassadorApps)
    ];
    return () => {
      unsubs.forEach((u) => {
        try {
          u();
        } catch {
          // Ignore cleanup errors
        }
      });
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetchInstitutionGradingConfig(gradingInstId).then((cfg) => {
      if (!active) return;
      if (cfg) {
        setGradingScaleMax(cfg.scaleMax === 4 ? 4 : 5);
        setGradingScaleLabel(cfg.scaleLabel || `Custom ${cfg.scaleMax}.0 Scale`);
        setGradingVerifiedOfficial(Boolean(cfg.isVerifiedOfficial));
        if (Array.isArray(cfg.grades) && cfg.grades.length > 0) {
          setGradingRows(cfg.grades);
        }
      } else {
        setGradingScaleMax(5);
        setGradingScaleLabel('Standard Nigerian 5.0 Grading System');
        setGradingVerifiedOfficial(false);
        setGradingRows(STANDARD_NIGERIAN_5_0_GRADES);
      }
    });
    return () => {
      active = false;
    };
  }, [gradingInstId]);

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
    targetType: 'user' | 'seller' | 'advertisement' | 'service' | 'house_agent';
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
      snapshot.reports.huxReports.filter((r) => !r.status || r.status === 'pending').length +
      (snapshot.reports.conversationReports || []).filter((r) => r.status === 'pending').length;

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

  const populateInstitutionForm = (inst: Institution) => {
    setInstForm({
      id: inst.id,
      name: inst.name,
      shortName: inst.shortName,
      type: inst.type,
      state: inst.state,
      location: inst.location,
      campusesText: inst.campuses.join(', '),
      logoUrl: inst.logoUrl || '',
      bannerUrl: inst.bannerUrl || '',
      description: inst.description || ''
    });
  };

  return (
    <div className="min-h-screen bg-[#F4F8F5] text-[#10251D] flex flex-col">
      {/* Executive Header (Royal Navy + Emerald + Gold) */}
      <header className="sticky top-0 z-30 bg-[#10251D] text-white border-b-4 border-[#D4A62A] shadow-md">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#087443] border border-[#D4A62A]/60 text-[#D4A62A] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-sm sm:text-lg font-black tracking-tight truncate">
                  NIGERIA CAMPUS MARKET – NATIONAL CONTROL CENTRE
                </h1>
                <span className="px-2 py-0.5 rounded bg-[#D4A62A] text-[#10251D] text-[10px] font-black uppercase tracking-wider">
                  {CEO_ROLE_LABEL}
                </span>
              </div>
              <p className="text-[11px] text-emerald-100 truncate">
                Authenticated: <strong>{auth.currentUser?.email || session.email}</strong>
                {session.phoneVerified ? ' • Phone Verified (08167258121)' : ''} • Session expires in{' '}
                <strong className="font-mono text-[#D4A62A]">{formatTimer(remainingSeconds)}</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={loadSnapshot}
              disabled={loading}
              className="px-3 py-2 rounded-xl bg-[#087443] hover:bg-[#065D36] border border-white/20 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#D4A62A] ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              type="button"
              onClick={() => {
                pendingSensitiveActionRef.current = null;
                setReauthOpen(true);
              }}
              className="px-3 py-2 rounded-xl bg-[#091812] hover:bg-black/40 border border-white/20 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition"
            >
              <Lock className="w-3.5 h-3.5 text-[#D4A62A]" />
              <span>Reauthenticate</span>
            </button>
            <button
              type="button"
              onClick={onBackToMarketplace}
              className="px-3 py-2 rounded-xl bg-white hover:bg-[#F4F8F5] text-[#10251D] text-xs font-black flex items-center gap-1.5 whitespace-nowrap transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Marketplace</span>
            </button>
            <button
              type="button"
              onClick={handleSecureLogout}
              className="px-3 py-2 rounded-xl bg-[#D4A62A] hover:bg-[#E0B43B] text-[#10251D] text-xs font-black flex items-center gap-1.5 whitespace-nowrap transition"
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
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] text-xs font-medium outline-none focus:border-[#087443]"
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
                        ? 'bg-[#087443] text-white shadow-xs'
                        : 'text-[#333333] hover:bg-[#F4F8F5]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#D4A62A]' : 'text-[#087443]'}`} />
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
                <strong className="text-base font-black text-[#10251D] tabular-nums">
                  {analytics.totalUsers}
                </strong>
              </div>
              <div className="p-2.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
                <span className="text-[10px] text-[#555555] block">Verified</span>
                <strong className="text-base font-black text-[#087443] tabular-nums">
                  {analytics.verifiedSellers + analytics.verifiedUsers}
                </strong>
              </div>
              <div className="p-2.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
                <span className="text-[10px] text-[#555555] block">Products</span>
                <strong className="text-base font-black text-[#10251D] tabular-nums">
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
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-[#087443] flex items-center gap-2">
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
                        <h2 className="text-base sm:text-lg font-black text-[#10251D]">
                          Official CEO Verification Logo & Badge Preview
                        </h2>
                        <p className="text-xs text-[#555555] mt-0.5">
                          Only you ({CEO_EMAIL}) can upload, replace, or remove this logo or verify users, sellers, businesses, ads, and services.
                        </p>
                      </div>
                      <CeoVerifiedBadge verified variant="banner" />
                    </div>

                    <div className="flex flex-wrap items-center gap-4 p-4 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB]">
                      <div className="w-16 h-16 rounded-2xl border-2 border-[#087443] bg-white overflow-hidden flex items-center justify-center shrink-0">
                        {snapshot.verificationConfig.logoUrl ? (
                          <img
                            src={snapshot.verificationConfig.logoUrl}
                            alt="Official CEO Verification Logo"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="w-7 h-7 text-[#087443]/50" />
                        )}
                      </div>

                      <div className="flex-1 min-w-[220px] space-y-1">
                        <p className="text-xs font-black text-[#10251D]">
                          Badge Wording: <span className="text-[#087443]">{CEO_VERIFIED_BADGE_TEXT}</span>
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
                              className="h-full bg-[#087443] transition-all"
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
                          className="px-3.5 py-2 rounded-xl bg-[#087443] hover:bg-[#065D36] text-white text-xs font-black flex items-center gap-1.5 transition"
                        >
                          <Upload className="w-3.5 h-3.5 text-[#D4A62A]" />
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
                            className="px-3.5 py-2 rounded-xl bg-[#10251D] hover:bg-black text-[#D4A62A] text-xs font-black flex items-center gap-1.5 transition"
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
                            ['house_agents', `House Agents (${snapshot.houseAgents.length})`],
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
                                ? 'bg-[#087443] text-white'
                                : 'bg-[#F4F8F5] text-[#10251D] hover:bg-[#E5E7EB]'
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
                        className="px-3 py-1.5 rounded-xl border border-[#E5E7EB] text-xs w-full sm:w-64 outline-none focus:border-[#087443]"
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
                                    <span className="font-black text-sm text-[#10251D]">
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
                                      ? 'bg-[#10251D] text-[#D4A62A] hover:bg-black'
                                      : 'bg-[#087443] text-white hover:bg-[#065D36]'
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
                                    <span className="font-black text-sm text-[#10251D]">
                                      {u.name}
                                    </span>
                                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#F4F8F5] text-[#555555]">
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
                                      ? 'bg-[#10251D] text-[#D4A62A]'
                                      : 'bg-[#087443] text-white'
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

                    {verificationTab === 'house_agents' && (
                      <div className="divide-y divide-[#E5E7EB]">
                        {snapshot.houseAgents.length === 0 ? (
                          <p className="text-xs text-[#10251D]/65 py-6 text-center">
                            No house agent profiles registered yet.
                          </p>
                        ) : (
                          snapshot.houseAgents
                            .filter(
                              (ha) =>
                                !q ||
                                ha.agentName.toLowerCase().includes(q) ||
                                ha.areaCovered.toLowerCase().includes(q) ||
                                (ha.agencyName || '').toLowerCase().includes(q)
                            )
                            .map((ha) => {
                              const verified = Boolean(ha.ceoVerified || ha.isVerified);
                              return (
                                <div
                                  key={ha.id}
                                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                >
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="font-black text-sm text-[#10251D]">
                                        {ha.agentName}
                                      </span>
                                      {ha.agencyName && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#F4F8F5] text-[#087443]">
                                          {ha.agencyName}
                                        </span>
                                      )}
                                      <CeoVerifiedBadge verified={verified} variant="compact" />
                                    </div>
                                    <p className="text-[11px] text-[#10251D]/70 mt-0.5">
                                      {ha.campus} • Area: {ha.areaCovered} • WhatsApp: {ha.whatsapp || ha.phone}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    disabled={busyAction === `verify-${ha.id}`}
                                    onClick={() =>
                                      handleToggleVerification({
                                        targetType: 'house_agent',
                                        targetId: ha.id,
                                        targetName: ha.agentName,
                                        currentlyVerified: verified,
                                        linkedUserId: ha.userId
                                      })
                                    }
                                    className={`px-3.5 py-2 rounded-xl text-xs font-black transition shrink-0 ${
                                      verified
                                        ? 'bg-[#10251D] text-[#D4A62A]'
                                        : 'bg-[#087443] text-white'
                                    }`}
                                  >
                                    {busyAction === `verify-${ha.id}`
                                      ? 'Updating...'
                                      : verified
                                      ? 'Unverify Agent'
                                      : 'Verify House Agent'}
                                  </button>
                                </div>
                              );
                            })
                        )}
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
                                    <span className="font-black text-sm text-[#10251D]">
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
                                      ? 'bg-[#10251D] text-[#D4A62A]'
                                      : 'bg-[#087443] text-white'
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
                                    <span className="font-black text-sm text-[#10251D]">
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
                                      ? 'bg-[#10251D] text-[#D4A62A]'
                                      : 'bg-[#087443] text-white'
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
                                      ? 'bg-emerald-100 text-[#087443]'
                                      : 'bg-amber-100 text-amber-900'
                                  }`}
                                >
                                  {log.action}
                                </span>
                                <strong className="text-[#10251D]">{log.targetName}</strong>{' '}
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

              {/* 2. INSTITUTIONS & CAMPUSES MANAGEMENT */}
              {activeSection === 'institutions' && (
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-xs space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-base sm:text-lg font-black text-[#10251D]">
                          National Institutions &amp; Campus Branding ({snapshot.institutions.length})
                        </h2>
                        <p className="text-xs text-[#555555]">
                          Add, update, upload logo/banner URLs, or toggle active/inactive status for Nigerian universities &amp; polytechnics.
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={busyAction === 'sync-inst'}
                        onClick={async () => {
                          setBusyAction('sync-inst');
                          try {
                            const res = await syncVerifiedInstitutionsIfMissing();
                            flash(`Synced verified Nigerian institutions (${res.added} added).`);
                            await loadSnapshot();
                          } finally {
                            setBusyAction(null);
                          }
                        }}
                        className="px-3.5 py-2 rounded-xl bg-[#10251D] hover:bg-[#091812] text-white text-xs font-black cursor-pointer"
                      >
                        {busyAction === 'sync-inst' ? 'Syncing...' : 'Sync Verified Directory'}
                      </button>
                    </div>

                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setBusyAction('save-inst');
                        try {
                          const campuses = instForm.campusesText
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean);
                          await ceoSaveInstitution({
                            id: instForm.id.trim() || undefined,
                            name: instForm.name,
                            shortName: instForm.shortName,
                            type: instForm.type,
                            state: instForm.state,
                            location: instForm.location,
                            campuses,
                            campus: campuses[0] || 'Main Campus',
                            logoUrl: instForm.logoUrl,
                            bannerUrl: instForm.bannerUrl,
                            description: instForm.description
                          });
                          flash(`Saved institution "${instForm.shortName}".`);
                          setInstForm({
                            id: '',
                            name: '',
                            shortName: '',
                            type: 'Federal University',
                            state: 'Taraba',
                            location: '',
                            campusesText: 'Main Campus',
                            logoUrl: '',
                            bannerUrl: '',
                            description: ''
                          });
                          await loadSnapshot();
                        } catch (err: any) {
                          setErrorMsg(err?.message || 'Failed to save institution.');
                        } finally {
                          setBusyAction(null);
                        }
                      }}
                      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 rounded-xl bg-[#F4F8F5] border border-[#E5E7EB] text-xs"
                    >
                      <input
                        type="text"
                        required
                        value={instForm.name}
                        onChange={(e) => setInstForm((p) => ({ ...p, name: e.target.value }))}
                        placeholder="Full Institution Name *"
                        className="px-3 py-2 rounded-xl border border-gray-300 bg-white outline-none focus:border-[#087443]"
                      />
                      <input
                        type="text"
                        required
                        value={instForm.shortName}
                        onChange={(e) => setInstForm((p) => ({ ...p, shortName: e.target.value }))}
                        placeholder="Short Acronym (e.g. UNILAG) *"
                        className="px-3 py-2 rounded-xl border border-gray-300 bg-white outline-none focus:border-[#087443]"
                      />
                      <select
                        value={instForm.type}
                        onChange={(e) => setInstForm((p) => ({ ...p, type: e.target.value as InstitutionType }))}
                        className="px-3 py-2 rounded-xl border border-gray-300 bg-white outline-none focus:border-[#087443]"
                      >
                        {INSTITUTION_TYPE_OPTIONS.filter((o) => o.value !== 'all').map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        required
                        value={instForm.state}
                        onChange={(e) => setInstForm((p) => ({ ...p, state: e.target.value }))}
                        placeholder="State (e.g. Lagos) *"
                        className="px-3 py-2 rounded-xl border border-gray-300 bg-white outline-none focus:border-[#087443]"
                      />
                      <input
                        type="text"
                        required
                        value={instForm.location}
                        onChange={(e) => setInstForm((p) => ({ ...p, location: e.target.value }))}
                        placeholder="City / Town *"
                        className="px-3 py-2 rounded-xl border border-gray-300 bg-white outline-none focus:border-[#087443]"
                      />
                      <input
                        type="text"
                        value={instForm.campusesText}
                        onChange={(e) => setInstForm((p) => ({ ...p, campusesText: e.target.value }))}
                        placeholder="Campuses (comma-separated)"
                        className="px-3 py-2 rounded-xl border border-gray-300 bg-white outline-none focus:border-[#087443]"
                      />
                      <input
                        type="url"
                        value={instForm.logoUrl}
                        onChange={(e) => setInstForm((p) => ({ ...p, logoUrl: e.target.value }))}
                        placeholder="Campus Logo URL (HTTPS, optional)"
                        className="px-3 py-2 rounded-xl border border-gray-300 bg-white outline-none focus:border-[#087443]"
                      />
                      <input
                        type="url"
                        value={instForm.bannerUrl}
                        onChange={(e) => setInstForm((p) => ({ ...p, bannerUrl: e.target.value }))}
                        placeholder="Campus Banner URL (HTTPS, optional)"
                        className="px-3 py-2 rounded-xl border border-gray-300 bg-white outline-none focus:border-[#087443]"
                      />
                      <input
                        type="text"
                        value={instForm.description}
                        onChange={(e) => setInstForm((p) => ({ ...p, description: e.target.value }))}
                        placeholder="Short campus bio / tagline (optional)"
                        className="px-3 py-2 rounded-xl border border-gray-300 bg-white outline-none focus:border-[#087443]"
                      />
                      <div className="sm:col-span-2 lg:col-span-3 flex items-center justify-end gap-2">
                        {instForm.id && (
                          <button
                            type="button"
                            onClick={() =>
                              setInstForm({
                                id: '',
                                name: '',
                                shortName: '',
                                type: 'Federal University',
                                state: 'Taraba',
                                location: '',
                                campusesText: 'Main Campus',
                                logoUrl: '',
                                bannerUrl: '',
                                description: ''
                              })
                            }
                            className="px-3.5 py-2 rounded-xl border border-gray-300 bg-white font-bold"
                          >
                            Cancel Edit
                          </button>
                        )}
                        <button
                          type="submit"
                          disabled={busyAction === 'save-inst'}
                          className="px-4 py-2 rounded-xl bg-[#087443] hover:bg-[#065D36] text-white font-black inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-4 h-4 text-[#D4A62A]" />
                          <span>{instForm.id ? 'Update Institution' : 'Add / Save Institution'}</span>
                        </button>
                      </div>
                    </form>

                    <div className="divide-y divide-[#E5E7EB] max-h-[460px] overflow-y-auto">
                      {snapshot.institutions
                        .filter(
                          (inst) =>
                            !q ||
                            inst.name.toLowerCase().includes(q) ||
                            inst.shortName.toLowerCase().includes(q) ||
                            inst.state.toLowerCase().includes(q)
                        )
                        .map((inst) => (
                          <div
                            key={inst.id}
                            className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-black text-[#10251D]">{inst.name}</span>
                                <span className="px-2 py-0.5 rounded bg-[#10251D] text-[#D4A62A] text-[10px] font-black">
                                  {inst.shortName}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                    inst.status === 'inactive'
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-emerald-100 text-[#087443]'
                                  }`}
                                >
                                  {inst.status || 'active'}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#555555]">
                                {inst.type} • {inst.location}, {inst.state} • Campuses: {inst.campuses.join(', ')}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => populateInstitutionForm(inst)}
                                className="px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-[#087443] font-bold inline-flex items-center gap-1"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-[#087443]" />
                                Edit
                              </button>
                              {!inst.isDefault && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const nextStatus = inst.status === 'inactive' ? 'active' : 'inactive';
                                    await ceoToggleInstitutionStatus(inst.id, nextStatus);
                                    flash(`${inst.shortName} marked ${nextStatus}.`);
                                    await loadSnapshot();
                                  }}
                                  className={`px-2.5 py-1.5 rounded-lg font-black text-[11px] ${
                                    inst.status === 'inactive'
                                      ? 'bg-[#087443] text-white'
                                      : 'bg-[#10251D] text-[#D4A62A]'
                                  }`}
                                >
                                  {inst.status === 'inactive' ? 'Activate' : 'Deactivate'}
                                </button>
                              )}
                            </div>
                          </div>
                      ))}
                    </div>
                  </div>

                  {/* Institution Grading System Editor (GPA & CGPA Official Scales) */}
                  <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-xs space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-black text-[#10251D]">
                          Institution Grading Scale Configurator (GPA / CGPA)
                        </h3>
                        <p className="text-xs text-[#555555]">
                          Configure 5.0 or 4.0 grading scales per university or polytechnic. Only mark Verified Official once Senate Handbook criteria are confirmed.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const nextMax = gradingScaleMax === 5 ? 4 : 5;
                          setGradingScaleMax(nextMax);
                          setGradingScaleLabel(
                            nextMax === 5
                              ? 'Standard Nigerian 5.0 Grading System'
                              : 'Standard Nigerian 4.0 Grading System'
                          );
                          setGradingRows(
                            nextMax === 5 ? STANDARD_NIGERIAN_5_0_GRADES : STANDARD_NIGERIAN_4_0_GRADES
                          );
                        }}
                        className="px-3 py-1.5 rounded-xl border border-[#D9E5DF] bg-[#F4F8F5] text-xs font-bold text-[#087443] cursor-pointer"
                      >
                        Load {gradingScaleMax === 5 ? '4.0' : '5.0'} Preset
                      </button>
                    </div>

                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setBusyAction('save-grading');
                        try {
                          const payload = {
                            institutionId: gradingInstId,
                            scaleMax: gradingScaleMax,
                            isVerifiedOfficial: gradingVerifiedOfficial,
                            scaleLabel: gradingScaleLabel.trim() || `Standard ${gradingScaleMax}.0 Scale`,
                            grades: gradingRows
                          };
                          await ceoSaveGradingConfig(payload);
                          await ceoSyncInstitutionGradingToFirestore({
                            ...payload,
                            updatedBy: auth.currentUser?.email || CEO_EMAIL
                          });
                          flash(`Saved ${gradingScaleMax}.0 grading scale for "${gradingInstId}".`);
                        } catch (err: any) {
                          setErrorMsg(err?.message || 'Failed to save institution grading scale.');
                        } finally {
                          setBusyAction(null);
                        }
                      }}
                      className="space-y-3 text-xs"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block font-bold text-[#10251D] mb-1">Institution</label>
                          <select
                            value={gradingInstId}
                            onChange={(e) => setGradingInstId(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white font-semibold"
                          >
                            {snapshot.institutions.map((inst) => (
                              <option key={inst.id} value={inst.id}>
                                {inst.shortName} — {inst.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block font-bold text-[#10251D] mb-1">Scale Maximum</label>
                          <select
                            value={gradingScaleMax}
                            onChange={(e) => {
                              const nextMax = Number(e.target.value) === 4 ? 4 : 5;
                              setGradingScaleMax(nextMax);
                              setGradingRows(
                                nextMax === 5 ? STANDARD_NIGERIAN_5_0_GRADES : STANDARD_NIGERIAN_4_0_GRADES
                              );
                            }}
                            className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white font-semibold"
                          >
                            <option value={5}>5.00 Scale</option>
                            <option value={4}>4.00 Scale</option>
                          </select>
                        </div>
                        <div>
                          <label className="block font-bold text-[#10251D] mb-1">Scale Label</label>
                          <input
                            type="text"
                            value={gradingScaleLabel}
                            onChange={(e) => setGradingScaleLabel(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white font-semibold"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 bg-[#F4F8F5] p-3 rounded-xl border border-[#E5E7EB]">
                        {gradingRows.map((row, idx) => (
                          <div key={`${row.letter}-${idx}`} className="bg-white p-2 rounded-lg border border-[#E5E7EB] space-y-1">
                            <div className="flex items-center justify-between">
                              <strong className="text-[#087443] text-sm">{row.letter}</strong>
                              <span className="text-[10px] text-[#555555]">Pt: {row.point}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-1">
                              <input
                                type="number"
                                value={row.minScore}
                                onChange={(e) =>
                                  setGradingRows((prev) =>
                                    prev.map((r, i) => (i === idx ? { ...r, minScore: Number(e.target.value) } : r))
                                  )
                                }
                                title="Min score"
                                className="px-1 py-0.5 border border-gray-200 rounded text-[11px] w-full"
                              />
                              <input
                                type="number"
                                value={row.maxScore}
                                onChange={(e) =>
                                  setGradingRows((prev) =>
                                    prev.map((r, i) => (i === idx ? { ...r, maxScore: Number(e.target.value) } : r))
                                  )
                                }
                                title="Max score"
                                className="px-1 py-0.5 border border-gray-200 rounded text-[11px] w-full"
                              />
                              <input
                                type="number"
                                step="0.5"
                                value={row.point}
                                onChange={(e) =>
                                  setGradingRows((prev) =>
                                    prev.map((r, i) => (i === idx ? { ...r, point: Number(e.target.value) } : r))
                                  )
                                }
                                title="Grade point"
                                className="px-1 py-0.5 border border-gray-200 rounded text-[11px] w-full font-bold text-[#087443]"
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <label className="inline-flex items-center gap-2 font-bold text-[#10251D]">
                          <input
                            type="checkbox"
                            checked={gradingVerifiedOfficial}
                            onChange={(e) => setGradingVerifiedOfficial(e.target.checked)}
                          />
                          <span>Mark as Verified Official University Grading System</span>
                        </label>
                        <button
                          type="submit"
                          disabled={busyAction === 'save-grading'}
                          className="px-4 py-2 rounded-xl bg-[#087443] hover:bg-[#065D36] text-white font-black cursor-pointer"
                        >
                          {busyAction === 'save-grading' ? 'Saving...' : 'Save Grading System'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* 3. REGIONAL MODERATORS (STRICTLY NON-CEO PERMISSIONS) */}
              {activeSection === 'moderators' && (
                <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-xs space-y-4">
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-[#10251D]">
                      Regional &amp; Campus Moderators ({snapshot.moderators.length})
                    </h2>
                    <p className="text-xs text-[#555555]">
                      Assign delegated moderation permissions only. Moderators never gain CEO Super Admin controls, security logs, or revenue authority.
                    </p>
                  </div>

                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setBusyAction('save-mod');
                      try {
                        await ceoSaveModerator({
                          name: modName,
                          email: modEmail,
                          assignedInstitutionId: modInstId || undefined,
                          assignedState: modState || undefined,
                          permissions: modPerms
                        });
                        flash(`Assigned moderator ${modEmail}.`);
                        setModName('');
                        setModEmail('');
                        setModInstId('');
                        setModState('');
                        await loadSnapshot();
                      } catch (err: any) {
                        setErrorMsg(err?.message || 'Failed to save moderator.');
                      } finally {
                        setBusyAction(null);
                      }
                    }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-[#F4F8F5] border border-[#E5E7EB] text-xs"
                  >
                    <input
                      type="text"
                      required
                      value={modName}
                      onChange={(e) => setModName(e.target.value)}
                      placeholder="Moderator Full Name *"
                      className="px-3 py-2 rounded-xl border border-gray-300 bg-white outline-none focus:border-[#087443]"
                    />
                    <input
                      type="email"
                      required
                      value={modEmail}
                      onChange={(e) => setModEmail(e.target.value)}
                      placeholder="Moderator Email *"
                      className="px-3 py-2 rounded-xl border border-gray-300 bg-white outline-none focus:border-[#087443]"
                    />
                    <select
                      value={modInstId}
                      onChange={(e) => setModInstId(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-gray-300 bg-white outline-none focus:border-[#087443]"
                    >
                      <option value="">Any Institution (State-level)</option>
                      {snapshot.institutions.map((inst) => (
                        <option key={inst.id} value={inst.id}>
                          {inst.shortName} — {inst.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={modState}
                      onChange={(e) => setModState(e.target.value)}
                      placeholder="Assigned State (optional, e.g. Taraba)"
                      className="px-3 py-2 rounded-xl border border-gray-300 bg-white outline-none focus:border-[#087443]"
                    />
                    <div className="sm:col-span-2 flex flex-wrap items-center gap-4">
                      {(['moderate_listings', 'review_reports', 'manage_announcements'] as const).map((perm) => (
                        <label key={perm} className="inline-flex items-center gap-1.5 font-bold">
                          <input
                            type="checkbox"
                            checked={modPerms.includes(perm)}
                            onChange={(e) =>
                              setModPerms((prev) =>
                                e.target.checked ? [...prev, perm] : prev.filter((p) => p !== perm)
                              )
                            }
                          />
                          <span>{perm.replace('_', ' ')}</span>
                        </label>
                      ))}
                      <button
                        type="submit"
                        disabled={busyAction === 'save-mod'}
                        className="ml-auto px-4 py-2 rounded-xl bg-[#087443] hover:bg-[#065D36] text-white font-black cursor-pointer"
                      >
                        {busyAction === 'save-mod' ? 'Assigning...' : 'Assign Moderator'}
                      </button>
                    </div>
                  </form>

                  <div className="divide-y divide-[#E5E7EB]">
                    {snapshot.moderators.length === 0 ? (
                      <p className="text-xs text-[#555555] py-6 text-center">No regional moderators assigned yet.</p>
                    ) : (
                      snapshot.moderators.map((mod) => (
                        <div key={mod.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <strong>{mod.name}</strong>
                              <span className="text-[#555555]">{mod.email}</span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                  mod.status === 'suspended' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-[#087443]'
                                }`}
                              >
                                {mod.status}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#555555]">
                              Scope: {mod.assignedInstitutionId || mod.assignedState || 'National Queue'} • Permissions: {mod.permissions.join(', ')}
                            </p>
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={async () => {
                                await ceoUpdateModeratorStatus(mod.id, {
                                  status: mod.status === 'suspended' ? 'active' : 'suspended'
                                });
                                await loadSnapshot();
                              }}
                              className="px-2.5 py-1 rounded-lg border border-gray-200 font-bold"
                            >
                              {mod.status === 'suspended' ? 'Activate' : 'Suspend'}
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                await ceoDeleteModerator(mod.id);
                                flash(`Removed moderator ${mod.email}.`);
                                await loadSnapshot();
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#10251D] text-[#D4A62A] font-bold"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* 4. APP DISTRIBUTION & REAL PWA TELEMETRY */}
              {activeSection === 'app_distribution' && (
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-xs space-y-4">
                    <div>
                      <h2 className="text-base sm:text-lg font-black text-[#10251D]">
                        App Distribution &amp; Installable PWA Analytics
                      </h2>
                      <p className="text-xs text-[#555555]">
                        Control official APK download link, Play Store URL, release notes, and view real install events.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-[#F4F8F5] border border-[#E5E7EB]">
                        <span className="text-[#555555] block">Prompt Shown</span>
                        <strong className="text-lg font-black tabular-nums">{snapshot.pwaAnalytics.totalPromptShown}</strong>
                      </div>
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                        <span className="text-[#087443] block">PWA Installed</span>
                        <strong className="text-lg font-black text-[#087443] tabular-nums">
                          {snapshot.pwaAnalytics.totalInstallAccepted}
                        </strong>
                      </div>
                      <div className="p-3 rounded-xl bg-[#F4F8F5] border border-[#E5E7EB]">
                        <span className="text-[#555555] block">Prompt Dismissed</span>
                        <strong className="text-lg font-black tabular-nums">{snapshot.pwaAnalytics.totalInstallDismissed}</strong>
                      </div>
                      <div className="p-3 rounded-xl bg-[#FFF8DB] border border-[#D4A62A]/40">
                        <span className="text-[#10251D] block">APK Downloads</span>
                        <strong className="text-lg font-black tabular-nums">{snapshot.pwaAnalytics.totalApkDownloads}</strong>
                      </div>
                      <div className="p-3 rounded-xl bg-[#F4F8F5] border border-[#E5E7EB]">
                        <span className="text-[#555555] block">Play Store Clicks</span>
                        <strong className="text-lg font-black tabular-nums">{snapshot.pwaAnalytics.totalPlayStoreClicks}</strong>
                      </div>
                    </div>

                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setBusyAction('save-app-settings');
                        try {
                          await ceoUpdateAppSettings(appDraft);
                          flash('App distribution settings updated.');
                          await loadSnapshot();
                        } catch (err: any) {
                          setErrorMsg(err?.message || 'Failed to update App Settings.');
                        } finally {
                          setBusyAction(null);
                        }
                      }}
                      className="space-y-3 text-xs bg-[#F4F8F5] p-4 rounded-xl border border-[#E5E7EB]"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold mb-1">Official Android APK Download URL</label>
                          <input
                            type="url"
                            value={appDraft.apkUrl}
                            onChange={(e) => setAppDraft((p) => ({ ...p, apkUrl: e.target.value }))}
                            placeholder="https://..."
                            className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white outline-none focus:border-[#087443]"
                          />
                        </div>
                        <div>
                          <label className="block font-bold mb-1">Google Play Store URL (Optional)</label>
                          <input
                            type="url"
                            value={appDraft.playStoreUrl}
                            onChange={(e) => setAppDraft((p) => ({ ...p, playStoreUrl: e.target.value }))}
                            placeholder="https://play.google.com/store/apps/..."
                            className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white outline-none focus:border-[#087443]"
                          />
                        </div>
                        <div>
                          <label className="block font-bold mb-1">App Version</label>
                          <input
                            type="text"
                            value={appDraft.appVersion}
                            onChange={(e) => setAppDraft((p) => ({ ...p, appVersion: e.target.value }))}
                            placeholder="2.0.0"
                            className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white outline-none focus:border-[#087443]"
                          />
                        </div>
                        <div className="flex items-end pb-2">
                          <label className="inline-flex items-center gap-2 font-black text-[#10251D]">
                            <input
                              type="checkbox"
                              checked={appDraft.apkEnabled}
                              onChange={(e) => setAppDraft((p) => ({ ...p, apkEnabled: e.target.checked }))}
                            />
                            <span>Enable Direct APK Download Button in App Modal</span>
                          </label>
                        </div>
                      </div>
                      <div>
                        <label className="block font-bold mb-1">Install Announcement Banner</label>
                        <input
                          type="text"
                          value={appDraft.installAnnouncement}
                          onChange={(e) => setAppDraft((p) => ({ ...p, installAnnouncement: e.target.value }))}
                          className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white outline-none focus:border-[#087443]"
                        />
                      </div>
                      <div>
                        <label className="block font-bold mb-1">Release Notes</label>
                        <textarea
                          rows={2}
                          value={appDraft.releaseNotes}
                          onChange={(e) => setAppDraft((p) => ({ ...p, releaseNotes: e.target.value }))}
                          className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white outline-none focus:border-[#087443]"
                        />
                      </div>
                      <div>
                        <label className="block font-bold mb-1">Install Instructions</label>
                        <textarea
                          rows={2}
                          value={appDraft.installInstructions}
                          onChange={(e) => setAppDraft((p) => ({ ...p, installInstructions: e.target.value }))}
                          className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white outline-none focus:border-[#087443]"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={busyAction === 'save-app-settings'}
                        className="px-4 py-2.5 rounded-xl bg-[#087443] hover:bg-[#065D36] text-white font-black inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-4 h-4 text-[#D4A62A]" />
                        <span>{busyAction === 'save-app-settings' ? 'Saving...' : 'Save App Distribution Settings'}</span>
                      </button>
                    </form>
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
                                  <p className="font-bold text-[#10251D]">{u.name}</p>
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
                                      className="px-2.5 py-1 rounded-lg bg-emerald-50 text-[#087443] border border-emerald-200 font-bold text-[11px]"
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
                                                : 'Suspended by NIGERIA CAMPUS MARKET CEO'
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
                                            ? 'bg-[#087443] text-white'
                                            : 'bg-[#10251D] text-[#D4A62A]'
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
                                verified ? 'bg-[#10251D] text-[#D4A62A]' : 'bg-[#087443] text-white'
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

              {/* 7. BUSINESS, HOUSE AGENTS KYC, FOOD VENDORS, RIDERS & ECOSYSTEM MODERATION */}
              {activeSection === 'businesses' && (
                <div className="space-y-4">
                  {/* House Agent KYC Verification Requests */}
                  <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-xs space-y-4">
                    <div>
                      <h2 className="text-base sm:text-lg font-black text-[#10251D]">
                        House Agent KYC Verification Requests ({agentKycRequests.length})
                      </h2>
                      <p className="text-xs text-[#555555]">
                        Review government ID / business CAC submissions and approve or reject verified House Agent badges.
                      </p>
                    </div>
                    {agentKycRequests.length === 0 ? (
                      <p className="text-xs text-[#555555] py-4 text-center bg-[#F4F8F5] rounded-xl">
                        No House Agent KYC submissions yet.
                      </p>
                    ) : (
                      <div className="divide-y divide-[#E5E7EB]">
                        {agentKycRequests.map((req) => (
                          <div key={req.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <strong className="text-sm text-[#10251D]">{req.agentName}</strong>
                                {req.agencyName && (
                                  <span className="px-2 py-0.5 rounded bg-[#F4F8F5] text-[#087443] font-bold text-[10px]">
                                    {req.agencyName}
                                  </span>
                                )}
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                    req.status === 'approved'
                                      ? 'bg-emerald-100 text-[#087443]'
                                      : req.status === 'rejected'
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {req.status}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#555555] mt-0.5">
                                {req.idType}: {req.idNumberMasked || 'N/A'} • Phone: {req.phone} • Institution: {req.institutionId}
                              </p>
                              {req.documentUrl && (
                                <a
                                  href={req.documentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-block mt-1 text-[11px] font-bold text-[#087443] underline"
                                >
                                  Inspect Submitted KYC Document
                                </a>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                disabled={busyAction === `kyc-${req.id}`}
                                onClick={async () => {
                                  setBusyAction(`kyc-${req.id}`);
                                  try {
                                    await ceoReviewAgentVerification({
                                      requestId: req.id,
                                      userId: req.userId,
                                      agentId: req.agentId,
                                      decision: 'approved',
                                      ceoEmail: auth.currentUser?.email || CEO_EMAIL
                                    });
                                    flash(`Approved KYC for ${req.agentName}.`);
                                  } finally {
                                    setBusyAction(null);
                                  }
                                }}
                                className="px-3 py-1.5 rounded-lg bg-[#087443] text-white font-black cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                disabled={busyAction === `kyc-${req.id}`}
                                onClick={async () => {
                                  setBusyAction(`kyc-${req.id}`);
                                  try {
                                    await ceoReviewAgentVerification({
                                      requestId: req.id,
                                      userId: req.userId,
                                      agentId: req.agentId,
                                      decision: 'rejected',
                                      notes: 'Verification rejected by CEO Admin. Please upload a clearer ID.',
                                      ceoEmail: auth.currentUser?.email || CEO_EMAIL
                                    });
                                    flash(`Rejected KYC for ${req.agentName}.`);
                                  } finally {
                                    setBusyAction(null);
                                  }
                                }}
                                className="px-3 py-1.5 rounded-lg bg-[#10251D] text-[#D4A62A] font-black cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Campus Food Vendors & Delivery Riders */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-xs space-y-3">
                      <h3 className="text-sm font-black text-[#10251D]">
                        Campus Food Vendors ({foodVendors.length})
                      </h3>
                      <div className="divide-y divide-[#E5E7EB] max-h-72 overflow-y-auto text-xs">
                        {foodVendors.length === 0 ? (
                          <p className="text-[#555555] py-4 text-center">No food vendors registered yet.</p>
                        ) : (
                          foodVendors.map((v) => {
                            const verified = Boolean(v.ceoVerified || v.isVerified);
                            return (
                              <div key={v.id} className="py-2.5 flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <strong className="truncate">{v.vendorName}</strong>
                                    <CeoVerifiedBadge verified={verified} variant="compact" />
                                  </div>
                                  <p className="text-[11px] text-[#555555] truncate">
                                    {(v.categories || []).join(', ') || 'Campus Food'} • {v.campus} • {v.phone}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      ceoToggleFoodVendorVerification({
                                        vendorId: v.id,
                                        ownerUid: v.ownerUid,
                                        verified: !verified,
                                        ceoEmail: auth.currentUser?.email || CEO_EMAIL
                                      }).then(() => flash(`${v.vendorName} ${!verified ? 'verified' : 'unverified'}.`))
                                    }
                                    className="px-2.5 py-1 rounded-lg bg-[#087443] text-white font-bold text-[11px]"
                                  >
                                    {verified ? 'Unverify' : 'Verify'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      ceoModerateEcosystemRecord(
                                        'foodVendors',
                                        v.id,
                                        v.status === 'suspended' ? 'open' : 'suspended'
                                      ).then(() => flash(`Updated status for ${v.vendorName}.`))
                                    }
                                    className="px-2.5 py-1 rounded-lg border border-gray-300 font-bold text-[11px]"
                                  >
                                    {v.status === 'suspended' ? 'Restore' : 'Suspend'}
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-xs space-y-3">
                      <h3 className="text-sm font-black text-[#10251D]">
                        Campus Delivery Partners ({deliveryPartners.length})
                      </h3>
                      <div className="divide-y divide-[#E5E7EB] max-h-72 overflow-y-auto text-xs">
                        {deliveryPartners.length === 0 ? (
                          <p className="text-[#555555] py-4 text-center">No delivery riders registered yet.</p>
                        ) : (
                          deliveryPartners.map((d) => {
                            const verified = Boolean(d.ceoVerified);
                            return (
                              <div key={d.id} className="py-2.5 flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <strong className="truncate">{d.fullName}</strong>
                                    <CeoVerifiedBadge verified={verified} variant="compact" />
                                  </div>
                                  <p className="text-[11px] text-[#555555] truncate">
                                    {d.vehicleType} • {d.areasCovered} • {d.phone}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    ceoToggleDeliveryPartnerVerification({
                                      partnerId: d.id,
                                      userUid: d.userUid,
                                      verified: !verified,
                                      ceoEmail: auth.currentUser?.email || CEO_EMAIL
                                    }).then(() => flash(`${d.fullName} ${!verified ? 'verified' : 'unverified'}.`))
                                  }
                                  className="px-2.5 py-1 rounded-lg bg-[#087443] text-white font-bold text-[11px] shrink-0"
                                >
                                  {verified ? 'Unverify' : 'Verify Rider'}
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Ambassadors & Campus Ecosystem Moderation */}
                  <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-xs space-y-4">
                    <h3 className="text-sm font-black text-[#10251D]">
                      Campus Ambassadors ({ambassadorApps.length}) &amp; Opportunities Moderation
                    </h3>

                    {ambassadorApps.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[11px] font-black uppercase text-[#087443]">Ambassador Applications</p>
                        <div className="divide-y divide-[#E5E7EB] max-h-56 overflow-y-auto text-xs">
                          {ambassadorApps.map((app) => (
                            <div key={app.id} className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <strong>{app.fullName}</strong> ({app.institutionId} • {app.department}) —{' '}
                                <span className="uppercase font-bold text-[#087443]">{app.status}</span>
                                <p className="text-[11px] text-[#555555]">{app.motivation}</p>
                              </div>
                              <div className="flex gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    ceoReviewAmbassadorApplication({
                                      appId: app.id,
                                      userUid: app.userUid,
                                      status: 'approved'
                                    }).then(() => flash(`Approved ambassador ${app.fullName}.`))
                                  }
                                  className="px-2.5 py-1 rounded-lg bg-[#087443] text-white font-bold"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    ceoReviewAmbassadorApplication({
                                      appId: app.id,
                                      userUid: app.userUid,
                                      status: 'rejected'
                                    }).then(() => flash(`Rejected ambassador ${app.fullName}.`))
                                  }
                                  className="px-2.5 py-1 rounded-lg bg-[#10251D] text-[#D4A62A] font-bold"
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-2">
                      <div className="p-3 rounded-xl bg-[#F4F8F5] border border-[#E5E7EB] space-y-2">
                        <strong className="block text-[#10251D]">Campus Jobs ({campusJobs.length})</strong>
                        {campusJobs.slice(0, 6).map((j) => (
                          <div key={j.id} className="flex items-center justify-between gap-2 bg-white p-2 rounded-lg border border-gray-200">
                            <span className="truncate font-semibold">{j.title}</span>
                            <button
                              type="button"
                              onClick={() =>
                                ceoModerateEcosystemRecord(
                                  'campusJobs',
                                  j.id,
                                  j.status === 'active' ? 'closed' : 'active'
                                ).then(() => flash(`Updated job "${j.title}".`))
                              }
                              className="px-2 py-0.5 rounded bg-[#10251D] text-[#D4A62A] text-[10px] font-black shrink-0"
                            >
                              {j.status === 'active' ? 'Close' : 'Reopen'}
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="p-3 rounded-xl bg-[#F4F8F5] border border-[#E5E7EB] space-y-2">
                        <strong className="block text-[#10251D]">Academic Books ({campusBooks.length})</strong>
                        {campusBooks.slice(0, 6).map((b) => (
                          <div key={b.id} className="flex items-center justify-between gap-2 bg-white p-2 rounded-lg border border-gray-200">
                            <span className="truncate font-semibold">{b.title}</span>
                            <button
                              type="button"
                              onClick={() =>
                                ceoModerateEcosystemRecord(
                                  'campusBooks',
                                  b.id,
                                  b.status === 'active' ? 'archived' : 'active'
                                ).then(() => flash(`Updated book "${b.title}".`))
                              }
                              className="px-2 py-0.5 rounded bg-[#10251D] text-[#D4A62A] text-[10px] font-black shrink-0"
                            >
                              {b.status === 'active' ? 'Hide' : 'Show'}
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="p-3 rounded-xl bg-[#F4F8F5] border border-[#E5E7EB] space-y-2">
                        <strong className="block text-[#10251D]">Student Deals ({studentDeals.length})</strong>
                        {studentDeals.slice(0, 6).map((dl) => (
                          <div key={dl.id} className="flex items-center justify-between gap-2 bg-white p-2 rounded-lg border border-gray-200">
                            <span className="truncate font-semibold">{dl.title}</span>
                            <button
                              type="button"
                              onClick={() =>
                                ceoModerateEcosystemRecord(
                                  'studentDeals',
                                  dl.id,
                                  dl.status === 'active' ? 'expired' : 'active'
                                ).then(() => flash(`Updated deal "${dl.title}".`))
                              }
                              className="px-2 py-0.5 rounded bg-[#10251D] text-[#D4A62A] text-[10px] font-black shrink-0"
                            >
                              {dl.status === 'active' ? 'Expire' : 'Activate'}
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="p-3 rounded-xl bg-[#F4F8F5] border border-[#E5E7EB] space-y-2">
                        <strong className="block text-[#10251D]">Giveaways ({studentGiveaways.length})</strong>
                        {studentGiveaways.slice(0, 6).map((gw) => (
                          <div key={gw.id} className="flex items-center justify-between gap-2 bg-white p-2 rounded-lg border border-gray-200">
                            <span className="truncate font-semibold">{gw.title}</span>
                            <button
                              type="button"
                              onClick={() =>
                                ceoModerateEcosystemRecord(
                                  'studentGiveaways',
                                  gw.id,
                                  gw.status === 'open' ? 'closed' : 'open'
                                ).then(() => flash(`Updated giveaway "${gw.title}".`))
                              }
                              className="px-2 py-0.5 rounded bg-[#10251D] text-[#D4A62A] text-[10px] font-black shrink-0"
                            >
                              {gw.status === 'open' ? 'Close' : 'Open'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Advertisers & Service Providers Directory */}
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
                </div>
              )}

              {/* 5. OFFICIAL ADVERTISEMENT MANAGEMENT (CEO ONLY) */}
              {activeSection === 'ads' && (
                <CeoOfficialAdsPanel
                  ads={snapshot.advertisements}
                  onRefresh={loadSnapshot}
                  onFlash={flash}
                  onError={(msg) => setErrorMsg(msg)}
                  onOpenFullModal={onOpenAdsMasterModal}
                />
              )}

              {/* 6. CONTENT MANAGEMENT CENTRE */}
              {activeSection === 'content' && (
                <CeoContentManagementPanel
                  onFlash={flash}
                  onError={(msg) => setErrorMsg(msg)}
                />
              )}

              {/* 10. SUBSCRIPTIONS & PRICING */}
              {activeSection === 'subscriptions' && (
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-xs space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h2 className="text-base sm:text-lg font-black">
                          Platform Monetization Plans (NGN) &amp; Pricing Control
                        </h2>
                        <p className="text-xs text-[#555555]">
                          Configure subscription tiers for Sellers, Businesses, House Agents, and Ad Boosts.
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={busyAction === 'save-plans'}
                        onClick={async () => {
                          setBusyAction('save-plans');
                          try {
                            await ceoSaveSubscriptionPlans(plansDraft);
                            flash('Subscription plan pricing updated live!');
                            await loadSnapshot();
                          } catch (err: any) {
                            setErrorMsg(err?.message || 'Failed to save subscription plans.');
                          } finally {
                            setBusyAction(null);
                          }
                        }}
                        className="px-4 py-2 rounded-xl bg-[#087443] hover:bg-[#065D36] text-white text-xs font-black cursor-pointer"
                      >
                        {busyAction === 'save-plans' ? 'Saving...' : 'Save Pricing Changes'}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {plansDraft.map((plan, idx) => (
                        <div key={plan.id} className="p-3.5 rounded-xl border border-[#E5E7EB] bg-[#F4F8F5] space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <input
                              type="text"
                              value={plan.name}
                              onChange={(e) =>
                                setPlansDraft((prev) =>
                                  prev.map((p, i) => (i === idx ? { ...p, name: e.target.value } : p))
                                )
                              }
                              className="font-black text-sm text-[#10251D] bg-white px-2.5 py-1 rounded-lg border border-gray-200 flex-1"
                            />
                            <label className="inline-flex items-center gap-1 font-bold text-[11px]">
                              <input
                                type="checkbox"
                                checked={plan.isActive}
                                onChange={(e) =>
                                  setPlansDraft((prev) =>
                                    prev.map((p, i) => (i === idx ? { ...p, isActive: e.target.checked } : p))
                                  )
                                }
                              />
                              Active
                            </label>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-[10px] font-bold text-[#555555] block">Price (NGN)</span>
                              <input
                                type="number"
                                min={0}
                                value={plan.priceNaira}
                                onChange={(e) =>
                                  setPlansDraft((prev) =>
                                    prev.map((p, i) => (i === idx ? { ...p, priceNaira: Number(e.target.value) } : p))
                                  )
                                }
                                className="w-full px-2.5 py-1 rounded-lg border border-gray-200 bg-white font-bold tabular-nums"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-[#555555] block">Duration (Days)</span>
                              <input
                                type="number"
                                min={1}
                                value={plan.durationDays}
                                onChange={(e) =>
                                  setPlansDraft((prev) =>
                                    prev.map((p, i) => (i === idx ? { ...p, durationDays: Number(e.target.value) } : p))
                                  )
                                }
                                className="w-full px-2.5 py-1 rounded-lg border border-gray-200 bg-white font-bold tabular-nums"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-xs space-y-4">
                    <h2 className="text-base sm:text-lg font-black">
                      Business Subscription &amp; Promotion Plans
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB]">
                        <h3 className="text-xs font-black uppercase text-[#087443] mb-2">
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
                                <strong className="text-[#087443]">{formatNaira(a.packagePrice)}</strong>
                              </div>
                            ))}
                        </div>
                      </div>

                      <div className="p-4 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB]">
                        <h3 className="text-xs font-black uppercase text-[#087443] mb-2">
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
                                  className="px-2.5 py-1 rounded bg-[#087443] text-white text-[10px] font-bold self-center"
                                >
                                  Activate
                                </button>
                              </div>
                            ))}
                        </div>
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
                              className="px-2.5 py-1 rounded-lg bg-[#087443] text-white text-[11px] font-bold"
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
                              className="px-2.5 py-1 rounded-lg bg-[#10251D] text-[#D4A62A] text-[11px] font-bold"
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
                          <span className="font-black text-[#087443]">Product Report • {r.reason}</span>
                          <p className="font-bold text-[#10251D]">{r.productTitle || r.productId}</p>
                          <p className="text-[#555555]">{r.details}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={async () => {
                              await ceoResolveReport('reports', r.id, 'resolved');
                              await loadSnapshot();
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#087443] text-white font-bold"
                          >
                            Resolve ({r.status})
                          </button>
                        </div>
                      </div>
                    ))}
                    {snapshot.reports.serviceReports.map((r) => (
                      <div key={r.id} className="p-3.5 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div>
                          <span className="font-black text-[#087443]">Service Report • {r.reason}</span>
                          <p className="font-bold text-[#10251D]">{r.serviceName}</p>
                          <p className="text-[#555555]">{r.details}</p>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            await ceoResolveReport('serviceReports', r.id, 'resolved');
                            await loadSnapshot();
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#087443] text-white font-bold shrink-0"
                        >
                          Resolve ({r.status})
                        </button>
                      </div>
                    ))}
                    {snapshot.reports.announcementReports.map((r) => (
                      <div key={r.id} className="p-3.5 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div>
                          <span className="font-black text-[#087443]">Announcement Report • {r.reason}</span>
                          <p className="font-bold text-[#10251D]">{r.postTitle}</p>
                          <p className="text-[#555555]">{r.details}</p>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            await ceoResolveReport('announcement_reports', r.id, 'resolved');
                            await loadSnapshot();
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#087443] text-white font-bold shrink-0"
                        >
                          Resolve ({r.status})
                        </button>
                      </div>
                    ))}
                    {(snapshot.reports.conversationReports || []).map((r) => (
                      <div key={r.id} className="p-3.5 rounded-xl border border-[#10251D]/20 bg-[#F4F8F5] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div>
                          <span className="font-black text-[#10251D]">Private Chat Report • {r.reason}</span>
                          <p className="font-bold text-[#10251D]">
                            Reported: {r.reportedUserName} (by {r.reporterName})
                          </p>
                          <p className="text-[#555555]">{r.details}</p>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={async () => {
                              await ceoResolveReport('conversationReports', r.id, 'resolved');
                              flash(`Resolved conversation report against ${r.reportedUserName}.`);
                              await loadSnapshot();
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#087443] text-white font-bold"
                          >
                            Resolve ({r.status})
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await ceoResolveReport('conversationReports', r.id, 'dismissed');
                              flash(`Dismissed report ${r.id}.`);
                              await loadSnapshot();
                            }}
                            className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-[#10251D] font-bold"
                          >
                            Dismiss
                          </button>
                        </div>
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
                        className="ml-auto px-4 py-2 rounded-xl bg-[#087443] text-white text-xs font-black"
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
                        className="px-3.5 py-2 rounded-xl bg-[#087443] text-white text-xs font-black"
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
                          className="px-3 py-1.5 rounded-lg bg-[#10251D] text-[#D4A62A] font-bold"
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
                      <span className="text-[11px] font-bold text-[#087443] block">Verified Ad Revenue</span>
                      <strong className="text-xl font-black text-[#10251D] tabular-nums">
                        {formatNaira(analytics.verifiedAdRevenueNaira)}
                      </strong>
                    </div>
                    <div className="p-4 rounded-xl bg-[#FFF8DB] border border-[#D4A62A]/50">
                      <span className="text-[11px] font-bold text-[#10251D] block">Service Promo Revenue</span>
                      <strong className="text-xl font-black text-[#10251D] tabular-nums">
                        {formatNaira(analytics.verifiedServicePromoNaira)}
                      </strong>
                    </div>
                    <div className="p-4 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
                      <span className="text-[11px] font-bold text-[#555555] block">Combined Total</span>
                      <strong className="text-xl font-black text-[#087443] tabular-nums">
                        {formatNaira(analytics.verifiedAdRevenueNaira + analytics.verifiedServicePromoNaira)}
                      </strong>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {snapshot.adPayments.length === 0 && snapshot.paymentTransactions.length === 0 ? (
                      <p className="text-xs text-[#555555] py-4">No verified payment transactions recorded yet.</p>
                    ) : (
                      <>
                        {snapshot.paymentTransactions.map((tx) => (
                          <div key={tx.id} className="p-3 rounded-xl border border-[#10251D]/20 bg-[#F4F8F5] flex justify-between text-xs">
                            <div>
                              <strong>{tx.planName}</strong> ({tx.userName || tx.userEmail || tx.userId})
                              <span className="block text-[11px] text-[#555555]">
                                Ref: {tx.reference} • {tx.gateway.toUpperCase()} ({tx.status})
                              </span>
                            </div>
                            <strong className="text-[#087443] tabular-nums">{formatNaira(tx.amountNaira)}</strong>
                          </div>
                        ))}
                        {snapshot.adPayments.map((pay) => (
                          <div key={pay.id} className="p-3 rounded-xl border border-[#E5E7EB] flex justify-between text-xs">
                            <div>
                              <strong>{pay.businessName}</strong>
                              <span className="block text-[11px] text-[#555555]">
                                Ref: {pay.reference} • {pay.provider} ({pay.status})
                              </span>
                            </div>
                            <strong className="text-[#087443] tabular-nums">{formatNaira(pay.amountNaira)}</strong>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* 16. WEBSITE ANALYTICS */}
              {activeSection === 'analytics' && (
                <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-xs space-y-4">
                  <h2 className="text-base sm:text-lg font-black">
                    Live NIGERIA CAMPUS MARKET Analytics (Real Firestore Totals)
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
                              <span className="text-[11px] font-bold text-[#087443]">
                                {log.actorEmail}
                              </span>
                            )}
                            <p className="text-[#10251D] mt-0.5">{log.summary}</p>
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
                      <span className="font-bold text-[#087443]">
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
                      className="px-4 py-2.5 rounded-xl bg-[#087443] hover:bg-[#065D36] text-white text-xs font-black"
                    >
                      {busyAction === 'save-settings' ? 'Saving...' : 'Save Security Settings'}
                    </button>
                  </form>

                  {/* Pay-on-Delivery (COD) & Checkout Policy Manager */}
                  <div className="pt-5 border-t border-[#E5E7EB]">
                    <h3 className="text-base font-black text-[#10251D]">
                      Pay-on-Delivery (COD) &amp; Campus Checkout Policy
                    </h3>
                    <p className="text-xs text-[#555555] mt-0.5 mb-3">
                      Control whether buyers can select Pay on Delivery / Campus Handover on marketplace product and food orders.
                    </p>
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setBusyAction('save-cod');
                        try {
                          const updated = await ceoSaveCodPolicy(codPolicyDraft);
                          setCodPolicyDraft(updated);
                          flash('Pay-on-Delivery (COD) checkout policy updated!');
                        } catch (err: any) {
                          setErrorMsg(err?.message || 'Failed to update Pay-on-Delivery policy.');
                        } finally {
                          setBusyAction(null);
                        }
                      }}
                      className="space-y-3 max-w-lg text-xs bg-[#F4F8F5] p-4 rounded-xl border border-[#E5E7EB]"
                    >
                      <label className="flex items-center gap-2 font-bold text-[#10251D]">
                        <input
                          type="checkbox"
                          checked={codPolicyDraft.codEnabled}
                          onChange={(e) =>
                            setCodPolicyDraft((p) => ({ ...p, codEnabled: e.target.checked }))
                          }
                        />
                        <span>Enable Pay on Delivery for Marketplace Product Orders</span>
                      </label>
                      <label className="flex items-center gap-2 font-bold text-[#10251D]">
                        <input
                          type="checkbox"
                          checked={codPolicyDraft.codFoodEnabled}
                          onChange={(e) =>
                            setCodPolicyDraft((p) => ({ ...p, codFoodEnabled: e.target.checked }))
                          }
                        />
                        <span>Enable Pay on Delivery for Campus Food Orders</span>
                      </label>
                      <div>
                        <label className="block font-bold text-[#333333] mb-1">
                          Maximum COD Order Value (NGN)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={codPolicyDraft.codMaxOrderNaira}
                          onChange={(e) =>
                            setCodPolicyDraft((p) => ({
                              ...p,
                              codMaxOrderNaira: Number(e.target.value)
                            }))
                          }
                          className="w-full px-3 py-2 rounded-xl border border-[#D1D5DB] bg-white font-bold"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-[#333333] mb-1">
                          Checkout Buyer Guidance Note
                        </label>
                        <textarea
                          rows={2}
                          value={codPolicyDraft.codNote}
                          onChange={(e) =>
                            setCodPolicyDraft((p) => ({ ...p, codNote: e.target.value }))
                          }
                          className="w-full px-3 py-2 rounded-xl border border-[#D1D5DB] bg-white"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={busyAction === 'save-cod'}
                        className="px-4 py-2 rounded-xl bg-[#087443] hover:bg-[#065D36] text-white font-black cursor-pointer"
                      >
                        {busyAction === 'save-cod' ? 'Saving...' : 'Save COD Policy'}
                      </button>
                    </form>
                  </div>
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
            <div className="bg-[#087443] text-white px-5 py-4 flex items-center justify-between border-b-4 border-[#D4A62A]">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#D4A62A]" />
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
                  className="w-full py-2.5 rounded-xl bg-[#087443] text-white text-xs font-black"
                >
                  {reauthBusy ? 'Verifying...' : 'Confirm Password & Continue'}
                </button>
              </form>

              <button
                type="button"
                onClick={handleGoogleReauth}
                disabled={reauthBusy}
                className="w-full py-2.5 rounded-xl bg-[#10251D] text-[#D4A62A] text-xs font-black"
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
