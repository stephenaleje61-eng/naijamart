import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where
} from 'firebase/firestore';
import { auth, db, stripUndefined, toIsoString } from './firebase.js';
import { CampusEvent, User } from '../types.js';

export const CEO_EMAIL = 'stephenaleje61@gmail.com';
export const CEO_DISPLAY_PHONE = '08167258121';
export const CEO_WHATSAPP_INTL = '2348167258121';
export const CEO_WHATSAPP_MESSAGE =
  'Hello NIGERIA CAMPUS MARKET CEO, I want to advertise my birthday or campus event on NIGERIA CAMPUS MARKET. Please give me more information.';

export function getCeoWhatsAppUrl(eventTitle?: string): string {
  const message = eventTitle
    ? `${CEO_WHATSAPP_MESSAGE} (Regarding: ${eventTitle})`
    : CEO_WHATSAPP_MESSAGE;
  return `https://wa.me/${CEO_WHATSAPP_INTL}?text=${encodeURIComponent(message)}`;
}

export const EVENT_TYPES = [
  'Birthday Celebration',
  'Graduation Ceremony',
  'Matriculation',
  'Party & Social Night',
  'Award & Recognition',
  'Fellowship / Union Program',
  'Special Campus Event'
] as const;

export function isAuthorizedCeo(user?: Pick<User, 'email' | 'role'> | null): boolean {
  if (!user?.email) return false;
  return user.email.toLowerCase().trim() === CEO_EMAIL;
}

