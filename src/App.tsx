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
  Info
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import {
  Product,
  Category,
  ProductFilter,
  StudentRequest,
  HuxListing,
  CartItem
} from './types.js';
import { fetchProducts, fetchCategories } from './services/api.js';
import { Header } from './components/Header.js';
import { NIGERIA_STATES } from './constants/states.js';
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
import { usePWAInstall } from './hooks/usePWAInstall.js';
import {
  subscribeToFriendRequests,
  subscribeToStudentRequests,
  subscribeToHuxListings
} from './services/firebase.js';
import { getLocalStudentSession } from './utils/studentAuth.js';
import { getProductDisplayImage } from './utils/productImages.js';

const CART_STORAGE_KEY = 'fu_market_cart';

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

  // Multi-page route state
  const [currentView, setCurrentView] = useState<AppView>(() => resolveViewFromPath());
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);
  const [directChatTarget, setDirectChatTarget] = useState<DirectChatTarget | null>(null);

  // Cart state persisted in localStorage
  const [cartItems, setCartItems] = useState<CartItem[]>(() => loadCartFromStorage());
  const [showCartModal, setShowCartModal] = useState<boolean>(false);

  // Live previews for homepage sections 6 & 7
  const [latestRequests, setLatestRequests] = useState<StudentRequest[]>([]);
  const [latestAccommodation, setLatestAccommodation] = useState<HuxListing[]>([]);

  // PWA guidance banner toggle
  const [showPWAInstructions, setShowPWAInstructions] = useState(false);

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
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Listen for incoming friend requests & homepage real-time previews
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

    const unsubStudentReqs = subscribeToStudentRequests((list) => {
      setLatestRequests(list.slice(0, 3));
    });

    const unsubHux = subscribeToHuxListings('all', (list) => {
      setLatestAccommodation(list.filter((l) => l.isAvailable !== false).slice(0, 3));
    });

    return () => {
      unsubReq();
      unsubStudentReqs();
      unsubHux();
    };
  }, [user?.id]);

  const navigateToView = (view: AppView) => {
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

  const handleStartDirectChat = (target: DirectChatTarget) => {
    setDirectChatTarget(target);
    navigateToView('friends');
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pageSize: 24, totalPages: 1 });

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedState, setSelectedState] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [conditionFilter, setConditionFilter] = useState<string>('all');
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

  const productCatalogRef = useRef<HTMLDivElement>(null);
  const downloadAppRef = useRef<HTMLElement>(null);

  const handleProductPostSuccess = async () => {
    setSelectedCategory('all');
    setSelectedState('all');
    setSearchQuery('');
    setViewingFavouritesOnly(false);

    await Promise.all([loadCatalogProducts(1), loadCategories()]);
    showToast('Product published on FU MARKET');

    setTimeout(() => {
      if (productCatalogRef.current) {
        productCatalogRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 300);
  };

  const loadCategories = async () => {
    try {
      const data = await fetchCategories();
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  const loadCatalogProducts = async (page = 1) => {
    setLoading(true);
    try {
      const filters: ProductFilter = {
        category: selectedCategory,
        state: selectedState,
        q: searchQuery,
        condition: conditionFilter,
        sort: sortOption,
        page,
        limit: 24
      };

      const res = await fetchProducts(filters);
      setProducts(res.items);
      setPagination(res.pagination);
    } catch (err) {
      console.error('Failed to fetch products', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadCatalogProducts(1);
  }, [selectedCategory, selectedState, searchQuery, conditionFilter, sortOption]);

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

  const displayedProducts = viewingFavouritesOnly
    ? products.filter((p) => favourites.includes(p.id))
    : products;

  const totalCartItems = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col font-sans">
      <OfflineIndicator />

      {/* Toast Notification */}
      {notificationToast && (
        <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 bg-[#1C1C1C] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold border border-[#FFFFFF]">
          <CheckCircle2 className="w-4 h-4 text-[#FFFFFF]" />
          <span>{notificationToast}</span>
        </div>
      )}

      {/* Main Header */}
      <Header
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        selectedState={selectedState}
        onSelectState={setSelectedState}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenSellModal={() => setShowSellModal(true)}
        onOpenAuthModal={handleOpenAuth}
        onOpenSellerDashboard={() => setShowSellerDashboard(true)}
        onOpenAdminDashboard={() => setShowAdminDashboard(true)}
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

          {/* SECTION 1: Welcome Banner */}
          {!viewingFavouritesOnly && !searchQuery && (
            <HeroBanner
              onStartShopping={handleStartShopping}
              onOpenSellModal={() => setShowSellModal(true)}
              onNavigateView={navigateToView}
            />
          )}

          {/* Main 10-Section Homepage Content */}
          <main className="max-w-7xl mx-auto px-4 py-6 w-full flex-1 space-y-10">
            {/* SECTION 2: Student Marketplace + SECTION 5: Latest Genuine Products */}
            <section ref={productCatalogRef} className="scroll-mt-24 space-y-5">
              {/* Section 2 Header & Filter Controls */}
              <div className="bg-[#121212] p-4 sm:p-5 rounded-2xl border border-[#333333] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#FFFFFF]">
                    Student Marketplace
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <h2 className="text-lg sm:text-xl font-black text-white">
                      {viewingFavouritesOnly
                        ? 'Saved Favourites'
                        : selectedCategory !== 'all'
                        ? categories.find((c) => c.id === selectedCategory)?.name || 'Category Products'
                        : searchQuery
                        ? `Search Results for "${searchQuery}"`
                        : 'Latest Genuine Products'}
                    </h2>
                    {selectedState !== 'all' && (
                      <span className="bg-[#1C1C1C] border border-[#FFFFFF]/40 text-[#FFFFFF] text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {selectedState}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#BDBDBD] mt-0.5">
                    Showing {displayedProducts.length} of {pagination.total} verified listings • 100% real student submissions
                  </p>
                </div>

                {/* Filter Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-[#1C1C1C] border border-[#333333] px-3 py-2 rounded-xl text-xs font-bold text-white">
                    <MapPin className="w-3.5 h-3.5 text-[#FFFFFF]" />
                    <select
                      value={selectedState}
                      onChange={(e) => setSelectedState(e.target.value)}
                      className="bg-transparent border-0 outline-none text-xs font-bold text-white cursor-pointer"
                    >
                      <option value="all" className="bg-[#121212]">
                        All Locations
                      </option>
                      {NIGERIA_STATES.map((st) => (
                        <option key={st} value={st} className="bg-[#121212]">
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center bg-[#1C1C1C] border border-[#333333] p-0.5 rounded-xl text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setConditionFilter('all')}
                      className={`px-3 py-1.5 rounded-lg transition ${
                        conditionFilter === 'all' ? 'bg-[#FFFFFF] text-black' : 'text-[#BDBDBD] hover:text-white'
                      }`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setConditionFilter('new')}
                      className={`px-3 py-1.5 rounded-lg transition ${
                        conditionFilter === 'new' ? 'bg-[#FFFFFF] text-black' : 'text-[#BDBDBD] hover:text-white'
                      }`}
                    >
                      New
                    </button>
                    <button
                      type="button"
                      onClick={() => setConditionFilter('used')}
                      className={`px-3 py-1.5 rounded-lg transition ${
                        conditionFilter === 'used' ? 'bg-[#FFFFFF] text-black' : 'text-[#BDBDBD] hover:text-white'
                      }`}
                    >
                      Used
                    </button>
                  </div>

                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value as any)}
                    className="bg-[#1C1C1C] border border-[#333333] text-xs font-bold text-white py-2 px-3 rounded-xl outline-none focus:border-[#FFFFFF]"
                  >
                    <option value="newest">Newest First</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="popular">Most Popular</option>
                  </select>

                  {(selectedCategory !== 'all' ||
                    selectedState !== 'all' ||
                    conditionFilter !== 'all' ||
                    searchQuery ||
                    viewingFavouritesOnly) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory('all');
                        setSelectedState('all');
                        setConditionFilter('all');
                        setSearchQuery('');
                        setViewingFavouritesOnly(false);
                      }}
                      className="px-3 py-2 text-xs text-red-400 hover:bg-red-950/50 rounded-xl font-bold transition flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* SECTION 5: Products Grid or Exact Empty State */}
              {loading ? (
                <div className="py-16 text-center">
                  <div className="w-10 h-10 border-4 border-[#FFFFFF] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-xs font-bold text-[#BDBDBD]">
                    Loading genuine FU MARKET listings...
                  </p>
                </div>
              ) : displayedProducts.length === 0 ? (
                <div className="bg-[#121212] rounded-3xl p-10 text-center border border-[#333333] max-w-xl mx-auto">
                  <ShoppingBag className="w-12 h-12 text-[#333333] mx-auto mb-3" />
                  <h3 className="text-base sm:text-lg font-black text-white">
                    {products.length === 0
                      ? 'No products have been posted yet. Be the first student to advertise something!'
                      : 'No matching products found'}
                  </h3>
                  {products.length > 0 && (
                    <p className="text-xs text-[#BDBDBD] mt-1 mb-4">
                      Try clearing your search or changing category filters.
                    </p>
                  )}
                  <div className="flex items-center justify-center gap-3 mt-5">
                    {products.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategory('all');
                          setSelectedState('all');
                          setSearchQuery('');
                          setConditionFilter('all');
                        }}
                        className="px-4 py-2 bg-[#1C1C1C] border border-[#333333] text-white text-xs font-bold rounded-xl"
                      >
                        Reset Filters
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowSellModal(true)}
                      className="px-5 py-2.5 bg-[#FFFFFF] hover:bg-[#E5E5E5] text-black text-xs font-black rounded-xl transition"
                    >
                      Post a Product
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
                  {displayedProducts.map((prod) => (
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

            {/* SECTION 3 & 6: What Students Need + Latest Genuine Student Requests */}
            <section className="bg-[#121212] border border-[#333333] rounded-3xl p-5 sm:p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#FFFFFF]">
                    What Students Need
                  </span>
                  <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2 mt-0.5">
                    <HelpCircle className="w-5 h-5 text-[#FFFFFF]" />
                    <span>Latest Genuine Student Requests</span>
                  </h2>
                  <p className="text-xs text-[#BDBDBD] mt-0.5">
                    Looking for a textbook, gadget, appliance, or campus item? Post your budget and let student sellers find you.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => navigateToView('requests')}
                    className="px-4 py-2 bg-[#FFFFFF] hover:bg-[#E5E5E5] text-black font-black text-xs rounded-xl flex items-center gap-1.5 transition"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Post What You Need</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateToView('requests')}
                    className="px-4 py-2 bg-[#1C1C1C] border border-[#333333] hover:border-[#FFFFFF] text-white font-bold text-xs rounded-xl flex items-center gap-1 transition"
                  >
                    <span>View All</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {latestRequests.length === 0 ? (
                <div className="bg-[#1C1C1C] border border-[#333333] rounded-2xl p-6 text-center text-xs text-[#BDBDBD]">
                  No student requests available yet. Post what you need and connect with other students.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {latestRequests.map((req) => (
                    <div
                      key={req.id}
                      onClick={() => navigateToView('requests')}
                      className="bg-[#1C1C1C] border border-[#333333] hover:border-[#FFFFFF] rounded-2xl p-4 cursor-pointer transition space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-black text-[#FFFFFF]">
                          Budget: {formatNaira(req.budget)}
                        </span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#121212] border border-[#333333] text-[#BDBDBD]">
                          {req.status}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white line-clamp-1">{req.title}</h3>
                      <p className="text-xs text-[#BDBDBD] line-clamp-2">{req.description}</p>
                      <div className="text-[11px] text-[#BDBDBD] pt-2 border-t border-[#333333] flex items-center justify-between">
                        <span className="truncate">{req.location}</span>
                        <span className="text-[#FFFFFF] font-bold shrink-0">Respond →</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* SECTION 4 & 7: Wukari Agent + Available Genuine Accommodation */}
            <section className="bg-[#121212] border border-[#333333] rounded-3xl p-5 sm:p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#FFFFFF]">
                    Wukari Agent
                  </span>
                  <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2 mt-0.5">
                    <Home className="w-5 h-5 text-[#FFFFFF]" />
                    <span>Available Genuine Accommodation</span>
                  </h2>
                  <p className="text-xs text-[#BDBDBD] mt-0.5">
                    Find verified student lodges, self-contains, flats, and roommates around FUWUKARI.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => navigateToView('hux')}
                  className="px-4 py-2 bg-[#FFFFFF] hover:bg-[#E5E5E5] text-black font-black text-xs rounded-xl flex items-center gap-1.5 self-start sm:self-auto transition shrink-0"
                >
                  <span>Explore Wukari Agent</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {latestAccommodation.length === 0 ? (
                <div className="bg-[#1C1C1C] border border-[#333333] rounded-2xl p-6 text-center text-xs text-[#BDBDBD]">
                  No accommodation listings available yet. Check back later or contact a registered agent.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {latestAccommodation.map((hux) => (
                    <div
                      key={hux.id}
                      onClick={() => navigateToView('hux')}
                      className="bg-[#1C1C1C] border border-[#333333] hover:border-[#FFFFFF] rounded-2xl overflow-hidden cursor-pointer transition flex flex-col"
                    >
                      {hux.imageUrl || (hux.images && hux.images[0]) ? (
                        <div className="h-36 bg-black overflow-hidden">
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
                            <span className="font-bold text-[#FFFFFF]">{hux.type}</span>
                            <span className="text-[#BDBDBD]">{hux.location}</span>
                          </div>
                          <h3 className="text-sm font-bold text-white line-clamp-1 mt-1">{hux.title}</h3>
                        </div>
                        <div className="pt-2 border-t border-[#333333] flex items-center justify-between">
                          <span className="text-sm font-black text-[#FFFFFF]">
                            {formatNaira(hux.price)}
                            <span className="text-[10px] text-[#BDBDBD] font-normal">/{hux.pricePer}</span>
                          </span>
                          <span className="text-xs font-bold text-white">Inspect →</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* SECTION 8: Marketplace Categories */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <Grid className="w-5 h-5 text-[#FFFFFF]" />
                  <span>Marketplace Categories</span>
                </h2>
                <span className="text-xs text-[#BDBDBD]">{categories.length} Categories</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
                {categories.slice(0, 14).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      handleStartShopping();
                    }}
                    className="p-3 bg-[#1C1C1C] hover:border-[#FFFFFF] border border-[#333333] rounded-2xl transition text-center flex flex-col items-center justify-center group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#121212] border border-[#333333] text-[#FFFFFF] group-hover:scale-110 flex items-center justify-center transition mb-1.5">
                      {getCategoryIcon(cat.icon)}
                    </div>
                    <span className="text-xs font-bold text-white line-clamp-1 group-hover:text-[#FFFFFF]">
                      {cat.name.split(' ')[0]}
                    </span>
                    <span className="text-[10px] text-[#BDBDBD]">
                      {cat.productCount ? `${cat.productCount} items` : 'Browse'}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {/* SECTION 9: Student Messaging (Single Hub + Direct 1-on-1) */}
            <section className="bg-[#121212] border border-[#333333] rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#FFFFFF]">
                  Student Messaging
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  Connect Instantly with FUWUKARI Peers, Sellers &amp; Agents
                </h2>
                <p className="text-xs sm:text-sm text-[#BDBDBD] leading-relaxed">
                  Join the live Single Hub campus discussion or open real-time 1-on-1 private chats directly with sellers, Wukari housing agents, and fellow students.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => navigateToView('hub')}
                  className="px-5 py-3 bg-[#FFFFFF] hover:bg-[#E5E5E5] text-black font-black text-xs sm:text-sm rounded-xl flex items-center gap-2 transition"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Open Single Hub</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigateToView('friends')}
                  className="px-5 py-3 bg-[#1C1C1C] hover:bg-black border border-[#333333] hover:border-[#FFFFFF] text-white font-bold text-xs sm:text-sm rounded-xl flex items-center gap-2 transition"
                >
                  <Users className="w-4 h-4 text-[#FFFFFF]" />
                  <span>Direct &amp; Friends Chat</span>
                </button>
              </div>
            </section>

            {/* Campus Safety Reminder */}
            <section className="bg-[#1C1C1C] border border-[#333333] rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#FFFFFF]/15 text-[#FFFFFF] flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-white">
                    FUWUKARI Safe Trading Guidelines
                  </h3>
                  <p className="text-xs text-[#BDBDBD] max-w-2xl mt-0.5 leading-relaxed">
                    Meet sellers and agents in open, busy campus areas. Inspect every item or lodge in person before transferring money. Never pay advance delivery or inspection fees.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSafetyModal(true)}
                className="px-4 py-2 bg-[#121212] border border-[#333333] hover:border-[#FFFFFF] text-white font-bold text-xs rounded-xl transition shrink-0"
              >
                Read Safety Charter
              </button>
            </section>

            {/* SECTION 10: Download FU MARKET App (PWA Install) */}
            <section
              ref={downloadAppRef}
              id="download-fu-market"
              className="bg-[#121212] border border-[#FFFFFF]/50 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
            >
              <div className="space-y-2 max-w-2xl">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#FFFFFF] bg-[#1C1C1C] border border-[#333333] px-3 py-1 rounded-full">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Download FU MARKET App</span>
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  Install FU MARKET on Android, iPhone, or Desktop
                </h2>
                <p className="text-xs sm:text-sm text-[#BDBDBD] leading-relaxed">
                  Add FU MARKET to your home screen for one-tap launch, faster campus loading, and offline browsing of cached marketplace items.
                </p>

                {(showPWAInstructions || (isIOS && !isInstalled)) && (
                  <div className="p-3.5 bg-[#1C1C1C] border border-[#333333] rounded-2xl text-xs text-[#BDBDBD] flex items-start gap-2 mt-2">
                    <Info className="w-4 h-4 text-[#FFFFFF] shrink-0 mt-0.5" />
                    <div>
                      {isIOS ? (
                        <span>
                          On iPhone/iPad Safari: tap the <strong className="text-white">Share</strong> button at the bottom of Safari, then select <strong className="text-white">Add to Home Screen</strong>.
                        </span>
                      ) : (
                        <span>
                          In Chrome or Edge: click the <strong className="text-white">Install</strong> icon in the address bar or open browser menu → <strong className="text-white">Install FU MARKET</strong>.
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="shrink-0">
                {isInstalled ? (
                  <div className="px-5 py-3 bg-emerald-950/60 border border-emerald-700 text-emerald-300 font-black text-xs sm:text-sm rounded-xl flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>App Installed</span>
                  </div>
                ) : isInstallable ? (
                  <button
                    type="button"
                    onClick={() => install()}
                    className="px-6 py-3.5 bg-[#FFFFFF] hover:bg-[#E5E5E5] text-black font-black text-sm rounded-xl active:scale-95 transition flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Install FU MARKET App</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowPWAInstructions(true)}
                    className="px-6 py-3.5 bg-[#FFFFFF] hover:bg-[#E5E5E5] text-black font-black text-sm rounded-xl active:scale-95 transition flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>How to Install App</span>
                  </button>
                )}
              </div>
            </section>
          </main>

          <Footer
            categories={categories}
            onSelectCategory={(catId) => {
              setSelectedCategory(catId);
              handleStartShopping();
            }}
            onOpenSellModal={() => setShowSellModal(true)}
            onOpenSafetyModal={() => setShowSafetyModal(true)}
            onNavigateView={navigateToView}
            onTriggerPWAHelp={handleTriggerPWAHelp}
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
          onSuccess={() => {
            showToast('Welcome to FU MARKET!');
            loadCatalogProducts(1);
          }}
        />
      )}

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

      {showAdminDashboard && (
        <AdminDashboard
          onClose={() => setShowAdminDashboard(false)}
          onOpenProductDetail={setSelectedProduct}
        />
      )}

      {showSafetyModal && <SafetyModal onClose={() => setShowSafetyModal(false)} />}

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
    <AuthProvider>
      <MainMarketplace />
    </AuthProvider>
  );
}
