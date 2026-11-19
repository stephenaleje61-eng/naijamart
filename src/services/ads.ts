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
import {
  DEFAULT_INSTITUTION_ID,
  VERIFIED_NIGERIAN_INSTITUTIONS,
  belongsToInstitution
} from '../constants/institutions.js';
import {
  AdAnalyticsEvent,
  AdPackageId,
  AdPaymentRecord,
  AdPlacement,
  AdStatus,
  AdType,
  AdVisibilityScope,
  Advertisement,
  AdvertisingPackage,
  AdvertisingRequest,
  AdvertisingRequestStatus,
  Institution
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
  'Scholarships & Grants',
  'Tech & Telecoms',
  'Banking & Fintech',
  'Other Business'
] as const;

export const AD_TYPE_OPTIONS: { id: AdType; label: string; badge: string }[] = [
  { id: 'business_ad', label: 'Business Advertisement', badge: 'Business Ad' },
  { id: 'product_ad', label: 'Product Advertisement', badge: 'Product Ad' },
  { id: 'company_promotion', label: 'Company Promotion', badge: 'Company Promo' },
  { id: 'university_announcement', label: 'University Announcement', badge: 'University Notice' },
  { id: 'school_event', label: 'School Event', badge: 'Campus Event' },
  { id: 'scholarship', label: 'Scholarship Opportunity', badge: 'Scholarship' },
  { id: 'job_ad', label: 'Job / Internship', badge: 'Job / Internship' },
  { id: 'hostel_ad', label: 'Hostel / Accommodation', badge: 'Hostel Ad' },
  { id: 'business_opening', label: 'Business Opening', badge: 'Grand Opening' },
  { id: 'special_offer', label: 'Special Offer / Discount', badge: 'Special Offer' },
  { id: 'sponsored_post', label: 'Sponsored Post', badge: 'Sponsored Post' },
  { id: 'public_notice', label: 'Public Notice', badge: 'Public Notice' },
  { id: 'general_promotion', label: 'General Promotion', badge: 'Promoted' }
];

export const AUDIENCE_SCOPE_OPTIONS: { id: AdVisibilityScope; label: string; description: string }[] = [
  {
    id: 'all_institutions',
    label: 'All Nigerian Universities (Nationwide)',
    description: 'Appears across every Nigerian university, polytechnic, and college on the platform.'
  },
  {
    id: 'federal_universities',
    label: 'All Federal Universities',
    description: 'Automatically shown across all Federal Universities in Nigeria.'
  },
  {
    id: 'state_universities',
    label: 'All State Universities',
    description: 'Automatically shown across all State Universities nationwide.'
  },
  {
    id: 'private_universities',
    label: 'All Private Universities',
    description: 'Automatically shown across all Private Universities nationwide.'
  },
  {
    id: 'selected_universities',
    label: 'Selected Universities',
    description: 'Choose multiple specific universities where this ad should display.'
  },
  {
    id: 'selected_campuses',
    label: 'Selected Campuses',
    description: 'Target exact campus locations across one or more universities.'
  },
  {
    id: 'specific_communities',
    label: 'Specific University Communities',
    description: 'Target specific institution student communities & feeds.'
  }
];

export const AD_PLACEMENT_OPTIONS: { id: AdPlacement; label: string; description: string }[] = [
  {
    id: 'homepage_featured',
    label: 'Homepage Featured Sponsored Ads',
    description: 'Prominent featured sponsored carousel/cards on the main homepage.'
  },
  {
    id: 'marketplace_sponsored',
    label: 'Marketplace Sponsored Listings',
    description: 'Sponsored placement inside Marketplace product browsing.'
  },
  {
    id: 'university_homepage',
    label: 'University-Specific Homepage Sections',
    description: 'Spotlight card inside university-filtered homepage views.'
  },
  {
    id: 'campus_announcements',
    label: 'Campus Announcements & Events',
    description: 'Appears in the Campus Events & Announcements section.'
  },
  {
    id: 'category_feed',
    label: 'Product Category Views',
    description: 'Displayed when students browse a selected product category.'
  },
  {
    id: 'community_feed',
    label: 'Student Community Feeds',
    description: 'Native sponsored card inside the Nationwide Student Community Hub.'
  }
];

export function getAdTypeLabel(adType?: AdType): string {
  return AD_TYPE_OPTIONS.find((item) => item.id === adType)?.badge || 'Sponsored';
}

