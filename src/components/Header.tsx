import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Heart,
  User as UserIcon,
  PlusCircle,
  ShieldCheck,
  ChevronDown,
  LogOut,
  Store,
  LayoutDashboard,
  ShoppingCart,
  Download,
  PartyPopper,
  Sliders,
  Megaphone,
  Briefcase,
  Siren,
  GraduationCap,
  UserCog,
  Bell,
  Crown,
  Globe,
  Menu,
  X,
  BookOpen,
  Gift,
  Calculator,
  Home,
  Utensils,
  MessageSquare,
  Trophy,
  ClipboardList,
  Bike,
  ShoppingBag
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { Category, Institution } from '../types.js';
import { NIGERIA_STATES } from '../constants/states.js';
import { usePWAInstall } from '../hooks/usePWAInstall.js';
import { AppView } from './BottomNav.js';
import { SafetyTickerBanner } from './SafetyTickerBanner.js';
import { isAuthorizedCeo } from '../services/events.js';
import { getCeoAdsWhatsAppUrl } from '../services/ads.js';

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
  onOpenCeoEventsDashboard?: () => void;
  onOpenCeoMasterControl?: () => void;
  onOpenCeoSuperAdmin?: () => void;
  onOpenAdvertiseModal?: () => void;
  onOpenServicesSection?: () => void;
  onOpenEventsSection?: () => void;
  onOpenEmergencySection?: () => void;
  onOpenFavourites: () => void;
  onOpenSafetyModal: () => void;
  onOpenCart: () => void;
  cartCount: number;
  onNavigateView: (view: AppView) => void;
  onTriggerPWAHelp: () => void;
  activeView: AppView;
  activeInstitution?: Institution;
  activeCampus?: string;
  onOpenInstitutionSwitcher?: () => void;
  onSelectInstitutionQuick?: (institutionId: string) => void;
  onOpenUserProfile?: () => void;
  unreadNotificationsCount?: number;
  onOpenNotifications?: () => void;
  onOpenNationwideSearch?: () => void;
  onOpenSubscriptions?: () => void;
  onOpenDownloadApp?: () => void;
  onOpenPostServiceModal?: () => void;
}

export const NIGERIAN_STATES = ['All Locations', 'Taraba', ...NIGERIA_STATES.filter((s) => s !== 'Taraba')];

type NavDropdownKey = 'marketplace' | 'universities' | 'services' | 'more' | 'user' | null;

const QUICK_UNIVERSITIES = [
  { id: 'fuwukari', label: 'FUWUKARI — Wukari' },
  { id: 'unilag', label: 'UNILAG — Lagos' },
  { id: 'ui', label: 'UI — Ibadan' },
  { id: 'abu', label: 'ABU — Zaria' },
  { id: 'unn', label: 'UNN — Nsukka' },
  { id: 'oau', label: 'OAU — Ile-Ife' }
];

