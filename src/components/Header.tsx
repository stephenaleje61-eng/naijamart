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
    <header className="sticky top-0 z-40 bg-[#0B6B3A] text-white shadow-md">
      {/* Top FUWUKARI Strip */}
      <div className="bg-[#14532D] border-b border-white/15 text-white text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-semibold">
            <span className="bg-[#F2B90D] text-[#111111] text-[10px] font-black px-2 py-0.5 rounded">
              FUWUKARI
            </span>
            <span className="text-white/95 truncate">
              Made for FUWUKARI Students • Wukari, Taraba State
            </span>
          </div>
          <div className="flex items-center gap-4 text-white/90 text-[11px]">
            <button
              type="button"
              onClick={onOpenSafetyModal}
              className="hover:text-[#F2B90D] flex items-center gap-1 font-semibold transition"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#F2B90D]" />
              <span>Safe Campus Trade</span>
            </button>
            {!isInstalled && (
              <button
                type="button"
                onClick={handleInstallClick}
                className="text-[#F2B90D] hover:text-[#FFC107] font-bold flex items-center gap-1 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isIOS ? 'Install on iPhone' : 'Get WukariMart App'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Navigation Row */}
      <div className="max-w-7xl mx-auto px-4 py-3 space-y-2.5">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* WukariMart Logo in Gold */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onSearchChange('');
              onNavigateView('marketplace');
            }}
            className="flex items-center gap-2.5 shrink-0 group"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#F2B90D] flex items-center justify-center shadow group-hover:scale-105 transition">
              <span className="text-[#111111] font-black text-base sm:text-lg tracking-tighter">WM</span>
            </div>
            <div className="flex flex-col">
              <span className="font-display font-black text-lg sm:text-2xl tracking-tight text-[#F2B90D] leading-none">
                WukariMart
              </span>
              <span className="text-[10px] font-semibold text-white/90 hidden sm:block mt-0.5">
                FUWUKARI Student Marketplace
              </span>
            </div>
          </a>

          {/* Location Selector */}
          <div className="relative hidden lg:block shrink-0" ref={locationRef}>
            <button
              type="button"
              onClick={() => setShowLocationMenu(!showLocationMenu)}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#14532D] hover:bg-[#14532D]/90 border border-white/25 rounded-xl text-xs font-semibold text-white transition"
            >
              <MapPin className="w-3.5 h-3.5 text-[#F2B90D]" />
              <span className="max-w-[115px] truncate">
                {selectedState === 'all' ? 'All Locations' : selectedState}
              </span>
              <ChevronDown className="w-3 h-3 text-white/80" />
            </button>

            {showLocationMenu && (
              <div className="absolute left-0 mt-1 w-52 bg-white rounded-xl shadow-2xl border border-[#E5E7EB] py-2 z-50 max-h-72 overflow-y-auto">
                <div className="px-3 py-1 text-[10px] font-bold text-[#555555] uppercase tracking-wider">
                  Select Location
                </div>
                {NIGERIAN_STATES.map((st) => {
                  const stateVal = st === 'All Locations' ? 'all' : st;
                  const active = selectedState === stateVal || (selectedState === 'all' && st === 'All Locations');
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        onSelectState(stateVal);
                        setShowLocationMenu(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[#F5F5F5] transition ${
                        active ? 'font-black text-[#0B6B3A] bg-[#F5F5F5]' : 'text-[#111111]'
                      }`}
                    >
                      {st}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-xl">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <input
                type="text"
                placeholder="Search hostel items, textbooks, food, phones..."
                value={localSearch}
                onChange={(e) => {
                  setLocalSearch(e.target.value);
                  onSearchChange(e.target.value);
                }}
                className="w-full pl-9 pr-22 py-2.5 bg-white border border-transparent focus:border-[#F2B90D] rounded-xl text-xs sm:text-sm text-[#111111] placeholder-[#666666] shadow-sm transition outline-none"
              />
              <Search className="w-4 h-4 text-[#0B6B3A] absolute left-3" />
              <button
                type="submit"
                className="absolute right-1 px-3.5 py-1.5 bg-[#F2B90D] hover:bg-[#FFC107] text-[#111111] text-xs font-black rounded-lg transition"
              >
                Search
              </button>
            </form>
          </div>

          {/* Action CTAs: Sell, Cart, Saved, Login */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenSellModal}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#F2B90D] hover:bg-[#FFC107] text-[#111111] font-black text-xs rounded-xl shadow active:scale-95 transition"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Post Item</span>
            </button>

            {/* Cart Icon */}
            <button
              type="button"
              onClick={onOpenCart}
              className="p-2 sm:px-3 sm:py-2 bg-[#14532D] hover:bg-[#14532D]/80 border border-white/25 text-white rounded-xl flex items-center gap-1.5 transition relative"
              title="Shopping Cart"
              aria-label="Shopping Cart"
            >
              <ShoppingCart className="w-4 h-4 text-[#F2B90D]" />
              {cartCount > 0 && (
                <span className="bg-[#F2B90D] text-[#111111] text-[10px] font-black px-1.5 rounded-full min-w-4 text-center">
                  {cartCount}
                </span>
              )}
              <span className="hidden lg:inline text-xs font-bold">Cart</span>
            </button>

            {/* Saved Items */}
            <button
              type="button"
              onClick={onOpenFavourites}
              className="p-2 bg-[#14532D] hover:bg-[#14532D]/80 border border-white/25 text-white rounded-xl flex items-center gap-1 transition relative"
              title="Saved Items"
              aria-label="Saved Items"
            >
              <Heart className="w-4 h-4 text-[#F2B90D]" />
              {favourites.length > 0 && (
                <span className="bg-[#F2B90D] text-[#111111] text-[10px] font-black px-1.5 rounded-full min-w-4 text-center">
                  {favourites.length}
                </span>
              )}
            </button>

            {/* Login / Account Menu */}
            <div className="relative" ref={userMenuRef}>
              {user ? (
                <button
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white text-[#111111] font-bold shadow-sm hover:bg-[#F5F5F5] transition"
                >
                  <div className="w-6 h-6 rounded-lg bg-[#0B6B3A] text-[#F2B90D] font-black text-xs flex items-center justify-center">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-bold text-[#111111] max-w-[80px] truncate hidden sm:inline">
                    {user.name.split(' ')[0]}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#555555]" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenAuthModal('login')}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-[#F5F5F5] text-[#0B6B3A] text-xs font-black rounded-xl shadow-sm transition"
                >
                  <UserIcon className="w-3.5 h-3.5 text-[#0B6B3A]" />
                  <span>Login</span>
                </button>
              )}

              {showUserMenu && user && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-[#E5E7EB] py-2 z-50 text-[#111111]">
                  <div className="px-4 py-3 border-b border-[#E5E7EB]">
                    <p className="text-xs font-black text-[#111111] truncate">{user.name}</p>
                    <p className="text-[11px] text-[#555555] truncate">{user.email}</p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase bg-[#0B6B3A] text-[#F2B90D]">
                        {user.role}
                      </span>
                      {sellerProfile?.isVerified && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F5F5F5] text-[#0B6B3A] border border-[#0B6B3A]/30 flex items-center gap-0.5">
                          <ShieldCheck className="w-3 h-3" /> Verified
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="py-1">
                    {user.role === 'seller' || user.role === 'admin' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenSellerDashboard();
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs text-[#111111] hover:bg-[#F5F5F5] flex items-center gap-2 font-bold transition"
                      >
                        <Store className="w-4 h-4 text-[#0B6B3A]" />
                        Seller Dashboard &amp; Listings
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenAuthModal('register', 'seller');
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs text-[#0B6B3A] hover:bg-[#F5F5F5] flex items-center gap-2 font-black transition"
                      >
                        <Store className="w-4 h-4 text-[#0B6B3A]" />
                        Become a Campus Seller
                      </button>
                    )}

                    {user.role === 'admin' && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenAdminDashboard();
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs text-[#0B6B3A] hover:bg-[#F5F5F5] flex items-center gap-2 font-black transition"
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        Admin Moderation Desk
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenFavourites();
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-[#333333] hover:text-[#111111] hover:bg-[#F5F5F5] flex items-center gap-2 transition"
                    >
                      <Heart className="w-4 h-4 text-[#F2B90D]" />
                      Saved Favourites ({favourites.length})
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenSafetyModal();
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-[#333333] hover:text-[#111111] hover:bg-[#F5F5F5] flex items-center gap-2 transition"
                    >
                      <ShieldCheck className="w-4 h-4 text-[#0B6B3A]" />
                      Safety &amp; Scam Prevention
                    </button>
                  </div>

                  <div className="border-t border-[#E5E7EB] pt-1 mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-[#111111] hover:bg-[#F5F5F5] flex items-center gap-2 font-bold transition"
                    >
                      <LogOut className="w-4 h-4 text-[#14532D]" />
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
              className={`px-3.5 py-1.5 rounded-xl transition whitespace-nowrap ${
                activeView === nav.id
                  ? 'bg-[#F2B90D] text-[#111111] font-black shadow-sm'
                  : 'bg-[#14532D] text-white/95 border border-white/15 hover:bg-white/15'
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
