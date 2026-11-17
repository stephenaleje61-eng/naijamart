import fs from 'fs';
import path from 'path';
import { Product, User, SellerProfile } from './db.js';

const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
let firebaseConfig: any = {};
try {
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }
} catch (err) {
  console.error('[Firebase Server] Failed to read firebase-applet-config.json:', err);
}

const projectId = String(firebaseConfig?.projectId || 'zangamarket1').trim();
const apiKey = String(firebaseConfig?.apiKey || '').trim();
const configuredDbId: string | undefined =
  typeof firebaseConfig?.firestoreDatabaseId === 'string' && firebaseConfig.firestoreDatabaseId.trim().length > 0
    ? firebaseConfig.firestoreDatabaseId.trim()
    : undefined;

const primaryDbId = configuredDbId || '(default)';
const legacyDbId = configuredDbId ? '(default)' : null;

export interface LegacyDbStatus {
  checked: boolean;
  accessible: boolean;
  hasLegacyDb: boolean;
  errorCode?: string;
  errorMessage?: string;
  recoveredCount: number;
  legacyProductsCount: number;
}

class ServerFirestoreError extends Error {
  public code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'ServerFirestoreError';
    this.code = code;
  }
}

function mapRestStatusToCode(statusStr?: string, httpStatus?: number): string {
  const normalized = String(statusStr || '').toUpperCase();
  if (normalized === 'PERMISSION_DENIED' || httpStatus === 403) return 'permission-denied';
  if (normalized === 'NOT_FOUND' || httpStatus === 404) return 'not-found';
  if (normalized === 'UNAUTHENTICATED' || httpStatus === 401) return 'unauthenticated';
  if (normalized === 'INVALID_ARGUMENT' || httpStatus === 400) return 'invalid-argument';
  if (normalized === 'FAILED_PRECONDITION') return 'failed-precondition';
  if (normalized === 'ALREADY_EXISTS' || httpStatus === 409) return 'already-exists';
  if (normalized === 'RESOURCE_EXHAUSTED' || httpStatus === 429) return 'resource-exhausted';
  if (normalized === 'DEADLINE_EXCEEDED' || httpStatus === 504) return 'deadline-exceeded';
  if (normalized === 'UNAVAILABLE' || httpStatus === 503) return 'unavailable';
  return normalized ? normalized.toLowerCase().replace(/_/g, '-') : 'firestore/error';
}

export function formatServerFirestoreError(err: any): { code: string; message: string } {
  const code = String(err?.code || 'firestore/error');
  const rawMessage = String(err?.message || err || 'Unknown Firestore error');
  return {
    code,
    message: `[${code}] ${rawMessage}`
  };
}

function stripUndefined<T>(input: T): T {
  if (input === null || input === undefined) return input;
  if (Array.isArray(input)) {
    return input
      .filter((item) => item !== undefined)
      .map((item) => stripUndefined(item)) as unknown as T;
  }
  if (typeof input === 'object') {
    const proto = Object.getPrototypeOf(input);
    if (proto === Object.prototype || proto === null) {
      const out: Record<string, any> = {};
      for (const [key, val] of Object.entries(input as Record<string, any>)) {
        if (val !== undefined) {
          out[key] = stripUndefined(val);
        }
      }
      return out as T;
    }
  }
  return input;
}

function toIsoString(val: any): string {
  if (!val) return new Date().toISOString();
  if (typeof val === 'string') {
    const parsed = Date.parse(val);
    return isNaN(parsed) ? new Date().toISOString() : val;
  }
  if (typeof val === 'number') return new Date(val).toISOString();
  if (typeof val?.toDate === 'function') return val.toDate().toISOString();
  if (typeof val?.seconds === 'number') return new Date(val.seconds * 1000).toISOString();
  return new Date().toISOString();
}

// --- Stateless Firestore v1 REST encoding/decoding (avoids Node.js gRPC Listen idle stream errors) ---

