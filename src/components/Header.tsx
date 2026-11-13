import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  MapPin,
  Heart,
  User as UserIcon,
  PlusCircle,
  ShieldCheck,
  ChevronDown,
  LogOut,
  Store,
  LayoutDashboard,
  ShoppingCart,
  Download
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { Category } from '../types.js';
import { NIGERIA_STATES } from '../constants/states.js';
import { usePWAInstall } from '../hooks/usePWAInstall.js';
import { AppView } from './BottomNav.js';

interface HeaderProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (catId: string) => void;
  selectedState: string;
  onSelectState: (state: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenSellModal: () => void;
  onOpenAuthModal: (mode?: 'login' | 'register', defaultRole?: 'buyer' | 'seller') => void;
  onOpenSellerDashboard: () => void;
  onOpenAdminDashboard: () => void;
  onOpenFavourites: () => void;
  onOpenSafetyModal: () => void;
  onOpenCart: () => void;
  cartCount: number;
  onNavigateView: (view: AppView) => void;
  onTriggerPWAHelp: () => void;
  activeView: AppView;
}

export const NIGERIAN_STATES = ['All Locations', 'Taraba', ...NIGERIA_STATES.filter((s) => s !== 'Taraba')];

export const Header: React.FC<HeaderProps> = ({
  selectedState,
  onSelectState,
  searchQuery,
  onSearchChange,
  onOpenSellModal,
  onOpenAuthModal,
  onOpenSellerDashboard,
  onOpenAdminDashboard,
  onOpenFavourites,
  onOpenSafetyModal,
  onOpenCart,
  cartCount,
  onNavigateView,
  onTriggerPWAHelp,
  activeView
}) => {
  const { user, sellerProfile, favourites, logout } = useAuth();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showLocationMenu, setShowLocationMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery);

  const locationRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (locationRef.current && !locationRef.current.contains(e.target as Node)) {
        setShowLocationMenu(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchChange(localSearch);
    if (activeView !== 'marketplace') {
      onNavigateView('marketplace');
    }
  };

  const handleInstallClick = async () => {
    if (isInstallable) {
      const outcome = await install();
      if (outcome === 'unavailable') {
        onTriggerPWAHelp();
      }
    } else {
      onTriggerPWAHelp();
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#121212] border-b border-[#333333] shadow-lg">
      {/* Top Announcement Bar */}
      <div className="bg-[#000000] border-b border-[#333333] text-white text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-medium text-[#BDBDBD]">
            <span className="bg-[#FFFFFF] text-black text-[10px] font-black px-1.5 py-0.5 rounded">
              FUWUKARI
            </span>
            <span>Your Campus. Your Marketplace. Your Opportunities.</span>
          </div>
          <div className="flex items-center gap-4 text-[#BDBDBD] text-[11px]">
            <button
              onClick={onOpenSafetyModal}
              className="hover:text-white flex items-center gap-1 transition"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#FFFFFF]" />
              Campus Buyer Safety
            </button>
            {!isInstalled && (
              <button
                type="button"
                onClick={handleInstallClick}
                className="text-[#FFFFFF] hover:underline font-bold flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isIOS ? 'Install on iPhone' : 'Install FU MARKET App'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Navigation Row */}
      <div className="max-w-7xl mx-auto px-4 py-3 space-y-2.5">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onSearchChange('');
              onNavigateView('marketplace');
            }}
            className="flex items-center gap-2.5 shrink-0 group"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#FFFFFF] flex items-center justify-center shadow-md group-hover:scale-105 transition">
              <span className="text-black font-black text-base sm:text-lg tracking-tighter">FU</span>
            </div>
            <div className="flex flex-col">
              <span className="font-black text-lg sm:text-xl tracking-tight text-white">
                FU <span className="text-[#FFFFFF]">MARKET</span>
              </span>
              <span className="text-[10px] font-semibold text-[#BDBDBD] hidden sm:block -mt-0.5">
                FUWUKARI Student Marketplace
              </span>
            </div>
          </a>

          {/* Location Selector */}
          <div className="relative hidden lg:block shrink-0" ref={locationRef}>
            <button
              type="button"
              onClick={() => setShowLocationMenu(!showLocationMenu)}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#1C1C1C] hover:border-[#FFFFFF] border border-[#333333] rounded-xl text-xs font-medium text-white transition"
            >
              <MapPin className="w-3.5 h-3.5 text-[#FFFFFF]" />
              <span className="max-w-[115px] truncate">
                {selectedState === 'all' ? 'All Locations' : selectedState}
              </span>
              <ChevronDown className="w-3 h-3 text-[#BDBDBD]" />
            </button>

            {showLocationMenu && (
              <div className="absolute left-0 mt-1 w-52 bg-[#1C1C1C] rounded-xl shadow-2xl border border-[#333333] py-2 z-50 max-h-72 overflow-y-auto">
                <div className="px-3 py-1 text-[10px] font-bold text-[#BDBDBD] uppercase tracking-wider">
                  Select State
                </div>
                {NIGERIAN_STATES.map((st) => {
                  const stateVal = st === 'All Locations' ? 'all' : st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        onSelectState(stateVal);
                        setShowLocationMenu(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[#121212] transition ${
                        selectedState === stateVal || (selectedState === 'all' && st === 'All Locations')
                          ? 'font-bold text-[#FFFFFF] bg-[#121212]'
                          : 'text-[#BDBDBD]'
                      }`}
                    >
                      {st}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Real Search Input (zero fake suggestion terms) */}
          <div className="flex-1 max-w-xl">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <input
                type="text"
                placeholder="Search products on FU MARKET..."
                value={localSearch}
                onChange={(e) => {
                  setLocalSearch(e.target.value);
                  onSearchChange(e.target.value);
                }}
                className="w-full pl-9 pr-20 py-2 bg-[#1C1C1C] border border-[#333333] focus:border-[#FFFFFF] rounded-full text-xs sm:text-sm text-white placeholder-[#BDBDBD]/70 transition outline-none"
              />
              <Search className="w-4 h-4 text-[#BDBDBD] absolute left-3" />
              <button
                type="submit"
                className="absolute right-1 px-3.5 py-1 bg-[#FFFFFF] hover:bg-[#E5E5E5] text-black text-xs font-black rounded-full transition"
              >
                Search
              </button>
            </form>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenSellModal}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#FFFFFF] hover:bg-[#E5E5E5] text-black font-black text-xs rounded-full active:scale-95 transition"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Sell Item</span>
            </button>

            {/* Cart Button */}
            <button
              type="button"
              onClick={onOpenCart}
              className="p-2 sm:px-3 sm:py-2 bg-[#1C1C1C] border border-[#333333] hover:border-[#FFFFFF] text-white rounded-full flex items-center gap-1.5 transition relative"
              title="Review Cart & Order"
            >
              <ShoppingCart className="w-4 h-4 text-[#FFFFFF]" />
              {cartCount > 0 && (
                <span className="bg-[#FFFFFF] text-black text-[10px] font-black px-1.5 rounded-full min-w-4 text-center">
                  {cartCount}
                </span>
              )}
              <span className="hidden lg:inline text-xs font-bold">Cart</span>
            </button>

            {/* Saved Items */}
            <button
              type="button"
              onClick={onOpenFavourites}
              className="p-2 bg-[#1C1C1C] border border-[#333333] hover:border-[#FFFFFF] text-[#BDBDBD] hover:text-white rounded-full flex items-center gap-1 transition relative"
              title="Saved Items"
            >
              <Heart className="w-4 h-4" />
              {favourites.length > 0 && (
                <span className="bg-red-600 text-white text-[10px] font-black px-1.5 rounded-full min-w-4 text-center">
                  {favourites.length}
                </span>
              )}
            </button>

            {/* User Account Menu */}
            <div className="relative" ref={userMenuRef}>
              {user ? (
                <button
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#1C1C1C] border border-[#333333] hover:border-[#FFFFFF] transition"
                >
                  <div className="w-6 h-6 rounded-full bg-[#FFFFFF] text-black font-black text-xs flex items-center justify-center">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold text-white max-w-[80px] truncate hidden sm:inline">
                    {user.name.split(' ')[0]}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#BDBDBD]" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenAuthModal('login')}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#1C1C1C] border border-[#333333] hover:border-[#FFFFFF] text-xs font-bold text-white rounded-full transition"
                >
                  <UserIcon className="w-3.5 h-3.5 text-[#FFFFFF]" />
                  <span className="hidden sm:inline">Sign In</span>
                </button>
              )}

              {showUserMenu && user && (
                <div className="absolute right-0 mt-2 w-64 bg-[#1C1C1C] rounded-2xl shadow-2xl border border-[#333333] py-2 z-50">
                  <div className="px-4 py-3 border-b border-[#333333]">
                    <p className="text-xs font-bold text-white truncate">{user.name}</p>
                    <p className="text-[11px] text-[#BDBDBD] truncate">{user.email}</p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-[#FFFFFF]/15 text-[#FFFFFF] border border-[#FFFFFF]/40">
                        {user.role}
                      </span>
                      {sellerProfile?.isVerified && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700 flex items-center gap-0.5">
                          <ShieldCheck className="w-3 h-3" /> Verified
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="py-1">
                    {user.role === 'seller' || user.role === 'admin' ? (
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenSellerDashboard();
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs text-white hover:bg-[#121212] hover:text-[#FFFFFF] flex items-center gap-2 font-medium transition"
                      >
                        <Store className="w-4 h-4 text-[#FFFFFF]" />
                        Seller Dashboard &amp; Listings
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenAuthModal('register', 'seller');
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs text-[#FFFFFF] hover:bg-[#121212] flex items-center gap-2 font-bold transition"
                      >
                        <Store className="w-4 h-4 text-[#FFFFFF]" />
                        Upgrade to Seller Account
                      </button>
                    )}

                    {user.role === 'admin' && (
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenAdminDashboard();
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs text-[#FFFFFF] hover:bg-[#121212] flex items-center gap-2 font-bold transition"
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        Admin Moderation Desk
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenFavourites();
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-[#BDBDBD] hover:text-white hover:bg-[#121212] flex items-center gap-2 transition"
                    >
                      <Heart className="w-4 h-4" />
                      Saved Favourites ({favourites.length})
                    </button>

                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenSafetyModal();
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-[#BDBDBD] hover:text-white hover:bg-[#121212] flex items-center gap-2 transition"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Safety &amp; Scam Prevention
                    </button>
                  </div>

                  <div className="border-t border-[#333333] pt-1 mt-1">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-red-400 hover:bg-red-950/50 flex items-center gap-2 font-semibold transition"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Campus Sections Sub-Navigation Bar */}
        <div className="hidden sm:flex items-center gap-2 overflow-x-auto pb-0.5 text-xs font-bold">
          {[
            { id: 'marketplace' as AppView, label: 'Marketplace' },
            { id: 'requests' as AppView, label: 'What Students Need' },
            { id: 'hux' as AppView, label: 'Wukari Agent' },
            { id: 'hub' as AppView, label: 'Single Hub' },
            { id: 'friends' as AppView, label: 'Messaging' },
            { id: 'bike-riders' as AppView, label: 'Bike Man' }
          ].map((nav) => (
            <button
              key={nav.id}
              type="button"
              onClick={() => onNavigateView(nav.id)}
              className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap ${
                activeView === nav.id
                  ? 'bg-[#FFFFFF] text-black font-black'
                  : 'bg-[#1C1C1C] text-[#BDBDBD] border border-[#333333] hover:text-white hover:border-[#FFFFFF]/60'
              }`}
            >
              {nav.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
