import React, { useEffect, useState } from 'react';
import {
  Bell,
  BookOpen,
  Calculator,
  Globe,
  Loader2,
  Moon,
  Palette,
  ShoppingBag,
  Sparkles,
  Sun,
  Monitor,
  Heart,
  Store
} from 'lucide-react';
import {
  AcademicSettings,
  AppearanceSettings,
  ExtendedNotificationPreferences,
  GradingScaleOption,
  Institution,
  LanguageRegionSettings,
  MarketplaceSettings,
  User,
  UserSettingsDocument
} from '../../types.js';
import { NIGERIA_STATES } from '../../constants/states.js';
import { findInstitutionById } from '../../constants/institutions.js';
import { requestBrowserNotificationPermission } from '../../services/notifications.js';
import { saveUserSettings } from '../../services/settings.js';
import { applyAppearanceSettings } from '../../utils/theme.js';

interface NotificationSettingsPanelProps {
  user: User;
  settings: UserSettingsDocument;
  onSettingsSaved: (next: UserSettingsDocument) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const NotificationSettingsPanel: React.FC<NotificationSettingsPanelProps> = ({
  user,
  settings,
  onSettingsSaved,
  onShowToast
}) => {
  const [prefs, setPrefs] = useState<ExtendedNotificationPreferences>(settings.notifications);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPrefs(settings.notifications);
  }, [settings.notifications]);

  const handleEnableBrowserAlerts = async () => {
    const res = await requestBrowserNotificationPermission();
    if (res === 'granted') {
      setPrefs((p) => ({ ...p, browserAlertsEnabled: true }));
      onShowToast('Browser push notifications enabled!', 'success');
    } else if (res === 'denied') {
      setPrefs((p) => ({ ...p, browserAlertsEnabled: false }));
      onShowToast('Browser notification permission was denied in browser settings.', 'info');
    } else {
      onShowToast('Browser notifications are not supported on this device.', 'info');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const next = await saveUserSettings(user.id, { notifications: prefs }, user);
      onSettingsSaved(next);
      onShowToast('Notification preferences saved.', 'success');
    } catch (err: any) {
      onShowToast(err?.message || 'Unable to save notifications.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const items: {
    key: keyof Omit<ExtendedNotificationPreferences, 'enabled' | 'browserAlertsEnabled' | 'suspiciousLoginAlerts'>;
    label: string;
    desc: string;
  }[] = [
    { key: 'newMessages', label: 'New Messages & Direct Chats', desc: 'Private chats, buyer enquiries, and seller replies.' },
    { key: 'marketplaceActivities', label: 'Marketplace Orders & Activities', desc: 'Order updates, inspection bookings, and listing alerts.' },
    { key: 'commentsAndLikes', label: 'Comments & Likes on Posts', desc: 'Replies, reactions, and discussions on your campus posts.' },
    { key: 'universityAnnouncements', label: 'University & Campus Announcements', desc: 'Official campus notices, sports updates, and academic alerts.' },
    { key: 'newFollowers', label: 'New Followers & Friend Requests', desc: 'Friend requests, store followers, and classmate connections.' },
    { key: 'groupActivities', label: 'University Groups & Hub Chat', desc: 'Activity inside your university community & faculty groups.' },
    { key: 'advertisementsAndPromotions', label: 'Sponsored Promotions & Student Deals', desc: 'Verified campus deals, giveaways, and student discounts.' },
    { key: 'platformUpdates', label: 'Platform Feature & App Updates', desc: 'Important system notices, safety advisories, and PWA releases.' }
  ];

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#F1F5F9] dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-[#202938] dark:text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#16834A]" />
              Master Notification Controls
            </h3>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
              Enable or pause all platform notifications with a single switch.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={prefs.enabled}
            onClick={() => setPrefs((p) => ({ ...p, enabled: !p.enabled }))}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors cursor-pointer ${
              prefs.enabled ? 'bg-[#16834A]' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-0.5 ${
                prefs.enabled ? 'translate-x-5.5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        <div className="divide-y divide-[#F1F5F9] dark:divide-slate-800">
          {items.map((item) => {
            const active = prefs.enabled && prefs[item.key];
            return (
              <label
                key={item.key}
                className={`flex items-center justify-between gap-4 py-3.5 cursor-pointer ${
                  !prefs.enabled ? 'opacity-50' : ''
                }`}
              >
                <div>
                  <div className="text-sm font-semibold text-[#202938] dark:text-white">
                    {item.label}
                  </div>
                  <div className="text-xs text-[#64748B] dark:text-slate-400">{item.desc}</div>
                </div>
                <button
                  type="button"
                  disabled={!prefs.enabled}
                  role="switch"
                  aria-checked={active}
                  onClick={() => setPrefs((p) => ({ ...p, [item.key]: !p[item.key] }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors cursor-pointer ${
                    active ? 'bg-[#16834A]' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-0.5 ${
                      active ? 'translate-x-5.5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </label>
            );
          })}
        </div>

        <div className="p-3.5 rounded-xl bg-[#F5F7FA] dark:bg-slate-800/70 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-[#202938] dark:text-white">
              Real-Time Browser Push Alerts
            </div>
            <div className="text-[11px] text-[#64748B] dark:text-slate-400">
              Receive instant pop-up alerts even when another tab is open.
            </div>
          </div>
          <button
            type="button"
            onClick={handleEnableBrowserAlerts}
            className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 text-xs font-bold text-[#16834A] hover:bg-[#E8F5EE] transition cursor-pointer"
          >
            {prefs.browserAlertsEnabled ? 'Browser Alerts Active' : 'Enable Browser Alerts'}
          </button>
        </div>

        <div className="pt-2 border-t border-[#F1F5F9] dark:border-slate-800 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#16834A] hover:bg-[#126B3C] text-white text-sm font-bold shadow-xs transition disabled:opacity-60 cursor-pointer"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving Notifications...' : 'Save Notification Preferences'}
          </button>
        </div>
      </div>
    </form>
  );
};

interface AppearanceSettingsPanelProps {
  user: User | null;
  settings: UserSettingsDocument;
  onSettingsSaved: (next: UserSettingsDocument) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AppearanceSettingsPanel: React.FC<AppearanceSettingsPanelProps> = ({
  user,
  settings,
  onSettingsSaved,
  onShowToast
}) => {
  const [appearance, setAppearance] = useState<AppearanceSettings>(settings.appearance);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAppearance(settings.appearance);
  }, [settings.appearance]);

  const applyImmediate = (patch: Partial<AppearanceSettings>) => {
    const next = { ...appearance, ...patch };
    setAppearance(next);
    applyAppearanceSettings(next);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    applyAppearanceSettings(appearance);
    if (!user) {
      onShowToast('Appearance applied on this device.', 'success');
      return;
    }
    setSaving(true);
    try {
      const next = await saveUserSettings(user.id, { appearance }, user);
      onSettingsSaved(next);
      onShowToast('Appearance preferences saved and synced.', 'success');
    } catch (err: any) {
      onShowToast(err?.message || 'Could not save appearance settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const themes: { id: AppearanceSettings['theme']; label: string; desc: string; icon: React.ReactNode }[] = [
    { id: 'light', label: 'Light Mode', desc: 'Crisp white cards & Nigeria green accents', icon: <Sun className="w-5 h-5 text-amber-500" /> },
    { id: 'dark', label: 'Dark Mode', desc: 'Low-glare midnight theme for night study', icon: <Moon className="w-5 h-5 text-indigo-400" /> },
    { id: 'system', label: 'System Default', desc: 'Automatically matches your phone or PC', icon: <Monitor className="w-5 h-5 text-[#16834A]" /> }
  ];

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
        <h3 className="text-sm font-bold text-[#202938] dark:text-white flex items-center gap-2">
          <Palette className="w-4 h-4 text-[#16834A]" />
          Theme & Display Mode
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {themes.map((t) => {
            const active = appearance.theme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => applyImmediate({ theme: t.id })}
                className={`p-4 rounded-xl border text-left transition cursor-pointer ${
                  active
                    ? 'border-[#16834A] bg-[#E8F5EE]/70 dark:bg-emerald-950/50 ring-1 ring-[#16834A]/30'
                    : 'border-[#E2E8F0] dark:border-slate-700 hover:bg-[#F5F7FA] dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  {t.icon}
                  <span
                    className={`w-3.5 h-3.5 rounded-full border-2 ${
                      active ? 'border-[#16834A] bg-[#16834A]' : 'border-slate-300 dark:border-slate-600'
                    }`}
                  />
                </div>
                <div className="text-sm font-bold text-[#202938] dark:text-white">{t.label}</div>
                <div className="text-[11px] text-[#64748B] dark:text-slate-400 mt-0.5">{t.desc}</div>
              </button>
            );
          })}
        </div>

        <div>
          <label className="block text-xs font-bold text-[#202938] dark:text-slate-200 mb-2">
            Readable Font Size
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            {(['small', 'medium', 'large'] as const).map((sz) => {
              const active = appearance.fontSize === sz;
              return (
                <button
                  key={sz}
                  type="button"
                  onClick={() => applyImmediate({ fontSize: sz })}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold capitalize transition cursor-pointer ${
                    active
                      ? 'bg-[#16834A] border-[#16834A] text-white'
                      : 'bg-[#F5F7FA] dark:bg-slate-800 border-[#E2E8F0] dark:border-slate-700 text-[#202938] dark:text-slate-200'
                  }`}
                >
                  {sz}
                </button>
              );
            })}
          </div>
        </div>

        <label className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-[#F5F7FA] dark:bg-slate-800/70 cursor-pointer">
          <div>
            <div className="text-sm font-semibold text-[#202938] dark:text-white">Compact Layout Mode</div>
            <div className="text-xs text-[#64748B] dark:text-slate-400">
              Fit more listings and settings cards neatly on smaller mobile screens.
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={appearance.compactMode}
            onClick={() => applyImmediate({ compactMode: !appearance.compactMode })}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors cursor-pointer ${
              appearance.compactMode ? 'bg-[#16834A]' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-0.5 ${
                appearance.compactMode ? 'translate-x-5.5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </label>

        <div className="pt-2 border-t border-[#F1F5F9] dark:border-slate-800 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#16834A] hover:bg-[#126B3C] text-white text-sm font-bold shadow-xs transition disabled:opacity-60 cursor-pointer"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving...' : 'Save Appearance'}
          </button>
        </div>
      </div>
    </form>
  );
};

interface AcademicSettingsPanelProps {
  user: User;
  settings: UserSettingsDocument;
  onSettingsSaved: (next: UserSettingsDocument) => void;
  onOpenGpaCalculator: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AcademicSettingsPanel: React.FC<AcademicSettingsPanelProps> = ({
  user,
  settings,
  onSettingsSaved,
  onOpenGpaCalculator,
  onShowToast
}) => {
  const [academic, setAcademic] = useState<AcademicSettings>(settings.academic);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAcademic(settings.academic);
  }, [settings.academic]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const next = await saveUserSettings(user.id, { academic }, user);
      onSettingsSaved(next);
      onShowToast('Academic & GPA calculator defaults saved.', 'success');
    } catch (err: any) {
      onShowToast(err?.message || 'Unable to save academic preferences.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#202938] dark:text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#16834A]" />
              Academic & CGPA Preferences
            </h3>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
              Customize your active session, semester, and default Nigerian university grading scale.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenGpaCalculator}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#E8F5EE] dark:bg-emerald-950/60 text-[#16834A] text-xs font-bold hover:bg-[#D5EFE1] transition cursor-pointer"
          >
            <Calculator className="w-3.5 h-3.5" />
            Open GPA / CGPA Calculator
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#202938] dark:text-slate-200 mb-1.5">
              Active Academic Session
            </label>
            <select
              value={academic.academicSession}
              onChange={(e) => setAcademic((a) => ({ ...a, academicSession: e.target.value }))}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#F5F7FA] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#202938] dark:text-white focus:border-[#16834A] outline-none"
            >
              <option value="2023/2024">2023/2024</option>
              <option value="2024/2025">2024/2025</option>
              <option value="2025/2026">2025/2026</option>
              <option value="2026/2027">2026/2027</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#202938] dark:text-slate-200 mb-1.5">
              Current Semester
            </label>
            <select
              value={academic.semester}
              onChange={(e) =>
                setAcademic((a) => ({ ...a, semester: e.target.value as AcademicSettings['semester'] }))
              }
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#F5F7FA] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#202938] dark:text-white focus:border-[#16834A] outline-none"
            >
              <option value="First Semester">First Semester</option>
              <option value="Second Semester">Second Semester</option>
              <option value="Harmattan Semester">Harmattan Semester</option>
              <option value="Rain Semester">Rain Semester</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#202938] dark:text-slate-200 mb-1.5">
              Default GPA / CGPA Scale
            </label>
            <select
              value={academic.defaultGpaScale}
              onChange={(e) =>
                setAcademic((a) => ({ ...a, defaultGpaScale: e.target.value as GradingScaleOption }))
              }
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#F5F7FA] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#202938] dark:text-white focus:border-[#16834A] outline-none"
            >
              <option value="5.0">5.0 Scale (Most Nigerian Universities)</option>
              <option value="4.0">4.0 Scale (Polytechnics & 4.0 Universities)</option>
              <option value="7.0">7.0 Scale (Legacy UI / 7-Point Scale)</option>
              <option value="custom">Custom Grading System</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#202938] dark:text-slate-200 mb-1.5">
              Target CGPA Goal
            </label>
            <input
              type="number"
              step="0.05"
              min="1.0"
              max="7.0"
              value={academic.targetCgpa}
              onChange={(e) =>
                setAcademic((a) => ({ ...a, targetCgpa: Number(e.target.value) || 4.5 }))
              }
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#F5F7FA] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#202938] dark:text-white focus:border-[#16834A] outline-none"
            />
          </div>
        </div>

        <label className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-[#F5F7FA] dark:bg-slate-800/70 cursor-pointer">
          <div>
            <div className="text-sm font-semibold text-[#202938] dark:text-white">
              Course Registration & Academic Calendar Alerts
            </div>
            <div className="text-xs text-[#64748B] dark:text-slate-400">
              Get notified about semester deadlines, past questions, and exam updates for your campus.
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={academic.courseRegistrationAlerts}
            onClick={() =>
              setAcademic((a) => ({ ...a, courseRegistrationAlerts: !a.courseRegistrationAlerts }))
            }
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors cursor-pointer ${
              academic.courseRegistrationAlerts ? 'bg-[#16834A]' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-0.5 ${
                academic.courseRegistrationAlerts ? 'translate-x-5.5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </label>

        <div className="pt-2 border-t border-[#F1F5F9] dark:border-slate-800 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#16834A] hover:bg-[#126B3C] text-white text-sm font-bold shadow-xs transition disabled:opacity-60 cursor-pointer"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving...' : 'Save Academic Preferences'}
          </button>
        </div>
      </div>
    </form>
  );
};

interface MarketplaceSettingsPanelProps {
  user: User;
  institutions: Institution[];
  settings: UserSettingsDocument;
  onSettingsSaved: (next: UserSettingsDocument) => void;
  onOpenMyProducts: () => void;
  onOpenSavedAndOrders: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const MarketplaceSettingsPanel: React.FC<MarketplaceSettingsPanelProps> = ({
  user,
  institutions,
  settings,
  onSettingsSaved,
  onOpenMyProducts,
  onOpenSavedAndOrders,
  onShowToast
}) => {
  const [mp, setMp] = useState<MarketplaceSettings>(settings.marketplace);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMp(settings.marketplace);
  }, [settings.marketplace]);

  const userInst = findInstitutionById(user.institutionId, institutions);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const next = await saveUserSettings(user.id, { marketplace: mp }, user);
      onSettingsSaved(next);
      onShowToast('Marketplace buying & selling preferences saved.', 'success');
    } catch (err: any) {
      onShowToast(err?.message || 'Unable to save marketplace settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {/* Quick Marketplace Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onOpenMyProducts}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 hover:border-[#16834A] text-left flex items-center justify-between gap-3 transition cursor-pointer shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E8F5EE] dark:bg-emerald-950/60 flex items-center justify-center">
              <Store className="w-5 h-5 text-[#16834A]" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#202938] dark:text-white">Manage My Products</div>
              <div className="text-xs text-[#64748B] dark:text-slate-400">Listings, prices & stock</div>
            </div>
          </div>
          <Sparkles className="w-4 h-4 text-[#16834A]" />
        </button>

        <button
          type="button"
          onClick={onOpenSavedAndOrders}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 hover:border-[#16834A] text-left flex items-center justify-between gap-3 transition cursor-pointer shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E8F5EE] dark:bg-emerald-950/60 flex items-center justify-center">
              <Heart className="w-5 h-5 text-[#16834A]" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#202938] dark:text-white">Saved Products & Orders</div>
              <div className="text-xs text-[#64748B] dark:text-slate-400">Favourites & purchase history</div>
            </div>
          </div>
          <ShoppingBag className="w-4 h-4 text-[#16834A]" />
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
        <h3 className="text-sm font-bold text-[#202938] dark:text-white flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-[#16834A]" />
          Default Selling & Delivery Preferences
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#202938] dark:text-slate-200 mb-1.5">
              Marketplace Role
            </label>
            <select
              value={mp.marketplaceRole}
              onChange={(e) =>
                setMp((m) => ({
                  ...m,
                  marketplaceRole: e.target.value as MarketplaceSettings['marketplaceRole']
                }))
              }
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#F5F7FA] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#202938] dark:text-white focus:border-[#16834A] outline-none"
            >
              <option value="buyer">Buyer Only</option>
              <option value="seller">Seller / Vendor</option>
              <option value="both">Both Buyer & Seller</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#202938] dark:text-slate-200 mb-1.5">
              Preferred Contact Method
            </label>
            <select
              value={mp.contactPreference}
              onChange={(e) =>
                setMp((m) => ({
                  ...m,
                  contactPreference: e.target.value as MarketplaceSettings['contactPreference']
                }))
              }
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#F5F7FA] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#202938] dark:text-white focus:border-[#16834A] outline-none"
            >
              <option value="whatsapp">WhatsApp Chat Preferred</option>
              <option value="phone">Direct Phone Call</option>
              <option value="both">WhatsApp & Phone Call</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#202938] dark:text-slate-200 mb-1.5">
              Default Listing Campus
            </label>
            <input
              type="text"
              value={mp.defaultListingCampus}
              onChange={(e) => setMp((m) => ({ ...m, defaultListingCampus: e.target.value }))}
              placeholder={userInst?.campus || 'e.g. Main Campus'}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#F5F7FA] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#202938] dark:text-white focus:border-[#16834A] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#202938] dark:text-slate-200 mb-1.5">
              Default Item Condition
            </label>
            <select
              value={mp.defaultListingCondition}
              onChange={(e) =>
                setMp((m) => ({ ...m, defaultListingCondition: e.target.value as 'new' | 'used' }))
              }
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#F5F7FA] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#202938] dark:text-white focus:border-[#16834A] outline-none"
            >
              <option value="used">Fairly Used (Student Pre-owned)</option>
              <option value="new">Brand New</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#202938] dark:text-slate-200 mb-1.5">
              Default Delivery State
            </label>
            <select
              value={mp.defaultDeliveryState}
              onChange={(e) => setMp((m) => ({ ...m, defaultDeliveryState: e.target.value }))}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#F5F7FA] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#202938] dark:text-white focus:border-[#16834A] outline-none"
            >
              <option value="">Select State</option>
              {NIGERIA_STATES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#202938] dark:text-slate-200 mb-1.5">
              Default Hostel / Campus Area
            </label>
            <input
              type="text"
              value={mp.defaultDeliveryCity}
              onChange={(e) => setMp((m) => ({ ...m, defaultDeliveryCity: e.target.value }))}
              placeholder="e.g. Moremi Hall, Hostel B, Samaru..."
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#F5F7FA] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#202938] dark:text-white focus:border-[#16834A] outline-none"
            />
          </div>
        </div>

        <label className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-[#F5F7FA] dark:bg-slate-800/70 cursor-pointer">
          <div>
            <div className="text-sm font-semibold text-[#202938] dark:text-white">
              Price Drop Alerts on Saved Items
            </div>
            <div className="text-xs text-[#64748B] dark:text-slate-400">
              Notify me when sellers reduce prices on items in my favourites.
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={mp.autoNotifyPriceDrops}
            onClick={() => setMp((m) => ({ ...m, autoNotifyPriceDrops: !m.autoNotifyPriceDrops }))}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors cursor-pointer ${
              mp.autoNotifyPriceDrops ? 'bg-[#16834A]' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-0.5 ${
                mp.autoNotifyPriceDrops ? 'translate-x-5.5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </label>

        <div className="pt-2 border-t border-[#F1F5F9] dark:border-slate-800 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#16834A] hover:bg-[#126B3C] text-white text-sm font-bold shadow-xs transition disabled:opacity-60 cursor-pointer"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving...' : 'Save Marketplace Settings'}
          </button>
        </div>
      </div>
    </form>
  );
};

interface LanguageRegionPanelProps {
  user: User | null;
  settings: UserSettingsDocument;
  onSettingsSaved: (next: UserSettingsDocument) => void;
  onUserUpdated: (updated: User) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const LanguageRegionPanel: React.FC<LanguageRegionPanelProps> = ({
  user,
  settings,
  onSettingsSaved,
  onUserUpdated,
  onShowToast
}) => {
  const [lr, setLr] = useState<LanguageRegionSettings>(settings.languageRegion);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLr(settings.languageRegion);
  }, [settings.languageRegion]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onShowToast('Regional preference updated for this session.', 'success');
      return;
    }
    setSaving(true);
    try {
      const next = await saveUserSettings(user.id, { languageRegion: lr }, user);
      onSettingsSaved(next);
      onUserUpdated({
        ...user,
        state: lr.state || user.state,
        city: lr.city || user.city
      });
      onShowToast('Language and Nigeria region settings saved.', 'success');
    } catch (err: any) {
      onShowToast(err?.message || 'Could not save language and region settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
        <h3 className="text-sm font-bold text-[#202938] dark:text-white flex items-center gap-2">
          <Globe className="w-4 h-4 text-[#16834A]" />
          Language, Region & Currency (Nigeria)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#202938] dark:text-slate-200 mb-1.5">
              Display Language
            </label>
            <select
              value={lr.language}
              onChange={(e) =>
                setLr((prev) => ({
                  ...prev,
                  language: e.target.value as LanguageRegionSettings['language']
                }))
              }
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#F5F7FA] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#202938] dark:text-white focus:border-[#16834A] outline-none"
            >
              <option value="en-NG">English (Nigeria)</option>
              <option value="en">English (International)</option>
              <option value="pidgin">Nigerian Pidgin Friendly</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#202938] dark:text-slate-200 mb-1.5">
              Country
            </label>
            <input
              type="text"
              disabled
              value="Nigeria"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#F1F5F9] dark:bg-slate-800/60 border border-[#E2E8F0] dark:border-slate-700 text-[#64748B] dark:text-slate-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#202938] dark:text-slate-200 mb-1.5">
              State of Residence / Study
            </label>
            <select
              value={lr.state}
              onChange={(e) => setLr((prev) => ({ ...prev, state: e.target.value }))}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#F5F7FA] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#202938] dark:text-white focus:border-[#16834A] outline-none"
            >
              <option value="">Select Nigerian State</option>
              {NIGERIA_STATES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#202938] dark:text-slate-200 mb-1.5">
              City / Town
            </label>
            <input
              type="text"
              value={lr.city}
              onChange={(e) => setLr((prev) => ({ ...prev, city: e.target.value }))}
              placeholder="e.g. Lagos, Abuja, Nsukka, Zaria, Wukari..."
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#F5F7FA] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#202938] dark:text-white focus:border-[#16834A] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#202938] dark:text-slate-200 mb-1.5">
              Timezone
            </label>
            <select
              value={lr.timezone}
              onChange={(e) =>
                setLr((prev) => ({
                  ...prev,
                  timezone: e.target.value as 'Africa/Lagos' | 'UTC'
                }))
              }
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#F5F7FA] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#202938] dark:text-white focus:border-[#16834A] outline-none"
            >
              <option value="Africa/Lagos">West Africa Time — Africa/Lagos (WAT, UTC+1)</option>
              <option value="UTC">Coordinated Universal Time (UTC)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#202938] dark:text-slate-200 mb-1.5">
              Currency
            </label>
            <input
              type="text"
              disabled
              value="NGN (₦) — Nigerian Naira"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#F1F5F9] dark:bg-slate-800/60 border border-[#E2E8F0] dark:border-slate-700 text-[#64748B] dark:text-slate-400"
            />
          </div>
        </div>

        <div className="pt-2 border-t border-[#F1F5F9] dark:border-slate-800 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#16834A] hover:bg-[#126B3C] text-white text-sm font-bold shadow-xs transition disabled:opacity-60 cursor-pointer"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving...' : 'Save Language & Region'}
          </button>
        </div>
      </div>
    </form>
  );
};
