import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import { auth, db, ensureGuestAuth, stripUndefined, toIsoString } from './firebase.js';
import { getAdminHeaders, safeFetchJson } from './api.js';
import { CEO_EMAIL, isFirebaseCeoVerified } from './events.js';
import { recordAdminAuditLog } from './ads.js';
import { getOrCreateGuestId } from '../utils/studentAuth.js';
import {
  ServiceAvailability,
  ServiceCategory,
  ServiceListing,
  ServicePromotionPlan,
  ServicePromotionPlanId,
  ServiceReport,
  ServiceStatus
} from '../types.js';

export const SERVICE_WHATSAPP_MESSAGE =
  'Hello, I found your service on FU MARKET. I am interested in your service. Please provide more information.';

export const DEFAULT_SERVICE_CATEGORIES: ServiceCategory[] = [
  { id: 'barbing-and-hair-styling', name: 'Barbing and Hair Styling', slug: 'barbing-and-hair-styling', isActive: true, sortOrder: 1 },
  { id: 'hair-dressing-and-braiding', name: 'Hair Dressing and Braiding', slug: 'hair-dressing-and-braiding', isActive: true, sortOrder: 2 },
  { id: 'laundry-services', name: 'Laundry Services', slug: 'laundry-services', isActive: true, sortOrder: 3 },
  { id: 'graphic-design', name: 'Graphic Design', slug: 'graphic-design', isActive: true, sortOrder: 4 },
  { id: 'photography-and-videography', name: 'Photography and Videography', slug: 'photography-and-videography', isActive: true, sortOrder: 5 },
  { id: 'phone-and-laptop-repairs', name: 'Phone and Laptop Repairs', slug: 'phone-and-laptop-repairs', isActive: true, sortOrder: 6 },
  { id: 'printing-and-photocopying', name: 'Printing and Photocopying', slug: 'printing-and-photocopying', isActive: true, sortOrder: 7 },
  { id: 'assignment-typing-and-formatting', name: 'Assignment Typing and Formatting', slug: 'assignment-typing-and-formatting', isActive: true, sortOrder: 8 },
  { id: 'catering-and-food-services', name: 'Catering and Food Services', slug: 'catering-and-food-services', isActive: true, sortOrder: 9 },
  { id: 'fashion-and-tailoring', name: 'Fashion and Tailoring', slug: 'fashion-and-tailoring', isActive: true, sortOrder: 10 },
  { id: 'makeup-and-beauty', name: 'Makeup and Beauty', slug: 'makeup-and-beauty', isActive: true, sortOrder: 11 },
  { id: 'electrical-repairs', name: 'Electrical Repairs', slug: 'electrical-repairs', isActive: true, sortOrder: 12 },
  { id: 'plumbing-services', name: 'Plumbing Services', slug: 'plumbing-services', isActive: true, sortOrder: 13 },
  { id: 'cleaning-services', name: 'Cleaning Services', slug: 'cleaning-services', isActive: true, sortOrder: 14 },
  { id: 'delivery-and-errand-services', name: 'Delivery and Errand Services', slug: 'delivery-and-errand-services', isActive: true, sortOrder: 15 },
  { id: 'private-tutoring', name: 'Private Tutoring', slug: 'private-tutoring', isActive: true, sortOrder: 16 },
  { id: 'website-development', name: 'Website Development', slug: 'website-development', isActive: true, sortOrder: 17 },
  { id: 'social-media-management', name: 'Social Media Management', slug: 'social-media-management', isActive: true, sortOrder: 18 },
  { id: 'other-services', name: 'Other Services', slug: 'other-services', isActive: true, sortOrder: 19 }
];

