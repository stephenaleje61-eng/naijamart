import {
  EmailAuthProvider,
  deleteUser,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  updatePassword,
  updateProfile as updateFirebaseProfile,
  verifyBeforeUpdateEmail
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import {
  AcademicSettings,
  AppearanceSettings,
  DevicePlatformType,
  ExtendedNotificationPreferences,
  LanguageRegionSettings,
  MarketplaceSettings,
  NotificationPreferences,
  PrivacySettings,
  SecuritySettingsMeta,
  SellerProfile,
  SupportReportRecord,
  User,
  UserSessionRecord,
  UserSettingsDocument
} from '../types.js';
import {
  OperationType,
  auth,
  db,
  ensureGuestAuth,
  getUserSessionFromFirestore,
  handleFirestoreError,
  saveUserSessionCache,
  signOutFromFirebase,
  stripUndefined,
  toIsoString,
  updateUserProfileInFirestore
} from './firebase.js';
import { uploadImageToFirebaseStorage } from './imageStorage.js';
import { saveNotificationPreferences } from './notifications.js';
import { upsertInstitutionUserProfile } from './institutions.js';
import { DEFAULT_PRIVACY_SETTINGS, sanitizePrivacySettings } from '../utils/privacy.js';
import { applyAppearanceSettings, getStoredAppearanceSettings } from '../utils/theme.js';

const SETTINGS_CACHE_PREFIX = 'nuh_user_settings_v1_';
const DEVICE_SESSION_KEY = 'nuh_device_session_id_v1';

export const DEFAULT_APPEARANCE_SETTINGS: AppearanceSettings = {
  theme: 'light',
  fontSize: 'medium',
  compactMode: false
};

export const DEFAULT_LANGUAGE_REGION_SETTINGS: LanguageRegionSettings = {
  language: 'en-NG',
  country: 'Nigeria',
  state: '',
  city: '',
  timezone: 'Africa/Lagos',
  currency: 'NGN'
};

export function createDefaultUserSettings(user?: Partial<User> | null): UserSettingsDocument {
  const storedAppearance = getStoredAppearanceSettings();
  const userId = user?.id || '';
  const academic: AcademicSettings = {
    academicSession: user?.academicSession || '2025/2026',
    semester: 'First Semester',
    faculty: user?.faculty || '',
    department: user?.department || '',
    academicLevel: user?.levelOfStudy || '',
    matricNumber: user?.matricNumber || '',
    graduationStatus: user?.graduationStatus || 'undergraduate',
    institutionTypeFilter: user?.institutionType || 'all',
    courseRegistrationAlerts: true,
    defaultGpaScale: '5.0',
    targetCgpa: 4.5
  };

  const marketplace: MarketplaceSettings = {
    marketplaceRole: user?.role === 'seller' ? 'seller' : 'both',
    defaultListingCampus: user?.campus || '',
    defaultListingCondition: 'used',
    defaultDeliveryState: user?.state || '',
    defaultDeliveryCity: user?.city || '',
    contactPreference: user?.preferredContactMethod || 'whatsapp',
    autoNotifyPriceDrops: true,
    showSellerStoreBadge: true,
    marketplaceActivityAlerts: true
  };

  const notifications: ExtendedNotificationPreferences = {
    enabled: true,
    newMessages: true,
    marketplaceActivities: true,
    commentsAndLikes: true,
    universityAnnouncements: true,
    newFollowers: true,
    groupActivities: true,
    advertisementsAndPromotions: true,
    platformUpdates: true,
    browserAlertsEnabled: false,
    suspiciousLoginAlerts: true
  };

  const security: SecuritySettingsMeta = {
    suspiciousLoginAlerts: true,
    recoveryEmail: user?.email || '',
    recoveryPhone: user?.phone || user?.whatsappNumber || '',
    lastPasswordChangedAt: user?.lastPasswordChangedAt
  };

  return {
    userId,
    privacy: sanitizePrivacySettings(user?.privacy || DEFAULT_PRIVACY_SETTINGS),
    appearance: storedAppearance || DEFAULT_APPEARANCE_SETTINGS,
    academic,
    marketplace,
    notifications,
    languageRegion: {
      ...DEFAULT_LANGUAGE_REGION_SETTINGS,
      state: user?.state || '',
      city: user?.city || ''
    },
    security,
    updatedAt: new Date().toISOString()
  };
}

function mergeUserSettings(
  raw: any,
  user?: Partial<User> | null
): UserSettingsDocument {
  const base = createDefaultUserSettings(user);
  if (!raw || typeof raw !== 'object') return base;
  return {
    userId: String(raw.userId || base.userId),
    privacy: sanitizePrivacySettings({ ...base.privacy, ...(raw.privacy || {}) }),
    appearance: { ...base.appearance, ...(raw.appearance || {}) },
    academic: { ...base.academic, ...(raw.academic || {}) },
    marketplace: { ...base.marketplace, ...(raw.marketplace || {}) },
    notifications: { ...base.notifications, ...(raw.notifications || {}) },
    languageRegion: {
      ...base.languageRegion,
      ...(raw.languageRegion || {}),
      country: 'Nigeria',
      currency: 'NGN'
    },
    security: { ...base.security, ...(raw.security || {}) },
    updatedAt: raw.updatedAt ? toIsoString(raw.updatedAt) : base.updatedAt
  };
}

function readCachedSettings(userId: string): UserSettingsDocument | null {
  if (typeof window === 'undefined' || !userId) return null;
  try {
    const raw = localStorage.getItem(`${SETTINGS_CACHE_PREFIX}${userId}`);
    if (!raw) return null;
    return JSON.parse(raw) as UserSettingsDocument;
  } catch {
    return null;
  }
}

function writeCachedSettings(settings: UserSettingsDocument): void {
  if (typeof window === 'undefined' || !settings.userId) return;
  try {
    localStorage.setItem(`${SETTINGS_CACHE_PREFIX}${settings.userId}`, JSON.stringify(settings));
  } catch {
    // Non-blocking storage fallback
  }
}

function canWriteFirestoreUserOwnedDoc(userId: string): boolean {
  return Boolean(auth.currentUser && !auth.currentUser.isAnonymous && auth.currentUser.uid === userId);
}

export async function loadUserSettings(
  userId: string,
  user?: Partial<User> | null
): Promise<UserSettingsDocument> {
  const cached = readCachedSettings(userId);
  const fallback = mergeUserSettings(cached, user);
  if (!userId) return fallback;

  if (canWriteFirestoreUserOwnedDoc(userId)) {
    try {
      const snap = await getDoc(doc(db, 'userSettings', userId));
      if (snap.exists()) {
        const merged = mergeUserSettings(snap.data(), user);
        writeCachedSettings(merged);
        return merged;
      }
    } catch (err: any) {
      if (String(err?.code || '') === 'permission-denied') {
        console.warn('[loadUserSettings] fallback to cache:', err?.message);
      }
    }
  }
  return fallback;
}

export function subscribeToUserSettings(
  userId: string | undefined,
  user: Partial<User> | null,
  onUpdate: (settings: UserSettingsDocument) => void
): () => void {
  if (!userId) {
    const guestDefaults = createDefaultUserSettings(null);
    applyAppearanceSettings(guestDefaults.appearance);
    onUpdate(guestDefaults);
    return () => {};
  }

  const cached = readCachedSettings(userId);
  const initial = mergeUserSettings(cached, user);
  applyAppearanceSettings(initial.appearance);
  onUpdate(initial);

  if (!canWriteFirestoreUserOwnedDoc(userId)) {
    return () => {};
  }

  try {
    return onSnapshot(
      doc(db, 'userSettings', userId),
      (snap) => {
        if (snap.exists()) {
          const merged = mergeUserSettings(snap.data(), user);
          writeCachedSettings(merged);
          applyAppearanceSettings(merged.appearance);
          onUpdate(merged);
        } else {
          writeCachedSettings(initial);
          setDoc(doc(db, 'userSettings', userId), stripUndefined(initial), { merge: true }).catch(() => {});
        }
      },
      (err) => {
        console.warn('[subscribeToUserSettings warning]:', err?.message || err);
      }
    );
  } catch {
    return () => {};
  }
}

export async function saveUserSettings(
  userId: string,
  patch: Partial<Omit<UserSettingsDocument, 'userId' | 'updatedAt'>>,
  currentUser?: User | null
): Promise<UserSettingsDocument> {
  if (!userId) throw new Error('Please sign in to save your settings.');

  const current = await loadUserSettings(userId, currentUser);
  const next: UserSettingsDocument = {
    userId,
    privacy: sanitizePrivacySettings(patch.privacy ? { ...current.privacy, ...patch.privacy } : current.privacy),
    appearance: patch.appearance ? { ...current.appearance, ...patch.appearance } : current.appearance,
    academic: patch.academic ? { ...current.academic, ...patch.academic } : current.academic,
    marketplace: patch.marketplace ? { ...current.marketplace, ...patch.marketplace } : current.marketplace,
    notifications: patch.notifications
      ? { ...current.notifications, ...patch.notifications }
      : current.notifications,
    languageRegion: patch.languageRegion
      ? {
          ...current.languageRegion,
          ...patch.languageRegion,
          country: 'Nigeria',
          currency: 'NGN'
        }
      : current.languageRegion,
    security: patch.security ? { ...current.security, ...patch.security } : current.security,
    updatedAt: new Date().toISOString()
  };

  writeCachedSettings(next);
  applyAppearanceSettings(next.appearance);

  // Sync notifications to legacy notificationPreferences collection for seamless alert delivery
  if (patch.notifications) {
    const legacyNotifPatch: Partial<NotificationPreferences> = {
      messages: next.notifications.enabled && next.notifications.newMessages,
      enquiries: next.notifications.enabled && next.notifications.marketplaceActivities,
      approvals: next.notifications.enabled && next.notifications.marketplaceActivities,
      announcements: next.notifications.enabled && next.notifications.universityAnnouncements,
      footballUpdates: next.notifications.enabled && next.notifications.universityAnnouncements,
      favourites: next.notifications.enabled && next.notifications.marketplaceActivities,
      subscriptionsAndAds: next.notifications.enabled && next.notifications.advertisementsAndPromotions,
      browserAlertsEnabled: next.notifications.browserAlertsEnabled
    };
    await saveNotificationPreferences(userId, legacyNotifPatch).catch(() => {});
  }

  // Persist structured userSettings in Firestore when Firebase session matches
  if (canWriteFirestoreUserOwnedDoc(userId)) {
    try {
      await setDoc(doc(db, 'userSettings', userId), stripUndefined(next), { merge: true });
    } catch (err: any) {
      if (String(err?.code || '') === 'permission-denied') {
        handleFirestoreError(err, OperationType.WRITE, `userSettings/${userId}`);
      }
      throw err;
    }
  }

  // Mirror privacy + academic + region summary fields onto users/{userId} so public discovery enforces them
  const userMirror: Record<string, any> = {
    settingsUpdatedAt: next.updatedAt
  };
  if (patch.privacy) userMirror.privacy = next.privacy;
  if (patch.academic) {
    userMirror.faculty = next.academic.faculty;
    userMirror.department = next.academic.department;
    userMirror.levelOfStudy = next.academic.academicLevel;
    userMirror.matricNumber = next.academic.matricNumber || '';
    userMirror.graduationStatus = next.academic.graduationStatus;
    userMirror.academicSession = next.academic.academicSession;
  }
  if (patch.languageRegion) {
    if (next.languageRegion.state) userMirror.state = next.languageRegion.state;
    if (next.languageRegion.city) userMirror.city = next.languageRegion.city;
  }
  if (patch.marketplace?.contactPreference) {
    userMirror.preferredContactMethod = next.marketplace.contactPreference;
  }

  try {
    await setDoc(doc(db, 'users', userId), stripUndefined(userMirror), { merge: true });
    if (currentUser) {
      const updatedUser: User = {
        ...currentUser,
        ...userMirror,
        privacy: next.privacy
      };
      saveUserSessionCache(updatedUser);
    }
  } catch {
    // Non-blocking sync when offline
  }

  return next;
}

export async function checkUsernameAvailability(
  rawUsername: string,
  currentUserId: string
): Promise<{ available: boolean; normalized: string; reason?: string }> {
  const normalized = String(rawUsername || '')
    .trim()
    .toLowerCase()
    .replace(/^@+/, '');
  if (!normalized) {
    return { available: false, normalized: '', reason: 'Enter a username.' };
  }
  if (!/^[a-z0-9._]{3,24}$/.test(normalized)) {
    return {
      available: false,
      normalized,
      reason: 'Use 3–24 lowercase letters, numbers, dots, or underscores.'
    };
  }
  try {
    const snap = await getDocs(
      query(collection(db, 'users'), where('username', '==', normalized), limit(2))
    );
    const takenByOther = snap.docs.some((d) => d.id !== currentUserId);
    if (takenByOther) {
      return { available: false, normalized, reason: 'That username is already taken.' };
    }
    return { available: true, normalized };
  } catch {
    return { available: true, normalized };
  }
}

export async function uploadUserAvatar(
  userId: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> {
  const result = await uploadImageToFirebaseStorage(file, {
    folder: 'avatars',
    ownerId: userId,
    allowPersistentFallback: true,
    onProgress
  });
  return result.downloadUrl;
}

export async function saveAccountProfileUpdate(
  userId: string,
  patch: Partial<User>,
  currentUser?: User | null
): Promise<{ user: User; sellerProfile?: SellerProfile | null }> {
  if (!userId) throw new Error('Please sign in to update your profile.');

  const cleanUsername =
    patch.username !== undefined
      ? patch.username.trim().toLowerCase().replace(/^@+/, '')
      : undefined;

  if (cleanUsername) {
    const check = await checkUsernameAvailability(cleanUsername, userId);
    if (!check.available) {
      throw new Error(check.reason || 'Username is not available.');
    }
  }

  const now = new Date().toISOString();
  const payload: Record<string, any> = {
    updatedAt: now,
    settingsUpdatedAt: now
  };
  if (patch.name !== undefined) payload.name = patch.name.trim().slice(0, 120);
  if (cleanUsername !== undefined) payload.username = cleanUsername;
  if (patch.phone !== undefined) payload.phone = patch.phone.trim().slice(0, 40);
  if (patch.whatsappNumber !== undefined) payload.whatsappNumber = patch.whatsappNumber.trim().slice(0, 40);
  if (patch.bio !== undefined) payload.bio = patch.bio.trim().slice(0, 600);
  if (patch.avatarUrl !== undefined) payload.avatarUrl = patch.avatarUrl.trim();
  if (patch.state !== undefined) payload.state = patch.state.trim().slice(0, 64);
  if (patch.city !== undefined) payload.city = patch.city.trim().slice(0, 120);
  if (patch.institutionId !== undefined) payload.institutionId = patch.institutionId.trim().slice(0, 128);
  if (patch.institutionType !== undefined) payload.institutionType = patch.institutionType;
  if (patch.campus !== undefined) payload.campus = patch.campus.trim().slice(0, 120);
  if (patch.faculty !== undefined) payload.faculty = patch.faculty.trim().slice(0, 140);
  if (patch.department !== undefined) payload.department = patch.department.trim().slice(0, 140);
  if (patch.levelOfStudy !== undefined) payload.levelOfStudy = patch.levelOfStudy.trim().slice(0, 40);
  if (patch.matricNumber !== undefined) payload.matricNumber = patch.matricNumber.trim().slice(0, 60);
  if (patch.graduationStatus !== undefined) payload.graduationStatus = patch.graduationStatus;
  if (patch.academicSession !== undefined) payload.academicSession = patch.academicSession.trim().slice(0, 40);
  if (patch.accountType !== undefined) payload.accountType = patch.accountType;
  if (patch.preferredContactMethod !== undefined) payload.preferredContactMethod = patch.preferredContactMethod;

  await setDoc(doc(db, 'users', userId), stripUndefined(payload), { merge: true });

  // Update Firebase Auth profile display name / avatar when signed in with Firebase Auth
  if (auth.currentUser && auth.currentUser.uid === userId) {
    const authPatch: { displayName?: string; photoURL?: string } = {};
    if (payload.name) authPatch.displayName = payload.name;
    if (payload.avatarUrl && !payload.avatarUrl.startsWith('data:')) {
      authPatch.photoURL = payload.avatarUrl;
    }
    if (Object.keys(authPatch).length > 0) {
      await updateFirebaseProfile(auth.currentUser, authPatch).catch(() => {});
    }
  }

  // Sync institution membership profile when an institution is selected
  const effectiveInstId = payload.institutionId ?? currentUser?.institutionId;
  if (effectiveInstId) {
    await upsertInstitutionUserProfile({
      userId,
      name: payload.name || currentUser?.name || 'Student',
      email: currentUser?.email,
      phone: payload.phone ?? currentUser?.phone,
      whatsappNumber: payload.whatsappNumber ?? currentUser?.whatsappNumber,
      institutionId: effectiveInstId,
      campus: payload.campus ?? currentUser?.campus ?? 'Main Campus',
      accountType: payload.accountType || currentUser?.accountType || 'student',
      department: payload.department ?? currentUser?.department,
      preferredContactMethod: payload.preferredContactMethod ?? currentUser?.preferredContactMethod
    }).catch(() => {});
  }

  // Also run legacy seller profile sync helper for WhatsApp/State/City consistency
  await updateUserProfileInFirestore(userId, patch).catch(() => {});

  const session = await getUserSessionFromFirestore(userId);
  if (session) {
    return { user: session.user, sellerProfile: session.sellerProfile };
  }

  const mergedUser: User = {
    ...(currentUser || ({ id: userId, email: '', role: 'buyer', createdAt: now } as User)),
    ...payload
  };
  saveUserSessionCache(mergedUser);
  return { user: mergedUser };
}

export async function changeAccountPassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  if (!newPassword || newPassword.length < 6) {
    throw new Error('New password must be at least 6 characters long.');
  }
  const fbUser = auth.currentUser;
  if (!fbUser || !fbUser.email || fbUser.isAnonymous) {
    throw new Error('Please sign in with an email & password account to change your password.');
  }
  if (!currentPassword) {
    throw new Error('Enter your current password to verify your identity.');
  }

  const credential = EmailAuthProvider.credential(fbUser.email, currentPassword);
  await reauthenticateWithCredential(fbUser, credential);
  await updatePassword(fbUser, newPassword);

  const now = new Date().toISOString();
  await updateDoc(doc(db, 'users', fbUser.uid), {
    lastPasswordChangedAt: now,
    updatedAt: now
  }).catch(() => {});
}

export async function requestEmailVerification(): Promise<void> {
  const fbUser = auth.currentUser;
  if (!fbUser || fbUser.isAnonymous || !fbUser.email) {
    throw new Error('Sign in with Firebase Authentication to send a verification email.');
  }
  await sendEmailVerification(fbUser);
}

export async function requestEmailChange(
  newEmail: string,
  currentPassword?: string
): Promise<{ requiresVerification: boolean; message: string }> {
  const cleanEmail = String(newEmail || '').trim().toLowerCase();
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new Error('Please enter a valid new email address.');
  }

  const fbUser = auth.currentUser;
  if (!fbUser || fbUser.isAnonymous || !fbUser.email) {
    throw new Error('Sign in with your account to change your email address.');
  }

  const hasPasswordProvider = fbUser.providerData.some((p) => p.providerId === 'password');
  if (hasPasswordProvider && currentPassword) {
    const credential = EmailAuthProvider.credential(fbUser.email, currentPassword);
    await reauthenticateWithCredential(fbUser, credential);
  }

  await verifyBeforeUpdateEmail(fbUser, cleanEmail);
  return {
    requiresVerification: true,
    message: `A verification link has been sent to ${cleanEmail}. Confirm it in your inbox to complete the email change.`
  };
}