function encodeFirestoreValue(value: any): Record<string, any> {
  if (value === null || value === undefined) {
    return { nullValue: null };
  }
  if (typeof value === 'boolean') {
    return { booleanValue: value };
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return { doubleValue: 0 };
    if (Number.isInteger(value)) return { integerValue: String(value) };
    return { doubleValue: value };
  }
  if (typeof value === 'string') {
    return { stringValue: value };
  }
  if (value instanceof Date) {
    return { timestampValue: value.toISOString() };
  }
  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value
          .filter((item) => item !== undefined)
          .map((item) => encodeFirestoreValue(item))
      }
    };
  }
  if (typeof value === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      if (v !== undefined) {
        fields[k] = encodeFirestoreValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

function decodeFirestoreValue(raw: any): any {
  if (!raw || typeof raw !== 'object') return null;
  if ('nullValue' in raw) return null;
  if ('booleanValue' in raw) return Boolean(raw.booleanValue);
  if ('integerValue' in raw) return Number(raw.integerValue);
  if ('doubleValue' in raw) return Number(raw.doubleValue);
  if ('stringValue' in raw) return String(raw.stringValue);
  if ('timestampValue' in raw) return String(raw.timestampValue);
  if ('referenceValue' in raw) return String(raw.referenceValue);
  if ('bytesValue' in raw) return String(raw.bytesValue);
  if ('geoPointValue' in raw) return raw.geoPointValue;
  if ('arrayValue' in raw) {
    const values = raw.arrayValue?.values;
    return Array.isArray(values) ? values.map((v: any) => decodeFirestoreValue(v)) : [];
  }
  if ('mapValue' in raw) {
    const fields = raw.mapValue?.fields || {};
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(fields)) {
      out[k] = decodeFirestoreValue(v);
    }
    return out;
  }
  return null;
}

export interface DecodedFirestoreDoc {
  id: string;
  data: Record<string, any>;
}

function decodeFirestoreDocument(docObj: any): DecodedFirestoreDoc {
  const fullName = String(docObj?.name || '');
  const id = fullName.split('/').pop() || '';
  const fields = docObj?.fields || {};
  const data: Record<string, any> = {};
  for (const [k, v] of Object.entries(fields)) {
    data[k] = decodeFirestoreValue(v);
  }
  return { id, data };
}

function encodeFieldsPayload(data: Record<string, any>): Record<string, any> {
  const cleaned = stripUndefined(data) || {};
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(cleaned)) {
    if (v !== undefined) {
      fields[k] = encodeFirestoreValue(v);
    }
  }
  return fields;
}