export const SERVICE_PROMOTION_PLANS: ServicePromotionPlan[] = [
  {
    id: 'weekly',
    name: 'Weekly Promotion',
    priceNaira: 2500,
    durationDays: 7,
    placementLabel: 'Featured Service Placement',
    benefits: ['₦2,500', '7 days active spotlight', 'Featured service placement']
  },
  {
    id: 'homepage',
    name: 'Homepage Promotion',
    priceNaira: 3500,
    durationDays: 7,
    placementLabel: 'Homepage Top Spotlight',
    benefits: ['₦3,500', '7 days featured spot', 'Priority homepage promotion row']
  },
  {
    id: 'monthly',
    name: 'Monthly Promotion',
    priceNaira: 8000,
    durationDays: 30,
    placementLabel: 'Full-Month Featured Placement',
    benefits: ['₦8,000', '30 days continuous spotlight', 'Homepage promotion + category top rank']
  }
];

export const FUWUKARI_SERVICE_LOCATIONS = [
  'Main Campus (FUWUKARI)',
  'New Site',
  'Main Gate',
  'Behind LT',
  'Hostel A / 100L',
  'Hostel B / 200L',
  'Puje',
  'Bye Pass',
  'Wukari Town'
] as const;

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

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 128);
}

export function getServicePromoPlan(planId: string): ServicePromotionPlan {
  return (
    SERVICE_PROMOTION_PLANS.find((p) => p.id === planId) || SERVICE_PROMOTION_PLANS[0]
  );
}

export function normalizeWhatsAppDigits(phone: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0') && digits.length === 11) {
    return `234${digits.slice(1)}`;
  }
  if (digits.startsWith('234')) return digits;
  return `234${digits}`;
}

export function buildServiceWhatsAppHref(service: Pick<ServiceListing, 'whatsapp' | 'phone'>): string {
  const intl = normalizeWhatsAppDigits(service.whatsapp || service.phone);
  return `https://wa.me/${intl}?text=${encodeURIComponent(SERVICE_WHATSAPP_MESSAGE)}`;
}

export function buildServiceCallHref(phone: string): string {
  const cleaned = String(phone || '').replace(/[^\d+]/g, '');
  return `tel:${cleaned}`;
}

export function isServicePromotionLive(service: ServiceListing, nowMs = Date.now()): boolean {
  if (!service.featured || service.status !== 'active') return false;
  if (service.promotionStatus && service.promotionStatus !== 'active') return false;
  if (service.promotionExpiryDate) {
    const expTs = Date.parse(service.promotionExpiryDate);
    if (!isNaN(expTs) && expTs <= nowMs) return false;
  }
  return true;
}

