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
  updateDoc
} from 'firebase/firestore';
import { auth, db, isValidImageUrl, stripUndefined, toIsoString } from './firebase.js';
import {
  DEFAULT_INSTITUTION_CAMPUS,
  DEFAULT_INSTITUTION_ID,
  VERIFIED_NIGERIAN_INSTITUTIONS,
  belongsToInstitution,
  getInstitutionById
} from '../constants/institutions.js';
import {
  AccountType,
  AccommodationProperty,
  HouseAgentProfile,
  HuxCategory,
  HuxType,
  Institution,
  InstitutionUserProfile
} from '../types.js';

const SELECTED_INSTITUTION_KEY = 'fu_market_selected_institution_v1';
const SELECTED_CAMPUS_KEY = 'fu_market_selected_campus_v1';

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

export function getSelectedInstitutionId(): string {
  if (typeof window === 'undefined') return DEFAULT_INSTITUTION_ID;
  try {
    const saved = localStorage.getItem(SELECTED_INSTITUTION_KEY);
    if (saved && saved.trim()) return saved.trim();
  } catch {
    // Non-blocking
  }
  return DEFAULT_INSTITUTION_ID;
}

export function setSelectedInstitutionId(institutionId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SELECTED_INSTITUTION_KEY, institutionId || DEFAULT_INSTITUTION_ID);
  } catch {
    // Non-blocking
  }
}

export function getSelectedCampus(institutionId?: string): string {
  const inst = getInstitutionById(institutionId || getSelectedInstitutionId());
  if (typeof window === 'undefined') return inst.campus || DEFAULT_INSTITUTION_CAMPUS;
  try {
    const saved = localStorage.getItem(SELECTED_CAMPUS_KEY);
    if (saved && saved.trim()) return saved.trim();
  } catch {
    // Non-blocking
  }
  return inst.campus || DEFAULT_INSTITUTION_CAMPUS;
}

export function setSelectedCampus(campus: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (campus && campus.trim()) {
      localStorage.setItem(SELECTED_CAMPUS_KEY, campus.trim());
    } else {
      localStorage.removeItem(SELECTED_CAMPUS_KEY);
    }
  } catch {
    // Non-blocking
  }
}

// ============================================================================
// INSTITUTIONS DIRECTORY (Real Firestore + Verified National Fallback)
// ============================================================================
function normalizeInstitutionDoc(id: string, data: any): Institution {
  const campuses =
    Array.isArray(data?.campuses) && data.campuses.length > 0
      ? data.campuses.map((c: unknown) => String(c))
      : [String(data?.campus || `${String(data?.location || 'Main')} Campus`)];
  return {
    id: String(data?.id || id),
    name: String(data?.name || id),
    shortName: String(data?.shortName || data?.name || id),
    type: data?.type || 'Federal University',
    state: String(data?.state || 'Taraba'),
    location: String(data?.location || ''),
    campuses,
    campus: String(data?.campus || campuses[0] || 'Main Campus'),
    status: data?.status === 'inactive' ? 'inactive' : 'active',
    isDefault: Boolean(data?.isDefault || id === DEFAULT_INSTITUTION_ID),
    ...(data?.logoUrl ? { logoUrl: String(data.logoUrl) } : {}),
    ...(data?.bannerUrl ? { bannerUrl: String(data.bannerUrl) } : {}),
    ...(data?.description ? { description: String(data.description) } : {}),
    ...(data?.primaryColor ? { primaryColor: String(data.primaryColor) } : {}),
    ...(data?.secondaryColor ? { secondaryColor: String(data.secondaryColor) } : {}),
    ...(data?.updatedAt ? { updatedAt: toIsoString(data.updatedAt) } : {}),
    ...(data?.updatedBy ? { updatedBy: String(data.updatedBy) } : {})
  };
}

function mergeInstitutionsWithVerified(
  firestoreDocs: Institution[],
  includeInactive = false
): Institution[] {
  const map = new Map<string, Institution>();
  for (const inst of VERIFIED_NIGERIAN_INSTITUTIONS) {
    map.set(inst.id, inst);
  }
  for (const docItem of firestoreDocs) {
    if (docItem.id && docItem.name) {
      map.set(docItem.id, docItem);
    }
  }
  return Array.from(map.values())
    .filter((i) => includeInactive || i.status !== 'inactive')
    .sort((a, b) => {
      if (a.id === DEFAULT_INSTITUTION_ID) return -1;
      if (b.id === DEFAULT_INSTITUTION_ID) return 1;
      return a.name.localeCompare(b.name);
    });
}