export async function sendAccountRecoveryReset(email: string): Promise<void> {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail) throw new Error('Please enter your account email address.');
  await sendPasswordResetEmail(auth, cleanEmail);
}

// ============================================================================
// REAL ACTIVE DEVICE SESSIONS & REMOTE SIGN-OUT
// ============================================================================
function parseCurrentDeviceInfo(): {
  deviceLabel: string;
  browserName: string;
  osName: string;
  platformType: DevicePlatformType;
  userAgent: string;
} {
  if (typeof navigator === 'undefined') {
    return {
      deviceLabel: 'Web Browser',
      browserName: 'Browser',
      osName: 'Unknown OS',
      platformType: 'desktop',
      userAgent: ''
    };
  }
  const ua = navigator.userAgent || '';
  let browserName = 'Web Browser';
  if (/Edg\//i.test(ua)) browserName = 'Microsoft Edge';
  else if (/OPR|Opera/i.test(ua)) browserName = 'Opera';
  else if (/Chrome\//i.test(ua)) browserName = 'Google Chrome';
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browserName = 'Safari';
  else if (/Firefox\//i.test(ua)) browserName = 'Firefox';

  let osName = 'Desktop';
  let platformType: DevicePlatformType = 'desktop';
  if (/Android/i.test(ua)) {
    osName = 'Android';
    platformType = 'android';
  } else if (/iPhone/i.test(ua)) {
    osName = 'iPhone (iOS)';
    platformType = 'iphone';
  } else if (/iPad/i.test(ua)) {
    osName = 'iPad (iPadOS)';
    platformType = 'ipad';
  } else if (/Windows/i.test(ua)) {
    osName = 'Windows';
  } else if (/Mac OS X/i.test(ua)) {
    osName = 'macOS';
  } else if (/Linux/i.test(ua)) {
    osName = 'Linux';
  }

  return {
    deviceLabel: `${browserName} on ${osName}`,
    browserName,
    osName,
    platformType,
    userAgent: ua.slice(0, 260)
  };
}

export function getOrCreateDeviceSessionId(): string {
  if (typeof window === 'undefined') return `sess_ssr_${Date.now()}`;
  try {
    let existing = localStorage.getItem(DEVICE_SESSION_KEY);
    if (!existing) {
      existing = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(DEVICE_SESSION_KEY, existing);
    }
    return existing;
  } catch {
    return `sess_${Date.now()}`;
  }
}

export async function registerOrHeartbeatSession(userId: string): Promise<void> {
  if (!userId || !canWriteFirestoreUserOwnedDoc(userId)) return;
  const sessionId = getOrCreateDeviceSessionId();
  const device = parseCurrentDeviceInfo();
  const now = new Date().toISOString();
  const payload: UserSessionRecord = {
    id: sessionId,
    userId,
    deviceLabel: device.deviceLabel,
    browserName: device.browserName,
    osName: device.osName,
    platformType: device.platformType,
    userAgent: device.userAgent,
    revoked: false,
    createdAt: now,
    lastActiveAt: now
  };
  try {
    const existingSnap = await getDoc(doc(db, 'userSessions', sessionId));
    if (existingSnap.exists()) {
      const existingData = existingSnap.data();
      if (existingData?.revoked) return;
      await updateDoc(doc(db, 'userSessions', sessionId), {
        lastActiveAt: now,
        deviceLabel: device.deviceLabel,
        browserName: device.browserName,
        osName: device.osName
      });
    } else {
      await setDoc(doc(db, 'userSessions', sessionId), stripUndefined(payload));
    }
  } catch {
    // Non-blocking session heartbeat
  }
}

export function subscribeToUserSessions(
  userId: string | undefined,
  onUpdate: (sessions: UserSessionRecord[]) => void
): () => void {
  if (!userId || !canWriteFirestoreUserOwnedDoc(userId)) {
    onUpdate([]);
    return () => {};
  }
  try {
    const q = query(collection(db, 'userSessions'), where('userId', '==', userId), limit(25));
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => {
            const raw = d.data() || {};
            return {
              id: String(raw.id || d.id),
              userId: String(raw.userId || userId),
              deviceLabel: String(raw.deviceLabel || 'Web Browser'),
              browserName: String(raw.browserName || 'Browser'),
              osName: String(raw.osName || 'Device'),
              platformType: (raw.platformType || 'desktop') as DevicePlatformType,
              userAgent: String(raw.userAgent || ''),
              revoked: Boolean(raw.revoked),
              ...(raw.revokedAt ? { revokedAt: toIsoString(raw.revokedAt) } : {}),
              createdAt: raw.createdAt ? toIsoString(raw.createdAt) : new Date().toISOString(),
              lastActiveAt: raw.lastActiveAt ? toIsoString(raw.lastActiveAt) : new Date().toISOString()
            } as UserSessionRecord;
          })
          .filter((s) => !s.revoked)
          .sort((a, b) => Date.parse(b.lastActiveAt) - Date.parse(a.lastActiveAt));
        onUpdate(list);
      },
      () => onUpdate([])
    );
  } catch {
    return () => {};
  }
}