export function sanitizeServiceDoc(id: string, data: any): ServiceListing {
  const rawImages = Array.isArray(data?.images)
    ? data.images.filter((u: unknown) => typeof u === 'string' && u.trim())
    : data?.imageUrl
    ? [String(data.imageUrl)]
    : [];

  return {
    serviceId: String(data?.serviceId || id),
    providerId: String(data?.providerId || '').trim(),
    providerName: String(data?.providerName || '').trim(),
    serviceName: String(data?.serviceName || '').trim(),
    category: String(data?.category || 'Other Services').trim(),
    description: String(data?.description || '').trim(),
    price: Math.max(0, Number(data?.price) || 0),
    ...(data?.priceMax !== undefined && Number(data.priceMax) > 0
      ? { priceMax: Number(data.priceMax) }
      : {}),
    ...(data?.priceDisplay ? { priceDisplay: String(data.priceDisplay).trim() } : {}),
    location: String(data?.location || '').trim(),
    phone: String(data?.phone || '').trim(),
    whatsapp: String(data?.whatsapp || data?.phone || '').trim(),
    images: rawImages,
    availability: (['available', 'busy', 'unavailable'].includes(data?.availability)
      ? data.availability
      : 'available') as ServiceAvailability,
    ...(data?.availabilityNote ? { availabilityNote: String(data.availabilityNote).trim() } : {}),
    status: (['active', 'pending', 'rejected', 'suspended', 'unavailable'].includes(data?.status)
      ? data.status
      : 'active') as ServiceStatus,
    featured: Boolean(data?.featured),
    ...(data?.promotionPlan ? { promotionPlan: data.promotionPlan } : {}),
    ...(data?.promotionStatus ? { promotionStatus: data.promotionStatus } : {}),
    ...(data?.promotionPrice !== undefined ? { promotionPrice: Number(data.promotionPrice) } : {}),
    ...(data?.promotionReference ? { promotionReference: String(data.promotionReference) } : {}),
    ...(data?.promotionStartDate
      ? { promotionStartDate: toIsoString(data.promotionStartDate) }
      : {}),
    ...(data?.promotionExpiryDate
      ? { promotionExpiryDate: toIsoString(data.promotionExpiryDate) }
      : {}),
    views: Math.max(0, Number(data?.views) || 0),
    whatsappClicks: Math.max(0, Number(data?.whatsappClicks) || 0),
    ...(data?.moderationNotes ? { moderationNotes: String(data.moderationNotes) } : {}),
    ...(data?.isGuestPost !== undefined ? { isGuestPost: Boolean(data.isGuestPost) } : {}),
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

// Local device ownership index ONLY for identifying which guest-posted services belong to this browser
const LOCAL_OWNED_SERVICES_KEY = 'fu_market_owned_service_ids_v1';

export function recordOwnedServiceIdLocally(serviceId: string): void {
  if (typeof window === 'undefined' || !serviceId) return;
  try {
    const raw = localStorage.getItem(LOCAL_OWNED_SERVICES_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (!list.includes(serviceId)) {
      list.unshift(serviceId);
      localStorage.setItem(LOCAL_OWNED_SERVICES_KEY, JSON.stringify(list.slice(0, 100)));
    }
  } catch {
    // non-blocking
  }
}

export function getLocallyOwnedServiceIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_OWNED_SERVICES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function subscribeToPublicServices(
  onData: (services: ServiceListing[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(collection(db, 'services'), where('status', '==', 'active'));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => sanitizeServiceDoc(d.id, d.data()))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onData(list);
    },
    (err) => {
      console.warn('[subscribeToPublicServices warning]:', err?.message || err);
      onError?.(err);
    }
  );
}

export function subscribeToProviderServices(
  providerIds: string[],
  onData: (services: ServiceListing[]) => void,
  onError?: (err: Error) => void
): () => void {
  const cleanIds = Array.from(new Set(providerIds.map((x) => x.trim()).filter(Boolean)));
  if (cleanIds.length === 0) {
    onData([]);
    return () => {};
  }

  // Subscribe per active ownerId cleanly within Firestore rules
  const buckets = new Map<string, ServiceListing[]>();
  const unsubs: (() => void)[] = [];

  const emitMerged = () => {
    const map = new Map<string, ServiceListing>();
    for (const arr of buckets.values()) {
      for (const s of arr) map.set(s.serviceId, s);
    }
    const merged = Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    onData(merged);
  };

  for (const pid of cleanIds) {
    if (auth.currentUser && pid === auth.currentUser.uid) {
      const q = query(collection(db, 'services'), where('providerId', '==', pid));
      const u = onSnapshot(
        q,
        (snap) => {
          buckets.set(
            pid,
            snap.docs.map((d) => sanitizeServiceDoc(d.id, d.data()))
          );
          emitMerged();
        },
        (err) => {
          onError?.(err);
        }
      );
      unsubs.push(u);
    }
  }

  // Also keep active public services authored by any local guest IDs in sync
  const publicQ = query(collection(db, 'services'), where('status', '==', 'active'));
  const pubUnsub = onSnapshot(
    publicQ,
    (snap) => {
      const localOwned = new Set(getLocallyOwnedServiceIds());
      const matching = snap.docs
        .map((d) => sanitizeServiceDoc(d.id, d.data()))
        .filter((s) => cleanIds.includes(s.providerId) || localOwned.has(s.serviceId));
      buckets.set('__public_owned__', matching);
      emitMerged();
    },
    (err) => {
      onError?.(err);
    }
  );
  unsubs.push(pubUnsub);

  return () => {
    for (const u of unsubs) u();
  };
}

export function subscribeToServiceCategories(
  onData: (categories: ServiceCategory[]) => void
): () => void {
  return onSnapshot(
    collection(db, 'serviceCategories'),
    (snap) => {
      const dbCats = snap.docs.map((d) => {
        const data = d.data() || {};
        return {
          id: String(data.id || d.id),
          name: String(data.name || d.id),
          slug: String(data.slug || d.id),
          ...(data.description ? { description: String(data.description) } : {}),
          isActive: data.isActive !== false,
          sortOrder: Number(data.sortOrder) || 999,
          createdAt: data.createdAt ? toIsoString(data.createdAt) : undefined,
          updatedAt: data.updatedAt ? toIsoString(data.updatedAt) : undefined
        } as ServiceCategory;
      });

      const merged = new Map<string, ServiceCategory>();
      for (const def of DEFAULT_SERVICE_CATEGORIES) {
        merged.set(def.id, def);
      }
      for (const c of dbCats) {
        merged.set(c.id, c);
      }

      const sorted = Array.from(merged.values())
        .filter((c) => c.isActive !== false)
        .sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999));
      onData(sorted);
    },
    () => {
      onData(DEFAULT_SERVICE_CATEGORIES);
    }
  );
}

