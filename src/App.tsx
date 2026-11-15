import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  ShieldCheck,
  Grid,
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
  SlidersHorizontal
} from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import {
  Product,
  Category,
  ProductFilter,
  StudentRequest,
  HuxListing,
  CartItem,
  CampusEvent,
  SportUpdatePost,
  GeneralAnnouncementPost,
  CommunityAnnouncementPost,
  PostCollectionName,
  AdPackageId,
  Advertisement,
  ServiceCategory,
  ServiceListing,
  EmergencyContact,
  SafetyAnnouncement,
  LostFoundItem,
  EmergencyReportKind,
  CeoSessionState
} from './types.js';
import { fetchProducts, fetchCategories } from './services/api.js';
import { Header } from './components/Header.js';
import { NIGERIA_STATES } from './constants/states.js';
import { DEFAULT_CATEGORIES } from './constants/categories.js';
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
import { CartOrderReviewModal } from './components/CartOrderReviewModal.js';
import { BottomNav, AppView } from './components/BottomNav.js';
import { OfflineIndicator } from './components/OfflineIndicator.js';
import { WelcomeNotice } from './components/WelcomeNotice.js';
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
import { AdvertiseBusinessModal } from './components/AdvertiseBusinessModal.js';
import { AdDetailModal } from './components/AdDetailModal.js';
import { CeoMasterControlModal } from './components/CeoMasterControlModal.js';
import {
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
import { usePWAInstall } from './hooks/usePWAInstall.js';
import {
  auth,
  subscribeToFriendRequests,
  subscribeToStudentRequests,
  subscribeToHuxListings,
  ensureGuestAuth,
  getCachedProductsSnapshot,
  invalidateProductsCache
} from './services/firebase.js';
import { CeoLoginPage } from './components/CeoLoginPage.js';
import { CeoSuperAdminDashboard } from './components/CeoSuperAdminDashboard.js';
import {
  getStoredCeoSession,
  isAuthorizedCeoEmail,
  logUnauthorizedCeoAccess,
  saveCeoSession
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

function resolveViewFromPath(): AppView {
  if (typeof window === 'undefined') return 'marketplace';
  const path = window.location.pathname.toLowerCase();
  if (path.startsWith('/requests') || path.includes('requests.html')) return 'requests';
  if (path.startsWith('/hub') || path.includes('hub.html')) return 'hub';
  if (path.startsWith('/friends') || path.includes('friends.html')) return 'friends';
  if (path.startsWith('/hux') || path.includes('hux.html')) return 'hux';
  if (path.startsWith('/bike-riders') || path.includes('bike-riders.html')) return 'bike-riders';
  return 'marketplace';
}

type CeoRouteMode = 'marketplace' | 'ceo-login' | 'ceo-admin';

function resolveCeoRouteFromPath(): CeoRouteMode {
  if (typeof window === 'undefined') return 'marketplace';
  const path = window.location.pathname.toLowerCase().replace(/\/+$/, '');
  if (path === '/ceo-login' || path.startsWith('/ceo-login/')) return 'ceo-login';
  if (path === '/ceo-admin' || path.startsWith('/ceo-admin/')) return 'ceo-admin';
  return 'marketplace';
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

function MainMarketplace() {
  const { user, favourites } = useAuth();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  // Private CEO Route & Session State
  const [ceoRouteMode, setCeoRouteMode] = useState<CeoRouteMode>(() => resolveCeoRouteFromPath());
  const [ceoSession, setCeoSession] = useState<CeoSessionState | null>(() => getStoredCeoSession());
  const [ceoLoginNotice, setCeoLoginNotice] = useState<string | null>(null);
  const [firebaseAuthChecked, setFirebaseAuthChecked] = useState<boolean>(() =>
    Boolean(auth.currentUser)
  );
  const unauthorizedCeoLogRef = useRef<string | null>(null);

  // Multi-page route state
  const [currentView, setCurrentView] = useState<AppView>(() => resolveViewFromPath());
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);
  const [directChatTarget, setDirectChatTarget] = useState<DirectChatTarget | null>(null);

  // Cart state persisted in localStorage
  const [cartItems, setCartItems] = useState<CartItem[]>(() => loadCartFromStorage());
  const [showCartModal, setShowCartModal] = useState<boolean>(false);

  // Live previews for homepage sections
  const [latestRequests, setLatestRequests] = useState<StudentRequest[]>([]);
  const [latestAccommodation, setLatestAccommodation] = useState<HuxListing[]>([]);

  // FU MARKET Birthday & Events Announcement Centre state (publicly visible without login)
  const [campusEvents, setCampusEvents] = useState<CampusEvent[]>(() => getCachedPublishedEvents());
  const [eventsLoading, setEventsLoading] = useState<boolean>(
    () => getCachedPublishedEvents().length === 0
  );
  const [selectedEvent, setSelectedEvent] = useState<CampusEvent | null>(null);
  const [showCeoEventsModal, setShowCeoEventsModal] = useState<boolean>(false);

  // FU SPORT UPDATE & ANNOUNCEMENT CENTRE state (public feed + authenticated interactions)
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

  // FU MARKET ADS & CEO MASTER CONTROL state
  const [activePublicAds, setActivePublicAds] = useState<Advertisement[]>(() =>
    getCachedActivePublicAds()
  );
  const [adsLoading, setAdsLoading] = useState<boolean>(
    () => getCachedActivePublicAds().length === 0
  );
  const [selectedAd, setSelectedAd] = useState<Advertisement | null>(null);
  const [advertiseModalState, setAdvertiseModalState] = useState<{
    open: boolean;
    packageId: AdPackageId;
  }>({ open: false, packageId: 'basic' });
  const [showCeoMasterControl, setShowCeoMasterControl] = useState<boolean>(false);

  // FU MARKET STUDENT SERVICES MARKETPLACE state
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

  // FU MARKET CAMPUS EMERGENCY & HELP CENTRE state
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

  // PWA guidance banner toggle
  const [showPWAInstructions, setShowPWAInstructions] = useState(false);

  // Welcome notice shown on open (non-blocking and dismissible)
  const [showWelcomeNotice, setShowWelcomeNotice] = useState(true);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch {
      // ignore storage quota errors
    }
  }, [cartItems]);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentView(resolveViewFromPath());
      setCeoRouteMode(resolveCeoRouteFromPath());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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
      setCeoLoginNotice('Access denied. Authorized FU MARKET CEO login is required.');
    }
  }, [firebaseAuthChecked, ceoRouteMode, isCeoRouteAuthorized, ceoSession, user?.email]);

  // Load & subscribe publicly to homepage Firestore feeds (staggered to keep initial handshake fast)
  useEffect(() => {
    let active = true;
    const unsubs: (() => void)[] = [];

    // Priority 1 (0ms): Above-the-fold events & paid campus ads
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

    // Handle direct ?event=<id> and ?post=<id>&type=<collection> share URLs
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

    // Priority 2 (~250ms): Sports, Announcements & Services Marketplace
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

    // Priority 3 (~450ms): Campus Emergency & Help Centre public subscriptions
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

  // Keep saved announcement bookmarks synced for the current signed-in user
  useEffect(() => {
    const unsubSaved = subscribeToSavedAnnouncementIds((ids) => {
      setSavedAnnouncementIds(ids);
    });
    return () => unsubSaved();
  }, [user?.id]);

  // Listen for incoming friend requests & defer non-critical homepage previews so catalog loads first
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
    const previewTimer = setTimeout(() => {
      unsubStudentReqs = subscribeToStudentRequests((list) => {
        setLatestRequests(list.slice(0, 3));
      });

      unsubHux = subscribeToHuxListings('all', (list) => {
        setLatestAccommodation(list.filter((l) => l.isAvailable !== false).slice(0, 3));
      });
    }, 600);

    return () => {
      clearTimeout(previewTimer);
      unsubReq();
      unsubStudentReqs();
      unsubHux();
    };
  }, [user?.id]);

  const navigateCeoRoute = (mode: CeoRouteMode, notice?: string | null) => {
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
    const targetPath =
      view === 'requests'
        ? '/requests.html'
        : view === 'hub'
        ? '/hub.html'
        : view === 'friends'
        ? '/friends.html'
        : view === 'hux'
        ? '/hux.html'
        : view === 'bike-riders'
        ? '/bike-riders.html'
        : '/';

    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToServicesSection = () => {
    if (currentView !== 'marketplace') {
      navigateToView('marketplace');
    }
    setViewingFavouritesOnly(false);
    setTimeout(() => {
      document.getElementById('fu-market-services')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 120);
  };

  const scrollToEmergencySection = () => {
    if (currentView !== 'marketplace') {
      navigateToView('marketplace');
    }
    setViewingFavouritesOnly(false);
    setTimeout(() => {
      document.getElementById('fu-market-campus-emergency')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 120);
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

  // Data states (hydrate instantly from cache if available)
  const initialCachedProducts = useRef<Product[] | null>(getCachedProductsSnapshot());
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [products, setProducts] = useState<Product[]>(() => initialCachedProducts.current || []);
  const [loading, setLoading] = useState<boolean>(() => !(initialCachedProducts.current && initialCachedProducts.current.length > 0));
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [visibleCount, setVisibleCount] = useState<number>(16);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [pagination, setPagination] = useState(() => ({
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
  const downloadAppRef = useRef<HTMLElement>(null);

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
    showToast('Product published on FU MARKET!');

    setTimeout(() => {
      if (productCatalogRef.current) {
        productCatalogRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 300);
  };

  const loadCategories = async () => {
    try {
      const data = await fetchCategories();
      if (Array.isArray(data) && data.length > 0) {
        setCategories(data);
      }
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  const loadCatalogProducts = async (page = 1, forceRefresh = false) => {
    const requestId = ++catalogRequestIdRef.current;
    const minVal = minPrice !== '' && !isNaN(Number(minPrice)) ? Number(minPrice) : undefined;
    const maxVal = maxPrice !== '' && !isNaN(Number(maxPrice)) ? Number(maxPrice) : undefined;

    // Instant cached display when switching categories/filters so UI updates with 0ms delay
    const cachedSlice = !forceRefresh
      ? getCachedProductsSnapshot({
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
    setVisibleCount(16);
    loadCatalogProducts(1);
  }, [selectedCategory, selectedState, searchQuery, conditionFilter, minPrice, maxPrice, sortOption]);

  const handleSelectPricePreset = (preset: PricePreset) => {
    setActivePricePreset(preset.id);
    setMinPrice(preset.min !== undefined && preset.min > 0 ? String(preset.min) : '');
    setMaxPrice(preset.max !== undefined ? String(preset.max) : '');
  };

  const handleStartShopping = () => {
    if (productCatalogRef.current) {
      productCatalogRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleTriggerPWAHelp = () => {
    setShowPWAInstructions(true);
    if (currentView !== 'marketplace') {
      navigateToView('marketplace');
      setTimeout(() => {
        downloadAppRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 250);
    } else {
      downloadAppRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
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
          setVisibleCount((prev) => prev + 16);
        }
      },
      { rootMargin: '250px' }
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMoreProducts, visibleProducts.length]);

  const totalCartItems = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  if (ceoRouteMode === 'ceo-admin') {
    if (!firebaseAuthChecked) {
      return (
        <div className="min-h-screen bg-[#0B6B3A] text-white flex items-center justify-center p-6">
          <div className="bg-[#14532D] border border-[#F2B90D]/50 rounded-2xl px-6 py-5 text-center space-y-2 shadow-2xl">
            <div className="w-8 h-8 border-2 border-[#F2B90D] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-black uppercase tracking-wider text-[#F2B90D]">
              Verifying FU MARKET CEO Session...
            </p>
          </div>
        </div>
      );
    }
    if (isCeoRouteAuthorized && ceoSession) {
      return (
        <CeoSuperAdminDashboard
          session={ceoSession}
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
            navigateCeoRoute('ceo-login', 'Signed out of FU MARKET CEO SUPER ADMINISTRATOR.');
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
        initialNotice={ceoLoginNotice || 'Access denied. Authorized FU MARKET CEO login is required.'}
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

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#111111] flex flex-col font-sans">
      <OfflineIndicator />

      {/* Toast Notification */}
      {notificationToast && (
        <div className="fixed bottom-24 sm:bottom-20 right-4 sm:right-6 z-50 bg-[#14532D] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold border-2 border-[#F2B90D]">
          <CheckCircle2 className="w-4 h-4 text-[#F2B90D]" />
          <span>{notificationToast}</span>
        </div>
      )}

      {/* Main Green Header */}
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
        onOpenAdvertiseModal={() =>
          setAdvertiseModalState({ open: true, packageId: 'basic' })
        }
        onOpenServicesSection={scrollToServicesSection}
        onOpenEmergencySection={scrollToEmergencySection}
        onOpenFavourites={() => {
          if (currentView !== 'marketplace') navigateToView('marketplace');
          setViewingFavouritesOnly(!viewingFavouritesOnly);
        }}
        onOpenSafetyModal={() => setShowSafetyModal(true)}
        onOpenCart={() => setShowCartModal(true)}
        cartCount={totalCartItems}
        onNavigateView={navigateToView}
        onTriggerPWAHelp={handleTriggerPWAHelp}
        activeView={currentView}
      />

      {showWelcomeNotice && (
        <WelcomeNotice onDismiss={() => setShowWelcomeNotice(false)} />
      )}

      {currentView === 'requests' ? (
        <WhatStudentsNeedPage
          onBackToHome={() => navigateToView('marketplace')}
          onStartDirectChat={handleStartDirectChat}
        />
      ) : currentView === 'hub' ? (
        <SingleHubPage
          onBackToHome={() => navigateToView('marketplace')}
          onNavigateToFriends={() => navigateToView('friends')}
          onStartDirectChat={handleStartDirectChat}
        />
      ) : currentView === 'friends' ? (
        <FriendsPage
          onBackToHome={() => navigateToView('marketplace')}
          onNavigateToHub={() => navigateToView('hub')}
          initialChatTarget={directChatTarget}
          onClearChatTarget={() => setDirectChatTarget(null)}
        />
      ) : currentView === 'hux' ? (
        <HuxPage
          onBackToHome={() => navigateToView('marketplace')}
          onStartDirectChat={handleStartDirectChat}
        />
      ) : currentView === 'bike-riders' ? (
        <BikeRidersPage onBackToMarketplace={() => navigateToView('marketplace')} />
      ) : (
        <>
          <CategoryBar
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={(catId) => {
              setSelectedCategory(catId);
              setViewingFavouritesOnly(false);
            }}
            onOpenBikeRiders={() => navigateToView('bike-riders')}
          />

          {/* SECTION 1: Hero Banner */}
          {!viewingFavouritesOnly && !searchQuery && (
            <HeroBanner
              searchQuery={searchQuery}
              onSearchSubmit={setSearchQuery}
              onStartShopping={handleStartShopping}
              onOpenSellModal={handleRequestSellModal}
              onNavigateView={navigateToView}
            />
          )}

          {/* Main Marketplace Content */}
          <main className="max-w-7xl mx-auto px-4 py-6 w-full flex-1 space-y-8">
            {/* PROMINENT HOMEPAGE SECTION: FU MARKET BIRTHDAY & EVENTS CENTRE */}
            {!viewingFavouritesOnly && !searchQuery && (
              <BirthdayEventsSection
                events={campusEvents}
                loading={eventsLoading}
                onSelectEvent={(ev) => setSelectedEvent(ev)}
                onOpenCeoManager={() => {
                  if (isAuthorizedCeo(user)) setShowCeoEventsModal(true);
                }}
              />
            )}

            {/* PROMINENT HOMEPAGE SECTION: FU SPORT UPDATE & ANNOUNCEMENT CENTRE */}
            {!viewingFavouritesOnly && !searchQuery && (
              <SportAndAnnouncementsSection
                sportUpdates={sportUpdates}
                generalAnnouncements={generalAnnouncements}
                loading={announcementsLoading}
                savedIds={savedAnnouncementIds}
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
            )}

            {/* PROMINENT HOMEPAGE SECTION: FU MARKET ADS */}
            {!viewingFavouritesOnly && !searchQuery && (
              <FuMarketAdsSection
                ads={activePublicAds}
                loading={adsLoading}
                onOpenSubmitModal={(packageId = 'basic') =>
                  setAdvertiseModalState({ open: true, packageId })
                }
                onSelectAd={(ad) => setSelectedAd(ad)}
                onOpenMasterControl={() => {
                  if (isAuthorizedCeo(user)) setShowCeoMasterControl(true);
                }}
              />
            )}

            {/* Quick Category Tiles (6 FU MARKET Categories) */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base sm:text-lg font-black text-[#111111] flex items-center gap-2">
                  <Grid className="w-5 h-5 text-[#0B6B3A]" />
                  <span>Shop by Campus Category</span>
                </h2>
                <span className="text-xs font-bold text-[#0B6B3A]">{categories.length} Categories</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
                {categories.slice(0, 6).map((cat) => {
                  const isActive = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(isActive ? 'all' : cat.id);
                        setViewingFavouritesOnly(false);
                        handleStartShopping();
                      }}
                      className={`p-3.5 rounded-2xl border transition text-center flex flex-col items-center justify-center group shadow-xs ${
                        isActive
                          ? 'bg-[#0B6B3A] border-[#0B6B3A] text-white'
                          : 'bg-white border-[#E5E7EB] hover:border-[#0B6B3A] text-[#111111]'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition mb-2 ${
                          isActive
                            ? 'bg-[#F2B90D] text-[#111111]'
                            : 'bg-[#F5F5F5] text-[#0B6B3A] group-hover:bg-[#0B6B3A] group-hover:text-[#F2B90D]'
                        }`}
                      >
                        {getCategoryIcon(cat.icon)}
                      </div>
                      <span className="text-xs font-extrabold line-clamp-2 leading-tight">
                        {cat.name}
                      </span>
                      <span
                        className={`text-[10px] mt-1 font-semibold ${
                          isActive ? 'text-[#F2B90D]' : 'text-[#555555]'
                        }`}
                      >
                        {cat.productCount ? `${cat.productCount} items` : 'Browse'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* SECTION 2: Marketplace Catalog + Price/Category Filters */}
            <section ref={productCatalogRef} className="scroll-mt-24 space-y-5">
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <span className="inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[#0B6B3A] text-[#F2B90D]">
                      FU MARKET Live Feed
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <h2 className="font-display text-lg sm:text-xl font-black text-[#111111]">
                        {viewingFavouritesOnly
                          ? 'Saved Favourites'
                          : selectedCategory !== 'all'
                          ? categories.find((c) => c.id === selectedCategory)?.name || 'Category Items'
                          : searchQuery
                          ? `Search Results for "${searchQuery}"`
                          : 'Latest Student Items'}
                      </h2>
                      {selectedState !== 'all' && (
                        <span className="bg-[#F5F5F5] border border-[#0B6B3A]/30 text-[#0B6B3A] text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {selectedState}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#555555] mt-0.5 flex items-center gap-2">
                      <span>
                        Showing {visibleProducts.length} of {displayedProducts.length} genuine listings
                      </span>
                      {isRefreshing && (
                        <span className="text-[10px] font-bold text-[#0B6B3A] animate-pulse">
                          Updating...
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Condition, Location & Sort Controls */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-[#F5F5F5] border border-[#E5E7EB] px-3 py-2 rounded-xl text-xs font-bold text-[#111111]">
                      <MapPin className="w-3.5 h-3.5 text-[#0B6B3A]" />
                      <select
                        value={selectedState}
                        onChange={(e) => setSelectedState(e.target.value)}
                        className="bg-transparent border-0 outline-none text-xs font-bold text-[#111111] cursor-pointer"
                      >
                        <option value="all">All Locations</option>
                        {NIGERIA_STATES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center bg-[#F5F5F5] border border-[#E5E7EB] p-0.5 rounded-xl text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setConditionFilter('all')}
                        className={`px-3 py-1.5 rounded-lg transition ${
                          conditionFilter === 'all'
                            ? 'bg-[#0B6B3A] text-[#F2B90D]'
                            : 'text-[#555555] hover:text-[#111111]'
                        }`}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setConditionFilter('new')}
                        className={`px-3 py-1.5 rounded-lg transition ${
                          conditionFilter === 'new'
                            ? 'bg-[#0B6B3A] text-[#F2B90D]'
                            : 'text-[#555555] hover:text-[#111111]'
                        }`}
                      >
                        New
                      </button>
                      <button
                        type="button"
                        onClick={() => setConditionFilter('used')}
                        className={`px-3 py-1.5 rounded-lg transition ${
                          conditionFilter === 'used'
                            ? 'bg-[#0B6B3A] text-[#F2B90D]'
                            : 'text-[#555555] hover:text-[#111111]'
                        }`}
                      >
                        Used
                      </button>
                    </div>

                    <select
                      value={sortOption}
                      onChange={(e) => setSortOption(e.target.value as any)}
                      className="bg-[#F5F5F5] border border-[#E5E7EB] text-xs font-bold text-[#111111] py-2 px-3 rounded-xl outline-none focus:border-[#0B6B3A]"
                    >
                      <option value="newest">Newest First</option>
                      <option value="price-asc">Price: Low to High</option>
                      <option value="price-desc">Price: High to Low</option>
                      <option value="popular">Most Popular</option>
                    </select>

                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={resetAllFilters}
                        className="px-3 py-2 text-xs bg-[#111111] hover:bg-[#14532D] text-white rounded-xl font-bold transition flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5 text-[#F2B90D]" />
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Price Filter Row */}
                <div className="pt-3 border-t border-[#F5F5F5] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black text-[#111111] flex items-center gap-1 mr-1">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-[#0B6B3A]" />
                      Filter Price:
                    </span>
                    {PRICE_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPricePreset(preset)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                          activePricePreset === preset.id
                            ? 'bg-[#F2B90D] border-[#F2B90D] text-[#111111] font-black'
                            : 'bg-[#F5F5F5] border-[#E5E7EB] text-[#333333] hover:border-[#0B6B3A]'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <input
                      type="number"
                      min="0"
                      placeholder="Min ₦"
                      value={minPrice}
                      onChange={(e) => {
                        setMinPrice(e.target.value);
                        setActivePricePreset('custom');
                      }}
                      className="w-28 px-3 py-1.5 bg-[#F5F5F5] border border-[#E5E7EB] focus:border-[#0B6B3A] rounded-xl text-[#111111] font-bold outline-none"
                    />
                    <span className="text-[#555555] font-bold">–</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="Max ₦"
                      value={maxPrice}
                      onChange={(e) => {
                        setMaxPrice(e.target.value);
                        setActivePricePreset('custom');
                      }}
                      className="w-28 px-3 py-1.5 bg-[#F5F5F5] border border-[#E5E7EB] focus:border-[#0B6B3A] rounded-xl text-[#111111] font-bold outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Products Grid */}
              {loading ? (
                <div className="py-16 text-center bg-white rounded-3xl border border-[#E5E7EB]">
                  <div className="w-10 h-10 border-4 border-[#0B6B3A] border-t-[#F2B90D] rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-xs font-bold text-[#555555]">
                    Loading genuine FU MARKET listings...
                  </p>
                </div>
              ) : fetchError ? (
                <div className="bg-white rounded-3xl p-10 text-center border border-[#E5E7EB] max-w-xl mx-auto shadow-xs">
                  <ShoppingBag className="w-12 h-12 text-[#0B6B3A] mx-auto mb-3" />
                  <h3 className="text-base sm:text-lg font-black text-[#111111]">
                    Unable to load listings right now
                  </h3>
                  <p className="text-xs text-[#555555] mt-1 mb-4 break-words">
                    {fetchError}
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
                    <button
                      type="button"
                      onClick={() => loadCatalogProducts(1, true)}
                      className="px-5 py-2.5 bg-[#0B6B3A] hover:bg-[#14532D] text-white text-xs font-black rounded-xl transition"
                    >
                      Retry
                    </button>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={resetAllFilters}
                        className="px-4 py-2.5 bg-[#F5F5F5] border border-[#E5E7EB] hover:border-[#0B6B3A] text-[#111111] text-xs font-bold rounded-xl"
                      >
                        Reset Filters
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleRequestSellModal}
                      className="px-5 py-2.5 bg-[#F2B90D] hover:bg-[#FFC107] text-[#111111] text-xs font-black rounded-xl transition"
                    >
                      Post Item
                    </button>
                  </div>
                </div>
              ) : displayedProducts.length === 0 ? (
                <div className="bg-white rounded-3xl p-10 text-center border border-[#E5E7EB] max-w-xl mx-auto shadow-xs">
                  <ShoppingBag className="w-12 h-12 text-[#0B6B3A] mx-auto mb-3" />
                  <h3 className="text-base sm:text-lg font-black text-[#111111]">
                    {viewingFavouritesOnly
                      ? 'No saved favourites yet'
                      : 'No listings yet - Be the first to post'}
                  </h3>
                  <p className="text-xs text-[#555555] mt-1 mb-4">
                    {selectedCategory !== 'all'
                      ? 'No listings found for this category right now. Post an item for FUWUKARI students or tap Retry.'
                      : hasActiveFilters
                      ? 'Try clearing your search, category, or price filter.'
                      : 'Post hostel items, textbooks, food, or gadgets in seconds for free.'}
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
                    <button
                      type="button"
                      onClick={handleRequestSellModal}
                      className="px-5 py-2.5 bg-[#F2B90D] hover:bg-[#FFC107] text-[#111111] text-xs font-black rounded-xl transition"
                    >
                      Post Item
                    </button>
                    <button
                      type="button"
                      onClick={() => loadCatalogProducts(1, true)}
                      className="px-4 py-2.5 bg-[#0B6B3A] hover:bg-[#14532D] text-white text-xs font-black rounded-xl transition"
                    >
                      Retry
                    </button>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={resetAllFilters}
                        className="px-4 py-2.5 bg-[#F5F5F5] border border-[#E5E7EB] hover:border-[#0B6B3A] text-[#111111] text-xs font-bold rounded-xl"
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
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
                    <div ref={loadMoreRef} className="flex justify-center pt-2">
                      <button
                        type="button"
                        onClick={() => setVisibleCount((prev) => prev + 16)}
                        className="px-6 py-2.5 bg-white border border-[#E5E7EB] hover:border-[#0B6B3A] text-[#0B6B3A] text-xs font-black rounded-xl shadow-xs transition"
                      >
                        Load More Products ({displayedProducts.length - visibleProducts.length} remaining)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* PROMINENT HOMEPAGE SECTION: FU MARKET STUDENT SERVICES MARKETPLACE */}
            {!viewingFavouritesOnly && (
              <FuMarketServicesSection
                services={publicServices}
                categories={serviceCategories}
                loading={servicesLoading}
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
            )}

            {/* PROMINENT HOMEPAGE SECTION: FU MARKET CAMPUS EMERGENCY & HELP CENTRE */}
            {!viewingFavouritesOnly && (
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
            )}

            {/* What Students Need */}
            <section className="bg-white border border-[#E5E7EB] rounded-3xl p-5 sm:p-6 space-y-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[#0B6B3A] text-[#F2B90D]">
                    What Students Need
                  </span>
                  <h2 className="font-display text-lg sm:text-xl font-black text-[#111111] flex items-center gap-2 mt-1">
                    <HelpCircle className="w-5 h-5 text-[#0B6B3A]" />
                    <span>Latest Student Requests</span>
                  </h2>
                  <p className="text-xs text-[#555555] mt-0.5">
                    Looking for a textbook, fan, gadget, or campus item? Post your budget and let student sellers reach out.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => navigateToView('requests')}
                    className="px-4 py-2 bg-[#F2B90D] hover:bg-[#FFC107] text-[#111111] font-black text-xs rounded-xl flex items-center gap-1.5 transition"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Post What You Need</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateToView('requests')}
                    className="px-4 py-2 bg-[#0B6B3A] hover:bg-[#14532D] text-white font-bold text-xs rounded-xl flex items-center gap-1 transition"
                  >
                    <span>View All</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#F2B90D]" />
                  </button>
                </div>
              </div>

              {latestRequests.length === 0 ? (
                <div className="bg-[#F5F5F5] border border-[#E5E7EB] rounded-2xl p-6 text-center text-xs text-[#555555]">
                  No student requests posted yet. Be the first to ask for an item you need!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {latestRequests.map((req) => (
                    <div
                      key={req.id}
                      onClick={() => navigateToView('requests')}
                      className="bg-[#F5F5F5] border border-[#E5E7EB] hover:border-[#0B6B3A] rounded-2xl p-4 cursor-pointer transition space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black px-2 py-0.5 rounded bg-[#0B6B3A] text-[#F2B90D]">
                          Budget: {formatNaira(req.budget)}
                        </span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-white border border-[#E5E7EB] text-[#111111]">
                          {req.status}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-[#111111] line-clamp-1">{req.title}</h3>
                      <p className="text-xs text-[#555555] line-clamp-2">{req.description}</p>
                      <div className="text-[11px] text-[#555555] pt-2 border-t border-[#E5E7EB] flex items-center justify-between">
                        <span className="truncate">{req.location}</span>
                        <span className="text-[#0B6B3A] font-black shrink-0">Respond →</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Wukari Agent Accommodation */}
            <section className="bg-white border border-[#E5E7EB] rounded-3xl p-5 sm:p-6 space-y-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[#0B6B3A] text-[#F2B90D]">
                    Wukari Agent
                  </span>
                  <h2 className="font-display text-lg sm:text-xl font-black text-[#111111] flex items-center gap-2 mt-1">
                    <Home className="w-5 h-5 text-[#0B6B3A]" />
                    <span>Campus Accommodation &amp; Roommates</span>
                  </h2>
                  <p className="text-xs text-[#555555] mt-0.5">
                    Find verified student lodges, self-contains, flats, and roommates around FUWUKARI.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => navigateToView('hux')}
                  className="px-4 py-2 bg-[#0B6B3A] hover:bg-[#14532D] text-white font-black text-xs rounded-xl flex items-center gap-1.5 self-start sm:self-auto transition shrink-0"
                >
                  <span>Explore Wukari Agent</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#F2B90D]" />
                </button>
              </div>

              {latestAccommodation.length === 0 ? (
                <div className="bg-[#F5F5F5] border border-[#E5E7EB] rounded-2xl p-6 text-center text-xs text-[#555555]">
                  No accommodation listings available yet. Check back soon or post a lodge/roommate request.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {latestAccommodation.map((hux) => (
                    <div
                      key={hux.id}
                      onClick={() => navigateToView('hux')}
                      className="bg-[#F5F5F5] border border-[#E5E7EB] hover:border-[#0B6B3A] rounded-2xl overflow-hidden cursor-pointer transition flex flex-col"
                    >
                      {hux.imageUrl || (hux.images && hux.images[0]) ? (
                        <div className="h-36 bg-white overflow-hidden">
                          <img
                            src={hux.imageUrl || hux.images[0]}
                            alt={hux.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : null}
                      <div className="p-4 space-y-1.5 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="font-black text-[#0B6B3A]">{hux.type}</span>
                            <span className="text-[#555555]">{hux.location}</span>
                          </div>
                          <h3 className="text-sm font-bold text-[#111111] line-clamp-1 mt-1">{hux.title}</h3>
                        </div>
                        <div className="pt-2 border-t border-[#E5E7EB] flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded bg-[#0B6B3A] text-[#F2B90D] text-sm font-black">
                            {formatNaira(hux.price)}
                            <span className="text-[10px] text-white font-normal">/{hux.pricePer}</span>
                          </span>
                          <span className="text-xs font-black text-[#0B6B3A]">Inspect →</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Student Messaging */}
            <section className="bg-[#0B6B3A] text-white rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b-4 border-[#F2B90D]">
              <div className="space-y-2 max-w-2xl">
                <span className="inline-block text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded bg-[#F2B90D] text-[#111111]">
                  Student Messaging
                </span>
                <h2 className="font-display text-xl sm:text-2xl font-black text-white">
                  Connect Sharp Sharp with FUWUKARI Peers &amp; Sellers
                </h2>
                <p className="text-xs sm:text-sm text-white/90 leading-relaxed">
                  Join the live Single Hub campus chat or open real-time 1-on-1 private messages directly with sellers and Wukari agents.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => navigateToView('hub')}
                  className="px-5 py-3 bg-[#F2B90D] hover:bg-[#FFC107] text-[#111111] font-black text-xs sm:text-sm rounded-xl flex items-center gap-2 transition"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Open Single Hub</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigateToView('friends')}
                  className="px-5 py-3 bg-[#14532D] hover:bg-black/30 border border-white/25 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center gap-2 transition"
                >
                  <Users className="w-4 h-4 text-[#F2B90D]" />
                  <span>Direct &amp; Friends Chat</span>
                </button>
              </div>
            </section>

            {/* Campus Safety Reminder & Install PWA */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <section className="bg-white border border-[#E5E7EB] rounded-3xl p-5 flex flex-col justify-between gap-4 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#0B6B3A] text-[#F2B90D] flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm sm:text-base text-[#111111]">
                      FUWUKARI Safe Trading Guidelines
                    </h3>
                    <p className="text-xs text-[#555555] mt-1 leading-relaxed">
                      Meet sellers in open, busy campus areas (Main Gate, LT, Hostel Common Areas). Inspect items physically before transferring money. Never pay advance delivery fees.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowSafetyModal(true)}
                  className="self-start px-4 py-2 bg-[#F5F5F5] border border-[#E5E7EB] hover:border-[#0B6B3A] text-[#111111] font-bold text-xs rounded-xl transition"
                >
                  Read Safety Charter
                </button>
              </section>

              <section
                ref={downloadAppRef}
                id="download-wukarimart"
                className="bg-white border border-[#E5E7EB] rounded-3xl p-5 flex flex-col justify-between gap-4 shadow-xs"
              >
                <div className="space-y-1.5">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#0B6B3A] bg-[#F5F5F5] border border-[#0B6B3A]/25 px-3 py-1 rounded-full">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>FU MARKET App</span>
                  </span>
                  <h3 className="font-black text-base text-[#111111]">
                    Install FU MARKET on Phone or Laptop
                  </h3>
                  <p className="text-xs text-[#555555] leading-relaxed">
                    Add FU MARKET to your home screen for fast loading on low campus data.
                  </p>

                  {(showPWAInstructions || (isIOS && !isInstalled)) && (
                    <div className="p-3 bg-[#F5F5F5] border border-[#E5E7EB] rounded-2xl text-xs text-[#333333] flex items-start gap-2 mt-2">
                      <Info className="w-4 h-4 text-[#0B6B3A] shrink-0 mt-0.5" />
                      <div>
                        {isIOS ? (
                          <span>
                            On iPhone Safari: tap <strong className="text-[#111111]">Share</strong>, then select{' '}
                            <strong className="text-[#111111]">Add to Home Screen</strong>.
                          </span>
                        ) : (
                          <span>
                            In Chrome/Edge: click <strong className="text-[#111111]">Install</strong> in the address bar or browser menu →{' '}
                            <strong className="text-[#111111]">Install FU MARKET</strong>.
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  {isInstalled ? (
                    <div className="inline-flex px-4 py-2 bg-[#0B6B3A] text-[#F2B90D] font-black text-xs rounded-xl items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>App Installed</span>
                    </div>
                  ) : isInstallable ? (
                    <button
                      type="button"
                      onClick={() => install()}
                      className="px-5 py-2.5 bg-[#0B6B3A] hover:bg-[#14532D] text-white font-black text-xs rounded-xl active:scale-95 transition flex items-center gap-2"
                    >
                      <Download className="w-4 h-4 text-[#F2B90D]" />
                      <span>Install FU MARKET App</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowPWAInstructions(true)}
                      className="px-5 py-2.5 bg-[#0B6B3A] hover:bg-[#14532D] text-white font-black text-xs rounded-xl active:scale-95 transition flex items-center gap-2"
                    >
                      <Download className="w-4 h-4 text-[#F2B90D]" />
                      <span>How to Install App</span>
                    </button>
                  )}
                </div>
              </section>
            </div>
          </main>

          {/* Big Gold Floating "Post Item for FREE" Button */}
          <button
            type="button"
            onClick={handleRequestSellModal}
            className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-30 bg-[#F2B90D] hover:bg-[#FFC107] text-[#111111] font-black text-xs sm:text-sm px-5 py-3.5 rounded-full shadow-2xl border-2 border-[#14532D] flex items-center gap-2 active:scale-95 transition"
          >
            <PlusCircle className="w-5 h-5 text-[#14532D]" />
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
            onOpenAdvertiseModal={() =>
              setAdvertiseModalState({ open: true, packageId: 'basic' })
            }
            onOpenServicesSection={scrollToServicesSection}
            onOpenEmergencySection={scrollToEmergencySection}
            onOpenPostServiceModal={() =>
              setPostServiceModalState({ open: true, editingService: null })
            }
            onOpenServiceProviderDashboard={() => setShowServiceProviderDashboard(true)}
            onOpenCeoPortal={() =>
              navigateCeoRoute(isCeoRouteAuthorized ? 'ceo-admin' : 'ceo-login', null)
            }
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
            showToast('Continuing as Guest on FU MARKET');
          }}
          onSuccess={(result) => {
            if (result?.isRegistration) {
              showToast('Your FU MARKET account has been created successfully.');
              navigateToView('marketplace');
            } else {
              showToast('Welcome to FU MARKET!');
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
          onClose={() =>
            setPostServiceModalState({ open: false, editingService: null })
          }
          onSuccess={(savedService, isEdit) => {
            setPostServiceModalState({ open: false, editingService: null });
            showToast(
              isEdit
                ? 'Service updated on FU MARKET!'
                : 'Service posted on FU MARKET!'
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
            showToast('Service promotion activated on FU MARKET!');
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

      {advertiseModalState.open && (
        <AdvertiseBusinessModal
          initialPackageId={advertiseModalState.packageId}
          onClose={() => setAdvertiseModalState({ open: false, packageId: 'basic' })}
          onSubmitted={() => {
            showToast('Advertisement submitted for CEO review and approval.');
          }}
        />
      )}

      {selectedAd && (
        <AdDetailModal
          ad={selectedAd}
          onClose={() => setSelectedAd(null)}
          onAdvertiseNow={() => setAdvertiseModalState({ open: true, packageId: 'basic' })}
        />
      )}

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
        onClose={() => setShowCartModal(false)}
        onUpdateQuantity={updateCartQuantity}
        onRemoveItem={removeFromCart}
        onClearCart={clearCart}
      />

      <BottomNav
        currentView={currentView}
        onNavigate={navigateToView}
        pendingRequestsCount={pendingRequestsCount}
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
