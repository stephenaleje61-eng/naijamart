import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MapPin,
  ShieldCheck,
  ShoppingBag,
  ArrowRight,
  PlusCircle,
  X,
  CheckCircle2,
  HelpCircle,
  Home,
  MessageSquare,
  Users,
  Download,
  Smartphone,
  Info,
  SlidersHorizontal,
  Utensils,
  Calculator,
  Trophy,
  Store,
  Briefcase,
  BookOpen,
  Gift,
  GraduationCap,
  ChevronRight,
  ChefHat,
  Search,
  ShoppingCart,
  AlertTriangle,
  Flame,
  Eye,
  ShieldAlert,
  LogOut,
  ArrowLeft,
  Megaphone,
  Calendar,
  Clock,
  Sparkles
} from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import campusHostelShowcaseImg from './assets/images/nigeria_campus_hostel_1794988913033.jpg';
import campusFoodShowcaseImg from './assets/images/nigeria_campus_food_1794988912277.jpg';
import campusCommunityShowcaseImg from './assets/images/nigeria_campus_community_1794904561913.jpg';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import {
  Product,
  Category,
  ProductFilter,
  StudentRequest,
  AccommodationProperty,
  CartItem,
  CampusEvent,
  SportUpdatePost,
  GeneralAnnouncementPost,
  CommunityAnnouncementPost,
  PostCollectionName,
  Advertisement,
  AdPackageId,
  ServiceCategory,
  ServiceListing,
  EmergencyContact,
  SafetyAnnouncement,
  LostFoundItem,
  CeoSessionState,
  Institution,
  EmergencyReportKind,
  FoodVendor,
  CampusJobListing,
  CampusBookListing,
  AppSettings,
  UserSubscription,
  AppNotification,
  UserSettingsDocument
} from './types.js';
import { fetchProducts, fetchCategories, recordSiteVisit } from './services/api.js';
import { Header } from './components/Header.js';
import { NIGERIA_STATES } from './constants/states.js';
import { ALL_MARKETPLACE_CATEGORIES } from './constants/categories.js';
import {
  DEFAULT_INSTITUTION_CAMPUS,
  DEFAULT_INSTITUTION_ID,
  VERIFIED_NIGERIAN_INSTITUTIONS,
  belongsToInstitution,
  getInstitutionById,
  getInstitutionBySlugOrId,
  getInstitutionSlug
} from './constants/institutions.js';
import {
  getSelectedCampus,
  getSelectedInstitutionId,
  setSelectedCampus,
  setSelectedInstitutionId,
  subscribeToInstitutions,
  subscribeToInstitutionAccommodation
} from './services/institutions.js';
import { CategoryBar, getCategoryIcon } from './components/CategoryBar.js';
import { HeroBanner } from './components/HeroBanner.js';
import { ProductCard, formatNaira } from './components/ProductCard.js';
import { ProductDetailModal } from './components/ProductDetailModal.js';
import { SellProductModal } from './components/SellProductModal.js';
import { AuthModal } from './components/AuthModal.js';
import { SellerDashboard } from './components/SellerDashboard.js';
import { SellerStorefrontModal } from './components/SellerStorefrontModal.js';
import { AdminDashboard } from './components/AdminDashboard.js';
import { SafetyModal } from './components/SafetyModal.js';
import { Footer } from './components/Footer.js';
import { BikeRidersPage } from './components/BikeRidersPage.js';
import { SingleHubPage } from './components/SingleHubPage.js';
import { FriendsPage, DirectChatTarget } from './components/FriendsPage.js';
import { HuxPage } from './components/HuxPage.js';
import { WhatStudentsNeedPage } from './components/WhatStudentsNeedPage.js';
import { FoodMarketplacePage } from './components/FoodMarketplacePage.js';
import { CampusGpaCalculatorPage } from './components/CampusGpaCalculatorPage.js';
import {
  StudentOpportunitiesHubPage,
  OpportunitiesTab
} from './components/StudentOpportunitiesHubPage.js';
import { BuyerOrdersAccountPage } from './components/BuyerOrdersAccountPage.js';
import { CartOrderReviewModal } from './components/CartOrderReviewModal.js';
import { BottomNav, AppView } from './components/BottomNav.js';
import { OfflineIndicator } from './components/OfflineIndicator.js';
import { PlatformInfoModal, PlatformInfoTopic } from './components/PlatformInfoModal.js';
import { GuestChoiceModal } from './components/GuestChoiceModal.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import { BirthdayEventsSection } from './components/BirthdayEventsSection.js';
import { EventDetailModal } from './components/EventDetailModal.js';
import { CeoEventsManager } from './components/CeoEventsManager.js';
import { SportAndAnnouncementsSection } from './components/SportAndAnnouncementsSection.js';
import { PostAnnouncementModal } from './components/PostAnnouncementModal.js';
import { AnnouncementDetailModal } from './components/AnnouncementDetailModal.js';
import { AuthorProfileModal } from './components/AuthorProfileModal.js';
import {
  InstitutionDirectorySection,
  InstitutionSwitcherModal
} from './components/InstitutionDirectorySection.js';
import { InstitutionProfileBanner } from './components/InstitutionProfileBanner.js';
import { TrendingCampusesSection } from './components/TrendingCampusesSection.js';
import { NationwideSearchModal } from './components/NationwideSearchModal.js';
import { SubscriptionPlansModal } from './components/SubscriptionPlansModal.js';
import { DownloadAppModal } from './components/DownloadAppModal.js';
import { DownloadAppSection } from './components/DownloadAppSection.js';
import { HeroDownloadBanner } from './components/HeroDownloadBanner.js';
import { NotificationCenterModal } from './components/NotificationCenterModal.js';
import { UserProfileModal } from './components/UserProfileModal.js';
import {
  getCachedPublishedEvents,
  getEventByIdFromFirestore,
  getPublishedEventsFromFirestore,
  isAuthorizedCeo,
  subscribeToPublishedEvents
} from './services/events.js';
import {
  getAnnouncementById,
  getCachedGeneralAnnouncements,
  getCachedSportUpdates,
  subscribeToGeneralAnnouncements,
  subscribeToSavedAnnouncementIds,
  subscribeToSportUpdates
} from './services/announcements.js';
import { FuMarketAdsSection } from './components/FuMarketAdsSection.js';
import { AdDetailModal } from './components/AdDetailModal.js';
import { AdvertiseBusinessModal } from './components/AdvertiseBusinessModal.js';
import { SponsoredAdCard } from './components/SponsoredAdCard.js';
import { CeoMasterControlModal } from './components/CeoMasterControlModal.js';
import { CeoVerifiedBadge } from './components/CeoVerifiedBadge.js';
import {
  filterAdsForAudience,
  getCachedActivePublicAds,
  subscribeToActivePublicAds
} from './services/ads.js';
import { FuMarketServicesSection } from './components/FuMarketServicesSection.js';
import { PostServiceModal } from './components/PostServiceModal.js';
import { ServiceDetailModal } from './components/ServiceDetailModal.js';
import { ServicePromotionModal } from './components/ServicePromotionModal.js';
import { ServiceProviderDashboardModal } from './components/ServiceProviderDashboardModal.js';
import {
  DEFAULT_SERVICE_CATEGORIES,
  subscribeToPublicServices,
  subscribeToServiceCategories
} from './services/servicesMarketplace.js';
import { FuMarketEmergencySection } from './components/FuMarketEmergencySection.js';
import {
  EmergencyContactDirectoryModal,
  DirectoryFilter
} from './components/EmergencyContactDirectoryModal.js';
import { EmergencyReportModal } from './components/EmergencyReportModal.js';
import { ReportTrackingModal } from './components/ReportTrackingModal.js';
import { CampusSafetyInfoModal } from './components/CampusSafetyInfoModal.js';
import { LostAndFoundModal } from './components/LostAndFoundModal.js';
import {
  dispatchSafetyNotification,
  subscribeToEmergencyContacts,
  subscribeToLostFoundItems,
  subscribeToSafetyAnnouncements
} from './services/emergencyCentre.js';
import {
  subscribeToCampusBooks,
  subscribeToCampusJobs,
  subscribeToFoodVendors
} from './services/campusEcosystem.js';
import { subscribeToUserSubscriptions } from './services/monetization.js';
import { usePWAInstall } from './hooks/usePWAInstall.js';
import {
  auth,
  subscribeToFriendRequests,
  subscribeToStudentRequests,
  ensureGuestAuth,
  getCachedProductsSnapshot,
  invalidateProductsCache
} from './services/firebase.js';
import { CeoLoginPage } from './components/CeoLoginPage.js';
import { CeoSectionId, CeoSuperAdminDashboard } from './components/CeoSuperAdminDashboard.js';
import {
  fetchPublicAppSettings,
  getStoredCeoSession,
  isAuthorizedCeoEmail,
  logUnauthorizedCeoAccess,
  saveCeoSession,
  trackPwaInstallEvent
} from './services/ceoAdmin.js';
import {
  getLocalStudentSession,
  isGuestModeActive,
  activateGuestMode
} from './utils/studentAuth.js';
import { getProductDisplayImage } from './utils/productImages.js';
import { SettingsPage } from './components/settings/SettingsPage.js';
import {
  createDefaultUserSettings,
  reactivateUserAccount,
  registerOrHeartbeatSession,
  subscribeToCurrentSessionRevocation,
  subscribeToUserSettings
} from './services/settings.js';
import { applyAppearanceSettings } from './utils/theme.js';

const CART_STORAGE_KEY = 'fu_market_cart';

interface PricePreset {
  id: string;
  label: string;
  min?: number;
  max?: number;
}

const PRICE_PRESETS: PricePreset[] = [
  { id: 'all', label: 'All Prices' },
  { id: 'under-5k', label: 'Under ₦5,000', min: 0, max: 5000 },
  { id: '5k-20k', label: '₦5,000 – ₦20,000', min: 5000, max: 20000 },
  { id: '20k-plus', label: '₦20,000+', min: 20000 }
];

function resolveViewFromPath(): { view: AppView; universitySlug?: string } {
  if (typeof window === 'undefined') return { view: 'home' };
  const rawPath = window.location.pathname.toLowerCase();
  const path = rawPath.replace(/\/+$/, '') || '/';

  if (path.startsWith('/universities/')) {
    const slug = path.replace('/universities/', '').split('/')[0];
    if (slug) return { view: 'home', universitySlug: slug };
  }
  if (path === '/marketplace' || path.startsWith('/marketplace/')) return { view: 'marketplace' };
  if (path === '/accommodation' || path.startsWith('/hux') || path.includes('hux.html')) return { view: 'hux' };
  if (path === '/food' || path.startsWith('/food/')) return { view: 'food' };
  if (path === '/jobs' || path.startsWith('/jobs/')) return { view: 'jobs' };
  if (path === '/books' || path.startsWith('/books/')) return { view: 'books' };
  if (path === '/deals' || path.startsWith('/deals/')) return { view: 'deals' };
  if (path === '/giveaways' || path.startsWith('/giveaways/')) return { view: 'giveaways' };
  if (path === '/referrals' || path.startsWith('/referrals/')) return { view: 'referrals' };
  if (path === '/ambassadors' || path.startsWith('/ambassadors/')) return { view: 'ambassadors' };
  if (path === '/leaderboards' || path.startsWith('/leaderboards/')) return { view: 'leaderboards' };
  if (path === '/gpa-cgpa-calculator' || path === '/gpa') return { view: 'gpa' };
  if (path === '/orders') return { view: 'orders' };
  if (path === '/account') return { view: 'account' };
  if (path === '/settings' || path.startsWith('/settings/')) return { view: 'settings' };
  if (path.startsWith('/requests') || path.includes('requests.html')) return { view: 'requests' };
  if (path.startsWith('/hub') || path.includes('hub.html')) return { view: 'hub' };
  if (path.startsWith('/friends') || path.includes('friends.html')) return { view: 'friends' };
  if (path.startsWith('/bike-riders') || path.includes('bike-riders.html')) return { view: 'bike-riders' };
  return { view: 'home' };
}

type CeoRouteMode = 'marketplace' | 'ceo-login' | 'ceo-admin';

function resolveCeoRouteFromPath(): CeoRouteMode {
  if (typeof window === 'undefined') return 'marketplace';
  const path = window.location.pathname.toLowerCase().replace(/\/+$/, '');
  if (path === '/ceo-login' || path.startsWith('/ceo-login/')) return 'ceo-login';
  if (
    path === '/admin' ||
    path.startsWith('/admin/') ||
    path === '/ceo-admin' ||
    path.startsWith('/ceo-admin/')
  ) {
    return 'ceo-admin';
  }
  return 'marketplace';
}

function getTargetPathForView(view: AppView): string {
  switch (view) {
    case 'home':
      return '/';
    case 'marketplace':
      return '/marketplace';
    case 'hux':
      return '/accommodation';
    case 'food':
      return '/food';
    case 'jobs':
      return '/jobs';
    case 'books':
      return '/books';
    case 'deals':
      return '/deals';
    case 'giveaways':
      return '/giveaways';
    case 'referrals':
      return '/referrals';
    case 'ambassadors':
      return '/ambassadors';
    case 'leaderboards':
      return '/leaderboards';
    case 'gpa':
      return '/gpa-cgpa-calculator';
    case 'orders':
      return '/orders';
    case 'account':
      return '/account';
    case 'settings':
      return '/settings';
    case 'requests':
      return '/requests.html';
    case 'hub':
      return '/hub.html';
    case 'friends':
      return '/friends.html';
    case 'bike-riders':
      return '/bike-riders.html';
    default:
      return '/';
  }
}