export function subscribeToInstitutions(
  callback: (institutions: Institution[]) => void
): () => void {
  callback(mergeInstitutionsWithVerified([], false));
  try {
    return onSnapshot(
      collection(db, 'institutions'),
      (snap) => {
        const remote: Institution[] = snap.docs.map((d) => normalizeInstitutionDoc(d.id, d.data()));
        callback(mergeInstitutionsWithVerified(remote, false));
      },
      () => {
        callback(mergeInstitutionsWithVerified([], false));
      }
    );
  } catch {
    return () => {};
  }
}

export function subscribeToAllInstitutionsForCeo(
  callback: (institutions: Institution[]) => void
): () => void {
  callback(mergeInstitutionsWithVerified([], true));
  try {
    return onSnapshot(
      collection(db, 'institutions'),
      (snap) => {
        const remote: Institution[] = snap.docs.map((d) => normalizeInstitutionDoc(d.id, d.data()));
        callback(mergeInstitutionsWithVerified(remote, true));
      },
      () => {
        callback(mergeInstitutionsWithVerified([], true));
      }
    );
  } catch {
    return () => {};
  }
}

export async function ceoSaveInstitution(
  inst: Partial<Institution> & {
    id?: string;
    name: string;
    shortName: string;
    type: Institution['type'];
    state: string;
    location: string;
    campuses?: string[];
    campus?: string;
  }
): Promise<Institution> {
  const cleanId = (
    inst.id ||
    inst.shortName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  )
    .trim()
    .slice(0, 64);

  if (!cleanId) throw new Error('Institution ID or short name is required.');
  if (!inst.name.trim()) throw new Error('Institution full name is required.');

  const campuses =
    Array.isArray(inst.campuses) && inst.campuses.length > 0
      ? inst.campuses.map((c) => c.trim()).filter(Boolean)
      : [inst.campus?.trim() || `${inst.location.trim() || 'Main'} Campus`];

  const now = new Date().toISOString();
  const payload: Institution = stripUndefined({
    id: cleanId,
    name: inst.name.trim().slice(0, 160),
    shortName: inst.shortName.trim().slice(0, 48),
    type: inst.type,
    state: inst.state.trim().slice(0, 64),
    location: inst.location.trim().slice(0, 120),
    campuses,
    campus: inst.campus?.trim() || campuses[0],
    status: inst.status === 'inactive' ? 'inactive' : 'active',
    isDefault: Boolean(inst.isDefault || cleanId === DEFAULT_INSTITUTION_ID),
    ...(inst.logoUrl !== undefined ? { logoUrl: inst.logoUrl.trim() } : {}),
    ...(inst.bannerUrl !== undefined ? { bannerUrl: inst.bannerUrl.trim() } : {}),
    ...(inst.description !== undefined ? { description: inst.description.trim().slice(0, 600) } : {}),
    ...(inst.primaryColor !== undefined ? { primaryColor: inst.primaryColor.trim() } : {}),
    ...(inst.secondaryColor !== undefined ? { secondaryColor: inst.secondaryColor.trim() } : {}),
    updatedAt: now,
    updatedBy: auth.currentUser?.email || 'stephenaleje61@gmail.com'
  });

  try {
    await setDoc(doc(db, 'institutions', cleanId), payload, { merge: true });
    return payload;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `institutions/${cleanId}`);
  }
}

export async function ceoToggleInstitutionStatus(
  id: string,
  status: 'active' | 'inactive'
): Promise<void> {
  if (!id) throw new Error('Institution ID is required.');
  if (id === DEFAULT_INSTITUTION_ID && status === 'inactive') {
    throw new Error('Default anchor institution cannot be deactivated.');
  }
  const existing = VERIFIED_NIGERIAN_INSTITUTIONS.find((i) => i.id === id);
  try {
    await setDoc(
      doc(db, 'institutions', id),
      stripUndefined({
        ...(existing || { id }),
        status,
        updatedAt: new Date().toISOString(),
        updatedBy: auth.currentUser?.email || 'stephenaleje61@gmail.com'
      }),
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `institutions/${id}`);
  }
}

