import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  limit,
  startAfter,
  Query,
  QuerySnapshot,
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore';
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

export const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const configuredDbId: string | undefined =
  typeof firebaseConfig?.firestoreDatabaseId === 'string' && firebaseConfig.firestoreDatabaseId.trim().length > 0
    ? firebaseConfig.firestoreDatabaseId.trim()
    : undefined;

// Primary Firestore database (governed by firestore.rules deployed to configuredDbId)
export const firestoreDb = configuredDbId
  ? getFirestore(firebaseApp, configuredDbId)
  : getFirestore(firebaseApp);

// Optional read-only handle for legacy (default) DB if rules/test mode allow reading it
const legacyDefaultDb = configuredDbId ? getFirestore(firebaseApp) : null;

export interface LegacyDbStatus {
  checked: boolean;
  accessible: boolean;
  hasLegacyDb: boolean;
  errorCode?: string;
  errorMessage?: string;
  recoveredCount: number;
  legacyProductsCount: number;
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

async function fetchAllDocsPaginated(
  targetDb: ReturnType<typeof getFirestore>,
  collectionName: string,
  batchSize = 300,
  maxDocs = 2000
): Promise<QueryDocumentSnapshot<DocumentData>[]> {
  const docs: QueryDocumentSnapshot<DocumentData>[] = [];
  let lastDoc: QueryDocumentSnapshot<DocumentData> | null = null;
  while (docs.length < maxDocs) {
    const q: Query<DocumentData> = lastDoc
      ? query(collection(targetDb, collectionName), startAfter(lastDoc), limit(batchSize))
      : query(collection(targetDb, collectionName), limit(batchSize));
    const snap: QuerySnapshot<DocumentData> = await getDocs(q);
    if (snap.empty) break;
    snap.forEach((d) => docs.push(d));
    if (snap.size < batchSize) break;
    lastDoc = snap.docs[snap.docs.length - 1];
  }
  return docs;
}

export class FirestoreSync {
  private static instance: FirestoreSync;
  public initialized = false;
  public legacyDbStatus: LegacyDbStatus = {
    checked: false,
    accessible: false,
    hasLegacyDb: Boolean(legacyDefaultDb),
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
    const primaryDocs = await fetchAllDocsPaginated(firestoreDb, 'products');
    const seenIds = new Set<string>();
    const list: Product[] = [];

    for (const d of primaryDocs) {
      if (d.id.startsWith('prod_live_seed')) continue;
      seenIds.add(d.id);
      list.push(normalizeServerProduct(d.id, d.data()));
    }

    // Best-effort additive read + permanent migration from legacy (default) database if accessible
    if (legacyDefaultDb) {
      try {
        const legacyDocs = await fetchAllDocsPaginated(legacyDefaultDb, 'products');
        let legacyAdded = 0;
        const toMigrate: Product[] = [];
        for (const d of legacyDocs) {
          if (d.id.startsWith('prod_live_seed')) continue;
          const normalized = normalizeServerProduct(d.id, d.data());
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

        // Permanently persist recovered legacy products into active primary Firestore DB
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
      const docRef = doc(firestoreDb, 'products', product.id);
      await setDoc(
        docRef,
        stripUndefined({
          ...product,
          updatedAt: product.updatedAt || new Date().toISOString()
        }),
        { merge: true }
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
      const docRef = doc(firestoreDb, 'products', productId);
      await deleteDoc(docRef);
      console.log(`[FirestoreSync] Deleted product ${productId} from permanent Firestore.`);
    } catch (err) {
      console.error(`[FirestoreSync] Error deleting product ${productId} from Firestore:`, err);
      throw err;
    }
  }

  // Save User
  async saveUser(user: User): Promise<void> {
    try {
      const docRef = doc(firestoreDb, 'users', user.id);
      await setDoc(docRef, stripUndefined(user), { merge: true });
      console.log(`[FirestoreSync] Saved user ${user.id} (${user.email}) to Firestore.`);
    } catch (err) {
      console.error(`[FirestoreSync] Error saving user to Firestore:`, err);
      throw err;
    }
  }

  // Load Users from Firestore (with legacy (default) fallback merge)
  async loadUsers(): Promise<User[]> {
    const docs = await fetchAllDocsPaginated(firestoreDb, 'users');
    const seen = new Set<string>();
    const list: User[] = [];
    const mapUser = (d: any): User | null => {
      const data = d.data();
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

    if (legacyDefaultDb) {
      try {
        const legacyDocs = await fetchAllDocsPaginated(legacyDefaultDb, 'users');
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
      const docRef = doc(firestoreDb, 'sellerProfiles', profile.id);
      await setDoc(docRef, stripUndefined(profile), { merge: true });
      console.log(`[FirestoreSync] Saved seller profile ${profile.id} to Firestore.`);
    } catch (err) {
      console.error(`[FirestoreSync] Error saving seller profile to Firestore:`, err);
      throw err;
    }
  }

  // Load Seller Profiles from Firestore (with legacy (default) fallback merge)
  async loadSellerProfiles(): Promise<SellerProfile[]> {
    const docs = await fetchAllDocsPaginated(firestoreDb, 'sellerProfiles');
    const seen = new Set<string>();
    const list: SellerProfile[] = [];
    const mapProfile = (d: any): SellerProfile | null => {
      const data = d.data();
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

    if (legacyDefaultDb) {
      try {
        const legacyDocs = await fetchAllDocsPaginated(legacyDefaultDb, 'sellerProfiles');
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
