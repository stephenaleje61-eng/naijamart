import {
  AccommodationProperty,
  Advertisement,
  GeneralAnnouncementPost,
  Institution,
  Product,
  ServiceListing,
  SportUpdatePost
} from '../types.js';
import {
  DEFAULT_INSTITUTION_ID,
  VERIFIED_NIGERIAN_INSTITUTIONS,
  belongsToInstitution
} from '../constants/institutions.js';
import { isAdCurrentlyLive } from './ads.js';

export type TrendingScope = 'nationwide' | 'institution' | 'state';

export interface TrendingCampusItem {
  id: string;
  entityType: 'product' | 'service' | 'ad' | 'sport' | 'announcement' | 'accommodation';
  title: string;
  subtitle: string;
  imageUrl?: string;
  institutionId: string;
  institutionShortName: string;
  state: string;
  engagementScore: number;
  metricsLabel: string;
  createdAt: string;
  raw: any;
}

function getInstMeta(institutionId: string | undefined, institutions: Institution[]): {
  id: string;
  shortName: string;
  state: string;
} {
  const id = institutionId || DEFAULT_INSTITUTION_ID;
  const found =
    institutions.find((i) => i.id === id) ||
    VERIFIED_NIGERIAN_INSTITUTIONS.find((i) => i.id === id);
  return {
    id,
    shortName: found?.shortName || found?.name || id.toUpperCase(),
    state: found?.state || 'Taraba'
  };
}

/**
 * Computes genuine trending items strictly from real Firestore activity counters
 * (views, likesCount, commentsCount, whatsappClicks, clicks, impressions, savedCount).
 * Zero fabricated or hardcoded scores.
 */