export function subscribeToCurrentSessionRevocation(
  userId: string | undefined,
  onRevoked: () => void
): () => void {
  if (!userId || !canWriteFirestoreUserOwnedDoc(userId)) return () => {};
  const sessionId = getOrCreateDeviceSessionId();
  try {
    return onSnapshot(
      doc(db, 'userSessions', sessionId),
      (snap) => {
        if (snap.exists() && snap.data()?.revoked === true) {
          onRevoked();
        }
      },
      () => {}
    );
  } catch {
    return () => {};
  }
}

export async function signOutSessionById(sessionId: string): Promise<void> {
  if (!sessionId) return;
  const now = new Date().toISOString();
  await updateDoc(doc(db, 'userSessions', sessionId), {
    revoked: true,
    revokedAt: now
  });
}

export async function signOutOtherUserSessions(userId: string): Promise<number> {
  if (!userId) return 0;
  const currentId = getOrCreateDeviceSessionId();
  const snap = await getDocs(
    query(collection(db, 'userSessions'), where('userId', '==', userId), limit(30))
  );
  const now = new Date().toISOString();
  const batch = writeBatch(db);
  let count = 0;
  for (const d of snap.docs) {
    if (d.id !== currentId && d.data()?.revoked !== true) {
      batch.update(d.ref, { revoked: true, revokedAt: now });
      count++;
    }
  }
  if (count > 0) {
    await batch.commit();
  }
  return count;
}

