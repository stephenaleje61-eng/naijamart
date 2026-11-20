import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  BookOpen,
  Building2,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  Crown,
  FileText,
  Globe,
  GraduationCap,
  HelpCircle,
  KeyRound,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  MonitorSmartphone,
  Palette,
  Phone,
  Settings as SettingsIcon,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sliders,
  Store,
  Trash2,
  Trophy,
  User as UserIcon,
  Users,
  X
} from 'lucide-react';
import campusCommunityShowcaseImg from '../../assets/images/nigeria_campus_community_1794904561913.jpg';
import { Institution, User, UserSettingsDocument } from '../../types.js';
import { findInstitutionById } from '../../constants/institutions.js';
import { isAuthorizedCeo } from '../../services/events.js';
import { CeoSectionId } from '../CeoSuperAdminDashboard.js';
import {
  createDefaultUserSettings,
  saveAccountProfileUpdate,
  saveUserSettings,
  uploadUserAvatar
} from '../../services/settings.js';
import { applyAppearanceSettings } from '../../utils/theme.js';
import { AccountLoginEmailPanel, AccountPersonalPanel } from './AccountSettingsPanel.js';
import { UniversitySettingsPanel } from './UniversitySettingsPanel.js';
import { PrivacySettingsPanel, SecuritySettingsPanel } from './PrivacySecurityPanels.js';
import {
  AcademicSettingsPanel,
  AppearanceSettingsPanel,
  LanguageRegionPanel,
  MarketplaceSettingsPanel,
  NotificationSettingsPanel
} from './PreferencesPanels.js';
import { AdminSettingsPanel, HelpSupportPanel } from './SupportAdminPanels.js';
import { formatTimestamp } from '../../utils/formatters.js';

export type SettingsSectionId =
  | 'overview'
  | 'personal'
  | 'university'
  | 'login-security'
  | 'notifications'
  | 'privacy'
  | 'appearance'
  | 'academic'
  | 'marketplace'
  | 'language-region'
  | 'password'
  | 'sessions'
  | 'account-management'
  | 'help-centre'
  | 'report-problem'
  | 'terms'
  | 'admin-settings';

