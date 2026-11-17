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
  Eye
} from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import campusHostelShowcaseImg from './assets/images/nigeria_campus_hostel_1794902752622.jpg';
import campusFoodShowcaseImg from './assets/images/nigeria_campus_food_1794902752058.jpg';
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
  ServiceCategory,
  ServiceListing,
  EmergencyContact,
  SafetyAnnouncement,
  LostFoundItem,
  CeoSessionState,
  Institution,
  EmergencyReportKind,
  FoodVendor,
  AppSettings,
  UserSubscription,
  AppNotification
} from './types.js';
import { fetchProducts, fetchCategories } from './services/api.js';
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
import { CeoMasterControlModal } from './components/CeoMasterControlModal.js';
import { CeoVerifiedBadge } from './components/CeoVerifiedBadge.js';
import {
  filterAdsForInstitution,
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
import { subscribeToFoodVendors } from './services/campusEcosystem.js';
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
  if (path === '/ceo-admin' || path.startsWith('/ceo-admin/')) return 'ceo-admin';
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
  const { user, firebaseUser, favourites, notifications, refreshUser } = useAuth();
  const { isInstallable, isInstalled, isIOS, platform, install } = usePWAInstall();

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
  const [ceoInitialSection, setCeoInitialSection] = useState<CeoSectionId>('verification');
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
  const [showNotificationModal, setShowNotificationModal] = useState<boolean>(false);
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [userSubscriptions, setUserSubscriptions] = useState<UserSubscription[]>([]);

  // Live previews for homepage sections
  const [allStudentRequests, setAllStudentRequests] = useState<StudentRequest[]>([]);
  const [allAccommodation, setAllAccommodation] = useState<AccommodationProperty[]>([]);
  const [foodVendors, setFoodVendors] = useState<FoodVendor[]>([]);

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

  // Official Ads & CEO Master Control
  const [activePublicAds, setActivePublicAds] = useState<Advertisement[]>(() =>
    getCachedActivePublicAds()
  );
  const [adsLoading, setAdsLoading] = useState<boolean>(
    () => getCachedActivePublicAds().length === 0
  );
  const [selectedAd, setSelectedAd] = useState<Advertisement | null>(null);
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
  const [uniSearchQuery, setUniSearchQuery] = useState<string>('');
  const [pickerInstitutionId, setPickerInstitutionId] = useState<string>(() =>
    selectedInstitutionId !== 'all' ? selectedInstitutionId : DEFAULT_INSTITUTION_ID
  );
  const [pickerCampus, setPickerCampus] = useState<string>(
    () => selectedCampus || DEFAULT_INSTITUTION_CAMPUS
  );

  useEffect(() => {
    if (selectedInstitutionId !== 'all') {
      setPickerInstitutionId(selectedInstitutionId);
      setPickerCampus(selectedCampus || DEFAULT_INSTITUTION_CAMPUS);
    }
  }, [selectedInstitutionId, selectedCampus]);

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
    const uid = firebaseUser?.uid || user?.id;
    if (!uid || firebaseUser?.isAnonymous) {
      setUserSubscriptions([]);
      return;
    }
    const unsub = subscribeToUserSubscriptions(uid, setUserSubscriptions);
    return () => unsub();
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
      const actorKey = `${auth.currentUser?.uid || 'anon'}:${user?.email || 'anon'}`;
      if (unauthorizedCeoLogRef.current !== actorKey) {
        unauthorizedCeoLogRef.current = actorKey;
        logUnauthorizedCeoAccess(
          'Blocked unauthorized or unauthenticated direct access to /ceo-admin route.',
          '/ceo-admin',
          auth.currentUser?.email || user?.email || 'anonymous'
        );
      }
      if (ceoSession) {
        setCeoSession(null);
        saveCeoSession(null);
      }
      setCeoLoginNotice('Access denied. Authorized NIGERIA CAMPUS MARKET CEO login is required.');
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
  }, [user?.id]);

  useEffect(() => {
    const student = getLocalStudentSession();
    const studentId = student?.id || user?.id;
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
    }, 600);

    return () => {
      clearTimeout(previewTimer);
      unsubReq();
      unsubInsts();
      unsubStudentReqs();
      unsubHux();
      unsubFood();
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
    const targetPath =
      mode === 'ceo-login' ? '/ceo-login' : mode === 'ceo-admin' ? '/ceo-admin' : '/';
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

  const scrollToAdsSectionOrCeo = () => {
    if (isAuthorizedCeo(user)) {
      navigateCeoRoute(isCeoRouteAuthorized ? 'ceo-admin' : 'ceo-login', null, 'ads');
      return;
    }
    scrollToSectionId('fu-market-ads');
    showToast('Official ads are published by NIGERIA CAMPUS MARKET CEO (08167258121).');
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
          setFetchError('Listings request timed out after 5 seconds.');
        }
        setLoading(false);
        setIsRefreshing(false);
      }
    }, 5000);

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
        setTimeout(() => reject(new Error('Listings request timed out after 5 seconds.')), 5000);
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

  const showToast = (msg: string) => {
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

  const heroAds = useMemo(
    () =>
      filterAdsForInstitution(activePublicAds, selectedInstitutionId).filter(
        (ad) => ad.placement === 'homepage_hero' || ad.placement === 'institution_spotlight'
      ),
    [activePublicAds, selectedInstitutionId]
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

  const effectiveActiveInstitution = activeInstitution || VERIFIED_NIGERIAN_INSTITUTIONS[0];

  const filteredPickerInstitutions = useMemo(() => {
    const q = uniSearchQuery.trim().toLowerCase();
    if (!q) return institutions;
    return institutions.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.shortName.toLowerCase().includes(q) ||
        i.state.toLowerCase().includes(q) ||
        (i.campus || '').toLowerCase().includes(q)
    );
  }, [institutions, uniSearchQuery]);

  const pickerInstObj = useMemo(
    () => getInstitutionById(pickerInstitutionId, institutions),
    [pickerInstitutionId, institutions]
  );

  const popularUniversities = useMemo(() => {
    const preferredIds = ['fuwukari', 'unilag', 'ui', 'abu', 'unn', 'oau', 'uniben', 'uniport'];
    const matched = preferredIds
      .map((id) => institutions.find((i) => i.id === id))
      .filter((i): i is Institution => Boolean(i));
    return matched.length >= 4 ? matched : institutions.slice(0, 8);
  }, [institutions]);

  const trendingCrossCampusProducts = useMemo(() => {
    const sorted = [...products].sort((a, b) => {
      const scoreB = (b.views || 0) + (b.whatsappClicks || 0) * 5;
      const scoreA = (a.views || 0) + (a.whatsappClicks || 0) * 5;
      return scoreB - scoreA;
    });
    const diverse: Product[] = [];
    const seenInstCount = new Map<string, number>();
    for (const prod of sorted) {
      const instKey = prod.institutionId || 'general';
      const cnt = seenInstCount.get(instKey) || 0;
      if (cnt < 2) {
        diverse.push(prod);
        seenInstCount.set(instKey, cnt + 1);
      }
      if (diverse.length >= 6) break;
    }
    if (diverse.length < 6) {
      for (const prod of sorted) {
        if (!diverse.some((d) => d.id === prod.id)) {
          diverse.push(prod);
          if (diverse.length >= 6) break;
        }
      }
    }
    return diverse;
  }, [products]);

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
        <div className="min-h-screen bg-[#087443] text-white flex items-center justify-center p-6">
          <div className="bg-[#065D36] border border-[#D4A62A]/50 rounded-2xl px-6 py-5 text-center space-y-2 shadow-2xl">
            <div className="w-8 h-8 border-2 border-[#D4A62A] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-black uppercase tracking-wider text-[#D4A62A]">
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
    <div className="min-h-screen bg-[#F4F8F5] text-[#10251D] flex flex-col font-sans">
      <OfflineIndicator />

      {/* Toast Notification */}
      {notificationToast && (
        <div className="fixed bottom-24 sm:bottom-20 right-4 sm:right-6 z-50 bg-[#065D36] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold border-2 border-[#D4A62A]">
          <CheckCircle2 className="w-4 h-4 text-[#D4A62A]" />
          <span>{notificationToast}</span>
        </div>
      )}

      {/* Main Emerald Header */}
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
        onOpenAdvertiseModal={scrollToAdsSectionOrCeo}
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
      ) : (
        <>
          <CategoryBar
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={(catId) => {
              setSelectedCategory(catId);
              setViewingFavouritesOnly(false);
              handleStartShopping();
            }}
            onOpenBikeRiders={() => navigateToView('bike-riders')}
          />

          {/* HERO SECTION + COMPACT 11-ITEM QUICK ACCESS MENU */}
          {currentView === 'home' && !viewingFavouritesOnly && !searchQuery && (
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
              onOpenAdsSection={scrollToAdsSectionOrCeo}
              onOpenEmergencySection={scrollToEmergencySection}
            />
          )}

          {/* Active Campus Banner when an institution is selected */}
          {activeInstitution && (
            <InstitutionProfileBanner
              institution={activeInstitution}
              activeCampus={selectedCampus}
              onChangeCampus={(camp) => handleSelectInstitution(activeInstitution.id, camp, false)}
              onOpenInstitutionDirectory={() => setShowInstitutionSwitcher(true)}
              onOpenNationwideSearch={() => setShowNationwideSearch(true)}
            />
          )}

          <main className="max-w-7xl mx-auto px-4 py-6 w-full flex-1 space-y-8">
            {currentView === 'home' && !viewingFavouritesOnly && !searchQuery ? (
              /* SECTION 3D: HOMEPAGE 3-COLUMN MARKETPLACE, SELECT UNIVERSITY, TRENDING ACROSS CAMPUSES */
              <section
                ref={productCatalogRef}
                className="scroll-mt-24 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch"
              >
                {/* LEFT COLUMN: Nigeria Campus Marketplace */}
                <div className="lg:col-span-4 bg-white rounded-3xl border border-[#D9E5DF] shadow-xs p-5 flex flex-col justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 border-b border-[#F4F8F5] pb-3">
                      <div>
                        <span className="inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[#087443] text-[#D4A62A]">
                          Live Listings
                        </span>
                        <h2 className="font-display text-lg font-black text-[#10251D] mt-1">
                          Nigeria Campus Marketplace
                        </h2>
                      </div>
                      <span className="text-[11px] font-bold text-[#087443] bg-[#F4F8F5] px-2.5 py-1 rounded-lg tabular-nums">
                        {displayedProducts.length} items
                      </span>
                    </div>

                    {loading ? (
                      <div className="py-10 text-center space-y-2">
                        <div className="w-8 h-8 border-3 border-[#087443] border-t-[#D4A62A] rounded-full animate-spin mx-auto" />
                        <p className="text-xs font-semibold text-[#555555]">Loading campus products...</p>
                      </div>
                    ) : fetchError ? (
                      <div className="p-4 bg-[#F4F8F5] rounded-2xl border border-[#D9E5DF] text-center space-y-2">
                        <p className="text-xs font-bold text-[#10251D]">{fetchError}</p>
                        <button
                          type="button"
                          onClick={() => loadCatalogProducts(1, true)}
                          className="px-4 py-1.5 bg-[#087443] text-white text-xs font-black rounded-xl cursor-pointer"
                        >
                          Retry
                        </button>
                      </div>
                    ) : displayedProducts.length === 0 ? (
                      <div className="p-5 bg-[#F4F8F5] rounded-2xl border border-[#D9E5DF] text-center space-y-2.5">
                        <ShoppingBag className="w-8 h-8 text-[#087443] mx-auto" />
                        <p className="text-xs font-bold text-[#10251D]">
                          No products listed on this campus yet.
                        </p>
                        <button
                          type="button"
                          onClick={handleRequestSellModal}
                          className="px-4 py-2 bg-[#D4A62A] text-[#10251D] text-xs font-black rounded-xl cursor-pointer"
                        >
                          Post First Item
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {displayedProducts.slice(0, 4).map((prod) => {
                          const img = getProductDisplayImage(prod.images, prod.imageUrl);
                          return (
                            <div
                              key={prod.id}
                              onClick={() => setSelectedProduct(prod)}
                              className="group bg-[#F4F8F5] hover:bg-white border border-[#D9E5DF] hover:border-[#087443] rounded-2xl overflow-hidden cursor-pointer transition flex flex-col justify-between shadow-2xs hover:shadow-md"
                            >
                              <div className="aspect-[4/3] bg-white overflow-hidden relative">
                                {img ? (
                                  <img
                                    src={img}
                                    alt={prod.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[#087443]/30">
                                    <ShoppingBag className="w-7 h-7" />
                                  </div>
                                )}
                                <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-[#10251D]/85 text-[#D4A62A] text-[9px] font-black uppercase">
                                  {prod.condition}
                                </span>
                              </div>
                              <div className="p-2.5 space-y-1">
                                <h3 className="text-xs font-bold text-[#10251D] line-clamp-1">
                                  {prod.title}
                                </h3>
                                <p className="text-xs font-black text-[#087443] tabular-nums">
                                  {formatNaira(prod.price)}
                                </p>
                                <div className="flex items-center justify-between gap-1 text-[10px] text-[#555555]">
                                  <span className="truncate flex items-center gap-1">
                                    <span className="truncate">{prod.shopName || prod.sellerName}</span>
                                    <CeoVerifiedBadge
                                      verified={Boolean(prod.sellerProfile?.ceoVerified || prod.sellerProfile?.isVerified)}
                                      entityIds={[prod.sellerId]}
                                      variant="compact"
                                    />
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-[#F4F8F5]">
                    <button
                      type="button"
                      onClick={() => navigateToView('marketplace')}
                      className="flex-1 py-2.5 px-4 bg-[#087443] hover:bg-[#065D36] text-white text-xs font-black rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                    >
                      <span>View More Products</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#D4A62A]" />
                    </button>
                    <button
                      type="button"
                      onClick={handleRequestSellModal}
                      className="py-2.5 px-3 bg-[#D4A62A] hover:bg-[#E0B43B] text-[#10251D] text-xs font-black rounded-xl transition cursor-pointer"
                    >
                      Sell
                    </button>
                  </div>
                </div>

                {/* MIDDLE COLUMN: Select Your University */}
                <div className="lg:col-span-4 bg-[#10251D] text-white rounded-3xl border-b-4 border-[#D4A62A] shadow-md p-5 flex flex-col justify-between gap-4">
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[#D4A62A] text-[#10251D]">
                          National Campus Switcher
                        </span>
                        <h2 className="font-display text-lg font-black text-white mt-1 flex items-center gap-1.5">
                          <GraduationCap className="w-5 h-5 text-[#D4A62A]" />
                          <span>Select Your University</span>
                        </h2>
                      </div>
                      <span className="text-[11px] font-bold text-[#D4A62A] tabular-nums">
                        {institutions.length} Schools
                      </span>
                    </div>

                    {/* Search University Input */}
                    <div className="relative">
                      <Search className="w-4 h-4 text-[#D4A62A] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={uniSearchQuery}
                        onChange={(e) => {
                          const val = e.target.value;
                          setUniSearchQuery(val);
                          const q = val.trim().toLowerCase();
                          if (q) {
                            const firstMatch = institutions.find(
                              (i) =>
                                i.name.toLowerCase().includes(q) ||
                                i.shortName.toLowerCase().includes(q) ||
                                i.state.toLowerCase().includes(q)
                            );
                            if (firstMatch) {
                              setPickerInstitutionId(firstMatch.id);
                              setPickerCampus(firstMatch.campus);
                            }
                          }
                        }}
                        placeholder="Search university, polytechnic or state..."
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/10 border border-white/20 text-xs text-white placeholder-white/60 focus:border-[#D4A62A] outline-none"
                      />
                    </div>

                    {/* Dropdown + Explore Now */}
                    <div className="space-y-2">
                      <select
                        value={pickerInstitutionId}
                        onChange={(e) => {
                          const nextId = e.target.value;
                          setPickerInstitutionId(nextId);
                          const inst = getInstitutionById(nextId, institutions);
                          setPickerCampus(inst.campus);
                        }}
                        className="w-full px-3 py-2.5 rounded-xl bg-white text-[#10251D] text-xs font-bold border border-[#D9E5DF] outline-none cursor-pointer"
                      >
                        <option value="all">All Nigerian Universities &amp; Polytechnics</option>
                        {filteredPickerInstitutions.map((inst) => (
                          <option key={inst.id} value={inst.id}>
                            {inst.shortName} — {inst.name} ({inst.state})
                          </option>
                        ))}
                      </select>

                      {pickerInstitutionId !== 'all' &&
                        pickerInstObj.campuses &&
                        pickerInstObj.campuses.length > 1 && (
                          <select
                            value={pickerCampus}
                            onChange={(e) => setPickerCampus(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-white/95 text-[#10251D] text-xs font-semibold outline-none cursor-pointer"
                          >
                            {pickerInstObj.campuses.map((camp) => (
                              <option key={camp} value={camp}>
                                {camp}
                              </option>
                            ))}
                          </select>
                        )}

                      <button
                        type="button"
                        onClick={() => {
                          handleSelectInstitution(pickerInstitutionId, pickerCampus, true);
                          navigateToView('marketplace');
                        }}
                        className="w-full py-2.5 px-4 bg-[#D4A62A] hover:bg-[#E0B43B] text-[#10251D] text-xs font-black rounded-xl flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                      >
                        <span>Explore Now</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Popular Universities Shortcuts */}
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[10px] font-black uppercase tracking-wider text-white/75">
                        Popular Universities
                      </p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {popularUniversities.slice(0, 8).map((inst) => {
                          const isCurrent = selectedInstitutionId === inst.id;
                          return (
                            <button
                              key={inst.id}
                              type="button"
                              onClick={() => handleSelectInstitution(inst.id, inst.campus, true)}
                              className={`px-2.5 py-2 rounded-xl text-left text-[11px] font-bold transition flex items-center justify-between gap-1 cursor-pointer ${
                                isCurrent
                                  ? 'bg-[#087443] text-[#D4A62A] border border-[#D4A62A]'
                                  : 'bg-white/10 hover:bg-[#087443] text-white border border-white/10'
                              }`}
                            >
                              <span className="truncate">{inst.shortName}</span>
                              <ChevronRight className="w-3 h-3 shrink-0 opacity-75" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowInstitutionSwitcher(true)}
                    className="w-full py-2 px-3 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/15 flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#D4A62A]" />
                    <span>Browse Full Institution Directory ({institutions.length})</span>
                  </button>
                </div>

                {/* RIGHT COLUMN: Trending Across Campuses */}
                <div className="lg:col-span-4 bg-white rounded-3xl border border-[#D9E5DF] shadow-xs p-5 flex flex-col justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 border-b border-[#F4F8F5] pb-3">
                      <div>
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[#D4A62A]/20 text-[#087443]">
                          <Flame className="w-3 h-3 text-[#D4A62A]" />
                          Hot Nationwide
                        </span>
                        <h2 className="font-display text-lg font-black text-[#10251D] mt-1">
                          Trending Across Campuses
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowNationwideSearch(true)}
                        className="text-[11px] font-black text-[#087443] hover:underline cursor-pointer"
                      >
                        Search All
                      </button>
                    </div>

                    {loading ? (
                      <div className="py-10 text-center space-y-2">
                        <div className="w-8 h-8 border-3 border-[#087443] border-t-[#D4A62A] rounded-full animate-spin mx-auto" />
                        <p className="text-xs font-semibold text-[#555555]">Scanning trending campus listings...</p>
                      </div>
                    ) : trendingCrossCampusProducts.length === 0 ? (
                      <div className="p-5 bg-[#F4F8F5] rounded-2xl border border-[#D9E5DF] text-center space-y-2">
                        <Flame className="w-8 h-8 text-[#D4A62A] mx-auto" />
                        <p className="text-xs font-bold text-[#10251D]">
                          No trending campus products yet.
                        </p>
                        <p className="text-[11px] text-[#555555]">
                          Popular student items across Nigerian universities will appear here automatically.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {trendingCrossCampusProducts.slice(0, 4).map((prod) => {
                          const img = getProductDisplayImage(prod.images, prod.imageUrl);
                          const inst = getInstitutionById(
                            prod.institutionId || DEFAULT_INSTITUTION_ID,
                            institutions
                          );
                          return (
                            <div
                              key={prod.id}
                              className="p-2.5 rounded-2xl bg-[#F4F8F5] border border-[#D9E5DF] hover:border-[#087443] transition flex items-center gap-3"
                            >
                              <div
                                onClick={() => setSelectedProduct(prod)}
                                className="w-16 h-16 rounded-xl bg-white overflow-hidden shrink-0 cursor-pointer border border-[#D9E5DF]"
                              >
                                {img ? (
                                  <img
                                    src={img}
                                    alt={prod.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[#087443]/30">
                                    <ShoppingBag className="w-5 h-5" />
                                  </div>
                                )}
                              </div>

                              <div
                                onClick={() => setSelectedProduct(prod)}
                                className="min-w-0 flex-1 cursor-pointer space-y-0.5"
                              >
                                <div className="flex items-center gap-1.5">
                                  <span className="px-1.5 py-0.5 rounded bg-[#087443] text-white text-[9px] font-black uppercase truncate max-w-[90px]">
                                    {inst.shortName}
                                  </span>
                                  <span className="text-[10px] text-[#555555] flex items-center gap-0.5 tabular-nums">
                                    <Eye className="w-3 h-3 text-[#087443]" />
                                    {prod.views || 0} views
                                  </span>
                                </div>
                                <h3 className="text-xs font-bold text-[#10251D] truncate">
                                  {prod.title}
                                </h3>
                                <p className="text-xs font-black text-[#087443] tabular-nums">
                                  {formatNaira(prod.price)}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => addToCart(prod)}
                                className="px-2.5 py-2 rounded-xl bg-[#D4A62A] hover:bg-[#E0B43B] text-[#10251D] text-[11px] font-black flex items-center gap-1 shrink-0 transition cursor-pointer"
                                title="Add to Cart"
                              >
                                <ShoppingCart className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Add</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSortOption('popular');
                      navigateToView('marketplace');
                    }}
                    className="w-full py-2.5 px-4 bg-[#10251D] hover:bg-[#087443] text-white text-xs font-black rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <span>See All Trending Products</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#D4A62A]" />
                  </button>
                </div>
              </section>
            ) : (
              /* FULL FILTERABLE MARKETPLACE CATALOG VIEW */
              <section
                ref={productCatalogRef}
                className="scroll-mt-24 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start"
              >
                {/* Left Column: Campus Categories & Quick Portals */}
                <aside className="hidden lg:block lg:col-span-3 space-y-4">
                  <div className="bg-white rounded-3xl border border-[#D9E5DF] p-4 shadow-xs space-y-2.5">
                    <div className="flex items-center justify-between border-b border-[#F4F8F5] pb-2">
                      <h2 className="font-display text-sm font-black text-[#10251D]">
                        Campus Categories
                      </h2>
                      <span className="text-[11px] font-bold text-[#087443] tabular-nums">
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
                            ? 'bg-[#087443] text-white'
                            : 'hover:bg-[#F4F8F5] text-[#10251D]'
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
                                ? 'bg-[#087443] text-white'
                                : 'hover:bg-[#F4F8F5] text-[#10251D]'
                            }`}
                          >
                            <span className="flex items-center gap-2 min-w-0">
                              <span className={active ? 'text-[#D4A62A]' : 'text-[#087443]'}>
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
                  <div className="bg-[#10251D] text-white rounded-3xl p-4 border-b-4 border-[#D4A62A] space-y-2.5">
                    <p className="text-[10px] font-black uppercase tracking-wider text-[#D4A62A]">
                      Student Toolkit
                    </p>
                    <button
                      type="button"
                      onClick={() => navigateToView('gpa')}
                      className="w-full py-2.5 px-3 rounded-xl bg-[#087443] hover:bg-[#065D36] text-xs font-black flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Calculator className="w-4 h-4 text-[#D4A62A]" />
                        <span>GPA &amp; CGPA Calculator</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-[#D4A62A]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateToView('books')}
                      className="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-[#D4A62A]" />
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
                        <Gift className="w-4 h-4 text-[#D4A62A]" />
                        <span>Student Deals &amp; Giveaways</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </aside>

                {/* Center Column: Filter Header + Product Catalog */}
                <div className="lg:col-span-6 space-y-4">
                  <div className="bg-white p-4 rounded-2xl border border-[#D9E5DF] shadow-xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[#087443] text-[#D4A62A]">
                          Marketplace Feed
                        </span>
                        <h2 className="font-display text-lg font-black text-[#10251D] mt-1">
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
                        <p className="text-[11px] text-[#555555] flex items-center gap-2 tabular-nums">
                          <span>
                            Showing {visibleProducts.length} of {displayedProducts.length} listings
                          </span>
                          {isRefreshing && (
                            <span className="text-[10px] font-bold text-[#087443] animate-pulse">
                              Syncing...
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <select
                          value={selectedState}
                          onChange={(e) => setSelectedState(e.target.value)}
                          className="bg-[#F4F8F5] border border-[#D9E5DF] px-2.5 py-1.5 rounded-xl text-xs font-bold text-[#10251D] outline-none"
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
                          className="bg-[#F4F8F5] border border-[#D9E5DF] text-xs font-bold text-[#10251D] py-1.5 px-2.5 rounded-xl outline-none"
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
                            className="px-2.5 py-1.5 text-xs bg-[#10251D] text-white rounded-xl font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <X className="w-3 h-3 text-[#D4A62A]" />
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Condition & Price Presets */}
                    <div className="pt-2.5 border-t border-[#F4F8F5] flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1 bg-[#F4F8F5] p-0.5 rounded-xl border border-[#D9E5DF]">
                        {(['all', 'new', 'used'] as const).map((cond) => (
                          <button
                            key={cond}
                            type="button"
                            onClick={() => setConditionFilter(cond)}
                            className={`px-2.5 py-1 rounded-lg font-bold capitalize transition cursor-pointer ${
                              conditionFilter === cond
                                ? 'bg-[#087443] text-[#D4A62A]'
                                : 'text-[#555555] hover:text-[#10251D]'
                            }`}
                          >
                            {cond}
                          </button>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-[#087443]" />
                        {PRICE_PRESETS.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => handleSelectPricePreset(preset)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                              activePricePreset === preset.id
                                ? 'bg-[#D4A62A] border-[#D4A62A] text-[#10251D] font-black'
                                : 'bg-[#F4F8F5] border-[#D9E5DF] text-[#333333] hover:border-[#087443]'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Product Grid */}
                  {loading ? (
                    <div className="py-14 text-center bg-white rounded-3xl border border-[#D9E5DF]">
                      <div className="w-10 h-10 border-4 border-[#087443] border-t-[#D4A62A] rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-xs font-bold text-[#555555]">
                        Loading genuine NIGERIA CAMPUS MARKET listings...
                      </p>
                    </div>
                  ) : fetchError ? (
                    <div className="bg-white rounded-3xl p-8 text-center border border-[#D9E5DF] shadow-xs">
                      <ShoppingBag className="w-10 h-10 text-[#087443] mx-auto mb-3" />
                      <h3 className="text-base font-black text-[#10251D]">
                        Unable to load listings right now
                      </h3>
                      <p className="text-xs text-[#555555] mt-1 mb-4 break-words">{fetchError}</p>
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => loadCatalogProducts(1, true)}
                          className="px-4 py-2 bg-[#087443] text-white text-xs font-black rounded-xl"
                        >
                          Retry
                        </button>
                        <button
                          type="button"
                          onClick={handleRequestSellModal}
                          className="px-4 py-2 bg-[#D4A62A] text-[#10251D] text-xs font-black rounded-xl"
                        >
                          Post Item
                        </button>
                      </div>
                    </div>
                  ) : displayedProducts.length === 0 ? (
                    <div className="bg-white rounded-3xl p-8 text-center border border-[#D9E5DF] shadow-xs">
                      <ShoppingBag className="w-10 h-10 text-[#087443] mx-auto mb-3" />
                      <h3 className="text-base font-black text-[#10251D]">
                        {viewingFavouritesOnly
                          ? 'No saved favourites yet'
                          : 'No listings yet for this filter'}
                      </h3>
                      <p className="text-xs text-[#555555] mt-1 mb-4">
                        {hasActiveFilters
                          ? 'Try clearing your search, category, or switching to All Institutions.'
                          : 'Be the first to list textbooks, phones, fashion, or hostel items.'}
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={handleRequestSellModal}
                          className="px-4 py-2 bg-[#D4A62A] text-[#10251D] text-xs font-black rounded-xl"
                        >
                          Start Selling
                        </button>
                        {hasActiveFilters && (
                          <button
                            type="button"
                            onClick={resetAllFilters}
                            className="px-4 py-2 bg-[#F4F8F5] border border-[#D9E5DF] text-[#10251D] text-xs font-bold rounded-xl"
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
                            className="px-5 py-2.5 bg-white border border-[#D9E5DF] hover:border-[#087443] text-[#087443] text-xs font-black rounded-xl shadow-xs transition cursor-pointer"
                          >
                            Load More Products ({displayedProducts.length - visibleProducts.length} left)
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Right Column: EXPLORE UNIVERSITIES + Student Requests Preview */}
                <aside className="lg:col-span-3 space-y-4">
                  <div className="bg-white rounded-3xl border border-[#D9E5DF] p-4 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="font-display text-sm font-black text-[#10251D] flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4 text-[#087443]" />
                        <span>EXPLORE UNIVERSITIES</span>
                      </h2>
                    </div>
                    <p className="text-[11px] text-[#555555]">
                      Pick any Nigerian university, polytechnic, or college to explore its local campus market.
                    </p>
                    <div className="space-y-1.5">
                      {institutions.slice(0, 6).map((inst) => {
                        const active = selectedInstitutionId === inst.id;
                        return (
                          <button
                            key={inst.id}
                            type="button"
                            onClick={() => handleSelectInstitution(inst.id, inst.campus)}
                            className={`w-full text-left px-3 py-2 rounded-xl border text-xs transition flex items-center justify-between cursor-pointer ${
                              active
                                ? 'bg-[#087443] border-[#087443] text-white font-black'
                                : 'bg-[#F4F8F5] border-[#D9E5DF] hover:border-[#087443] text-[#10251D] font-bold'
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="truncate">{inst.shortName}</p>
                              <p className={`text-[10px] truncate ${active ? 'text-[#D4A62A]' : 'text-[#555555]'}`}>
                                {inst.state} State
                              </p>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowInstitutionSwitcher(true)}
                      className="w-full py-2 rounded-xl bg-[#D4A62A] hover:bg-[#E0B43B] text-[#10251D] text-xs font-black transition cursor-pointer"
                    >
                      Browse All Institutions ({institutions.length})
                    </button>
                  </div>

                  {/* Live What Students Need Mini Feed */}
                  <div className="bg-white rounded-3xl border border-[#D9E5DF] p-4 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-sm font-black text-[#10251D] flex items-center gap-1.5">
                        <HelpCircle className="w-4 h-4 text-[#087443]" />
                        <span>What Students Need</span>
                      </h3>
                      <button
                        type="button"
                        onClick={() => navigateToView('requests')}
                        className="text-[11px] font-black text-[#087443] hover:underline cursor-pointer"
                      >
                        View All
                      </button>
                    </div>
                    {latestRequests.length === 0 ? (
                      <p className="text-[11px] text-[#555555]">
                        No open student requests on this campus yet.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {latestRequests.map((req) => (
                          <button
                            key={req.id}
                            type="button"
                            onClick={() => navigateToView('requests')}
                            className="w-full text-left p-2.5 rounded-xl bg-[#F4F8F5] border border-[#D9E5DF] hover:border-[#087443] transition space-y-1 cursor-pointer"
                          >
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="font-black text-[#087443] tabular-nums">
                                Budget: {formatNaira(req.budget)}
                              </span>
                              <span className="uppercase font-bold text-[#555555]">{req.status}</span>
                            </div>
                            <p className="text-xs font-bold text-[#10251D] line-clamp-1">{req.title}</p>
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => navigateToView('requests')}
                      className="w-full py-2 rounded-xl bg-[#087443] hover:bg-[#065D36] text-white text-xs font-black transition cursor-pointer"
                    >
                      Post Request for Sellers
                    </button>
                  </div>
                </aside>
              </section>
            )}

            {/* LOWER HOMEPAGE SECTIONS (Shown on Home View) */}
            {currentView === 'home' && !viewingFavouritesOnly && (
              <>
                {/* SECTION 3E: STUDENT SERVICES — 8 COMPACT CARDS IN HORIZONTAL ROW */}
                <section className="bg-white border border-[#D9E5DF] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[#087443] text-[#D4A62A]">
                        Student Services
                      </span>
                      <h2 className="font-display text-lg sm:text-xl font-black text-[#10251D] mt-1">
                        Everything Campus Life Requires
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={scrollToServicesSection}
                      className="text-xs font-black text-[#087443] hover:underline inline-flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                    >
                      <span>Browse Service Providers</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
                    {[
                      {
                        label: 'Accommodation and Hostels',
                        icon: Home,
                        onClick: () => navigateToView('hux')
                      },
                      {
                        label: 'Jobs and Internships',
                        icon: Briefcase,
                        onClick: () => navigateToView('jobs')
                      },
                      {
                        label: 'Events and Announcements',
                        icon: Info,
                        onClick: scrollToEventsSection
                      },
                      {
                        label: 'Books and Study Materials',
                        icon: BookOpen,
                        onClick: () => navigateToView('books')
                      },
                      {
                        label: 'Campus Food Ordering',
                        icon: Utensils,
                        onClick: () => navigateToView('food')
                      },
                      {
                        label: 'Lost and Found',
                        icon: HelpCircle,
                        onClick: () => setShowLostAndFoundModal(true)
                      },
                      {
                        label: 'Student Deals',
                        icon: Gift,
                        onClick: () => navigateToView('deals')
                      },
                      {
                        label: 'Referral Rewards',
                        icon: Trophy,
                        onClick: () => navigateToView('referrals')
                      }
                    ].map((svcCard) => {
                      const IconComp = svcCard.icon;
                      return (
                        <button
                          key={svcCard.label}
                          type="button"
                          onClick={svcCard.onClick}
                          className="group p-3 rounded-2xl bg-[#F4F8F5] hover:bg-[#087443] border border-[#D9E5DF] hover:border-[#087443] text-left transition flex flex-col items-start justify-between gap-2.5 cursor-pointer"
                        >
                          <div className="w-9 h-9 rounded-xl bg-white group-hover:bg-[#D4A62A] text-[#087443] group-hover:text-[#10251D] flex items-center justify-center shadow-2xs transition">
                            <IconComp className="w-4 h-4" />
                          </div>
                          <span className="text-[11px] font-bold text-[#10251D] group-hover:text-white leading-snug">
                            {svcCard.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* LOWER SECTION 1: Student Services Directory */}
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

                {/* LOWER SECTION 2: Popular Accommodation */}
                <section className="bg-white border border-[#D9E5DF] rounded-3xl p-5 sm:p-6 space-y-5 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <span className="inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[#087443] text-[#D4A62A]">
                        Popular Accommodation
                      </span>
                      <h2 className="font-display text-lg sm:text-xl font-black text-[#10251D] flex items-center gap-2 mt-1">
                        <Home className="w-5 h-5 text-[#087443]" />
                        <span>Campus Hostels, Lodges &amp; House Agents</span>
                      </h2>
                      <p className="text-xs text-[#555555] mt-0.5">
                        Inspect hostels physically with verified agents before paying around{' '}
                        {activeInstitution?.shortName || 'Nigerian campuses'}.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigateToView('hux')}
                      className="px-4 py-2.5 bg-[#087443] hover:bg-[#065D36] text-white font-black text-xs rounded-xl flex items-center gap-1.5 self-start sm:self-auto transition shrink-0 cursor-pointer"
                    >
                      <span>View All Hostels</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#D4A62A]" />
                    </button>
                  </div>

                  {latestAccommodation.length === 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-[#F4F8F5] border border-[#D9E5DF] rounded-2xl overflow-hidden">
                      <img
                        src={campusHostelShowcaseImg}
                        alt="Nigerian campus student lodge"
                        className="md:col-span-4 w-full h-44 md:h-full object-cover"
                      />
                      <div className="md:col-span-8 p-5 flex flex-col justify-center space-y-2">
                        <h3 className="text-sm sm:text-base font-black text-[#10251D]">
                          List or Inspect Student Lodges &amp; Self-Contains
                        </h3>
                        <p className="text-xs text-[#555555]">
                          No vacant lodges listed on this campus filter yet. Verified house agents and students seeking roommates can list properties for free and schedule physical inspections.
                        </p>
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => navigateToView('hux')}
                            className="px-4 py-2 bg-[#D4A62A] text-[#10251D] font-black text-xs rounded-xl cursor-pointer"
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
                          className="bg-[#F4F8F5] border border-[#D9E5DF] hover:border-[#087443] rounded-2xl overflow-hidden cursor-pointer transition flex flex-col"
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
                                <span className="font-black text-[#087443]">{hux.type}</span>
                                <span className="text-[#555555] truncate">{hux.location}</span>
                              </div>
                              <h3 className="text-sm font-bold text-[#10251D] line-clamp-1 mt-1">
                                {hux.title}
                              </h3>
                            </div>
                            <div className="pt-2 border-t border-[#D9E5DF] flex items-center justify-between">
                              <span className="px-2 py-0.5 rounded bg-[#087443] text-[#D4A62A] text-sm font-black tabular-nums">
                                {formatNaira(hux.price)}
                                <span className="text-[10px] text-white font-normal">/{hux.pricePer}</span>
                              </span>
                              <span className="text-xs font-black text-[#087443]">Book Inspection →</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* LOWER SECTION 3: Popular Campus Food Vendors */}
                <section className="bg-white border border-[#D9E5DF] rounded-3xl p-5 sm:p-6 space-y-5 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <span className="inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[#087443] text-[#D4A62A]">
                        Campus Food Ordering &amp; Delivery
                      </span>
                      <h2 className="font-display text-lg sm:text-xl font-black text-[#10251D] flex items-center gap-2 mt-1">
                        <Utensils className="w-5 h-5 text-[#087443]" />
                        <span>Popular Campus Food Vendors</span>
                      </h2>
                      <p className="text-xs text-[#555555] mt-0.5">
                        Order Jollof Rice, Shawarma, Suya, Grills, Small Chops &amp; Drinks delivered straight to your hostel or gate.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigateToView('food')}
                      className="px-4 py-2.5 bg-[#D4A62A] hover:bg-[#E0B43B] text-[#10251D] font-black text-xs rounded-xl flex items-center gap-1.5 self-start sm:self-auto transition shrink-0 cursor-pointer"
                    >
                      <Utensils className="w-4 h-4" />
                      <span>Order Campus Food</span>
                    </button>
                  </div>

                  {latestFoodVendors.length === 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-[#F4F8F5] border border-[#D9E5DF] rounded-2xl overflow-hidden">
                      <img
                        src={campusFoodShowcaseImg}
                        alt="Campus kitchen Jollof rice and grilled chicken"
                        className="md:col-span-4 w-full h-44 md:h-full object-cover"
                      />
                      <div className="md:col-span-8 p-5 flex flex-col justify-center space-y-2">
                        <h3 className="text-sm sm:text-base font-black text-[#10251D]">
                          Campus Kitchens, Bukas, Fast Food &amp; Delivery Riders
                        </h3>
                        <p className="text-xs text-[#555555]">
                          Register your campus food spot, publish menus with photos, accept online or eligible cash-on-delivery orders, or sign up as a student dispatch rider.
                        </p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => navigateToView('food')}
                            className="px-4 py-2 bg-[#087443] text-white font-black text-xs rounded-xl cursor-pointer"
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
                          className="bg-[#F4F8F5] border border-[#D9E5DF] hover:border-[#087443] rounded-2xl overflow-hidden cursor-pointer transition flex flex-col"
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
                              <span className="font-black text-sm text-[#10251D] truncate flex items-center gap-1.5">
                                <ChefHat className="w-4 h-4 text-[#087443] shrink-0" />
                                {vendor.vendorName}
                              </span>
                              <CeoVerifiedBadge verified={Boolean(vendor.ceoVerified)} variant="compact" />
                            </div>
                            <p className="text-[11px] text-[#555555] line-clamp-1">
                              {vendor.location} • {vendor.openingHours}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* LOWER SECTION 4: Trending Products & Live Campus Leaderboards */}
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

                {/* LOWER SECTION 5: Explore Universities */}
                <InstitutionDirectorySection
                  institutions={institutions}
                  selectedInstitutionId={selectedInstitutionId}
                  selectedCampus={selectedCampus}
                  onSelectInstitution={(id, campus) => handleSelectInstitution(id, campus, true)}
                  onOpenFullModal={() => setShowInstitutionSwitcher(true)}
                />

                {/* LOWER SECTION 6: Trusted Sellers, Community Hub & Campus Updates */}
                <div className="space-y-6">
                  <FuMarketAdsSection
                    ads={activePublicAds}
                    loading={adsLoading}
                    selectedInstitutionId={selectedInstitutionId}
                    activeInstitutionName={activeInstitution?.shortName || 'All Nigerian Campuses'}
                    onOpenSubmitModal={scrollToAdsSectionOrCeo}
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

                  <SportAndAnnouncementsSection
                    sportUpdates={sportUpdates}
                    generalAnnouncements={generalAnnouncements}
                    loading={announcementsLoading}
                    savedIds={savedAnnouncementIds}
                    selectedInstitutionId={selectedInstitutionId}
                    activeInstitution={activeInstitution}
                    institutions={institutions}
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
                </div>

                {/* LOWER SECTION 7: Safety & Protection */}
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
                    setAdminInitialTab('emergency');
                    setShowAdminDashboard(true);
                  }}
                />

                {/* LOWER SECTION 8: Compact GPA & CGPA Calculator Teaser Card */}
                <section className="bg-white border-2 border-[#087443]/25 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#087443] text-[#D4A62A] flex items-center justify-center shrink-0 shadow-sm">
                      <Calculator className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <span className="inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[#F4F8F5] text-[#087443] border border-[#087443]/25">
                        Free Academic Tool
                      </span>
                      <h2 className="font-display text-lg sm:text-xl font-black text-[#10251D]">
                        🎓 GPA &amp; CGPA Calculator
                      </h2>
                      <p className="text-xs text-[#555555] max-w-2xl">
                        Compute semester GPA &amp; cumulative CGPA free without login on 5.0, 4.0, or custom grading scales — includes Target CGPA Predictor, Performance Chart, and PDF/CSV export.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigateToView('gpa')}
                    className="px-5 py-3 bg-[#087443] hover:bg-[#065D36] text-white font-black text-xs sm:text-sm rounded-xl flex items-center gap-2 shrink-0 shadow-sm transition cursor-pointer"
                  >
                    <Calculator className="w-4 h-4 text-[#D4A62A]" />
                    <span>Open GPA Calculator</span>
                  </button>
                </section>

                {/* SECTION 3F: TRUST & COMMUNITY SECTION (2 SIDE-BY-SIDE CARDS) */}
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                  {/* LEFT CARD: YOUR SAFETY, OUR PRIORITY */}
                  <div className="bg-[#10251D] text-white rounded-3xl p-6 sm:p-7 border-b-4 border-[#D4A62A] shadow-md flex flex-col justify-between gap-5">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded bg-[#087443] text-[#D4A62A]">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Campus Trust Charter
                        </span>
                      </div>
                      <h2 className="font-display text-2xl font-black text-white tracking-tight">
                        YOUR SAFETY, OUR PRIORITY
                      </h2>
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
                            <CheckCircle2 className="w-4 h-4 text-[#D4A62A] shrink-0" />
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
                        className="px-4 py-2.5 bg-[#D4A62A] hover:bg-[#E0B43B] text-[#10251D] font-black text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
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

                  {/* RIGHT CARD: JOIN OUR GROWING COMMUNITY */}
                  <div className="bg-white border border-[#D9E5DF] rounded-3xl overflow-hidden shadow-xs flex flex-col justify-between">
                    <div className="grid grid-cols-1 sm:grid-cols-12 flex-1">
                      <div className="sm:col-span-5 relative min-h-[180px] bg-[#087443]/10">
                        <img
                          src={campusCommunityShowcaseImg}
                          alt="Nigerian students connecting across campuses on NIGERIA CAMPUS MARKET"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="sm:col-span-7 p-6 flex flex-col justify-between gap-4">
                        <div className="space-y-3">
                          <span className="inline-block text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded bg-[#087443] text-[#D4A62A]">
                            Nationwide Network
                          </span>
                          <h2 className="font-display text-2xl font-black text-[#10251D] tracking-tight">
                            JOIN OUR GROWING COMMUNITY
                          </h2>
                          <ul className="space-y-2 text-xs font-bold text-[#10251D]">
                            {[
                              'Connect with students across Nigeria',
                              'Discover other universities',
                              'Create an account for free'
                            ].map((item) => (
                              <li key={item} className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-[#087443] shrink-0" />
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
                            className="px-5 py-2.5 bg-[#087443] hover:bg-[#065D36] text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                          >
                            <span>{user ? 'Open Single Hub' : 'Join Nigeria Campus Market'}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-[#D4A62A]" />
                          </button>
                          <button
                            type="button"
                            onClick={handleRequestSellModal}
                            className="px-4 py-2.5 bg-[#F4F8F5] hover:bg-[#D4A62A]/20 border border-[#D9E5DF] text-[#10251D] font-bold text-xs rounded-xl transition cursor-pointer"
                          >
                            Start Selling
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Quick Portal & App Install Footer Strip */}
                    <div
                      ref={downloadAppRef}
                      id="download-wukarimart"
                      className="bg-[#F4F8F5] border-t border-[#D9E5DF] px-5 py-3 flex flex-wrap items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 text-xs font-bold text-[#10251D]">
                        <Smartphone className="w-4 h-4 text-[#087443]" />
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
                          className="px-3 py-1.5 bg-white border border-[#D9E5DF] hover:border-[#087443] text-[#10251D] text-[11px] font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <MessageSquare className="w-3 h-3 text-[#087443]" />
                          <span>Messages</span>
                        </button>
                        {isInstalled ? (
                          <span className="inline-flex px-3 py-1.5 bg-[#087443] text-[#D4A62A] font-black text-[11px] rounded-lg items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
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
                            className="px-3 py-1.5 bg-[#087443] hover:bg-[#065D36] text-white font-black text-[11px] rounded-lg flex items-center gap-1 cursor-pointer"
                          >
                            <Download className="w-3 h-3 text-[#D4A62A]" />
                            <span>Install App</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              </>
            )}
          </main>

          {/* Big Gold Floating "Post Item for FREE" Button */}
          <button
            type="button"
            onClick={handleRequestSellModal}
            className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-30 bg-[#D4A62A] hover:bg-[#E0B43B] text-[#10251D] font-black text-xs sm:text-sm px-5 py-3.5 rounded-full shadow-2xl border-2 border-[#065D36] flex items-center gap-2 active:scale-95 transition cursor-pointer"
          >
            <PlusCircle className="w-5 h-5 text-[#065D36]" />
            <span>Post Item for FREE</span>
          </button>

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
            onOpenAdvertiseModal={scrollToAdsSectionOrCeo}
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

      {showAdminDashboard && (
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
          onAdvertiseNow={scrollToAdsSectionOrCeo}
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