function loadCartFromStorage(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const DEFAULT_APP_SETTINGS: AppSettings = {
  id: 'app_distribution',
  apkUrl: '',
  playStoreUrl: '',
  apkEnabled: false,
  appVersion: '2.0.0',
  releaseNotes: 'Fast, lightweight Nigerian Campus Commerce PWA.',
  installAnnouncement: 'Install NIGERIA CAMPUS MARKET on your phone for instant campus deals.',
  installInstructions: 'Tap Install App in Chrome or Add to Home Screen in iOS Safari.'
};

function MainMarketplace() {
  const { user, firebaseUser, favourites, notifications, refreshUser, logout } = useAuth();
  const { isInstallable, isInstalled, isIOS, platform, deviceType, browserType, install } =
    usePWAInstall();

  const initialRoute = useMemo(() => resolveViewFromPath(), []);

  // National Institution Directory & Active Campus Selection
  const [institutions, setInstitutions] = useState<Institution[]>(VERIFIED_NIGERIAN_INSTITUTIONS);
  const [selectedInstitutionId, setSelectedInstitutionIdState] = useState<string>(() => {
    if (initialRoute.universitySlug) {
      const matched = getInstitutionBySlugOrId(initialRoute.universitySlug, VERIFIED_NIGERIAN_INSTITUTIONS);
      if (matched) {
        setSelectedInstitutionId(matched.id);
        setSelectedCampus(matched.campus || DEFAULT_INSTITUTION_CAMPUS);
        return matched.id;
      }
    }
    return getSelectedInstitutionId();
  });
  const [selectedCampus, setSelectedCampusState] = useState<string>(() => getSelectedCampus());
  const [showInstitutionSwitcher, setShowInstitutionSwitcher] = useState<boolean>(false);
  const [showUserProfileModal, setShowUserProfileModal] = useState<boolean>(false);

  const activeInstitution = useMemo(
    () =>
      selectedInstitutionId === 'all'
        ? undefined
        : getInstitutionById(selectedInstitutionId, institutions),
    [selectedInstitutionId, institutions]
  );

  // Private CEO Route & Session State
  const [ceoRouteMode, setCeoRouteMode] = useState<CeoRouteMode>(() => resolveCeoRouteFromPath());
  const [ceoInitialSection, setCeoInitialSection] = useState<CeoSectionId>('overview');
  const [ceoSession, setCeoSession] = useState<CeoSessionState | null>(() => getStoredCeoSession());
  const [ceoLoginNotice, setCeoLoginNotice] = useState<string | null>(null);
  const [firebaseAuthChecked, setFirebaseAuthChecked] = useState<boolean>(() =>
    Boolean(auth.currentUser)
  );
  const unauthorizedCeoLogRef = useRef<string | null>(null);

  // Multi-page route state
  const [currentView, setCurrentView] = useState<AppView>(() => initialRoute.view);
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);
  const [directChatTarget, setDirectChatTarget] = useState<DirectChatTarget | null>(null);

  // Cart & Modals state
  const [cartItems, setCartItems] = useState<CartItem[]>(() => loadCartFromStorage());
  const [showCartModal, setShowCartModal] = useState<boolean>(false);
  const [showNationwideSearch, setShowNationwideSearch] = useState<boolean>(false);
  const [showSubscriptionsModal, setShowSubscriptionsModal] = useState<boolean>(false);
  const [showDownloadAppModal, setShowDownloadAppModal] = useState<boolean>(false);
  const [dismissInstallPill, setDismissInstallPill] = useState<boolean>(false);
  const [showNotificationModal, setShowNotificationModal] = useState<boolean>(false);
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [userSubscriptions, setUserSubscriptions] = useState<UserSubscription[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettingsDocument>(() =>
    createDefaultUserSettings(user)
  );
  const [reactivatingAccount, setReactivatingAccount] = useState<boolean>(false);

  // Live previews for homepage sections
  const [allStudentRequests, setAllStudentRequests] = useState<StudentRequest[]>([]);
  const [allAccommodation, setAllAccommodation] = useState<AccommodationProperty[]>([]);
  const [foodVendors, setFoodVendors] = useState<FoodVendor[]>([]);
  const [campusJobs, setCampusJobs] = useState<CampusJobListing[]>([]);
  const [campusBooks, setCampusBooks] = useState<CampusBookListing[]>([]);

  // Events, Sports & General Announcements
  const [campusEvents, setCampusEvents] = useState<CampusEvent[]>(() => getCachedPublishedEvents());
  const [eventsLoading, setEventsLoading] = useState<boolean>(
    () => getCachedPublishedEvents().length === 0
  );
  const [selectedEvent, setSelectedEvent] = useState<CampusEvent | null>(null);
  const [showCeoEventsModal, setShowCeoEventsModal] = useState<boolean>(false);

  const [sportUpdates, setSportUpdates] = useState<SportUpdatePost[]>(() => getCachedSportUpdates());
  const [generalAnnouncements, setGeneralAnnouncements] = useState<GeneralAnnouncementPost[]>(() =>
    getCachedGeneralAnnouncements()
  );
  const [announcementsLoading, setAnnouncementsLoading] = useState<boolean>(
    () => getCachedSportUpdates().length === 0 && getCachedGeneralAnnouncements().length === 0
  );
  const [savedAnnouncementIds, setSavedAnnouncementIds] = useState<Set<string>>(() => new Set());
  const [selectedAnnouncement, setSelectedAnnouncement] =
    useState<CommunityAnnouncementPost | null>(null);
  const [postAnnouncementModalState, setPostAnnouncementModalState] = useState<{
    open: boolean;
    defaultFeedType: 'sport_update' | 'general_announcement';
    editingPost?: CommunityAnnouncementPost | null;
  }>({ open: false, defaultFeedType: 'sport_update', editingPost: null });
  const [authorProfileTarget, setAuthorProfileTarget] = useState<{
    authorId: string;
    authorName: string;
    authorAvatar?: string;
  } | null>(null);

  // Official Ads, Advertising Requests & CEO Master Control
  const [activePublicAds, setActivePublicAds] = useState<Advertisement[]>(() =>
    getCachedActivePublicAds()
  );
  const [adsLoading, setAdsLoading] = useState<boolean>(
    () => getCachedActivePublicAds().length === 0
  );
  const [selectedAd, setSelectedAd] = useState<Advertisement | null>(null);
  const [advertiseModalState, setAdvertiseModalState] = useState<{
    open: boolean;
    packageId?: AdPackageId;
  }>({ open: false, packageId: 'featured' });
  const [showCeoMasterControl, setShowCeoMasterControl] = useState<boolean>(false);

  // Student Services Marketplace
  const [publicServices, setPublicServices] = useState<ServiceListing[]>([]);
  const [servicesLoading, setServicesLoading] = useState<boolean>(true);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>(
    DEFAULT_SERVICE_CATEGORIES
  );
  const [selectedServiceState, setSelectedServiceState] = useState<{
    service: ServiceListing;
    showContact: boolean;
  } | null>(null);
  const [postServiceModalState, setPostServiceModalState] = useState<{
    open: boolean;
    editingService?: ServiceListing | null;
  }>({ open: false, editingService: null });
  const [promoteServiceTarget, setPromoteServiceTarget] = useState<ServiceListing | null>(null);
  const [showServiceProviderDashboard, setShowServiceProviderDashboard] =
    useState<boolean>(false);
  const [adminInitialTab, setAdminInitialTab] = useState<
    'overview' | 'services' | 'emergency'
  >('overview');

  // Campus Emergency & Help Centre
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [safetyAnnouncements, setSafetyAnnouncements] = useState<SafetyAnnouncement[]>([]);
  const [lostFoundItems, setLostFoundItems] = useState<LostFoundItem[]>([]);
  const [emergencyDirectoryState, setEmergencyDirectoryState] = useState<{
    open: boolean;
    filter: DirectoryFilter;
  }>({ open: false, filter: 'all' });
  const [emergencyReportModalState, setEmergencyReportModalState] = useState<{
    open: boolean;
    kind: EmergencyReportKind;
    defaultCategory?: string;
  }>({ open: false, kind: 'emergency' });
  const [showReportTrackingModal, setShowReportTrackingModal] = useState<boolean>(false);
  const [showCampusSafetyInfoModal, setShowCampusSafetyInfoModal] = useState<boolean>(false);
  const [showLostAndFoundModal, setShowLostAndFoundModal] = useState<boolean>(false);

  const [showPWAInstructions, setShowPWAInstructions] = useState(false);
  const [platformInfoTopic, setPlatformInfoTopic] = useState<PlatformInfoTopic | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch {
      // ignore storage quota errors
    }
  }, [cartItems]);

  useEffect(() => {
    const handlePopState = () => {
      const resolved = resolveViewFromPath();
      if (resolved.universitySlug) {
        const matched = getInstitutionBySlugOrId(resolved.universitySlug, institutions);
        if (matched) {
          setSelectedInstitutionId(matched.id);
          setSelectedCampus(matched.campus || DEFAULT_INSTITUTION_CAMPUS);
          setSelectedInstitutionIdState(matched.id);
          setSelectedCampusState(matched.campus || DEFAULT_INSTITUTION_CAMPUS);
        }
      }
      setCurrentView(resolved.view);
      setCeoRouteMode(resolveCeoRouteFromPath());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [institutions]);

  useEffect(() => {
    fetchPublicAppSettings()
      .then((res) => {
        if (res) setAppSettings(res);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    recordSiteVisit(deviceType, selectedInstitutionId).catch(() => {});
  }, [deviceType]);

  useEffect(() => {
    if (!firebaseUser?.uid || firebaseUser.isAnonymous) {
      setUserSubscriptions([]);
      return;
    }
    const unsub = subscribeToUserSubscriptions(firebaseUser.uid, setUserSubscriptions);
    return () => unsub();
  }, [firebaseUser?.uid, firebaseUser?.isAnonymous]);

  useEffect(() => {
    const unsub = subscribeToUserSettings(user?.id, user, (next) => {
      setUserSettings(next);
      applyAppearanceSettings(next.appearance);
    });
    return () => unsub();
  }, [user?.id, firebaseUser?.uid]);

  useEffect(() => {
    if (!firebaseUser?.uid || firebaseUser.isAnonymous || user?.id !== firebaseUser.uid) {
      return;
    }
    registerOrHeartbeatSession(user.id).catch(() => {});
    const unsubRevocation = subscribeToCurrentSessionRevocation(user.id, () => {
      logout();
      setNotificationToast('This device session was signed out remotely.');
      setTimeout(() => setNotificationToast(null), 4000);
    });
    return () => unsubRevocation();
  }, [firebaseUser?.uid, firebaseUser?.isAnonymous, user?.id]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseAuthChecked(true);
      if (!fbUser || !isAuthorizedCeoEmail(fbUser.email) || !fbUser.emailVerified) {
        setCeoSession((prev) => {
          if (prev) saveCeoSession(null);
          return null;
        });
      }
    });
    return () => unsub();
  }, []);

  const isCeoRouteAuthorized = Boolean(
    ceoSession?.authorized &&
      ceoSession.sessionExpiresAt > Date.now() &&
      auth.currentUser &&
      isAuthorizedCeoEmail(auth.currentUser.email) &&
      auth.currentUser.emailVerified
  );

  useEffect(() => {
    if (!firebaseAuthChecked) return;
    if (ceoRouteMode !== 'ceo-admin') {
      unauthorizedCeoLogRef.current = null;
      return;
    }
    if (!isCeoRouteAuthorized) {
      const currentPath =
        (typeof window !== 'undefined' && window.location.pathname) || '/admin';
      const actorKey = `${auth.currentUser?.uid || 'anon'}:${user?.email || 'anon'}:${currentPath}`;
      if (unauthorizedCeoLogRef.current !== actorKey) {
        unauthorizedCeoLogRef.current = actorKey;
        logUnauthorizedCeoAccess(
          `Blocked unauthorized or unauthenticated direct access to ${currentPath} route.`,
          currentPath,
          auth.currentUser?.email || user?.email || 'anonymous'
        );
      }
      if (ceoSession) {
        setCeoSession(null);
        saveCeoSession(null);
      }
      setCeoLoginNotice('Access Denied: Only the authorized NIGERIA CAMPUS MARKET Super Administrator may access this route.');
    }
  }, [firebaseAuthChecked, ceoRouteMode, isCeoRouteAuthorized, ceoSession, user?.email]);

  // Public real-time Firestore feeds
  useEffect(() => {
    let active = true;
    const unsubs: (() => void)[] = [];

    unsubs.push(
      subscribeToPublishedEvents(
        (list) => {
          if (active) {
            setCampusEvents(list);
            setEventsLoading(false);
          }
        },
        () => {
          if (active) setEventsLoading(false);
        }
      )
    );

    unsubs.push(
      subscribeToActivePublicAds(
        (list) => {
          if (active) {
            setActivePublicAds(list);
            setAdsLoading(false);
          }
        },
        () => {
          if (active) setAdsLoading(false);
        }
      )
    );

    const params = new URLSearchParams(window.location.search);
    const sharedEventId = params.get('event');
    if (sharedEventId) {
      getEventByIdFromFirestore(sharedEventId).then((found) => {
        if (active && found && found.status === 'published') {
          setSelectedEvent(found);
        }
      });
    }

    const sharedPostId = params.get('post');
    const sharedPostType = params.get('type');
    if (sharedPostId) {
      const colName: PostCollectionName =
        sharedPostType === 'general_announcements' ? 'general_announcements' : 'sport_updates';
      getAnnouncementById(colName, sharedPostId).then((found) => {
        if (active && found && found.status === 'published') {
          setSelectedAnnouncement(found);
        }
      });
    }

    const midTimer = setTimeout(() => {
      if (!active) return;

      unsubs.push(
        subscribeToSportUpdates(
          (list) => {
            if (active) {
              setSportUpdates(list);
              setAnnouncementsLoading(false);
            }
          },
          () => {
            if (active) setAnnouncementsLoading(false);
          }
        )
      );

      unsubs.push(
        subscribeToGeneralAnnouncements(
          (list) => {
            if (active) {
              setGeneralAnnouncements(list);
              setAnnouncementsLoading(false);
            }
          },
          () => {
            if (active) setAnnouncementsLoading(false);
          }
        )
      );

      unsubs.push(
        subscribeToPublicServices(
          (list) => {
            if (active) {
              setPublicServices(list);
              setServicesLoading(false);
            }
          },
          () => {
            if (active) setServicesLoading(false);
          }
        )
      );

      unsubs.push(
        subscribeToServiceCategories((cats) => {
          if (active && cats.length > 0) {
            setServiceCategories(cats);
          }
        })
      );
    }, 250);

    let safetyHydrated = false;
    const seenAlertIds = new Set<string>();
    const emergencyTimer = setTimeout(() => {
      if (!active) return;

      unsubs.push(
        subscribeToEmergencyContacts((list) => {
          if (active) setEmergencyContacts(list);
        })
      );

      unsubs.push(
        subscribeToSafetyAnnouncements((list) => {
          if (!active) return;
          if (!safetyHydrated) {
            list.forEach((item) => seenAlertIds.add(item.id));
            safetyHydrated = true;
          } else {
            for (const item of list) {
              if (!seenAlertIds.has(item.id)) {
                seenAlertIds.add(item.id);
                dispatchSafetyNotification(item).catch(() => {});
              }
            }
          }
          setSafetyAnnouncements(list);
        })
      );

      unsubs.push(
        subscribeToLostFoundItems((list) => {
          if (active) setLostFoundItems(list);
        })
      );
    }, 450);

    return () => {
      active = false;
      clearTimeout(midTimer);
      clearTimeout(emergencyTimer);
      for (const unsub of unsubs) {
        unsub();
      }
    };
  }, []);

  useEffect(() => {
    const unsubSaved = subscribeToSavedAnnouncementIds((ids) => {
      setSavedAnnouncementIds(ids);
    });
    return () => unsubSaved();
  }, [user?.id, firebaseUser?.uid]);

  useEffect(() => {
    const student = getLocalStudentSession();
    const studentId =
      firebaseUser?.uid && !firebaseUser.isAnonymous
        ? firebaseUser.uid
        : student?.id && auth.currentUser && !auth.currentUser.isAnonymous && student.id === auth.currentUser.uid
        ? student.id
        : undefined;
    let unsubReq = () => {};
    if (studentId) {
      unsubReq = subscribeToFriendRequests(studentId, (requests) => {
        const pending = requests.filter((r) => r.toId === studentId && r.status === 'pending');
        setPendingRequestsCount(pending.length);
      });
    }

    let unsubStudentReqs = () => {};
    let unsubHux = () => {};
    let unsubInsts = () => {};
    let unsubFood = () => {};
    let unsubJobs = () => {};
    let unsubBooks = () => {};
    const previewTimer = setTimeout(() => {
      unsubInsts = subscribeToInstitutions((list) => {
        if (list.length > 0) setInstitutions(list);
      });

      unsubStudentReqs = subscribeToStudentRequests((list) => {
        setAllStudentRequests(list);
      });

      unsubHux = subscribeToInstitutionAccommodation('all', 'all', (list) => {
        setAllAccommodation(list.filter((l) => l.isAvailable !== false));
      });

      unsubFood = subscribeToFoodVendors((list) => {
        setFoodVendors(list);
      });

      unsubJobs = subscribeToCampusJobs((list) => {
        setCampusJobs(list.filter((j) => j.status === 'active'));
      });

      unsubBooks = subscribeToCampusBooks((list) => {
        setCampusBooks(list.filter((b) => b.status === 'active'));
      });
    }, 600);

    return () => {
      clearTimeout(previewTimer);
      unsubReq();
      unsubInsts();
      unsubStudentReqs();
      unsubHux();
      unsubFood();
      unsubJobs();
      unsubBooks();
    };
  }, [user?.id]);

  const handleSelectInstitution = (institutionId: string, campus: string, pushUniversityUrl = true) => {
    setSelectedInstitutionId(institutionId);
    setSelectedCampus(campus);
    setSelectedInstitutionIdState(institutionId);
    setSelectedCampusState(campus);
    setVisibleCount(16);
    if (institutionId === 'all') {
      if (pushUniversityUrl && currentView === 'home') {
        window.history.pushState(null, '', '/');
      }
      showToast('Viewing all Nigerian universities & polytechnics.');
    } else {
      const inst = getInstitutionById(institutionId, institutions);
      if (pushUniversityUrl && (currentView === 'home' || currentView === 'marketplace')) {
        const slugUrl = `/universities/${getInstitutionSlug(inst)}`;
        if (window.location.pathname !== slugUrl) {
          window.history.pushState(null, '', slugUrl);
        }
      }
      showToast(`Switched campus marketplace to ${inst.shortName} (${campus}).`);
    }
  };

  const navigateCeoRoute = (
    mode: CeoRouteMode,
    notice?: string | null,
    section?: CeoSectionId
  ) => {
    if (section) {
      setCeoInitialSection(section);
    }
    if (notice !== undefined) {
      setCeoLoginNotice(notice);
    }
    setCeoRouteMode(mode);
    const currentPath =
      typeof window !== 'undefined' ? window.location.pathname.toLowerCase().replace(/\/+$/, '') : '';
    const adminRoutePath =
      currentPath === '/admin' || currentPath.startsWith('/admin/') ? '/admin' : '/ceo-admin';
    const targetPath =
      mode === 'ceo-login' ? '/ceo-login' : mode === 'ceo-admin' ? adminRoutePath : '/';
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToView = (view: AppView) => {
    setCeoRouteMode('marketplace');
    setCurrentView(view);
    const targetPath = getTargetPathForView(view);
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToSectionId = (sectionId: string) => {
    if (currentView !== 'home') {
      navigateToView('home');
    }
    setViewingFavouritesOnly(false);
    setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 150);
  };

  const scrollToServicesSection = () => scrollToSectionId('fu-market-services');
  const scrollToEventsSection = () => scrollToSectionId('campus-events-section');
  const scrollToEmergencySection = () => scrollToSectionId('fu-market-campus-emergency');

  const handleOpenAdvertiseModal = (packageId: AdPackageId = 'featured') => {
    setAdvertiseModalState({ open: true, packageId });
  };

  const scrollToAdsSectionOrCeo = () => {
    if (isAuthorizedCeo(user)) {
      navigateCeoRoute(isCeoRouteAuthorized ? 'ceo-admin' : 'ceo-login', null, 'ads');
      return;
    }
    handleOpenAdvertiseModal('featured');
  };

  const hasActiveIdentityForActions = () =>
    Boolean(user || isGuestModeActive() || getLocalStudentSession());

  const handleRequestSellModal = () => {
    if (hasActiveIdentityForActions()) {
      setShowSellModal(true);
    } else {
      setPendingGuestAction({ type: 'post' });
    }
  };

  const handleStartDirectChat = (target: DirectChatTarget) => {
    if (hasActiveIdentityForActions()) {
      setDirectChatTarget(target);
      navigateToView('friends');
    } else {
      setPendingGuestAction({ type: 'chat', target });
    }
  };

  // Cart handlers
  const addToCart = (product: Product) => {
    const imgUrl = getProductDisplayImage(product.images, product.imageUrl) || '';
    setCartItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id
            ? { ...i, quantity: Math.min(product.quantity || 20, i.quantity + 1) }
            : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          title: product.title,
          price: product.price,
          quantity: 1,
          imageUrl: imgUrl,
          sellerId: product.sellerId,
          sellerName: product.sellerName,
          shopName: product.shopName,
          whatsappNumber: product.whatsappNumber || '',
          maxQuantity: product.quantity || 20
        }
      ];
    });
    showToast(`Added "${product.title}" to cart`);
    setShowCartModal(true);
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    setCartItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity: Math.max(1, quantity) } : i))
    );
  };

  const removeFromCart = (productId: string) => {
    setCartItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const clearCart = () => setCartItems([]);

  // Data states
  const initialCachedProducts = useRef<Product[] | null>(getCachedProductsSnapshot());
  const [categories, setCategories] = useState<Category[]>(ALL_MARKETPLACE_CATEGORIES);
  const [products, setProducts] = useState<Product[]>(() => initialCachedProducts.current || []);
  const [loading, setLoading] = useState<boolean>(
    () => !(initialCachedProducts.current && initialCachedProducts.current.length > 0)
  );
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [visibleCount, setVisibleCount] = useState<number>(12);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [, setPagination] = useState(() => ({
    total: initialCachedProducts.current?.length || 0,
    page: 1,
    pageSize: 24,
    totalPages: 1
  }));
  const catalogRequestIdRef = useRef<number>(0);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedState, setSelectedState] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [conditionFilter, setConditionFilter] = useState<string>('all');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [activePricePreset, setActivePricePreset] = useState<string>('all');
  const [sortOption, setSortOption] = useState<'newest' | 'price-asc' | 'price-desc' | 'popular'>('newest');
  const [viewingFavouritesOnly, setViewingFavouritesOnly] = useState<boolean>(false);

  // Modals state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSellerStorefrontId, setSelectedSellerStorefrontId] = useState<string | null>(null);
  const [showSellModal, setShowSellModal] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [authModalRole, setAuthModalRole] = useState<'buyer' | 'seller'>('buyer');
  const [showSellerDashboard, setShowSellerDashboard] = useState<boolean>(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState<boolean>(false);
  const [showSafetyModal, setShowSafetyModal] = useState<boolean>(false);
  const [notificationToast, setNotificationToast] = useState<string | null>(null);
  const [pendingGuestAction, setPendingGuestAction] = useState<
    { type: 'post' } | { type: 'chat'; target: DirectChatTarget } | null
  >(null);

  const productCatalogRef = useRef<HTMLDivElement>(null);
  const downloadAppRef = useRef<HTMLDivElement>(null);

  const handleProductPostSuccess = async () => {
    invalidateProductsCache();
    setSelectedCategory('all');
    setSelectedState('all');
    setSearchQuery('');
    setMinPrice('');
    setMaxPrice('');
    setActivePricePreset('all');
    setViewingFavouritesOnly(false);

    await Promise.all([loadCatalogProducts(1, true), loadCategories()]);
    showToast('Product published on NIGERIA CAMPUS MARKET!');

    setTimeout(() => {
      productCatalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
  };

  const loadCategories = async () => {
    try {
      const data = await fetchCategories();
      if (Array.isArray(data) && data.length > 0) {
        const countsMap = new Map(data.map((c) => [c.id, c.productCount || 0]));
        const merged: Category[] = ALL_MARKETPLACE_CATEGORIES.map((cat) => ({
          ...cat,
          productCount: countsMap.get(cat.id) ?? cat.productCount ?? 0
        }));
        for (const remoteCat of data) {
          if (!merged.some((m) => m.id === remoteCat.id)) {
            merged.push({
              ...remoteCat,
              productCount: remoteCat.productCount ?? 0
            });
          }
        }
        setCategories(merged);
      }
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  const loadCatalogProducts = async (page = 1, forceRefresh = false) => {
    const requestId = ++catalogRequestIdRef.current;
    const minVal = minPrice !== '' && !isNaN(Number(minPrice)) ? Number(minPrice) : undefined;
    const maxVal = maxPrice !== '' && !isNaN(Number(maxPrice)) ? Number(maxPrice) : undefined;

    const cachedSlice = !forceRefresh
      ? getCachedProductsSnapshot({
          institutionId: selectedInstitutionId,
          categoryId: selectedCategory,
          state: selectedState,
          searchQuery,
          condition: conditionFilter,
          minPrice: minVal,
          maxPrice: maxVal,
          sort: sortOption
        })
      : null;

    if (cachedSlice && cachedSlice.length > 0) {
      setProducts(cachedSlice);
      setPagination({
        total: cachedSlice.length,
        page,
        pageSize: 24,
        totalPages: Math.max(1, Math.ceil(cachedSlice.length / 24))
      });
      setLoading(false);
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }

    setFetchError(null);

    let timedOut = false;
    const timeoutTimer = setTimeout(() => {
      timedOut = true;
      if (catalogRequestIdRef.current === requestId) {
        if (!cachedSlice || cachedSlice.length === 0) {
          setProducts([]);
          setPagination({ total: 0, page: 1, pageSize: 24, totalPages: 1 });
          setFetchError('Listings request timed out after 12 seconds. Tap Retry or wait for automatic reconnection.');
        }
        setLoading(false);
        setIsRefreshing(false);
      }
    }, 12000);

    try {
      const filters: ProductFilter = {
        institutionId: selectedInstitutionId,
        category: selectedCategory,
        state: selectedState,
        q: searchQuery,
        condition: conditionFilter,
        minPrice: minVal,
        maxPrice: maxVal,
        sort: sortOption,
        page,
        forceRefresh
      };

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error('Listings request timed out after 12 seconds. Tap Retry or wait for automatic reconnection.')),
          12000
        );
      });

      const res = await Promise.race([fetchProducts(filters), timeoutPromise]);
      if (timedOut || catalogRequestIdRef.current !== requestId) return;

      const items = Array.isArray(res?.items) ? res.items : [];
      setProducts(items);
      setPagination(
        res?.pagination || {
          total: items.length,
          page,
          pageSize: 24,
          totalPages: 1
        }
      );
      setFetchError(null);
    } catch (err: any) {
      if (timedOut || catalogRequestIdRef.current !== requestId) return;
      console.error('Failed to fetch products', err);
      if (!cachedSlice || cachedSlice.length === 0) {
        setProducts([]);
        setPagination({ total: 0, page: 1, pageSize: 24, totalPages: 1 });
        setFetchError(err?.message || 'Unable to load listings right now.');
      }
    } finally {
      clearTimeout(timeoutTimer);
      if (!timedOut && catalogRequestIdRef.current === requestId) {
        setLoading(false);
        setIsRefreshing(false);
      }
    }
  };

  useEffect(() => {
    const handleReconnectRetry = () => {
      loadCategories();
      if (fetchError || products.length === 0) {
        loadCatalogProducts(1, true);
      }
    };
    window.addEventListener('ncm:connection-restored', handleReconnectRetry);
    window.addEventListener('online', handleReconnectRetry);
    return () => {
      window.removeEventListener('ncm:connection-restored', handleReconnectRetry);
      window.removeEventListener('online', handleReconnectRetry);
    };
  }, [fetchError, products.length]);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    setVisibleCount(currentView === 'marketplace' ? 24 : 12);
    loadCatalogProducts(1);
  }, [
    selectedInstitutionId,
    selectedCategory,
    selectedState,
    searchQuery,
    conditionFilter,
    minPrice,
    maxPrice,
    sortOption
  ]);

  const handleSelectPricePreset = (preset: PricePreset) => {
    setActivePricePreset(preset.id);
    setMinPrice(preset.min !== undefined && preset.min > 0 ? String(preset.min) : '');
    setMaxPrice(preset.max !== undefined ? String(preset.max) : '');
  };

  const handleStartShopping = () => {
    if (currentView !== 'home' && currentView !== 'marketplace') {
      navigateToView('marketplace');
    }
    setTimeout(() => {
      productCatalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleTriggerPWAHelp = () => {
    setShowPWAInstructions(true);
    setShowDownloadAppModal(true);
  };

  const handleOpenAuth = (mode: 'login' | 'register' = 'login', role: 'buyer' | 'seller' = 'buyer') => {
    setAuthModalMode(mode);
    setAuthModalRole(role);
    setShowAuthModal(true);
  };

  const showToast = (msg: string, _type: 'success' | 'error' | 'info' = 'success') => {
    setNotificationToast(msg);
    setTimeout(() => setNotificationToast(null), 3500);
  };

  const resetAllFilters = () => {
    setSelectedCategory('all');
    setSelectedState('all');
    setConditionFilter('all');
    setMinPrice('');
    setMaxPrice('');
    setActivePricePreset('all');
    setSearchQuery('');
    setViewingFavouritesOnly(false);
  };

  const hasActiveFilters =
    selectedCategory !== 'all' ||
    selectedState !== 'all' ||
    conditionFilter !== 'all' ||
    minPrice !== '' ||
    maxPrice !== '' ||
    searchQuery !== '' ||
    viewingFavouritesOnly;

  const displayedProducts = viewingFavouritesOnly
    ? products.filter((p) => favourites.includes(p.id))
    : products;

  const visibleProducts = displayedProducts.slice(0, visibleCount);
  const hasMoreProducts = displayedProducts.length > visibleProducts.length;

  useEffect(() => {
    if (!hasMoreProducts || !loadMoreRef.current) return;
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleCount((prev) => prev + 12);
        }
      },
      { rootMargin: '250px' }
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMoreProducts, visibleProducts.length]);

  const totalCartItems = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  const heroAds = useMemo(() => {
    const featured = filterAdsForAudience(activePublicAds, {
      institutionId: selectedInstitutionId,
      campus: selectedCampus,
      institutions,
      placement: 'homepage_featured'
    });
    if (featured.length > 0) return featured;
    return filterAdsForAudience(activePublicAds, {
      institutionId: selectedInstitutionId,
      campus: selectedCampus,
      institutions,
      placement: 'homepage_hero'
    });
  }, [activePublicAds, selectedInstitutionId, selectedCampus, institutions]);

  const marketplaceAds = useMemo(
    () =>
      filterAdsForAudience(activePublicAds, {
        institutionId: selectedInstitutionId,
        campus: selectedCampus,
        institutions,
        placement: 'marketplace_sponsored',
        categoryId: selectedCategory !== 'all' ? selectedCategory : undefined
      }),
    [activePublicAds, selectedInstitutionId, selectedCampus, institutions, selectedCategory]
  );

  const universitySpotlightAds = useMemo(
    () =>
      selectedInstitutionId !== 'all'
        ? filterAdsForAudience(activePublicAds, {
            institutionId: selectedInstitutionId,
            campus: selectedCampus,
            institutions,
            placement: 'university_homepage'
          })
        : [],
    [activePublicAds, selectedInstitutionId, selectedCampus, institutions]
  );

  const categoryFeedAds = useMemo(
    () =>
      selectedCategory !== 'all'
        ? filterAdsForAudience(activePublicAds, {
            institutionId: selectedInstitutionId,
            campus: selectedCampus,
            institutions,
            placement: 'category_feed',
            categoryId: selectedCategory
          })
        : [],
    [activePublicAds, selectedInstitutionId, selectedCampus, institutions, selectedCategory]
  );

  const latestRequests = useMemo(
    () =>
      allStudentRequests
        .filter((r) => belongsToInstitution(r.institutionId, selectedInstitutionId))
        .slice(0, 3),
    [allStudentRequests, selectedInstitutionId]
  );

  const latestAccommodation = useMemo(
    () =>
      allAccommodation
        .filter((h) => belongsToInstitution(h.institutionId, selectedInstitutionId))
        .slice(0, 3),
    [allAccommodation, selectedInstitutionId]
  );

  const latestFoodVendors = useMemo(
    () =>
      foodVendors
        .filter((v) => v.status !== 'suspended' && belongsToInstitution(v.institutionId, selectedInstitutionId))
        .slice(0, 3),
    [foodVendors, selectedInstitutionId]
  );

  const latestJobs = useMemo(
    () =>
      campusJobs
        .filter(
          (j) =>
            j.status === 'active' &&
            (j.isNationwide ||
              selectedInstitutionId === 'all' ||
              belongsToInstitution(j.institutionId, selectedInstitutionId))
        )
        .slice(0, 3),
    [campusJobs, selectedInstitutionId]
  );

  const latestBooks = useMemo(
    () =>
      campusBooks
        .filter(
          (b) =>
            b.status === 'active' &&
            (selectedInstitutionId === 'all' ||
              belongsToInstitution(b.institutionId, selectedInstitutionId))
        )
        .slice(0, 3),
    [campusBooks, selectedInstitutionId]
  );

  const trendingProducts = useMemo(() => {
    const sorted = [...displayedProducts].sort((a, b) => {
      const scoreB = Number(b.views || 0) + Number(b.whatsappClicks || 0) * 2;
      const scoreA = Number(a.views || 0) + Number(a.whatsappClicks || 0) * 2;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return sorted.slice(0, 8);
  }, [displayedProducts]);

  const recentlyAddedProducts = useMemo(() => {
    const sorted = [...displayedProducts].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return sorted.slice(0, 8);
  }, [displayedProducts]);

  const recommendedProducts = useMemo(() => {
    const shownIds = new Set<string>([
      ...trendingProducts.slice(0, 4).map((p) => p.id),
      ...recentlyAddedProducts.slice(0, 4).map((p) => p.id)
    ]);
    const prioritized = [...displayedProducts].sort((a, b) => {
      const aMatch =
        selectedInstitutionId !== 'all' &&
        belongsToInstitution(a.institutionId, selectedInstitutionId)
          ? 1
          : 0;
      const bMatch =
        selectedInstitutionId !== 'all' &&
        belongsToInstitution(b.institutionId, selectedInstitutionId)
          ? 1
          : 0;
      if (bMatch !== aMatch) return bMatch - aMatch;
      const aFresh = shownIds.has(a.id) ? 0 : 1;
      const bFresh = shownIds.has(b.id) ? 0 : 1;
      if (bFresh !== aFresh) return bFresh - aFresh;
      return Number(b.views || 0) - Number(a.views || 0);
    });
    return prioritized.slice(0, 8);
  }, [displayedProducts, trendingProducts, recentlyAddedProducts, selectedInstitutionId]);

  const effectiveActiveInstitution = activeInstitution || VERIFIED_NIGERIAN_INSTITUTIONS[0];

  const handleNotificationNavigation = (notif: AppNotification) => {
    setShowNotificationModal(false);
    if (notif.targetType === 'food_order') navigateToView('food');
    else if (notif.targetType === 'order') navigateToView('orders');
    else if (notif.targetType === 'message') navigateToView('friends');
    else if (notif.targetType === 'inspection') navigateToView('hux');
  };

  if (ceoRouteMode === 'ceo-admin') {
    if (!firebaseAuthChecked) {
      return (
        <div className="min-h-screen bg-[#075B3B] text-white flex items-center justify-center p-6">
          <div className="bg-[#0B8050] border border-[#F2C94C]/60 rounded-2xl px-6 py-5 text-center space-y-2 shadow-2xl">
            <div className="w-8 h-8 border-2 border-[#F2C94C] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-black uppercase tracking-wider text-[#F2C94C]">
              Verifying NIGERIA CAMPUS MARKET CEO Session...
            </p>
          </div>
        </div>
      );
    }
    if (isCeoRouteAuthorized && ceoSession) {
      return (
        <CeoSuperAdminDashboard
          session={ceoSession}
          initialSection={ceoInitialSection}
          onSessionUpdate={(next) => {
            setCeoSession(next);
            saveCeoSession(next);
          }}
          onSessionExpired={() => {
            setCeoSession(null);
            saveCeoSession(null);
            navigateCeoRoute('ceo-login', 'Your CEO session expired. Please sign in again.');
          }}
          onLoggedOut={() => {
            setCeoSession(null);
            saveCeoSession(null);
            navigateCeoRoute('ceo-login', 'Signed out of NIGERIA CAMPUS MARKET CEO SUPER ADMINISTRATOR.');
          }}
          onBackToMarketplace={() => navigateCeoRoute('marketplace', null)}
          onOpenEventsManager={() => {
            navigateCeoRoute('marketplace', null);
            setShowCeoEventsModal(true);
          }}
          onOpenAdsMasterModal={() => {
            navigateCeoRoute('marketplace', null);
            setShowCeoMasterControl(true);
          }}
        />
      );
    }
    if (
      auth.currentUser &&
      !auth.currentUser.isAnonymous &&
      !isAuthorizedCeoEmail(auth.currentUser.email)
    ) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-[#202B26] via-[#075B3B] to-[#0B8050] flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-red-200 overflow-hidden text-[#202B26]">
            <div className="bg-[#7F1D1D] text-white px-6 py-5 border-b-4 border-[#F2C94C] flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6 text-[#F2C94C]" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#FDE68A] block">
                  Restricted Super Admin Route (403)
                </span>
                <h1 className="font-display text-xl font-black text-white">
                  Access Denied
                </h1>
              </div>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-900 space-y-1">
                <p className="font-black">Administrator Authorization Required</p>
                <p className="leading-relaxed">
                  You are currently signed in as <strong>{auth.currentUser.email}</strong>. Ordinary users, buyers, sellers, and accommodation agents cannot access the Super Administrator dashboard or admin database controls.
                </p>
              </div>
              <p className="text-[#202B26]/75 leading-relaxed">
                This unauthorized route attempt has been logged. Only the verified Super Administrator account may access this portal.
              </p>
              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => navigateCeoRoute('marketplace', null)}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#075B3B] hover:bg-[#0B8050] text-white font-black inline-flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 text-[#F2C94C]" />
                  <span>Return to Marketplace</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await signOut(auth).catch(() => {});
                    logout();
                    setCeoSession(null);
                    saveCeoSession(null);
                    setCeoLoginNotice(null);
                  }}
                  className="py-3 px-4 rounded-xl bg-[#202B26] hover:bg-black text-[#F2C94C] font-black inline-flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return (
      <CeoLoginPage
        initialNotice={ceoLoginNotice || 'Access denied. Authorized NIGERIA CAMPUS MARKET CEO login is required.'}
        onSuccess={(session) => {
          setCeoSession(session);
          setCeoLoginNotice(null);
          navigateCeoRoute('ceo-admin');
        }}
        onBackToMarketplace={() => navigateCeoRoute('marketplace', null)}
      />
    );
  }

  if (ceoRouteMode === 'ceo-login') {
    return (
      <CeoLoginPage
        initialNotice={ceoLoginNotice}
        onSuccess={(session) => {
          setCeoSession(session);
          setCeoLoginNotice(null);
          navigateCeoRoute('ceo-admin');
        }}
        onBackToMarketplace={() => navigateCeoRoute('marketplace', null)}
      />
    );
  }

  const isOpportunitiesView =
    currentView === 'jobs' ||
    currentView === 'books' ||
    currentView === 'deals' ||
    currentView === 'giveaways' ||
    currentView === 'referrals' ||
    currentView === 'ambassadors' ||
    currentView === 'leaderboards';

  return (
    <div className="min-h-screen bg-[#F7F7F7] dark:bg-slate-950 text-[#303030] dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      <OfflineIndicator />

      {/* Toast Notification */}
      {notificationToast && (
        <div className="fixed bottom-24 sm:bottom-20 right-4 sm:right-6 z-50 bg-[#222222] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold border-2 border-[#FF6A00]">
          <CheckCircle2 className="w-4 h-4 text-[#FF6A00]" />
          <span>{notificationToast}</span>
        </div>
      )}

      {user?.isDeactivated && (
        <div className="bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-800 px-4 py-2.5 text-xs">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-100 font-semibold">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Your account is currently deactivated. Reactivate it to restore full marketplace visibility.</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={reactivatingAccount}
                onClick={async () => {
                  setReactivatingAccount(true);
                  try {
                    await reactivateUserAccount(user.id);
                    await refreshUser();
                    showToast('Welcome back! Your account has been reactivated.');
                  } catch {
                    showToast('Unable to reactivate right now. Please try again.', 'error');
                  } finally {
                    setReactivatingAccount(false);
                  }
                }}
                className="px-3.5 py-1.5 rounded-lg bg-[#16834A] hover:bg-[#0B8050] text-white font-bold transition cursor-pointer disabled:opacity-60"
              >
                {reactivatingAccount ? 'Reactivating...' : 'Reactivate My Account'}
              </button>
              <button
                type="button"
                onClick={() => logout()}
                className="px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 font-bold hover:bg-amber-100 dark:hover:bg-amber-900/40 transition cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 1 & 2: Announcement Bar & Main Navigation */}
      <Header
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        selectedState={selectedState}
        onSelectState={setSelectedState}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenSellModal={handleRequestSellModal}
        onOpenAuthModal={handleOpenAuth}
        onOpenSellerDashboard={() => setShowSellerDashboard(true)}
        onOpenAdminDashboard={() => {
          if (!isAuthorizedCeo(user)) return;
          setAdminInitialTab('overview');
          setShowAdminDashboard(true);
        }}
        onOpenCeoEventsDashboard={() => {
          if (isAuthorizedCeo(user)) setShowCeoEventsModal(true);
        }}
        onOpenCeoMasterControl={() => {
          if (isAuthorizedCeo(user)) setShowCeoMasterControl(true);
        }}
        onOpenCeoSuperAdmin={() => {
          if (isAuthorizedCeo(user)) {
            navigateCeoRoute(isCeoRouteAuthorized ? 'ceo-admin' : 'ceo-login', null);
          }
        }}
        onOpenAdvertiseModal={() => handleOpenAdvertiseModal('featured')}
        onOpenServicesSection={scrollToServicesSection}
        onOpenEventsSection={scrollToEventsSection}
        onOpenEmergencySection={scrollToEmergencySection}
        onOpenFavourites={() => {
          if (currentView !== 'marketplace' && currentView !== 'home') {
            navigateToView('marketplace');
          }
          setViewingFavouritesOnly(!viewingFavouritesOnly);
        }}
        onOpenSafetyModal={() => setShowSafetyModal(true)}
        onOpenCart={() => setShowCartModal(true)}
        cartCount={totalCartItems}
        onNavigateView={navigateToView}
        onTriggerPWAHelp={handleTriggerPWAHelp}
        activeView={currentView}
        activeInstitution={activeInstitution}
        activeCampus={selectedCampus}
        onOpenInstitutionSwitcher={() => setShowInstitutionSwitcher(true)}
        onSelectInstitutionQuick={(id) => {
          const inst = getInstitutionById(id, institutions);
          handleSelectInstitution(inst.id, inst.campus, true);
        }}
        onOpenPostServiceModal={() =>
          setPostServiceModalState({ open: true, editingService: null })
        }
        onOpenUserProfile={() => setShowUserProfileModal(true)}
        unreadNotificationsCount={unreadNotificationsCount}
        onOpenNotifications={() => setShowNotificationModal(true)}
        onOpenNationwideSearch={() => setShowNationwideSearch(true)}
        onOpenSubscriptions={() => setShowSubscriptionsModal(true)}
        onOpenDownloadApp={() => setShowDownloadAppModal(true)}
      />

      {currentView === 'requests' ? (
        <WhatStudentsNeedPage
          onBackToHome={() => navigateToView('home')}
          onStartDirectChat={handleStartDirectChat}
          selectedInstitutionId={selectedInstitutionId}
          selectedCampus={selectedCampus}
          institutions={institutions}
          onSwitchInstitution={() => setShowInstitutionSwitcher(true)}
        />
      ) : currentView === 'hub' ? (
        <SingleHubPage
          onBackToHome={() => navigateToView('home')}
          onNavigateToFriends={() => navigateToView('friends')}
          onStartDirectChat={handleStartDirectChat}
        />
      ) : currentView === 'friends' ? (
        <FriendsPage
          onBackToHome={() => navigateToView('home')}
          onNavigateToHub={() => navigateToView('hub')}
          initialChatTarget={directChatTarget}
          onClearChatTarget={() => setDirectChatTarget(null)}
        />
      ) : currentView === 'hux' ? (
        <HuxPage
          selectedInstitutionId={selectedInstitutionId}
          selectedCampus={selectedCampus}
          institutions={institutions}
          onSwitchInstitution={() => setShowInstitutionSwitcher(true)}
          onBackToHome={() => navigateToView('home')}
          onStartDirectChat={handleStartDirectChat}
        />
      ) : currentView === 'bike-riders' ? (
        <BikeRidersPage onBackToMarketplace={() => navigateToView('home')} />
      ) : currentView === 'food' ? (
        <FoodMarketplacePage
          selectedInstitutionId={selectedInstitutionId}
          selectedCampus={selectedCampus}
          institutions={institutions}
          onSwitchInstitution={() => setShowInstitutionSwitcher(true)}
          onBackToHome={() => navigateToView('home')}
          onOpenAuth={() => handleOpenAuth('login', 'buyer')}
        />
      ) : currentView === 'gpa' ? (
        <CampusGpaCalculatorPage
          selectedInstitutionId={selectedInstitutionId}
          institutions={institutions}
          userSettings={userSettings}
          onBackToHome={() => navigateToView('home')}
          onOpenAuth={() => handleOpenAuth('login', 'buyer')}
        />
      ) : isOpportunitiesView ? (
        <StudentOpportunitiesHubPage
          key={currentView}
          initialTab={currentView as OpportunitiesTab}
          selectedInstitutionId={selectedInstitutionId}
          institutions={institutions}
          products={products}
          onBackToHome={() => navigateToView('home')}
          onSelectInstitution={(id) => {
            const inst = getInstitutionById(id, institutions);
            handleSelectInstitution(inst.id, inst.campus);
          }}
          onOpenAuth={() => handleOpenAuth('login', 'buyer')}
        />
      ) : currentView === 'orders' || currentView === 'account' ? (
        <BuyerOrdersAccountPage
          products={products}
          onBackToHome={() => navigateToView('home')}
          onOpenAuth={() => handleOpenAuth('login', 'buyer')}
          onOpenProduct={setSelectedProduct}
          onNavigateView={(target) => {
            if (target === 'sell') {
              handleRequestSellModal();
            } else {
              navigateToView(target as AppView);
            }
          }}
        />
      ) : currentView === 'settings' ? (
        <SettingsPage
          user={user}
          institutions={institutions}
          userSettings={userSettings}
          unreadMessagesCount={unreadNotificationsCount}
          onUserUpdated={() => {
            refreshUser().catch(() => {});
          }}
          onSettingsUpdated={(next) => {
            setUserSettings(next);
            applyAppearanceSettings(next.appearance);
          }}
          onInstitutionActivated={(instId, camp) => handleSelectInstitution(instId, camp, false)}
          onBackHome={() => navigateToView('home')}
          onNavigateOrders={() => navigateToView('orders')}
          onNavigateMessages={() => navigateToView('friends')}
          onNavigateGpa={() => navigateToView('gpa')}
          onOpenMyProducts={() => setShowSellerDashboard(true)}
          onOpenAuthModal={(mode = 'login') => handleOpenAuth(mode, 'buyer')}
          onOpenCeoSection={(section) => {
            if (isAuthorizedCeo(user)) {
              navigateCeoRoute(isCeoRouteAuthorized ? 'ceo-admin' : 'ceo-login', null, section);
            }
          }}
          onOpenAdminDashboard={() => {
            if (isAuthorizedCeo(user)) {
              setAdminInitialTab('overview');
              setShowAdminDashboard(true);
            }
          }}
          onOpenMasterControl={() => {
            if (isAuthorizedCeo(user)) setShowCeoMasterControl(true);
          }}
          onLogout={() => {
            logout();
            navigateToView('home');
          }}
          onShowToast={showToast}
          onOpenDownloadApp={() => setShowDownloadAppModal(true)}
        />
      ) : (
        <>
          {/* Compact Category Navigation */}
          <CategoryBar
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={(catId) => {
              setSelectedCategory(catId);
              setViewingFavouritesOnly(false);
              handleStartShopping();
            }}
            onOpenBikeRiders={() => navigateToView('bike-riders')}
            onOpenServices={scrollToServicesSection}
          />

          {/* Step 4, 5 & 6: Hero Section with Welcome, Search, Explore Nigerian Universities & Start Selling Free */}
          {currentView === 'home' && !viewingFavouritesOnly && !searchQuery && (
            <>
              <HeroBanner
                searchQuery={searchQuery}
                onSearchSubmit={setSearchQuery}
                onStartShopping={handleStartShopping}
                onOpenSellModal={handleRequestSellModal}
                onNavigateView={navigateToView}
                activeInstitution={activeInstitution}
                activeCampus={selectedCampus}
                onOpenInstitutionSwitcher={() => setShowInstitutionSwitcher(true)}
                onExploreUniversitiesSection={() =>
                  document.getElementById('institution-directory')?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                  })
                }
                heroAds={heroAds}
                onSelectAd={(ad) => setSelectedAd(ad)}
                onOpenNationwideSearch={() => setShowNationwideSearch(true)}
                onOpenEventsSection={scrollToEventsSection}
                onOpenAdsSection={() => scrollToSectionId('fu-market-ads')}
                onOpenEmergencySection={scrollToEmergencySection}
              />

              {/* Prominent Download App CTA Banner Directly Below Hero Section */}
              <HeroDownloadBanner
                deviceType={deviceType}
                browserType={browserType}
                isInstalled={isInstalled}
                isInstallable={isInstallable}
                isIOS={isIOS}
                onTriggerInstall={install}
                onOpenInstallModal={() => setShowDownloadAppModal(true)}
                onShowToast={showToast}
              />
            </>
          )}

          {/* Active Campus Context Banner on non-home / filtered marketplace views */}
          {activeInstitution && (currentView !== 'home' || viewingFavouritesOnly || Boolean(searchQuery)) && (
            <InstitutionProfileBanner
              institution={activeInstitution}
              activeCampus={selectedCampus}
              onChangeCampus={(camp) => handleSelectInstitution(activeInstitution.id, camp, false)}
              onOpenInstitutionDirectory={() => setShowInstitutionSwitcher(true)}
              onOpenNationwideSearch={() => setShowNationwideSearch(true)}
            />
          )}

          <main className="max-w-7xl mx-auto px-3 sm:px-4 py-5 sm:py-6 w-full flex-1 space-y-6 sm:space-y-8">
            {currentView === 'home' && !viewingFavouritesOnly && !searchQuery ? (
              <>
                {/* 2. POPULAR SHOPPING CATEGORIES GRID */}
                <section className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded bg-[#FFF4EB] text-[#FF6A00] border border-[#F68B1F]/30">
                        Shop By Department
                      </span>
                      <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#222222] mt-1">
                        Popular Shopping Categories
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigateToView('marketplace')}
                      className="text-xs font-extrabold text-[#FF6A00] hover:text-[#F68B1F] inline-flex items-center gap-1 self-start sm:self-auto cursor-pointer whitespace-nowrap"
                    >
                      <span>Explore All Categories</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
                    {categories.slice(0, 12).map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(cat.id);
                          setViewingFavouritesOnly(false);
                          navigateToView('marketplace');
                        }}
                        className="group p-3.5 rounded-xl bg-[#F7F7F7] hover:bg-[#FF6A00] border border-[#EEEEEE] hover:border-[#FF6A00] text-left transition flex flex-col justify-between gap-2.5 cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="w-9 h-9 rounded-xl bg-[#FFFFFF] text-[#FF6A00] flex items-center justify-center shadow-2xs transition">
                            {getCategoryIcon(cat.icon)}
                          </div>
                          <span className="text-[10px] font-bold text-[#303030]/75 group-hover:text-white tabular-nums">
                            {cat.productCount || 0}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-[#222222] group-hover:text-white leading-snug line-clamp-1">
                          {cat.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>

                {/* 3. TRENDING PRODUCTS */}
                <section
                  ref={productCatalogRef}
                  className="scroll-mt-24 bg-[#FFFFFF] rounded-2xl border border-[#EEEEEE] shadow-xs p-4 sm:p-6 space-y-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EEEEEE] pb-4">
                    <div>
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded bg-[#FF6A00] text-white">
                        <Flame className="w-3 h-3" />
                        Hot On Campus
                      </span>
                      <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#222222] mt-1">
                        Trending Products
                        {activeInstitution ? ` — ${activeInstitution.shortName}` : ''}
                      </h2>
                      <p className="text-xs text-[#303030]/75 mt-0.5 tabular-nums">
                        {displayedProducts.length} verified listings available from campus sellers.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleRequestSellModal}
                        className="px-3.5 py-2 rounded-xl bg-[#FFF4EB] border border-[#F68B1F]/40 hover:bg-[#F68B1F] hover:text-white text-[#222222] font-extrabold text-xs inline-flex items-center gap-1.5 cursor-pointer transition whitespace-nowrap"
                      >
                        <PlusCircle className="w-3.5 h-3.5 text-[#FF6A00]" />
                        <span>Sell Item Free</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => navigateToView('marketplace')}
                        className="px-4 py-2 rounded-xl bg-[#FF6A00] hover:bg-[#F68B1F] text-white font-extrabold text-xs inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
                      >
                        <span>View All Products</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* University Spotlight or Marketplace Sponsored Placement */}
                  {(universitySpotlightAds.length > 0 || marketplaceAds.length > 0) && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#FF6A00]">
                          <Megaphone className="w-3.5 h-3.5" />
                          {universitySpotlightAds.length > 0 && activeInstitution
                            ? `${activeInstitution.shortName} Campus Spotlight`
                            : 'Sponsored Marketplace Spotlight'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenAdvertiseModal('featured')}
                          className="text-[11px] font-bold text-[#FF6A00] hover:underline cursor-pointer"
                        >
                          Promote Your Store →
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(universitySpotlightAds.length > 0
                          ? universitySpotlightAds
                          : marketplaceAds
                        )
                          .slice(0, 2)
                          .map((ad) => (
                            <SponsoredAdCard
                              key={ad.id}
                              ad={ad}
                              variant="banner"
                              onSelectAd={(picked) => setSelectedAd(picked)}
                            />
                          ))}
                      </div>
                    </div>
                  )}

                  {loading ? (
                    <div className="py-12 text-center space-y-2">
                      <div className="w-8 h-8 border-3 border-[#FF6A00] border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-xs font-semibold text-[#303030]/75">
                        Loading trending campus products...
                      </p>
                    </div>
                  ) : fetchError ? (
                    <div className="p-5 bg-[#F7F7F7] rounded-2xl border border-[#EEEEEE] text-center space-y-2">
                      <p className="text-xs font-bold text-[#222222]">{fetchError}</p>
                      <button
                        type="button"
                        onClick={() => loadCatalogProducts(1, true)}
                        className="px-4 py-2 bg-[#FF6A00] hover:bg-[#F68B1F] text-white text-xs font-extrabold rounded-xl cursor-pointer"
                      >
                        Retry
                      </button>
                    </div>
                  ) : trendingProducts.length === 0 ? (
                    <div className="p-6 bg-[#F7F7F7] rounded-2xl border border-[#EEEEEE] text-center space-y-3">
                      <ShoppingBag className="w-8 h-8 text-[#F68B1F] mx-auto" />
                      <p className="text-xs font-bold text-[#222222]">
                        No products listed on this campus filter yet.
                      </p>
                      <button
                        type="button"
                        onClick={handleRequestSellModal}
                        className="px-4 py-2 bg-[#FF6A00] text-white text-xs font-extrabold rounded-xl cursor-pointer"
                      >
                        Post First Item Free
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                      {trendingProducts.map((prod) => (
                        <ProductCard
                          key={prod.id}
                          product={prod}
                          onOpenDetail={setSelectedProduct}
                          onOpenStorefront={setSelectedSellerStorefrontId}
                          onAddToCart={addToCart}
                          onStartDirectChat={handleStartDirectChat}
                        />
                      ))}
                    </div>
                  )}
                </section>

                {/* 4. RECENTLY ADDED PRODUCTS */}
                {recentlyAddedProducts.length > 0 && (
                  <section className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-2xl p-4 sm:p-6 space-y-5 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EEEEEE] pb-4">
                      <div>
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded bg-[#FFF4EB] text-[#FF6A00] border border-[#F68B1F]/30">
                          <Clock className="w-3 h-3" />
                          Fresh Arrivals
                        </span>
                        <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#222222] mt-1">
                          Recently Added Products
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSortOption('newest');
                          navigateToView('marketplace');
                        }}
                        className="px-4 py-2 rounded-xl bg-[#FF6A00] hover:bg-[#F68B1F] text-white font-extrabold text-xs inline-flex items-center gap-1.5 self-start sm:self-auto transition cursor-pointer whitespace-nowrap"
                      >
                        <span>Explore New Arrivals</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                      {recentlyAddedProducts.map((prod) => (
                        <ProductCard
                          key={`recent-${prod.id}`}
                          product={prod}
                          onOpenDetail={setSelectedProduct}
                          onOpenStorefront={setSelectedSellerStorefrontId}
                          onAddToCart={addToCart}
                          onStartDirectChat={handleStartDirectChat}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* 5. RECOMMENDED PRODUCTS */}
                {recommendedProducts.length > 0 && (
                  <section className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-2xl p-4 sm:p-6 space-y-5 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EEEEEE] pb-4">
                      <div>
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded bg-[#222222] text-white">
                          <Sparkles className="w-3 h-3 text-[#F68B1F]" />
                          Picked For Your Campus
                        </span>
                        <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#222222] mt-1">
                          Recommended Products
                          {activeInstitution ? ` in ${activeInstitution.shortName}` : ''}
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigateToView('marketplace')}
                        className="px-4 py-2 rounded-xl bg-[#F7F7F7] hover:bg-[#FF6A00] hover:text-white border border-[#EEEEEE] text-[#222222] font-extrabold text-xs inline-flex items-center gap-1.5 self-start sm:self-auto transition cursor-pointer whitespace-nowrap"
                      >
                        <span>Browse Full Catalog</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                      {recommendedProducts.map((prod) => (
                        <ProductCard
                          key={`rec-${prod.id}`}
                          product={prod}
                          onOpenDetail={setSelectedProduct}
                          onOpenStorefront={setSelectedSellerStorefrontId}
                          onAddToCart={addToCart}
                          onStartDirectChat={handleStartDirectChat}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* 6. HOSTEL ACCOMMODATION LISTINGS */}
                <section className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-2xl p-4 sm:p-6 space-y-5 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded bg-[#FFF4EB] text-[#FF6A00] border border-[#F68B1F]/30">
                        Verified Housing
                      </span>
                      <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#222222] flex items-center gap-2 mt-1">
                        <Home className="w-5 h-5 text-[#FF6A00]" />
                        <span>Hostel Accommodation Listings</span>
                      </h2>
                      <p className="text-xs text-[#303030]/75 mt-0.5">
                        Inspect hostels physically with verified agents before paying around{' '}
                        {activeInstitution?.shortName || 'Nigerian campuses'}.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigateToView('hux')}
                      className="px-4 py-2.5 bg-[#FF6A00] hover:bg-[#F68B1F] text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 self-start sm:self-auto transition shrink-0 cursor-pointer whitespace-nowrap"
                    >
                      <span>View All Hostels</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {latestAccommodation.length === 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-[#F7F7F7] border border-[#EEEEEE] rounded-2xl overflow-hidden">
                      <img
                        src={campusHostelShowcaseImg}
                        alt="Nigerian campus student lodge"
                        className="md:col-span-4 w-full h-44 md:h-full object-cover"
                      />
                      <div className="md:col-span-8 p-5 flex flex-col justify-center space-y-2">
                        <h3 className="text-sm sm:text-base font-extrabold text-[#222222]">
                          List or Inspect Student Lodges &amp; Self-Contains
                        </h3>
                        <p className="text-xs text-[#303030]/75">
                          No vacant lodges listed on this campus filter yet. Verified house agents and students seeking roommates can list properties for free and schedule physical inspections.
                        </p>
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => navigateToView('hux')}
                            className="px-4 py-2 bg-[#FF6A00] hover:bg-[#F68B1F] text-white font-extrabold text-xs rounded-xl cursor-pointer transition"
                          >
                            Open Accommodation &amp; Inspection Portal
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {latestAccommodation.map((hux) => (
                        <div
                          key={hux.id}
                          onClick={() => navigateToView('hux')}
                          className="bg-[#F7F7F7] border border-[#EEEEEE] hover:border-[#F68B1F] rounded-2xl overflow-hidden cursor-pointer transition flex flex-col"
                        >
                          <div className="h-40 bg-white overflow-hidden">
                            <img
                              src={hux.imageUrl || (hux.images && hux.images[0]) || campusHostelShowcaseImg}
                              alt={hux.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="p-4 space-y-1.5 flex-1 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between gap-2 text-[11px]">
                                <span className="font-extrabold text-[#FF6A00]">{hux.type}</span>
                                <span className="text-[#303030]/75 truncate">{hux.location}</span>
                              </div>
                              <h3 className="text-sm font-bold text-[#222222] line-clamp-1 mt-1">
                                {hux.title}
                              </h3>
                            </div>
                            <div className="pt-2 border-t border-[#EEEEEE] flex items-center justify-between">
                              <span className="px-2.5 py-0.5 rounded bg-[#222222] text-white text-sm font-extrabold tabular-nums">
                                {formatNaira(hux.price)}
                                <span className="text-[10px] text-white/75 font-normal">/{hux.pricePer}</span>
                              </span>
                              <span className="text-xs font-extrabold text-[#FF6A00]">Book Inspection →</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* 7. TEXTBOOKS AND PAST QUESTIONS */}
                <section className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-2xl p-4 sm:p-6 space-y-5 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded bg-[#FFF4EB] text-[#FF6A00] border border-[#F68B1F]/30">
                        Academic Library
                      </span>
                      <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#222222] flex items-center gap-2 mt-1">
                        <BookOpen className="w-5 h-5 text-[#FF6A00]" />
                        <span>Textbooks and Past Questions</span>
                      </h2>
                      <p className="text-xs text-[#303030]/75 mt-0.5">
                        Course handouts, lab manuals, textbooks, and department past questions shared by students.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigateToView('books')}
                      className="px-4 py-2.5 bg-[#FF6A00] hover:bg-[#F68B1F] text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 self-start sm:self-auto transition shrink-0 cursor-pointer whitespace-nowrap"
                    >
                      <span>Browse Study Materials</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {latestBooks.length === 0 ? (
                    <div className="p-5 rounded-2xl bg-[#F7F7F7] border border-[#EEEEEE] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h3 className="text-sm font-extrabold text-[#222222]">
                          Share or Download Textbooks &amp; Past Questions
                        </h3>
                        <p className="text-xs text-[#303030]/75">
                          Find GST, 100L–500L departmental past questions, lecture notes, and affordable textbooks across Nigerian universities.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigateToView('books')}
                        className="px-4 py-2 bg-[#FF6A00] hover:bg-[#F68B1F] text-white font-extrabold text-xs rounded-xl shrink-0 cursor-pointer transition"
                      >
                        Open Books &amp; Past Qs
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {latestBooks.map((book) => (
                        <div
                          key={book.id}
                          onClick={() => navigateToView('books')}
                          className="p-4 rounded-2xl bg-[#F7F7F7] border border-[#EEEEEE] hover:border-[#F68B1F] transition cursor-pointer flex flex-col justify-between gap-3"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="px-2 py-0.5 rounded bg-[#FF6A00] text-white text-[10px] font-extrabold uppercase">
                                {book.materialType}
                              </span>
                              <span className="text-[10px] font-bold text-[#303030]/75">
                                {book.courseCode ? `${book.courseCode} · ` : ''}
                                {book.level}
                              </span>
                            </div>
                            <h3 className="text-sm font-extrabold text-[#222222] line-clamp-1">
                              {book.title}
                            </h3>
                            <p className="text-xs text-[#303030]/75 truncate">
                              {book.department}
                            </p>
                          </div>
                          <div className="pt-2 border-t border-[#EEEEEE] flex items-center justify-between text-xs">
                            <span className="font-extrabold text-[#FF6A00] tabular-nums">
                              {book.isFree ? 'FREE Resource' : formatNaira(book.priceNaira)}
                            </span>
                            <span className="text-[11px] font-bold text-[#303030]/70">
                              {book.downloadsCount || 0} downloads
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* 8. STUDENT JOBS AND SERVICES */}
                <div className="space-y-5">
                  <section className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-2xl p-4 sm:p-6 space-y-5 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded bg-[#FFF4EB] text-[#FF6A00] border border-[#F68B1F]/30">
                          Careers &amp; SIWES
                        </span>
                        <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#222222] flex items-center gap-2 mt-1">
                          <Briefcase className="w-5 h-5 text-[#FF6A00]" />
                          <span>Student Jobs &amp; Opportunities</span>
                        </h2>
                        <p className="text-xs text-[#303030]/75 mt-0.5">
                          Verified internships, SIWES placements, part-time roles, and graduate openings across Nigeria.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => navigateToView('jobs')}
                        className="px-4 py-2.5 bg-[#FF6A00] hover:bg-[#F68B1F] text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 self-start sm:self-auto transition shrink-0 cursor-pointer whitespace-nowrap"
                      >
                        <span>Explore All Jobs</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {latestJobs.length === 0 ? (
                      <div className="p-5 rounded-2xl bg-[#F7F7F7] border border-[#EEEEEE] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <h3 className="text-sm font-extrabold text-[#222222]">
                            Post or Apply for Student Jobs, SIWES &amp; Internships
                          </h3>
                          <p className="text-xs text-[#303030]/75">
                            Campus businesses, tech startups, and organizations post part-time, remote, and SIWES opportunities here.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigateToView('jobs')}
                          className="px-4 py-2 bg-[#FF6A00] hover:bg-[#F68B1F] text-white font-extrabold text-xs rounded-xl shrink-0 cursor-pointer transition"
                        >
                          Open Jobs Board
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {latestJobs.map((job) => (
                          <div
                            key={job.id}
                            onClick={() => navigateToView('jobs')}
                            className="p-4 rounded-2xl bg-[#F7F7F7] border border-[#EEEEEE] hover:border-[#F68B1F] transition cursor-pointer flex flex-col justify-between gap-3"
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="px-2 py-0.5 rounded bg-[#FF6A00] text-white text-[10px] font-extrabold uppercase">
                                  {job.jobType}
                                </span>
                                {job.isNationwide && (
                                  <span className="text-[10px] font-bold text-[#F68B1F]">Nationwide</span>
                                )}
                              </div>
                              <h3 className="text-sm font-extrabold text-[#222222] line-clamp-1">
                                {job.title}
                              </h3>
                              <p className="text-xs font-bold text-[#FF6A00] truncate">
                                {job.companyOrOrg}
                              </p>
                              <p className="text-[11px] text-[#303030]/75 line-clamp-2">
                                {job.description}
                              </p>
                            </div>
                            <div className="pt-2 border-t border-[#EEEEEE] flex items-center justify-between text-[11px]">
                              <span className="font-extrabold text-[#222222] truncate">
                                {job.compensation || job.location}
                              </span>
                              {job.deadline && (
                                <span className="text-[#303030]/70 flex items-center gap-1 shrink-0">
                                  <Calendar className="w-3 h-3" />
                                  {job.deadline}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <FuMarketServicesSection
                    services={publicServices}
                    categories={serviceCategories}
                    loading={servicesLoading}
                    selectedInstitutionId={selectedInstitutionId}
                    activeInstitution={activeInstitution}
                    onPostService={() =>
                      setPostServiceModalState({ open: true, editingService: null })
                    }
                    onOpenProviderDashboard={() => setShowServiceProviderDashboard(true)}
                    onOpenAdminServices={() => {
                      if (!isAuthorizedCeo(user)) return;
                      setAdminInitialTab('services');
                      setShowAdminDashboard(true);
                    }}
                    onViewDetails={(service) =>
                      setSelectedServiceState({ service, showContact: false })
                    }
                    onContactProvider={(service) =>
                      setSelectedServiceState({ service, showContact: true })
                    }
                    onOpenPromoteService={(service) => setPromoteServiceTarget(service)}
                  />

                  {/* Campus Quick Portals Strip */}
                  <section className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-2xl p-4 sm:p-5 shadow-xs">
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
                      {[
                        { label: 'Hostels & Lodges', icon: Home, onClick: () => navigateToView('hux') },
                        { label: 'Jobs & SIWES', icon: Briefcase, onClick: () => navigateToView('jobs') },
                        { label: 'Events & Sports', icon: Info, onClick: scrollToEventsSection },
                        { label: 'Study Materials', icon: BookOpen, onClick: () => navigateToView('books') },
                        { label: 'Campus Food', icon: Utensils, onClick: () => navigateToView('food') },
                        { label: 'Lost & Found', icon: HelpCircle, onClick: () => setShowLostAndFoundModal(true) },
                        { label: 'Student Deals', icon: Gift, onClick: () => navigateToView('deals') },
                        { label: 'Referral Rewards', icon: Trophy, onClick: () => navigateToView('referrals') }
                      ].map((svcCard) => {
                        const IconComp = svcCard.icon;
                        return (
                          <button
                            key={svcCard.label}
                            type="button"
                            onClick={svcCard.onClick}
                            className="group p-3 rounded-xl bg-[#F7F7F7] hover:bg-[#FF6A00] border border-[#EEEEEE] hover:border-[#FF6A00] text-left transition flex flex-col items-start justify-between gap-2 cursor-pointer"
                          >
                            <div className="w-8 h-8 rounded-lg bg-[#FFFFFF] text-[#FF6A00] flex items-center justify-center shadow-2xs transition">
                              <IconComp className="w-4 h-4" />
                            </div>
                            <span className="text-[11px] font-bold text-[#222222] group-hover:text-white leading-snug">
                              {svcCard.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                </div>

                {/* 9. CAMPUS EVENTS */}
                <div className="space-y-6">
                  <div id="campus-events-section" className="scroll-mt-24">
                    <BirthdayEventsSection
                      events={campusEvents}
                      loading={eventsLoading}
                      onSelectEvent={(ev) => setSelectedEvent(ev)}
                      onOpenCeoManager={() => {
                        if (isAuthorizedCeo(user)) setShowCeoEventsModal(true);
                      }}
                    />
                  </div>

                  <SportAndAnnouncementsSection
                    sportUpdates={sportUpdates}
                    generalAnnouncements={generalAnnouncements}
                    loading={announcementsLoading}
                    savedIds={savedAnnouncementIds}
                    selectedInstitutionId={selectedInstitutionId}
                    activeInstitution={activeInstitution}
                    institutions={institutions}
                    ads={activePublicAds}
                    onSelectAd={(ad) => setSelectedAd(ad)}
                    onSelectPost={(post) => setSelectedAnnouncement(post)}
                    onOpenPostModal={(defaultFeedType) =>
                      setPostAnnouncementModalState({
                        open: true,
                        defaultFeedType,
                        editingPost: null
                      })
                    }
                    onOpenAuthorProfile={(authorId, authorName, authorAvatar) =>
                      setAuthorProfileTarget({ authorId, authorName, authorAvatar })
                    }
                  />
                </div>

                {/* 10. EXPLORE NIGERIAN UNIVERSITIES */}
                <div className="space-y-6">
                  <div className="-mx-3 sm:-mx-6 lg:-mx-8">
                    <InstitutionDirectorySection
                      institutions={institutions}
                      selectedInstitutionId={selectedInstitutionId}
                      selectedCampus={selectedCampus}
                      onSelectInstitution={(id, campus) => handleSelectInstitution(id, campus, true)}
                      onOpenFullModal={() => setShowInstitutionSwitcher(true)}
                    />
                  </div>

                  <TrendingCampusesSection
                    activeInstitution={effectiveActiveInstitution}
                    institutions={institutions}
                    products={products}
                    services={publicServices}
                    advertisements={activePublicAds}
                    sports={sportUpdates}
                    announcements={generalAnnouncements}
                    accommodations={allAccommodation}
                    onSelectItem={(item) => {
                      if (item.entityType === 'product' && item.raw) {
                        setSelectedProduct(item.raw);
                      } else if (item.entityType === 'accommodation') {
                        navigateToView('hux');
                      } else if (item.entityType === 'ad' && item.raw) {
                        setSelectedAd(item.raw);
                      } else if (item.entityType === 'service' && item.raw) {
                        setSelectedServiceState({ service: item.raw, showContact: false });
                      }
                    }}
                    onOpenNationwideSearch={() => setShowNationwideSearch(true)}
                  />

                  <FuMarketAdsSection
                    ads={activePublicAds}
                    loading={adsLoading}
                    selectedInstitutionId={selectedInstitutionId}
                    selectedCampus={selectedCampus}
                    activeInstitutionName={activeInstitution?.shortName || 'All Nigerian Campuses'}
                    onOpenSubmitModal={(pkgId) => handleOpenAdvertiseModal(pkgId || 'featured')}
                    onSelectAd={(ad) => setSelectedAd(ad)}
                    onOpenMasterControl={() => {
                      if (isAuthorizedCeo(user)) {
                        navigateCeoRoute(
                          isCeoRouteAuthorized ? 'ceo-admin' : 'ceo-login',
                          null,
                          'ads'
                        );
                      }
                    }}
                  />

                  {/* Campus Food Vendors Showcase */}
                  <section className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-2xl p-4 sm:p-6 space-y-5 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded bg-[#FFF4EB] text-[#FF6A00] border border-[#F68B1F]/30">
                          Campus Food Ordering &amp; Delivery
                        </span>
                        <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#222222] flex items-center gap-2 mt-1">
                          <Utensils className="w-5 h-5 text-[#FF6A00]" />
                          <span>Popular Campus Food Vendors</span>
                        </h2>
                        <p className="text-xs text-[#303030]/75 mt-0.5">
                          Order Jollof Rice, Shawarma, Suya, Grills, Small Chops &amp; Drinks delivered straight to your hostel or gate.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => navigateToView('food')}
                        className="px-4 py-2.5 bg-[#FF6A00] hover:bg-[#F68B1F] text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 self-start sm:self-auto transition shrink-0 cursor-pointer whitespace-nowrap"
                      >
                        <Utensils className="w-4 h-4" />
                        <span>Order Campus Food</span>
                      </button>
                    </div>

                    {latestFoodVendors.length === 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-[#F7F7F7] border border-[#EEEEEE] rounded-2xl overflow-hidden">
                        <img
                          src={campusFoodShowcaseImg}
                          alt="Campus kitchen Jollof rice and grilled chicken"
                          className="md:col-span-4 w-full h-44 md:h-full object-cover"
                        />
                        <div className="md:col-span-8 p-5 flex flex-col justify-center space-y-2">
                          <h3 className="text-sm sm:text-base font-extrabold text-[#222222]">
                            Campus Kitchens, Bukas, Fast Food &amp; Delivery Riders
                          </h3>
                          <p className="text-xs text-[#303030]/75">
                            Register your campus food spot, publish menus with photos, accept online or eligible cash-on-delivery orders, or sign up as a student dispatch rider.
                          </p>
                          <div className="flex flex-wrap gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => navigateToView('food')}
                              className="px-4 py-2 bg-[#FF6A00] hover:bg-[#F68B1F] text-white font-extrabold text-xs rounded-xl cursor-pointer transition"
                            >
                              Browse Campus Food Hub
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {latestFoodVendors.map((vendor) => (
                          <div
                            key={vendor.id}
                            onClick={() => navigateToView('food')}
                            className="bg-[#F7F7F7] border border-[#EEEEEE] hover:border-[#F68B1F] rounded-2xl overflow-hidden cursor-pointer transition flex flex-col"
                          >
                            <div className="h-36 bg-white overflow-hidden">
                              <img
                                src={vendor.bannerUrl || vendor.logoUrl || campusFoodShowcaseImg}
                                alt={vendor.vendorName}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="p-4 space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-extrabold text-sm text-[#222222] truncate flex items-center gap-1.5">
                                  <ChefHat className="w-4 h-4 text-[#FF6A00] shrink-0" />
                                  {vendor.vendorName}
                                </span>
                                <CeoVerifiedBadge verified={Boolean(vendor.ceoVerified)} variant="compact" />
                              </div>
                              <p className="text-[11px] text-[#303030]/75 line-clamp-1">
                                {vendor.location} · {vendor.openingHours}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>

                {/* 11. NATIONAL CAMPUS MARKETPLACE PROMOTIONAL SECTION */}
                <div className="space-y-6">
                  <section className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-2xl overflow-hidden shadow-xs">
                    <div className="bg-gradient-to-r from-[#FF6A00] to-[#F68B1F] text-white px-5 py-6 sm:px-8 sm:py-7 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                      <div className="space-y-2 max-w-2xl">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded bg-[#222222] text-white">
                          <Store className="w-3.5 h-3.5 text-[#F68B1F]" />
                          Nationwide Student Commerce
                        </span>
                        <h2 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight">
                          NIGERIA CAMPUS MARKET — NATIONAL NETWORK
                        </h2>
                        <p className="text-xs sm:text-sm text-white/95 leading-relaxed">
                          Discover products, services, accommodation and opportunities across Nigerian universities and polytechnics.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setShowInstitutionSwitcher(true)}
                          className="px-4 py-2.5 rounded-xl bg-[#222222] hover:bg-[#303030] text-white text-xs font-extrabold inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
                        >
                          <GraduationCap className="w-4 h-4 text-[#F68B1F]" />
                          <span>Explore Universities</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRequestSellModal}
                          className="px-4 py-2.5 rounded-xl bg-[#FFFFFF] hover:bg-[#F7F7F7] text-[#FF6A00] text-xs font-extrabold inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
                        >
                          <PlusCircle className="w-4 h-4" />
                          <span>Start Selling Free</span>
                        </button>
                      </div>
                    </div>

                    <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                      <div className="bg-[#222222] text-white rounded-2xl p-6 border-b-4 border-[#FF6A00] flex flex-col justify-between gap-5">
                        <div className="space-y-4">
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded bg-[#FF6A00] text-white">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Campus Trust Charter
                          </span>
                          <h3 className="font-display text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                            YOUR SAFETY, OUR PRIORITY
                          </h3>
                          <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
                            Every student, seller, house agent, and campus business across Nigeria operates under strict marketplace verification and anti-scam safeguards.
                          </p>

                          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                            {[
                              'Verified Students and Sellers',
                              'Real Reviews and Ratings',
                              'Secure Transactions',
                              'Anti-Scam Protection'
                            ].map((point) => (
                              <li
                                key={point}
                                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white"
                              >
                                <CheckCircle2 className="w-4 h-4 text-[#F68B1F] shrink-0" />
                                <span>{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-white/15">
                          <button
                            type="button"
                            onClick={() =>
                              setEmergencyReportModalState({
                                open: true,
                                kind: 'security_concern'
                              })
                            }
                            className="px-4 py-2.5 bg-[#FF6A00] hover:bg-[#F68B1F] text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <AlertTriangle className="w-4 h-4" />
                            <span>Report Suspicious Users</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowSafetyModal(true)}
                            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                          >
                            Campus Safety Rules
                          </button>
                        </div>
                      </div>

                      <div className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-2xl overflow-hidden flex flex-col justify-between">
                        <div className="grid grid-cols-1 sm:grid-cols-12 flex-1">
                          <div className="sm:col-span-5 relative min-h-[180px] bg-[#F7F7F7]">
                            <img
                              src={campusCommunityShowcaseImg}
                              alt="Nigerian students connecting across campuses on NIGERIA CAMPUS MARKET"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="sm:col-span-7 p-6 flex flex-col justify-between gap-4">
                            <div className="space-y-3">
                              <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded bg-[#FFF4EB] text-[#FF6A00] border border-[#F68B1F]/30">
                                Student Network
                              </span>
                              <h3 className="font-display text-xl font-extrabold text-[#222222] tracking-tight">
                                NATIONWIDE UNIVERSITY COMMUNITY
                              </h3>
                              <ul className="space-y-2 text-xs font-bold text-[#303030]">
                                {[
                                  'Connect with students across Nigeria',
                                  'Discover all Nigerian universities',
                                  'Create an account for free'
                                ].map((item) => (
                                  <li key={item} className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-[#FF6A00] shrink-0" />
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 pt-2">
                              <button
                                type="button"
                                onClick={() => {
                                  if (user) {
                                    navigateToView('hub');
                                  } else {
                                    handleOpenAuth('register', 'buyer');
                                  }
                                }}
                                className="px-5 py-2.5 bg-[#FF6A00] hover:bg-[#F68B1F] text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                              >
                                <span>{user ? 'Open Single Hub' : 'Join Nigeria Campus Market'}</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => navigateToView('friends')}
                                className="px-4 py-2.5 bg-[#F7F7F7] hover:bg-[#FFF4EB] border border-[#EEEEEE] text-[#222222] font-bold text-xs rounded-xl inline-flex items-center gap-1.5 transition cursor-pointer"
                              >
                                <Users className="w-3.5 h-3.5 text-[#FF6A00]" />
                                <span>Campus Friends</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="bg-[#F7F7F7] border-t border-[#EEEEEE] px-5 py-3 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs font-bold text-[#222222]">
                            <Smartphone className="w-4 h-4 text-[#FF6A00]" />
                            <span>
                              {showPWAInstructions && isIOS
                                ? 'Tap Share in Safari → Add to Home Screen.'
                                : 'Install NIGERIA CAMPUS MARKET Mobile App'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => navigateToView('friends')}
                              className="px-3 py-1.5 bg-white border border-[#EEEEEE] hover:border-[#F68B1F] text-[#222222] text-[11px] font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                            >
                              <MessageSquare className="w-3 h-3 text-[#FF6A00]" />
                              <span>Messages</span>
                            </button>
                            {isInstalled ? (
                              <span className="inline-flex px-3 py-1.5 bg-[#222222] text-white font-extrabold text-[11px] rounded-lg items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#F68B1F]" />
                                <span>Installed</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  if (isInstallable) {
                                    install();
                                  } else {
                                    setShowDownloadAppModal(true);
                                  }
                                }}
                                className="px-3 py-1.5 bg-[#FF6A00] hover:bg-[#F68B1F] text-white font-extrabold text-[11px] rounded-lg flex items-center gap-1 cursor-pointer"
                              >
                                <Download className="w-3 h-3" />
                                <span>Install App</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  <div ref={downloadAppRef}>
                    <DownloadAppSection
                      deviceType={deviceType}
                      isInstalled={isInstalled}
                      isInstallable={isInstallable}
                      appSettings={appSettings}
                      onTriggerInstall={install}
                      onTrackExternalDownload={(evType) => {
                        trackPwaInstallEvent(evType, platform, selectedInstitutionId).catch(() => {});
                      }}
                      onOpenInstallModal={() => setShowDownloadAppModal(true)}
                      onShowToast={showToast}
                    />
                  </div>

                  {/* Campus Emergency & GPA Academic Tool */}
                  <FuMarketEmergencySection
                    contacts={emergencyContacts}
                    announcements={safetyAnnouncements}
                    lostFoundCount={lostFoundItems.length}
                    onOpenContacts={(filter = 'all') =>
                      setEmergencyDirectoryState({ open: true, filter })
                    }
                    onOpenReportEmergency={(defaultCategory) =>
                      setEmergencyReportModalState({
                        open: true,
                        kind: 'emergency',
                        defaultCategory
                      })
                    }
                    onOpenSecurityConcern={() =>
                      setEmergencyReportModalState({
                        open: true,
                        kind: 'security_concern'
                      })
                    }
                    onOpenLostAndFound={() => setShowLostAndFoundModal(true)}
                    onOpenSafetyInfo={() => setShowCampusSafetyInfoModal(true)}
                    onOpenTrackReport={() => setShowReportTrackingModal(true)}
                    onOpenAdminEmergency={() => {
                      if (!isAuthorizedCeo(user)) return;
                      setAdminInitialTab('emergency');
                      setShowAdminDashboard(true);
                    }}
                  />

                  <section className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-[#FFF4EB] border border-[#F68B1F]/30 text-[#FF6A00] flex items-center justify-center shrink-0">
                        <Calculator className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-[#F7F7F7] text-[#FF6A00] border border-[#EEEEEE]">
                          Free Academic Tool
                        </span>
                        <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#222222]">
                          GPA &amp; CGPA Calculator
                        </h2>
                        <p className="text-xs text-[#303030]/75 max-w-2xl">
                          Compute semester GPA &amp; cumulative CGPA free without login on 5.0, 4.0, or custom grading scales — includes Target CGPA Predictor, Performance Chart, and PDF/CSV export.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigateToView('gpa')}
                      className="px-5 py-3 bg-[#FF6A00] hover:bg-[#F68B1F] text-white font-extrabold text-xs sm:text-sm rounded-xl flex items-center gap-2 shrink-0 shadow-sm transition cursor-pointer whitespace-nowrap"
                    >
                      <Calculator className="w-4 h-4" />
                      <span>Open GPA Calculator</span>
                    </button>
                  </section>
                </div>
              </>
            ) : (
              /* FULL FILTERABLE MARKETPLACE CATALOG VIEW */
              <section
                ref={productCatalogRef}
                className="scroll-mt-24 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start"
              >
                {/* Left Column: Campus Categories & Quick Portals */}
                <aside className="hidden lg:block lg:col-span-3 space-y-4">
                  <div className="bg-[#FFFFFF] rounded-2xl border border-[#EEEEEE] p-4 shadow-xs space-y-2.5">
                    <div className="flex items-center justify-between border-b border-[#EEEEEE] pb-2">
                      <h2 className="font-display text-sm font-extrabold text-[#222222]">
                        Campus Categories
                      </h2>
                      <span className="text-[11px] font-bold text-[#FF6A00] tabular-nums">
                        {categories.length}
                      </span>
                    </div>
                    <div className="space-y-1 max-h-[420px] overflow-y-auto pr-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategory('all');
                          setViewingFavouritesOnly(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition cursor-pointer ${
                          selectedCategory === 'all' && !viewingFavouritesOnly
                            ? 'bg-[#FF6A00] text-white'
                            : 'hover:bg-[#F7F7F7] text-[#222222]'
                        }`}
                      >
                        <span>All Marketplace Items</span>
                        <ChevronRight className="w-3.5 h-3.5 opacity-75" />
                      </button>
                      {categories.slice(0, 14).map((cat) => {
                        const active = selectedCategory === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              setSelectedCategory(active ? 'all' : cat.id);
                              setViewingFavouritesOnly(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between gap-2 transition cursor-pointer ${
                              active
                                ? 'bg-[#FF6A00] text-white'
                                : 'hover:bg-[#F7F7F7] text-[#222222]'
                            }`}
                          >
                            <span className="flex items-center gap-2 min-w-0">
                              <span className={active ? 'text-white' : 'text-[#FF6A00]'}>
                                {getCategoryIcon(cat.icon)}
                              </span>
                              <span className="truncate">{cat.name}</span>
                            </span>
                            <span className="text-[10px] opacity-75 tabular-nums shrink-0">
                              {cat.productCount || 0}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quick Academic & Student Portals Card */}
                  <div className="bg-[#222222] text-white rounded-2xl p-4 border-b-4 border-[#FF6A00] space-y-2.5">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#F68B1F]">
                      Student Toolkit
                    </p>
                    <button
                      type="button"
                      onClick={() => navigateToView('gpa')}
                      className="w-full py-2.5 px-3 rounded-xl bg-[#FF6A00] hover:bg-[#F68B1F] text-xs font-extrabold flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Calculator className="w-4 h-4" />
                        <span>GPA &amp; CGPA Calculator</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateToView('books')}
                      className="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-[#F68B1F]" />
                        <span>Textbooks &amp; Past Qs</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateToView('deals')}
                      className="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Gift className="w-4 h-4 text-[#F68B1F]" />
                        <span>Student Deals &amp; Giveaways</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </aside>

                {/* Center Column: Filter Header + Sponsored Ad + Product Catalog */}
                <div className="lg:col-span-6 space-y-4">
                  <div className="bg-[#FFFFFF] p-4 rounded-2xl border border-[#EEEEEE] shadow-xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-[#FFF4EB] text-[#FF6A00] border border-[#F68B1F]/30">
                          Marketplace Feed
                        </span>
                        <h2 className="font-display text-lg font-extrabold text-[#222222] mt-1">
                          {viewingFavouritesOnly
                            ? 'Saved Favourites'
                            : selectedCategory !== 'all'
                            ? categories.find((c) => c.id === selectedCategory)?.name || 'Category Items'
                            : searchQuery
                            ? `Results for "${searchQuery}"`
                            : activeInstitution
                            ? `${activeInstitution.shortName} Marketplace`
                            : 'National Campus Marketplace'}
                        </h2>
                        <p className="text-[11px] text-[#303030]/75 flex items-center gap-2 tabular-nums">
                          <span>
                            Showing {visibleProducts.length} of {displayedProducts.length} listings
                          </span>
                          {isRefreshing && (
                            <span className="text-[10px] font-bold text-[#FF6A00]">
                              Syncing...
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <select
                          value={selectedState}
                          onChange={(e) => setSelectedState(e.target.value)}
                          className="bg-[#F7F7F7] border border-[#EEEEEE] px-2.5 py-1.5 rounded-xl text-xs font-bold text-[#222222] outline-none"
                        >
                          <option value="all">All States</option>
                          {NIGERIA_STATES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>

                        <select
                          value={sortOption}
                          onChange={(e) => setSortOption(e.target.value as any)}
                          className="bg-[#F7F7F7] border border-[#EEEEEE] text-xs font-bold text-[#222222] py-1.5 px-2.5 rounded-xl outline-none"
                        >
                          <option value="newest">Newest</option>
                          <option value="price-asc">Price Low</option>
                          <option value="price-desc">Price High</option>
                          <option value="popular">Popular</option>
                        </select>

                        {hasActiveFilters && (
                          <button
                            type="button"
                            onClick={resetAllFilters}
                            className="px-2.5 py-1.5 text-xs bg-[#222222] text-white rounded-xl font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <X className="w-3 h-3 text-[#FF6A00]" />
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Condition & Price Presets */}
                    <div className="pt-2.5 border-t border-[#EEEEEE] flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1 bg-[#F7F7F7] p-0.5 rounded-xl border border-[#EEEEEE]">
                        {(['all', 'new', 'used'] as const).map((cond) => (
                          <button
                            key={cond}
                            type="button"
                            onClick={() => setConditionFilter(cond)}
                            className={`px-2.5 py-1 rounded-lg font-bold capitalize transition cursor-pointer ${
                              conditionFilter === cond
                                ? 'bg-[#FF6A00] text-white'
                                : 'text-[#303030]/75 hover:text-[#222222]'
                            }`}
                          >
                            {cond}
                          </button>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-[#FF6A00]" />
                        {PRICE_PRESETS.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => handleSelectPricePreset(preset)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                              activePricePreset === preset.id
                                ? 'bg-[#FF6A00] border-[#FF6A00] text-white font-extrabold'
                                : 'bg-[#F7F7F7] border-[#EEEEEE] text-[#222222] hover:border-[#F68B1F]'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Category / Marketplace Sponsored Placement */}
                  {(categoryFeedAds.length > 0 || marketplaceAds.length > 0) && (
                    <div className="space-y-2">
                      {(categoryFeedAds.length > 0 ? categoryFeedAds : marketplaceAds)
                        .slice(0, 1)
                        .map((ad) => (
                          <SponsoredAdCard
                            key={ad.id}
                            ad={ad}
                            variant="banner"
                            onSelectAd={(picked) => setSelectedAd(picked)}
                          />
                        ))}
                    </div>
                  )}

                  {/* Product Grid */}
                  {loading ? (
                    <div className="py-14 text-center bg-white rounded-2xl border border-[#EEEEEE]">
                      <div className="w-10 h-10 border-4 border-[#FF6A00] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-xs font-bold text-[#303030]/75">
                        Loading genuine NIGERIA CAMPUS MARKET listings...
                      </p>
                    </div>
                  ) : fetchError ? (
                    <div className="bg-white rounded-2xl p-8 text-center border border-[#EEEEEE] shadow-xs">
                      <ShoppingBag className="w-10 h-10 text-[#FF6A00] mx-auto mb-3" />
                      <h3 className="text-base font-extrabold text-[#222222]">
                        Unable to load listings right now
                      </h3>
                      <p className="text-xs text-[#303030]/75 mt-1 mb-4 break-words">{fetchError}</p>
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => loadCatalogProducts(1, true)}
                          className="px-4 py-2 bg-[#FF6A00] text-white text-xs font-extrabold rounded-xl cursor-pointer"
                        >
                          Retry
                        </button>
                        <button
                          type="button"
                          onClick={handleRequestSellModal}
                          className="px-4 py-2 bg-[#F7F7F7] border border-[#EEEEEE] text-[#222222] text-xs font-extrabold rounded-xl cursor-pointer"
                        >
                          Post Item
                        </button>
                      </div>
                    </div>
                  ) : displayedProducts.length === 0 ? (
                    <div className="bg-white rounded-2xl p-8 text-center border border-[#EEEEEE] shadow-xs">
                      <ShoppingBag className="w-10 h-10 text-[#FF6A00] mx-auto mb-3" />
                      <h3 className="text-base font-extrabold text-[#222222]">
                        {viewingFavouritesOnly
                          ? 'No saved favourites yet'
                          : 'No listings yet for this filter'}
                      </h3>
                      <p className="text-xs text-[#303030]/75 mt-1 mb-4">
                        {hasActiveFilters
                          ? 'Try clearing your search, category, or switching to All Institutions.'
                          : 'Be the first to list textbooks, phones, fashion, or hostel items.'}
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={handleRequestSellModal}
                          className="px-4 py-2 bg-[#FF6A00] text-white text-xs font-extrabold rounded-xl cursor-pointer"
                        >
                          Start Selling
                        </button>
                        {hasActiveFilters && (
                          <button
                            type="button"
                            onClick={resetAllFilters}
                            className="px-4 py-2 bg-[#F7F7F7] border border-[#EEEEEE] text-[#222222] text-xs font-bold rounded-xl cursor-pointer"
                          >
                            Reset Filters
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                        {visibleProducts.map((prod) => (
                          <ProductCard
                            key={prod.id}
                            product={prod}
                            onOpenDetail={setSelectedProduct}
                            onOpenStorefront={setSelectedSellerStorefrontId}
                            onAddToCart={addToCart}
                            onStartDirectChat={handleStartDirectChat}
                          />
                        ))}
                      </div>
                      {hasMoreProducts && (
                        <div ref={loadMoreRef} className="flex justify-center pt-1">
                          <button
                            type="button"
                            onClick={() => setVisibleCount((prev) => prev + 12)}
                            className="px-5 py-2.5 bg-white border border-[#EEEEEE] hover:border-[#F68B1F] text-[#FF6A00] text-xs font-extrabold rounded-xl shadow-xs transition cursor-pointer"
                          >
                            Load More Products ({displayedProducts.length - visibleProducts.length} left)
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Right Column: Active Campus Card, Sponsored Ad & What Students Need */}
                <aside className="lg:col-span-3 space-y-4">
                  <div className="bg-[#FFFFFF] rounded-2xl border border-[#EEEEEE] p-4 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="font-display text-sm font-extrabold text-[#222222] flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4 text-[#FF6A00]" />
                        <span>Campus Filter</span>
                      </h2>
                      <span className="text-[10px] font-bold text-[#FF6A00]">
                        {institutions.length} Schools
                      </span>
                    </div>
                    <p className="text-xs font-bold text-[#222222]">
                      {activeInstitution ? `${activeInstitution.shortName} — ${selectedCampus}` : 'All Nigerian Campuses'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowInstitutionSwitcher(true)}
                      className="w-full py-2.5 rounded-xl bg-[#FF6A00] hover:bg-[#F68B1F] text-white text-xs font-extrabold transition cursor-pointer"
                    >
                      Switch University / Campus
                    </button>
                  </div>

                  {/* Live What Students Need Mini Feed */}
                  <div className="bg-[#FFFFFF] rounded-2xl border border-[#EEEEEE] p-4 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-sm font-extrabold text-[#222222] flex items-center gap-1.5">
                        <HelpCircle className="w-4 h-4 text-[#FF6A00]" />
                        <span>What Students Need</span>
                      </h3>
                      <button
                        type="button"
                        onClick={() => navigateToView('requests')}
                        className="text-[11px] font-extrabold text-[#FF6A00] hover:underline cursor-pointer"
                      >
                        View All
                      </button>
                    </div>
                    {latestRequests.length === 0 ? (
                      <p className="text-[11px] text-[#303030]/75">
                        No open student requests on this campus yet.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {latestRequests.map((req) => (
                          <button
                            key={req.id}
                            type="button"
                            onClick={() => navigateToView('requests')}
                            className="w-full text-left p-2.5 rounded-xl bg-[#F7F7F7] border border-[#EEEEEE] hover:border-[#F68B1F] transition space-y-1 cursor-pointer"
                          >
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="font-extrabold text-[#FF6A00] tabular-nums">
                                Budget: {formatNaira(req.budget)}
                              </span>
                              <span className="uppercase font-bold text-[#303030]/75">{req.status}</span>
                            </div>
                            <p className="text-xs font-bold text-[#222222] line-clamp-1">{req.title}</p>
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => navigateToView('requests')}
                      className="w-full py-2 rounded-xl bg-[#222222] hover:bg-[#303030] text-white text-xs font-extrabold transition cursor-pointer"
                    >
                      Post Request for Sellers
                    </button>
                  </div>

                  {/* Advertise CTA Card */}
                  <div className="bg-[#FF6A00] text-white rounded-2xl p-4 space-y-2.5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-white/95">
                      <Sparkles className="w-3 h-3" />
                      Nationwide Promotion
                    </span>
                    <p className="text-xs font-bold leading-relaxed text-white">
                      Promote your brand, hostel, event, or campus store across Nigerian universities.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleOpenAdvertiseModal('featured')}
                      className="w-full py-2 rounded-xl bg-[#FFFFFF] hover:bg-[#F7F7F7] text-[#FF6A00] font-extrabold text-xs cursor-pointer transition"
                    >
                      Request to Advertise
                    </button>
                  </div>
                </aside>
              </section>
            )}
          </main>

          {/* Dismissible Floating Install App Pill */}
          {!isInstalled && (isInstallable || isIOS) && !dismissInstallPill && (
            <div className="fixed bottom-20 sm:bottom-6 left-4 z-30 flex items-center gap-1.5 bg-[#222222] text-white px-3 py-2 rounded-full shadow-xl border border-[#F68B1F]">
              <button
                type="button"
                onClick={() => {
                  if (isInstallable) {
                    install();
                  } else {
                    setShowDownloadAppModal(true);
                  }
                }}
                className="flex items-center gap-1.5 text-xs font-extrabold text-white hover:text-[#F68B1F] transition cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5 text-[#FF6A00]" />
                <span>Install App</span>
              </button>
              <button
                type="button"
                onClick={() => setDismissInstallPill(true)}
                aria-label="Dismiss install app banner"
                className="p-0.5 rounded-full hover:bg-white/15 text-white/75 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Floating Orange "Post Item for FREE" Button */}
          <button
            type="button"
            onClick={handleRequestSellModal}
            className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-30 bg-[#FF6A00] hover:bg-[#F68B1F] text-white font-extrabold text-xs sm:text-sm px-5 py-3.5 rounded-full shadow-2xl border-2 border-white flex items-center gap-2 active:scale-95 transition cursor-pointer whitespace-nowrap"
          >
            <PlusCircle className="w-5 h-5" />
            <span>Post Item for FREE</span>
          </button>

          {/* Step 18: Professional Footer */}
          <Footer
            categories={categories}
            onSelectCategory={(catId) => {
              setSelectedCategory(catId);
              handleStartShopping();
            }}
            onOpenSellModal={handleRequestSellModal}
            onOpenSafetyModal={() => setShowSafetyModal(true)}
            onNavigateView={navigateToView}
            onTriggerPWAHelp={handleTriggerPWAHelp}
            onOpenAdvertiseModal={() => handleOpenAdvertiseModal('featured')}
            onOpenServicesSection={scrollToServicesSection}
            onOpenEmergencySection={scrollToEmergencySection}
            onOpenPostServiceModal={() =>
              setPostServiceModalState({ open: true, editingService: null })
            }
            onOpenServiceProviderDashboard={() => setShowServiceProviderDashboard(true)}
            onOpenCeoPortal={() =>
              navigateCeoRoute(isCeoRouteAuthorized ? 'ceo-admin' : 'ceo-login', null)
            }
            activeInstitution={activeInstitution}
            onOpenDownloadApp={() => setShowDownloadAppModal(true)}
            onOpenNationwideSearch={() => setShowNationwideSearch(true)}
            onOpenSubscriptions={() => setShowSubscriptionsModal(true)}
            onOpenInstitutionSwitcher={() => setShowInstitutionSwitcher(true)}
            onOpenInfoModal={(topic) => setPlatformInfoTopic(topic)}
          />
        </>
      )}

      {/* MODALS */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onOpenStorefront={(sellerId) => {
            setSelectedProduct(null);
            setSelectedSellerStorefrontId(sellerId);
          }}
          onAddToCart={addToCart}
          onStartDirectChat={handleStartDirectChat}
        />
      )}

      {showSellModal && (
        <SellProductModal
          categories={categories}
          selectedInstitutionId={selectedInstitutionId}
          selectedCampus={selectedCampus}
          institutions={institutions}
          userSettings={userSettings}
          onClose={() => setShowSellModal(false)}
          onSuccess={handleProductPostSuccess}
          onViewProduct={(product) => {
            setShowSellModal(false);
            setSelectedProduct(product);
          }}
          onRequireAuth={() => handleOpenAuth('login', 'seller')}
        />
      )}

      {showAuthModal && (
        <AuthModal
          initialMode={authModalMode}
          defaultRole={authModalRole}
          onClose={() => setShowAuthModal(false)}
          onContinueAsGuest={() => {
            activateGuestMode();
            ensureGuestAuth().catch(() => {});
            showToast('Continuing as Guest on NIGERIA CAMPUS MARKET');
          }}
          onSuccess={(result) => {
            if (result?.isRegistration) {
              showToast('Your NIGERIA CAMPUS MARKET account has been created.');
            } else {
              showToast('Welcome to NIGERIA CAMPUS MARKET!');
            }
            loadCatalogProducts(1);
          }}
        />
      )}

      <GuestChoiceModal
        isOpen={Boolean(pendingGuestAction)}
        actionType={pendingGuestAction?.type || 'post'}
        onClose={() => setPendingGuestAction(null)}
        onContinueAsGuest={() => {
          const action = pendingGuestAction;
          activateGuestMode();
          ensureGuestAuth().catch(() => {});
          setPendingGuestAction(null);
          showToast('Continuing as Guest');
          if (action?.type === 'post') {
            setShowSellModal(true);
          } else if (action?.type === 'chat') {
            setDirectChatTarget(action.target);
            navigateToView('friends');
          }
        }}
        onGoogleSuccess={() => {
          const action = pendingGuestAction;
          setPendingGuestAction(null);
          showToast('Signed in with Google!');
          loadCatalogProducts(1);
          if (action?.type === 'post') {
            setShowSellModal(true);
          } else if (action?.type === 'chat') {
            setDirectChatTarget(action.target);
            navigateToView('friends');
          }
        }}
      />

      {showSellerDashboard && (
        <SellerDashboard
          onClose={() => setShowSellerDashboard(false)}
          onOpenSellModal={() => {
            setShowSellerDashboard(false);
            setShowSellModal(true);
          }}
          onOpenStorefront={(sellerId) => {
            setShowSellerDashboard(false);
            setSelectedSellerStorefrontId(sellerId);
          }}
        />
      )}

      {selectedSellerStorefrontId && (
        <SellerStorefrontModal
          sellerId={selectedSellerStorefrontId}
          onClose={() => setSelectedSellerStorefrontId(null)}
          onOpenProductDetail={setSelectedProduct}
          onAddToCart={addToCart}
          onStartDirectChat={handleStartDirectChat}
        />
      )}

      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}

      {showCeoEventsModal && isAuthorizedCeo(user) && (
        <CeoEventsManager
          onClose={() => setShowCeoEventsModal(false)}
          onEventsChanged={() => {
            getPublishedEventsFromFirestore(true)
              .then((list) => setCampusEvents(list))
              .catch(() => {});
          }}
        />
      )}

      {postAnnouncementModalState.open && (
        <PostAnnouncementModal
          defaultFeedType={postAnnouncementModalState.defaultFeedType}
          editingPost={postAnnouncementModalState.editingPost}
          institutionId={
            selectedInstitutionId !== 'all' ? selectedInstitutionId : DEFAULT_INSTITUTION_ID
          }
          campus={selectedCampus}
          institutions={institutions}
          onClose={() =>
            setPostAnnouncementModalState({
              open: false,
              defaultFeedType: 'sport_update',
              editingPost: null
            })
          }
          onOpenAuthModal={(mode = 'login') => handleOpenAuth(mode, 'buyer')}
          onSuccess={(savedPost, msg) => {
            setPostAnnouncementModalState({
              open: false,
              defaultFeedType: 'sport_update',
              editingPost: null
            });
            if (msg) showToast(msg);
            if (savedPost && savedPost.status === 'published') {
              setSelectedAnnouncement(savedPost);
            }
          }}
        />
      )}

      {selectedAnnouncement && (
        <AnnouncementDetailModal
          post={
            (selectedAnnouncement.categoryType === 'sport_update'
              ? sportUpdates.find((p) => p.id === selectedAnnouncement.id)
              : generalAnnouncements.find((p) => p.id === selectedAnnouncement.id)) ||
            selectedAnnouncement
          }
          isSaved={savedAnnouncementIds.has(selectedAnnouncement.id)}
          onClose={() => setSelectedAnnouncement(null)}
          onEditPost={(postToEdit) => {
            setSelectedAnnouncement(null);
            setPostAnnouncementModalState({
              open: true,
              defaultFeedType: postToEdit.categoryType,
              editingPost: postToEdit
            });
          }}
          onDeleted={() => setSelectedAnnouncement(null)}
          onOpenAuthorProfile={(authorId, authorName, authorAvatar) =>
            setAuthorProfileTarget({ authorId, authorName, authorAvatar })
          }
          onOpenAuthModal={(mode = 'login') => handleOpenAuth(mode, 'buyer')}
          onToast={showToast}
        />
      )}

      {authorProfileTarget && (
        <AuthorProfileModal
          authorId={authorProfileTarget.authorId}
          authorName={authorProfileTarget.authorName}
          authorAvatar={authorProfileTarget.authorAvatar}
          allPosts={[...sportUpdates, ...generalAnnouncements]}
          onSelectPost={(p) => {
            setAuthorProfileTarget(null);
            setSelectedAnnouncement(p);
          }}
          onClose={() => setAuthorProfileTarget(null)}
        />
      )}

      {showAdminDashboard && isAuthorizedCeo(user) && (
        <AdminDashboard
          initialTab={adminInitialTab}
          onClose={() => setShowAdminDashboard(false)}
          onOpenProductDetail={setSelectedProduct}
          onEventsChanged={() => {
            getPublishedEventsFromFirestore(true)
              .then((list) => setCampusEvents(list))
              .catch(() => {});
          }}
          onOpenMasterControl={() => {
            if (isAuthorizedCeo(user)) setShowCeoMasterControl(true);
          }}
        />
      )}

      {postServiceModalState.open && (
        <PostServiceModal
          categories={serviceCategories}
          editingService={postServiceModalState.editingService}
          selectedInstitutionId={selectedInstitutionId}
          selectedCampus={selectedCampus}
          institutions={institutions}
          onClose={() =>
            setPostServiceModalState({ open: false, editingService: null })
          }
          onSuccess={(savedService, isEdit) => {
            setPostServiceModalState({ open: false, editingService: null });
            showToast(
              isEdit
                ? 'Service updated on NIGERIA CAMPUS MARKET!'
                : 'Service posted on NIGERIA CAMPUS MARKET!'
            );
            setSelectedServiceState({ service: savedService, showContact: false });
          }}
        />
      )}

      {selectedServiceState && (
        <ServiceDetailModal
          service={
            publicServices.find(
              (s) => s.serviceId === selectedServiceState.service.serviceId
            ) || selectedServiceState.service
          }
          initialShowContact={selectedServiceState.showContact}
          onClose={() => setSelectedServiceState(null)}
          onOpenPromotion={(svc) => {
            setSelectedServiceState(null);
            setPromoteServiceTarget(svc);
          }}
          onStartDirectChat={handleStartDirectChat}
          onToast={showToast}
        />
      )}

      {promoteServiceTarget && (
        <ServicePromotionModal
          service={promoteServiceTarget}
          onClose={() => setPromoteServiceTarget(null)}
          onSuccess={() => {
            showToast('Service promotion activated on NIGERIA CAMPUS MARKET!');
          }}
        />
      )}

      {showServiceProviderDashboard && (
        <ServiceProviderDashboardModal
          categories={serviceCategories}
          onClose={() => setShowServiceProviderDashboard(false)}
          onPostNew={() => {
            setShowServiceProviderDashboard(false);
            setPostServiceModalState({ open: true, editingService: null });
          }}
          onEditService={(svc) => {
            setShowServiceProviderDashboard(false);
            setPostServiceModalState({ open: true, editingService: svc });
          }}
          onPromoteService={(svc) => {
            setShowServiceProviderDashboard(false);
            setPromoteServiceTarget(svc);
          }}
          onViewService={(svc) => {
            setShowServiceProviderDashboard(false);
            setSelectedServiceState({ service: svc, showContact: false });
          }}
          onToast={showToast}
        />
      )}

      {selectedAd && (
        <AdDetailModal
          ad={selectedAd}
          onClose={() => setSelectedAd(null)}
          onAdvertiseNow={() => handleOpenAdvertiseModal('featured')}
        />
      )}

      {advertiseModalState.open && (
        <AdvertiseBusinessModal
          initialPackageId={advertiseModalState.packageId}
          activeInstitutionId={selectedInstitutionId}
          onClose={() => setAdvertiseModalState({ open: false })}
          onSubmitted={() => {
            showToast('Advertising request sent! The Super Admin team will review and reach out shortly.');
          }}
        />
      )}

      <InstitutionSwitcherModal
        isOpen={showInstitutionSwitcher}
        onClose={() => setShowInstitutionSwitcher(false)}
        institutions={institutions}
        selectedInstitutionId={selectedInstitutionId}
        selectedCampus={selectedCampus}
        onSelectInstitution={(id, camp) => handleSelectInstitution(id, camp, true)}
      />

      <NationwideSearchModal
        isOpen={showNationwideSearch}
        onClose={() => setShowNationwideSearch(false)}
        activeInstitution={effectiveActiveInstitution}
        institutions={institutions}
        products={products}
        services={publicServices}
        advertisements={activePublicAds}
        sports={sportUpdates}
        announcements={generalAnnouncements}
        events={campusEvents}
        accommodations={allAccommodation}
        studentRequests={allStudentRequests}
        onSelectResult={(result) => {
          setShowNationwideSearch(false);
          if (result.entityType === 'products') {
            const p = products.find((x) => x.id === result.id) || result.raw;
            if (p) setSelectedProduct(p);
          } else if (result.entityType === 'accommodation' || result.entityType === 'house_agents') {
            navigateToView('hux');
          } else if (result.entityType === 'student_requests') {
            navigateToView('requests');
          } else if (result.entityType === 'businesses') {
            const ad = activePublicAds.find((a) => a.id === result.id) || result.raw;
            if (ad) setSelectedAd(ad);
          } else if (result.entityType === 'services') {
            const sv = publicServices.find((s) => s.serviceId === result.id) || result.raw;
            if (sv) setSelectedServiceState({ service: sv, showContact: false });
          } else if (result.entityType === 'events') {
            const ev = campusEvents.find((e) => e.id === result.id) || result.raw;
            if (ev) setSelectedEvent(ev);
          }
        }}
      />

      <SubscriptionPlansModal
        isOpen={showSubscriptionsModal}
        onClose={() => setShowSubscriptionsModal(false)}
        user={user}
        activeInstitution={effectiveActiveInstitution}
        userSubscriptions={userSubscriptions}
        onRequireLogin={() => {
          setShowSubscriptionsModal(false);
          handleOpenAuth('login', 'seller');
        }}
        onShowToast={showToast}
      />

      <DownloadAppModal
        isOpen={showDownloadAppModal}
        onClose={() => setShowDownloadAppModal(false)}
        isInstalled={isInstalled}
        isInstallable={isInstallable}
        isIOS={isIOS}
        deviceType={deviceType}
        browserType={browserType}
        appSettings={appSettings}
        onTriggerInstall={install}
        onTrackExternalDownload={(evType) => {
          trackPwaInstallEvent(evType, platform, selectedInstitutionId).catch(() => {});
        }}
        onShowToast={showToast}
      />

      <NotificationCenterModal
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        userId={firebaseUser?.uid || user?.id}
        notifications={notifications}
        onNotificationClick={handleNotificationNavigation}
      />

      <UserProfileModal
        isOpen={showUserProfileModal}
        onClose={() => setShowUserProfileModal(false)}
        currentUser={user}
        institutions={institutions}
        selectedInstitutionId={selectedInstitutionId}
        selectedCampus={selectedCampus}
        onProfileSaved={(_updatedUser, instId, camp) => {
          refreshUser().catch(() => {});
          if (instId) {
            handleSelectInstitution(instId, camp, false);
          }
          showToast('Campus profile & settings saved.');
        }}
        onOpenFullSettings={() => navigateToView('settings')}
        onRequireLogin={() => handleOpenAuth('login', 'buyer')}
      />

      {showCeoMasterControl && isAuthorizedCeo(user) && (
        <CeoMasterControlModal
          onClose={() => setShowCeoMasterControl(false)}
          onDataChanged={() => {
            loadCatalogProducts(1, true);
            getPublishedEventsFromFirestore(true)
              .then((list) => setCampusEvents(list))
              .catch(() => {});
          }}
        />
      )}

      {showSafetyModal && <SafetyModal onClose={() => setShowSafetyModal(false)} />}

      {emergencyDirectoryState.open && (
        <EmergencyContactDirectoryModal
          contacts={emergencyContacts}
          initialFilter={emergencyDirectoryState.filter}
          onClose={() => setEmergencyDirectoryState({ open: false, filter: 'all' })}
          onReportEmergency={(defaultCategory) => {
            setEmergencyDirectoryState({ open: false, filter: 'all' });
            setEmergencyReportModalState({
              open: true,
              kind: 'emergency',
              defaultCategory
            });
          }}
        />
      )}

      {emergencyReportModalState.open && (
        <EmergencyReportModal
          initialKind={emergencyReportModalState.kind}
          contacts={emergencyContacts}
          defaultCategory={emergencyReportModalState.defaultCategory}
          onClose={() =>
            setEmergencyReportModalState({ open: false, kind: 'emergency' })
          }
          onSubmitted={(receipt) => {
            showToast(`Report ${receipt.reportId} logged. Save your PIN: ${receipt.verificationPin}`);
          }}
          onOpenDirectory={() => {
            setEmergencyReportModalState({ open: false, kind: 'emergency' });
            setEmergencyDirectoryState({ open: true, filter: 'all' });
          }}
        />
      )}

      {showReportTrackingModal && (
        <ReportTrackingModal onClose={() => setShowReportTrackingModal(false)} />
      )}

      {showCampusSafetyInfoModal && (
        <CampusSafetyInfoModal
          onClose={() => setShowCampusSafetyInfoModal(false)}
          onOpenContacts={() => {
            setShowCampusSafetyInfoModal(false);
            setEmergencyDirectoryState({ open: true, filter: 'all' });
          }}
          onReportSecurityConcern={() => {
            setShowCampusSafetyInfoModal(false);
            setEmergencyReportModalState({ open: true, kind: 'security_concern' });
          }}
        />
      )}

      {showLostAndFoundModal && (
        <LostAndFoundModal
          items={lostFoundItems}
          onClose={() => setShowLostAndFoundModal(false)}
          onReportSubmitted={() => showToast('Lost & Found report published!')}
        />
      )}

      <CartOrderReviewModal
        isOpen={showCartModal}
        items={cartItems}
        institutionId={selectedInstitutionId}
        onClose={() => setShowCartModal(false)}
        onUpdateQuantity={updateCartQuantity}
        onRemoveItem={removeFromCart}
        onClearCart={clearCart}
      />

      <PlatformInfoModal
        topic={platformInfoTopic}
        onClose={() => setPlatformInfoTopic(null)}
        onOpenReportScam={scrollToEmergencySection}
      />

      <BottomNav
        currentView={currentView}
        onNavigate={navigateToView}
        onOpenUniversities={() => setShowInstitutionSwitcher(true)}
        pendingRequestsCount={pendingRequestsCount}
        ordersBadgeCount={totalCartItems}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <MainMarketplace />
      </AuthProvider>
    </ErrorBoundary>
  );
}
