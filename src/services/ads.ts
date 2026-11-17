import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import { auth, db, stripUndefined, toIsoString } from './firebase.js';
import { getAdminHeaders, safeFetchJson } from './api.js';
import { CEO_EMAIL, isFirebaseCeoVerified } from './events.js';
import { DEFAULT_INSTITUTION_ID, belongsToInstitution } from '../constants/institutions.js';
import {
  AdAnalyticsEvent,
  AdPackageId,
  AdPaymentRecord,
  AdPlacement,
  AdStatus,
  AdVisibilityScope,
  Advertisement,
  AdvertisingPackage
} from '../types.js';

export const CEO_ADS_PHONE = '08167258121';
export const CEO_ADS_WHATSAPP_INTL = '2348167258121';
export const CEO_ADS_WHATSAPP_MESSAGE =
  'Hello NIGERIA CAMPUS MARKET CEO, I want to advertise my business across campuses. Please provide the available advertising packages, prices and payment instructions.';

export function getCeoAdsWhatsAppUrl(businessName?: string): string {
  const text = businessName
    ? `${CEO_ADS_WHATSAPP_MESSAGE} (Business: ${businessName})`
    : CEO_ADS_WHATSAPP_MESSAGE;
  return `https://wa.me/${CEO_ADS_WHATSAPP_INTL}?text=${encodeURIComponent(text)}`;
}

export const AD_SUBMISSION_SUCCESS_MESSAGE =
  'YOUR ADVERTISEMENT HAS BEEN SUBMITTED SUCCESSFULLY. PLEASE CONTACT NIGERIA CAMPUS MARKET CEO FOR ADVERTISING APPROVAL AND PAYMENT INFORMATION.';

export const ADVERTISING_PACKAGES: AdvertisingPackage[] = [
  {
    id: 'basic',
    name: 'BASIC PACKAGE',
    priceNaira: 2000,
    durationDays: 7,
    placementLabel: 'Standard advertisement placement',
    benefits: [
      '₦2,000',
      '7 days',
      'Standard advertisement placement'
    ]
  },
  {
    id: 'premium',
    name: 'PREMIUM PACKAGE',
    priceNaira: 5000,
    durationDays: 14,
    placementLabel: 'Premium placement',
    benefits: [
      '₦5,000',
      '14 days',
      'Better advertisement visibility',
      'Premium placement'
    ]
  },
  {
    id: 'featured',
    name: 'FEATURED PACKAGE',
    priceNaira: 10000,
    durationDays: 30,
    placementLabel: 'Priority advertisement placement',
    featuredPosition: true,
    benefits: [
      '₦10,000',
      '30 days',
      'Priority advertisement placement',
      'Featured homepage position, subject to availability'
    ]
  }
];

export const BUSINESS_CATEGORIES = [
  'Food & Catering',
  'Hostel & Accommodation',
  'Electronics & Gadgets',
  'Fashion & Beauty',
  'Books, Printing & Academics',
  'Campus Events & Entertainment',
  'Jobs & Internships',
  'Transport & Logistics',
  'Services & Repairs',
  'Health & Fitness',
  'Other Business'
] as const;

export function getPackageById(packageId: string): AdvertisingPackage {
  return (
    ADVERTISING_PACKAGES.find((p) => p.id === packageId) ||
    ADVERTISING_PACKAGES[0]
  );
}

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

function makeDocId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 128);
}