export interface CreateOrUpdateServiceInput {
  providerName: string;
  serviceName: string;
  category: string;
  description: string;
  price: number;
  priceMax?: number;
  priceDisplay?: string;
  location: string;
  phone: string;
  whatsapp: string;
  images: string[];
  availability: ServiceAvailability;
  availabilityNote?: string;
}

export async function createServiceListing(
  input: CreateOrUpdateServiceInput,
  currentUserId?: string
): Promise<ServiceListing> {
  if (!input.serviceName.trim()) throw new Error('Service name is required.');
  if (!input.category.trim()) throw new Error('Service category is required.');
  if (!input.description.trim()) throw new Error('Service description is required.');
  if (!input.location.trim()) throw new Error('Service location is required.');
  if (!input.providerName.trim()) throw new Error('Provider name is required.');
  if (input.phone.trim().length < 5) throw new Error('Valid contact phone number is required.');
  if (input.whatsapp.trim().length < 5) throw new Error('Valid WhatsApp number is required.');
  if (!Array.isArray(input.images) || input.images.length === 0) {
    throw new Error('Please upload at least one service picture.');
  }

  let effectiveUid = auth.currentUser?.uid || currentUserId;
  let isGuestPost = !auth.currentUser || auth.currentUser.isAnonymous;

  if (!auth.currentUser) {
    const anonUid = await ensureGuestAuth().catch(() => null);
    if (anonUid) {
      effectiveUid = anonUid;
      isGuestPost = true;
    }
  }

  const providerId = (effectiveUid || getOrCreateGuestId()).trim();
  const serviceId = makeId('srv');
  const nowIso = new Date().toISOString();

  const priceNum = Math.max(0, Number(input.price) || 0);
  const priceMaxNum =
    input.priceMax !== undefined && Number(input.priceMax) > priceNum
      ? Number(input.priceMax)
      : undefined;

  const computedPriceDisplay =
    input.priceDisplay?.trim() ||
    (priceMaxNum
      ? `₦${priceNum.toLocaleString()} – ₦${priceMaxNum.toLocaleString()}`
      : `₦${priceNum.toLocaleString()}`);

  const payload = stripUndefined({
    serviceId,
    providerId,
    providerName: input.providerName.trim().slice(0, 120),
    serviceName: input.serviceName.trim().slice(0, 180),
    category: input.category.trim().slice(0, 100),
    description: input.description.trim().slice(0, 4000),
    price: priceNum,
    ...(priceMaxNum ? { priceMax: priceMaxNum } : {}),
    priceDisplay: computedPriceDisplay.slice(0, 80),
    location: input.location.trim().slice(0, 180),
    phone: input.phone.trim().slice(0, 40),
    whatsapp: input.whatsapp.trim().slice(0, 40),
    images: input.images.slice(0, 8),
    availability: input.availability || 'available',
    ...(input.availabilityNote?.trim()
      ? { availabilityNote: input.availabilityNote.trim().slice(0, 160) }
      : {}),
    status: 'active',
    featured: false,
    promotionPlan: 'none',
    promotionStatus: 'none',
    views: 0,
    whatsappClicks: 0,
    isGuestPost,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  const approxBytes = new TextEncoder().encode(JSON.stringify(payload)).length;
  if (approxBytes > 950_000) {
    throw new Error('Service images and text exceed database storage size. Please upload fewer or smaller photos.');
  }

  try {
    await setDoc(doc(db, 'services', serviceId), payload);
    recordOwnedServiceIdLocally(serviceId);
    return sanitizeServiceDoc(serviceId, { ...payload, createdAt: nowIso, updatedAt: nowIso });
  } catch (err: any) {
    if (String(err?.code || '') === 'permission-denied') {
      handleFirestoreError(err, OperationType.CREATE, `services/${serviceId}`);
    }
    throw err;
  }
}

export async function updateServiceListing(
  serviceId: string,
  updates: Partial<CreateOrUpdateServiceInput> & { status?: ServiceStatus }
): Promise<void> {
  const payload = stripUndefined({
    ...(updates.providerName !== undefined
      ? { providerName: updates.providerName.trim().slice(0, 120) }
      : {}),
    ...(updates.serviceName !== undefined
      ? { serviceName: updates.serviceName.trim().slice(0, 180) }
      : {}),
    ...(updates.category !== undefined ? { category: updates.category.trim().slice(0, 100) } : {}),
    ...(updates.description !== undefined
      ? { description: updates.description.trim().slice(0, 4000) }
      : {}),
    ...(updates.price !== undefined ? { price: Math.max(0, Number(updates.price) || 0) } : {}),
    ...(updates.priceMax !== undefined && Number(updates.priceMax) > 0
      ? { priceMax: Number(updates.priceMax) }
      : {}),
    ...(updates.priceDisplay !== undefined
      ? { priceDisplay: updates.priceDisplay.trim().slice(0, 80) }
      : {}),
    ...(updates.location !== undefined ? { location: updates.location.trim().slice(0, 180) } : {}),
    ...(updates.phone !== undefined ? { phone: updates.phone.trim().slice(0, 40) } : {}),
    ...(updates.whatsapp !== undefined ? { whatsapp: updates.whatsapp.trim().slice(0, 40) } : {}),
    ...(updates.images !== undefined && updates.images.length > 0
      ? { images: updates.images.slice(0, 8) }
      : {}),
    ...(updates.availability !== undefined ? { availability: updates.availability } : {}),
    ...(updates.availabilityNote !== undefined
      ? { availabilityNote: updates.availabilityNote.trim().slice(0, 160) }
      : {}),
    ...(updates.status !== undefined ? { status: updates.status } : {}),
    updatedAt: serverTimestamp()
  });

  try {
    await updateDoc(doc(db, 'services', serviceId), payload);
  } catch (err: any) {
    if (String(err?.code || '') === 'permission-denied') {
      handleFirestoreError(err, OperationType.UPDATE, `services/${serviceId}`);
    }
    throw err;
  }
}

export async function deleteServiceListing(serviceId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'services', serviceId));
  } catch (err: any) {
    if (String(err?.code || '') === 'permission-denied') {
      handleFirestoreError(err, OperationType.DELETE, `services/${serviceId}`);
    }
    throw err;
  }
}

