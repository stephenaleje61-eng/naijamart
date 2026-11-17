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
  where,
  writeBatch
} from 'firebase/firestore';
import { auth, db, stripUndefined, toIsoString } from './firebase.js';
import { isFirebaseCeoVerified } from './events.js';
import { DEFAULT_INSTITUTION_ID } from '../constants/institutions.js';
import {
  AnnouncementComment,
  AnnouncementModerationStatus,
  AnnouncementReport,
  CommunityAnnouncementPost,
  GeneralAnnouncementPost,
  PostCollectionName,
  PublicAuthorProfile,
  SportMatchStatus,
  SportUpdatePost,
  User
} from '../types.js';

export const SPORT_CATEGORIES = [
  'Football Match Announcement',
  'Football Fixture',
  'Match Result',
  'Live Match Update',
  'Football Tournament',
  'Departmental Football',
  'Faculty Competition',
  'Player Achievement',
  'Sports News',
  'Team Announcement',
  'Basketball Update',
  'Volleyball Update',
  'Athletics Announcement',
  'Training & Trials'
] as const;

export const GENERAL_ANNOUNCEMENT_CATEGORIES = [
  'Birthday Celebration',
  'Party',
  'Wedding',
  'Student Meeting',
  'Departmental Announcement',
  'Faculty Announcement',
  'Religious & Social Event',
  'Student Business Promotion',
  'Accommodation Availability',
  'Lost & Found Notice',
  'Academic Information',
  'Scholarship Opportunity',
  'Job Opportunity',
  'Campus Programme',
  'General Important Information'
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

// Automatic scam/spam screening
const SPAM_PATTERNS = [
  'double your money',
  'processing fee',
  'send processing',
  'bank pin',
  'atm pin',
  'verify your bvn',
  'claim your lottery',
  'crypto giveaway',
  'free iphone giveaway',
  'wire transfer now'
];

export function evaluateAnnouncementSpam(texts: string[]): { flagged: boolean; flags: string[] } {
  const combined = texts.join(' ').toLowerCase();
  const flags: string[] = [];

  for (const phrase of SPAM_PATTERNS) {
    if (combined.includes(phrase)) {
      flags.push(`Suspicious phrase: "${phrase}"`);
    }
  }

  const urlMatches = combined.match(/https?:\/\/\S+/g);
  if (urlMatches && urlMatches.length >= 3) {
    flags.push('Multiple external URLs detected');
  }

  if (/(.)\1{9,}/.test(combined)) {
    flags.push('Repetitive spam characters');
  }

  return {
    flagged: flags.length > 0,
    flags
  };
}

export function getPostShareUrl(postCollection: PostCollectionName, postId: string): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/?post=${encodeURIComponent(postId)}&type=${encodeURIComponent(
    postCollection
  )}`;
}

export function getPostWhatsAppShareUrl(post: CommunityAnnouncementPost): string {
  const url = getPostShareUrl(
    post.categoryType === 'sport_update' ? 'sport_updates' : 'general_announcements',
    post.id
  );
  const category =
    post.categoryType === 'sport_update'
      ? `CAMPUS SPORT UPDATE • ${post.sportCategory}`
      : `CAMPUS ANNOUNCEMENT • ${post.announcementCategory}`;
  const text = `${category}\n*${post.title}*\n${post.description.slice(0, 160)}${
    post.description.length > 160 ? '...' : ''
  }\n\nRead full details on NIGERIA CAMPUS MARKET:\n${url}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function formatRelativeTime(iso: string): string {
  const ts = Date.parse(iso);
  if (isNaN(ts)) return 'Just now';
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 45) return 'Just now';
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export function inferSportMatchStatus(post: SportUpdatePost): SportMatchStatus {
  if (
    post.matchStatus &&
    ['upcoming', 'live', 'completed', 'announcement', 'other_sport'].includes(post.matchStatus)
  ) {
    return post.matchStatus;
  }
  const cat = String(post.sportCategory || '').toLowerCase();
  if (cat.includes('live')) return 'live';
  if (cat.includes('result') || post.score?.trim()) return 'completed';
  if (cat.includes('fixture') || cat.includes('match announcement') || cat.includes('tournament')) {
    return 'upcoming';
  }
  if (
    cat.includes('basketball') ||
    cat.includes('volleyball') ||
    cat.includes('athletics')
  ) {
    return 'other_sport';
  }
  return 'announcement';
}

function sanitizeSportUpdate(id: string, data: any): SportUpdatePost {
  const base: SportUpdatePost = {
    id: String(data?.id || id),
    categoryType: 'sport_update',
    sportCategory: String(data?.sportCategory || 'Sports News').trim(),
    ...(data?.matchStatus ? { matchStatus: data.matchStatus as SportMatchStatus } : {}),
    institutionId: data?.institutionId ? String(data.institutionId) : DEFAULT_INSTITUTION_ID,
    ...(data?.campus ? { campus: String(data.campus).trim() } : {}),
    title: String(data?.title || '').trim(),
    ...(data?.teamOrPlayer ? { teamOrPlayer: String(data.teamOrPlayer).trim() } : {}),
    ...(data?.competitionName ? { competitionName: String(data.competitionName).trim() } : {}),
    ...(data?.matchDate ? { matchDate: String(data.matchDate).trim() } : {}),
    ...(data?.matchTime ? { matchTime: String(data.matchTime).trim() } : {}),
    ...(data?.venue ? { venue: String(data.venue).trim() } : {}),
    ...(data?.score ? { score: String(data.score).trim() } : {}),
    description: String(data?.description || '').trim(),
    ...(data?.imageUrl ? { imageUrl: String(data.imageUrl).trim() } : {}),
    authorId: String(data?.authorId || ''),
    authorName: String(data?.authorName || 'FUWUKARI Student').trim(),
    ...(data?.authorAvatar ? { authorAvatar: String(data.authorAvatar) } : {}),
    status: (['published', 'pending', 'rejected', 'removed'].includes(data?.status)
      ? data.status
      : 'published') as SportUpdatePost['status'],
    ...(Array.isArray(data?.moderationFlags) ? { moderationFlags: data.moderationFlags } : {}),
    ...(data?.adminNotes ? { adminNotes: String(data.adminNotes) } : {}),
    isPinned: Boolean(data?.isPinned),
    isFeatured: Boolean(data?.isFeatured),
    isUnverifiedUserPost: data?.isUnverifiedUserPost !== false,
    likesCount: Math.max(0, Number(data?.likesCount) || 0),
    commentsCount: Math.max(0, Number(data?.commentsCount) || 0),
    views: Math.max(0, Number(data?.views) || 0),
    createdAt: data?.createdAt ? toIsoString(data.createdAt) : new Date().toISOString(),
    updatedAt: data?.updatedAt ? toIsoString(data.updatedAt) : new Date().toISOString()
  };
  return {
    ...base,
    matchStatus: inferSportMatchStatus(base)
  };
}

function sanitizeGeneralAnnouncement(id: string, data: any): GeneralAnnouncementPost {
  return {
    id: String(data?.id || id),
    categoryType: 'general_announcement',
    announcementCategory: String(
      data?.announcementCategory || 'General Important Information'
    ).trim(),
    institutionId: data?.institutionId ? String(data.institutionId) : DEFAULT_INSTITUTION_ID,
    ...(data?.campus ? { campus: String(data.campus).trim() } : {}),
    title: String(data?.title || '').trim(),
    ...(data?.eventDate ? { eventDate: String(data.eventDate).trim() } : {}),
    ...(data?.eventTime ? { eventTime: String(data.eventTime).trim() } : {}),
    ...(data?.location ? { location: String(data.location).trim() } : {}),
    description: String(data?.description || '').trim(),
    ...(data?.imageUrl ? { imageUrl: String(data.imageUrl).trim() } : {}),
    authorId: String(data?.authorId || ''),
    authorName: String(data?.authorName || 'FUWUKARI Student').trim(),
    ...(data?.authorAvatar ? { authorAvatar: String(data.authorAvatar) } : {}),
    status: (['published', 'pending', 'rejected', 'removed'].includes(data?.status)
      ? data.status
      : 'published') as GeneralAnnouncementPost['status'],
    ...(Array.isArray(data?.moderationFlags) ? { moderationFlags: data.moderationFlags } : {}),
    ...(data?.adminNotes ? { adminNotes: String(data.adminNotes) } : {}),
    isPinned: Boolean(data?.isPinned),
    isFeatured: Boolean(data?.isFeatured),
    likesCount: Math.max(0, Number(data?.likesCount) || 0),
    commentsCount: Math.max(0, Number(data?.commentsCount) || 0),
    views: Math.max(0, Number(data?.views) || 0),
    createdAt: data?.createdAt ? toIsoString(data.createdAt) : new Date().toISOString(),
    updatedAt: data?.updatedAt ? toIsoString(data.updatedAt) : new Date().toISOString()
  };
}

function sortFeedPosts<T extends CommunityAnnouncementPost>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

const SPORTS_CACHE_KEY = 'fu_market_sports_cache_v1';
const GENERAL_CACHE_KEY = 'fu_market_general_cache_v1';

export function getCachedSportUpdates(): SportUpdatePost[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SPORTS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? sortFeedPosts(parsed.map((item: any) => sanitizeSportUpdate(item.id || '', item)))
      : [];
  } catch {
    return [];
  }
}