export const Header: React.FC<HeaderProps> = ({
  categories,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  onOpenSellModal,
  onOpenAuthModal,
  onOpenSellerDashboard,
  onOpenAdminDashboard,
  onOpenCeoEventsDashboard,
  onOpenCeoMasterControl,
  onOpenCeoSuperAdmin,
  onOpenAdvertiseModal,
  onOpenServicesSection,
  onOpenEventsSection,
  onOpenEmergencySection,
  onOpenFavourites,
  onOpenSafetyModal,
  onOpenCart,
  cartCount,
  onNavigateView,
  onTriggerPWAHelp,
  activeView,
  activeInstitution,
  activeCampus,
  onOpenInstitutionSwitcher,
  onSelectInstitutionQuick,
  onOpenUserProfile,
  unreadNotificationsCount = 0,
  onOpenNotifications,
  onOpenNationwideSearch,
  onOpenSubscriptions,
  onOpenDownloadApp,
  onOpenPostServiceModal
}) => {
  const { user, sellerProfile, favourites, logout } = useAuth();
  const isCeo = isAuthorizedCeo(user);
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [openDropdown, setOpenDropdown] = useState<NavDropdownKey>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery);

  const headerContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (headerContainerRef.current && !headerContainerRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenDropdown(null);
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
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

  const toggleDropdown = (key: NavDropdownKey) => {
    setOpenDropdown((prev) => (prev === key ? null : key));
  };

  const instShort = activeInstitution?.shortName || 'ALL CAMPUSES';
  const instName = activeInstitution?.name || 'All Nigerian Universities & Polytechnics';
  const instLocation = activeInstitution
    ? `${activeCampus || activeInstitution.campus} · ${activeInstitution.state} State`
    : 'Nationwide Campus Network';

  const navBtnClass = (active: boolean) =>
    `px-2.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap shrink-0 inline-flex items-center gap-1 cursor-pointer ${
      active
        ? 'bg-[#D4A62A] text-[#10251D] font-black shadow-xs'
        : 'text-white/95 hover:bg-white/12 hover:text-[#D4A62A]'
    }`;

  return (
    <header ref={headerContainerRef} className="sticky top-0 z-40 bg-[#087443] text-white shadow-md">
      <SafetyTickerBanner />

      {/* Active Campus Context Utility Bar */}
      <div className="bg-[#10251D] border-b border-white/15 text-white text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-semibold min-w-0">
            <span className="bg-[#D4A62A] text-[#10251D] text-[10px] font-black px-2 py-0.5 rounded shrink-0 whitespace-nowrap">
              {instShort}
            </span>
            <span className="text-white/95 truncate max-w-[200px] sm:max-w-md" title={instName}>
              {instName} · {instLocation}
            </span>
            {onOpenInstitutionSwitcher && (
              <button
                type="button"
                onClick={onOpenInstitutionSwitcher}
                className="ml-1 inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-white/10 hover:bg-[#D4A62A] text-[#D4A62A] hover:text-[#10251D] text-[10px] font-black transition shrink-0 whitespace-nowrap cursor-pointer"
              >
                <GraduationCap className="w-3 h-3 shrink-0" />
                <span>Switch Campus</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3.5 text-white/90 text-[11px] flex-wrap">
            {onOpenNationwideSearch && (
              <button
                type="button"
                onClick={onOpenNationwideSearch}
                className="hover:text-[#D4A62A] flex items-center gap-1 font-bold transition whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5 text-[#D4A62A]" />
                <span className="hidden sm:inline">Nationwide Search</span>
              </button>
            )}
            {onOpenSubscriptions && (
              <button
                type="button"
                onClick={onOpenSubscriptions}
                className="hover:text-[#D4A62A] flex items-center gap-1 font-bold transition whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Crown className="w-3.5 h-3.5 text-[#D4A62A]" />
                <span>Plans</span>
              </button>
            )}
            {onOpenEmergencySection && (
              <button
                type="button"
                onClick={onOpenEmergencySection}
                className="bg-[#DC2626] hover:bg-[#B91C1C] text-white px-2.5 py-0.5 rounded-md font-black flex items-center gap-1 transition whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Siren className="w-3 h-3" />
                <span>Safety &amp; Scam Report</span>
              </button>
            )}
            {(!isInstalled || Boolean(onOpenDownloadApp)) && (
              <button
                type="button"
                onClick={() => (onOpenDownloadApp ? onOpenDownloadApp() : handleInstallClick())}
                className="text-[#D4A62A] hover:text-[#E0B43B] font-bold hidden sm:flex items-center gap-1 transition whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isIOS ? 'iPhone App' : 'Install App'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Single-Row Navigation Header */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5">
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          {/* Logo & Brand Name */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              setOpenDropdown(null);
              onSearchChange('');
              onNavigateView('home');
            }}
            className="flex items-center gap-2 shrink-0 group"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white p-0.5 flex items-center justify-center shadow-sm border-2 border-[#D4A62A] group-hover:scale-105 transition overflow-hidden shrink-0">
              <img
                src="/pwa-192x192.png"
                alt="NIGERIA CAMPUS MARKET Logo"
                width={40}
                height={40}
                decoding="async"
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-black text-sm sm:text-base tracking-tight text-white leading-none whitespace-nowrap">
                NIGERIA <span className="text-[#D4A62A]">CAMPUS MARKET</span>
              </span>
              <span className="text-[9px] font-bold tracking-wider text-white/85 hidden 2xl:block mt-0.5 whitespace-nowrap">
                Buy. Sell. Connect. Grow Across Nigerian Campuses.
              </span>
            </div>
          </a>

          {/* Primary Desktop Dropdown Navigation */}
          <nav aria-label="Primary Navigation" className="hidden lg:flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                setOpenDropdown(null);
                onNavigateView('home');
              }}
              className={navBtnClass(activeView === 'home' && openDropdown === null)}
            >
              Home
            </button>

            {/* Marketplace Dropdown */}
            <div className="relative">
              <button
                type="button"
                aria-expanded={openDropdown === 'marketplace'}
                onClick={() => toggleDropdown('marketplace')}
                className={navBtnClass(activeView === 'marketplace' || openDropdown === 'marketplace')}
              >
                <span>Marketplace</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {openDropdown === 'marketplace' && (
                <div className="absolute left-0 mt-2 w-60 bg-white text-[#10251D] rounded-2xl shadow-2xl border border-[#D9E5DF] py-2 z-50">
                  <button
                    type="button"
                    onClick={() => {
                      setOpenDropdown(null);
                      onSelectCategory('all');
                      onNavigateView('marketplace');
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-black text-[#087443] hover:bg-[#F4F8F5] flex items-center gap-2"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Browse All Campus Items</span>
                  </button>
                  <div className="px-3.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#10251D]/55 border-t border-[#F4F8F5] mt-1">
                    Popular Categories
                  </div>
                  {categories.slice(0, 6).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setOpenDropdown(null);
                        onSelectCategory(cat.id);
                        onNavigateView('marketplace');
                      }}
                      className="w-full text-left px-3.5 py-1.5 text-xs font-bold hover:bg-[#F4F8F5] flex items-center justify-between"
                    >
                      <span className="truncate">{cat.name}</span>
                      <span className="text-[10px] text-[#087443] font-black tabular-nums">
                        {cat.productCount || 0}
                      </span>
                    </button>
                  ))}
                  <div className="border-t border-[#F4F8F5] mt-1 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setOpenDropdown(null);
                        onOpenSellModal();
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-black text-[#087443] hover:bg-[#F4F8F5] flex items-center gap-2"
                    >
                      <PlusCircle className="w-4 h-4 text-[#D4A62A]" />
                      <span>Sell an Item for Free</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenDropdown(null);
                        onNavigateView('orders');
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-[#F4F8F5] flex items-center gap-2"
                    >
                      <ClipboardList className="w-4 h-4 text-[#087443]" />
                      <span>My Orders &amp; Tracking</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Universities Dropdown */}
            <div className="relative">
              <button
                type="button"
                aria-expanded={openDropdown === 'universities'}
                onClick={() => toggleDropdown('universities')}
                className={navBtnClass(openDropdown === 'universities')}
              >
                <span>Universities</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {openDropdown === 'universities' && (
                <div className="absolute left-0 mt-2 w-64 bg-white text-[#10251D] rounded-2xl shadow-2xl border border-[#D9E5DF] py-2 z-50">
                  <button
                    type="button"
                    onClick={() => {
                      setOpenDropdown(null);
                      onOpenInstitutionSwitcher?.();
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-black text-[#087443] hover:bg-[#F4F8F5] flex items-center gap-2"
                  >
                    <GraduationCap className="w-4 h-4 text-[#D4A62A]" />
                    <span>Explore All Nigerian Institutions</span>
                  </button>
                  {onOpenNationwideSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setOpenDropdown(null);
                        onOpenNationwideSearch();
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-[#F4F8F5] flex items-center gap-2"
                    >
                      <Globe className="w-4 h-4 text-[#087443]" />
                      <span>Nationwide Cross-Campus Search</span>
                    </button>
                  )}
                  <div className="px-3.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#10251D]/55 border-t border-[#F4F8F5] mt-1">
                    Popular Campuses
                  </div>
                  {QUICK_UNIVERSITIES.map((uni) => (
                    <button
                      key={uni.id}
                      type="button"
                      onClick={() => {
                        setOpenDropdown(null);
                        if (onSelectInstitutionQuick) {
                          onSelectInstitutionQuick(uni.id);
                        } else {
                          onOpenInstitutionSwitcher?.();
                        }
                      }}
                      className={`w-full text-left px-3.5 py-1.5 text-xs font-bold hover:bg-[#F4F8F5] flex items-center justify-between ${
                        activeInstitution?.id === uni.id ? 'bg-[#F4F8F5] text-[#087443] font-black' : ''
                      }`}
                    >
                      <span>{uni.label}</span>
                      {activeInstitution?.id === uni.id && (
                        <span className="text-[10px] font-black text-[#D4A62A]">ACTIVE</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Student Services Dropdown */}
            <div className="relative">
              <button
                type="button"
                aria-expanded={openDropdown === 'services'}
                onClick={() => toggleDropdown('services')}
                className={navBtnClass(
                  ['hux', 'food', 'jobs', 'books', 'gpa', 'deals', 'bike-riders'].includes(activeView) ||
                    openDropdown === 'services'
                )}
              >
                <span>Student Services</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {openDropdown === 'services' && (
                <div className="absolute left-0 mt-2 w-64 bg-white text-[#10251D] rounded-2xl shadow-2xl border border-[#D9E5DF] py-2 z-50">
                  <div className="px-3.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#087443] border-b border-[#F4F8F5]">
                    Student Services Hub
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenDropdown(null);
                      onNavigateView('hux');
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-[#F4F8F5] flex items-center gap-2.5"
                  >
                    <Home className="w-4 h-4 text-[#087443]" />
                    <span>Accommodation &amp; Hostels</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenDropdown(null);
                      onNavigateView('jobs');
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-[#F4F8F5] flex items-center gap-2.5"
                  >
                    <Briefcase className="w-4 h-4 text-[#087443]" />
                    <span>Jobs &amp; Internships</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenDropdown(null);
                      onNavigateView('food');
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-[#F4F8F5] flex items-center gap-2.5"
                  >
                    <Utensils className="w-4 h-4 text-[#087443]" />
                    <span>Campus Food Ordering</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenDropdown(null);
                      onNavigateView('books');
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-[#F4F8F5] flex items-center gap-2.5"
                  >
                    <BookOpen className="w-4 h-4 text-[#087443]" />
                    <span>Books &amp; Study Materials</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenDropdown(null);
                      onNavigateView('gpa');
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-[#F4F8F5] flex items-center gap-2.5"
                  >
                    <Calculator className="w-4 h-4 text-[#087443]" />
                    <span>GPA &amp; CGPA Calculator</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenDropdown(null);
                      onNavigateView('deals');
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-[#F4F8F5] flex items-center gap-2.5"
                  >
                    <Crown className="w-4 h-4 text-[#D4A62A]" />
                    <span>Student Deals &amp; Discounts</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenDropdown(null);
                      onNavigateView('bike-riders');
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-[#F4F8F5] flex items-center gap-2.5"
                  >
                    <Bike className="w-4 h-4 text-[#087443]" />
                    <span>Campus Bike &amp; Dispatch Riders</span>
                  </button>
                  {onOpenServicesSection && (
                    <button
                      type="button"
                      onClick={() => {
                        setOpenDropdown(null);
                        onOpenServicesSection();
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-[#F4F8F5] flex items-center gap-2.5"
                    >
                      <Store className="w-4 h-4 text-[#087443]" />
                      <span>Browse Services Directory</span>
                    </button>
                  )}
                  {onOpenPostServiceModal && (
                    <div className="border-t border-[#F4F8F5] mt-1 pt-1 px-3.5">
                      <button
                        type="button"
                        onClick={() => {
                          setOpenDropdown(null);
                          onOpenPostServiceModal();
                        }}
                        className="w-full py-1.5 rounded-lg bg-[#D4A62A] text-[#10251D] text-xs font-black text-center"
                      >
                        Post Your Student Service
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* More Dropdown */}
            <div className="relative">
              <button
                type="button"
                aria-expanded={openDropdown === 'more'}
                onClick={() => toggleDropdown('more')}
                className={navBtnClass(
                  ['giveaways', 'referrals', 'ambassadors', 'leaderboards', 'hub', 'requests'].includes(activeView) ||
                    openDropdown === 'more'
                )}
              >
                <span>More</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {openDropdown === 'more' && (
                <div className="absolute left-0 mt-2 w-64 bg-white text-[#10251D] rounded-2xl shadow-2xl border border-[#D9E5DF] py-2 z-50">
                  <div className="px-3.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#087443] border-b border-[#F4F8F5]">
                    Community &amp; Rewards
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenDropdown(null);
                      onNavigateView('hub');
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-[#F4F8F5] flex items-center gap-2.5"
                  >
                    <MessageSquare className="w-4 h-4 text-[#087443]" />
                    <span>Community Hub &amp; Chat</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenDropdown(null);
                      onNavigateView('requests');
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-[#F4F8F5] flex items-center gap-2.5"
                  >
                    <Briefcase className="w-4 h-4 text-[#087443]" />
                    <span>What Students Need</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenDropdown(null);
                      onNavigateView('giveaways');
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-[#F4F8F5] flex items-center gap-2.5"
                  >
                    <Gift className="w-4 h-4 text-[#087443]" />
                    <span>Student Giveaways</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenDropdown(null);
                      onNavigateView('referrals');
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-[#F4F8F5] flex items-center gap-2.5"
                  >
                    <GraduationCap className="w-4 h-4 text-[#087443]" />
                    <span>Referral Rewards &amp; Ambassadors</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenDropdown(null);
                      onNavigateView('leaderboards');
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-[#F4F8F5] flex items-center gap-2.5"
                  >
                    <Trophy className="w-4 h-4 text-[#D4A62A]" />
                    <span>Campus Leaderboards</span>
                  </button>
                  {onOpenEventsSection && (
                    <button
                      type="button"
                      onClick={() => {
                        setOpenDropdown(null);
                        onOpenEventsSection();
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-[#F4F8F5] flex items-center gap-2.5"
                    >
                      <PartyPopper className="w-4 h-4 text-[#D4A62A]" />
                      <span>Campus Events &amp; Birthdays</span>
                    </button>
                  )}
                  {onOpenEmergencySection && (
                    <button
                      type="button"
                      onClick={() => {
                        setOpenDropdown(null);
                        onOpenEmergencySection();
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-bold text-[#DC2626] hover:bg-red-50 flex items-center gap-2.5"
                    >
                      <Siren className="w-4 h-4" />
                      <span>Campus Safety &amp; Help Centre</span>
                    </button>
                  )}
                  <div className="border-t border-[#F4F8F5] mt-1 pt-1 px-3.5 py-1.5">
                    {isCeo && onOpenAdvertiseModal ? (
                      <button
                        type="button"
                        onClick={() => {
                          setOpenDropdown(null);
                          onOpenAdvertiseModal();
                        }}
                        className="w-full py-1.5 rounded-lg bg-[#D4A62A] text-[#10251D] text-xs font-black text-center flex items-center justify-center gap-1.5"
                      >
                        <Megaphone className="w-3.5 h-3.5" />
                        <span>Manage Official Ads (CEO)</span>
                      </button>
                    ) : (
                      <a
                        href={getCeoAdsWhatsAppUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-1.5 rounded-lg bg-[#10251D] text-[#D4A62A] text-xs font-black text-center flex items-center justify-center gap-1.5"
                      >
                        <Megaphone className="w-3.5 h-3.5" />
                        <span>Advertise on Platform</span>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* Compact Search Bar */}
          <div className="flex-1 max-w-[210px] sm:max-w-xs">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <input
                type="text"
                placeholder="Search products, hostels..."
                value={localSearch}
                onChange={(e) => {
                  setLocalSearch(e.target.value);
                  onSearchChange(e.target.value);
                }}
                className="w-full pl-8 pr-12 py-2 bg-white border border-transparent focus:border-[#D4A62A] rounded-xl text-xs text-[#10251D] placeholder-[#10251D]/55 shadow-sm transition outline-none"
              />
              <Search className="w-3.5 h-3.5 text-[#087443] absolute left-2.5" />
              <button
                type="submit"
                className="absolute right-1 px-2 py-1 bg-[#D4A62A] hover:bg-[#E0B43B] text-[#10251D] text-[10px] font-black rounded-lg transition cursor-pointer"
              >
                Go
              </button>
            </form>
          </div>

          {/* Right Auth, Account, Cart & Utility Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenNotifications && (
              <button
                type="button"
                onClick={onOpenNotifications}
                className="p-2 bg-[#10251D] hover:bg-black/40 border border-white/20 text-white rounded-xl flex items-center gap-1 transition relative shrink-0 cursor-pointer"
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4 text-[#D4A62A]" />
                {unreadNotificationsCount > 0 && (
                  <span className="bg-[#D4A62A] text-[#10251D] text-[10px] font-black px-1.5 rounded-full min-w-4 text-center tabular-nums">
                    {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                  </span>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={onOpenCart}
              className="p-2 bg-[#10251D] hover:bg-black/40 border border-white/20 text-white rounded-xl flex items-center gap-1 transition relative whitespace-nowrap shrink-0 cursor-pointer"
              title="Shopping Cart"
              aria-label="Shopping Cart"
            >
              <ShoppingCart className="w-4 h-4 text-[#D4A62A]" />
              {cartCount > 0 && (
                <span className="bg-[#D4A62A] text-[#10251D] text-[10px] font-black px-1.5 rounded-full min-w-4 text-center tabular-nums">
                  {cartCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onOpenFavourites}
              className="hidden xl:flex p-2 bg-[#10251D] hover:bg-black/40 border border-white/20 text-white rounded-xl items-center gap-1 transition relative shrink-0 cursor-pointer"
              title="Saved Items"
              aria-label="Saved Items"
            >
              <Heart className="w-4 h-4 text-[#D4A62A]" />
              {favourites.length > 0 && (
                <span className="bg-[#D4A62A] text-[#10251D] text-[10px] font-black px-1.5 rounded-full min-w-4 text-center tabular-nums">
                  {favourites.length}
                </span>
              )}
            </button>

            {/* Auth / Account Menu */}
            <div className="relative shrink-0">
              {user ? (
                <button
                  type="button"
                  onClick={() => toggleDropdown('user')}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white text-[#10251D] font-bold shadow-sm hover:bg-[#F4F8F5] transition cursor-pointer whitespace-nowrap"
                >
                  <div className="w-6 h-6 rounded-lg bg-[#087443] text-[#D4A62A] font-black text-xs flex items-center justify-center">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-bold text-[#10251D] max-w-[75px] truncate hidden sm:inline">
                    {user.name.split(' ')[0]}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#10251D]/65" />
                </button>
              ) : (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenAuthModal('login')}
                    className="flex items-center gap-1 px-2.5 py-2 bg-white hover:bg-[#F4F8F5] text-[#087443] text-xs font-black rounded-xl shadow-sm transition whitespace-nowrap cursor-pointer"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-[#087443]" />
                    <span>Login</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenAuthModal('register')}
                    className="hidden sm:inline-flex items-center px-3 py-2 bg-[#D4A62A] hover:bg-[#E0B43B] text-[#10251D] text-xs font-black rounded-xl transition whitespace-nowrap cursor-pointer shadow-sm"
                  >
                    Sign Up
                  </button>
                </div>
              )}

              {openDropdown === 'user' && user && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-[#D9E5DF] py-2 z-50 text-[#10251D]">
                  <div className="px-4 py-3 border-b border-[#F4F8F5]">
                    <p className="text-xs font-black text-[#10251D] truncate">{user.name}</p>
                    <p className="text-[11px] text-[#10251D]/70 truncate">{user.email}</p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase bg-[#087443] text-[#D4A62A]">
                        {user.role}
                      </span>
                      {(sellerProfile?.isVerified || user.ceoVerified || user.isVerified) && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F4F8F5] text-[#087443] border border-[#087443]/30 flex items-center gap-0.5">
                          <ShieldCheck className="w-3 h-3" /> Verified
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setOpenDropdown(null);
                        onNavigateView('orders');
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-[#10251D] hover:bg-[#F4F8F5] flex items-center gap-2 font-bold transition"
                    >
                      <ClipboardList className="w-4 h-4 text-[#087443]" />
                      My Orders &amp; Food Tracking
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setOpenDropdown(null);
                        onNavigateView('account');
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-[#10251D] hover:bg-[#F4F8F5] flex items-center gap-2 font-bold transition"
                    >
                      <UserIcon className="w-4 h-4 text-[#087443]" />
                      Student Account Hub
                    </button>

                    {onOpenUserProfile && (
                      <button
                        type="button"
                        onClick={() => {
                          setOpenDropdown(null);
                          onOpenUserProfile();
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-[#10251D] hover:bg-[#F4F8F5] flex items-center gap-2 font-bold transition"
                      >
                        <UserCog className="w-4 h-4 text-[#087443]" />
                        Campus Profile Settings
                      </button>
                    )}

                    {user.role === 'seller' || user.role === 'admin' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setOpenDropdown(null);
                          onOpenSellerDashboard();
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-[#10251D] hover:bg-[#F4F8F5] flex items-center gap-2 font-bold transition"
                      >
                        <Store className="w-4 h-4 text-[#087443]" />
                        Seller Dashboard &amp; Listings
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setOpenDropdown(null);
                          onOpenAuthModal('register', 'seller');
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-[#087443] hover:bg-[#F4F8F5] flex items-center gap-2 font-black transition"
                      >
                        <Store className="w-4 h-4 text-[#087443]" />
                        Become a Campus Seller
                      </button>
                    )}

                    {isCeo && onOpenCeoSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setOpenDropdown(null);
                          onOpenCeoSuperAdmin();
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-white bg-[#087443] hover:bg-[#065D36] flex items-center gap-2 font-black transition"
                      >
                        <ShieldCheck className="w-4 h-4 text-[#D4A62A]" />
                        CEO Super Admin Dashboard
                      </button>
                    )}

                    {isCeo && onOpenCeoMasterControl && (
                      <button
                        type="button"
                        onClick={() => {
                          setOpenDropdown(null);
                          onOpenCeoMasterControl();
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-[#10251D] bg-[#D4A62A]/20 hover:bg-[#D4A62A]/35 flex items-center gap-2 font-black transition"
                      >
                        <Sliders className="w-4 h-4 text-[#087443]" />
                        Platform Master Control
                      </button>
                    )}

                    {isCeo && onOpenCeoEventsDashboard && (
                      <button
                        type="button"
                        onClick={() => {
                          setOpenDropdown(null);
                          onOpenCeoEventsDashboard();
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-[#087443] hover:bg-[#F4F8F5] flex items-center gap-2 font-black transition"
                      >
                        <PartyPopper className="w-4 h-4 text-[#D4A62A]" />
                        CEO Events Publisher
                      </button>
                    )}

                    {isCeo && (
                      <button
                        type="button"
                        onClick={() => {
                          setOpenDropdown(null);
                          onOpenAdminDashboard();
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-[#087443] hover:bg-[#F4F8F5] flex items-center gap-2 font-black transition"
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        Admin &amp; Institutions Desk
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setOpenDropdown(null);
                        onOpenSafetyModal();
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-[#10251D]/80 hover:text-[#10251D] hover:bg-[#F4F8F5] flex items-center gap-2 transition"
                    >
                      <ShieldCheck className="w-4 h-4 text-[#087443]" />
                      Safety &amp; Scam Prevention
                    </button>
                  </div>

                  <div className="border-t border-[#F4F8F5] pt-1 mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setOpenDropdown(null);
                        logout();
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-[#10251D] hover:bg-[#F4F8F5] flex items-center gap-2 font-bold transition"
                    >
                      <LogOut className="w-4 h-4 text-[#065D36]" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="lg:hidden p-2 rounded-xl bg-[#10251D] border border-white/20 text-white hover:text-[#D4A62A] cursor-pointer"
              aria-label="Open Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-3 pt-3 border-t border-white/15 grid grid-cols-2 sm:grid-cols-3 gap-2 pb-2 text-xs">
            {[
              { label: 'Home', action: () => onNavigateView('home') },
              { label: 'Marketplace', action: () => onNavigateView('marketplace') },
              { label: 'Universities', action: () => onOpenInstitutionSwitcher?.() },
              { label: 'Accommodation', action: () => onNavigateView('hux') },
              { label: 'Campus Food', action: () => onNavigateView('food') },
              { label: 'Jobs & Skills', action: () => onNavigateView('jobs') },
              { label: 'Books', action: () => onNavigateView('books') },
              { label: 'GPA Calculator', action: () => onNavigateView('gpa') },
              { label: 'Student Deals', action: () => onNavigateView('deals') },
              { label: 'Giveaways', action: () => onNavigateView('giveaways') },
              { label: 'Community Hub', action: () => onNavigateView('hub') },
              { label: 'My Orders', action: () => onNavigateView('orders') },
              { label: 'Safety & Help', action: () => onOpenEmergencySection?.() }
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  item.action();
                }}
                className="px-3 py-2 rounded-xl bg-[#10251D] hover:bg-[#D4A62A] hover:text-[#10251D] text-white font-bold text-left flex items-center justify-between transition"
              >
                <span className="truncate">{item.label}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenSellModal();
              }}
              className="px-3 py-2 rounded-xl bg-[#D4A62A] text-[#10251D] font-black text-left col-span-2 sm:col-span-3 flex items-center justify-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Post Item / Start Selling</span>
            </button>
            {!user && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuthModal('register');
                }}
                className="px-3 py-2 rounded-xl bg-white text-[#087443] font-black text-center col-span-2 sm:col-span-3 flex items-center justify-center gap-1.5"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Create Free Student Account</span>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
