import {
  EmailAuthProvider,
  User as FirebaseUser,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import {
  AdPaymentRecord,
  Advertisement,
  AnnouncementReport,
  AppSettings,
  CampusEvent,
  CeoSecurityLog,
  CeoSecuritySettings,
  CeoSessionState,
  CeoVerificationLog,
  CeoVerificationSettings,
  ConversationReportRecord,
  GeneralAnnouncementPost,
  HouseAgentProfile,
  Institution,
  PaymentTransaction,
  Product,
  PwaEventType,
  PwaInstallMetric,
  RegionalModerator,
  ReportItem,
  SafetyAnnouncement,
  SellerProfile,
  ServiceListing,
  ServiceReport,
  SportUpdatePost,
  SubscriptionPlan,
  User,
  VisitorAnalyticsSummary
} from '../types.js';
import { DEFAULT_INSTITUTION_ID, VERIFIED_NIGERIAN_INSTITUTIONS } from '../constants/institutions.js';
import {
  auth,
  db,
  getAllProductsFromFirestoreForAdmin,
  googleProvider,
  mapAuthErrorToUserMessage,
  saveUserSessionCache,
  stripUndefined,
  toIsoString
} from './firebase.js';
import { getApiBaseUrl } from './api.js';
import { uploadCeoVerificationLogo } from './imageStorage.js';
import { sanitizeAdDoc } from './ads.js';
import { sanitizeServiceDoc } from './servicesMarketplace.js';

export const CEO_EMAIL = 'stephenaleje61@gmail.com';
export const CEO_PHONE = '08167258121';
export const CEO_ROLE_LABEL = 'CEO SUPER ADMINISTRATOR';
export const CEO_VERIFIED_BADGE_TEXT = 'VERIFIED BY NIGERIA CAMPUS MARKET CEO';

const CEO_SESSION_STORAGE_KEY = 'fu_market_ceo_session_v1';
const CEO_LOGO_CACHE_KEY = 'fu_market_ceo_verification_logo_v1';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write'
}

function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email
        })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function buildApiUrl(path: string): string {
  const base = getApiBaseUrl();
  return base ? `${base}${path}` : path;
}

export function normalizeNigerianPhone(raw?: string): string {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('234') && digits.length === 13) {
    return `0${digits.slice(3)}`;
  }
  if (digits.length === 10 && !digits.startsWith('0')) {
    return `0${digits}`;
  }
  return digits;
}

export function isAuthorizedCeoEmail(email?: string | null): boolean {
  return String(email || '').toLowerCase().trim() === CEO_EMAIL;
}

export function getStoredCeoSession(): CeoSessionState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CEO_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CeoSessionState;
    if (
      !parsed?.authorized ||
      !isAuthorizedCeoEmail(parsed.email) ||
      !parsed.ceoSessionToken ||
      !parsed.sessionExpiresAt ||
      parsed.sessionExpiresAt <= Date.now()
    ) {
      localStorage.removeItem(CEO_SESSION_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveCeoSession(session: CeoSessionState | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (session) {
      localStorage.setItem(CEO_SESSION_STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(CEO_SESSION_STORAGE_KEY);
    }
  } catch {
    // Non-blocking storage safeguard
  }
}

async function getCeoAuthHeaders(forceTokenRefresh = false): Promise<Record<string, string>> {
  const fbUser = auth.currentUser;
  if (!fbUser) {
    throw new Error('CEO Firebase authentication is not active. Please sign in again.');
  }
  const idToken = await fbUser.getIdToken(forceTokenRefresh);
  const stored = getStoredCeoSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-firebase-id-token': idToken
  };
  if (stored?.ceoSessionToken) {
    headers['x-ceo-session'] = stored.ceoSessionToken;
  }
  return headers;
}

export async function verifyActiveFirebaseCeoIdentity(
  fbUser: FirebaseUser | null
): Promise<boolean> {
  if (!fbUser) return false;
  if (!isAuthorizedCeoEmail(fbUser.email) || !fbUser.emailVerified) return false;
  try {
    const tokenResult = await fbUser.getIdTokenResult(false);
    if (tokenResult.claims?.ceoAdmin === false) return false;
    return true;
  } catch {
    return true;
  }
}

export async function checkCeoLockoutStatus(email?: string): Promise<{
  locked: boolean;
  remainingSeconds: number;
  attempts: number;
  maxAttempts: number;
}> {
  try {
    const url = buildApiUrl(
      `/api/ceo/session/lockout-status?email=${encodeURIComponent(email || CEO_EMAIL)}`
    );
    const res = await fetch(url);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback unlocked when offline
  }
  return { locked: false, remainingSeconds: 0, attempts: 0, maxAttempts: 5 };
}

async function recordFailedLoginAttempt(email: string, reason: string): Promise<{
  locked: boolean;
  remainingSeconds: number;
}> {
  try {
    const res = await fetch(buildApiUrl('/api/ceo/session/failed-attempt'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, reason })
    });
    const data = await res.json().catch(() => ({}));
    return {
      locked: Boolean(data?.locked || res.status === 429),
      remainingSeconds: Number(data?.remainingSeconds) || 0
    };
  } catch {
    return { locked: false, remainingSeconds: 0 };
  }
}

export async function logUnauthorizedCeoAccess(
  summary: string,
  routePath = '/ceo-admin',
  actorEmail?: string
): Promise<void> {
  try {
    await fetch(buildApiUrl('/api/ceo/security-event'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actorEmail: actorEmail || auth.currentUser?.email || 'anonymous',
        path: routePath,
        summary
      })
    });
  } catch {
    // Non-blocking
  }
}