export function getAudienceScopeLabel(scope?: AdVisibilityScope): string {
  if (!scope || scope === 'specific_institution') return 'Selected University';
  return AUDIENCE_SCOPE_OPTIONS.find((item) => item.id === scope)?.label || 'Nationwide';
}

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

const VALID_VISIBILITY_SCOPES: AdVisibilityScope[] = [
  'all_institutions',
  'federal_universities',
  'state_universities',
  'private_universities',
  'selected_universities',
  'selected_campuses',
  'specific_institution',
  'specific_communities'
];

const VALID_PLACEMENTS: AdPlacement[] = [
  'homepage_featured',
  'marketplace_sponsored',
  'university_homepage',
  'campus_announcements',
  'category_feed',
  'community_feed',
  'ads_section',
  'homepage_hero',
  'institution_spotlight'
];

const VALID_AD_TYPES: AdType[] = [
  'business_ad',
  'product_ad',
  'company_promotion',
  'university_announcement',
  'school_event',
  'scholarship',
  'job_ad',
  'hostel_ad',
  'business_opening',
  'special_offer',
  'sponsored_post',
  'public_notice',
  'general_promotion'
];

export function sanitizeAdDoc(id: string, data: any): Advertisement {
  const pkg = getPackageById(String(data?.packageId || 'basic'));
  const rawScope = String(data?.visibilityScope || 'all_institutions') as AdVisibilityScope;
  const visibilityScope: AdVisibilityScope = VALID_VISIBILITY_SCOPES.includes(rawScope)
    ? rawScope
    : 'all_institutions';
  const rawPlacement = String(data?.placement || 'homepage_featured') as AdPlacement;
  const placement: AdPlacement = VALID_PLACEMENTS.includes(rawPlacement)
    ? rawPlacement
    : 'homepage_featured';
  const rawAdType = String(data?.adType || 'business_ad') as AdType;
  const adType: AdType = VALID_AD_TYPES.includes(rawAdType) ? rawAdType : 'business_ad';

  const targetInstitutionIds = Array.isArray(data?.targetInstitutionIds)
    ? data.targetInstitutionIds.map((x: any) => String(x || '').trim()).filter(Boolean)
    : undefined;
  const targetCampuses = Array.isArray(data?.targetCampuses)
    ? data.targetCampuses.map((x: any) => String(x || '').trim()).filter(Boolean)
    : undefined;
  const targetPlacements = Array.isArray(data?.targetPlacements)
    ? data.targetPlacements
        .map((x: any) => String(x || '').trim() as AdPlacement)
        .filter((p: AdPlacement) => VALID_PLACEMENTS.includes(p))
    : undefined;

  const images = Array.isArray(data?.images)
    ? data.images.map((x: any) => String(x || '').trim()).filter(Boolean)
    : undefined;
  const primaryImage = String(data?.imageUrl || (images && images[0]) || '').trim();
  const institutionId =
    visibilityScope === 'specific_institution'
      ? String(data?.institutionId || DEFAULT_INSTITUTION_ID)
      : data?.institutionId
      ? String(data.institutionId)
      : undefined;

  return {
    id: String(data?.id || id),
    businessName: String(data?.businessName || '').trim(),
    ownerName: String(data?.ownerName || '').trim(),
    phone: String(data?.phone || '').trim(),
    whatsappNumber: String(data?.whatsappNumber || '').trim(),
    businessCategory: String(data?.businessCategory || 'Other Business').trim(),
    adType,
    title: String(data?.title || '').trim(),
    description: String(data?.description || '').trim(),
    imageUrl: primaryImage,
    ...(images && images.length > 0 ? { images } : {}),
    ...(data?.logoUrl ? { logoUrl: String(data.logoUrl).trim() } : {}),
    ...(data?.videoUrl ? { videoUrl: String(data.videoUrl).trim() } : {}),
    location: String(data?.location || '').trim(),
    ...(institutionId ? { institutionId } : {}),
    ...(data?.campus ? { campus: String(data.campus).trim() } : {}),
    ...(targetInstitutionIds && targetInstitutionIds.length > 0 ? { targetInstitutionIds } : {}),
    ...(targetCampuses && targetCampuses.length > 0 ? { targetCampuses } : {}),
    placement,
    ...(targetPlacements && targetPlacements.length > 0 ? { targetPlacements } : {}),
    ...(data?.targetCategoryId ? { targetCategoryId: String(data.targetCategoryId).trim() } : {}),
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
    ...(data?.sourceRequestId ? { sourceRequestId: String(data.sourceRequestId) } : {}),
    status: (
      ['pending_approval', 'active', 'paused', 'unpublished', 'rejected', 'expired'].includes(
        data?.status
      )
        ? data.status
        : 'pending_approval'
    ) as AdStatus,
    paymentStatus: (
      ['unpaid', 'pending_verification', 'paid', 'failed'].includes(data?.paymentStatus)
        ? data.paymentStatus
        : 'unpaid'
    ) as Advertisement['paymentStatus'],
    ...(data?.paymentReference ? { paymentReference: String(data.paymentReference) } : {}),
    isFeatured: Boolean(data?.isFeatured),
    isPinned: Boolean(data?.isPinned),
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

function normalizePlacementAlias(p?: AdPlacement): AdPlacement {
  if (!p || p === 'ads_section' || p === 'homepage_hero') return 'homepage_featured';
  if (p === 'institution_spotlight') return 'university_homepage';
  return p;
}

export function adMatchesPlacement(ad: Advertisement, placement?: AdPlacement): boolean {
  if (!placement) return true;
  const normalizedTarget = normalizePlacementAlias(placement);
  const configuredList =
    ad.targetPlacements && ad.targetPlacements.length > 0
      ? ad.targetPlacements
      : [ad.placement || 'homepage_featured'];
  return configuredList.some((p) => {
    const norm = normalizePlacementAlias(p);
    return p === placement || norm === normalizedTarget;
  });
}

export function adMatchesAudience(
  ad: Advertisement,
  options?: {
    institutionId?: string;
    campus?: string;
    institutions?: Institution[];
  }
): boolean {
  const scope = ad.visibilityScope || 'all_institutions';
  const institutionId = options?.institutionId || 'all';
  const campus = options?.campus || 'all';
  const institutionList = options?.institutions || VERIFIED_NIGERIAN_INSTITUTIONS;

  if (scope === 'all_institutions') {
    return true;
  }

  // National or "all" campus browse view shows nationwide & university-group campaigns
  if (!institutionId || institutionId === 'all') {
    return true;
  }

  const activeInst = institutionList.find((i) => i.id === institutionId);

  if (scope === 'federal_universities') {
    return activeInst?.type === 'Federal University';
  }
  if (scope === 'state_universities') {
    return activeInst?.type === 'State University';
  }
  if (scope === 'private_universities') {
    return activeInst?.type === 'Private University';
  }
  if (scope === 'selected_universities' || scope === 'specific_communities') {
    const targets =
      ad.targetInstitutionIds && ad.targetInstitutionIds.length > 0
        ? ad.targetInstitutionIds
        : ad.institutionId
        ? [ad.institutionId]
        : [];
    return targets.some((targetId) => belongsToInstitution(targetId, institutionId));
  }
  if (scope === 'selected_campuses') {
    const campusTargets = ad.targetCampuses || [];
    if (campusTargets.length > 0) {
      if (campus && campus !== 'all') {
        const expectedKey = `${institutionId}::${campus}`.toLowerCase();
        const exactMatch = campusTargets.some(
          (entry) =>
            entry.toLowerCase() === expectedKey ||
            entry.toLowerCase() === campus.toLowerCase()
        );
        if (exactMatch) return true;
      }
      return campusTargets.some((entry) =>
        entry.toLowerCase().startsWith(`${institutionId.toLowerCase()}::`)
      );
    }
    if (ad.targetInstitutionIds && ad.targetInstitutionIds.length > 0) {
      return ad.targetInstitutionIds.some((tid) => belongsToInstitution(tid, institutionId));
    }
    return belongsToInstitution(ad.institutionId, institutionId);
  }

  // Legacy 'specific_institution'
  const instMatch = belongsToInstitution(ad.institutionId, institutionId);
  if (!instMatch) return false;
  if (ad.campus && campus && campus !== 'all') {
    return ad.campus.toLowerCase() === campus.toLowerCase();
  }
  return true;
}

export function filterAdsForAudience(
  ads: Advertisement[],
  options?: {
    institutionId?: string;
    campus?: string;
    institutions?: Institution[];
    placement?: AdPlacement;
    categoryId?: string;
    nowMs?: number;
  }
): Advertisement[] {
  const nowMs = options?.nowMs ?? Date.now();
  const filtered = ads.filter((ad) => {
    if (!isAdCurrentlyLive(ad, nowMs)) return false;
    if (!adMatchesAudience(ad, options)) return false;
    if (options?.placement && !adMatchesPlacement(ad, options.placement)) return false;
    if (options?.categoryId && options.categoryId !== 'all') {
      if (ad.targetCategoryId && ad.targetCategoryId !== 'all') {
        const matchCat =
          ad.targetCategoryId.toLowerCase() === options.categoryId.toLowerCase() ||
          ad.businessCategory.toLowerCase() === options.categoryId.toLowerCase();
        if (!matchCat) return false;
      }
    }
    return true;
  });
  return sortActivePublicAds(filtered);
}

export function filterAdsForInstitution(
  ads: Advertisement[],
  institutionId?: string
): Advertisement[] {
  return filterAdsForAudience(ads, { institutionId });
}

export function isAdExpired(ad: Advertisement, nowMs = Date.now()): boolean {
  if (ad.status === 'expired') return true;
  if (ad.expiryDate) {
    const expTs = Date.parse(ad.expiryDate);
    if (!isNaN(expTs) && expTs <= nowMs) return true;
  }
  return false;
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
  return Boolean(ad.businessName && ad.title && (ad.imageUrl || (ad.images && ad.images.length > 0)));
}

function sortActivePublicAds(list: Advertisement[]): Advertisement[] {
  const tierWeight = (ad: Advertisement): number => {
    let score = 0;
    if (ad.isPinned) score += 10;
    if (ad.isFeatured || ad.packageId === 'featured') score += 3;
    else if (ad.packageId === 'premium') score += 2;
    else score += 1;
    return score;
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
  adType?: AdType;
  title: string;
  description: string;
  imageUrl: string;
  images?: string[];
  logoUrl?: string;
  videoUrl?: string;
  location: string;
  packageId: AdPackageId;
  websiteOrSocialLink?: string;
  institutionId?: string;
  campus?: string;
  targetInstitutionIds?: string[];
  targetCampuses?: string[];
  placement?: AdPlacement;
  targetPlacements?: AdPlacement[];
  targetCategoryId?: string;
  visibilityScope?: AdVisibilityScope;
  sourceRequestId?: string;
}

export async function submitAdvertisement(input: SubmitAdvertisementInput): Promise<Advertisement> {
  if (!isFirebaseCeoVerified()) {
    throw new Error(
      `Only the NIGERIA CAMPUS MARKET CEO (${CEO_EMAIL}) can publish official advertisements. Submit an Advertising Request or contact CEO on WhatsApp (${CEO_ADS_PHONE}).`
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
  status?: 'active' | 'paused' | 'unpublished';
  isFeatured?: boolean;
  isPinned?: boolean;
  startDate?: string;
  expiryDate?: string;
  adminNotes?: string;
  paymentReference?: string;
}

export async function ceoCreateOfficialAd(input: CeoOfficialAdInput): Promise<Advertisement> {
  assertCeoSignedIn();
  if (!input.businessName.trim()) throw new Error('Business or Organization name is required.');
  if (!input.title.trim()) throw new Error('Advertisement title is required.');
  if (!input.description.trim()) throw new Error('Advertisement description is required.');
  const cleanImages = (input.images || []).map((u) => u.trim()).filter(Boolean).slice(0, 8);
  const primaryImage = (input.imageUrl || cleanImages[0] || '').trim();
  if (!primaryImage) throw new Error('At least one advertisement banner/image is required.');
  const cleanLocation = (input.location || '').trim() || 'Nationwide (All Nigerian Campuses)';

  const pkg = getPackageById(input.packageId || 'basic');
  const durationDays = Math.max(1, Number(input.durationDays) || pkg.durationDays);
  const visibilityScope: AdVisibilityScope = VALID_VISIBILITY_SCOPES.includes(
    input.visibilityScope as AdVisibilityScope
  )
    ? (input.visibilityScope as AdVisibilityScope)
    : 'all_institutions';
  const targetPlacements =
    input.targetPlacements && input.targetPlacements.length > 0
      ? input.targetPlacements
      : [input.placement || 'homepage_featured'];
  const placement: AdPlacement = targetPlacements[0] || input.placement || 'homepage_featured';
  const targetInstitutionIds = (input.targetInstitutionIds || []).filter(Boolean);
  const targetCampuses = (input.targetCampuses || []).filter(Boolean);
  const institutionId =
    visibilityScope === 'specific_institution'
      ? (input.institutionId || DEFAULT_INSTITUTION_ID).trim()
      : visibilityScope === 'selected_universities' || visibilityScope === 'specific_communities'
      ? targetInstitutionIds[0] || input.institutionId || undefined
      : undefined;

  const adId = makeDocId('ad');
  const now = new Date();
  const nowIso = now.toISOString();
  const startIso = input.startDate ? toIsoString(input.startDate) : nowIso;
  const expiryIso = input.expiryDate
    ? toIsoString(input.expiryDate)
    : new Date(Date.parse(startIso) + durationDays * 24 * 60 * 60 * 1000).toISOString();
  const ceoEmail = auth.currentUser?.email || CEO_EMAIL;
  const normalizedImages = Array.from(new Set([primaryImage, ...cleanImages])).slice(0, 8);

  const firestorePayload: Record<string, any> = stripUndefined({
    id: adId,
    businessName: input.businessName.trim().slice(0, 140),
    ownerName: (input.ownerName.trim() || input.businessName.trim() || 'Official Advertiser').slice(0, 120),
    phone: (input.phone.trim() || CEO_ADS_PHONE).slice(0, 40),
    whatsappNumber: (input.whatsappNumber.trim() || input.phone.trim() || CEO_ADS_PHONE).slice(0, 40),
    businessCategory: (input.businessCategory.trim() || 'Other Business').slice(0, 80),
    adType: input.adType || 'business_ad',
    title: input.title.trim().slice(0, 180),
    description: input.description.trim().slice(0, 4000),
    imageUrl: primaryImage,
    images: normalizedImages,
    ...(input.logoUrl?.trim() ? { logoUrl: input.logoUrl.trim() } : {}),
    ...(input.videoUrl?.trim() ? { videoUrl: input.videoUrl.trim().slice(0, 600) } : {}),
    location: cleanLocation.slice(0, 180),
    ...(institutionId ? { institutionId } : {}),
    ...(input.campus?.trim() ? { campus: input.campus.trim().slice(0, 120) } : {}),
    ...(targetInstitutionIds.length > 0 ? { targetInstitutionIds } : {}),
    ...(targetCampuses.length > 0 ? { targetCampuses } : {}),
    placement,
    targetPlacements,
    ...(input.targetCategoryId?.trim() && input.targetCategoryId !== 'all'
      ? { targetCategoryId: input.targetCategoryId.trim().slice(0, 100) }
      : {}),
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
    ...(input.sourceRequestId ? { sourceRequestId: input.sourceRequestId } : {}),
    status:
      input.status === 'paused' || input.status === 'unpublished' ? input.status : 'active',
    paymentStatus: 'paid',
    paymentReference: input.paymentReference?.trim() || `CEO_OFFICIAL_${Date.now()}`,
    isFeatured: input.isFeatured ?? pkg.id === 'featured',
    isPinned: Boolean(input.isPinned),
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
      reason: `Admin created ${firestorePayload.adType} (${visibilityScope}, ${targetPlacements.join(', ')})`
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
  const visibilityScope: AdVisibilityScope = updates.visibilityScope || ad.visibilityScope || 'all_institutions';
  const cleanImages =
    updates.images !== undefined
      ? Array.from(
          new Set(
            [updates.imageUrl || ad.imageUrl, ...updates.images].map((u) => String(u || '').trim()).filter(Boolean)
          )
        ).slice(0, 8)
      : undefined;

  const targetPlacements =
    updates.targetPlacements && updates.targetPlacements.length > 0
      ? updates.targetPlacements
      : updates.placement
      ? [updates.placement]
      : undefined;

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
    ...(updates.adType !== undefined ? { adType: updates.adType } : {}),
    ...(updates.title !== undefined ? { title: updates.title.trim().slice(0, 180) } : {}),
    ...(updates.description !== undefined
      ? { description: updates.description.trim().slice(0, 4000) }
      : {}),
    ...(updates.imageUrl !== undefined ? { imageUrl: updates.imageUrl.trim() } : {}),
    ...(cleanImages !== undefined ? { images: cleanImages } : {}),
    ...(updates.logoUrl !== undefined ? { logoUrl: updates.logoUrl.trim() || '' } : {}),
    ...(updates.videoUrl !== undefined ? { videoUrl: updates.videoUrl.trim().slice(0, 600) } : {}),
    ...(updates.location !== undefined ? { location: updates.location.trim().slice(0, 180) } : {}),
    ...(targetPlacements ? { placement: targetPlacements[0], targetPlacements } : {}),
    ...(updates.targetCategoryId !== undefined
      ? { targetCategoryId: updates.targetCategoryId.trim().slice(0, 100) }
      : {}),
    visibilityScope,
    ...(updates.targetInstitutionIds !== undefined
      ? { targetInstitutionIds: updates.targetInstitutionIds.filter(Boolean) }
      : {}),
    ...(updates.targetCampuses !== undefined
      ? { targetCampuses: updates.targetCampuses.filter(Boolean) }
      : {}),
    institutionId:
      visibilityScope === 'all_institutions' ||
      visibilityScope === 'federal_universities' ||
      visibilityScope === 'state_universities' ||
      visibilityScope === 'private_universities'
        ? ''
        : (
            updates.institutionId ||
            updates.targetInstitutionIds?.[0] ||
            ad.institutionId ||
            DEFAULT_INSTITUTION_ID
          ).trim(),
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
    ...(updates.isPinned !== undefined ? { isPinned: Boolean(updates.isPinned) } : {}),
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
    recordTitle: `${updates.businessName || ad.businessName} - ${updates.title || ad.title}`
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

// ============================================================================
// PUBLIC ADVERTISING REQUEST INBOX & CONVERSION WORKFLOW
// ============================================================================
export function sanitizeAdvertisingRequestDoc(id: string, data: any): AdvertisingRequest {
  const status: AdvertisingRequestStatus = ['pending', 'approved', 'rejected', 'converted'].includes(
    data?.status
  )
    ? data.status
    : 'pending';
  return {
    id: String(data?.id || id),
    advertiserName: String(data?.advertiserName || '').trim(),
    businessName: String(data?.businessName || '').trim(),
    phone: String(data?.phone || '').trim(),
    ...(data?.whatsappNumber ? { whatsappNumber: String(data.whatsappNumber).trim() } : {}),
    ...(data?.email ? { email: String(data.email).trim() } : {}),
    category: String(data?.category || 'Other Business').trim(),
    ...(data?.adType ? { adType: data.adType as AdType } : {}),
    message: String(data?.message || '').trim(),
    ...(data?.targetAudience ? { targetAudience: data.targetAudience as AdVisibilityScope } : {}),
    ...(data?.targetInstitutionId ? { targetInstitutionId: String(data.targetInstitutionId) } : {}),
    ...(data?.preferredPackageId ? { preferredPackageId: data.preferredPackageId as AdPackageId } : {}),
    attachments: Array.isArray(data?.attachments)
      ? data.attachments.map((a: any) => String(a || '').trim()).filter(Boolean)
      : [],
    ...(data?.ownerUid ? { ownerUid: String(data.ownerUid) } : {}),
    status,
    ...(data?.adminReply ? { adminReply: String(data.adminReply) } : {}),
    ...(data?.adminNotes ? { adminNotes: String(data.adminNotes) } : {}),
    ...(data?.repliedAt ? { repliedAt: toIsoString(data.repliedAt) } : {}),
    ...(data?.convertedAdId ? { convertedAdId: String(data.convertedAdId) } : {}),
    createdAt: data?.createdAt ? toIsoString(data.createdAt) : new Date().toISOString(),
    updatedAt: data?.updatedAt ? toIsoString(data.updatedAt) : new Date().toISOString()
  };
}

export interface SubmitAdvertisingRequestInput {
  advertiserName: string;
  businessName: string;
  phone: string;
  whatsappNumber?: string;
  email?: string;
  category: string;
  adType?: AdType;
  message: string;
  targetAudience?: AdVisibilityScope;
  targetInstitutionId?: string;
  preferredPackageId?: AdPackageId;
  attachments?: string[];
}

export async function submitAdvertisingRequest(
  input: SubmitAdvertisingRequestInput
): Promise<AdvertisingRequest> {
  if (!input.advertiserName.trim()) throw new Error('Your full name is required.');
  if (!input.businessName.trim()) throw new Error('Business or organization name is required.');
  if (!input.phone.trim() || input.phone.trim().length < 5) {
    throw new Error('Valid phone number is required.');
  }
  if (!input.message.trim()) throw new Error('Please describe your advertisement or promotion.');

  const requestId = makeDocId('adreq');
  const nowIso = new Date().toISOString();
  const cleanAttachments = (input.attachments || []).map((a) => a.trim()).filter(Boolean).slice(0, 6);

  const payload = stripUndefined({
    id: requestId,
    advertiserName: input.advertiserName.trim().slice(0, 120),
    businessName: input.businessName.trim().slice(0, 140),
    phone: input.phone.trim().slice(0, 40),
    ...(input.whatsappNumber?.trim()
      ? { whatsappNumber: input.whatsappNumber.trim().slice(0, 40) }
      : {}),
    ...(input.email?.trim() ? { email: input.email.trim().slice(0, 160) } : {}),
    category: (input.category.trim() || 'Other Business').slice(0, 80),
    ...(input.adType ? { adType: input.adType } : {}),
    message: input.message.trim().slice(0, 4000),
    ...(input.targetAudience ? { targetAudience: input.targetAudience } : {}),
    ...(input.targetInstitutionId?.trim()
      ? { targetInstitutionId: input.targetInstitutionId.trim().slice(0, 128) }
      : {}),
    ...(input.preferredPackageId ? { preferredPackageId: input.preferredPackageId } : {}),
    ...(cleanAttachments.length > 0 ? { attachments: cleanAttachments } : {}),
    ...(auth.currentUser?.uid ? { ownerUid: auth.currentUser.uid } : {}),
    status: 'pending' as const,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  try {
    await setDoc(doc(db, 'advertisingRequests', requestId), payload);

    // Best-effort notification to Super Admin Inbox
    const notifId = makeDocId('notif');
    await setDoc(doc(db, 'notifications', notifId), {
      id: notifId,
      userId: 'ceo_admin',
      type: 'advertising_request',
      title: `New Ad Request: ${payload.businessName}`.slice(0, 160),
      body: `${payload.advertiserName} (${payload.phone}) submitted a ${payload.category} advertising request.`.slice(
        0,
        500
      ),
      link: '/admin',
      read: false,
      createdAt: nowIso
    }).catch(() => {});

    return sanitizeAdvertisingRequestDoc(requestId, {
      ...payload,
      createdAt: nowIso,
      updatedAt: nowIso
    });
  } catch (err: any) {
    if (String(err?.code || '') === 'permission-denied') {
      handleFirestoreError(err, OperationType.CREATE, `advertisingRequests/${requestId}`);
    }
    throw err;
  }
}

export async function fetchAdvertisingRequestsForAdmin(): Promise<AdvertisingRequest[]> {
  assertCeoSignedIn();
  const snap = await getDocs(collection(db, 'advertisingRequests'));
  return snap.docs
    .map((d) => sanitizeAdvertisingRequestDoc(d.id, d.data()))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function subscribeToAdvertisingRequests(
  onData: (requests: AdvertisingRequest[]) => void,
  onError?: (err: Error) => void
): () => void {
  if (!isFirebaseCeoVerified()) {
    onData([]);
    return () => {};
  }
  return onSnapshot(
    collection(db, 'advertisingRequests'),
    (snap) => {
      const list = snap.docs
        .map((d) => sanitizeAdvertisingRequestDoc(d.id, d.data()))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onData(list);
    },
    (err) => {
      onError?.(err);
    }
  );
}

export async function adminUpdateAdRequestStatus(
  requestId: string,
  updates: {
    status?: AdvertisingRequestStatus;
    adminReply?: string;
    adminNotes?: string;
    convertedAdId?: string;
  }
): Promise<void> {
  assertCeoSignedIn();
  const nowIso = new Date().toISOString();
  const payload = stripUndefined({
    ...(updates.status ? { status: updates.status } : {}),
    ...(updates.adminReply !== undefined
      ? {
          adminReply: updates.adminReply.trim().slice(0, 2000),
          repliedAt: nowIso
        }
      : {}),
    ...(updates.adminNotes !== undefined
      ? { adminNotes: updates.adminNotes.trim().slice(0, 1000) }
      : {}),
    ...(updates.convertedAdId ? { convertedAdId: updates.convertedAdId } : {}),
    updatedAt: serverTimestamp()
  });

  await updateDoc(doc(db, 'advertisingRequests', requestId), payload);
  await recordAdminAuditLog({
    action: updates.status === 'rejected' ? 'reject' : 'edit',
    contentType: 'advertisingRequests',
    recordId: requestId,
    reason: `Updated request status to ${updates.status || 'updated'}`
  });
}

export async function adminDeleteAdRequest(requestId: string, businessName?: string): Promise<void> {
  assertCeoSignedIn();
  await deleteDoc(doc(db, 'advertisingRequests', requestId));
  await recordAdminAuditLog({
    action: 'permanent_delete',
    contentType: 'advertisingRequests',
    recordId: requestId,
    recordTitle: businessName || requestId,
    reason: 'Deleted advertising request from Admin Inbox'
  });
}

export async function adminConvertRequestToAd(
  req: AdvertisingRequest,
  overrides?: Partial<CeoOfficialAdInput>
): Promise<Advertisement> {
  assertCeoSignedIn();
  const imageFromReq = req.attachments?.[0] || overrides?.imageUrl || '';
  if (!imageFromReq) {
    throw new Error('Provide or upload a banner image before publishing this request as an advertisement.');
  }
  const ad = await ceoCreateOfficialAd({
    businessName: overrides?.businessName || req.businessName,
    ownerName: overrides?.ownerName || req.advertiserName,
    phone: overrides?.phone || req.phone,
    whatsappNumber: overrides?.whatsappNumber || req.whatsappNumber || req.phone,
    businessCategory: overrides?.businessCategory || req.category,
    adType: overrides?.adType || req.adType || 'business_ad',
    title: overrides?.title || `${req.businessName} — Featured Promotion`,
    description: overrides?.description || req.message,
    imageUrl: imageFromReq,
    images: overrides?.images || req.attachments || [imageFromReq],
    logoUrl: overrides?.logoUrl,
    videoUrl: overrides?.videoUrl,
    location: overrides?.location || 'All Nigerian Universities',
    packageId: overrides?.packageId || req.preferredPackageId || 'featured',
    visibilityScope: overrides?.visibilityScope || req.targetAudience || 'all_institutions',
    institutionId: overrides?.institutionId || req.targetInstitutionId,
    targetInstitutionIds: overrides?.targetInstitutionIds,
    targetCampuses: overrides?.targetCampuses,
    targetPlacements: overrides?.targetPlacements || ['homepage_featured', 'marketplace_sponsored'],
    targetCategoryId: overrides?.targetCategoryId,
    durationDays: overrides?.durationDays,
    status: overrides?.status || 'active',
    isFeatured: overrides?.isFeatured,
    isPinned: overrides?.isPinned,
    startDate: overrides?.startDate,
    expiryDate: overrides?.expiryDate,
    sourceRequestId: req.id
  });

  await adminUpdateAdRequestStatus(req.id, {
    status: 'converted',
    convertedAdId: ad.id,
    adminNotes: `Converted to published ad (${ad.id})`
  });

  return ad;
}

export interface AdAnalyticsSummary {
  total: number;
  active: number;
  pending: number;
  unpublished: number;
  paused: number;
  expired: number;
  totalImpressions: number;
  totalClicks: number;
  totalWhatsappClicks: number;
  topViewedAds: Advertisement[];
  topBusinesses: { businessName: string; adsCount: number; impressions: number; clicks: number }[];
}

export function computeAdAnalyticsSummary(
  ads: Advertisement[],
  requests: AdvertisingRequest[] = [],
  nowMs = Date.now()
): AdAnalyticsSummary {
  const nonDeleted = ads.filter((a) => !a.isDeleted);
  let active = 0;
  let unpublished = 0;
  let paused = 0;
  let expired = 0;
  let totalImpressions = 0;
  let totalClicks = 0;
  let totalWhatsappClicks = 0;

  const businessMap = new Map<
    string,
    { businessName: string; adsCount: number; impressions: number; clicks: number }
  >();

  for (const ad of nonDeleted) {
    totalImpressions += ad.impressions || 0;
    totalClicks += ad.clicks || 0;
    totalWhatsappClicks += ad.whatsappClicks || 0;

    if (isAdExpired(ad, nowMs)) {
      expired += 1;
    } else if (ad.status === 'active' && ad.paymentStatus === 'paid') {
      active += 1;
    } else if (ad.status === 'unpublished') {
      unpublished += 1;
    } else if (ad.status === 'paused') {
      paused += 1;
    }

    const key = ad.businessName.trim() || 'Advertiser';
    const existing = businessMap.get(key) || {
      businessName: key,
      adsCount: 0,
      impressions: 0,
      clicks: 0
    };
    existing.adsCount += 1;
    existing.impressions += ad.impressions || 0;
    existing.clicks += (ad.clicks || 0) + (ad.whatsappClicks || 0);
    businessMap.set(key, existing);
  }

  const pending = requests.filter((r) => r.status === 'pending').length;

  const topViewedAds = [...nonDeleted]
    .sort((a, b) => (b.impressions || 0) - (a.impressions || 0))
    .slice(0, 6);

  const topBusinesses = Array.from(businessMap.values())
    .sort((a, b) => b.impressions + b.clicks * 3 - (a.impressions + a.clicks * 3))
    .slice(0, 6);

  return {
    total: nonDeleted.length,
    active,
    pending,
    unpublished,
    paused,
    expired,
    totalImpressions,
    totalClicks,
    totalWhatsappClicks,
    topViewedAds,
    topBusinesses
  };
}