function buildDbBaseUrl(dbId: string): string {
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/${encodeURIComponent(dbId)}/documents`;
}

async function firestoreRestFetch(url: string, init: RequestInit = {}, timeoutMs = 15000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const separator = url.includes('?') ? '&' : '?';
    const authedUrl = apiKey ? `${url}${separator}key=${encodeURIComponent(apiKey)}` : url;
    const response = await fetch(authedUrl, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers || {})
      },
      signal: controller.signal
    });

    const text = await response.text();
    let json: any = {};
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = { message: text };
      }
    }

    if (!response.ok) {
      const errObj = Array.isArray(json) ? json[0]?.error : json?.error;
      const code = mapRestStatusToCode(errObj?.status, response.status);
      const message = String(errObj?.message || json?.message || `HTTP ${response.status} from Firestore`);
      throw new ServerFirestoreError(code, message);
    }

    return json;
  } catch (err: any) {
    if (err instanceof ServerFirestoreError) throw err;
    if (err?.name === 'AbortError') {
      throw new ServerFirestoreError('deadline-exceeded', 'Firestore REST request timed out.');
    }
    throw new ServerFirestoreError('unavailable', err?.message || 'Unable to reach Cloud Firestore.');
  } finally {
    clearTimeout(timer);
  }
}

export async function listCollectionDocuments(
  dbId: string,
  collectionName: string,
  batchSize = 300,
  maxDocs = 2000,
  authToken?: string
): Promise<DecodedFirestoreDoc[]> {
  const docs: DecodedFirestoreDoc[] = [];
  let pageToken: string | undefined;
  const headers: Record<string, string> = {};
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  while (docs.length < maxDocs) {
    const remaining = Math.min(batchSize, maxDocs - docs.length);
    const params = new URLSearchParams({ pageSize: String(remaining) });
    if (pageToken) params.set('pageToken', pageToken);

    const url = `${buildDbBaseUrl(dbId)}/${encodeURIComponent(collectionName)}?${params.toString()}`;
    const res = await firestoreRestFetch(url, { method: 'GET', headers });
    const rawDocs = Array.isArray(res?.documents) ? res.documents : [];
    for (const d of rawDocs) {
      docs.push(decodeFirestoreDocument(d));
    }

    if (!res?.nextPageToken || rawDocs.length === 0) break;
    pageToken = String(res.nextPageToken);
  }

  return docs;
}

export async function queryCollectionEquals(
  collectionName: string,
  filters: Array<{ field: string; value: string | number | boolean }>,
  maxLimit = 100,
  dbId = primaryDbId,
  authToken?: string
): Promise<DecodedFirestoreDoc[]> {
  const structuredQuery: any = {
    from: [{ collectionId: collectionName }],
    limit: maxLimit
  };

  if (filters.length === 1) {
    structuredQuery.where = {
      fieldFilter: {
        field: { fieldPath: filters[0].field },
        op: 'EQUAL',
        value: encodeFirestoreValue(filters[0].value)
      }
    };
  } else if (filters.length > 1) {
    structuredQuery.where = {
      compositeFilter: {
        op: 'AND',
        filters: filters.map((f) => ({
          fieldFilter: {
            field: { fieldPath: f.field },
            op: 'EQUAL',
            value: encodeFirestoreValue(f.value)
          }
        }))
      }
    };
  }

  const headers: Record<string, string> = {};
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const url = `${buildDbBaseUrl(dbId)}:runQuery`;
  const rows = await firestoreRestFetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ structuredQuery })
  });

  if (!Array.isArray(rows)) return [];
  const docs: DecodedFirestoreDoc[] = [];
  for (const row of rows) {
    if (row?.document) {
      docs.push(decodeFirestoreDocument(row.document));
    }
  }
  return docs;
}

export async function setFirestoreDocument(
  collectionName: string,
  docId: string,
  data: Record<string, any>,
  merge = true,
  dbId = primaryDbId,
  authToken?: string
): Promise<void> {
  const fields = encodeFieldsPayload(data);
  const params = new URLSearchParams();
  if (merge) {
    for (const key of Object.keys(fields)) {
      const safePath = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key) ? key : `\`${key.replace(/`/g, '')}\``;
      params.append('updateMask.fieldPaths', safePath);
    }
  }
  const headers: Record<string, string> = {};
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  const qs = params.toString();
  const url = `${buildDbBaseUrl(dbId)}/${encodeURIComponent(collectionName)}/${encodeURIComponent(docId)}${qs ? `?${qs}` : ''}`;
  await firestoreRestFetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ fields })
  });
}

export async function updateFirestoreDocument(
  collectionName: string,
  docId: string,
  data: Record<string, any>,
  dbId = primaryDbId,
  authToken?: string
): Promise<void> {
  const fields = encodeFieldsPayload(data);
  const params = new URLSearchParams({ 'currentDocument.exists': 'true' });
  for (const key of Object.keys(fields)) {
    const safePath = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key) ? key : `\`${key.replace(/`/g, '')}\``;
    params.append('updateMask.fieldPaths', safePath);
  }
  const headers: Record<string, string> = {};
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  const url = `${buildDbBaseUrl(dbId)}/${encodeURIComponent(collectionName)}/${encodeURIComponent(docId)}?${params.toString()}`;
  await firestoreRestFetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ fields })
  });
}

export async function deleteFirestoreDocument(
  collectionName: string,
  docId: string,
  dbId = primaryDbId,
  authToken?: string
): Promise<void> {
  const headers: Record<string, string> = {};
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  const url = `${buildDbBaseUrl(dbId)}/${encodeURIComponent(collectionName)}/${encodeURIComponent(docId)}`;
  await firestoreRestFetch(url, { method: 'DELETE', headers });
}