// Non-destructive CEO-only sync: ONLY adds missing verified institutions, NEVER overwrites/deletes existing records
export async function syncVerifiedInstitutionsIfMissing(): Promise<{ added: number }> {
  const existingSnap = await getDocs(collection(db, 'institutions'));
  const existingIds = new Set(existingSnap.docs.map((d) => d.id));
  let added = 0;

  for (const inst of VERIFIED_NIGERIAN_INSTITUTIONS) {
    if (!existingIds.has(inst.id)) {
      await setDoc(doc(db, 'institutions', inst.id), stripUndefined(inst));
      added++;
    }
  }
  return { added };
}

// ============================================================================
// ACCOMMODATION COLLECTION (Merges cleanly with existing FUWUKARI hux collection)
// ============================================================================
function normalizeAccommodationDoc(
  docId: string,
  data: any,
  sourceCollection: 'hux' | 'accommodation'
): AccommodationProperty {
  const imgs = Array.isArray(data?.images)
    ? data.images.filter((i: unknown) => isValidImageUrl(i))
    : [];
  const primaryImage =
    data?.imageUrl && isValidImageUrl(data.imageUrl) ? String(data.imageUrl) : imgs[0] || '';
  const institutionId = String(data?.institutionId || DEFAULT_INSTITUTION_ID).trim() || DEFAULT_INSTITUTION_ID;

  return {
    id: docId,
    category: (data?.category === 'roommate' ? 'roommate' : 'rent') as HuxCategory,
    title: String(data?.title || 'Accommodation Listing').trim(),
    location: String(data?.location || '').trim(),
    institutionId,
    campus: data?.campus ? String(data.campus).trim() : undefined,
    distanceToCampus: data?.distanceToCampus ? String(data.distanceToCampus).trim() : undefined,
    price: Math.max(0, Number(data?.price) || 0),
    pricePer: (['year', 'semester', 'month'].includes(data?.pricePer)
      ? data.pricePer
      : 'year') as AccommodationProperty['pricePer'],
    phone: String(data?.phone || '').trim(),
    whatsapp: String(data?.whatsapp || data?.phone || '').trim(),
    images: imgs,
    imageUrl: primaryImage,
    description: String(data?.description || '').trim(),
    type: (data?.type || 'Self-contain') as HuxType,
    rooms: data?.rooms ? Number(data.rooms) : 1,
    facilities: Array.isArray(data?.facilities) ? data.facilities.map(String) : [],
    isAvailable: data?.isAvailable !== false,
    isAgent: Boolean(data?.isAgent),
    agentName: data?.agentName ? String(data.agentName).trim() : undefined,
    agentId: data?.agentId ? String(data.agentId) : undefined,
    ceoVerified: Boolean(data?.ceoVerified || data?.isVerified),
    isVerified: Boolean(data?.isVerified || data?.ceoVerified),
    userId: String(data?.userId || ''),
    userName: String(data?.userName || 'Student / Agent').trim(),
    matricNumber: data?.matricNumber ? String(data.matricNumber).trim() : undefined,
    sourceCollection,
    createdAt: data?.createdAt ? toIsoString(data.createdAt) : new Date().toISOString(),
    updatedAt: data?.updatedAt ? toIsoString(data.updatedAt) : undefined,
    savedCount: Number(data?.savedCount) || 0
  };
}