export function sanitizeAdDoc(id: string, data: any): Advertisement {
  const pkg = getPackageById(String(data?.packageId || 'basic'));
  const visibilityScope: AdVisibilityScope =
    data?.visibilityScope === 'all_institutions' ? 'all_institutions' : 'specific_institution';
  const placement: AdPlacement = [
    'ads_section',
    'homepage_hero',
    'category_feed',
    'institution_spotlight'
  ].includes(data?.placement)
    ? data.placement
    : 'ads_section';
  const institutionId =
    visibilityScope === 'all_institutions'
      ? data?.institutionId
        ? String(data.institutionId)
        : undefined
      : String(data?.institutionId || DEFAULT_INSTITUTION_ID);

  return {
    id: String(data?.id || id),
    businessName: String(data?.businessName || '').trim(),
    ownerName: String(data?.ownerName || '').trim(),
    phone: String(data?.phone || '').trim(),
    whatsappNumber: String(data?.whatsappNumber || '').trim(),
    businessCategory: String(data?.businessCategory || 'Other Business').trim(),
    title: String(data?.title || '').trim(),
    description: String(data?.description || '').trim(),
    imageUrl: String(data?.imageUrl || '').trim(),
    ...(data?.logoUrl ? { logoUrl: String(data.logoUrl).trim() } : {}),
    location: String(data?.location || '').trim(),
    ...(institutionId ? { institutionId } : {}),
    ...(data?.campus ? { campus: String(data.campus).trim() } : {}),
    placement,
    visibilityScope,
    ...(data?.createdByCeoEmail ? { createdByCeoEmail: String(data.createdByCeoEmail) } : {}),
    packageId: pkg.id,
    packageName: String(data?.packageName || pkg.name).trim(),
    packagePrice: Number(data?.packagePrice) || pkg.priceNaira,
    durationDays: Number(data?.durationDays) || pkg.durationDays,
    ...(data?.websiteOrSocialLink
      ? { websiteOrSocialLink: String(data.websiteOrSocialLink).trim() }
      : {}),
    ...(data?.ownerUid ? { ownerUid: String(data.ownerUid) } : {}),
    status: (['pending_approval', 'active', 'paused', 'rejected', 'expired'].includes(data?.status)
      ? data.status
      : 'pending_approval') as AdStatus,
    paymentStatus: (['unpaid', 'pending_verification', 'paid', 'failed'].includes(data?.paymentStatus)
      ? data.paymentStatus
      : 'unpaid') as Advertisement['paymentStatus'],
    ...(data?.paymentReference ? { paymentReference: String(data.paymentReference) } : {}),
    isFeatured: Boolean(data?.isFeatured),
    isDeleted: Boolean(data?.isDeleted),
    ...(data?.deletedAt ? { deletedAt: toIsoString(data.deletedAt) } : {}),
    ...(data?.deletedBy ? { deletedBy: String(data.deletedBy) } : {}),
    ...(data?.startDate ? { startDate: toIsoString(data.startDate) } : {}),
    ...(data?.expiryDate ? { expiryDate: toIsoString(data.expiryDate) } : {}),
    impressions: Math.max(0, Number(data?.impressions) || 0),
    clicks: Math.max(0, Number(data?.clicks) || 0),
    whatsappClicks: Math.max(0, Number(data?.whatsappClicks) || 0),
    ...(data?.adminNotes ? { adminNotes: String(data.adminNotes) } : {}),
    ...(data?.isVerified !== undefined ? { isVerified: Boolean(data.isVerified) } : {}),
    ...(data?.ceoVerified !== undefined ? { ceoVerified: Boolean(data.ceoVerified) } : {}),
    ...(data?.verifiedBadgeText ? { verifiedBadgeText: String(data.verifiedBadgeText) } : {}),
    ...(data?.verifiedByCeoAt ? { verifiedByCeoAt: toIsoString(data.verifiedByCeoAt) } : {}),
    ...(data?.verifiedByCeoEmail ? { verifiedByCeoEmail: String(data.verifiedByCeoEmail) } : {}),
    ...(data?.verificationNotes ? { verificationNotes: String(data.verificationNotes) } : {}),
    createdAt: data?.createdAt ? toIsoString(data.createdAt) : new Date().toISOString(),
    updatedAt: data?.updatedAt ? toIsoString(data.updatedAt) : new Date().toISOString()
  };
}

export function filterAdsForInstitution(
  ads: Advertisement[],
  institutionId?: string
): Advertisement[] {
  if (!institutionId || institutionId === 'all') return ads;
  return ads.filter(
    (ad) =>
      ad.visibilityScope === 'all_institutions' ||
      belongsToInstitution(ad.institutionId, institutionId)
  );
}