export function isFirebaseCeoVerified(): boolean {
  const fbUser = auth.currentUser;
  if (!fbUser || !fbUser.email) return false;
  return fbUser.email.toLowerCase().trim() === CEO_EMAIL && fbUser.emailVerified === true;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write'
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
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

const EVENTS_CACHE_KEY = 'fu_market_events_cache_v1';
let memoryPublishedEvents: CampusEvent[] | null = null;

function sanitizeEventDoc(id: string, data: any): CampusEvent {
  return {
    id: String(data?.id || id),
    celebrantName: String(data?.celebrantName || '').trim(),
    eventType: String(data?.eventType || 'Birthday Celebration').trim(),
    eventDate: String(data?.eventDate || '').trim(),
    ...(data?.eventTime ? { eventTime: String(data.eventTime).trim() } : {}),
    venue: String(data?.venue || '').trim(),
    description: String(data?.description || '').trim(),
    ...(data?.additionalInfo ? { additionalInfo: String(data.additionalInfo).trim() } : {}),
    photoUrl: String(data?.photoUrl || '').trim(),
    status: data?.status === 'draft' ? 'draft' : 'published',
    ...(data?.publishAt ? { publishAt: toIsoString(data.publishAt) } : {}),
    ...(data?.createdByUid ? { createdByUid: String(data.createdByUid) } : {}),
    ...(data?.createdByEmail ? { createdByEmail: String(data.createdByEmail) } : {}),
    createdAt: data?.createdAt ? toIsoString(data.createdAt) : new Date().toISOString(),
    updatedAt: data?.updatedAt ? toIsoString(data.updatedAt) : new Date().toISOString()
  };
}

export function getTodayDateISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isEventScheduledForFuture(event: Pick<CampusEvent, 'status' | 'publishAt'>): boolean {
  if (event.status !== 'published' || !event.publishAt) return false;
  const ts = Date.parse(event.publishAt);
  return !isNaN(ts) && ts > Date.now();
}

export function isEventPast(event: Pick<CampusEvent, 'eventDate'>): boolean {
  if (!event.eventDate) return false;
  return event.eventDate < getTodayDateISO();
}

export function formatEventDate(dateStr: string): string {
  if (!dateStr) return 'Date to be announced';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr.trim());
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const localDate = new Date(year, month, day);
    if (!isNaN(localDate.getTime())) {
      return localDate.toLocaleDateString('en-NG', {
        weekday: 'short',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }
  }
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('en-NG', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
  return dateStr;
}

export function getEventCountdownBadge(eventDate: string): string {
  const today = getTodayDateISO();
  if (!eventDate) return '';
  if (eventDate === today) return 'Today!';
  const t1 = new Date(`${today}T00:00:00`).getTime();
  const t2 = new Date(`${eventDate.slice(0, 10)}T00:00:00`).getTime();
  if (isNaN(t1) || isNaN(t2)) return '';
  const diffDays = Math.round((t2 - t1) / (24 * 60 * 60 * 1000));
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays < 0) return 'Celebrated';
  return 'Upcoming';
}

export function categorizePublicEvents(events: CampusEvent[]): {
  upcoming: CampusEvent[];
  past: CampusEvent[];
} {
  const today = getTodayDateISO();
  const livePublished = events.filter(
    (e) => e.status === 'published' && !isEventScheduledForFuture(e)
  );

  const upcoming = livePublished
    .filter((e) => !e.eventDate || e.eventDate >= today)
    .sort((a, b) => {
      const cmp = (a.eventDate || '').localeCompare(b.eventDate || '');
      if (cmp !== 0) return cmp;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const past = livePublished
    .filter((e) => Boolean(e.eventDate) && e.eventDate < today)
    .sort((a, b) => {
      const cmp = (b.eventDate || '').localeCompare(a.eventDate || '');
      if (cmp !== 0) return cmp;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return { upcoming, past };
}

function savePublishedEventsCache(events: CampusEvent[]): void {
  memoryPublishedEvents = events;
  if (typeof window === 'undefined') return;
  try {
    const slim = events.filter(
      (e) => !e.photoUrl.startsWith('data:') || e.photoUrl.length < 180000
    );
    localStorage.setItem(EVENTS_CACHE_KEY, JSON.stringify(slim));
  } catch {
    // Non-blocking storage safeguard
  }
}

export function getCachedPublishedEvents(): CampusEvent[] {
  if (memoryPublishedEvents) return memoryPublishedEvents;
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(EVENTS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    memoryPublishedEvents = parsed.map((e: any) => sanitizeEventDoc(e.id || '', e));
    return memoryPublishedEvents;
  } catch {
    return [];
  }
}

export async function getPublishedEventsFromFirestore(forceRefresh = false): Promise<CampusEvent[]> {
  if (!forceRefresh && memoryPublishedEvents && memoryPublishedEvents.length > 0) {
    return memoryPublishedEvents;
  }

  try {
    const q = query(collection(db, 'events'), where('status', '==', 'published'));
    const snap = await getDocs(q);
    const list = snap.docs
      .map((d) => sanitizeEventDoc(d.id, d.data()))
      .filter((e) => e.celebrantName && e.venue);
    savePublishedEventsCache(list);
    return list;
  } catch (err: any) {
    const code = String(err?.code || '');
    if (code === 'permission-denied') {
      handleFirestoreError(err, OperationType.LIST, 'events');
    }
    throw err;
  }
}

export function subscribeToPublishedEvents(
  onData: (events: CampusEvent[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(collection(db, 'events'), where('status', '==', 'published'));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => sanitizeEventDoc(d.id, d.data()))
        .filter((e) => e.celebrantName && e.venue);
      savePublishedEventsCache(list);
      onData(list);
    },
    (error) => {
      console.warn('[subscribeToPublishedEvents warning]:', error?.message || error);
      onError?.(error);
    }
  );
}

export async function getEventByIdFromFirestore(eventId: string): Promise<CampusEvent | null> {
  if (!eventId) return null;
  try {
    const snap = await getDoc(doc(db, 'events', eventId));
    if (!snap.exists()) return null;
    return sanitizeEventDoc(snap.id, snap.data());
  } catch (err: any) {
    if (String(err?.code || '') === 'permission-denied') {
      handleFirestoreError(err, OperationType.GET, `events/${eventId}`);
    }
    return null;
  }
}

export async function getAllEventsForCeoFromFirestore(): Promise<CampusEvent[]> {
  if (!isFirebaseCeoVerified()) {
    throw new Error(
      `CEO verification required. Please sign in with Google using ${CEO_EMAIL} to manage all announcements.`
    );
  }
  try {
    const snap = await getDocs(collection(db, 'events'));
    return snap.docs
      .map((d) => sanitizeEventDoc(d.id, d.data()))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err: any) {
    if (String(err?.code || '') === 'permission-denied') {
      handleFirestoreError(err, OperationType.LIST, 'events');
    }
    throw err;
  }
}

function assertValidCeoAndEventPayload(payload: Partial<CampusEvent>): void {
  if (!isFirebaseCeoVerified()) {
    throw new Error(
      `Unauthorized: Only the verified NIGERIA CAMPUS MARKET CEO (${CEO_EMAIL}) can publish or modify announcements.`
    );
  }
  if (!payload.celebrantName?.trim()) {
    throw new Error("Please enter the celebrant's full name.");
  }
  if (payload.celebrantName.trim().length > 140) {
    throw new Error("Celebrant's full name cannot exceed 140 characters.");
  }
  if (!payload.eventType?.trim()) {
    throw new Error('Please select or enter the event type.');
  }
  if (!payload.eventDate?.trim()) {
    throw new Error('Please choose the birthday or event date.');
  }
  if (!payload.venue?.trim()) {
    throw new Error('Please enter the event venue.');
  }
  if (!payload.description?.trim()) {
    throw new Error('Please write an event description.');
  }
  if (!payload.photoUrl?.trim()) {
    throw new Error("Please upload the celebrant's photograph or event poster.");
  }
}

export async function saveEventToFirestore(input: {
  id?: string;
  celebrantName: string;
  eventType: string;
  eventDate: string;
  eventTime?: string;
  venue: string;
  description: string;
  additionalInfo?: string;
  photoUrl: string;
  status: 'published' | 'draft';
  publishAt?: string;
}): Promise<CampusEvent> {
  assertValidCeoAndEventPayload(input);

  const now = new Date().toISOString();
  const rawId = input.id?.trim() || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const safeId = rawId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);

  const docData: CampusEvent = stripUndefined({
    id: safeId,
    celebrantName: input.celebrantName.trim().slice(0, 140),
    eventType: input.eventType.trim().slice(0, 80),
    eventDate: input.eventDate.trim().slice(0, 32),
    ...(input.eventTime?.trim() ? { eventTime: input.eventTime.trim().slice(0, 60) } : {}),
    venue: input.venue.trim().slice(0, 180),
    description: input.description.trim().slice(0, 3000),
    ...(input.additionalInfo?.trim()
      ? { additionalInfo: input.additionalInfo.trim().slice(0, 1500) }
      : {}),
    photoUrl: input.photoUrl.trim(),
    status: input.status === 'draft' ? 'draft' : 'published',
    ...(input.publishAt?.trim() ? { publishAt: toIsoString(input.publishAt.trim()) } : {}),
    createdByUid: auth.currentUser!.uid,
    createdByEmail: auth.currentUser!.email || CEO_EMAIL,
    createdAt: now,
    updatedAt: now
  });

  const approxBytes = new TextEncoder().encode(JSON.stringify(docData)).length;
  if (approxBytes > 950_000) {
    throw new Error(
      'Event image & text payload is too large for database storage. Please upload a smaller photo.'
    );
  }

  try {
    await setDoc(doc(db, 'events', safeId), docData);
    memoryPublishedEvents = null;
    return docData;
  } catch (err: any) {
    if (String(err?.code || '') === 'permission-denied') {
      handleFirestoreError(err, OperationType.CREATE, `events/${safeId}`);
    }
    throw err;
  }
}

export async function updateEventInFirestore(
  existing: CampusEvent,
  updates: Partial<CampusEvent>
): Promise<CampusEvent> {
  if (!isFirebaseCeoVerified()) {
    throw new Error(
      `Unauthorized: Only the verified NIGERIA CAMPUS MARKET CEO (${CEO_EMAIL}) can edit announcements.`
    );
  }

  const merged: CampusEvent = stripUndefined({
    id: existing.id,
    celebrantName: (updates.celebrantName ?? existing.celebrantName).trim().slice(0, 140),
    eventType: (updates.eventType ?? existing.eventType).trim().slice(0, 80),
    eventDate: (updates.eventDate ?? existing.eventDate).trim().slice(0, 32),
    ...((updates.eventTime !== undefined ? updates.eventTime : existing.eventTime)?.trim()
      ? {
          eventTime: (updates.eventTime !== undefined ? updates.eventTime : existing.eventTime)!
            .trim()
            .slice(0, 60)
        }
      : {}),
    venue: (updates.venue ?? existing.venue).trim().slice(0, 180),
    description: (updates.description ?? existing.description).trim().slice(0, 3000),
    ...((updates.additionalInfo !== undefined ? updates.additionalInfo : existing.additionalInfo)?.trim()
      ? {
          additionalInfo: (
            updates.additionalInfo !== undefined ? updates.additionalInfo : existing.additionalInfo
          )!
            .trim()
            .slice(0, 1500)
        }
      : {}),
    photoUrl: (updates.photoUrl ?? existing.photoUrl).trim(),
    status: (updates.status ?? existing.status) === 'draft' ? 'draft' : 'published',
    ...((updates.publishAt !== undefined ? updates.publishAt : existing.publishAt)?.trim()
      ? {
          publishAt: toIsoString(
            (updates.publishAt !== undefined ? updates.publishAt : existing.publishAt)!.trim()
          )
        }
      : {}),
    createdByUid: existing.createdByUid || auth.currentUser!.uid,
    createdByEmail: existing.createdByEmail || auth.currentUser!.email || CEO_EMAIL,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString()
  });

  assertValidCeoAndEventPayload(merged);

  const approxBytes = new TextEncoder().encode(JSON.stringify(merged)).length;
  if (approxBytes > 950_000) {
    throw new Error(
      'Event image & text payload is too large for database storage. Please upload a smaller photo.'
    );
  }

  try {
    await setDoc(doc(db, 'events', existing.id), merged);
    memoryPublishedEvents = null;
    return merged;
  } catch (err: any) {
    if (String(err?.code || '') === 'permission-denied') {
      handleFirestoreError(err, OperationType.UPDATE, `events/${existing.id}`);
    }
    throw err;
  }
}

export async function deleteEventFromFirestore(eventId: string): Promise<void> {
  if (!isFirebaseCeoVerified()) {
    throw new Error(
      `Unauthorized: Only the verified NIGERIA CAMPUS MARKET CEO (${CEO_EMAIL}) can delete announcements.`
    );
  }
  try {
    await deleteDoc(doc(db, 'events', eventId));
    memoryPublishedEvents = null;
  } catch (err: any) {
    if (String(err?.code || '') === 'permission-denied') {
      handleFirestoreError(err, OperationType.DELETE, `events/${eventId}`);
    }
    throw err;
  }
}