export function subscribeToInstitutionAccommodation(
  institutionId: string,
  category: HuxCategory | 'all',
  callback: (listings: AccommodationProperty[]) => void
): () => void {
  let accDocs: AccommodationProperty[] = [];
  let huxDocs: AccommodationProperty[] = [];

  const emit = () => {
    const mergedMap = new Map<string, AccommodationProperty>();
    for (const item of [...huxDocs, ...accDocs]) {
      if (!belongsToInstitution(item.institutionId, institutionId)) continue;
      if (category !== 'all' && item.category !== category) continue;
      mergedMap.set(item.id, item);
    }
    const sorted = Array.from(mergedMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    callback(sorted);
  };

  let unsubAcc = () => {};
  let unsubHux = () => {};

  try {
    unsubAcc = onSnapshot(
      query(collection(db, 'accommodation'), orderBy('createdAt', 'desc'), limit(120)),
      (snap) => {
        accDocs = snap.docs.map((d) => normalizeAccommodationDoc(d.id, d.data(), 'accommodation'));
        emit();
      },
      (err) => {
        console.warn('[subscribeToAccommodation warning]:', err?.message || err);
        emit();
      }
    );
  } catch {
    // Non-blocking
  }

  try {
    unsubHux = onSnapshot(
      query(collection(db, 'hux'), orderBy('createdAt', 'desc'), limit(120)),
      (snap) => {
        huxDocs = snap.docs.map((d) => normalizeAccommodationDoc(d.id, d.data(), 'hux'));
        emit();
      },
      () => {
        emit();
      }
    );
  } catch {
    // Non-blocking
  }

  return () => {
    unsubAcc();
    unsubHux();
  };
}

export async function createAccommodationProperty(
  data: Omit<AccommodationProperty, 'id' | 'createdAt' | 'sourceCollection'>
): Promise<AccommodationProperty> {
  const targetCollection =
    !data.institutionId || data.institutionId === DEFAULT_INSTITUTION_ID ? 'accommodation' : 'accommodation';
  const id = `acc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();

  const cleanedImages = Array.isArray(data.images)
    ? data.images.filter((img) => isValidImageUrl(img))
    : [];

  const payload: AccommodationProperty = stripUndefined({
    ...data,
    id,
    institutionId: data.institutionId || getSelectedInstitutionId(),
    campus: data.campus || getSelectedCampus(data.institutionId),
    images: cleanedImages,
    imageUrl: cleanedImages[0] || '',
    isAvailable: data.isAvailable !== false,
    sourceCollection: targetCollection,
    createdAt: now,
    updatedAt: now,
    savedCount: 0
  });

  try {
    await setDoc(doc(db, targetCollection, id), stripUndefined(payload));
    return payload;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `${targetCollection}/${id}`);
  }
}

export async function updateAccommodationAvailability(
  listing: Pick<AccommodationProperty, 'id' | 'sourceCollection'>,
  updates: Partial<AccommodationProperty>
): Promise<void> {
  const colName = listing.sourceCollection === 'hux' ? 'hux' : 'accommodation';
  try {
    await updateDoc(
      doc(db, colName, listing.id),
      stripUndefined({
        ...updates,
        updatedAt: new Date().toISOString()
      })
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${colName}/${listing.id}`);
  }
}