export function getCachedGeneralAnnouncements(): GeneralAnnouncementPost[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(GENERAL_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? sortFeedPosts(parsed.map((item: any) => sanitizeGeneralAnnouncement(item.id || '', item)))
      : [];
  } catch {
    return [];
  }
}

function saveSportsCache(posts: SportUpdatePost[]) {
  if (typeof window === 'undefined') return;
  try {
    const slim = posts
      .slice(0, 40)
      .filter((p) => !p.imageUrl?.startsWith('data:') || (p.imageUrl?.length || 0) < 120000);
    localStorage.setItem(SPORTS_CACHE_KEY, JSON.stringify(slim));
  } catch {
    // ignore storage quota errors
  }
}

function saveGeneralCache(posts: GeneralAnnouncementPost[]) {
  if (typeof window === 'undefined') return;
  try {
    const slim = posts
      .slice(0, 40)
      .filter((p) => !p.imageUrl?.startsWith('data:') || (p.imageUrl?.length || 0) < 120000);
    localStorage.setItem(GENERAL_CACHE_KEY, JSON.stringify(slim));
  } catch {
    // ignore storage quota errors
  }
}

// ============================================================================
// REAL-TIME PUBLIC FEED LISTENERS
// ============================================================================
export function subscribeToSportUpdates(
  onData: (posts: SportUpdatePost[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(collection(db, 'sport_updates'), where('status', '==', 'published'));
  return onSnapshot(
    q,
    (snap) => {
      const list = sortFeedPosts(
        snap.docs
          .map((d) => sanitizeSportUpdate(d.id, d.data()))
          .filter((p) => p.title && p.description)
      );
      saveSportsCache(list);
      onData(list);
    },
    (error) => {
      console.warn('[subscribeToSportUpdates warning]:', error?.message || error);
      onError?.(error);
    }
  );
}

export function subscribeToGeneralAnnouncements(
  onData: (posts: GeneralAnnouncementPost[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(collection(db, 'general_announcements'), where('status', '==', 'published'));
  return onSnapshot(
    q,
    (snap) => {
      const list = sortFeedPosts(
        snap.docs
          .map((d) => sanitizeGeneralAnnouncement(d.id, d.data()))
          .filter((p) => p.title && p.description)
      );
      saveGeneralCache(list);
      onData(list);
    },
    (error) => {
      console.warn('[subscribeToGeneralAnnouncements warning]:', error?.message || error);
      onError?.(error);
    }
  );
}

export async function getAnnouncementById(
  postCollection: PostCollectionName,
  postId: string
): Promise<CommunityAnnouncementPost | null> {
  if (!postId) return null;
  try {
    const snap = await getDoc(doc(db, postCollection, postId));
    if (!snap.exists()) return null;
    return postCollection === 'sport_updates'
      ? sanitizeSportUpdate(snap.id, snap.data())
      : sanitizeGeneralAnnouncement(snap.id, snap.data());
  } catch (err: any) {
    if (String(err?.code || '') === 'permission-denied') {
      handleFirestoreError(err, OperationType.GET, `${postCollection}/${postId}`);
    }
    return null;
  }
}

// ============================================================================
// CREATE / EDIT / DELETE POSTS (AUTHENTICATED USERS ONLY)
// ============================================================================
async function assertAuthenticatedAndActive(appUser?: User | null): Promise<{
  uid: string;
  authorName: string;
  authorAvatar?: string;
}> {
  const fbUser = auth.currentUser;
  if (!fbUser || !fbUser.uid) {
    throw new Error(
      'Please sign in with Google (or verify your account) before publishing or interacting with posts.'
    );
  }
  if (appUser?.isSuspended) {
    throw new Error(
      `Account suspended from posting: ${
        appUser.suspensionReason || 'Violation of NIGERIA CAMPUS MARKET community safety policy.'
      }`
    );
  }

  // Also check live Firestore suspension flag on users/{uid}
  try {
    const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
    if (userDoc.exists() && userDoc.data()?.isSuspended) {
      throw new Error(
        `Account suspended from posting: ${
          userDoc.data()?.suspensionReason || 'Violation of NIGERIA CAMPUS MARKET community safety policy.'
        }`
      );
    }
  } catch (err: any) {
    if (err?.message?.includes('Account suspended')) throw err;
  }

  const authorName = (
    appUser?.name ||
    fbUser.displayName ||
    fbUser.email?.split('@')[0] ||
    'FUWUKARI Student'
  )
    .trim()
    .slice(0, 120);

  const authorAvatar = appUser?.avatarUrl || fbUser.photoURL || undefined;

  return {
    uid: fbUser.uid,
    authorName,
    ...(authorAvatar ? { authorAvatar: authorAvatar.slice(0, 500) } : {})
  };
}

export async function createSportUpdatePost(
  input: {
    sportCategory: string;
    matchStatus?: SportMatchStatus;
    institutionId?: string;
    campus?: string;
    title: string;
    teamOrPlayer?: string;
    competitionName?: string;
    matchDate?: string;
    matchTime?: string;
    venue?: string;
    score?: string;
    description: string;
    imageUrl?: string;
  },
  appUser?: User | null
): Promise<SportUpdatePost> {
  const actor = await assertAuthenticatedAndActive(appUser);

  if (!input.title.trim()) throw new Error('Please enter a title for your sport update.');
  if (!input.description.trim()) throw new Error('Please enter details for your sport update.');

  const spamCheck = evaluateAnnouncementSpam([
    input.title,
    input.description,
    input.teamOrPlayer || '',
    input.competitionName || ''
  ]);

  const id = `spt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const status: SportUpdatePost['status'] = spamCheck.flagged ? 'pending' : 'published';

  const firestorePayload = stripUndefined({
    id,
    categoryType: 'sport_update' as const,
    sportCategory: input.sportCategory.trim().slice(0, 80),
    ...(input.matchStatus ? { matchStatus: input.matchStatus } : {}),
    institutionId: (input.institutionId || DEFAULT_INSTITUTION_ID).trim().slice(0, 128),
    ...(input.campus?.trim() ? { campus: input.campus.trim().slice(0, 120) } : {}),
    title: input.title.trim().slice(0, 180),
    ...(input.teamOrPlayer?.trim() ? { teamOrPlayer: input.teamOrPlayer.trim().slice(0, 160) } : {}),
    ...(input.competitionName?.trim()
      ? { competitionName: input.competitionName.trim().slice(0, 140) }
      : {}),
    ...(input.matchDate?.trim() ? { matchDate: input.matchDate.trim().slice(0, 32) } : {}),
    ...(input.matchTime?.trim() ? { matchTime: input.matchTime.trim().slice(0, 60) } : {}),
    ...(input.venue?.trim() ? { venue: input.venue.trim().slice(0, 180) } : {}),
    ...(input.score?.trim() ? { score: input.score.trim().slice(0, 60) } : {}),
    description: input.description.trim().slice(0, 4000),
    ...(input.imageUrl?.trim() ? { imageUrl: input.imageUrl.trim() } : {}),
    authorId: actor.uid,
    authorName: actor.authorName,
    ...(actor.authorAvatar ? { authorAvatar: actor.authorAvatar } : {}),
    status,
    ...(spamCheck.flagged ? { moderationFlags: spamCheck.flags } : {}),
    isPinned: false,
    isFeatured: false,
    isUnverifiedUserPost: true,
    likesCount: 0,
    commentsCount: 0,
    views: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  const approxBytes = new TextEncoder().encode(JSON.stringify(firestorePayload)).length;
  if (approxBytes > 950_000) {
    throw new Error('Post image and text exceed database limit. Please upload a smaller image.');
  }

  try {
    await setDoc(doc(db, 'sport_updates', id), firestorePayload);
    return sanitizeSportUpdate(id, {
      ...firestorePayload,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  } catch (err: any) {
    if (String(err?.code || '') === 'permission-denied') {
      handleFirestoreError(err, OperationType.CREATE, `sport_updates/${id}`);
    }
    throw err;
  }
}

export async function createGeneralAnnouncementPost(
  input: {
    announcementCategory: string;
    institutionId?: string;
    campus?: string;
    title: string;
    eventDate?: string;
    eventTime?: string;
    location?: string;
    description: string;
    imageUrl?: string;
  },
  appUser?: User | null
): Promise<GeneralAnnouncementPost> {
  const actor = await assertAuthenticatedAndActive(appUser);

  if (!input.title.trim()) throw new Error('Please enter a title for your announcement.');
  if (!input.description.trim()) throw new Error('Please enter the announcement details.');

  const spamCheck = evaluateAnnouncementSpam([
    input.title,
    input.description,
    input.location || ''
  ]);

  const id = `ann_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const status: GeneralAnnouncementPost['status'] = spamCheck.flagged ? 'pending' : 'published';

  const firestorePayload = stripUndefined({
    id,
    categoryType: 'general_announcement' as const,
    announcementCategory: input.announcementCategory.trim().slice(0, 80),
    institutionId: (input.institutionId || DEFAULT_INSTITUTION_ID).trim().slice(0, 128),
    ...(input.campus?.trim() ? { campus: input.campus.trim().slice(0, 120) } : {}),
    title: input.title.trim().slice(0, 180),
    ...(input.eventDate?.trim() ? { eventDate: input.eventDate.trim().slice(0, 32) } : {}),
    ...(input.eventTime?.trim() ? { eventTime: input.eventTime.trim().slice(0, 60) } : {}),
    ...(input.location?.trim() ? { location: input.location.trim().slice(0, 180) } : {}),
    description: input.description.trim().slice(0, 4000),
    ...(input.imageUrl?.trim() ? { imageUrl: input.imageUrl.trim() } : {}),
    authorId: actor.uid,
    authorName: actor.authorName,
    ...(actor.authorAvatar ? { authorAvatar: actor.authorAvatar } : {}),
    status,
    ...(spamCheck.flagged ? { moderationFlags: spamCheck.flags } : {}),
    isPinned: false,
    isFeatured: false,
    likesCount: 0,
    commentsCount: 0,
    views: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  const approxBytes = new TextEncoder().encode(JSON.stringify(firestorePayload)).length;
  if (approxBytes > 950_000) {
    throw new Error('Post image and text exceed database limit. Please upload a smaller image.');
  }

  try {
    await setDoc(doc(db, 'general_announcements', id), firestorePayload);
    return sanitizeGeneralAnnouncement(id, {
      ...firestorePayload,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  } catch (err: any) {
    if (String(err?.code || '') === 'permission-denied') {
      handleFirestoreError(err, OperationType.CREATE, `general_announcements/${id}`);
    }
    throw err;
  }
}

export async function updateOwnSportUpdatePost(
  postId: string,
  updates: Partial<SportUpdatePost>
): Promise<void> {
  const fbUser = auth.currentUser;
  if (!fbUser) throw new Error('Sign in required to edit your post.');

  const spamCheck = evaluateAnnouncementSpam([
    updates.title || '',
    updates.description || '',
    updates.teamOrPlayer || ''
  ]);

  const payload = stripUndefined({
    ...(updates.sportCategory !== undefined
      ? { sportCategory: updates.sportCategory.trim().slice(0, 80) }
      : {}),
    ...(updates.matchStatus !== undefined ? { matchStatus: updates.matchStatus } : {}),
    ...(updates.institutionId !== undefined
      ? { institutionId: updates.institutionId.trim().slice(0, 128) }
      : {}),
    ...(updates.campus !== undefined ? { campus: updates.campus.trim().slice(0, 120) } : {}),
    ...(updates.title !== undefined ? { title: updates.title.trim().slice(0, 180) } : {}),
    ...(updates.teamOrPlayer !== undefined
      ? { teamOrPlayer: updates.teamOrPlayer.trim().slice(0, 160) }
      : {}),
    ...(updates.competitionName !== undefined
      ? { competitionName: updates.competitionName.trim().slice(0, 140) }
      : {}),
    ...(updates.matchDate !== undefined
      ? { matchDate: updates.matchDate.trim().slice(0, 32) }
      : {}),
    ...(updates.matchTime !== undefined
      ? { matchTime: updates.matchTime.trim().slice(0, 60) }
      : {}),
    ...(updates.venue !== undefined ? { venue: updates.venue.trim().slice(0, 180) } : {}),
    ...(updates.score !== undefined ? { score: updates.score.trim().slice(0, 60) } : {}),
    ...(updates.description !== undefined
      ? { description: updates.description.trim().slice(0, 4000) }
      : {}),
    ...(updates.imageUrl !== undefined ? { imageUrl: updates.imageUrl.trim() } : {}),
    ...(spamCheck.flagged ? { status: 'pending', moderationFlags: spamCheck.flags } : {}),
    updatedAt: serverTimestamp()
  });

  try {
    await updateDoc(doc(db, 'sport_updates', postId), payload);
  } catch (err: any) {
    if (String(err?.code || '') === 'permission-denied') {
      handleFirestoreError(err, OperationType.UPDATE, `sport_updates/${postId}`);
    }
    throw err;
  }
}

export async function updateOwnGeneralAnnouncementPost(
  postId: string,
  updates: Partial<GeneralAnnouncementPost>
): Promise<void> {
  const fbUser = auth.currentUser;
  if (!fbUser) throw new Error('Sign in required to edit your post.');

  const spamCheck = evaluateAnnouncementSpam([updates.title || '', updates.description || '']);

  const payload = stripUndefined({
    ...(updates.announcementCategory !== undefined
      ? { announcementCategory: updates.announcementCategory.trim().slice(0, 80) }
      : {}),
    ...(updates.institutionId !== undefined
      ? { institutionId: updates.institutionId.trim().slice(0, 128) }
      : {}),
    ...(updates.campus !== undefined ? { campus: updates.campus.trim().slice(0, 120) } : {}),
    ...(updates.title !== undefined ? { title: updates.title.trim().slice(0, 180) } : {}),
    ...(updates.eventDate !== undefined
      ? { eventDate: updates.eventDate.trim().slice(0, 32) }
      : {}),
    ...(updates.eventTime !== undefined
      ? { eventTime: updates.eventTime.trim().slice(0, 60) }
      : {}),
    ...(updates.location !== undefined
      ? { location: updates.location.trim().slice(0, 180) }
      : {}),
    ...(updates.description !== undefined
      ? { description: updates.description.trim().slice(0, 4000) }
      : {}),
    ...(updates.imageUrl !== undefined ? { imageUrl: updates.imageUrl.trim() } : {}),
    ...(spamCheck.flagged ? { status: 'pending', moderationFlags: spamCheck.flags } : {}),
    updatedAt: serverTimestamp()
  });

  try {
    await updateDoc(doc(db, 'general_announcements', postId), payload);
  } catch (err: any) {
    if (String(err?.code || '') === 'permission-denied') {
      handleFirestoreError(err, OperationType.UPDATE, `general_announcements/${postId}`);
    }
    throw err;
  }
}

export async function deleteAnnouncementPost(
  postCollection: PostCollectionName,
  postId: string
): Promise<void> {
  const fbUser = auth.currentUser;
  if (!fbUser) throw new Error('Sign in required to delete this post.');
  try {
    await deleteDoc(doc(db, postCollection, postId));
  } catch (err: any) {
    if (String(err?.code || '') === 'permission-denied') {
      handleFirestoreError(err, OperationType.DELETE, `${postCollection}/${postId}`);
    }
    throw err;
  }
}

// ============================================================================
// SOCIAL INTERACTIONS (LIKES, COMMENTS/REPLIES, SAVES, VIEWS, REPORTS)
// ============================================================================
export async function togglePostLike(
  postCollection: PostCollectionName,
  postId: string
): Promise<boolean> {
  const fbUser = auth.currentUser;
  if (!fbUser?.uid) {
    throw new Error('Please sign in with Google to like posts.');
  }

  const likeRef = doc(db, postCollection, postId, 'likes', fbUser.uid);
  const postRef = doc(db, postCollection, postId);

  try {
    const existing = await getDoc(likeRef);
    const batch = writeBatch(db);
    if (existing.exists()) {
      batch.delete(likeRef);
      batch.update(postRef, { likesCount: increment(-1) });
      await batch.commit();
      return false;
    } else {
      batch.set(likeRef, { userId: fbUser.uid, createdAt: serverTimestamp() });
      batch.update(postRef, { likesCount: increment(1) });
      await batch.commit();
      return true;
    }
  } catch (err: any) {
    if (String(err?.code || '') === 'permission-denied') {
      handleFirestoreError(err, OperationType.WRITE, `${postCollection}/${postId}/likes`);
    }
    throw err;
  }
}

export async function checkUserLikedPost(
  postCollection: PostCollectionName,
  postId: string,
  userId?: string
): Promise<boolean> {
  const uid = userId || auth.currentUser?.uid;
  if (!uid) return false;
  try {
    const snap = await getDoc(doc(db, postCollection, postId, 'likes', uid));
    return snap.exists();
  } catch {
    return false;
  }
}

export function subscribeToSavedAnnouncementIds(
  onData: (ids: Set<string>) => void
): () => void {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    onData(new Set());
    return () => {};
  }
  return onSnapshot(
    collection(db, 'users', uid, 'saved_announcements'),
    (snap) => {
      onData(new Set(snap.docs.map((d) => d.id)));
    },
    (error) => {
      console.warn('[subscribeToSavedAnnouncementIds warning]:', error?.message || error);
    }
  );
}

export async function toggleSaveAnnouncement(post: CommunityAnnouncementPost): Promise<boolean> {
  const fbUser = auth.currentUser;
  if (!fbUser?.uid) {
    throw new Error('Please sign in with Google to save announcements.');
  }
  const colName: PostCollectionName =
    post.categoryType === 'sport_update' ? 'sport_updates' : 'general_announcements';
  const refDoc = doc(db, 'users', fbUser.uid, 'saved_announcements', post.id);
  try {
    const snap = await getDoc(refDoc);
    if (snap.exists()) {
      await deleteDoc(refDoc);
      return false;
    } else {
      await setDoc(refDoc, {
        postId: post.id,
        postCollection: colName,
        title: post.title,
        savedAt: serverTimestamp()
      });
      return true;
    }
  } catch (err: any) {
    if (String(err?.code || '') === 'permission-denied') {
      handleFirestoreError(err, OperationType.WRITE, `users/${fbUser.uid}/saved_announcements`);
    }
    throw err;
  }
}

export function subscribeToPostComments(
  postCollection: PostCollectionName,
  postId: string,
  onData: (comments: AnnouncementComment[]) => void
): () => void {
  const q = query(
    collection(db, 'announcement_comments'),
    where('postId', '==', postId)
  );
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: String(data?.id || d.id),
            postId: String(data?.postId || postId),
            postCollection:
              data?.postCollection === 'general_announcements'
                ? 'general_announcements'
                : 'sport_updates',
            ...(data?.parentCommentId ? { parentCommentId: String(data.parentCommentId) } : {}),
            authorId: String(data?.authorId || ''),
            authorName: String(data?.authorName || 'Student').trim(),
            ...(data?.authorAvatar ? { authorAvatar: String(data.authorAvatar) } : {}),
            text: String(data?.text || '').trim(),
            createdAt: data?.createdAt ? toIsoString(data.createdAt) : new Date().toISOString(),
            updatedAt: data?.updatedAt ? toIsoString(data.updatedAt) : new Date().toISOString()
          } as AnnouncementComment;
        })
        .filter((c) => c.postCollection === postCollection && c.text)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      onData(list);
    },
    (error) => {
      console.warn('[subscribeToPostComments warning]:', error?.message || error);
    }
  );
}

export async function addPostComment(
  postCollection: PostCollectionName,
  postId: string,
  text: string,
  appUser?: User | null,
  parentCommentId?: string
): Promise<void> {
  const actor = await assertAuthenticatedAndActive(appUser);
  const cleanText = text.trim();
  if (!cleanText) throw new Error('Please write a comment before posting.');
  if (cleanText.length > 1500) throw new Error('Comment is too long (max 1500 characters).');

  const commentId = `cmt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const batch = writeBatch(db);
  batch.set(
    doc(db, 'announcement_comments', commentId),
    stripUndefined({
      id: commentId,
      postId,
      postCollection,
      ...(parentCommentId ? { parentCommentId } : {}),
      authorId: actor.uid,
      authorName: actor.authorName,
      ...(actor.authorAvatar ? { authorAvatar: actor.authorAvatar } : {}),
      text: cleanText,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  );
  batch.update(doc(db, postCollection, postId), { commentsCount: increment(1) });

  try {
    await batch.commit();
  } catch (err: any) {
    if (String(err?.code || '') === 'permission-denied') {
      handleFirestoreError(err, OperationType.CREATE, `announcement_comments/${commentId}`);
    }
    throw err;
  }
}

export async function deletePostComment(comment: AnnouncementComment): Promise<void> {
  const fbUser = auth.currentUser;
  if (!fbUser?.uid) throw new Error('Sign in required to delete comment.');

  const batch = writeBatch(db);
  batch.delete(doc(db, 'announcement_comments', comment.id));
  batch.update(doc(db, comment.postCollection, comment.postId), {
    commentsCount: increment(-1)
  });

  try {
    await batch.commit();
  } catch (err: any) {
    if (String(err?.code || '') === 'permission-denied') {
      handleFirestoreError(err, OperationType.DELETE, `announcement_comments/${comment.id}`);
    }
    throw err;
  }
}

export async function incrementPostView(
  postCollection: PostCollectionName,
  postId: string
): Promise<void> {
  if (typeof window !== 'undefined') {
    const viewKey = `fu_viewed_${postCollection}_${postId}`;
    try {
      if (sessionStorage.getItem(viewKey) === '1') return;
      sessionStorage.setItem(viewKey, '1');
    } catch {
      // ignore sessionStorage failure
    }
  }
  try {
    await updateDoc(doc(db, postCollection, postId), { views: increment(1) });
  } catch {
    // non-blocking view counter increment
  }
}

export async function submitAnnouncementReport(input: {
  postId: string;
  postCollection: PostCollectionName;
  postTitle: string;
  reason: string;
  details: string;
  reporterName?: string;
}): Promise<void> {
  const reportId = `rep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const reporterId = auth.currentUser?.uid || undefined;

  try {
    await setDoc(
      doc(db, 'announcement_reports', reportId),
      stripUndefined({
        id: reportId,
        postId: input.postId,
        postCollection: input.postCollection,
        postTitle: input.postTitle.trim().slice(0, 200),
        reason: input.reason.trim().slice(0, 120),
        details: input.details.trim().slice(0, 1000),
        ...(reporterId ? { reporterId } : {}),
        ...(input.reporterName?.trim()
          ? { reporterName: input.reporterName.trim().slice(0, 120) }
          : {}),
        status: 'pending' as const,
        createdAt: serverTimestamp()
      })
    );
  } catch (err: any) {
    if (String(err?.code || '') === 'permission-denied') {
      handleFirestoreError(err, OperationType.CREATE, `announcement_reports/${reportId}`);
    }
    throw err;
  }
}

export async function getPublicAuthorProfile(
  authorId: string,
  fallbackName: string,
  fallbackAvatar?: string
): Promise<PublicAuthorProfile> {
  const safeFallback: PublicAuthorProfile = {
    authorId,
    name: fallbackName || 'FUWUKARI Student',
    ...(fallbackAvatar ? { avatarUrl: fallbackAvatar } : {})
  };
  if (!authorId) return safeFallback;

  try {
    const [userSnap, sellerSnap] = await Promise.allSettled([
      getDoc(doc(db, 'users', authorId)),
      getDoc(doc(db, 'sellerProfiles', `profile-${authorId}`))
    ]);

    const userData =
      userSnap.status === 'fulfilled' && userSnap.value.exists() ? userSnap.value.data() : null;
    const sellerData =
      sellerSnap.status === 'fulfilled' && sellerSnap.value.exists()
        ? sellerSnap.value.data()
        : null;

    // Strictly expose ONLY public non-PII profile fields (never email, phone, or passwordHash)
    return {
      authorId,
      name: String(userData?.name || fallbackName || 'FUWUKARI Student').trim(),
      avatarUrl: userData?.avatarUrl || fallbackAvatar,
      city: userData?.city || 'Wukari',
      isVerifiedSeller: Boolean(sellerData?.isVerified),
      joinedAt: userData?.createdAt ? toIsoString(userData.createdAt) : undefined
    };
  } catch {
    return safeFallback;
  }
}

// ============================================================================
// ADMIN MODERATION DASHBOARD OPERATIONS (CEO/ADMIN ONLY)
// ============================================================================
export async function getAllAnnouncementsForAdmin(): Promise<{
  sportUpdates: SportUpdatePost[];
  generalAnnouncements: GeneralAnnouncementPost[];
  reports: AnnouncementReport[];
}> {
  if (!isFirebaseCeoVerified()) {
    throw new Error('Administrator Google authentication required to moderate announcements.');
  }

  try {
    const [sportsSnap, generalSnap, reportsSnap] = await Promise.all([
      getDocs(collection(db, 'sport_updates')),
      getDocs(collection(db, 'general_announcements')),
      getDocs(collection(db, 'announcement_reports'))
    ]);

    const sportUpdates = sortFeedPosts(
      sportsSnap.docs.map((d) => sanitizeSportUpdate(d.id, d.data()))
    );
    const generalAnnouncements = sortFeedPosts(
      generalSnap.docs.map((d) => sanitizeGeneralAnnouncement(d.id, d.data()))
    );
    const reports = reportsSnap.docs
      .map((d) => {
        const data = d.data();
        return {
          id: String(data?.id || d.id),
          postId: String(data?.postId || ''),
          postCollection:
            data?.postCollection === 'general_announcements'
              ? 'general_announcements'
              : 'sport_updates',
          postTitle: String(data?.postTitle || ''),
          reason: String(data?.reason || ''),
          details: String(data?.details || ''),
          reporterId: data?.reporterId ? String(data.reporterId) : undefined,
          reporterName: data?.reporterName ? String(data.reporterName) : undefined,
          status: (['pending', 'resolved', 'dismissed'].includes(data?.status)
            ? data.status
            : 'pending') as AnnouncementReport['status'],
          adminNotes: data?.adminNotes ? String(data.adminNotes) : undefined,
          createdAt: data?.createdAt ? toIsoString(data.createdAt) : new Date().toISOString()
        } as AnnouncementReport;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return { sportUpdates, generalAnnouncements, reports };
  } catch (err: any) {
    if (String(err?.code || '') === 'permission-denied') {
      handleFirestoreError(err, OperationType.LIST, 'sport_updates');
    }
    throw err;
  }
}

export async function adminModerateAnnouncement(
  postCollection: PostCollectionName,
  postId: string,
  updates: {
    status?: AnnouncementModerationStatus;
    isPinned?: boolean;
    isFeatured?: boolean;
    isUnverifiedUserPost?: boolean;
    adminNotes?: string;
  }
): Promise<void> {
  if (!isFirebaseCeoVerified()) {
    throw new Error('Unauthorized: Admin verification required.');
  }
  try {
    await updateDoc(
      doc(db, postCollection, postId),
      stripUndefined({
        ...updates,
        updatedAt: serverTimestamp()
      })
    );
  } catch (err: any) {
    if (String(err?.code || '') === 'permission-denied') {
      handleFirestoreError(err, OperationType.UPDATE, `${postCollection}/${postId}`);
    }
    throw err;
  }
}

export async function adminResolveAnnouncementReport(
  reportId: string,
  status: 'resolved' | 'dismissed',
  adminNotes?: string
): Promise<void> {
  if (!isFirebaseCeoVerified()) {
    throw new Error('Unauthorized: Admin verification required.');
  }
  try {
    await updateDoc(
      doc(db, 'announcement_reports', reportId),
      stripUndefined({
        status,
        ...(adminNotes ? { adminNotes } : {})
      })
    );
  } catch (err: any) {
    if (String(err?.code || '') === 'permission-denied') {
      handleFirestoreError(err, OperationType.UPDATE, `announcement_reports/${reportId}`);
    }
    throw err;
  }
}