function mapLegacyCategory(raw: any): string {
  const value = String(raw || '').toLowerCase().trim();
  if (!value) return 'hostel-items';
  if (['hostel-items', 'textbooks-past-questions', 'food', 'electronics', 'fashion', 'gas-cooking'].includes(value)) {
    return value;
  }
  if (value.includes('gas') || value.includes('kitchen') || value.includes('cook') || value.includes('burner') || value.includes('kettle')) return 'gas-cooking';
  if (value.includes('textbook') || value.includes('book') || value.includes('education') || value.includes('handout') || value.includes('past question')) return 'textbooks-past-questions';
  if (value.includes('food') || value.includes('grocer') || value.includes('provision') || value.includes('snack') || value.includes('meal')) return 'food';
  if (value.includes('phone') || value.includes('tablet') || value.includes('gadget') || value.includes('computer') || value.includes('laptop') || value.includes('electronic')) return 'electronics';
  if (value.includes('fashion') || value.includes('cloth') || value.includes('wear') || value.includes('shirt') || value.includes('shoe') || value.includes('bag') || value.includes('beauty')) return 'fashion';
  return 'hostel-items';
}

function normalizeServerProduct(id: string, data: any): Product {
  const images: string[] = Array.isArray(data?.images)
    ? data.images.filter((i: any) => typeof i === 'string' && i.trim().length > 5 && !i.startsWith('blob:') && !i.includes('persistent_image_proof'))
    : [];
  if (typeof data?.imageUrl === 'string' && data.imageUrl.trim().length > 5 && !data.imageUrl.startsWith('blob:') && !images.includes(data.imageUrl.trim())) {
    images.unshift(data.imageUrl.trim());
  }

  const rawStatus = String(data?.status || 'active').toLowerCase().trim();
  const status: Product['status'] =
    rawStatus === '' ||
    rawStatus === 'approved' ||
    rawStatus === 'active' ||
    rawStatus === 'available' ||
    rawStatus === 'published' ||
    rawStatus === 'live'
      ? 'active'
      : rawStatus === 'sold'
      ? 'sold'
      : rawStatus === 'expired'
      ? 'expired'
      : 'unavailable';

  const price = Number(data?.price) || 0;
  const originalPrice =
    data?.originalPrice && Number(data.originalPrice) > price ? Number(data.originalPrice) : undefined;

  return {
    id,
    sellerId: String(data?.sellerId || data?.userId || 'campus-seller'),
    sellerName: String(data?.sellerName || data?.userName || 'FUWUKARI Student'),
    shopName: String(data?.shopName || data?.sellerName || 'Campus Seller'),
    whatsappNumber: String(data?.whatsappNumber || data?.whatsapp || data?.phone || ''),
    title: String(data?.title || 'Untitled Item').trim(),
    description: String(data?.description || '').trim(),
    price,
    ...(originalPrice !== undefined ? { originalPrice } : {}),
    categoryId: mapLegacyCategory(data?.categoryId || data?.category),
    condition: data?.condition === 'used' ? 'used' : 'new',
    images,
    imageUrl: images[0] || '',
    state: String(data?.state || 'Taraba').trim(),
    city: String(data?.city || data?.location || 'Wukari').trim(),
    quantity: Math.max(1, Number(data?.quantity) || 1),
    status,
    moderationStatus: data?.moderationStatus || (rawStatus === 'rejected' ? 'rejected' : 'approved'),
    moderationFlags: Array.isArray(data?.moderationFlags) ? data.moderationFlags : undefined,
    views: Number(data?.views) || 0,
    whatsappClicks: Number(data?.whatsappClicks) || 0,
    isFeatured: Boolean(data?.isFeatured),
    createdAt: toIsoString(data?.createdAt),
    updatedAt: toIsoString(data?.updatedAt || data?.createdAt)
  };
}