async function writeFirestoreSecurityLog(entry: Omit<CeoSecurityLog, 'id' | 'createdAt'>): Promise<void> {
  const id = `sec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  try {
    await setDoc(
      doc(db, 'ceo_security_logs', id),
      stripUndefined({
        id,
        ...entry,
        createdAt: new Date().toISOString()
      })
    );
  } catch {
    // Non-blocking if backend already captured it
  }
}

async function exchangeFirebaseUserForCeoSession(
  fbUser: FirebaseUser,
  optionalPhone?: string
): Promise<CeoSessionState> {
  if (!isAuthorizedCeoEmail(fbUser.email) || !fbUser.emailVerified) {
    const emailLabel = fbUser.email || 'unknown';
    await writeFirestoreSecurityLog({
      eventType: 'UNAUTHORIZED_CEO_ACCESS',
      severity: 'critical',
      actorEmail: emailLabel,
      actorUid: fbUser.uid,
      summary: `Blocked unauthorized Firebase account (${emailLabel}) from NIGERIA CAMPUS MARKET CEO login.`
    });
    await recordFailedLoginAttempt(emailLabel, 'Unauthorized email for CEO login');
    await signOut(auth).catch(() => {});
    throw new Error(
      'Access Denied: This Firebase account is not authorized as NIGERIA CAMPUS MARKET CEO SUPER ADMINISTRATOR.'
    );
  }

  const normalizedPhone = normalizeNigerianPhone(optionalPhone);
  if (normalizedPhone && normalizedPhone !== CEO_PHONE) {
    await recordFailedLoginAttempt(fbUser.email || CEO_EMAIL, 'CEO phone check failed');
    throw new Error('Authorized CEO phone verification number did not match.');
  }

  const idToken = await fbUser.getIdToken(true);
  const res = await fetch(buildApiUrl('/api/ceo/session/verify'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-firebase-id-token': idToken
    },
    body: JSON.stringify({
      idToken,
      ...(normalizedPhone ? { phone: normalizedPhone } : {})
    })
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload?.error || 'CEO session verification failed.');
  }

  const session: CeoSessionState = {
    authorized: true,
    role: CEO_ROLE_LABEL,
    email: payload.email || fbUser.email || CEO_EMAIL,
    uid: payload.uid || fbUser.uid,
    phoneVerified: Boolean(payload.phoneVerified),
    ceoSessionToken: payload.ceoSessionToken,
    sessionExpiresAt: Number(payload.sessionExpiresAt) || Date.now() + 60 * 60 * 1000,
    reauthAt: Number(payload.reauthAt) || Date.now(),
    verificationMethod: payload.verificationMethod,
    customClaim: payload.customClaim
  };

  saveCeoSession(session);
  return session;
}

export async function loginCeoWithEmailPassword(params: {
  email: string;
  password: string;
  phone?: string;
}): Promise<{ session: CeoSessionState; firebaseUser: FirebaseUser }> {
  const email = String(params.email || '').trim().toLowerCase();
  const password = String(params.password || '');

  const lockout = await checkCeoLockoutStatus(email);
  if (lockout.locked) {
    throw new Error(
      `Too many failed login attempts. Try again in ${Math.ceil(lockout.remainingSeconds / 60)} minute(s).`
    );
  }

  if (!email || !password) {
    throw new Error('Please enter your authorized CEO email address and password.');
  }

  if (!isAuthorizedCeoEmail(email)) {
    const failRes = await recordFailedLoginAttempt(email, 'Non-CEO email entered on CEO login');
    await writeFirestoreSecurityLog({
      eventType: 'UNAUTHORIZED_CEO_ACCESS',
      severity: 'critical',
      actorEmail: email,
      summary: `Blocked unauthorized email attempt (${email}) on NIGERIA CAMPUS MARKET CEO ADMIN LOGIN.`
    });
    if (failRes.locked) {
      throw new Error(
        `Too many failed login attempts. Locked for ${Math.ceil(failRes.remainingSeconds / 60)} minute(s).`
      );
    }
    throw new Error(
      'Access Denied: Only the authorized NIGERIA CAMPUS MARKET CEO SUPER ADMINISTRATOR account may sign in here.'
    );
  }

  if (params.phone && normalizeNigerianPhone(params.phone) !== CEO_PHONE) {
    await recordFailedLoginAttempt(email, 'Mismatched CEO phone check');
    throw new Error('Authorized CEO phone number verification failed.');
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const session = await exchangeFirebaseUserForCeoSession(cred.user, params.phone);
    return { session, firebaseUser: cred.user };
  } catch (err: any) {
    const code = String(err?.code || '');
    if (code.startsWith('auth/')) {
      const failRes = await recordFailedLoginAttempt(email, code);
      if (failRes.locked) {
        throw new Error(
          `Account temporarily locked due to repeated failed attempts. Try again in ${Math.ceil(
            failRes.remainingSeconds / 60
          )} minute(s).`
        );
      }
      throw new Error(mapAuthErrorToUserMessage(err));
    }
    throw err;
  }
}

export async function loginCeoWithGoogle(
  optionalPhone?: string
): Promise<{ session: CeoSessionState; firebaseUser: FirebaseUser }> {
  const lockout = await checkCeoLockoutStatus(CEO_EMAIL);
  if (lockout.locked) {
    throw new Error(
      `Too many failed login attempts. Try again in ${Math.ceil(lockout.remainingSeconds / 60)} minute(s).`
    );
  }

  googleProvider.setCustomParameters({ prompt: 'select_account' });
  const cred = await signInWithPopup(auth, googleProvider);
  const session = await exchangeFirebaseUserForCeoSession(cred.user, optionalPhone);
  return { session, firebaseUser: cred.user };
}

export async function sendCeoPasswordReset(emailInput?: string): Promise<string> {
  const email = String(emailInput || CEO_EMAIL).trim().toLowerCase();
  if (!isAuthorizedCeoEmail(email)) {
    throw new Error('Password reset here is restricted strictly to the authorized CEO email.');
  }
  await sendPasswordResetEmail(auth, email);
  return `Password reset email sent to ${email}. Check your inbox or spam folder.`;
}

export async function reauthenticateCeoWithPassword(
  password: string,
  phone?: string
): Promise<CeoSessionState> {
  const fbUser = auth.currentUser;
  if (!fbUser || !isAuthorizedCeoEmail(fbUser.email)) {
    throw new Error('CEO authentication session is missing. Please sign in again.');
  }

  const cred = EmailAuthProvider.credential(fbUser.email!, password);
  await reauthenticateWithCredential(fbUser, cred);
  const freshToken = await fbUser.getIdToken(true);

  const res = await fetch(buildApiUrl('/api/ceo/session/reauth'), {
    method: 'POST',
    headers: {
      ...(await getCeoAuthHeaders(false)),
      'x-firebase-id-token': freshToken
    },
    body: JSON.stringify({
      ...(phone ? { phone: normalizeNigerianPhone(phone) } : {})
    })
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload?.error || 'Reauthentication failed.');
  }

  const current = getStoredCeoSession();
  const updated: CeoSessionState = {
    authorized: true,
    role: CEO_ROLE_LABEL,
    email: fbUser.email || CEO_EMAIL,
    uid: fbUser.uid,
    phoneVerified: Boolean(phone || current?.phoneVerified),
    ceoSessionToken: payload.ceoSessionToken,
    sessionExpiresAt: Number(payload.sessionExpiresAt) || Date.now() + 60 * 60 * 1000,
    reauthAt: Number(payload.reauthAt) || Date.now(),
    verificationMethod: current?.verificationMethod,
    customClaim: current?.customClaim
  };
  saveCeoSession(updated);
  return updated;
}

export async function reauthenticateCeoWithGoogle(phone?: string): Promise<CeoSessionState> {
  const fbUser = auth.currentUser;
  if (!fbUser || !isAuthorizedCeoEmail(fbUser.email)) {
    throw new Error('CEO authentication session is missing. Please sign in again.');
  }

  googleProvider.setCustomParameters({ prompt: 'select_account' });
  const result = await reauthenticateWithPopup(fbUser, googleProvider);
  if (!isAuthorizedCeoEmail(result.user.email)) {
    throw new Error('Google reauthentication account does not match the authorized CEO.');
  }
  const freshToken = await result.user.getIdToken(true);

  const res = await fetch(buildApiUrl('/api/ceo/session/reauth'), {
    method: 'POST',
    headers: {
      ...(await getCeoAuthHeaders(false)),
      'x-firebase-id-token': freshToken
    },
    body: JSON.stringify({
      ...(phone ? { phone: normalizeNigerianPhone(phone) } : {})
    })
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload?.error || 'Reauthentication failed.');
  }

  const current = getStoredCeoSession();
  const updated: CeoSessionState = {
    authorized: true,
    role: CEO_ROLE_LABEL,
    email: result.user.email || CEO_EMAIL,
    uid: result.user.uid,
    phoneVerified: Boolean(phone || current?.phoneVerified),
    ceoSessionToken: payload.ceoSessionToken,
    sessionExpiresAt: Number(payload.sessionExpiresAt) || Date.now() + 60 * 60 * 1000,
    reauthAt: Number(payload.reauthAt) || Date.now(),
    verificationMethod: current?.verificationMethod,
    customClaim: current?.customClaim
  };
  saveCeoSession(updated);
  return updated;
}

export async function logoutCeoSession(): Promise<void> {
  try {
    if (auth.currentUser && isAuthorizedCeoEmail(auth.currentUser.email)) {
      const headers = await getCeoAuthHeaders(false);
      await fetch(buildApiUrl('/api/ceo/session/logout'), {
        method: 'POST',
        headers
      }).catch(() => {});
    }
  } catch {
    // Non-blocking
  }
  saveCeoSession(null);
  saveUserSessionCache(null, null);
  await signOut(auth).catch(() => {});
}

// ============================================================================
// PUBLIC VERIFICATION BADGE CONFIG & VERIFIED REGISTRY SUBSCRIPTIONS
// ============================================================================
export function getCachedVerificationConfig(): CeoVerificationSettings {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(CEO_LOGO_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          id: 'ceo_verification',
          logoUrl: String(parsed?.logoUrl || ''),
          badgeText: String(parsed?.badgeText || CEO_VERIFIED_BADGE_TEXT),
          updatedAt: parsed?.updatedAt,
          updatedBy: parsed?.updatedBy
        };
      }
    } catch {
      // Ignore cache failure
    }
  }
  return {
    id: 'ceo_verification',
    logoUrl: '',
    badgeText: CEO_VERIFIED_BADGE_TEXT
  };
}

function saveCachedVerificationConfig(cfg: CeoVerificationSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CEO_LOGO_CACHE_KEY, JSON.stringify(cfg));
  } catch {
    // Ignore
  }
}

export function subscribeToCeoVerificationSettings(
  callback: (cfg: CeoVerificationSettings) => void
): () => void {
  // Immediately emit cached value
  callback(getCachedVerificationConfig());

  // Also fetch backend config in case Firestore hasn't been seeded yet
  fetch(buildApiUrl('/api/ceo/verification-config'))
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      if (data?.config) {
        const cfg: CeoVerificationSettings = {
          id: 'ceo_verification',
          logoUrl: String(data.config.logoUrl || ''),
          badgeText: CEO_VERIFIED_BADGE_TEXT,
          updatedAt: data.config.updatedAt,
          updatedBy: data.config.updatedBy
        };
        saveCachedVerificationConfig(cfg);
        callback(cfg);
      }
    })
    .catch(() => {});

  try {
    const refDoc = doc(db, 'platform_settings', 'ceo_verification');
    return onSnapshot(
      refDoc,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as any;
          const cfg: CeoVerificationSettings = {
            id: snap.id,
            logoUrl: String(data?.logoUrl || '').trim(),
            badgeText: CEO_VERIFIED_BADGE_TEXT,
            updatedAt: data?.updatedAt ? toIsoString(data.updatedAt) : undefined,
            updatedBy: data?.updatedBy ? String(data.updatedBy) : undefined
          };
          saveCachedVerificationConfig(cfg);
          callback(cfg);
        }
      },
      (err) => {
        console.warn('[subscribeToCeoVerificationSettings]:', err.message);
      }
    );
  } catch {
    return () => {};
  }
}

export function subscribeToCeoVerifiedRegistry(
  callback: (verifiedIds: Set<string>) => void
): () => void {
  let verifiedSellers = new Set<string>();
  let verifiedUsers = new Set<string>();

  const emit = () => {
    callback(new Set([...verifiedSellers, ...verifiedUsers]));
  };

  let unsubSellers = () => {};
  let unsubUsers = () => {};

  try {
    unsubSellers = onSnapshot(
      query(collection(db, 'sellerProfiles'), where('isVerified', '==', true), limit(500)),
      (snap) => {
        const next = new Set<string>();
        snap.forEach((d) => {
          const data = d.data() as any;
          if (data?.isVerified || data?.ceoVerified) {
            if (d.id) next.add(d.id);
            if (data.userId) next.add(String(data.userId));
          }
        });
        verifiedSellers = next;
        emit();
      },
      (err) => console.warn('[Verified sellerProfiles sub]:', err.message)
    );
  } catch {
    // Ignore
  }

  try {
    unsubUsers = onSnapshot(
      query(collection(db, 'users'), where('ceoVerified', '==', true), limit(500)),
      (snap) => {
        const next = new Set<string>();
        snap.forEach((d) => {
          const data = d.data() as any;
          if (data?.ceoVerified || data?.isVerified) {
            next.add(d.id);
          }
        });
        verifiedUsers = next;
        emit();
      },
      (err) => console.warn('[Verified users sub]:', err.message)
    );
  } catch {
    // Ignore
  }

  return () => {
    unsubSellers();
    unsubUsers();
  };
}

// ============================================================================
// EXCLUSIVE CEO VERIFICATION & LOGO UPLOAD ACTIONS
// ============================================================================
async function recordVerificationAudit(
  entry: Omit<CeoVerificationLog, 'id' | 'createdAt'>
): Promise<void> {
  const id = `verlog_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const payload: CeoVerificationLog = {
    id,
    ...entry,
    createdAt: new Date().toISOString()
  };
  await setDoc(doc(db, 'ceo_verification_logs', id), stripUndefined(payload));
}

