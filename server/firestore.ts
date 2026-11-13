import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc
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

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
// Always use the (default) Firestore database where genuine FUWUKARI listings reside
export const firestoreDb = getFirestore(app);

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
  if (!value) return 'phones-tablets';
  if (value.includes('phone') || value.includes('tablet') || value.includes('gadget')) return 'phones-tablets';
  if (value.includes('computer') || value.includes('laptop') || value.includes('pc') || value.includes('electronic')) return 'computers';
  if (value.includes('fashion') || value.includes('cloth') || value.includes('wear') || value.includes('shirt')) return 'fashion';
  if (value.includes('shoe') || value.includes('bag') || value.includes('watch')) return 'shoes-bags';
  if (value.includes('beauty') || value.includes('skin') || value.includes('hair') || value.includes('perfume')) return 'beauty-care';
  if (value.includes('kitchen') || value.includes('cook')) return 'home-kitchen';
  if (value.includes('furniture') || value.includes('appliance') || value.includes('home')) return 'furniture-appliances';
  if (value.includes('food') || value.includes('grocer') || value.includes('provision') || value.includes('snack')) return 'food-groceries';
  if (value.includes('car') || value.includes('vehicle') || value.includes('auto') || value.includes('bike')) return 'vehicles-auto';
  if (value.includes('build') || value.includes('material')) return 'building-materials';
  if (value.includes('solar') || value.includes('generator') || value.includes('power')) return 'generator-solar';
  if (value.includes('service') || value.includes('tutor') || value.includes('artisan')) return 'services-jobs';
  return value || 'other-goods';
}

function normalizeServerProduct(id: string, data: any): Product {
  const images: string[] = Array.isArray(data?.images)
    ? data.images.filter((i: any) => typeof i === 'string' && i.trim().length > 5 && !i.startsWith('blob:') && !i.includes('persistent_image_proof'))
    : [];
  if (typeof data?.imageUrl === 'string' && data.imageUrl.trim().length > 5 && !data.imageUrl.startsWith('blob:') && !images.includes(data.imageUrl.trim())) {
    images.unshift(data.imageUrl.trim());
  }

  const rawStatus = String(data?.status || 'active').toLowerCase();
  const status: Product['status'] =
    rawStatus === 'approved' || rawStatus === 'active'
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

  public static getInstance(): FirestoreSync {
    if (!FirestoreSync.instance) {
      FirestoreSync.instance = new FirestoreSync();
    }
    return FirestoreSync.instance;
  }

  // Load all genuine products from (default) Cloud Firestore
  async loadProducts(): Promise<Product[]> {
    try {
      const colRef = collection(firestoreDb, 'products');
      const snap = await getDocs(colRef);
      const list: Product[] = [];
      snap.forEach(d => {
        if (d.id.startsWith('prod_live_seed')) return;
        list.push(normalizeServerProduct(d.id, d.data()));
      });
      console.log(`[FirestoreSync] Loaded ${list.length} genuine products from (default) Cloud Firestore.`);
      return list;
    } catch (err) {
      console.error('[FirestoreSync] Failed to load products from Firestore:', err);
      return [];
    }
  }

  // Save or update a product in Firestore
  async saveProduct(product: Product): Promise<void> {
    try {
      const docRef = doc(firestoreDb, 'products', product.id);
      await setDoc(
        docRef,
        stripUndefined({
          ...product,
          updatedAt: new Date().toISOString()
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
    }
  }

  // Save Seller Profile
  async saveSellerProfile(profile: SellerProfile): Promise<void> {
    try {
      const docRef = doc(firestoreDb, 'sellerProfiles', profile.id);
      await setDoc(docRef, stripUndefined(profile), { merge: true });
      console.log(`[FirestoreSync] Saved seller profile ${profile.id} to Firestore.`);
    } catch (err) {
      console.error(`[FirestoreSync] Error saving seller profile to Firestore:`, err);
    }
  }
}

export const firestoreSync = FirestoreSync.getInstance();