export class FirestoreSync {
  private static instance: FirestoreSync;
  public initialized = false;
  public legacyDbStatus: LegacyDbStatus = {
    checked: false,
    accessible: false,
    hasLegacyDb: Boolean(legacyDbId),
    recoveredCount: 0,
    legacyProductsCount: 0
  };

  public static getInstance(): FirestoreSync {
    if (!FirestoreSync.instance) {
      FirestoreSync.instance = new FirestoreSync();
    }
    return FirestoreSync.instance;
  }

  // Load ALL genuine products from primary Cloud Firestore (throws on error so failures are never masked)
  async loadProducts(): Promise<Product[]> {
    const primaryDocs = await listCollectionDocuments(primaryDbId, 'products');
    const seenIds = new Set<string>();
    const list: Product[] = [];

    for (const d of primaryDocs) {
      if (d.id.startsWith('prod_live_seed')) continue;
      seenIds.add(d.id);
      list.push(normalizeServerProduct(d.id, d.data));
    }

    // Best-effort additive read + permanent migration from legacy (default) database if accessible
    if (legacyDbId) {
      try {
        const legacyDocs = await listCollectionDocuments(legacyDbId, 'products');
        let legacyAdded = 0;
        const toMigrate: Product[] = [];
        for (const d of legacyDocs) {
          if (d.id.startsWith('prod_live_seed')) continue;
          const normalized = normalizeServerProduct(d.id, d.data);
          if (!seenIds.has(d.id)) {
            seenIds.add(d.id);
            list.push(normalized);
            toMigrate.push(normalized);
            legacyAdded++;
          }
        }
        this.legacyDbStatus = {
          checked: true,
          accessible: true,
          hasLegacyDb: true,
          recoveredCount: legacyAdded,
          legacyProductsCount: legacyDocs.filter((d) => !d.id.startsWith('prod_live_seed')).length
        };

        for (const prod of toMigrate) {
          this.saveProduct(prod).catch((err) => {
            console.warn(`[FirestoreSync] Could not migrate legacy product ${prod.id}:`, err?.message || err);
          });
        }

        if (legacyAdded > 0) {
          console.log(`[FirestoreSync] Recovered & migrated ${legacyAdded} legacy products from (default) database.`);
        }
      } catch (legacyErr: any) {
        const code = String(legacyErr?.code || 'unknown');
        const msg = String(legacyErr?.message || legacyErr);
        this.legacyDbStatus = {
          checked: true,
          accessible: false,
          hasLegacyDb: true,
          errorCode: code,
          errorMessage: msg,
          recoveredCount: 0,
          legacyProductsCount: 0
        };
        console.warn(
          `[FirestoreSync] Legacy (default) database unreadable (${code}: ${msg}). Primary DB active with ${list.length} products.`
        );
      }
    }

    console.log(`[FirestoreSync] Loaded ${list.length} genuine products from Cloud Firestore (${configuredDbId || 'default'}).`);
    return list;
  }

  // Save or update a product in Firestore
  async saveProduct(product: Product): Promise<void> {
    try {
      await setFirestoreDocument(
        'products',
        product.id,
        {
          ...product,
          updatedAt: product.updatedAt || new Date().toISOString()
        },
        true
      );
      console.log(`[FirestoreSync] Saved product ${product.id} ("${product.title}") to permanent Firestore.`);
    } catch (err) {
      console.error(`[FirestoreSync] Error saving product ${product.id} to Firestore:`, err);
      throw err;
    }
  }

  // Delete product from Firestore
  async deleteProduct(productId: string): Promise<void> {
    try {
      await deleteFirestoreDocument('products', productId);
      console.log(`[FirestoreSync] Deleted product ${productId} from permanent Firestore.`);
    } catch (err) {
      console.error(`[FirestoreSync] Error deleting product ${productId} from Firestore:`, err);
      throw err;
    }
  }

  // Save User
  async saveUser(user: User): Promise<void> {
    try {
      await setFirestoreDocument('users', user.id, user, true);
      console.log(`[FirestoreSync] Saved user ${user.id} (${user.email}) to Firestore.`);
    } catch (err) {
      console.error(`[FirestoreSync] Error saving user to Firestore:`, err);
      throw err;
    }
  }

