import { collection, getDocs, limit, query } from 'firebase/firestore';
import {
  AccommodationProperty,
  Advertisement,
  CampusEvent,
  GeneralAnnouncementPost,
  HouseAgentProfile,
  Institution,
  NationalSearchFilters,
  NationalSearchResult,
  Product,
  ServiceListing,
  SportUpdatePost,
  StudentRequest
} from '../types.js';
import {
  DEFAULT_INSTITUTION_ID,
  VERIFIED_NIGERIAN_INSTITUTIONS,
  belongsToInstitution
} from '../constants/institutions.js';
import { db, toIsoString } from './firebase.js';
import { sanitizeAdDoc, isAdCurrentlyLive } from './ads.js';
import { sanitizeServiceDoc } from './servicesMarketplace.js';

export interface SearchableCollections {
  products?: Product[];
  accommodations?: AccommodationProperty[];
  houseAgents?: HouseAgentProfile[];
  advertisements?: Advertisement[];
  sports?: SportUpdatePost[];
  announcements?: GeneralAnnouncementPost[];
  events?: CampusEvent[];
  services?: ServiceListing[];
  studentRequests?: StudentRequest[];
  institutions?: Institution[];
}

function resolveInstitutionMeta(
  institutionId: string | undefined,
  institutions: Institution[]
): { id: string; name: string; type: Institution['type']; state: string } {
  const cleanId = institutionId || DEFAULT_INSTITUTION_ID;
  const match =
    institutions.find((i) => i.id === cleanId) ||
    VERIFIED_NIGERIAN_INSTITUTIONS.find((i) => i.id === cleanId);
  return {
    id: cleanId,
    name: match?.shortName || match?.name || cleanId.toUpperCase(),
    type: match?.type || 'Federal University',
    state: match?.state || ''
  };
}

function matchesDateFilter(createdAt: string, windowType: NationalSearchFilters['datePosted']): boolean {
  if (!windowType || windowType === 'all') return true;
  const ts = Date.parse(createdAt);
  if (isNaN(ts)) return false;
  const ageMs = Date.now() - ts;
  if (windowType === '24h') return ageMs <= 24 * 60 * 60 * 1000;
  if (windowType === '7d') return ageMs <= 7 * 24 * 60 * 60 * 1000;
  if (windowType === '30d') return ageMs <= 30 * 24 * 60 * 60 * 1000;
  return true;
}

function computeTextRelevance(q: string, title: string, desc: string, extra: string): number {
  const queryLower = q.trim().toLowerCase();
  if (!queryLower) return 1;
  const t = title.toLowerCase();
  const d = desc.toLowerCase();
  const e = extra.toLowerCase();

  let score = 0;
  if (t.includes(queryLower)) score += 10;
  if (t.startsWith(queryLower)) score += 6;
  if (e.includes(queryLower)) score += 4;
  if (d.includes(queryLower)) score += 3;

  const words = queryLower.split(/\s+/).filter((w) => w.length > 1);
  for (const w of words) {
    if (t.includes(w)) score += 3;
    if (e.includes(w)) score += 2;
    if (d.includes(w)) score += 1;
  }
  return score;
}

