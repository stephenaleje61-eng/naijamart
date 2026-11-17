import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import { AppNotification, AppNotificationType, NotificationPreferences } from '../types.js';
import { db, stripUndefined, toIsoString } from './firebase.js';

const LOCAL_NOTIFS_PREFIX = 'nuh_notifications_cache_v1_';
const LOCAL_PREFS_PREFIX = 'nuh_notification_prefs_v1_';

export const DEFAULT_NOTIFICATION_PREFERENCES = (userId: string): NotificationPreferences => ({
  userId,
  messages: true,
  enquiries: true,
  approvals: true,
  announcements: true,
  footballUpdates: true,
  favourites: true,
  subscriptionsAndAds: true,
  browserAlertsEnabled: false,
  updatedAt: new Date().toISOString()
});

function sanitizeNotification(id: string, data: any): AppNotification {
  return {
    id: String(data?.id || id),
    userId: String(data?.userId || ''),
    type: (data?.type || 'system') as AppNotificationType,
    title: String(data?.title || 'NIGERIA UNIVERSITY HUB Update'),
    body: String(data?.body || ''),
    read: Boolean(data?.read),
    ...(data?.targetType ? { targetType: String(data.targetType) } : {}),
    ...(data?.targetId ? { targetId: String(data.targetId) } : {}),
    ...(data?.institutionId ? { institutionId: String(data.institutionId) } : {}),
    createdAt: data?.createdAt ? toIsoString(data.createdAt) : new Date().toISOString()
  };
}

export function subscribeToUserNotifications(
  userId: string | undefined,
  onData: (items: AppNotification[]) => void
): () => void {
  if (!userId) {
    onData([]);
    return () => {};
  }

  try {
    const cached = localStorage.getItem(`${LOCAL_NOTIFS_PREFIX}${userId}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) onData(parsed);
    }
  } catch {
    // Non-blocking
  }

  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(60)
    );
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => sanitizeNotification(d.id, d.data()));
        try {
          localStorage.setItem(`${LOCAL_NOTIFS_PREFIX}${userId}`, JSON.stringify(list));
        } catch {
          // Non-blocking
        }
        onData(list);
      },
      (err) => {
        console.warn('[subscribeToUserNotifications]:', err?.message || err);
      }
    );
  } catch {
    return () => {};
  }
}

export async function createNotification(params: {
  userId: string;
  type: AppNotificationType;
  title: string;
  body: string;
  targetType?: string;
  targetId?: string;
  institutionId?: string;
}): Promise<void> {
  if (!params.userId || !params.title.trim()) return;
  const id = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const payload: AppNotification = stripUndefined({
    id,
    userId: params.userId,
    type: params.type,
    title: params.title.trim().slice(0, 140),
    body: params.body.trim().slice(0, 400),
    read: false,
    ...(params.targetType ? { targetType: params.targetType } : {}),
    ...(params.targetId ? { targetId: params.targetId } : {}),
    ...(params.institutionId ? { institutionId: params.institutionId } : {}),
    createdAt: new Date().toISOString()
  });

  try {
    await setDoc(doc(db, 'notifications', id), payload);
  } catch {
    // Non-blocking notification delivery
  }
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  if (!notificationId) return;
  try {
    await updateDoc(doc(db, 'notifications', notificationId), { read: true });
  } catch {
    // Non-blocking
  }
}

export async function markAllNotificationsRead(notifications: AppNotification[]): Promise<void> {
  const unread = notifications.filter((n) => !n.read);
  if (unread.length === 0) return;
  try {
    const batch = writeBatch(db);
    for (const item of unread.slice(0, 50)) {
      batch.update(doc(db, 'notifications', item.id), { read: true });
    }
    await batch.commit();
  } catch {
    // Non-blocking
  }
}

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const defaults = DEFAULT_NOTIFICATION_PREFERENCES(userId);
  if (!userId) return defaults;

  try {
    const rawLocal = localStorage.getItem(`${LOCAL_PREFS_PREFIX}${userId}`);
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      if (parsed && parsed.userId === userId) {
        return { ...defaults, ...parsed };
      }
    }
  } catch {
    // Continue to Firestore
  }

  try {
    const snap = await getDoc(doc(db, 'notificationPreferences', userId));
    if (snap.exists()) {
      return { ...defaults, ...(snap.data() as any), userId };
    }
  } catch {
    // Fallback to defaults
  }
  return defaults;
}

export async function saveNotificationPreferences(
  userId: string,
  prefs: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  const current = await getNotificationPreferences(userId);
  const next: NotificationPreferences = {
    ...current,
    ...prefs,
    userId,
    updatedAt: new Date().toISOString()
  };

  try {
    localStorage.setItem(`${LOCAL_PREFS_PREFIX}${userId}`, JSON.stringify(next));
  } catch {
    // Non-blocking
  }

  try {
    await setDoc(doc(db, 'notificationPreferences', userId), stripUndefined(next), { merge: true });
  } catch {
    // Non-blocking
  }

  return next;
}

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  try {
    return await window.Notification.requestPermission();
  } catch {
    return window.Notification.permission;
  }
}

export function triggerBrowserAlert(title: string, body: string): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (window.Notification.permission !== 'granted') return;
  try {
    new window.Notification(title, {
      body: body.slice(0, 180),
      icon: '/pwa-192x192.png'
    });
  } catch {
    // Silent fallback when browser restricts foreground notifications
  }
}