export async function ceoUploadAndSaveVerificationLogo(
  file: File,
  onProgress?: (pct: number) => void
): Promise<CeoVerificationSettings> {
  const fbUser = auth.currentUser;
  if (!fbUser || !isAuthorizedCeoEmail(fbUser.email)) {
    throw new Error('Unauthorized: Only the NIGERIA CAMPUS MARKET CEO can update the official verification logo.');
  }

  const uploadRes = await uploadCeoVerificationLogo(file, fbUser.uid, onProgress);
  const logoUrl = uploadRes.downloadUrl;
  const headers = await getCeoAuthHeaders(false);

  const backendRes = await fetch(buildApiUrl('/api/ceo/verification-logo'), {
    method: 'POST',
    headers,
    body: JSON.stringify({ logoUrl })
  });
  const backendPayload = await backendRes.json().catch(() => ({}));
  if (!backendRes.ok) {
    const err: any = new Error(backendPayload?.error || 'Failed to save verification logo.');
    if (backendPayload?.code) err.code = backendPayload.code;
    throw err;
  }

  const now = new Date().toISOString();
  const cfg: CeoVerificationSettings = {
    id: 'ceo_verification',
    logoUrl,
    badgeText: CEO_VERIFIED_BADGE_TEXT,
    updatedBy: fbUser.email || CEO_EMAIL,
    updatedAt: now
  };

  try {
    await setDoc(doc(db, 'platform_settings', 'ceo_verification'), stripUndefined(cfg));
    await recordVerificationAudit({
      action: 'LOGO_UPDATED',
      targetType: 'verification_logo',
      targetId: 'ceo_verification',
      targetName: 'Official CEO Verification Logo',
      ceoEmail: fbUser.email || CEO_EMAIL
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'platform_settings/ceo_verification');
  }

  saveCachedVerificationConfig(cfg);
  return cfg;
}

export async function ceoRemoveVerificationLogo(): Promise<CeoVerificationSettings> {
  const fbUser = auth.currentUser;
  if (!fbUser || !isAuthorizedCeoEmail(fbUser.email)) {
    throw new Error('Unauthorized: Only the NIGERIA CAMPUS MARKET CEO can remove the official verification logo.');
  }

  const headers = await getCeoAuthHeaders(false);
  const backendRes = await fetch(buildApiUrl('/api/ceo/verification-logo'), {
    method: 'DELETE',
    headers
  });
  const backendPayload = await backendRes.json().catch(() => ({}));
  if (!backendRes.ok) {
    const err: any = new Error(backendPayload?.error || 'Failed to remove verification logo.');
    if (backendPayload?.code) err.code = backendPayload.code;
    throw err;
  }

  const now = new Date().toISOString();
  const cfg: CeoVerificationSettings = {
    id: 'ceo_verification',
    logoUrl: '',
    badgeText: CEO_VERIFIED_BADGE_TEXT,
    updatedBy: fbUser.email || CEO_EMAIL,
    updatedAt: now
  };

  try {
    await setDoc(doc(db, 'platform_settings', 'ceo_verification'), stripUndefined(cfg));
    await recordVerificationAudit({
      action: 'LOGO_REMOVED',
      targetType: 'verification_logo',
      targetId: 'ceo_verification',
      targetName: 'Official CEO Verification Logo',
      ceoEmail: fbUser.email || CEO_EMAIL
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'platform_settings/ceo_verification');
  }

  saveCachedVerificationConfig(cfg);
  return cfg;
}

export async function ceoVerifyOrUnverifyEntity(params: {
  targetType: 'user' | 'seller' | 'advertisement' | 'service' | 'house_agent';
  targetId: string;
  targetName: string;
  verify: boolean;
  linkedUserId?: string;
  notes?: string;
}): Promise<void> {
  const fbUser = auth.currentUser;
  if (!fbUser || !isAuthorizedCeoEmail(fbUser.email)) {
    throw new Error('Unauthorized: Only the NIGERIA CAMPUS MARKET CEO can grant or revoke verification.');
  }

  const headers = await getCeoAuthHeaders(false);
  const backendRes = await fetch(buildApiUrl('/api/ceo/verify-entity'), {
    method: 'POST',
    headers,
    body: JSON.stringify({
      targetType: params.targetType,
      targetId: params.targetId,
      targetName: params.targetName,
      verify: params.verify,
      notes: params.notes
    })
  });
  if (!backendRes.ok) {
    const payload = await backendRes.json().catch(() => ({}));
    throw new Error(payload?.error || 'CEO backend authorization failed.');
  }

  const now = new Date().toISOString();
  const verificationPayload = {
    isVerified: params.verify,
    ceoVerified: params.verify,
    verifiedBadgeText: params.verify ? CEO_VERIFIED_BADGE_TEXT : '',
    verifiedByCeoAt: params.verify ? now : '',
    verifiedByCeoEmail: params.verify ? fbUser.email || CEO_EMAIL : '',
    verificationNotes: params.notes?.trim() || ''
  };

  try {
    if (params.targetType === 'user') {
      await setDoc(doc(db, 'users', params.targetId), stripUndefined(verificationPayload), {
        merge: true
      });
      // Also mirror onto sellerProfile if user owns one
      const sellerSnap = await getDocs(
        query(collection(db, 'sellerProfiles'), where('userId', '==', params.targetId), limit(3))
      );
      for (const sDoc of sellerSnap.docs) {
        await setDoc(doc(db, 'sellerProfiles', sDoc.id), stripUndefined(verificationPayload), {
          merge: true
        });
      }
    } else if (params.targetType === 'seller') {
      await setDoc(doc(db, 'sellerProfiles', params.targetId), stripUndefined(verificationPayload), {
        merge: true
      });
      if (params.linkedUserId) {
        await setDoc(doc(db, 'users', params.linkedUserId), stripUndefined(verificationPayload), {
          merge: true
        });
      }
    } else if (params.targetType === 'advertisement') {
      await updateDoc(doc(db, 'advertisements', params.targetId), {
        ...stripUndefined(verificationPayload),
        updatedAt: now
      });
    } else if (params.targetType === 'service') {
      await updateDoc(doc(db, 'services', params.targetId), {
        ...stripUndefined(verificationPayload),
        updatedAt: now
      });
    } else if (params.targetType === 'house_agent') {
      await updateDoc(doc(db, 'houseAgents', params.targetId), {
        ...stripUndefined(verificationPayload),
        updatedAt: now
      });
      if (params.linkedUserId) {
        await setDoc(doc(db, 'users', params.linkedUserId), stripUndefined(verificationPayload), {
          merge: true
        });
      }
    }

    await recordVerificationAudit({
      action: params.verify ? 'VERIFIED' : 'UNVERIFIED',
      targetType: params.targetType,
      targetId: params.targetId,
      targetName: params.targetName,
      ceoEmail: fbUser.email || CEO_EMAIL,
      notes: params.notes
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${params.targetType}/${params.targetId}`);
  }
}

// ============================================================================
// REAL-DATA LOADERS FOR ALL 14 CEO SUPER ADMIN DASHBOARD SECTIONS
// ============================================================================
export interface PwaAnalyticsSummary {
  totalPromptShown: number;
  totalInstallAccepted: number;
  totalInstallDismissed: number;
  totalApkDownloads: number;
  totalPlayStoreClicks: number;
  byPlatform: Record<string, number>;
  recentEvents: PwaInstallMetric[];
}

export interface CeoDashboardSnapshot {
  users: User[];
  sellers: SellerProfile[];
  products: Product[];
  advertisements: Advertisement[];
  adPayments: AdPaymentRecord[];
  services: ServiceListing[];
  houseAgents: HouseAgentProfile[];
  institutions: Institution[];
  reports: {
    productReports: ReportItem[];
    announcementReports: AnnouncementReport[];
    serviceReports: ServiceReport[];
    huxReports: any[];
    conversationReports: ConversationReportRecord[];
  };
  announcements: {
    sports: SportUpdatePost[];
    general: GeneralAnnouncementPost[];
    safety: SafetyAnnouncement[];
  };
  events: CampusEvent[];
  verificationConfig: CeoVerificationSettings;
  verificationLogs: CeoVerificationLog[];
  securityLogs: CeoSecurityLog[];
  settings: CeoSecuritySettings;
  appSettings: AppSettings;
  pwaAnalytics: PwaAnalyticsSummary;
  moderators: RegionalModerator[];
  subscriptionPlans: SubscriptionPlan[];
  paymentTransactions: PaymentTransaction[];
  visitorAnalytics: VisitorAnalyticsSummary;
  accommodationsCount: number;
  studentPostsCount: number;
  studentRequestsCount: number;
  messagesCount: number;
  activeUsersCount: number;
  communityMembershipsCount: number;
  adminSdkConfigured: boolean;
}

export async function fetchCeoDashboardSnapshot(): Promise<CeoDashboardSnapshot> {
  const fbUser = auth.currentUser;
  if (!fbUser || !isAuthorizedCeoEmail(fbUser.email)) {
    throw new Error('Unauthorized: CEO credentials required.');
  }

  const headers = await getCeoAuthHeaders(false);

  const [
    usersSnap,
    sellersSnap,
    products,
    adsSnap,
    paymentsSnap,
    servicesSnap,
    prodReportsSnap,
    annReportsSnap,
    svcReportsSnap,
    huxReportsSnap,
    convReportsSnap,
    sportSnap,
    genAnnSnap,
    safetySnap,
    eventsSnap,
    verCfgSnap,
    verLogsSnap,
    secLogsSnap,
    houseAgentsSnap,
    institutionsSnap,
    huxSnap,
    accSnap,
    studentPostsSnap,
    studentReqsSnap,
    hubMessagesSnap,
    hubActiveSnap,
    privateChatsSnap,
    membershipsSnap,
    backendSecRes,
    appSettingsRes,
    pwaAnalyticsRes,
    visitorAnalyticsRes,
    moderatorsRes,
    plansRes,
    txRes
  ] = await Promise.all([
    getDocs(query(collection(db, 'users'), limit(1000))),
    getDocs(query(collection(db, 'sellerProfiles'), limit(1000))),
    getAllProductsFromFirestoreForAdmin(),
    getDocs(query(collection(db, 'advertisements'), limit(300))),
    getDocs(query(collection(db, 'adPayments'), limit(300))).catch(() => null),
    getDocs(query(collection(db, 'services'), limit(300))),
    getDocs(query(collection(db, 'reports'), limit(300))).catch(() => null),
    getDocs(query(collection(db, 'announcement_reports'), limit(300))).catch(() => null),
    getDocs(query(collection(db, 'serviceReports'), limit(300))).catch(() => null),
    getDocs(query(collection(db, 'huxReports'), limit(300))).catch(() => null),
    getDocs(query(collection(db, 'conversationReports'), limit(300))).catch(() => null),
    getDocs(query(collection(db, 'sport_updates'), limit(150))).catch(() => null),
    getDocs(query(collection(db, 'general_announcements'), limit(150))).catch(() => null),
    getDocs(query(collection(db, 'safety_announcements'), limit(100))).catch(() => null),
    getDocs(query(collection(db, 'events'), limit(150))).catch(() => null),
    getDoc(doc(db, 'platform_settings', 'ceo_verification')).catch(() => null),
    getDocs(query(collection(db, 'ceo_verification_logs'), orderBy('createdAt', 'desc'), limit(200))).catch(() => null),
    getDocs(query(collection(db, 'ceo_security_logs'), orderBy('createdAt', 'desc'), limit(200))).catch(() => null),
    getDocs(query(collection(db, 'houseAgents'), limit(300))).catch(() => null),
    getDocs(query(collection(db, 'institutions'), limit(300))).catch(() => null),
    getDocs(query(collection(db, 'hux'), limit(500))).catch(() => null),
    getDocs(query(collection(db, 'accommodation'), limit(500))).catch(() => null),
    getDocs(query(collection(db, 'studentPosts'), limit(500))).catch(() => null),
    getDocs(query(collection(db, 'studentRequests'), limit(500))).catch(() => null),
    getDocs(query(collection(db, 'hubMessages'), limit(500))).catch(() => null),
    getDocs(query(collection(db, 'hubActiveUsers'), limit(500))).catch(() => null),
    getDocs(query(collection(db, 'privateChats'), limit(300))).catch(() => null),
    getDocs(query(collection(db, 'communityMemberships'), limit(500))).catch(() => null),
    fetch(buildApiUrl('/api/ceo/security-logs'), { headers }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    fetch(buildApiUrl('/api/ceo/app-settings')).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    fetch(buildApiUrl('/api/ceo/analytics/installs'), { headers }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    fetch(buildApiUrl('/api/ceo/analytics/visitors?days=30'), { headers }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    fetch(buildApiUrl('/api/ceo/moderators'), { headers }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    fetch(buildApiUrl('/api/payments/plans')).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    fetch(buildApiUrl('/api/payments/ceo/transactions'), { headers }).then((r) => (r.ok ? r.json() : null)).catch(() => null)
  ]);

  const users: User[] = usersSnap.docs.map((d) => {
    const data = d.data() as any;
    const email = String(data?.email || '').toLowerCase().trim();
    return {
      id: d.id,
      name: String(data?.name || data?.displayName || 'Campus User'),
      email,
      role: data?.role === 'admin' && email === CEO_EMAIL ? 'admin' : data?.role === 'seller' ? 'seller' : 'buyer',
      accountType: data?.accountType || undefined,
      department: data?.department ? String(data.department) : undefined,
      levelOfStudy: data?.levelOfStudy ? String(data.levelOfStudy) : undefined,
      bio: data?.bio ? String(data.bio) : undefined,
      institutionId: data?.institutionId ? String(data.institutionId) : DEFAULT_INSTITUTION_ID,
      campus: data?.campus ? String(data.campus) : undefined,
      phone: data?.phone ? String(data.phone) : '',
      whatsappNumber: data?.whatsappNumber ? String(data.whatsappNumber) : '',
      state: data?.state ? String(data.state) : 'Taraba',
      city: data?.city ? String(data.city) : 'Wukari',
      avatarUrl: data?.avatarUrl ? String(data.avatarUrl) : undefined,
      isSuspended: Boolean(data?.isSuspended),
      suspensionReason: data?.suspensionReason ? String(data.suspensionReason) : undefined,
      isVerified: Boolean(data?.isVerified || data?.ceoVerified),
      ceoVerified: Boolean(data?.ceoVerified || data?.isVerified),
      verifiedBadgeText: data?.verifiedBadgeText ? String(data.verifiedBadgeText) : undefined,
      verifiedByCeoAt: data?.verifiedByCeoAt ? toIsoString(data.verifiedByCeoAt) : undefined,
      verifiedByCeoEmail: data?.verifiedByCeoEmail ? String(data.verifiedByCeoEmail) : undefined,
      lastSeen: data?.lastSeen,
      lastSeenAt: data?.lastSeenAt ? toIsoString(data.lastSeenAt) : undefined,
      createdAt: data?.createdAt ? toIsoString(data.createdAt) : new Date().toISOString()
    };
  });

  const sellers: SellerProfile[] = sellersSnap.docs.map((d) => {
    const data = d.data() as any;
    return {
      id: d.id,
      userId: String(data?.userId || d.id),
      shopName: String(data?.shopName || 'Student Shop'),
      shopSlug: String(data?.shopSlug || d.id),
      shopLogo: data?.shopLogo ? String(data.shopLogo) : undefined,
      coverImage: data?.coverImage ? String(data.coverImage) : undefined,
      description: String(data?.description || ''),
      whatsappNumber: String(data?.whatsappNumber || ''),
      state: String(data?.state || 'Taraba'),
      city: String(data?.city || 'Wukari'),
      address: data?.address ? String(data.address) : undefined,
      isVerified: Boolean(data?.isVerified || data?.ceoVerified),
      ceoVerified: Boolean(data?.ceoVerified || data?.isVerified),
      verifiedBadgeText: data?.verifiedBadgeText ? String(data.verifiedBadgeText) : undefined,
      verifiedByCeoAt: data?.verifiedByCeoAt ? toIsoString(data.verifiedByCeoAt) : undefined,
      verifiedByCeoEmail: data?.verifiedByCeoEmail ? String(data.verifiedByCeoEmail) : undefined,
      isSuspended: Boolean(data?.isSuspended),
      createdAt: data?.createdAt ? toIsoString(data.createdAt) : new Date().toISOString()
    };
  });

  const advertisements = adsSnap.docs.map((d) => sanitizeAdDoc(d.id, d.data()));
  const adPayments: AdPaymentRecord[] = (paymentsSnap?.docs || []).map((d) => {
    const data = d.data() as any;
    return {
      id: d.id,
      reference: String(data?.reference || d.id),
      adId: String(data?.adId || ''),
      businessName: String(data?.businessName || 'Advertiser'),
      payerEmail: data?.payerEmail,
      payerPhone: data?.payerPhone,
      packageId: data?.packageId || 'basic',
      amountNaira: Number(data?.amountNaira) || 0,
      currency: 'NGN',
      provider: data?.provider || 'paystack',
      status: data?.status || 'verified',
      gatewayResponse: data?.gatewayResponse,
      verifiedAt: data?.verifiedAt ? toIsoString(data.verifiedAt) : undefined,
      createdAt: data?.createdAt ? toIsoString(data.createdAt) : new Date().toISOString()
    };
  });

  const services = servicesSnap.docs.map((d) => sanitizeServiceDoc(d.id, d.data()));
  const houseAgents: HouseAgentProfile[] = (houseAgentsSnap?.docs || []).map((d) => {
    const data = d.data() as any;
    return {
      id: d.id,
      userId: String(data?.userId || d.id),
      agentName: String(data?.agentName || 'House Agent'),
      agencyName: data?.agencyName ? String(data.agencyName) : undefined,
      institutionId: String(data?.institutionId || DEFAULT_INSTITUTION_ID),
      campus: String(data?.campus || 'Main Campus (Wukari)'),
      areaCovered: String(data?.areaCovered || 'Wukari'),
      phone: String(data?.phone || ''),
      whatsapp: String(data?.whatsapp || ''),
      bio: String(data?.bio || ''),
      photoUrl: data?.photoUrl ? String(data.photoUrl) : undefined,
      roleType: data?.roleType === 'landlord' ? 'landlord' : 'house_agent',
      isVerified: Boolean(data?.isVerified || data?.ceoVerified),
      ceoVerified: Boolean(data?.ceoVerified || data?.isVerified),
      verifiedBadgeText: data?.verifiedBadgeText ? String(data.verifiedBadgeText) : undefined,
      verifiedByCeoAt: data?.verifiedByCeoAt ? toIsoString(data.verifiedByCeoAt) : undefined,
      verifiedByCeoEmail: data?.verifiedByCeoEmail ? String(data.verifiedByCeoEmail) : undefined,
      verificationNotes: data?.verificationNotes ? String(data.verificationNotes) : undefined,
      status: data?.status === 'suspended' ? 'suspended' : 'active',
      createdAt: data?.createdAt ? toIsoString(data.createdAt) : new Date().toISOString(),
      updatedAt: data?.updatedAt ? toIsoString(data.updatedAt) : new Date().toISOString()
    };
  });

  const productReports: ReportItem[] = (prodReportsSnap?.docs || []).map((d) => {
    const data = d.data() as any;
    return {
      id: d.id,
      reporterEmail: String(data?.reporterEmail || ''),
      reporterName: data?.reporterName,
      productId: data?.productId,
      productTitle: data?.productTitle,
      sellerId: data?.sellerId,
      reason: String(data?.reason || ''),
      details: String(data?.details || ''),
      status: data?.status || 'pending',
      adminNotes: data?.adminNotes,
      createdAt: data?.createdAt ? toIsoString(data.createdAt) : new Date().toISOString()
    };
  });

  const announcementReports: AnnouncementReport[] = (annReportsSnap?.docs || []).map((d) => ({
    id: d.id,
    ...(d.data() as any),
    createdAt: d.data()?.createdAt ? toIsoString(d.data().createdAt) : new Date().toISOString()
  }));

  const serviceReports: ServiceReport[] = (svcReportsSnap?.docs || []).map((d) => ({
    id: d.id,
    ...(d.data() as any),
    createdAt: d.data()?.createdAt ? toIsoString(d.data().createdAt) : new Date().toISOString()
  }));

  const huxReports = (huxReportsSnap?.docs || []).map((d) => ({
    id: d.id,
    ...(d.data() as any),
    createdAt: d.data()?.createdAt ? toIsoString(d.data().createdAt) : new Date().toISOString()
  }));

  const sports: SportUpdatePost[] = (sportSnap?.docs || []).map((d) => ({
    id: d.id,
    ...(d.data() as any),
    createdAt: d.data()?.createdAt ? toIsoString(d.data().createdAt) : new Date().toISOString(),
    updatedAt: d.data()?.updatedAt ? toIsoString(d.data().updatedAt) : new Date().toISOString()
  }));

  const general: GeneralAnnouncementPost[] = (genAnnSnap?.docs || []).map((d) => ({
    id: d.id,
    ...(d.data() as any),
    createdAt: d.data()?.createdAt ? toIsoString(d.data().createdAt) : new Date().toISOString(),
    updatedAt: d.data()?.updatedAt ? toIsoString(d.data().updatedAt) : new Date().toISOString()
  }));

  const safety: SafetyAnnouncement[] = (safetySnap?.docs || []).map((d) => ({
    id: d.id,
    ...(d.data() as any),
    publishedAt: d.data()?.publishedAt ? toIsoString(d.data().publishedAt) : new Date().toISOString()
  }));

  const events: CampusEvent[] = (eventsSnap?.docs || []).map((d) => ({
    id: d.id,
    ...(d.data() as any),
    createdAt: d.data()?.createdAt ? toIsoString(d.data().createdAt) : new Date().toISOString(),
    updatedAt: d.data()?.updatedAt ? toIsoString(d.data().updatedAt) : new Date().toISOString()
  }));

  const verificationConfig: CeoVerificationSettings = verCfgSnap?.exists()
    ? {
        id: verCfgSnap.id,
        logoUrl: String((verCfgSnap.data() as any)?.logoUrl || ''),
        badgeText: CEO_VERIFIED_BADGE_TEXT,
        updatedBy: (verCfgSnap.data() as any)?.updatedBy,
        updatedAt: (verCfgSnap.data() as any)?.updatedAt
          ? toIsoString((verCfgSnap.data() as any).updatedAt)
          : undefined
      }
    : getCachedVerificationConfig();

  const mergedVerLogsMap = new Map<string, CeoVerificationLog>();
  for (const l of backendSecRes?.verificationLogs || []) {
    mergedVerLogsMap.set(l.id, l);
  }
  for (const d of verLogsSnap?.docs || []) {
    const data = d.data() as any;
    mergedVerLogsMap.set(d.id, {
      id: d.id,
      action: data.action,
      targetType: data.targetType,
      targetId: data.targetId,
      targetName: data.targetName || data.targetId,
      ceoEmail: data.ceoEmail || CEO_EMAIL,
      notes: data.notes,
      createdAt: toIsoString(data.createdAt)
    });
  }
  const verificationLogs = Array.from(mergedVerLogsMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const mergedSecLogsMap = new Map<string, CeoSecurityLog>();
  for (const l of backendSecRes?.securityLogs || []) {
    mergedSecLogsMap.set(l.id, l);
  }
  for (const d of secLogsSnap?.docs || []) {
    const data = d.data() as any;
    mergedSecLogsMap.set(d.id, {
      id: d.id,
      eventType: data.eventType,
      severity: data.severity || 'info',
      actorEmail: data.actorEmail,
      actorUid: data.actorUid,
      targetType: data.targetType,
      targetId: data.targetId,
      summary: data.summary || '',
      createdAt: toIsoString(data.createdAt)
    });
  }
  const securityLogs = Array.from(mergedSecLogsMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const conversationReports: ConversationReportRecord[] = (convReportsSnap?.docs || []).map((d) => ({
    id: d.id,
    ...(d.data() as any),
    createdAt: d.data()?.createdAt ? toIsoString(d.data().createdAt) : new Date().toISOString()
  }));

  const instMap = new Map<string, Institution>();
  for (const inst of VERIFIED_NIGERIAN_INSTITUTIONS) {
    instMap.set(inst.id, inst);
  }
  for (const d of institutionsSnap?.docs || []) {
    const data = d.data() || {};
    const campuses =
      Array.isArray(data.campuses) && data.campuses.length > 0
        ? data.campuses.map(String)
        : [String(data.campus || `${String(data.location || 'Main')} Campus`)];
    instMap.set(d.id, {
      id: String(data.id || d.id),
      name: String(data.name || d.id),
      shortName: String(data.shortName || data.name || d.id),
      type: data.type || 'Federal University',
      state: String(data.state || 'Taraba'),
      location: String(data.location || ''),
      campuses,
      campus: String(data.campus || campuses[0] || 'Main Campus'),
      status: data.status === 'inactive' ? 'inactive' : 'active',
      isDefault: Boolean(data.isDefault || d.id === DEFAULT_INSTITUTION_ID),
      logoUrl: data.logoUrl ? String(data.logoUrl) : undefined,
      bannerUrl: data.bannerUrl ? String(data.bannerUrl) : undefined,
      description: data.description ? String(data.description) : undefined,
      primaryColor: data.primaryColor ? String(data.primaryColor) : undefined,
      secondaryColor: data.secondaryColor ? String(data.secondaryColor) : undefined
    });
  }
  const institutions = Array.from(instMap.values()).sort((a, b) =>
    a.id === DEFAULT_INSTITUTION_ID ? -1 : b.id === DEFAULT_INSTITUTION_ID ? 1 : a.name.localeCompare(b.name)
  );

  const settings: CeoSecuritySettings = backendSecRes?.settings || {
    sessionTimeoutMinutes: 60,
    requirePhoneCheckOnLogin: false,
    reauthWindowMinutes: 10,
    maxFailedLoginAttempts: 5,
    lockoutDurationMinutes: 15
  };

  const resolvedAppSettings = appSettingsRes?.settings || appSettingsRes?.appSettings;
  const appSettings: AppSettings = resolvedAppSettings || {
    id: 'app_distribution',
    apkUrl: '',
    playStoreUrl: '',
    apkEnabled: false,
    appVersion: '2.0.0',
    releaseNotes: 'NIGERIA CAMPUS MARKET PWA with nationwide campus search, notifications, and NGN subscriptions.',
    installAnnouncement: 'Install NIGERIA CAMPUS MARKET on your Android, iPhone, iPad, or desktop for instant campus access.',
    installInstructions: 'Tap "Install Web App" on Chrome/Android or use Share -> "Add to Home Screen" on Safari iOS.'
  };

  const pwaAnalytics: PwaAnalyticsSummary = pwaAnalyticsRes?.summary || {
    totalPromptShown: 0,
    totalInstallAccepted: 0,
    totalInstallDismissed: 0,
    totalApkDownloads: 0,
    totalPlayStoreClicks: 0,
    byPlatform: {},
    recentEvents: []
  };

  const emptyVisitors: VisitorAnalyticsSummary = {
    totalVisits: 0,
    totalUniqueVisitors: 0,
    todayVisits: 0,
    todayUniqueVisitors: 0,
    byDevice: { android: 0, iphone: 0, ipad: 0, desktop: 0, unknown: 0 },
    daily: []
  };
  const visitorAnalytics: VisitorAnalyticsSummary = visitorAnalyticsRes?.summary || emptyVisitors;

  const accIds = new Set<string>();
  for (const d of huxSnap?.docs || []) accIds.add(d.id);
  for (const d of accSnap?.docs || []) accIds.add(d.id);

  const privateMsgsCount = (privateChatsSnap?.docs || []).reduce((acc, d) => {
    const data = d.data() as any;
    const count = Number(data?.messagesCount || 0);
    return acc + (count > 0 ? count : data?.lastMessageText || data?.lastMessageTime ? 1 : 0);
  }, 0);

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const activeUserIds = new Set<string>();
  for (const d of hubActiveSnap?.docs || []) {
    const data = d.data() as any;
    const lastActive = Number(data?.lastActiveAt || 0);
    if (!lastActive || lastActive >= sevenDaysAgo) activeUserIds.add(String(data?.userId || d.id));
  }
  for (const u of users) {
    if (u.isSuspended) continue;
    const seenMs = u.lastSeenAt
      ? new Date(u.lastSeenAt).getTime()
      : typeof u.lastSeen === 'number'
      ? u.lastSeen
      : u.lastSeen
      ? new Date(u.lastSeen).getTime()
      : new Date(u.createdAt).getTime();
    if (!Number.isNaN(seenMs) && seenMs >= sevenDaysAgo) {
      activeUserIds.add(u.id);
    }
  }

  return {
    users,
    sellers,
    products,
    advertisements,
    adPayments,
    services,
    houseAgents,
    institutions,
    reports: {
      productReports,
      announcementReports,
      serviceReports,
      huxReports,
      conversationReports
    },
    announcements: {
      sports,
      general,
      safety
    },
    events,
    verificationConfig,
    verificationLogs,
    securityLogs,
    settings,
    appSettings,
    pwaAnalytics,
    moderators: Array.isArray(moderatorsRes?.moderators) ? moderatorsRes.moderators : [],
    subscriptionPlans: Array.isArray(plansRes?.plans) ? plansRes.plans : [],
    paymentTransactions: Array.isArray(txRes?.transactions) ? txRes.transactions : [],
    visitorAnalytics,
    accommodationsCount: accIds.size,
    studentPostsCount: studentPostsSnap?.size || 0,
    studentRequestsCount: studentReqsSnap?.size || 0,
    messagesCount: (hubMessagesSnap?.size || 0) + privateMsgsCount,
    activeUsersCount: activeUserIds.size,
    communityMembershipsCount: membershipsSnap?.size || 0,
    adminSdkConfigured: Boolean(backendSecRes?.adminSdkConfigured)
  };
}

export async function ceoUpdateUserSuspension(params: {
  userId: string;
  suspend: boolean;
  reason?: string;
}): Promise<void> {
  const headers = await getCeoAuthHeaders(false);
  const res = await fetch(buildApiUrl(`/api/ceo/users/${encodeURIComponent(params.userId)}/moderate`), {
    method: 'POST',
    headers,
    body: JSON.stringify({
      action: params.suspend ? 'suspend' : 'activate',
      reason: params.reason
    })
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error(payload?.error || 'Failed to update user status.');
    if (payload?.code) err.code = payload.code;
    throw err;
  }

  await updateDoc(doc(db, 'users', params.userId), {
    isSuspended: params.suspend,
    suspensionReason: params.suspend ? params.reason || 'Suspended by NIGERIA CAMPUS MARKET CEO.' : '',
    updatedAt: new Date().toISOString()
  });

  const sellerSnap = await getDocs(
    query(collection(db, 'sellerProfiles'), where('userId', '==', params.userId), limit(3))
  );
  for (const s of sellerSnap.docs) {
    await updateDoc(doc(db, 'sellerProfiles', s.id), {
      isSuspended: params.suspend
    });
  }
}

export async function ceoDeleteUserAccount(userId: string): Promise<void> {
  const headers = await getCeoAuthHeaders(false);
  const res = await fetch(buildApiUrl(`/api/ceo/users/${encodeURIComponent(userId)}`), {
    method: 'DELETE',
    headers
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error(payload?.error || 'Failed to delete user account.');
    if (payload?.code) err.code = payload.code;
    throw err;
  }

  await deleteDoc(doc(db, 'users', userId)).catch(() => {});
  const sellerSnap = await getDocs(
    query(collection(db, 'sellerProfiles'), where('userId', '==', userId), limit(5))
  ).catch(() => null);
  for (const s of sellerSnap?.docs || []) {
    await deleteDoc(doc(db, 'sellerProfiles', s.id)).catch(() => {});
  }
}

export async function ceoUpdateSecuritySettings(
  updates: Partial<CeoSecuritySettings>
): Promise<CeoSecuritySettings> {
  const headers = await getCeoAuthHeaders(false);
  const res = await fetch(buildApiUrl('/api/ceo/settings'), {
    method: 'PUT',
    headers,
    body: JSON.stringify(updates)
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error(payload?.error || 'Failed to update CEO security settings.');
    if (payload?.code) err.code = payload.code;
    throw err;
  }
  await setDoc(
    doc(db, 'ceo_settings', 'security'),
    stripUndefined({
      id: 'security',
      ...payload.settings,
      updatedBy: auth.currentUser?.email || CEO_EMAIL
    })
  ).catch(() => {});
  return payload.settings;
}

export async function ceoResolveReport(
  collectionName: 'reports' | 'announcement_reports' | 'serviceReports' | 'huxReports' | 'conversationReports',
  reportId: string,
  status: 'resolved' | 'dismissed',
  adminNotes?: string
): Promise<void> {
  await updateDoc(
    doc(db, collectionName, reportId),
    stripUndefined({
      status,
      ...(adminNotes ? { adminNotes } : {}),
      updatedAt: new Date().toISOString()
    })
  );
}

export async function ceoDeleteReport(
  collectionName: 'reports' | 'announcement_reports' | 'serviceReports' | 'huxReports' | 'conversationReports',
  reportId: string
): Promise<void> {
  await deleteDoc(doc(db, collectionName, reportId));
}

export async function ceoDeleteCampusEvent(eventId: string): Promise<void> {
  await deleteDoc(doc(db, 'events', eventId));
}

export async function ceoPublishSafetyAnnouncement(params: {
  title: string;
  description: string;
  category: SafetyAnnouncement['category'];
  severity: SafetyAnnouncement['severity'];
  isPinned?: boolean;
}): Promise<void> {
  const id = `safe_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  await setDoc(doc(db, 'safety_announcements', id), {
    id,
    title: params.title.trim(),
    description: params.description.trim(),
    category: params.category,
    severity: params.severity,
    publishedAt: now,
    createdBy: auth.currentUser?.email || CEO_EMAIL,
    isActive: true,
    isPinned: Boolean(params.isPinned),
    updatedAt: now
  });
}

export async function ceoDeleteAnnouncement(
  collectionName: 'sport_updates' | 'general_announcements' | 'safety_announcements',
  id: string
): Promise<void> {
  await deleteDoc(doc(db, collectionName, id));
}

// ============================================================================
// APP DISTRIBUTION SETTINGS & PWA TELEMETRY (PUBLIC READ / CEO WRITE)
// ============================================================================
export async function fetchPublicAppSettings(): Promise<AppSettings> {
  const fallback: AppSettings = {
    id: 'app_distribution',
    apkUrl: '',
    playStoreUrl: '',
    apkEnabled: false,
    appVersion: '2.0.0',
    releaseNotes: 'NIGERIA CAMPUS MARKET PWA with nationwide campus search, real-time notifications, and NGN subscriptions.',
    installAnnouncement: 'Install NIGERIA CAMPUS MARKET for faster access across Nigerian universities and polytechnics.',
    installInstructions: 'Android/Chrome: Tap Install Web App. iOS Safari: Tap Share -> Add to Home Screen.'
  };
  try {
    const res = await fetch(buildApiUrl('/api/ceo/app-settings'));
    if (res.ok) {
      const payload = await res.json();
      const parsedSettings = payload?.settings || payload?.appSettings;
      if (parsedSettings) return parsedSettings as AppSettings;
    }
  } catch {
    // Fallback to Firestore
  }
  try {
    const snap = await getDoc(doc(db, 'platform_settings', 'app_distribution'));
    if (snap.exists()) {
      const d = snap.data() as any;
      return { ...fallback, ...d, id: snap.id };
    }
  } catch {
    // Ignore
  }
  return fallback;
}

export async function ceoUpdateAppSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
  const headers = await getCeoAuthHeaders(false);
  const res = await fetch(buildApiUrl('/api/ceo/app-settings'), {
    method: 'PUT',
    headers,
    body: JSON.stringify(updates)
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error(payload?.error || 'Failed to update App Settings.');
    if (payload?.code) err.code = payload.code;
    throw err;
  }
  await setDoc(
    doc(db, 'platform_settings', 'app_distribution'),
    stripUndefined({
      ...payload.settings,
      updatedBy: auth.currentUser?.email || CEO_EMAIL,
      updatedAt: new Date().toISOString()
    }),
    { merge: true }
  ).catch(() => {});
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nuh:app-settings-updated', { detail: payload.settings }));
  }
  return payload.settings as AppSettings;
}

export async function trackPwaInstallEvent(
  eventType: PwaEventType,
  platform: PwaInstallMetric['platform'],
  institutionId?: string
): Promise<void> {
  try {
    await fetch(buildApiUrl('/api/ceo/pwa-track'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType, platform, institutionId })
    });
  } catch {
    // Telemetry must never interrupt user flow
  }
}

export async function ceoFetchInstallAnalytics(): Promise<PwaAnalyticsSummary> {
  const headers = await getCeoAuthHeaders(false);
  const res = await fetch(buildApiUrl('/api/ceo/analytics/installs'), { headers });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload?.error || 'Failed to load PWA install analytics.');
  }
  return payload.summary as PwaAnalyticsSummary;
}