export async function fetchMissingNationwideCollections(
  existing: SearchableCollections
): Promise<SearchableCollections> {
  const out: SearchableCollections = { ...existing };
  const tasks: Promise<void>[] = [];

  if (!out.studentRequests) {
    tasks.push(
      getDocs(query(collection(db, 'studentRequests'), limit(120)))
        .then((snap) => {
          out.studentRequests = snap.docs.map((d) => {
            const data = d.data() || {};
            return {
              id: d.id,
              title: String(data.title || ''),
              description: String(data.description || ''),
              budget: Number(data.budget) || 0,
              location: String(data.location || ''),
              institutionId: data.institutionId ? String(data.institutionId) : DEFAULT_INSTITUTION_ID,
              campus: data.campus ? String(data.campus) : undefined,
              phone: String(data.phone || ''),
              whatsapp: data.whatsapp ? String(data.whatsapp) : undefined,
              imageUrl: data.imageUrl ? String(data.imageUrl) : undefined,
              userId: String(data.userId || ''),
              userName: String(data.userName || 'Student'),
              status: data.status === 'fulfilled' ? 'fulfilled' : 'open',
              createdAt: data.createdAt ? toIsoString(data.createdAt) : new Date().toISOString()
            };
          });
        })
        .catch(() => {
          out.studentRequests = [];
        })
    );
  }

  if (!out.accommodations) {
    tasks.push(
      Promise.all([
        getDocs(query(collection(db, 'accommodation'), limit(100))).catch(() => null),
        getDocs(query(collection(db, 'hux'), limit(100))).catch(() => null)
      ]).then(([accSnap, huxSnap]) => {
        const list: AccommodationProperty[] = [];
        const seen = new Set<string>();
        for (const snap of [accSnap, huxSnap]) {
          for (const d of snap?.docs || []) {
            if (seen.has(d.id)) continue;
            seen.add(d.id);
            const data = d.data() || {};
            list.push({
              id: d.id,
              category: data.category === 'roommate' ? 'roommate' : 'rent',
              title: String(data.title || 'Accommodation'),
              location: String(data.location || ''),
              institutionId: String(data.institutionId || DEFAULT_INSTITUTION_ID),
              campus: data.campus ? String(data.campus) : undefined,
              price: Number(data.price) || 0,
              pricePer: data.pricePer || 'year',
              phone: String(data.phone || ''),
              whatsapp: String(data.whatsapp || data.phone || ''),
              images: Array.isArray(data.images) ? data.images : [],
              imageUrl: String(data.imageUrl || (Array.isArray(data.images) ? data.images[0] : '') || ''),
              description: String(data.description || ''),
              type: data.type || 'Self-contain',
              isAvailable: data.isAvailable !== false,
              userId: String(data.userId || ''),
              userName: String(data.userName || 'Agent'),
              createdAt: data.createdAt ? toIsoString(data.createdAt) : new Date().toISOString(),
              savedCount: Number(data.savedCount) || 0
            });
          }
        }
        out.accommodations = list;
      })
    );
  }

  if (!out.houseAgents) {
    tasks.push(
      getDocs(query(collection(db, 'houseAgents'), limit(120)))
        .then((snap) => {
          out.houseAgents = snap.docs
            .map((d) => {
              const data = d.data() || {};
              return {
                id: d.id,
                userId: String(data.userId || d.id),
                agentName: String(data.agentName || 'House Agent'),
                agencyName: data.agencyName ? String(data.agencyName) : undefined,
                institutionId: String(data.institutionId || DEFAULT_INSTITUTION_ID),
                campus: String(data.campus || ''),
                areaCovered: String(data.areaCovered || ''),
                phone: String(data.phone || ''),
                whatsapp: String(data.whatsapp || data.phone || ''),
                bio: String(data.bio || ''),
                photoUrl: data.photoUrl ? String(data.photoUrl) : undefined,
                roleType: data.roleType === 'landlord' ? 'landlord' : 'house_agent',
                isVerified: Boolean(data.isVerified || data.ceoVerified),
                ceoVerified: Boolean(data.ceoVerified || data.isVerified),
                status: data.status === 'suspended' ? 'suspended' : 'active',
                createdAt: data.createdAt ? toIsoString(data.createdAt) : new Date().toISOString(),
                updatedAt: data.updatedAt ? toIsoString(data.updatedAt) : new Date().toISOString()
              } as HouseAgentProfile;
            })
            .filter((a) => a.status !== 'suspended');
        })
        .catch(() => {
          out.houseAgents = [];
        })
    );
  }

  if (!out.advertisements) {
    tasks.push(
      getDocs(query(collection(db, 'advertisements'), limit(120)))
        .then((snap) => {
          out.advertisements = snap.docs
            .map((d) => sanitizeAdDoc(d.id, d.data()))
            .filter((ad) => isAdCurrentlyLive(ad));
        })
        .catch(() => {
          out.advertisements = [];
        })
    );
  }

  if (!out.services) {
    tasks.push(
      getDocs(query(collection(db, 'services'), limit(120)))
        .then((snap) => {
          out.services = snap.docs
            .map((d) => sanitizeServiceDoc(d.id, d.data()))
            .filter((s) => s.status === 'active');
        })
        .catch(() => {
          out.services = [];
        })
    );
  }

  await Promise.all(tasks);
  return out;
}