interface SettingsPageProps {
  user: User | null;
  institutions: Institution[];
  userSettings: UserSettingsDocument;
  unreadMessagesCount?: number;
  onUserUpdated: (updated: User) => void;
  onSettingsUpdated: (next: UserSettingsDocument) => void;
  onInstitutionActivated: (institutionId: string, campus: string) => void;
  onBackHome: () => void;
  onNavigateOrders: () => void;
  onNavigateMessages: () => void;
  onNavigateGpa: () => void;
  onOpenMyProducts: () => void;
  onOpenAuthModal: (mode?: 'login' | 'register') => void;
  onOpenCeoSection: (section: CeoSectionId) => void;
  onOpenAdminDashboard: () => void;
  onOpenMasterControl: () => void;
  onLogout: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const SECTION_META: Record<SettingsSectionId, { title: string; subtitle: string }> = {
  overview: {
    title: 'Settings & Preferences',
    subtitle: 'Manage your account and university experience'
  },
  personal: {
    title: 'Personal Information',
    subtitle: 'Update your full name, username, profile picture, phone, and biography'
  },
  university: {
    title: 'University Information',
    subtitle: 'Manage your Nigerian university, polytechnic, faculty, department, and level'
  },
  'login-security': {
    title: 'Login & Security',
    subtitle: 'Update primary email, verify your address, and set recovery details'
  },
  notifications: {
    title: 'Notification Preferences',
    subtitle: 'Control messages, campus announcements, product deals, and push alerts'
  },
  privacy: {
    title: 'Privacy Settings',
    subtitle: 'Control who can view your profile, posts, university info, and phone number'
  },
  appearance: {
    title: 'Appearance & Display',
    subtitle: 'Choose light mode, dark mode, system theme, font size, and layout density'
  },
  academic: {
    title: 'Academic Preferences',
    subtitle: 'Set active session, semester, and default GPA / CGPA grading scale'
  },
  marketplace: {
    title: 'Marketplace Settings',
    subtitle: 'Set your buying/selling role, default campus, delivery area, and shortcuts'
  },
  'language-region': {
    title: 'Language & Region',
    subtitle: 'Language, Nigeria state/city, Africa/Lagos timezone, and Naira (₦) currency'
  },
  password: {
    title: 'Change Password',
    subtitle: 'Update your account password or request a secure reset link'
  },
  sessions: {
    title: 'Active Device Sessions',
    subtitle: 'Monitor logged-in browsers & phones and sign out other devices'
  },
  'account-management': {
    title: 'Account Management',
    subtitle: 'Temporarily deactivate your profile or permanently delete your account'
  },
  'help-centre': {
    title: 'Help Centre & FAQs',
    subtitle: 'Guides and safety tips for Nigerian campus buyers, sellers, and agents'
  },
  'report-problem': {
    title: 'Report a Problem / Contact Support',
    subtitle: 'Send bug reports, suspicious user alerts, or support requests to Admin'
  },
  terms: {
    title: 'Terms, Privacy & Community Guidelines',
    subtitle: 'Platform rules, privacy protections, and campus safety commitments'
  },
  'admin-settings': {
    title: 'Admin Settings',
    subtitle: 'Super Administrator platform controls (stephenaleje61@gmail.com)'
  }
};

export const SettingsPage: React.FC<SettingsPageProps> = ({
  user,
  institutions,
  userSettings,
  unreadMessagesCount = 0,
  onUserUpdated,
  onSettingsUpdated,
  onInstitutionActivated,
  onBackHome,
  onNavigateOrders,
  onNavigateMessages,
  onNavigateGpa,
  onOpenMyProducts,
  onOpenAuthModal,
  onOpenCeoSection,
  onOpenAdminDashboard,
  onOpenMasterControl,
  onLogout,
  onShowToast
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('overview');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [quickAvatarUploading, setQuickAvatarUploading] = useState(false);
  const quickAvatarInputRef = useRef<HTMLInputElement | null>(null);

  const isCeo = isAuthorizedCeo(user);
  const activeSettings = userSettings || createDefaultUserSettings(user);
  const userInstitution = findInstitutionById(user?.institutionId, institutions);
  const isVerifiedAccount = Boolean(
    user?.isVerified || user?.ceoVerified || user?.studentVerificationStatus === 'verified'
  );

  // Guard admin-settings if user signs out or isn't authorized Super Admin
  useEffect(() => {
    if (activeSection === 'admin-settings' && !isCeo) {
      setActiveSection('overview');
    }
  }, [activeSection, isCeo]);

  const handleQuickAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setQuickAvatarUploading(true);
    try {
      const url = await uploadUserAvatar(user.id, file);
      const { user: updated } = await saveAccountProfileUpdate(user.id, { avatarUrl: url }, user);
      onUserUpdated(updated);
      onShowToast('Profile photo updated!', 'success');
    } catch (err: any) {
      onShowToast(err?.message || 'Unable to upload photo.', 'error');
    } finally {
      setQuickAvatarUploading(false);
      if (quickAvatarInputRef.current) quickAvatarInputRef.current.value = '';
    }
  };

  const handleQuickToggleNotifications = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextVal = !activeSettings.notifications.enabled;
    if (!user) {
      onShowToast('Sign in to customize notification alerts.', 'info');
      return;
    }
    try {
      const next = await saveUserSettings(
        user.id,
        { notifications: { ...activeSettings.notifications, enabled: nextVal } },
        user
      );
      onSettingsUpdated(next);
      onShowToast(
        nextVal ? 'Notifications turned on.' : 'Notifications paused.',
        'success'
      );
    } catch (err: any) {
      onShowToast(err?.message || 'Unable to update notification toggle.', 'error');
    }
  };

  const handleQuickSaveBanner = async () => {
    applyAppearanceSettings(activeSettings.appearance);
    if (!user) {
      onShowToast('Display preferences saved for this browser.', 'success');
      return;
    }
    try {
      const next = await saveUserSettings(user.id, activeSettings, user);
      onSettingsUpdated(next);
      onShowToast('All settings verified and securely saved.', 'success');
    } catch (err: any) {
      onShowToast(err?.message || 'Could not sync settings.', 'error');
    }
  };

  const openProtectedSection = (sectionId: SettingsSectionId) => {
    const guestAllowed: SettingsSectionId[] = [
      'overview',
      'appearance',
      'language-region',
      'help-centre',
      'report-problem',
      'terms'
    ];
    if (!user && !guestAllowed.includes(sectionId)) {
      onShowToast('Please sign in to manage your personal account settings.', 'info');
      onOpenAuthModal('login');
      return;
    }
    setActiveSection(sectionId);
    setMobileDrawerOpen(false);
  };