// ============================================================================
// REGIONAL MODERATOR MANAGEMENT (CEO-ONLY, NON-CEO PERMISSIONS)
// ============================================================================
export async function ceoFetchModerators(): Promise<RegionalModerator[]> {
  const headers = await getCeoAuthHeaders(false);
  const res = await fetch(buildApiUrl('/api/ceo/moderators'), { headers });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload?.error || 'Failed to load moderators.');
  return Array.isArray(payload.moderators) ? payload.moderators : [];
}

export async function ceoSaveModerator(input: {
  email: string;
  name: string;
  assignedInstitutionId?: string;
  assignedState?: string;
  permissions: RegionalModerator['permissions'];
}): Promise<RegionalModerator> {
  const headers = await getCeoAuthHeaders(false);
  const res = await fetch(buildApiUrl('/api/ceo/moderators'), {
    method: 'POST',
    headers,
    body: JSON.stringify(input)
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error(payload?.error || 'Failed to save moderator.');
    if (payload?.code) err.code = payload.code;
    throw err;
  }
  return payload.moderator as RegionalModerator;
}

export async function ceoUpdateModeratorStatus(
  id: string,
  updates: Partial<Pick<RegionalModerator, 'status' | 'assignedInstitutionId' | 'assignedState' | 'permissions'>>
): Promise<RegionalModerator> {
  const headers = await getCeoAuthHeaders(false);
  const res = await fetch(buildApiUrl(`/api/ceo/moderators/${encodeURIComponent(id)}`), {
    method: 'PATCH',
    headers,
    body: JSON.stringify(updates)
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload?.error || 'Failed to update moderator.');
  return payload.moderator as RegionalModerator;
}

export async function ceoDeleteModerator(id: string): Promise<void> {
  const headers = await getCeoAuthHeaders(false);
  const res = await fetch(buildApiUrl(`/api/ceo/moderators/${encodeURIComponent(id)}`), {
    method: 'DELETE',
    headers
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload?.error || 'Failed to delete moderator.');
}