export function isAdCurrentlyLive(ad: Advertisement, nowMs = Date.now()): boolean {
  if (ad.isDeleted) return false;
  if (ad.status !== 'active' || ad.paymentStatus !== 'paid') return false;
  if (ad.startDate) {
    const startTs = Date.parse(ad.startDate);
    if (!isNaN(startTs) && startTs > nowMs) return false;
  }
  if (ad.expiryDate) {
    const expTs = Date.parse(ad.expiryDate);
    if (!isNaN(expTs) && expTs <= nowMs) return false;
  }
  return Boolean(ad.businessName && ad.title && ad.imageUrl);
}

function sortActivePublicAds(list: Advertisement[]): Advertisement[] {
  const tierWeight = (ad: Advertisement): number => {
    if (ad.isFeatured || ad.packageId === 'featured') return 3;
    if (ad.packageId === 'premium') return 2;
    return 1;
  };
  return [...list].sort((a, b) => {
    const diff = tierWeight(b) - tierWeight(a);
    if (diff !== 0) return diff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

const ADS_CACHE_KEY = 'fu_market_active_ads_v1';
let memoryActiveAds: Advertisement[] | null = null;

function saveActiveAdsCache(list: Advertisement[]): void {
  memoryActiveAds = list;
  if (typeof window === 'undefined') return;
  try {
    const slim = list.filter((a) => !a.imageUrl.startsWith('data:') || a.imageUrl.length < 150_000);
    localStorage.setItem(ADS_CACHE_KEY, JSON.stringify(slim));
  } catch {
    // Non-blocking storage limit guard
  }
}

export function getCachedActivePublicAds(): Advertisement[] {
  if (memoryActiveAds) return memoryActiveAds.filter((a) => isAdCurrentlyLive(a));
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ADS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    memoryActiveAds = parsed
      .map((item: any) => sanitizeAdDoc(item.id || '', item))
      .filter((a) => isAdCurrentlyLive(a));
    return memoryActiveAds;
  } catch {
    return [];
  }
}

export function subscribeToActivePublicAds(
  onData: (ads: Advertisement[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(
    collection(db, 'advertisements'),
    where('status', '==', 'active'),
    where('paymentStatus', '==', 'paid'),
    where('isDeleted', '==', false)
  );
  return onSnapshot(
    q,
    (snap) => {
      const live = sortActivePublicAds(
        snap.docs.map((d) => sanitizeAdDoc(d.id, d.data())).filter((a) => isAdCurrentlyLive(a))
      );
      saveActiveAdsCache(live);
      onData(live);
    },
    (err) => {
      console.warn('[subscribeToActivePublicAds warning]:', err?.message || err);
      onError?.(err);
    }
  );
}

export interface SubmitAdvertisementInput {
  businessName: string;
  ownerName: string;
  phone: string;
  whatsappNumber: string;
  businessCategory: string;
  title: string;
  description: string;
  imageUrl: string;
  logoUrl?: string;
  location: string;
  packageId: AdPackageId;
  websiteOrSocialLink?: string;
  institutionId?: string;
  campus?: string;
  placement?: AdPlacement;
  visibilityScope?: AdVisibilityScope;
}

export async function submitAdvertisement(input: SubmitAdvertisementInput): Promise<Advertisement> {
  if (!isFirebaseCeoVerified()) {
    throw new Error(
      `Only the NIGERIA CAMPUS MARKET CEO (${CEO_EMAIL}) can publish official advertisements. Contact CEO on WhatsApp (${CEO_ADS_PHONE}) to advertise your business.`
    );
  }
  return ceoCreateOfficialAd({
    ...input,
    status: 'active',
    isFeatured: input.packageId === 'featured'
  });
}

export interface CeoOfficialAdInput extends SubmitAdvertisementInput {
  durationDays?: number;
  status?: 'active' | 'paused';
  isFeatured?: boolean;
  startDate?: string;
  expiryDate?: string;
  adminNotes?: string;
  paymentReference?: string;
}

export async function ceoCreateOfficialAd(input: CeoOfficialAdInput): Promise<Advertisement> {
  assertCeoSignedIn();
  if (!input.businessName.trim()) throw new Error('Business name is required.');
  if (!input.title.trim()) throw new Error('Advertisement title is required.');
  if (!input.description.trim()) throw new Error('Advertisement description is required.');
  if (!input.imageUrl.trim()) throw new Error('Advertisement banner image is required.');
  if (!input.location.trim()) throw new Error('Business location is required.');

  const pkg = getPackageById(input.packageId || 'basic');
  const durationDays = Math.max(1, Number(input.durationDays) || pkg.durationDays);
  const visibilityScope: AdVisibilityScope =
    input.visibilityScope === 'all_institutions' ? 'all_institutions' : 'specific_institution';
  const placement: AdPlacement = input.placement || 'ads_section';
  const institutionId =
    visibilityScope === 'specific_institution'
      ? (input.institutionId || DEFAULT_INSTITUTION_ID).trim()
      : undefined;

  const adId = makeDocId('ad');
  const now = new Date();
  const nowIso = now.toISOString();
  const startIso = input.startDate ? toIsoString(input.startDate) : nowIso;
  const expiryIso = input.expiryDate
    ? toIsoString(input.expiryDate)
    : new Date(Date.parse(startIso) + durationDays * 24 * 60 * 60 * 1000).toISOString();
  const ceoEmail = auth.currentUser?.email || CEO_EMAIL;

  const firestorePayload: Record<string, any> = stripUndefined({
    id: adId,
    businessName: input.businessName.trim().slice(0, 140),
    ownerName: (input.ownerName.trim() || 'NIGERIA CAMPUS MARKET Official Advertiser').slice(0, 120),
    phone: (input.phone.trim() || CEO_ADS_PHONE).slice(0, 40),
    whatsappNumber: (input.whatsappNumber.trim() || input.phone.trim() || CEO_ADS_PHONE).slice(0, 40),
    businessCategory: (input.businessCategory.trim() || 'Other Business').slice(0, 80),
    title: input.title.trim().slice(0, 180),
    description: input.description.trim().slice(0, 4000),
    imageUrl: input.imageUrl.trim(),
    ...(input.logoUrl?.trim() ? { logoUrl: input.logoUrl.trim() } : {}),
    location: input.location.trim().slice(0, 180),
    ...(institutionId ? { institutionId } : {}),
    ...(input.campus?.trim() ? { campus: input.campus.trim().slice(0, 120) } : {}),
    placement,
    visibilityScope,
    createdByCeoEmail: ceoEmail,
    packageId: pkg.id,
    packageName: pkg.name,
    packagePrice: pkg.priceNaira,
    durationDays,
    ...(input.websiteOrSocialLink?.trim()
      ? { websiteOrSocialLink: input.websiteOrSocialLink.trim().slice(0, 500) }
      : {}),
    ...(auth.currentUser?.uid ? { ownerUid: auth.currentUser.uid } : {}),
    status: input.status === 'paused' ? 'paused' : 'active',
    paymentStatus: 'paid',
    paymentReference: input.paymentReference?.trim() || `CEO_OFFICIAL_${Date.now()}`,
    isFeatured: input.isFeatured ?? pkg.id === 'featured',
    isDeleted: false,
    startDate: startIso,
    expiryDate: expiryIso,
    impressions: 0,
    clicks: 0,
    whatsappClicks: 0,
    ...(input.adminNotes?.trim() ? { adminNotes: input.adminNotes.trim().slice(0, 500) } : {}),
    isVerified: true,
    ceoVerified: true,
    verifiedBadgeText: 'VERIFIED BY NIGERIA CAMPUS MARKET CEO',
    verifiedByCeoAt: nowIso,
    verifiedByCeoEmail: ceoEmail,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  const approxBytes = new TextEncoder().encode(JSON.stringify(firestorePayload)).length;
  if (approxBytes > 950_000) {
    throw new Error('Advertisement images and text exceed database storage size. Please upload smaller images.');
  }

  try {
    await setDoc(doc(db, 'advertisements', adId), firestorePayload);
    await recordAdminAuditLog({
      action: 'approve',
      contentType: 'advertisements',
      recordId: adId,
      recordTitle: `${firestorePayload.businessName} — ${firestorePayload.title}`,
      reason: `CEO published official ad (${placement}, ${visibilityScope})`
    });
    return sanitizeAdDoc(adId, { ...firestorePayload, createdAt: nowIso, updatedAt: nowIso });
  } catch (err: any) {
    if (String(err?.code || '') === 'permission-denied') {
      handleFirestoreError(err, OperationType.CREATE, `advertisements/${adId}`);
    }
    throw err;
  }
}

export async function ceoUpdateOfficialAd(
  ad: Advertisement,
  updates: Partial<CeoOfficialAdInput>
): Promise<void> {
  assertCeoSignedIn();
  const pkg = updates.packageId ? getPackageById(updates.packageId) : null;
  const visibilityScope: AdVisibilityScope =
    updates.visibilityScope || ad.visibilityScope || 'specific_institution';

  const payload = stripUndefined({
    ...(updates.businessName !== undefined ? { businessName: updates.businessName.trim().slice(0, 140) } : {}),
    ...(updates.ownerName !== undefined ? { ownerName: updates.ownerName.trim().slice(0, 120) } : {}),
    ...(updates.phone !== undefined ? { phone: updates.phone.trim().slice(0, 40) } : {}),
    ...(updates.whatsappNumber !== undefined
      ? { whatsappNumber: updates.whatsappNumber.trim().slice(0, 40) }
      : {}),
    ...(updates.businessCategory !== undefined
      ? { businessCategory: updates.businessCategory.trim().slice(0, 80) }
      : {}),
    ...(updates.title !== undefined ? { title: updates.title.trim().slice(0, 180) } : {}),
    ...(updates.description !== undefined
      ? { description: updates.description.trim().slice(0, 4000) }
      : {}),
    ...(updates.imageUrl !== undefined ? { imageUrl: updates.imageUrl.trim() } : {}),
    ...(updates.logoUrl !== undefined ? { logoUrl: updates.logoUrl.trim() || '' } : {}),
    ...(updates.location !== undefined ? { location: updates.location.trim().slice(0, 180) } : {}),
    ...(updates.placement !== undefined ? { placement: updates.placement } : {}),
    visibilityScope,
    institutionId:
      visibilityScope === 'all_institutions'
        ? ''
        : (updates.institutionId || ad.institutionId || DEFAULT_INSTITUTION_ID).trim(),
    ...(updates.campus !== undefined ? { campus: updates.campus.trim().slice(0, 120) } : {}),
    ...(updates.websiteOrSocialLink !== undefined
      ? { websiteOrSocialLink: updates.websiteOrSocialLink.trim().slice(0, 500) }
      : {}),
    ...(pkg
      ? {
          packageId: pkg.id,
          packageName: pkg.name,
          packagePrice: pkg.priceNaira
        }
      : {}),
    ...(updates.durationDays !== undefined ? { durationDays: Math.max(1, Number(updates.durationDays) || 7) } : {}),
    ...(updates.isFeatured !== undefined ? { isFeatured: Boolean(updates.isFeatured) } : {}),
    ...(updates.status !== undefined ? { status: updates.status } : {}),
    ...(updates.startDate !== undefined ? { startDate: toIsoString(updates.startDate) } : {}),
    ...(updates.expiryDate !== undefined ? { expiryDate: toIsoString(updates.expiryDate) } : {}),
    ...(updates.adminNotes !== undefined ? { adminNotes: updates.adminNotes.trim().slice(0, 500) } : {}),
    updatedAt: serverTimestamp()
  });

  await updateDoc(doc(db, 'advertisements', ad.id), payload);
  await recordAdminAuditLog({
    action: 'edit',
    contentType: 'advertisements',
    recordId: ad.id,
    recordTitle: `${updates.businessName || ad.businessName} — ${updates.title || ad.title}`
  });
}

export async function ceoDeleteOfficialAd(ad: Advertisement, reason?: string): Promise<void> {
  return adminDeleteAdvertisementPermanently(ad, reason);
}

export async function trackAdEvent(
  adId: string,
  eventType: AdAnalyticsEvent['eventType']
): Promise<void> {
  if (!adId) return;
  try {
    const analyticsId = makeDocId('ana');
    await setDoc(doc(db, 'adAnalytics', analyticsId), {
      id: analyticsId,
      adId,
      eventType,
      createdAt: serverTimestamp()
    });
    const counterField =
      eventType === 'impression'
        ? 'impressions'
        : eventType === 'whatsapp_click'
        ? 'whatsappClicks'
        : 'clicks';
    await updateDoc(doc(db, 'advertisements', adId), {
      [counterField]: increment(1)
    });
  } catch {
    // Analytics must never interrupt UX
  }
}

// ============================================================================
// SECURE PAYSTACK PAYMENT INTEGRATION (SERVER AUTHORITATIVE)
// ============================================================================
export async function fetchPaystackStatus(): Promise<{
  configured: boolean;
  publicKeyConfigured: boolean;
  message: string;
}> {
  return safeFetchJson('/api/ads/paystack/status', { timeoutMs: 5000 });
}

export async function initializePaystackPayment(params: {
  adId: string;
  packageId: AdPackageId;
  businessName: string;
  phone?: string;
  email?: string;
}): Promise<{
  configured: boolean;
  reference: string;
  authorizationUrl: string;
  amountNaira: number;
}> {
  const callbackUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?adPaymentRef=${encodeURIComponent(params.adId)}`
      : undefined;
  return safeFetchJson('/api/ads/paystack/initialize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ ...params, callbackUrl }),
    timeoutMs: 8000
  });
}

export async function verifyPaystackPayment(params: {
  reference: string;
  adId: string;
  packageId: AdPackageId;
}): Promise<{
  verified: boolean;
  payment: AdPaymentRecord;
  proofSignature: string;
  message?: string;
}> {
  return safeFetchJson('/api/ads/paystack/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(params),
    timeoutMs: 8000
  });
}

// ============================================================================
// CEO ADVERTISING MANAGEMENT (PROTECTED BY FIREBASE AUTH + BACKEND CHECKS)
// ============================================================================
function assertCeoSignedIn(): void {
  if (!isFirebaseCeoVerified()) {
    throw new Error(
      `CEO authorization required. Sign in with verified Google account (${CEO_EMAIL}) to manage advertisements.`
    );
  }
}

export async function recordAdminAuditLog(entry: {
  action:
    | 'delete'
    | 'bulk_delete'
    | 'soft_delete'
    | 'restore'
    | 'permanent_delete'
    | 'edit'
    | 'approve'
    | 'reject'
    | 'pause'
    | 'reactivate'
    | 'feature'
    | 'verify_payment';
  contentType: string;
  recordId: string;
  recordTitle?: string;
  reason?: string;
}): Promise<void> {
  const logId = makeDocId('audit');
  const adminEmail = auth.currentUser?.email || CEO_EMAIL;
  const payload = stripUndefined({
    id: logId,
    action: entry.action,
    contentType: entry.contentType.slice(0, 80),
    recordId: entry.recordId.slice(0, 128),
    ...(entry.recordTitle ? { recordTitle: entry.recordTitle.slice(0, 200) } : {}),
    adminEmail,
    ...(entry.reason ? { reason: entry.reason.slice(0, 400) } : {}),
    createdAt: serverTimestamp()
  });

  await setDoc(doc(db, 'adminAuditLogs', logId), payload);

  // Best-effort immutable mirror to Express server log
  getAdminHeaders()
    .then((headers) =>
      safeFetchJson('/api/ads/admin/audit-logs', {
        method: 'POST',
        headers,
        body: JSON.stringify(entry),
        timeoutMs: 4000
      })
    )
    .catch(() => {});
}

export async function fetchAllAdsForAdmin(): Promise<Advertisement[]> {
  assertCeoSignedIn();
  try {
    const snap = await getDocs(collection(db, 'advertisements'));
    return snap.docs
      .map((d) => sanitizeAdDoc(d.id, d.data()))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err: any) {
    if (String(err?.code || '') === 'permission-denied') {
      handleFirestoreError(err, OperationType.LIST, 'advertisements');
    }
    throw err;
  }
}

export async function fetchAllPaymentsForAdmin(): Promise<AdPaymentRecord[]> {
  assertCeoSignedIn();
  const merged = new Map<string, AdPaymentRecord>();

  try {
    const snap = await getDocs(collection(db, 'adPayments'));
    for (const d of snap.docs) {
      const data = d.data() as AdPaymentRecord;
      merged.set(data.reference || d.id, { ...data, id: data.id || d.id });
    }
  } catch {
    // Continue to server records
  }

  try {
    const headers = await getAdminHeaders();
    const serverRes = await safeFetchJson('/api/ads/admin/payments', {
      headers,
      timeoutMs: 5000
    });
    if (Array.isArray(serverRes?.payments)) {
      for (const p of serverRes.payments as AdPaymentRecord[]) {
        merged.set(p.reference || p.id, p);
      }
    }
  } catch {
    // Ignore if Express backend unavailable
  }

  return Array.from(merged.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function adminVerifyAdPayment(params: {
  ad: Advertisement;
  mode: 'paystack_ref' | 'ceo_manual';
  reference?: string;
}): Promise<AdPaymentRecord> {
  assertCeoSignedIn();
  const { ad, mode, reference } = params;
  const headers = await getAdminHeaders();

  let payment: AdPaymentRecord;

  if (mode === 'paystack_ref') {
    const cleanRef = (reference || ad.paymentReference || '').trim();
    if (!cleanRef) {
      throw new Error('Enter the Paystack payment reference to verify via Paystack backend.');
    }
    const res = await safeFetchJson('/api/ads/paystack/verify', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        reference: cleanRef,
        adId: ad.id,
        packageId: ad.packageId
      }),
      timeoutMs: 8000
    });
    if (!res?.verified || !res?.payment) {
      throw new Error(res?.error || 'Payment verification failed.');
    }
    payment = res.payment;
  } else {
    const res = await safeFetchJson('/api/ads/admin/payments/manual-verify', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        adId: ad.id,
        businessName: ad.businessName,
        packageId: ad.packageId,
        reference: reference?.trim() || undefined,
        amountNaira: ad.packagePrice,
        payerPhone: ad.phone
      }),
      timeoutMs: 6000
    });
    payment = res.payment;
  }

  // Persist protected payment record & mark advertisement paymentStatus = 'paid' in Firestore
  await setDoc(doc(db, 'adPayments', payment.id), stripUndefined(payment));
  await updateDoc(doc(db, 'advertisements', ad.id), {
    paymentStatus: 'paid',
    paymentReference: payment.reference,
    updatedAt: serverTimestamp()
  });

  await recordAdminAuditLog({
    action: 'verify_payment',
    contentType: 'advertisements',
    recordId: ad.id,
    recordTitle: `${ad.businessName} (${payment.reference})`,
    reason: `Payment verified (${payment.provider})`
  });

  return payment;
}

export async function adminApproveAndActivateAd(
  ad: Advertisement,
  options?: {
    startDate?: string;
    expiryDate?: string;
    isFeatured?: boolean;
    adminNotes?: string;
  }
): Promise<void> {
  assertCeoSignedIn();

  // Security rule: Unpaid advertisements must NEVER be published publicly!
  if (ad.paymentStatus !== 'paid') {
    throw new Error(
      'Payment has not been verified for this advertisement. Verify payment first (Paystack or CEO WhatsApp confirmation) before activating publicly.'
    );
  }

  const now = new Date();
  const startIso = options?.startDate ? toIsoString(options.startDate) : ad.startDate || now.toISOString();
  const defaultExpiry = new Date(
    Date.parse(startIso) + (ad.durationDays || 7) * 24 * 60 * 60 * 1000
  ).toISOString();
  const expiryIso = options?.expiryDate ? toIsoString(options.expiryDate) : ad.expiryDate || defaultExpiry;

  const isFeatured =
    options?.isFeatured !== undefined
      ? options.isFeatured
      : ad.packageId === 'featured' || ad.isFeatured;

  await updateDoc(
    doc(db, 'advertisements', ad.id),
    stripUndefined({
      status: 'active',
      startDate: startIso,
      expiryDate: expiryIso,
      isFeatured,
      isDeleted: false,
      ...(options?.adminNotes !== undefined ? { adminNotes: options.adminNotes } : {}),
      updatedAt: serverTimestamp()
    })
  );

  await recordAdminAuditLog({
    action: 'approve',
    contentType: 'advertisements',
    recordId: ad.id,
    recordTitle: `${ad.businessName} - ${ad.title}`
  });
}

export async function adminUpdateAdvertisement(
  ad: Advertisement,
  updates: Partial<Advertisement>,
  auditAction: 'edit' | 'reject' | 'pause' | 'reactivate' | 'feature' = 'edit',
  reason?: string
): Promise<void> {
  assertCeoSignedIn();

  if (updates.status === 'active' && (updates.paymentStatus ?? ad.paymentStatus) !== 'paid') {
    throw new Error('Cannot activate an unpaid advertisement. Verify payment first.');
  }

  await updateDoc(
    doc(db, 'advertisements', ad.id),
    stripUndefined({
      ...updates,
      updatedAt: serverTimestamp()
    })
  );

  await recordAdminAuditLog({
    action: auditAction,
    contentType: 'advertisements',
    recordId: ad.id,
    recordTitle: `${updates.businessName || ad.businessName} - ${updates.title || ad.title}`,
    reason
  });
}

export async function adminSoftDeleteAdvertisement(
  ad: Advertisement,
  reason?: string
): Promise<void> {
  assertCeoSignedIn();
  const nowIso = new Date().toISOString();
  const archiveId = makeDocId('arc');

  await setDoc(
    doc(db, 'contentManagement', archiveId),
    stripUndefined({
      id: archiveId,
      sourceCollection: 'advertisements',
      sourceId: ad.id,
      contentType: 'advertisements',
      title: `${ad.businessName}: ${ad.title}`.slice(0, 200),
      ownerName: ad.ownerName,
      categoryLabel: ad.businessCategory,
      statusLabel: ad.status,
      deletedByEmail: auth.currentUser?.email || CEO_EMAIL,
      ...(reason ? { deletionReason: reason } : {}),
      originalCreatedAt: ad.createdAt,
      deletedAt: nowIso,
      payload: ad
    })
  );

  await updateDoc(doc(db, 'advertisements', ad.id), {
    isDeleted: true,
    status: 'paused',
    deletedAt: nowIso,
    deletedBy: auth.currentUser?.email || CEO_EMAIL,
    updatedAt: serverTimestamp()
  });

  await recordAdminAuditLog({
    action: 'soft_delete',
    contentType: 'advertisements',
    recordId: ad.id,
    recordTitle: `${ad.businessName} - ${ad.title}`,
    reason
  });
}

export async function adminDeleteAdvertisementPermanently(
  ad: Advertisement,
  reason?: string
): Promise<void> {
  assertCeoSignedIn();
  await deleteDoc(doc(db, 'advertisements', ad.id));
  await recordAdminAuditLog({
    action: 'permanent_delete',
    contentType: 'advertisements',
    recordId: ad.id,
    recordTitle: `${ad.businessName} - ${ad.title}`,
    reason
  });
}

export async function fetchAdById(adId: string): Promise<Advertisement | null> {
  if (!adId) return null;
  const snap = await getDoc(doc(db, 'advertisements', adId));
  if (!snap.exists()) return null;
  return sanitizeAdDoc(snap.id, snap.data());
}