export async function deleteAccommodationProperty(
  listing: Pick<AccommodationProperty, 'id' | 'sourceCollection'>
): Promise<void> {
  const colName = listing.sourceCollection === 'hux' ? 'hux' : 'accommodation';
  try {
    await deleteDoc(doc(db, colName, listing.id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${colName}/${listing.id}`);
  }
}

// ============================================================================
// HOUSE AGENTS & LANDLORDS DIRECTORY (houseAgents collection)
// ============================================================================
function sanitizeHouseAgentDoc(id: string, data: any): HouseAgentProfile {
  return {
    id,
    userId: String(data?.userId || id),
    agentName: String(data?.agentName || 'Campus House Agent').trim(),
    agencyName: data?.agencyName ? String(data.agencyName).trim() : undefined,
    institutionId: String(data?.institutionId || DEFAULT_INSTITUTION_ID).trim(),
    campus: String(data?.campus || DEFAULT_INSTITUTION_CAMPUS).trim(),
    areaCovered: String(data?.areaCovered || '').trim(),
    phone: String(data?.phone || '').trim(),
    whatsapp: String(data?.whatsapp || data?.phone || '').trim(),
    bio: String(data?.bio || '').trim(),
    photoUrl: data?.photoUrl ? String(data.photoUrl).trim() : undefined,
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
}

export function subscribeToHouseAgents(
  institutionId: string,
  callback: (agents: HouseAgentProfile[]) => void
): () => void {
  try {
    return onSnapshot(
      query(collection(db, 'houseAgents'), limit(150)),
      (snap) => {
        const list = snap.docs
          .map((d) => sanitizeHouseAgentDoc(d.id, d.data()))
          .filter((a) => a.status !== 'suspended' && belongsToInstitution(a.institutionId, institutionId))
          .sort((a, b) => {
            if (Boolean(b.ceoVerified) !== Boolean(a.ceoVerified)) {
              return b.ceoVerified ? 1 : -1;
            }
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });
        callback(list);
      },
      (err) => {
        console.warn('[subscribeToHouseAgents warning]:', err?.message || err);
        callback([]);
      }
    );
  } catch {
    return () => {};
  }
}

export async function upsertHouseAgentProfile(input: {
  id?: string;
  userId: string;
  agentName: string;
  agencyName?: string;
  institutionId: string;
  campus: string;
  areaCovered: string;
  phone: string;
  whatsapp: string;
  bio: string;
  photoUrl?: string;
  roleType: 'house_agent' | 'landlord';
}): Promise<HouseAgentProfile> {
  const id = input.id || `agent_${input.userId.replace(/[^a-zA-Z0-9_-]/g, '_')}`.slice(0, 120);
  const now = new Date().toISOString();

  let existingCreatedAt = now;
  try {
    const existingSnap = await getDoc(doc(db, 'houseAgents', id));
    if (existingSnap.exists()) {
      existingCreatedAt = toIsoString(existingSnap.data()?.createdAt || now);
    }
  } catch {
    // proceed with create
  }

  const payload = stripUndefined({
    id,
    userId: input.userId,
    agentName: input.agentName.trim().slice(0, 120),
    ...(input.agencyName?.trim() ? { agencyName: input.agencyName.trim().slice(0, 140) } : {}),
    institutionId: input.institutionId || DEFAULT_INSTITUTION_ID,
    campus: input.campus || DEFAULT_INSTITUTION_CAMPUS,
    areaCovered: input.areaCovered.trim().slice(0, 180),
    phone: input.phone.trim().slice(0, 40),
    whatsapp: input.whatsapp.trim().slice(0, 40),
    bio: input.bio.trim().slice(0, 1000),
    ...(input.photoUrl?.trim() ? { photoUrl: input.photoUrl.trim() } : {}),
    roleType: input.roleType,
    status: 'active' as const,
    createdAt: existingCreatedAt,
    updatedAt: now
  });

  try {
    await setDoc(doc(db, 'houseAgents', id), payload, { merge: true });
    return sanitizeHouseAgentDoc(id, payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `houseAgents/${id}`);
  }
}

// ============================================================================
// INSTITUTION USER PROFILES (institutionUsers collection + users sync)
// ============================================================================
export async function upsertInstitutionUserProfile(params: {
  userId: string;
  name: string;
  email?: string;
  phone?: string;
  whatsappNumber?: string;
  institutionId: string;
  campus: string;
  accountType: AccountType;
  department?: string;
  preferredContactMethod?: 'whatsapp' | 'phone' | 'both';
}): Promise<InstitutionUserProfile> {
  const docId = `${params.userId}_${params.institutionId}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
  const now = new Date().toISOString();

  const instProfile: InstitutionUserProfile = stripUndefined({
    id: docId,
    userId: params.userId,
    institutionId: params.institutionId || DEFAULT_INSTITUTION_ID,
    campus: params.campus || DEFAULT_INSTITUTION_CAMPUS,
    name: params.name.trim().slice(0, 120),
    ...(params.email ? { email: params.email.trim().toLowerCase() } : {}),
    ...(params.phone ? { phone: params.phone.trim().slice(0, 40) } : {}),
    ...(params.whatsappNumber ? { whatsappNumber: params.whatsappNumber.trim().slice(0, 40) } : {}),
    accountType: params.accountType || 'student',
    ...(params.department ? { department: params.department.trim().slice(0, 120) } : {}),
    preferredContactMethod: params.preferredContactMethod || 'whatsapp',
    createdAt: now,
    updatedAt: now
  });

  try {
    await setDoc(doc(db, 'institutionUsers', docId), instProfile, { merge: true });
    await setDoc(
      doc(db, 'users', params.userId),
      stripUndefined({
        name: instProfile.name,
        institutionId: instProfile.institutionId,
        campus: instProfile.campus,
        accountType: instProfile.accountType,
        ...(instProfile.department !== undefined ? { department: instProfile.department } : {}),
        ...(instProfile.phone ? { phone: instProfile.phone } : {}),
        ...(instProfile.whatsappNumber ? { whatsappNumber: instProfile.whatsappNumber } : {}),
        preferredContactMethod: instProfile.preferredContactMethod,
        updatedAt: now
      }),
      { merge: true }
    ).catch(() => {});
    return instProfile;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `institutionUsers/${docId}`);
  }
}
