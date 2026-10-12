import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Flame,
  TrendingUp,
  MapPin,
  Clock,
  ShieldCheck,
  Search,
  Filter,
  Grid,
  ShoppingBag,
  ArrowRight,
  ChevronRight,
  RefreshCw,
  Heart,
  SlidersHorizontal,
  PlusCircle,
  X,
  MessageCircle,
  CheckCircle2
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { Product, Category, ProductFilter } from './types.js';
import {
  fetchProducts,
  fetchFlashDeals,
  fetchTrendingProducts,
  fetchCategories
} from './services/api.js';
import { Header, NIGERIAN_STATES } from './components/Header.js';
import { NIGERIA_STATES } from './constants/states.js';
import { CategoryBar, getCategoryIcon } from './components/CategoryBar.js';
import { HeroBanner } from './components/HeroBanner.js';
import { ProductCard } from './components/ProductCard.js';
import { ProductDetailModal } from './components/ProductDetailModal.js';
import { SellProductModal } from './components/SellProductModal.js';
import { AuthModal } from './components/AuthModal.js';
import { SellerDashboard } from './components/SellerDashboard.js';
import { SellerStorefrontModal } from './components/SellerStorefrontModal.js';
import { AdminDashboard } from './components/AdminDashboard.js';
import { SafetyModal } from './components/SafetyModal.js';
import { Footer } from './components/Footer.js';