// ============================================================================
// ACCOUNT DEACTIVATION, REACTIVATION & PERMANENT DELETION
// ============================================================================
export async function deactivateUserAccount(userId: string, reason?: string): Promise<void> {
  if (!userId) throw new Error('User ID is required.');
  const now = new Date().toISOString();
  await updateDoc(doc(db, 'users', userId), {
    isDeactivated: true,
    deactivatedAt: now,
    ...(reason ? { deactivationReason: reason.trim().slice(0, 240) } : {}),
    isOnline: false,
    updatedAt: now
  });
  await signOutOtherUserSessions(userId).catch(() => {});
  await signOutFromFirebase();
}

export async function reactivateUserAccount(userId: string): Promise<void> {
  if (!userId) return;
  const now = new Date().toISOString();
  await updateDoc(doc(db, 'users', userId), {
    isDeactivated: false,
    isOnline: true,
    lastSeen: Date.now(),
    lastSeenAt: now,
    updatedAt: now
  });
}

export async function deleteUserAccountPermanently(
  userId: string,
  currentPassword?: string
): Promise<void> {
  if (!userId) throw new Error('Please sign in first.');
  const fbUser = auth.currentUser;

  if (fbUser && !fbUser.isAnonymous && fbUser.uid === userId) {
    const hasPasswordProvider = fbUser.providerData.some((p) => p.providerId === 'password');
    if (hasPasswordProvider && currentPassword && fbUser.email) {
      const credential = EmailAuthProvider.credential(fbUser.email, currentPassword);
      await reauthenticateWithCredential(fbUser, credential);
    }
  }

  // Delete personal settings, notification prefs, active sessions, and user record
  await deleteDoc(doc(db, 'userSettings', userId)).catch(() => {});
  await deleteDoc(doc(db, 'notificationPreferences', userId)).catch(() => {});

  const sessionSnap = await getDocs(
    query(collection(db, 'userSessions'), where('userId', '==', userId), limit(30))
  ).catch(() => null);
  if (sessionSnap) {
    const batch = writeBatch(db);
    sessionSnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit().catch(() => {});
  }

  await deleteDoc(doc(db, 'users', userId)).catch(() => {});

  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`${SETTINGS_CACHE_PREFIX}${userId}`);
    }
  } catch {
    // Non-blocking
  }

  if (fbUser && !fbUser.isAnonymous && fbUser.uid === userId) {
    try {
      await deleteUser(fbUser);
    } catch (err: any) {
      const code = String(err?.code || '');
      if (code === 'auth/requires-recent-login') {
        throw new Error('For security, please confirm your current password (or re-sign in) before permanently deleting your account.');
      }
      throw err;
    }
  }

  saveUserSessionCache(null);
}