export function executeNationalSearch(
  filters: NationalSearchFilters,
  collections: SearchableCollections,
  page = 1,
  pageSize = 24
): {
  items: NationalSearchResult[];
  total: number;
  hasMore: boolean;
} {
  const institutions = collections.institutions || VERIFIED_NIGERIAN_INSTITUTIONS;
  const results: Array<NationalSearchResult & { _rel: number }> = [];
  const q = filters.query.trim();

  const matchesScopeAndInst = (itemInstId?: string, stateOverride?: string, visibilityAll?: boolean): boolean => {
    if (filters.scope === 'institution') {
      if (visibilityAll) return true;
      return belongsToInstitution(itemInstId, filters.institutionId);
    }
    if (filters.institutionId && filters.institutionId !== 'all') {
      if (!visibilityAll && !belongsToInstitution(itemInstId, filters.institutionId)) {
        return false;
      }
    }
    const meta = resolveInstitutionMeta(itemInstId, institutions);
    if (filters.institutionType && filters.institutionType !== 'all' && meta.type !== filters.institutionType) {
      return false;
    }
    const effectiveState = stateOverride || meta.state;
    if (filters.state && filters.state !== 'all' && effectiveState.toLowerCase() !== filters.state.toLowerCase()) {
      return false;
    }
    return true;
  };

  const allowCat = (cat: NationalSearchResult['entityType']) =>
    filters.category === 'all' || filters.category === cat;

  // 1. Products
  if (allowCat('products')) {
    for (const p of collections.products || []) {
      if (p.status !== 'active') continue;
      if (!matchesScopeAndInst(p.institutionId, p.state)) continue;
      if (filters.listingCategory && filters.listingCategory !== 'all' && p.categoryId !== filters.listingCategory) {
        continue;
      }
      if (filters.minPrice !== undefined && p.price < filters.minPrice) continue;
      if (filters.maxPrice !== undefined && p.price > filters.maxPrice) continue;
      if (filters.location && !`${p.city} ${p.campus || ''} ${p.state}`.toLowerCase().includes(filters.location.toLowerCase())) {
        continue;
      }
      if (!matchesDateFilter(p.createdAt, filters.datePosted)) continue;

      const rel = computeTextRelevance(q, p.title, p.description, `${p.shopName} ${p.sellerName} ${p.city} ${p.campus || ''}`);
      if (q && rel === 0) continue;

      const meta = resolveInstitutionMeta(p.institutionId, institutions);
      results.push({
        id: `prod:${p.id}`,
        entityType: 'products',
        title: p.title,
        subtitle: `${p.shopName || p.sellerName} · ₦${Number(p.price || 0).toLocaleString()}`,
        description: p.description,
        imageUrl: p.imageUrl || p.images?.[0],
        priceNaira: p.price,
        institutionId: meta.id,
        institutionName: meta.name,
        state: p.state || meta.state,
        location: p.campus || p.city,
        categoryLabel: 'Marketplace Product',
        engagementScore: (p.views || 0) + (p.whatsappClicks || 0) * 5,
        createdAt: p.createdAt,
        raw: p,
        _rel: rel
      });
    }
  }

  // 2. Accommodation
  if (allowCat('accommodation')) {
    for (const acc of collections.accommodations || []) {
      if (acc.isAvailable === false) continue;
      if (!matchesScopeAndInst(acc.institutionId)) continue;
      if (filters.minPrice !== undefined && acc.price < filters.minPrice) continue;
      if (filters.maxPrice !== undefined && acc.price > filters.maxPrice) continue;
      if (filters.location && !`${acc.location} ${acc.campus || ''}`.toLowerCase().includes(filters.location.toLowerCase())) {
        continue;
      }
      if (!matchesDateFilter(acc.createdAt, filters.datePosted)) continue;

      const rel = computeTextRelevance(q, acc.title, acc.description, `${acc.type} ${acc.location} ${acc.campus || ''}`);
      if (q && rel === 0) continue;

      const meta = resolveInstitutionMeta(acc.institutionId, institutions);
      results.push({
        id: `acc:${acc.id}`,
        entityType: 'accommodation',
        title: acc.title,
        subtitle: `${acc.type} · ₦${Number(acc.price || 0).toLocaleString()}/${acc.pricePer}`,
        description: acc.description,
        imageUrl: acc.imageUrl || acc.images?.[0],
        priceNaira: acc.price,
        institutionId: meta.id,
        institutionName: meta.name,
        state: meta.state,
        location: acc.location || acc.campus,
        categoryLabel: acc.category === 'roommate' ? 'Roommate Request' : 'Hostel / Rent',
        engagementScore: (acc.savedCount || 0) * 4,
        createdAt: acc.createdAt,
        raw: acc,
        _rel: rel
      });
    }
  }

  // 3. House Agents
  if (allowCat('house_agents')) {
    for (const agent of collections.houseAgents || []) {
      if (agent.status === 'suspended') continue;
      if (!matchesScopeAndInst(agent.institutionId)) continue;
      if (filters.location && !`${agent.areaCovered} ${agent.campus}`.toLowerCase().includes(filters.location.toLowerCase())) {
        continue;
      }
      if (!matchesDateFilter(agent.createdAt, filters.datePosted)) continue;

      const rel = computeTextRelevance(q, agent.agentName, agent.bio, `${agent.agencyName || ''} ${agent.areaCovered} ${agent.campus}`);
      if (q && rel === 0) continue;

      const meta = resolveInstitutionMeta(agent.institutionId, institutions);
      results.push({
        id: `agent:${agent.id}`,
        entityType: 'house_agents',
        title: agent.agencyName ? `${agent.agentName} (${agent.agencyName})` : agent.agentName,
        subtitle: `${agent.roleType === 'landlord' ? 'Landlord' : 'House Agent'} · ${agent.areaCovered}`,
        description: agent.bio,
        imageUrl: agent.photoUrl,
        institutionId: meta.id,
        institutionName: meta.name,
        state: meta.state,
        location: agent.areaCovered || agent.campus,
        categoryLabel: 'Verified Housing Agent',
        engagementScore: agent.ceoVerified ? 25 : 5,
        createdAt: agent.createdAt,
        raw: agent,
        _rel: rel
      });
    }
  }

  // 4. Businesses / Ads
  if (allowCat('businesses')) {
    for (const ad of collections.advertisements || []) {
      if (!isAdCurrentlyLive(ad)) continue;
      const isGlobal = ad.visibilityScope === 'all_institutions';
      if (!matchesScopeAndInst(ad.institutionId, undefined, isGlobal)) continue;
      if (filters.location && !`${ad.location} ${ad.campus || ''}`.toLowerCase().includes(filters.location.toLowerCase())) {
        continue;
      }
      if (!matchesDateFilter(ad.createdAt, filters.datePosted)) continue;

      const rel = computeTextRelevance(q, `${ad.businessName} — ${ad.title}`, ad.description, `${ad.businessCategory} ${ad.location}`);
      if (q && rel === 0) continue;

      const meta = resolveInstitutionMeta(ad.institutionId, institutions);
      results.push({
        id: `ad:${ad.id}`,
        entityType: 'businesses',
        title: ad.businessName,
        subtitle: `${ad.title} · ${ad.businessCategory}`,
        description: ad.description,
        imageUrl: ad.imageUrl || ad.logoUrl,
        institutionId: isGlobal ? 'all' : meta.id,
        institutionName: isGlobal ? 'All Nigerian Campuses' : meta.name,
        state: meta.state,
        location: ad.location,
        categoryLabel: 'Campus Business Ad',
        engagementScore: (ad.clicks || 0) * 3 + (ad.whatsappClicks || 0) * 5 + Math.floor((ad.impressions || 0) / 5),
        createdAt: ad.createdAt,
        raw: ad,
        _rel: rel
      });
    }
  }

  // 5. Sports Updates
  if (allowCat('sports')) {
    for (const sp of collections.sports || []) {
      if (sp.status !== 'published') continue;
      if (!matchesScopeAndInst(sp.institutionId)) continue;
      if (!matchesDateFilter(sp.createdAt, filters.datePosted)) continue;

      const rel = computeTextRelevance(q, sp.title, sp.description, `${sp.sportCategory} ${sp.teamOrPlayer || ''} ${sp.competitionName || ''}`);
      if (q && rel === 0) continue;

      const meta = resolveInstitutionMeta(sp.institutionId, institutions);
      results.push({
        id: `sport:${sp.id}`,
        entityType: 'sports',
        title: sp.title,
        subtitle: `${sp.sportCategory}${sp.score ? ` · ${sp.score}` : ''}`,
        description: sp.description,
        imageUrl: sp.imageUrl,
        institutionId: meta.id,
        institutionName: meta.name,
        state: meta.state,
        location: sp.venue || sp.campus || meta.name,
        categoryLabel: 'Campus Sports & Football',
        engagementScore: (sp.views || 0) + (sp.likesCount || 0) * 3 + (sp.commentsCount || 0) * 2,
        createdAt: sp.createdAt,
        raw: sp,
        _rel: rel
      });
    }
  }

  // 6. General Announcements
  if (allowCat('announcements')) {
    for (const ann of collections.announcements || []) {
      if (ann.status !== 'published') continue;
      if (!matchesScopeAndInst(ann.institutionId)) continue;
      if (!matchesDateFilter(ann.createdAt, filters.datePosted)) continue;

      const rel = computeTextRelevance(q, ann.title, ann.description, `${ann.announcementCategory} ${ann.location || ''}`);
      if (q && rel === 0) continue;

      const meta = resolveInstitutionMeta(ann.institutionId, institutions);
      results.push({
        id: `ann:${ann.id}`,
        entityType: 'announcements',
        title: ann.title,
        subtitle: `${ann.announcementCategory} · By ${ann.authorName}`,
        description: ann.description,
        imageUrl: ann.imageUrl,
        institutionId: meta.id,
        institutionName: meta.name,
        state: meta.state,
        location: ann.location || ann.campus || meta.name,
        categoryLabel: 'Campus Announcement',
        engagementScore: (ann.views || 0) + (ann.likesCount || 0) * 3 + (ann.commentsCount || 0) * 2,
        createdAt: ann.createdAt,
        raw: ann,
        _rel: rel
      });
    }
  }

  // 7. Events
  if (allowCat('events')) {
    for (const ev of collections.events || []) {
      if (ev.status !== 'published') continue;
      if (!matchesDateFilter(ev.createdAt, filters.datePosted)) continue;

      const rel = computeTextRelevance(q, `${ev.celebrantName} — ${ev.eventType}`, ev.description, `${ev.venue} ${ev.eventDate}`);
      if (q && rel === 0) continue;

      const meta = resolveInstitutionMeta(DEFAULT_INSTITUTION_ID, institutions);
      results.push({
        id: `ev:${ev.id}`,
        entityType: 'events',
        title: ev.celebrantName,
        subtitle: `${ev.eventType} · ${ev.eventDate}`,
        description: ev.description,
        imageUrl: ev.photoUrl,
        institutionId: meta.id,
        institutionName: meta.name,
        state: meta.state,
        location: ev.venue,
        categoryLabel: 'Event & Celebration',
        engagementScore: 10,
        createdAt: ev.createdAt,
        raw: ev,
        _rel: rel
      });
    }
  }

  // 8. Student Services
  if (allowCat('services')) {
    for (const svc of collections.services || []) {
      if (svc.status !== 'active') continue;
      if (!matchesScopeAndInst(svc.institutionId)) continue;
      if (filters.minPrice !== undefined && svc.price < filters.minPrice) continue;
      if (filters.maxPrice !== undefined && svc.price > filters.maxPrice) continue;
      if (filters.location && !`${svc.location} ${svc.campus || ''}`.toLowerCase().includes(filters.location.toLowerCase())) {
        continue;
      }
      if (!matchesDateFilter(svc.createdAt, filters.datePosted)) continue;

      const rel = computeTextRelevance(q, svc.serviceName, svc.description, `${svc.category} ${svc.providerName} ${svc.location}`);
      if (q && rel === 0) continue;

      const meta = resolveInstitutionMeta(svc.institutionId, institutions);
      results.push({
        id: `svc:${svc.serviceId}`,
        entityType: 'services',
        title: svc.serviceName,
        subtitle: `${svc.providerName} · ₦${Number(svc.price || 0).toLocaleString()}`,
        description: svc.description,
        imageUrl: svc.images?.[0],
        priceNaira: svc.price,
        institutionId: meta.id,
        institutionName: meta.name,
        state: meta.state,
        location: svc.location,
        categoryLabel: svc.category,
        engagementScore: (svc.views || 0) + (svc.whatsappClicks || 0) * 5,
        createdAt: svc.createdAt,
        raw: svc,
        _rel: rel
      });
    }
  }

  // 9. Student Requests
  if (allowCat('student_requests')) {
    for (const req of collections.studentRequests || []) {
      if (!matchesScopeAndInst(req.institutionId)) continue;
      if (filters.minPrice !== undefined && req.budget < filters.minPrice) continue;
      if (filters.maxPrice !== undefined && req.budget > filters.maxPrice) continue;
      if (!matchesDateFilter(req.createdAt, filters.datePosted)) continue;

      const rel = computeTextRelevance(q, req.title, req.description, `${req.userName} ${req.location}`);
      if (q && rel === 0) continue;

      const meta = resolveInstitutionMeta(req.institutionId, institutions);
      results.push({
        id: `req:${req.id}`,
        entityType: 'student_requests',
        title: req.title,
        subtitle: `Budget: ₦${Number(req.budget || 0).toLocaleString()} · By ${req.userName}`,
        description: req.description,
        imageUrl: req.imageUrl,
        priceNaira: req.budget,
        institutionId: meta.id,
        institutionName: meta.name,
        state: meta.state,
        location: req.location,
        categoryLabel: 'What Students Need',
        engagementScore: 5,
        createdAt: req.createdAt,
        raw: req,
        _rel: rel
      });
    }
  }

  // Sorting
  const sortMode = filters.sort || (q ? 'relevance' : 'newest');
  results.sort((a, b) => {
    if (sortMode === 'relevance' && q) {
      if (b._rel !== a._rel) return b._rel - a._rel;
    }
    if (sortMode === 'popular') {
      if (b.engagementScore !== a.engagementScore) return b.engagementScore - a.engagementScore;
    }
    if (sortMode === 'price-asc') {
      return (a.priceNaira ?? Number.MAX_SAFE_INTEGER) - (b.priceNaira ?? Number.MAX_SAFE_INTEGER);
    }
    if (sortMode === 'price-desc') {
      return (b.priceNaira ?? -1) - (a.priceNaira ?? -1);
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const total = results.length;
  const limitCount = Math.max(1, page * pageSize);
  const sliced = results.slice(0, limitCount).map(({ _rel, ...rest }) => rest);

  return {
    items: sliced,
    total,
    hasMore: sliced.length < total
  };
}
