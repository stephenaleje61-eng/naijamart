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
  Sparkles,
  PhoneCall
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { Category } from '../types.js';

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
}

import { NIGERIA_STATES } from '../constants/states.js';

export const NIGERIAN_STATES = [
  'All Nigeria',
  ...NIGERIA_STATES
];

export const Header: React.FC<HeaderProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  selectedState,
  onSelectState,
  searchQuery,
  onSearchChange,
  onOpenSellModal,
  onOpenAuthModal,
  onOpenSellerDashboard,
  onOpenAdminDashboard,
  onOpenFavourites,
  onOpenSafetyModal
}) => {
  const { user, sellerProfile, favourites, logout } = useAuth();
  const [showLocationMenu, setShowLocationMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery);

  const locationRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  // Click outside listeners
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
    setShowSuggestions(false);
  };

  const sampleSearchTerms = [
    'iPhone 15 Pro Max',
    'MacBook M2',
    'Senator Fabric',
    'Benue Yam',
    'Solar Inverter',
    'Chelsea Boots',
    'PS5 Console'
  ];

  return (
    <header className="sticky top-0 z-40 bg-white shadow-sm border-b border-gray-200">
      {/* Top Announcement Bar (Jumia/Temu inspired) */}
      <div className="bg-[#1C1917] text-white text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-medium">
            <span className="bg-[#008751] text-white text-[10px] font-bold px-1.5 py-0.5 rounded">🇳🇬 NIGERIA</span>
            <span>Direct WhatsApp Deals • 0% Listing Commission • Verified Local Sellers</span>
          </div>
          <div className="flex items-center gap-4 text-gray-300 text-[11px]">
            <button
              onClick={onOpenSafetyModal}
              className="hover:text-white flex items-center gap-1 transition"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#F68B1F]" />
              Buyer Safety & Scam Warnings
            </button>
            <span className="hidden sm:inline text-gray-500">•</span>
            <span className="hidden sm:inline font-mono text-[#F68B1F]">
              ⏳ Automatic 7-Day Fresh Listings
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-3 md:gap-6">
          {/* Logo & Brand Slogan */}
          <div className="flex items-center gap-3 shrink-0">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onSearchChange('');
                onSelectCategory('all');
              }}
              className="flex items-center gap-2 group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#E07A15] to-[#F68B1F] flex items-center justify-center shadow-md shadow-orange-500/20 group-hover:scale-105 transition transform">
                <span className="text-white font-black text-xl tracking-tighter">ZM</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="font-extrabold text-2xl tracking-tight text-[#222222]">
                    ZANGA<span className="text-[#F68B1F]">MARKET</span>
                  </span>
                  <span className="w-2 h-2 rounded-full bg-[#008751]" title="Nigeria"></span>
                </div>
                <span className="text-[10px] font-semibold text-gray-600 tracking-wider hidden sm:block -mt-1">
                  Shop More. Save More. Sell to Everyone.
                </span>
              </div>
            </a>
          </div>

          {/* Delivery Location Selector */}
          <div className="relative hidden lg:block shrink-0" ref={locationRef}>
            <button
              onClick={() => setShowLocationMenu(!showLocationMenu)}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 transition"
            >
              <MapPin className="w-3.5 h-3.5 text-[#F68B1F]" />
              <span className="max-w-[120px] truncate">{selectedState === 'all' ? 'All Nigeria' : selectedState}</span>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>

            {showLocationMenu && (
              <div className="absolute left-0 mt-1 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 max-h-72 overflow-y-auto">
                <div className="px-3 py-1 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                  Select State
                </div>
                {NIGERIAN_STATES.map((st) => {
                  const stateVal = st === 'All Nigeria' ? 'all' : st;
                  return (
                    <button
                      key={st}
                      onClick={() => {
                        onSelectState(stateVal);
                        setShowLocationMenu(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-orange-50 transition ${
                        (selectedState === stateVal || (selectedState === 'all' && st === 'All Nigeria'))
                          ? 'font-bold text-[#F68B1F] bg-orange-50/60'
                          : 'text-gray-700'
                      }`}
                    >
                      {st}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Search Bar with live search input */}
          <div className="flex-1 max-w-2xl relative">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <input
                type="text"
                placeholder="Search products, phones, cars, groceries, electronics..."
                value={localSearch}
                onChange={(e) => {
                  setLocalSearch(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                className="w-full pl-10 pr-24 py-2.5 bg-gray-50 hover:bg-white focus:bg-white border-2 border-gray-200 focus:border-[#F68B1F] rounded-full text-sm text-[#222222] placeholder-gray-600 transition outline-none"
              />
              <Search className="w-4 h-4 text-gray-600 absolute left-3.5" />
              <button
                type="submit"
                className="absolute right-1.5 px-4 py-1.5 bg-[#F68B1F] hover:bg-[#E07A15] text-white text-xs font-bold rounded-full transition shadow-sm"
              >
                Search
              </button>
            </form>

            {/* Quick search suggestions popup */}
            {showSuggestions && (
              <div
                className="absolute left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-2xl border border-gray-100 p-3 z-50"
                onMouseLeave={() => setShowSuggestions(false)}
              >
                <div className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-2">
                  Popular Searches Across Nigeria:
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {sampleSearchTerms.map((term) => (
                    <button
                      key={term}
                      onClick={() => {
                        setLocalSearch(term);
                        onSearchChange(term);
                        setShowSuggestions(false);
                      }}
                      className="px-2.5 py-1 text-xs bg-gray-100 hover:bg-orange-50 hover:text-[#F68B1F] rounded-lg text-gray-700 transition"
                    >
                      {term}
                    </button>
                  ))}
                </div>
                {localSearch && (
                  <button
                    onClick={() => {
                      onSearchChange(localSearch);
                      setShowSuggestions(false);
                    }}
                    className="w-full text-left pt-2 border-t border-gray-100 text-xs text-[#F68B1F] font-semibold hover:underline flex items-center gap-1"
                  >
                    <Search className="w-3.5 h-3.5" />
                    Press enter or click to search for "{localSearch}"
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* SELL ON NAIJAMART Button (Orange CTA) */}
            <button
              onClick={onOpenSellModal}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-[#F68B1F] to-[#FF7A00] hover:from-[#E07A15] hover:to-[#F68B1F] text-white font-bold text-xs sm:text-sm rounded-full shadow-md shadow-orange-500/25 active:scale-95 transition"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">Sell Product</span>
            </button>

            {/* Favourites */}
            <button
              onClick={onOpenFavourites}
              className="p-2 sm:px-3 sm:py-2 text-gray-700 hover:text-[#F68B1F] hover:bg-orange-50 rounded-full flex items-center gap-1.5 transition relative"
              title="Saved Items"
            >
              <Heart className="w-5 h-5 text-gray-600" />
              {favourites.length > 0 && (
                <span className="absolute top-1 right-1 sm:static bg-[#F68B1F] text-white text-[10px] font-black px-1.5 py-0.2 rounded-full min-w-4 text-center">
                  {favourites.length}
                </span>
              )}
              <span className="hidden md:inline text-xs font-semibold">Saved</span>
            </button>

            {/* User Account Menu */}
            <div className="relative" ref={userMenuRef}>
              {user ? (
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-full hover:bg-gray-100 transition border border-gray-200"
                >
                  <div className="w-7 h-7 rounded-full bg-[#F68B1F]/20 text-[#E07A15] font-bold text-xs flex items-center justify-center">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold text-gray-800 max-w-[90px] truncate hidden sm:inline">
                    {user.name.split(' ')[0]}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                </button>
              ) : (
                <button
                  onClick={() => onOpenAuthModal('login')}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#222222] hover:text-[#F68B1F] rounded-lg transition"
                >
                  <UserIcon className="w-4 h-4 text-gray-600" />
                  <span className="hidden sm:inline">Sign In</span>
                </button>
              )}

              {/* User Dropdown */}
              {showUserMenu && user && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-xs font-bold text-gray-900 truncate">{user.name}</p>
                    <p className="text-[11px] text-gray-500 truncate">{user.email}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-orange-100 text-[#E07A15]">
                        {user.role}
                      </span>
                      {sellerProfile?.isVerified && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-0.5">
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
                        className="w-full text-left px-4 py-2.5 text-xs text-gray-700 hover:bg-orange-50 hover:text-[#F68B1F] flex items-center gap-2 font-medium transition"
                      >
                        <Store className="w-4 h-4 text-[#F68B1F]" />
                        Seller Dashboard & Listings
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenAuthModal('register', 'seller');
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs text-[#F68B1F] hover:bg-orange-50 flex items-center gap-2 font-bold transition"
                      >
                        <Store className="w-4 h-4 text-[#F68B1F]" />
                        Upgrade to Seller Account
                      </button>
                    )}

                    {user.role === 'admin' && (
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenAdminDashboard();
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs text-purple-700 hover:bg-purple-50 flex items-center gap-2 font-bold transition"
                      >
                        <LayoutDashboard className="w-4 h-4 text-purple-600" />
                        Admin Moderation Desk
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenFavourites();
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition"
                    >
                      <Heart className="w-4 h-4 text-gray-500" />
                      Saved Favourites ({favourites.length})
                    </button>

                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenSafetyModal();
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition"
                    >
                      <ShieldCheck className="w-4 h-4 text-gray-500" />
                      Safety & Scam Prevention
                    </button>
                  </div>

                  <div className="border-t border-gray-100 pt-1 mt-1">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-semibold transition"
                    >
                      <LogOut className="w-4 h-4 text-red-500" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