export function computeTrendingAcrossCampuses(params: {
  scope: TrendingScope;
  activeInstitutionId: string;
  activeState?: string;
  institutions: Institution[];
  products: Product[];
  services: ServiceListing[];
  advertisements: Advertisement[];
  sports: SportUpdatePost[];
  announcements: GeneralAnnouncementPost[];
  accommodations?: AccommodationProperty[];
  maxItems?: number;
}): TrendingCampusItem[] {
  const items: TrendingCampusItem[] = [];
  const { institutions, scope, activeInstitutionId, activeState } = params;

  const matchesScope = (itemInstId?: string, itemState?: string, isAllCampuses = false): boolean => {
    if (scope === 'nationwide') return true;
    if (scope === 'institution') {
      return isAllCampuses || belongsToInstitution(itemInstId, activeInstitutionId);
    }
    if (scope === 'state') {
      if (isAllCampuses) return true;
      const meta = getInstMeta(itemInstId, institutions);
      const targetState = (
        activeState ||
        getInstMeta(activeInstitutionId, institutions).state ||
        ''
      ).toLowerCase();
      return Boolean(targetState && (itemState || meta.state).toLowerCase() === targetState);
    }
    return true;
  };

  for (const p of params.products) {
    if (p.status !== 'active') continue;
    const score = (p.views || 0) + (p.whatsappClicks || 0) * 5;
    if (score <= 0) continue;
    const meta = getInstMeta(p.institutionId, institutions);
    if (!matchesScope(p.institutionId, p.state || meta.state)) continue;
    items.push({
      id: `prod:${p.id}`,
      entityType: 'product',
      title: p.title,
      subtitle: `₦${Number(p.price || 0).toLocaleString()} · ${p.shopName || p.sellerName}`,
      imageUrl: p.imageUrl || p.images?.[0],
      institutionId: meta.id,
      institutionShortName: meta.shortName,
      state: p.state || meta.state,
      engagementScore: score,
      metricsLabel: `${p.views || 0} views · ${p.whatsappClicks || 0} WhatsApp`,
      createdAt: p.createdAt,
      raw: p
    });
  }

  for (const svc of params.services) {
    if (svc.status !== 'active') continue;
    const score = (svc.views || 0) + (svc.whatsappClicks || 0) * 5;
    if (score <= 0) continue;
    const meta = getInstMeta(svc.institutionId, institutions);
    if (!matchesScope(svc.institutionId, meta.state)) continue;
    items.push({
      id: `svc:${svc.serviceId}`,
      entityType: 'service',
      title: svc.serviceName,
      subtitle: `₦${Number(svc.price || 0).toLocaleString()} · ${svc.providerName}`,
      imageUrl: svc.images?.[0],
      institutionId: meta.id,
      institutionShortName: meta.shortName,
      state: meta.state,
      engagementScore: score,
      metricsLabel: `${svc.views || 0} views · ${svc.whatsappClicks || 0} inquiries`,
      createdAt: svc.createdAt,
      raw: svc
    });
  }

  for (const ad of params.advertisements) {
    if (!isAdCurrentlyLive(ad)) continue;
    const score = (ad.clicks || 0) * 3 + (ad.whatsappClicks || 0) * 5 + Math.floor((ad.impressions || 0) / 5);
    if (score <= 0) continue;
    const isGlobal = ad.visibilityScope === 'all_institutions';
    const meta = getInstMeta(ad.institutionId, institutions);
    if (!matchesScope(ad.institutionId, meta.state, isGlobal)) continue;
    items.push({
      id: `ad:${ad.id}`,
      entityType: 'ad',
      title: ad.businessName,
      subtitle: ad.title,
      imageUrl: ad.imageUrl || ad.logoUrl,
      institutionId: isGlobal ? 'all' : meta.id,
      institutionShortName: isGlobal ? 'Nationwide' : meta.shortName,
      state: meta.state,
      engagementScore: score,
      metricsLabel: `${ad.impressions || 0} views · ${ad.clicks || 0} clicks`,
      createdAt: ad.createdAt,
      raw: ad
    });
  }

  for (const sp of params.sports) {
    if (sp.status !== 'published') continue;
    const score = (sp.views || 0) + (sp.likesCount || 0) * 3 + (sp.commentsCount || 0) * 2;
    if (score <= 0) continue;
    const meta = getInstMeta(sp.institutionId, institutions);
    if (!matchesScope(sp.institutionId, meta.state)) continue;
    items.push({
      id: `sport:${sp.id}`,
      entityType: 'sport',
      title: sp.title,
      subtitle: `${sp.sportCategory}${sp.score ? ` · ${sp.score}` : ''}`,
      imageUrl: sp.imageUrl,
      institutionId: meta.id,
      institutionShortName: meta.shortName,
      state: meta.state,
      engagementScore: score,
      metricsLabel: `${sp.views || 0} views · ${sp.likesCount || 0} likes`,
      createdAt: sp.createdAt,
      raw: sp
    });
  }

  for (const ann of params.announcements) {
    if (ann.status !== 'published') continue;
    const score = (ann.views || 0) + (ann.likesCount || 0) * 3 + (ann.commentsCount || 0) * 2;
    if (score <= 0) continue;
    const meta = getInstMeta(ann.institutionId, institutions);
    if (!matchesScope(ann.institutionId, meta.state)) continue;
    items.push({
      id: `ann:${ann.id}`,
      entityType: 'announcement',
      title: ann.title,
      subtitle: ann.announcementCategory,
      imageUrl: ann.imageUrl,
      institutionId: meta.id,
      institutionShortName: meta.shortName,
      state: meta.state,
      engagementScore: score,
      metricsLabel: `${ann.views || 0} views · ${ann.likesCount || 0} likes`,
      createdAt: ann.createdAt,
      raw: ann
    });
  }

  for (const acc of params.accommodations || []) {
    if (acc.isAvailable === false) continue;
    const score = (acc.savedCount || 0) * 4;
    if (score <= 0) continue;
    const meta = getInstMeta(acc.institutionId, institutions);
    if (!matchesScope(acc.institutionId, meta.state)) continue;
    items.push({
      id: `acc:${acc.id}`,
      entityType: 'accommodation',
      title: acc.title,
      subtitle: `₦${Number(acc.price || 0).toLocaleString()}/${acc.pricePer} · ${acc.location}`,
      imageUrl: acc.imageUrl || acc.images?.[0],
      institutionId: meta.id,
      institutionShortName: meta.shortName,
      state: meta.state,
      engagementScore: score,
      metricsLabel: `${acc.savedCount || 0} saves`,
      createdAt: acc.createdAt,
      raw: acc
    });
  }

  items.sort((a, b) => {
    if (b.engagementScore !== a.engagementScore) return b.engagementScore - a.engagementScore;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return items.slice(0, params.maxItems || 12);
}
