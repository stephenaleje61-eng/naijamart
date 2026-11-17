import React, { useEffect, useState } from 'react';
import {
  Bell,
  BellRing,
  CheckCheck,
  Heart,
  Loader2,
  MessageSquare,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserPlus,
  X
} from 'lucide-react';
import { AppNotification, NotificationPreferences } from '../types.js';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  getNotificationPreferences,
  markAllNotificationsRead,
  markNotificationRead,
  requestBrowserNotificationPermission,
  saveNotificationPreferences
} from '../services/notifications.js';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  notifications: AppNotification[];
  onNotificationClick?: (notification: AppNotification) => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  userId,
  notifications,
  onNotificationClick
}) => {
  const [activeTab, setActiveTab] = useState<'feed' | 'preferences'>('feed');
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'messages' | 'social' | 'security' | 'announcements'>('all');
  const [prefs, setPrefs] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES(userId || 'guest')
  );
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [browserPermission, setBrowserPermission] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window
      ? window.Notification.permission
      : 'unsupported'
  );

  useEffect(() => {
    if (!isOpen || !userId) return;
    getNotificationPreferences(userId).then(setPrefs).catch(() => {});
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const filtered = notifications.filter((n) => {
    if (filterType === 'unread') return !n.read;
    if (filterType === 'messages') return n.type === 'message' || n.type === 'enquiry';
    if (filterType === 'social')
      return n.type === 'friend_request' || n.type === 'friend_accepted' || n.type === 'like' || n.type === 'comment';
    if (filterType === 'security')
      return n.type === 'security_warning' || n.type === 'verification' || n.type === 'report';
    if (filterType === 'announcements')
      return n.type === 'announcement' || n.type === 'football' || n.type === 'system';
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleTogglePref = async (key: keyof Omit<NotificationPreferences, 'userId' | 'updatedAt'>) => {
    if (!userId) return;
    setSavingPrefs(true);
    try {
      const next = await saveNotificationPreferences(userId, { [key]: !prefs[key] });
      setPrefs(next);
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleEnableBrowserAlerts = async () => {
    const result = await requestBrowserNotificationPermission();
    setBrowserPermission(result);
    if (result === 'granted' && userId) {
      const next = await saveNotificationPreferences(userId, { browserAlertsEnabled: true });
      setPrefs(next);
    }
  };

  const getTypeBadgeIcon = (type: AppNotification['type']) => {
    if (type === 'message' || type === 'enquiry' || type === 'comment') {
      return <MessageSquare className="w-4 h-4 text-[#087443]" />;
    }
    if (type === 'friend_request') {
      return <UserPlus className="w-4 h-4 text-[#087443]" />;
    }
    if (type === 'friend_accepted') {
      return <UserCheck className="w-4 h-4 text-[#087443]" />;
    }
    if (type === 'like' || type === 'favourite') {
      return <Heart className="w-4 h-4 text-rose-500" />;
    }
    if (type === 'security_warning' || type === 'report') {
      return <ShieldAlert className="w-4 h-4 text-amber-600" />;
    }
    if (type === 'approval' || type === 'subscription' || type === 'verification') {
      return <ShieldCheck className="w-4 h-4 text-[#D4A62A]" />;
    }
    return <Sparkles className="w-4 h-4 text-[#172B24]" />;
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#172B24]/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Notification Centre"
    >
      <div className="bg-white w-full max-w-2xl max-h-[88vh] rounded-2xl shadow-2xl border border-[#D9E5DF] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#172B24] text-white px-5 py-4 flex items-center justify-between gap-4 border-b border-[#D4A62A]/40">
          <div className="flex items-center gap-2.5">
            <BellRing className="w-5 h-5 text-[#D4A62A]" />
            <div>
              <h2 className="text-base font-extrabold tracking-tight">NOTIFICATION CENTRE</h2>
              <p className="text-xs text-slate-200 tabular-nums">
                {unreadCount} unread alert{unreadCount === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-10 min-w-10 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
            aria-label="Close notifications"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-[#F5F8F6] px-5 py-2.5 border-b border-[#D9E5DF] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('feed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap shrink-0 ${
                activeTab === 'feed'
                  ? 'bg-[#087443] text-white'
                  : 'bg-white text-[#172B24] border border-[#D9E5DF]'
              }`}
            >
              Notifications Feed
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preferences')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap shrink-0 ${
                activeTab === 'preferences'
                  ? 'bg-[#172B24] text-white'
                  : 'bg-white text-[#172B24] border border-[#D9E5DF]'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Alert Preferences</span>
            </button>
          </div>

          {activeTab === 'feed' && unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllNotificationsRead(notifications)}
              className="text-xs font-bold text-[#087443] hover:text-[#065D36] flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {activeTab === 'feed' ? (
            <>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'unread', label: `Unread (${unreadCount})` },
                  { id: 'social', label: 'Friends & Posts' },
                  { id: 'messages', label: 'Messages' },
                  { id: 'security', label: 'Verification & Safety' },
                  { id: 'announcements', label: 'Announcements' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilterType(tab.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition ${
                      filterType === tab.id
                        ? 'bg-[#172B24] text-white'
                        : 'bg-[#F5F8F6] text-[#172B24] hover:bg-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {filtered.length === 0 ? (
                <div className="py-12 text-center bg-[#F5F8F6] rounded-xl border border-[#D9E5DF]">
                  <Bell className="w-9 h-9 text-[#172B24]/35 mx-auto mb-2.5" />
                  <p className="text-sm font-bold text-[#172B24]">You are all caught up</p>
                  <p className="text-xs text-slate-600 mt-1">
                    {userId
                      ? 'Friend requests, post likes & comments, direct messages, verifications, and safety notices appear here.'
                      : 'Sign in to receive real-time alerts across your campus account.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filtered.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (!item.read) markNotificationRead(item.id);
                        onNotificationClick?.(item);
                      }}
                      className={`w-full text-left p-3.5 rounded-xl border transition flex items-start gap-3 ${
                        item.read
                          ? 'bg-white border-slate-200 hover:border-[#087443]'
                          : 'bg-[#F5F8F6] border-[#087443]/40 hover:border-[#087443]'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-lg bg-white border border-[#D9E5DF] flex items-center justify-center shrink-0">
                        {getTypeBadgeIcon(item.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs sm:text-sm font-bold text-[#172B24] truncate">
                            {item.title}
                          </h4>
                          {!item.read && (
                            <span className="text-[10px] font-extrabold text-[#087443] shrink-0">
                              NEW
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{item.body}</p>
                        <p className="text-[11px] text-slate-400 mt-1 tabular-nums">
                          {new Date(item.createdAt).toLocaleString('en-NG')}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#F5F8F6] border border-[#D9E5DF] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-[#172B24]">Browser Push Permission</h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Status: <span className="font-bold capitalize">{browserPermission}</span>. Allow alerts on supported devices.
                  </p>
                </div>
                {browserPermission !== 'granted' && browserPermission !== 'unsupported' && (
                  <button
                    type="button"
                    onClick={handleEnableBrowserAlerts}
                    className="px-4 py-2 rounded-lg bg-[#087443] hover:bg-[#065D36] text-white text-xs font-bold whitespace-nowrap shrink-0 transition"
                  >
                    Allow Browser Alerts
                  </button>
                )}
              </div>

              {!userId ? (
                <p className="text-xs text-slate-600">Sign in to save personal notification preferences.</p>
              ) : (
                <div className="divide-y divide-slate-100 border border-[#D9E5DF] rounded-xl overflow-hidden">
                  {(
                    [
                      ['messages', 'Private Messages, Friend Requests & Replies'],
                      ['enquiries', 'Product, Housing & Service Enquiries'],
                      ['approvals', 'CEO Verification Badges & Safety Reviews'],
                      ['announcements', 'National & Campus Announcements'],
                      ['footballUpdates', 'Campus Football & Sports Fixtures'],
                      ['favourites', 'Post Likes, Comments & Saved Listings'],
                      ['subscriptionsAndAds', 'Subscription & Advertisement Status']
                    ] as const
                  ).map(([key, label]) => (
                    <label
                      key={key}
                      className="flex items-center justify-between gap-3 px-4 py-3 bg-white hover:bg-[#F5F8F6] cursor-pointer"
                    >
                      <span className="text-xs sm:text-sm font-semibold text-[#172B24]">{label}</span>
                      <input
                        type="checkbox"
                        checked={Boolean(prefs[key])}
                        onChange={() => handleTogglePref(key)}
                        className="w-4 h-4 accent-[#087443]"
                      />
                    </label>
                  ))}
                </div>
              )}
              {savingPrefs && (
                <p className="text-xs text-[#087443] flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving preferences...</span>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