  // Load Users from Firestore (with legacy (default) fallback merge)
  async loadUsers(): Promise<User[]> {
    const docs = await listCollectionDocuments(primaryDbId, 'users');
    const seen = new Set<string>();
    const list: User[] = [];
    const mapUser = (d: DecodedFirestoreDoc): User | null => {
      const data = d.data;
      if (!data?.email && !data?.name) return null;
      return {
        id: d.id,
        name: String(data.name || data.displayName || 'FUWUKARI Student'),
        email: String(data.email || '').toLowerCase().trim(),
        passwordHash: String(data.passwordHash || ''),
        role: data.role === 'admin' ? 'admin' : data.role === 'seller' ? 'seller' : 'buyer',
        phone: data.phone || '',
        whatsappNumber: data.whatsappNumber || data.phone || '',
        state: data.state || 'Taraba',
        city: data.city || 'Wukari',
        avatarUrl: data.avatarUrl || data.photoURL,
        isSuspended: Boolean(data.isSuspended),
        suspensionReason: data.suspensionReason,
        createdAt: toIsoString(data.createdAt)
      };
    };

    for (const d of docs) {
      const u = mapUser(d);
      if (u) {
        seen.add(u.id);
        list.push(u);
      }
    }

    if (legacyDbId) {
      try {
        const legacyDocs = await listCollectionDocuments(legacyDbId, 'users');
        for (const d of legacyDocs) {
          if (seen.has(d.id)) continue;
          const u = mapUser(d);
          if (u && u.role !== 'admin') {
            seen.add(u.id);
            list.push(u);
            this.saveUser(u).catch(() => {});
          }
        }
      } catch {
        // Legacy DB unreadable
      }
    }

    return list;
  }

  // Save Seller Profile
  async saveSellerProfile(profile: SellerProfile): Promise<void> {
    try {
      await setFirestoreDocument('sellerProfiles', profile.id, profile, true);
      console.log(`[FirestoreSync] Saved seller profile ${profile.id} to Firestore.`);
    } catch (err) {
      console.error(`[FirestoreSync] Error saving seller profile to Firestore:`, err);
      throw err;
    }
  }

  // Load Seller Profiles from Firestore (with legacy (default) fallback merge)
  async loadSellerProfiles(): Promise<SellerProfile[]> {
    const docs = await listCollectionDocuments(primaryDbId, 'sellerProfiles');
    const seen = new Set<string>();
    const list: SellerProfile[] = [];
    const mapProfile = (d: DecodedFirestoreDoc): SellerProfile | null => {
      const data = d.data;
      if (!data?.userId || !data?.shopName) return null;
      return {
        id: d.id,
        userId: String(data.userId),
        shopName: String(data.shopName),
        shopSlug: String(data.shopSlug || ''),
        shopLogo: data.shopLogo,
        coverImage: data.coverImage,
        description: String(data.description || ''),
        whatsappNumber: String(data.whatsappNumber || ''),
        state: String(data.state || 'Taraba'),
        city: String(data.city || 'Wukari'),
        address: data.address,
        isVerified: Boolean(data.isVerified),
        isSuspended: Boolean(data.isSuspended),
        createdAt: toIsoString(data.createdAt)
      };
    };

    for (const d of docs) {
      const p = mapProfile(d);
      if (p) {
        seen.add(p.id);
        list.push(p);
      }
    }

    if (legacyDbId) {
      try {
        const legacyDocs = await listCollectionDocuments(legacyDbId, 'sellerProfiles');
        for (const d of legacyDocs) {
          if (seen.has(d.id)) continue;
          const p = mapProfile(d);
          if (p) {
            seen.add(p.id);
            list.push(p);
            this.saveSellerProfile(p).catch(() => {});
          }
        }
      } catch {
        // Legacy DB unreadable
      }
    }

    return list;
  }
}

export const firestoreSync = FirestoreSync.getInstance();