  const SidebarBody = () => (
    <div className="flex flex-col h-full bg-[#16834A] text-white p-4 sm:p-5 select-none">
      {/* User Summary */}
      <div className="flex flex-col items-center text-center pb-4 border-b border-white/15">
        <div className="relative w-18 h-18 rounded-full border-3 border-white/80 bg-emerald-900/50 overflow-hidden flex items-center justify-center shadow-md">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          ) : (
            <UserIcon className="w-8 h-8 text-emerald-100" />
          )}
          {isVerifiedAccount && (
            <span
              title="Verified Account"
              className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-white text-[#16834A] flex items-center justify-center shadow"
            >
              <Check className="w-3 h-3 stroke-[3]" />
            </span>
          )}
        </div>
        <h2 className="mt-2.5 text-base font-extrabold tracking-tight text-white line-clamp-1">
          {user ? user.name : 'Guest Visitor'}
        </h2>
        <span className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-[11px] font-semibold text-emerald-50">
          <GraduationCap className="w-3 h-3" />
          {userInstitution
            ? `${user?.role === 'seller' ? 'Seller' : 'Student'} · ${userInstitution.shortName}`
            : user
            ? `${user.role === 'admin' ? 'Super Admin' : user.role === 'seller' ? 'Seller' : 'Member'} · Nigeria`
            : 'Guest · Nationwide'}
        </span>
      </div>

      {/* Navigation Links matching mockup */}
      <nav className="mt-4 flex-1 space-y-1 text-sm">
        <button
          type="button"
          onClick={onBackHome}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-emerald-50 hover:bg-white/12 transition font-medium cursor-pointer"
        >
          <LayoutDashboard className="w-4 h-4 shrink-0" />
          <span>Dashboard</span>
        </button>

        <button
          type="button"
          onClick={onOpenMyProducts}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-emerald-50 hover:bg-white/12 transition font-medium cursor-pointer"
        >
          <Store className="w-4 h-4 shrink-0" />
          <span>My Products</span>
        </button>

        <button
          type="button"
          onClick={onNavigateMessages}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-emerald-50 hover:bg-white/12 transition font-medium cursor-pointer"
        >
          <span className="flex items-center gap-3">
            <MessageSquare className="w-4 h-4 shrink-0" />
            <span>My Messages</span>
          </span>
          {unreadMessagesCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[11px] font-bold">
              {unreadMessagesCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={onNavigateOrders}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-emerald-50 hover:bg-white/12 transition font-medium cursor-pointer"
        >
          <ShoppingCart className="w-4 h-4 shrink-0" />
          <span>My Purchases</span>
        </button>

        <button
          type="button"
          onClick={() => openProtectedSection('personal')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition font-medium cursor-pointer ${
            activeSection === 'personal'
              ? 'bg-white/20 text-white font-bold shadow-xs'
              : 'text-emerald-50 hover:bg-white/12'
          }`}
        >
          <UserIcon className="w-4 h-4 shrink-0" />
          <span>My Profile</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSection('overview');
            setMobileDrawerOpen(false);
          }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition font-bold cursor-pointer ${
            activeSection !== 'personal' && activeSection !== 'help-centre'
              ? 'bg-[#22A55B] text-white shadow-sm ring-1 ring-white/25'
              : 'bg-white/15 text-white'
          }`}
        >
          <SettingsIcon className="w-4 h-4 shrink-0" />
          <span>Settings</span>
        </button>

        <button
          type="button"
          onClick={() => openProtectedSection('help-centre')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition font-medium cursor-pointer ${
            activeSection === 'help-centre'
              ? 'bg-white/20 text-white font-bold'
              : 'text-emerald-50 hover:bg-white/12'
          }`}
        >
          <HelpCircle className="w-4 h-4 shrink-0" />
          <span>Help & Support</span>
        </button>

        {user ? (
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-emerald-100 hover:bg-red-500/20 hover:text-white transition font-medium cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Log Out</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onOpenAuthModal('login')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#F2C94C] text-[#202938] font-extrabold transition cursor-pointer mt-2"
          >
            <Lock className="w-4 h-4 shrink-0" />
            <span>Sign In / Register</span>
          </button>
        )}
      </nav>

      {/* Bottom Trophy / Brand Promise Card */}
      <div className="mt-5 rounded-2xl bg-[#0F6337] border border-white/15 p-4 text-center space-y-2">
        <div className="w-10 h-10 rounded-full bg-white/10 mx-auto flex items-center justify-center">
          <Trophy className="w-5 h-5 text-[#F2C94C]" />
        </div>
        <div className="text-xs font-extrabold leading-snug text-white">
          Nigeria&apos;s #1 University Marketplace
        </div>
        <div className="inline-block px-3 py-0.5 rounded-full bg-[#F2C94C] text-[#202938] text-[10px] font-black tracking-wide">
          Shop • Sell • Connect
        </div>
        <p className="text-[10px] text-emerald-100/90 leading-relaxed pt-1 border-t border-white/10">
          Serving Students Across All Nigerian Universities
        </p>
      </div>
    </div>
  );

  const SettingRowButton = ({
    icon,
    iconBg,
    title,
    desc,
    onClick,
    rightElement
  }: {
    icon: React.ReactNode;
    iconBg: string;
    title: string;
    desc: string;
    onClick: () => void;
    rightElement?: React.ReactNode;
  }) => (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-[#F5F7FA] dark:hover:bg-slate-800/60 transition cursor-pointer group"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold text-[#202938] dark:text-white group-hover:text-[#16834A] transition truncate">
            {title}
          </div>
          <div className="text-xs text-[#64748B] dark:text-slate-400 truncate">{desc}</div>
        </div>
      </div>
      {rightElement || (
        <ChevronRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#16834A] group-hover:translate-x-0.5 transition shrink-0" />
      )}
    </div>
  );

  const currentMeta = SECTION_META[activeSection];

  return (
    <div className="min-h-screen bg-[#F5F7FA] dark:bg-[#0B1220] text-[#202938] dark:text-slate-100">
      {/* Mobile Top Controls Bar */}
      <div className="lg:hidden sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-[#E2E8F0] dark:border-slate-800 px-4 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="p-2 rounded-xl bg-[#E8F5EE] dark:bg-emerald-950/60 text-[#16834A] cursor-pointer"
            aria-label="Open settings menu"
          >
            <Menu className="w-4 h-4" />
          </button>
          <span className="text-sm font-extrabold text-[#202938] dark:text-white truncate">
            {activeSection === 'overview' ? 'Settings & Preferences' : currentMeta.title}
          </span>
        </div>
        <button
          type="button"
          onClick={activeSection === 'overview' ? onBackHome : () => setActiveSection('overview')}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#E2E8F0] dark:border-slate-700 text-xs font-bold text-[#202938] dark:text-slate-200 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {activeSection === 'overview' ? 'Marketplace' : 'Overview'}
        </button>
      </div>

      {/* Mobile Slide-Over Sidebar Drawer */}
      {mobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] h-full overflow-y-auto z-10 shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(false)}
              className="absolute top-3 right-3 z-20 p-1.5 rounded-lg bg-white/15 text-white hover:bg-white/25 cursor-pointer"
              aria-label="Close settings menu"
            >
              <X className="w-4 h-4" />
            </button>
            <SidebarBody />
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 flex gap-6 items-start">
        {/* Desktop Persistent Emerald Sidebar */}
        <aside className="hidden lg:block w-64 shrink-0 rounded-2xl overflow-hidden shadow-md sticky top-20">
          <SidebarBody />
        </aside>

        {/* Main Settings Content Column */}
        <main className="flex-1 min-w-0 space-y-5">
          {/* Header / Campus Showcase Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 shadow-xs">
            <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6">
              <div className="flex items-center gap-4 z-10">
                <div className="w-12 h-12 rounded-2xl bg-[#16834A] text-white flex items-center justify-center shadow-sm shrink-0">
                  <SettingsIcon className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-[#202938] dark:text-white tracking-tight">
                    {currentMeta.title}
                  </h1>
                  <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 mt-0.5">
                    {currentMeta.subtitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 z-10 self-start sm:self-center">
                <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#16834A] text-white shadow-xs">
                  <CheckCircle2 className="w-4 h-4 text-[#F2C94C] shrink-0" />
                  <div className="leading-tight">
                    <div className="text-xs font-extrabold">National Platform</div>
                    <div className="text-[10px] text-emerald-100">All Nigerian Universities</div>
                  </div>
                </div>
              </div>

              {/* Subtle right-side campus backdrop image matching reference */}
              <img
                src={campusCommunityShowcaseImg}
                alt="Nigerian University Campus Community"
                className="hidden md:block absolute right-0 top-0 h-full w-64 object-cover opacity-20 dark:opacity-15 pointer-events-none"
                style={{
                  maskImage: 'linear-gradient(to left, rgba(0,0,0,1), rgba(0,0,0,0))',
                  WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1), rgba(0,0,0,0))'
                }}
              />
            </div>
          </div>

          {/* Sub-panel Navigation Breadcrumb when not on Overview */}
          {activeSection !== 'overview' && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl px-4 py-3 shadow-xs">
              <button
                type="button"
                onClick={() => setActiveSection('overview')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#16834A] hover:underline cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Settings Overview
              </button>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { id: 'personal', label: 'Personal' },
                    { id: 'university', label: 'University' },
                    { id: 'privacy', label: 'Privacy' },
                    { id: 'notifications', label: 'Notifications' },
                    { id: 'appearance', label: 'Appearance' },
                    { id: 'academic', label: 'Academic' },
                    { id: 'marketplace', label: 'Marketplace' },
                    { id: 'password', label: 'Security' }
                  ] as { id: SettingsSectionId; label: string }[]
                ).map((pill) => (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => openProtectedSection(pill.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      activeSection === pill.id
                        ? 'bg-[#16834A] text-white'
                        : 'bg-[#F5F7FA] dark:bg-slate-800 text-[#64748B] dark:text-slate-300 hover:text-[#16834A]'
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* OVERVIEW VIEW */}
          {activeSection === 'overview' && (
            <>
              {/* Profile & Account Status Summary Card */}
              <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 min-w-0">
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <div className="relative w-20 h-20 rounded-2xl bg-[#E8F5EE] dark:bg-emerald-950/60 border border-[#16834A]/20 overflow-hidden flex items-center justify-center">
                      {user?.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <UserIcon className="w-9 h-9 text-[#16834A]" />
                      )}
                      {user && (
                        <button
                          type="button"
                          onClick={() => quickAvatarInputRef.current?.click()}
                          className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-[#16834A] text-white flex items-center justify-center shadow cursor-pointer"
                          title="Upload profile picture"
                        >
                          <Camera className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <input
                      ref={quickAvatarInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleQuickAvatarChange}
                      className="hidden"
                    />
                    {user ? (
                      <button
                        type="button"
                        disabled={quickAvatarUploading}
                        onClick={() => quickAvatarInputRef.current?.click()}
                        className="px-3 py-1 rounded-lg border border-[#16834A]/35 text-[#16834A] text-[11px] font-bold hover:bg-[#E8F5EE] transition cursor-pointer"
                      >
                        {quickAvatarUploading ? 'Uploading...' : 'Change Photo'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onOpenAuthModal('login')}
                        className="px-3 py-1 rounded-lg bg-[#16834A] text-white text-[11px] font-bold cursor-pointer"
                      >
                        Sign In
                      </button>
                    )}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h2 className="text-lg font-extrabold text-[#202938] dark:text-white truncate">
                        {user ? user.name : 'Welcome to Settings Hub'}
                      </h2>
                      {isVerifiedAccount && (
                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs font-semibold text-[#475569] dark:text-slate-300">
                      {userInstitution
                        ? `${user?.accountType === 'seller' ? 'Seller' : 'Student'} • ${userInstitution.shortName} (${userInstitution.state})`
                        : user
                        ? `${user.department || 'Campus Member'} • Select your Nigerian University`
                        : 'Sign in to sync your account, university, and privacy controls nationwide.'}
                    </p>
                    {user?.email && (
                      <div className="flex items-center gap-2 text-xs text-[#64748B] dark:text-slate-400">
                        <Mail className="w-3.5 h-3.5 text-[#16834A]" />
                        <span className="truncate">{user.email}</span>
                      </div>
                    )}
                    {(user?.phone || user?.whatsappNumber) && (
                      <div className="flex items-center gap-2 text-xs text-[#64748B] dark:text-slate-400">
                        <Phone className="w-3.5 h-3.5 text-[#16834A]" />
                        <span>{user.phone || user.whatsappNumber}</span>
                      </div>
                    )}
                    {user && (
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#16834A] pt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>
                          {isVerifiedAccount ? 'Account Verified' : 'Account Active'}
                          {user.username ? ` · @${user.username}` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right-hand Account Status Box matching mockup */}
                <div className="bg-[#E8F5EE] dark:bg-emerald-950/50 border border-[#16834A]/20 rounded-2xl p-4 min-w-[230px]">
                  <div className="text-xs font-semibold text-[#475569] dark:text-slate-300">
                    Your <strong className="text-[#202938] dark:text-white">Account Status</strong>
                  </div>
                  <div className="mt-2.5 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#16834A] text-white flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                    <div>
                      <div className="text-sm font-extrabold text-[#16834A]">
                        {user ? 'Active & Secure' : 'Guest Browsing'}
                      </div>
                      <div className="text-[11px] text-[#64748B] dark:text-slate-400">
                        {user
                          ? `Last login: ${formatTimestamp(user.lastLoginAt || user.lastSeenAt || user.createdAt)}`
                          : 'Sign in for full account sync'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2-Column Structured Settings Card Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                {/* 1. Account Settings */}
                <section className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                  <div className="bg-[#0F6337] text-white px-4 py-3 flex items-center gap-2.5">
                    <UserIcon className="w-4 h-4" />
                    <h3 className="text-sm font-bold">Account Settings</h3>
                  </div>
                  <div className="divide-y divide-[#F1F5F9] dark:divide-slate-800">
                    <SettingRowButton
                      icon={<UserIcon className="w-4 h-4 text-blue-600" />}
                      iconBg="bg-blue-50 dark:bg-blue-950/50"
                      title="Personal Information"
                      desc="Edit your name, username, photo and bio"
                      onClick={() => openProtectedSection('personal')}
                    />
                    <SettingRowButton
                      icon={<GraduationCap className="w-4 h-4 text-[#16834A]" />}
                      iconBg="bg-[#E8F5EE] dark:bg-emerald-950/50"
                      title="University Information"
                      desc={
                        userInstitution
                          ? `${userInstitution.name} · ${user?.department || 'Set faculty & department'}`
                          : 'Select your Nigerian university, faculty & level'
                      }
                      onClick={() => openProtectedSection('university')}
                    />
                    <SettingRowButton
                      icon={<ShieldCheck className="w-4 h-4 text-emerald-700" />}
                      iconBg="bg-emerald-50 dark:bg-emerald-950/50"
                      title="Login & Security"
                      desc="Update email, verify address & recovery options"
                      onClick={() => openProtectedSection('login-security')}
                    />
                  </div>
                </section>

                {/* 2. Preferences */}
                <section className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                  <div className="bg-[#0F6337] text-white px-4 py-3 flex items-center gap-2.5">
                    <Bell className="w-4 h-4" />
                    <h3 className="text-sm font-bold">Preferences</h3>
                  </div>
                  <div className="divide-y divide-[#F1F5F9] dark:divide-slate-800">
                    <SettingRowButton
                      icon={<Bell className="w-4 h-4 text-blue-600" />}
                      iconBg="bg-blue-50 dark:bg-blue-950/50"
                      title="Notifications"
                      desc="Control what you want to be notified about"
                      onClick={() => openProtectedSection('notifications')}
                      rightElement={
                        <button
                          type="button"
                          role="switch"
                          aria-checked={activeSettings.notifications.enabled}
                          onClick={handleQuickToggleNotifications}
                          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors cursor-pointer ${
                            activeSettings.notifications.enabled
                              ? 'bg-[#16834A]'
                              : 'bg-slate-300 dark:bg-slate-700'
                          }`}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-0.5 ${
                              activeSettings.notifications.enabled ? 'translate-x-5.5' : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                      }
                    />
                    <SettingRowButton
                      icon={<Shield className="w-4 h-4 text-[#16834A]" />}
                      iconBg="bg-[#E8F5EE] dark:bg-emerald-950/50"
                      title="Privacy Settings"
                      desc="Manage who can see your profile, posts & phone"
                      onClick={() => openProtectedSection('privacy')}
                    />
                    <SettingRowButton
                      icon={<Palette className="w-4 h-4 text-indigo-600" />}
                      iconBg="bg-indigo-50 dark:bg-indigo-950/50"
                      title="Appearance"
                      desc={`Theme: ${activeSettings.appearance.theme} · Font: ${activeSettings.appearance.fontSize}`}
                      onClick={() => openProtectedSection('appearance')}
                    />
                  </div>
                </section>

                {/* 3. University & Academic */}
                <section className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                  <div className="bg-[#0F6337] text-white px-4 py-3 flex items-center gap-2.5">
                    <Building2 className="w-4 h-4" />
                    <h3 className="text-sm font-bold">University & Academic</h3>
                  </div>
                  <div className="divide-y divide-[#F1F5F9] dark:divide-slate-800">
                    <SettingRowButton
                      icon={<BookOpen className="w-4 h-4 text-blue-600" />}
                      iconBg="bg-blue-50 dark:bg-blue-950/50"
                      title="Academic Preferences"
                      desc={`Session ${activeSettings.academic.academicSession} · ${activeSettings.academic.defaultGpaScale} CGPA scale`}
                      onClick={() => openProtectedSection('academic')}
                    />
                    <SettingRowButton
                      icon={<ShoppingBag className="w-4 h-4 text-[#16834A]" />}
                      iconBg="bg-[#E8F5EE] dark:bg-emerald-950/50"
                      title="Marketplace Settings"
                      desc="Selling, buying, delivery preferences & shortcuts"
                      onClick={() => openProtectedSection('marketplace')}
                    />
                    <SettingRowButton
                      icon={<Globe className="w-4 h-4 text-sky-600" />}
                      iconBg="bg-sky-50 dark:bg-sky-950/50"
                      title="Language & Region"
                      desc={`${activeSettings.languageRegion.state || 'Nigeria'} · NGN (₦) · Africa/Lagos`}
                      onClick={() => openProtectedSection('language-region')}
                    />
                  </div>
                </section>

                {/* 4. Security & Account Control */}
                <section className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                  <div className="bg-[#0F6337] text-white px-4 py-3 flex items-center gap-2.5">
                    <ShieldAlert className="w-4 h-4" />
                    <h3 className="text-sm font-bold">Security & Account Control</h3>
                  </div>
                  <div className="divide-y divide-[#F1F5F9] dark:divide-slate-800">
                    <SettingRowButton
                      icon={<KeyRound className="w-4 h-4 text-emerald-700" />}
                      iconBg="bg-emerald-50 dark:bg-emerald-950/50"
                      title="Change Password"
                      desc="Keep your account safe with password & recovery"
                      onClick={() => openProtectedSection('password')}
                    />
                    <SettingRowButton
                      icon={<MonitorSmartphone className="w-4 h-4 text-teal-600" />}
                      iconBg="bg-teal-50 dark:bg-teal-950/50"
                      title="Active Sessions"
                      desc="Manage devices and sign out others remotely"
                      onClick={() => openProtectedSection('sessions')}
                    />
                    <SettingRowButton
                      icon={<Trash2 className="w-4 h-4 text-red-600" />}
                      iconBg="bg-red-50 dark:bg-red-950/50"
                      title="Account Management"
                      desc="Temporarily deactivate or permanently delete account"
                      onClick={() => openProtectedSection('account-management')}
                    />
                  </div>
                </section>

                {/* 5. Support & Information */}
                <section className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                  <div className="bg-[#0F6337] text-white px-4 py-3 flex items-center gap-2.5">
                    <HelpCircle className="w-4 h-4" />
                    <h3 className="text-sm font-bold">Support & Information</h3>
                  </div>
                  <div className="divide-y divide-[#F1F5F9] dark:divide-slate-800">
                    <SettingRowButton
                      icon={<HelpCircle className="w-4 h-4 text-blue-600" />}
                      iconBg="bg-blue-50 dark:bg-blue-950/50"
                      title="Help Centre"
                      desc="Get help and search answers to common questions"
                      onClick={() => openProtectedSection('help-centre')}
                    />
                    <SettingRowButton
                      icon={<AlertTriangle className="w-4 h-4 text-red-500" />}
                      iconBg="bg-red-50 dark:bg-red-950/50"
                      title="Report a Problem"
                      desc="Tell us about an issue or report a suspicious user"
                      onClick={() => openProtectedSection('report-problem')}
                    />
                    <SettingRowButton
                      icon={<FileText className="w-4 h-4 text-indigo-600" />}
                      iconBg="bg-indigo-50 dark:bg-indigo-950/50"
                      title="Terms & Policies"
                      desc="View our terms, privacy policy & guidelines"
                      onClick={() => openProtectedSection('terms')}
                    />
                  </div>
                </section>

                {/* 6. Admin Settings — STRICTLY ONLY VISIBLE TO AUTHORIZED SUPER ADMIN */}
                {isCeo && (
                  <section className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                    <div className="bg-[#0F6337] text-white px-4 py-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Crown className="w-4 h-4 text-[#F2C94C]" />
                        <h3 className="text-sm font-bold">Admin Settings</h3>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F2C94C] text-[#202938] text-[10px] font-black uppercase">
                        <CheckCircle2 className="w-3 h-3" />
                        Admin Only
                      </span>
                    </div>
                    <div className="divide-y divide-[#F1F5F9] dark:divide-slate-800">
                      <SettingRowButton
                        icon={<Users className="w-4 h-4 text-[#16834A]" />}
                        iconBg="bg-[#E8F5EE] dark:bg-emerald-950/50"
                        title="Manage Users"
                        desc="Control registered user accounts across Nigeria"
                        onClick={() => onOpenCeoSection('users')}
                      />
                      <SettingRowButton
                        icon={<Building2 className="w-4 h-4 text-emerald-700" />}
                        iconBg="bg-emerald-50 dark:bg-emerald-950/50"
                        title="University Directory"
                        desc="Manage all universities, polytechnics & colleges"
                        onClick={() => onOpenCeoSection('institutions')}
                      />
                      <SettingRowButton
                        icon={<Sliders className="w-4 h-4 text-slate-700 dark:text-slate-200" />}
                        iconBg="bg-slate-100 dark:bg-slate-800"
                        title="Platform Settings"
                        desc="Configure site-wide verification & ad settings"
                        onClick={() => setActiveSection('admin-settings')}
                      />
                    </div>
                  </section>
                )}
              </div>

              {/* Bottom Security & Save Changes Bar */}
              <div className="bg-[#E8F5EE] dark:bg-emerald-950/40 border border-[#16834A]/20 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#16834A] text-white flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-[#202938] dark:text-white">
                      Your privacy and security are our priority
                    </div>
                    <div className="text-xs text-[#475569] dark:text-slate-300">
                      All settings are securely saved and applied across the Nigeria University Market Hub platform.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleQuickSaveBanner}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#16834A] hover:bg-[#126B3C] text-white text-xs sm:text-sm font-extrabold shadow-xs transition shrink-0 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </>
          )}

          {/* SUB-PANEL ROUTING */}
          {activeSection === 'personal' && user && (
            <AccountPersonalPanel
              user={user}
              onUserUpdated={onUserUpdated}
              onShowToast={onShowToast}
            />
          )}

          {activeSection === 'university' && user && (
            <UniversitySettingsPanel
              user={user}
              institutions={institutions}
              settings={activeSettings}
              onUserUpdated={onUserUpdated}
              onSettingsSaved={onSettingsUpdated}
              onInstitutionActivated={onInstitutionActivated}
              onShowToast={onShowToast}
            />
          )}

          {activeSection === 'login-security' && user && (
            <AccountLoginEmailPanel
              user={user}
              settings={activeSettings}
              onSettingsSaved={onSettingsUpdated}
              onShowToast={onShowToast}
              onNavigateSubPanel={(sub) => setActiveSection(sub)}
            />
          )}

          {activeSection === 'notifications' && user && (
            <NotificationSettingsPanel
              user={user}
              settings={activeSettings}
              onSettingsSaved={onSettingsUpdated}
              onShowToast={onShowToast}
            />
          )}

          {activeSection === 'privacy' && user && (
            <PrivacySettingsPanel
              user={user}
              settings={activeSettings}
              onSettingsSaved={onSettingsUpdated}
              onUserUpdated={onUserUpdated}
              onShowToast={onShowToast}
            />
          )}

          {activeSection === 'appearance' && (
            <AppearanceSettingsPanel
              user={user}
              settings={activeSettings}
              onSettingsSaved={onSettingsUpdated}
              onShowToast={onShowToast}
            />
          )}

          {activeSection === 'academic' && user && (
            <AcademicSettingsPanel
              user={user}
              settings={activeSettings}
              onSettingsSaved={onSettingsUpdated}
              onOpenGpaCalculator={onNavigateGpa}
              onShowToast={onShowToast}
            />
          )}

          {activeSection === 'marketplace' && user && (
            <MarketplaceSettingsPanel
              user={user}
              institutions={institutions}
              settings={activeSettings}
              onSettingsSaved={onSettingsUpdated}
              onOpenMyProducts={onOpenMyProducts}
              onOpenSavedAndOrders={onNavigateOrders}
              onShowToast={onShowToast}
            />
          )}

          {activeSection === 'language-region' && (
            <LanguageRegionPanel
              user={user}
              settings={activeSettings}
              onSettingsSaved={onSettingsUpdated}
              onUserUpdated={onUserUpdated}
              onShowToast={onShowToast}
            />
          )}

          {(activeSection === 'password' ||
            activeSection === 'sessions' ||
            activeSection === 'account-management') &&
            user && (
              <SecuritySettingsPanel
                user={user}
                settings={activeSettings}
                focusSection={activeSection}
                onSettingsSaved={onSettingsUpdated}
                onUserUpdated={onUserUpdated}
                onLoggedOut={onLogout}
                onShowToast={onShowToast}
              />
            )}

          {(activeSection === 'help-centre' ||
            activeSection === 'report-problem' ||
            activeSection === 'terms') && (
            <HelpSupportPanel
              user={user}
              focusSection={activeSection}
              onShowToast={onShowToast}
            />
          )}

          {activeSection === 'admin-settings' && (
            <AdminSettingsPanel
              user={user}
              onOpenCeoSection={onOpenCeoSection}
              onOpenAdminDashboard={onOpenAdminDashboard}
              onOpenMasterControl={onOpenMasterControl}
            />
          )}
        </main>
      </div>
    </div>
  );
};