function MainMarketplace() {
  const { user, favourites } = useAuth();

  // Data states
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [flashDeals, setFlashDeals] = useState<Product[]>([]);
  const [trending, setTrending] = useState<Product[]>([]);
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

  // Load initial catalog data
  const loadCategories = async () => {
    try {
      const data = await fetchCategories();
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  const loadFlashAndTrending = async () => {
    try {
      const [deals, trend] = await Promise.all([
        fetchFlashDeals(),
        fetchTrendingProducts()
      ]);
      setFlashDeals(deals);
      setTrending(trend);
    } catch (err) {
      console.error('Failed to load flash deals or trending products', err);
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
    loadFlashAndTrending();
  }, []);

  useEffect(() => {
    loadCatalogProducts(1);
  }, [selectedCategory, selectedState, searchQuery, conditionFilter, sortOption]);

  const handleStartShopping = () => {
    if (productCatalogRef.current) {
      productCatalogRef.current.scrollIntoView({ behavior: 'smooth' });
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
    ? products.filter(p => favourites.includes(p.id))
    : products;

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#222222] flex flex-col font-sans">
      {/* Toast Notification */}
      {notificationToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1C1917] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold border border-gray-700 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
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
        onOpenFavourites={() => setViewingFavouritesOnly(!viewingFavouritesOnly)}
        onOpenSafetyModal={() => setShowSafetyModal(true)}
      />

      {/* Categories Bar */}
      <CategoryBar
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={(catId) => {
          setSelectedCategory(catId);
          setViewingFavouritesOnly(false);
        }}
      />

      {/* Hero Banner (Shown when not filtering by specific favourites) */}
      {!viewingFavouritesOnly && !searchQuery && (
        <HeroBanner
          onStartShopping={handleStartShopping}
          onOpenSellModal={() => setShowSellModal(true)}
          onSelectCategory={(catId) => {
            setSelectedCategory(catId);
            handleStartShopping();
          }}
        />
      )}

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 py-6 w-full flex-1">
        {/* FLASH DEALS SECTION (Only shown when browsing all and no search query) */}
        {!viewingFavouritesOnly && !searchQuery && selectedCategory === 'all' && flashDeals.length > 0 && (
          <section className="mb-8">
            <div className="bg-gradient-to-r from-red-600 to-[#F68B1F] p-4 sm:p-5 rounded-3xl text-white shadow-lg mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black">
                  <Flame className="w-6 h-6 text-yellow-300 fill-current animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-black tracking-tight">NAIJA FLASH DEALS</h2>
                    <span className="bg-yellow-300 text-black text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                      UP TO 30% OFF
                    </span>
                  </div>
                  <p className="text-xs text-white/90">
                    Genuine discounts from top Nigerian merchants. Negotiate and buy directly on WhatsApp!
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold bg-black/20 px-3 py-1.5 rounded-full backdrop-blur-sm self-start sm:self-auto">
                <Clock className="w-3.5 h-3.5 text-yellow-300" />
                <span>Strict 7-Day Live Inventory</span>
              </div>
            </div>

            {/* Flash Deals Horizontal Carousel / Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {flashDeals.slice(0, 5).map((deal) => (
                <ProductCard
                  key={deal.id}
                  product={deal}
                  onOpenDetail={setSelectedProduct}
                  onOpenStorefront={setSelectedSellerStorefrontId}
                />
              ))}
            </div>
          </section>
        )}

        {/* POPULAR CATEGORIES VISUAL GRID (Temu & Jumia style visual tiles) */}
        {!viewingFavouritesOnly && !searchQuery && selectedCategory === 'all' && (
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base sm:text-lg font-black text-[#222222] flex items-center gap-2">
                <Grid className="w-5 h-5 text-[#F68B1F]" />
                Explore Departments
              </h2>
              <span className="text-xs text-gray-500 font-medium">15 Categories</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
              {categories.slice(0, 14).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    handleStartShopping();
                  }}
                  className="p-3 bg-white hover:bg-orange-50 border border-gray-200/80 hover:border-[#F68B1F]/60 rounded-2xl transition text-center flex flex-col items-center justify-center group shadow-sm"
                >
                  <div className="w-10 h-10 rounded-xl bg-orange-100/70 text-[#E07A15] group-hover:scale-110 flex items-center justify-center transition mb-1.5">
                    {getCategoryIcon(cat.icon)}
                  </div>
                  <span className="text-xs font-bold text-gray-800 line-clamp-1 group-hover:text-[#F68B1F]">
                    {cat.name.split(' ')[0]}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {cat.productCount ? `${cat.productCount} items` : 'Browse'}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* NIGERIAN BUYER SAFETY BANNER */}
        <section className="mb-8 bg-gradient-to-r from-emerald-800 via-teal-900 to-emerald-950 rounded-3xl p-5 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base flex items-center gap-2">
                Nigeria Safe Shopping Charter
                <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                  Important
                </span>
              </h3>
              <p className="text-xs text-emerald-100 max-w-2xl mt-0.5 leading-relaxed">
                Meet sellers in public spaces like shopping complexes. Always test and inspect items before transferring money. Never pay advance dispatch or commitment fees!
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowSafetyModal(true)}
            className="px-4 py-2 bg-white text-emerald-900 hover:bg-emerald-50 font-extrabold text-xs rounded-xl shadow transition shrink-0"
          >
            Read Scam Prevention Tips
          </button>
        </section>

        {/* MAIN PRODUCT CATALOG SECTION */}
        <section ref={productCatalogRef}>
          {/* Header & Filter Controls Bar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-[#222222]">
                  {viewingFavouritesOnly
                    ? 'Saved Favourites'
                    : selectedCategory !== 'all'
                    ? categories.find(c => c.id === selectedCategory)?.name || 'Category Products'
                    : searchQuery
                    ? `Results for "${searchQuery}"`
                    : 'Marketplace Feed'}
                </h2>
                {selectedState !== 'all' && (
                  <span className="bg-orange-100 text-[#E07A15] text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {selectedState}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5 font-medium">
                Showing {displayedProducts.length} of {pagination.total} listings • Automatic 7-day lifecycle
              </p>
            </div>

            {/* Filter Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {/* State Filter Dropdown (36 States + FCT) */}
              <div className="flex items-center gap-1.5 bg-gray-100 px-3 py-2 rounded-xl text-xs font-bold text-gray-700">
                <MapPin className="w-3.5 h-3.5 text-[#F68B1F]" />
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="bg-transparent border-0 outline-none text-xs font-bold text-gray-800 cursor-pointer"
                >
                  <option value="all">All Nigerian States</option>
                  {NIGERIA_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {/* Condition Filter */}
              <div className="flex items-center bg-gray-100 p-0.5 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setConditionFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    conditionFilter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setConditionFilter('new')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    conditionFilter === 'new' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Brand New
                </button>
                <button
                  onClick={() => setConditionFilter('used')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    conditionFilter === 'used' ? 'bg-white text-amber-800 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Direct Used
                </button>
              </div>

              {/* Sort Selector */}
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as any)}
                className="bg-gray-100 border-0 text-xs font-bold text-gray-700 py-2 px-3 rounded-xl outline-none focus:ring-2 focus:ring-[#F68B1F]"
              >
                <option value="newest">Newest First</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="popular">Most Popular</option>
              </select>

              {/* Reset Filters */}
              {(selectedCategory !== 'all' || selectedState !== 'all' || conditionFilter !== 'all' || searchQuery || viewingFavouritesOnly) && (
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setSelectedState('all');
                    setConditionFilter('all');
                    setSearchQuery('');
                    setViewingFavouritesOnly(false);
                  }}
                  className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-xl font-bold transition flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* PRODUCTS GRID */}
          {loading ? (
            <div className="py-20 text-center">
              <div className="w-10 h-10 border-4 border-[#F68B1F] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-xs font-bold text-gray-500">Loading verified Nigerian marketplace listings...</p>
            </div>
          ) : displayedProducts.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 shadow-sm max-w-lg mx-auto my-8">
              <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-gray-900">No Matching Products Found</h3>
              <p className="text-xs text-gray-500 mt-1 mb-5">
                We couldn't find any active listings matching your current filters. Try selecting a different state or category!
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setSelectedState('all');
                    setSearchQuery('');
                    setConditionFilter('all');
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition"
                >
                  Reset Filters
                </button>
                <button
                  onClick={() => setShowSellModal(true)}
                  className="px-4 py-2 bg-[#F68B1F] hover:bg-[#E07A15] text-white text-xs font-bold rounded-xl shadow-md transition"
                >
                  Sell This Item
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
              {displayedProducts.map((prod) => (
                <ProductCard
                  key={prod.id}
                  product={prod}
                  onOpenDetail={setSelectedProduct}
                  onOpenStorefront={setSelectedSellerStorefrontId}
                />
              ))}
            </div>
          )}
        </section>

        {/* BECOME A SELLER PROMOTIONAL SECTION */}
        <section className="mt-14 mb-8">
          <div className="bg-gradient-to-r from-[#1C1917] via-[#2A2624] to-[#1C1917] rounded-3xl p-6 sm:p-10 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="max-w-xl text-center md:text-left">
              <span className="text-[10px] font-black text-[#F68B1F] uppercase tracking-wider bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
                GROW YOUR NIGERIAN BUSINESS
              </span>
              <h3 className="text-2xl sm:text-3xl font-black mt-2 mb-2 leading-tight">
                Turn Your Stock into Cash on NaijaMart
              </h3>
              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed mb-4">
                Whether you sell phones in Computer Village, fabrics in Balogun, groceries in Wuse 2, or inverters in Port Harcourt — upload your goods in 60 seconds with genuine photos and get buyers reaching you directly on WhatsApp.
              </p>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-gray-300 font-semibold">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 100% Free to Post
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Direct WhatsApp Chats
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Zero Middleman Deductions
                </span>
              </div>
            </div>

            <div className="shrink-0">
              <button
                onClick={() => {
                  if (!user) {
                    handleOpenAuth('register', 'seller');
                  } else {
                    setShowSellModal(true);
                  }
                }}
                className="px-6 py-3.5 bg-gradient-to-r from-[#F68B1F] to-[#FF7A00] hover:from-[#E07A15] hover:to-[#F68B1F] text-white font-extrabold text-sm rounded-full shadow-lg shadow-orange-500/30 active:scale-95 transition flex items-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Start Selling Free Today</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer
        categories={categories}
        onSelectCategory={(catId) => {
          setSelectedCategory(catId);
          handleStartShopping();
        }}
        onOpenSellModal={() => setShowSellModal(true)}
        onOpenSafetyModal={() => setShowSafetyModal(true)}
      />

      {/* MODALS */}
      {/* 1. Product Details Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onOpenStorefront={(sellerId) => {
            setSelectedProduct(null);
            setSelectedSellerStorefrontId(sellerId);
          }}
        />
      )}

      {/* 2. Mandatory Image Upload & Sell Product Modal */}
      {showSellModal && (
        <SellProductModal
          categories={categories}
          onClose={() => setShowSellModal(false)}
          onSuccess={() => {
            loadCatalogProducts(1);
            loadCategories();
            showToast('Your product was published live on NaijaMart (7-Day Active Period)!');
          }}
          onRequireAuth={() => handleOpenAuth('login', 'seller')}
        />
      )}

      {/* 3. Authentication Modal */}
      {showAuthModal && (
        <AuthModal
          initialMode={authModalMode}
          defaultRole={authModalRole}
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => {
            showToast('Authentication successful! Welcome to NaijaMart.');
            loadCatalogProducts(1);
          }}
        />
      )}

      {/* 4. Seller Dashboard */}
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

      {/* 5. Public Seller Storefront Modal */}
      {selectedSellerStorefrontId && (
        <SellerStorefrontModal
          sellerId={selectedSellerStorefrontId}
          onClose={() => setSelectedSellerStorefrontId(null)}
          onOpenProductDetail={setSelectedProduct}
        />
      )}

      {/* 6. Admin Dashboard */}
      {showAdminDashboard && (
        <AdminDashboard
          onClose={() => setShowAdminDashboard(false)}
          onOpenProductDetail={setSelectedProduct}
        />
      )}

      {/* 7. Safety, Terms & Scam Prevention Modal */}
      {showSafetyModal && (
        <SafetyModal onClose={() => setShowSafetyModal(false)} />
      )}
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