// ============================================================================
// SUPPORT & PROBLEM / USER REPORTING
// ============================================================================
export async function submitSupportReport(input: {
  kind: SupportReportRecord['kind'];
  reporterId: string;
  reporterName: string;
  reporterEmail: string;
  subject: string;
  category: string;
  description: string;
  targetUserId?: string;
  targetUserName?: string;
  institutionId?: string;
}): Promise<SupportReportRecord> {
  const cleanSubject = input.subject.trim();
  const cleanDesc = input.description.trim();
  if (!cleanSubject || cleanSubject.length < 3) {
    throw new Error('Please enter a short summary subject.');
  }
  if (!cleanDesc || cleanDesc.length < 10) {
    throw new Error('Please describe the issue in at least 10 characters.');
  }

  const fbUid = auth.currentUser?.uid || (await ensureGuestAuth());
  const effectiveReporterId = fbUid || input.reporterId || 'guest';
  const id = `rep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();

  const record: SupportReportRecord = stripUndefined({
    id,
    kind: input.kind,
    reporterId: effectiveReporterId,
    reporterName: input.reporterName.trim().slice(0, 120) || 'Platform Member',
    reporterEmail: input.reporterEmail.trim().slice(0, 160),
    subject: cleanSubject.slice(0, 160),
    category: input.category.trim().slice(0, 80) || 'General',
    ...(input.targetUserId ? { targetUserId: input.targetUserId.trim().slice(0, 128) } : {}),
    ...(input.targetUserName ? { targetUserName: input.targetUserName.trim().slice(0, 120) } : {}),
    description: cleanDesc.slice(0, 2000),
    ...(input.institutionId ? { institutionId: input.institutionId } : {}),
    status: 'open',
    createdAt: now,
    updatedAt: now
  });

  try {
    await setDoc(doc(db, 'supportReports', id), record);
    return record;
  } catch (err: any) {
    if (String(err?.code || '') === 'permission-denied') {
      handleFirestoreError(err, OperationType.CREATE, `supportReports/${id}`);
    }
    throw err;
  }
}

export function subscribeToMySupportReports(
  userId: string | undefined,
  onUpdate: (reports: SupportReportRecord[]) => void
): () => void {
  const effectiveUid = auth.currentUser?.uid || userId;
  if (!effectiveUid) {
    onUpdate([]);
    return () => {};
  }
  try {
    const q = query(
      collection(db, 'supportReports'),
      where('reporterId', '==', effectiveUid),
      limit(20)
    );
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => {
            const raw = d.data() || {};
            return {
              ...raw,
              id: String(raw.id || d.id),
              createdAt: raw.createdAt ? toIsoString(raw.createdAt) : new Date().toISOString(),
              updatedAt: raw.updatedAt ? toIsoString(raw.updatedAt) : new Date().toISOString()
            } as SupportReportRecord;
          })
          .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
        onUpdate(list);
      },
      () => onUpdate([])
    );
  } catch {
    return () => {};
  }
}