export async function toggleServiceAvailability(
  serviceId: string,
  availability: ServiceAvailability
): Promise<void> {
  try {
    await updateDoc(doc(db, 'services', serviceId), {
      availability,
      updatedAt: serverTimestamp()
    });
  } catch (err: any) {
    if (String(err?.code || '') === 'permission-denied') {
      handleFirestoreError(err, OperationType.UPDATE, `services/${serviceId}`);
    }
    throw err;
  }
}

export async function trackServiceView(serviceId: string): Promise<void> {
  if (!serviceId) return;
  try {
    await updateDoc(doc(db, 'services', serviceId), {
      views: increment(1)
    });
  } catch {
    // Non-blocking analytics
  }
}

export async function trackServiceWhatsAppClick(serviceId: string): Promise<void> {
  if (!serviceId) return;
  try {
    await updateDoc(doc(db, 'services', serviceId), {
      whatsappClicks: increment(1)
    });
  } catch {
    // Non-blocking analytics
  }
}

export async function submitServiceReport(input: {
  serviceId: string;
  serviceName: string;
  providerId?: string;
  reason: string;
  details: string;
  reporterId?: string;
  reporterName?: string;
}): Promise<void> {
  const reportId = makeId('srep');
  try {
    await setDoc(
      doc(db, 'serviceReports', reportId),
      stripUndefined({
        id: reportId,
        serviceId: input.serviceId,
        serviceName: input.serviceName.trim().slice(0, 180),
        ...(input.providerId ? { providerId: input.providerId } : {}),
        reason: input.reason.trim().slice(0, 120),
        details: input.details.trim().slice(0, 1000),
        ...(input.reporterId ? { reporterId: input.reporterId } : {}),
        ...(input.reporterName ? { reporterName: input.reporterName.trim().slice(0, 120) } : {}),
        status: 'pending',
        createdAt: serverTimestamp()
      })
    );
  } catch (err: any) {
    if (String(err?.code || '') === 'permission-denied') {
      handleFirestoreError(err, OperationType.CREATE, `serviceReports/${reportId}`);
    }
    throw err;
  }
}

// ============================================================================
// PAID FEATURED SERVICE PROMOTIONS (PAYSTACK SERVER VERIFICATION)
// ============================================================================
export async function fetchServicePaystackStatus(): Promise<{
  configured: boolean;
  message: string;
}> {
  return safeFetchJson('/api/services/paystack/status', { timeoutMs: 5000 });
}

export async function initializeServicePromoPayment(params: {
  serviceId: string;
  planId: ServicePromotionPlanId;
  serviceName: string;
  providerName: string;
  phone?: string;
  email?: string;
}): Promise<{
  configured: boolean;
  reference: string;
  authorizationUrl: string;
  amountNaira: number;
  durationDays: number;
}> {
  const callbackUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?servicePromoRef=${encodeURIComponent(params.serviceId)}`
      : undefined;
  return safeFetchJson('/api/services/paystack/initialize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ ...params, callbackUrl }),
    timeoutMs: 8000
  });
}

export async function verifyServicePromoPayment(params: {
  reference: string;
  serviceId: string;
  planId: ServicePromotionPlanId;
}): Promise<{
  verified: boolean;
  payment: {
    reference: string;
    amountNaira: number;
    planId: ServicePromotionPlanId;
    status: string;
  };
  message?: string;
}> {
  const res = await safeFetchJson('/api/services/paystack/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(params),
    timeoutMs: 8000
  });

  if (res?.verified) {
    const plan = getServicePromoPlan(params.planId);
    // Provider requests activation; promotion only becomes featured=true after CEO/verified confirmation
    await updateDoc(
      doc(db, 'services', params.serviceId),
      stripUndefined({
        promotionPlan: plan.id,
        promotionStatus: 'pending_approval',
        promotionPrice: plan.priceNaira,
        promotionReference: params.reference,
        updatedAt: serverTimestamp()
      })
    );
  }
  return res;
}

// ============================================================================
// ADMIN / CEO SERVICE CONTROLS
// ============================================================================
function assertCeo(): void {
  if (!isFirebaseCeoVerified()) {
    throw new Error(
      `CEO access denied: Please sign in with the authorized CEO Google account (${CEO_EMAIL}).`
    );
  }
}

export function subscribeToAllServicesForAdmin(
  onData: (services: ServiceListing[]) => void,
  onError?: (err: Error) => void
): () => void {
  return onSnapshot(
    collection(db, 'services'),
    (snap) => {
      const list = snap.docs
        .map((d) => sanitizeServiceDoc(d.id, d.data()))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onData(list);
    },
    (err) => {
      onError?.(err);
    }
  );
}

export function subscribeToServiceReportsForAdmin(
  onData: (reports: ServiceReport[]) => void,
  onError?: (err: Error) => void
): () => void {
  return onSnapshot(
    collection(db, 'serviceReports'),
    (snap) => {
      const list = snap.docs
        .map((d) => {
          const data = d.data() || {};
          return {
            id: String(data.id || d.id),
            serviceId: String(data.serviceId || ''),
            serviceName: String(data.serviceName || ''),
            ...(data.providerId ? { providerId: String(data.providerId) } : {}),
            reason: String(data.reason || ''),
            details: String(data.details || ''),
            ...(data.reporterId ? { reporterId: String(data.reporterId) } : {}),
            ...(data.reporterName ? { reporterName: String(data.reporterName) } : {}),
            status: (['pending', 'resolved', 'dismissed'].includes(data.status)
              ? data.status
              : 'pending') as ServiceReport['status'],
            ...(data.adminNotes ? { adminNotes: String(data.adminNotes) } : {}),
            createdAt: data.createdAt ? toIsoString(data.createdAt) : new Date().toISOString()
          } as ServiceReport;
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onData(list);
    },
    (err) => {
      onError?.(err);
    }
  );
}

export async function adminApproveOrRejectService(
  service: ServiceListing,
  decision: 'active' | 'rejected' | 'suspended',
  moderationNotes?: string
): Promise<void> {
  assertCeo();
  await updateDoc(
    doc(db, 'services', service.serviceId),
    stripUndefined({
      status: decision,
      ...(decision !== 'active' ? { featured: false } : {}),
      ...(moderationNotes !== undefined ? { moderationNotes: moderationNotes.slice(0, 500) } : {}),
      updatedAt: serverTimestamp()
    })
  );
  await recordAdminAuditLog({
    action: decision === 'active' ? 'approve' : 'reject',
    contentType: 'services',
    recordId: service.serviceId,
    recordTitle: service.serviceName,
    reason: moderationNotes
  });
}

export async function adminFeatureService(
  service: ServiceListing,
  options: {
    featured: boolean;
    planId?: ServicePromotionPlanId;
    reference?: string;
    durationDays?: number;
  }
): Promise<void> {
  assertCeo();
  const plan = getServicePromoPlan(options.planId || service.promotionPlan || 'weekly');
  const now = new Date();
  const days = options.durationDays || plan.durationDays;
  const expiry = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  if (options.featured) {
    const headers = await getAdminHeaders();
    await safeFetchJson('/api/services/admin/promotions/manual-verify', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        serviceId: service.serviceId,
        serviceName: service.serviceName,
        providerName: service.providerName,
        planId: plan.id,
        reference: options.reference || service.promotionReference,
        amountNaira: plan.priceNaira,
        payerPhone: service.phone
      }),
      timeoutMs: 6000
    }).catch(() => {});

    await updateDoc(
      doc(db, 'services', service.serviceId),
      stripUndefined({
        featured: true,
        status: 'active',
        promotionPlan: plan.id,
        promotionStatus: 'active',
        promotionPrice: plan.priceNaira,
        ...(options.reference ? { promotionReference: options.reference } : {}),
        promotionStartDate: now.toISOString(),
        promotionExpiryDate: expiry.toISOString(),
        updatedAt: serverTimestamp()
      })
    );
  } else {
    await updateDoc(doc(db, 'services', service.serviceId), {
      featured: false,
      promotionStatus: 'none',
      updatedAt: serverTimestamp()
    });
  }

  await recordAdminAuditLog({
    action: 'feature',
    contentType: 'services',
    recordId: service.serviceId,
    recordTitle: `${service.serviceName} (${options.featured ? plan.name : 'Unfeatured'})`
  });
}

export async function adminPurgeExpiredServicePromotions(services: ServiceListing[]): Promise<number> {
  assertCeo();
  const nowMs = Date.now();
  let count = 0;
  for (const srv of services) {
    if (
      srv.featured &&
      srv.promotionExpiryDate &&
      !isNaN(Date.parse(srv.promotionExpiryDate)) &&
      Date.parse(srv.promotionExpiryDate) <= nowMs
    ) {
      await updateDoc(doc(db, 'services', srv.serviceId), {
        featured: false,
        promotionStatus: 'expired',
        updatedAt: serverTimestamp()
      });
      count++;
    }
  }
  if (count > 0) {
    await recordAdminAuditLog({
      action: 'edit',
      contentType: 'services',
      recordId: 'expired_promotions',
      recordTitle: `Cleared ${count} expired service promotion(s)`
    });
  }
  return count;
}

export async function adminSuspendServiceProvider(
  providerId: string,
  providerName: string,
  suspend: boolean,
  reason?: string
): Promise<number> {
  assertCeo();
  const snap = await getDocs(query(collection(db, 'services'), where('providerId', '==', providerId)));
  let updated = 0;
  for (const d of snap.docs) {
    await updateDoc(
      doc(db, 'services', d.id),
      stripUndefined({
        status: suspend ? 'suspended' : 'active',
        ...(suspend ? { featured: false } : {}),
        ...(reason ? { moderationNotes: reason.slice(0, 500) } : {}),
        updatedAt: serverTimestamp()
      })
    );
    updated++;
  }
  // Also mark user doc if present
  try {
    await updateDoc(doc(db, 'users', providerId), {
      isSuspended: suspend,
      ...(reason ? { suspensionReason: reason.slice(0, 300) } : {})
    });
  } catch {
    // Provider may be a guest without a /users doc
  }

  await recordAdminAuditLog({
    action: suspend ? 'reject' : 'approve',
    contentType: 'service_providers',
    recordId: providerId,
    recordTitle: `${providerName} (${updated} service(s))`,
    reason
  });
  return updated;
}

export async function adminSaveServiceCategory(category: {
  id?: string;
  name: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
}): Promise<void> {
  assertCeo();
  const cleanName = category.name.trim().slice(0, 100);
  if (!cleanName) throw new Error('Category name is required.');
  const slug = cleanName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 100);
  const id = (category.id || slug || makeId('scat')).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);

  await setDoc(
    doc(db, 'serviceCategories', id),
    stripUndefined({
      id,
      name: cleanName,
      slug,
      ...(category.description?.trim()
        ? { description: category.description.trim().slice(0, 300) }
        : {}),
      isActive: category.isActive !== false,
      sortOrder: Number(category.sortOrder) || 50,
      updatedAt: new Date().toISOString()
    }),
    { merge: true }
  );

  await recordAdminAuditLog({
    action: 'edit',
    contentType: 'serviceCategories',
    recordId: id,
    recordTitle: cleanName
  });
}

export async function adminDeleteServiceCategory(categoryId: string, name: string): Promise<void> {
  assertCeo();
  // If it's a built-in default category, mark isActive: false so it stays hidden while preserving safety
  const isBuiltIn = DEFAULT_SERVICE_CATEGORIES.some((c) => c.id === categoryId);
  if (isBuiltIn) {
    await setDoc(
      doc(db, 'serviceCategories', categoryId),
      {
        id: categoryId,
        name,
        slug: categoryId,
        isActive: false,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
  } else {
    await deleteDoc(doc(db, 'serviceCategories', categoryId));
  }
  await recordAdminAuditLog({
    action: 'delete',
    contentType: 'serviceCategories',
    recordId: categoryId,
    recordTitle: name
  });
}

export async function adminResolveServiceReport(
  reportId: string,
  status: 'resolved' | 'dismissed',
  adminNotes?: string
): Promise<void> {
  assertCeo();
  await updateDoc(
    doc(db, 'serviceReports', reportId),
    stripUndefined({
      status,
      ...(adminNotes?.trim() ? { adminNotes: adminNotes.trim().slice(0, 500) } : {})
    })
  );
  await recordAdminAuditLog({
    action: status === 'resolved' ? 'approve' : 'reject',
    contentType: 'serviceReports',
    recordId: reportId,
    recordTitle: `Service Report (${status})`,
    reason: adminNotes
  });
}
