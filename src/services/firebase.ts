import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot
} from 'firebase/firestore';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile as updateFirebaseProfile,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import bcrypt from 'bcryptjs';
import activeFirebaseConfig from './firebaseConfig.js';
import { isValidImageUrl } from '../utils/productImages.js';
import {
  Product,
  User,
  SellerProfile,
  BikeRider,
  HubMessage,
  HubActiveUser,
  RegisteredUser,
  FriendRequest,
  Friend,
  PrivateMessage,
  ChatMetadata,
  HuxListing,
  HuxReport,
  HuxCategory,
  StudentRequest,
  OrderRecord
} from '../types.js';

// 1. Initialize Firebase App and Services
export const app = getApps().length > 0 ? getApp() : initializeApp(activeFirebaseConfig);
export const db = (activeFirebaseConfig as any).firestoreDatabaseId
  ? getFirestore(app, (activeFirebaseConfig as any).firestoreDatabaseId)
  : getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Utility: Strip all `undefined` fields recursively so Firestore setDoc/updateDoc never rejects documents
export function stripUndefined<T>(input: T): T {
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

// Utility: Safely convert Firestore Timestamp, Date, number, or string into ISO string
export function toIsoString(val: any): string {
  if (!val) return new Date().toISOString();
  if (typeof val === 'string') {
    const parsed = Date.parse(val);
    return isNaN(parsed) ? new Date().toISOString() : val;
  }
  if (typeof val === 'number') {
    return new Date(val).toISOString();
  }
  if (typeof val?.toDate === 'function') {
    return val.toDate().toISOString();
  }
  if (typeof val?.seconds === 'number') {
    return new Date(val.seconds * 1000).toISOString();
  }
  return new Date().toISOString();
}

export function mapLegacyCategory(raw: any): string {
  const value = String(raw || '').toLowerCase().trim();
  if (!value) return 'hostel-items';

  if (
    [
      'hostel-items',
      'textbooks-past-questions',
      'food',
      'electronics',
      'fashion',
      'gas-cooking'
    ].includes(value)
  ) {
    return value;
  }

  if (
    value.includes('gas') ||
    value.includes('cooking') ||
    value.includes('kitchen') ||
    value.includes('cook') ||
    value.includes('burner') ||
    value.includes('cylinder') ||
    value.includes('kettle') ||
    value.includes('pot') ||
    value === 'home-kitchen'
  ) {
    return 'gas-cooking';
  }

  if (
    value.includes('textbook') ||
    value.includes('past question') ||
    value.includes('handout') ||
    value.includes('book') ||
    value.includes('education') ||
    value.includes('study') ||
    value.includes('calculator') ||
    value === 'books-education'
  ) {
    return 'textbooks-past-questions';
  }

  if (
    value.includes('food') ||
    value.includes('grocer') ||
    value.includes('provision') ||
    value.includes('snack') ||
    value.includes('meal') ||
    value.includes('drink') ||
    value === 'food-groceries'
  ) {
    return 'food';
  }

  if (
    value.includes('phone') ||
    value.includes('tablet') ||
    value.includes('gadget') ||
    value.includes('computer') ||
    value.includes('laptop') ||
    value.includes('pc') ||
    value.includes('electronic') ||
    value.includes('charger') ||
    value === 'phones-tablets' ||
    value === 'computers'
  ) {
    return 'electronics';
  }

  if (
    value.includes('fashion') ||
    value.includes('cloth') ||
    value.includes('wear') ||
    value.includes('shirt') ||
    value.includes('shoe') ||
    value.includes('bag') ||
    value.includes('watch') ||
    value.includes('beauty') ||
    value.includes('skin') ||
    value.includes('hair') ||
    value.includes('perfume') ||
    value === 'shoes-bags' ||
    value === 'beauty-care'
  ) {
    return 'fashion';
  }

  return 'hostel-items';
}

export function normalizeFirestoreProduct(docId: string, data: any): Product {
  const rawImages: string[] = [];
  if (Array.isArray(data?.images)) {
    for (const img of data.images) {
      if (isValidImageUrl(img)) rawImages.push(String(img).trim());
    }
  }
  if (isValidImageUrl(data?.imageUrl) && !rawImages.includes(String(data.imageUrl).trim())) {
    rawImages.unshift(String(data.imageUrl).trim());
  }

  const rawStatus = String(data?.status || 'active').toLowerCase();
  const normalizedStatus: Product['status'] =
    rawStatus === 'approved' || rawStatus === 'active'
      ? 'active'
      : rawStatus === 'sold'
      ? 'sold'
      : rawStatus === 'expired'
      ? 'expired'
      : 'unavailable';

  const rawLocation = String(data?.location || '').trim();
  const city = String(data?.city || rawLocation || 'Wukari').trim();
  const state = String(data?.state || 'Taraba').trim();
  const price = Number(data?.price) || 0;
  const originalPrice =
    data?.originalPrice && Number(data.originalPrice) > price ? Number(data.originalPrice) : undefined;

  return {
    id: docId,
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
    images: rawImages,
    imageUrl: rawImages[0] || '',
    state,
    city,
    quantity: Math.max(1, Number(data?.quantity) || 1),
    status: normalizedStatus,
    moderationStatus: data?.moderationStatus || (rawStatus === 'rejected' ? 'rejected' : 'approved'),
    moderationFlags: Array.isArray(data?.moderationFlags) ? data.moderationFlags : undefined,
    views: Number(data?.views) || 0,
    whatsappClicks: Number(data?.whatsappClicks) || 0,
    isFeatured: Boolean(data?.isFeatured),
    createdAt: toIsoString(data?.createdAt),
    updatedAt: toIsoString(data?.updatedAt || data?.createdAt)
  };
}

// 2. Error handling conforming strictly to FirestoreErrorInfo specification
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('[Firestore Error]:', JSON.stringify(errInfo, null, 2));
  throw new Error(JSON.stringify(errInfo));
}

// 3. Test Connection on App Boot
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[Firebase Firestore] Permanent Production Database Connected Successfully.');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firebase Firestore] Client is offline or database initializing.');
    } else {
      console.log('[Firebase Firestore] Handshake acknowledged:', error instanceof Error ? error.message : error);
    }
    return true;
  }
}

testConnection();

// 4. Firestore Product Operations
export async function getProductsFromFirestore(filters?: {
  categoryId?: string;
  sellerId?: string;
  searchQuery?: string;
  condition?: string;
  state?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'newest' | 'price-asc' | 'price-desc' | 'popular';
  limitCount?: number;
}): Promise<Product[]> {
  const path = 'products';
  try {
    const snapshot = await getDocs(collection(db, path));
    let items: Product[] = [];

    snapshot.forEach(docSnap => {
      if (docSnap.id.startsWith('prod_live_seed')) return;
      const product = normalizeFirestoreProduct(docSnap.id, docSnap.data());
      const isApproved = !product.moderationStatus || product.moderationStatus === 'approved';
      if (product.status === 'active' && isApproved) {
        items.push(product);
      }
    });

    if (filters?.categoryId && filters.categoryId !== 'all') {
      const normalizedTarget = mapLegacyCategory(filters.categoryId);
      items = items.filter(p => p.categoryId === normalizedTarget || p.categoryId === filters.categoryId);
    }
    if (filters?.condition && (filters.condition === 'new' || filters.condition === 'used')) {
      items = items.filter(p => p.condition === filters.condition);
    }
    if (filters?.state && filters.state !== 'all') {
      items = items.filter(p => p.state.toLowerCase() === filters.state!.toLowerCase());
    }
    if (filters?.city && filters.city !== 'all') {
      items = items.filter(p => p.city.toLowerCase() === filters.city!.toLowerCase());
    }
    if (filters?.minPrice !== undefined && filters.minPrice > 0) {
      items = items.filter(p => p.price >= filters.minPrice!);
    }
    if (filters?.maxPrice !== undefined && filters.maxPrice > 0) {
      items = items.filter(p => p.price <= filters.maxPrice!);
    }
    if (filters?.sellerId) {
      items = items.filter(p => p.sellerId === filters.sellerId);
    }
    if (filters?.searchQuery && filters.searchQuery.trim().length > 0) {
      const term = filters.searchQuery.toLowerCase().trim();
      items = items.filter(p =>
        p.title.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term) ||
        p.shopName?.toLowerCase().includes(term) ||
        p.sellerName?.toLowerCase().includes(term) ||
        p.city?.toLowerCase().includes(term) ||
        p.state?.toLowerCase().includes(term)
      );
    }

    if (filters?.sort === 'price-asc') {
      items.sort((a, b) => a.price - b.price);
    } else if (filters?.sort === 'price-desc') {
      items.sort((a, b) => b.price - a.price);
    } else if (filters?.sort === 'popular') {
      items.sort((a, b) => (b.views + b.whatsappClicks * 3) - (a.views + a.whatsappClicks * 3));
    } else {
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    if (filters?.limitCount) {
      items = items.slice(0, filters.limitCount);
    }

    return items;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function getAllProductsFromFirestoreForAdmin(): Promise<Product[]> {
  const path = 'products';
  try {
    const snapshot = await getDocs(collection(db, path));
    const items: Product[] = [];
    snapshot.forEach(docSnap => {
      if (docSnap.id.startsWith('prod_live_seed')) return;
      items.push(normalizeFirestoreProduct(docSnap.id, docSnap.data()));
    });
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.warn('[getAllProductsFromFirestoreForAdmin warning]:', err);
    return [];
  }
}

export async function adminUpdateFirestoreProduct(
  productId: string,
  updates: Partial<Product>
): Promise<void> {
  const path = `products/${productId}`;
  try {
    await updateDoc(doc(db, 'products', productId), stripUndefined({
      ...updates,
      updatedAt: new Date().toISOString()
    }));
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function saveProductToFirestore(product: Product): Promise<void> {
  const path = `products/${product.id}`;
  try {
    const productRef = doc(db, 'products', product.id);
    const primaryImg = product.images?.[0] || product.imageUrl || '';
    const payload = stripUndefined({
      ...product,
      imageUrl: primaryImg,
      updatedAt: new Date().toISOString()
    });
    await setDoc(productRef, payload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteProductFromFirestore(productId: string): Promise<void> {
  const path = `products/${productId}`;
  try {
    await deleteDoc(doc(db, 'products', productId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function getProductByIdFromFirestore(id: string): Promise<Product | null> {
  const path = `products/${id}`;
  try {
    const docSnap = await getDoc(doc(db, 'products', id));
    if (docSnap.exists()) {
      return normalizeFirestoreProduct(docSnap.id, docSnap.data());
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function createProductDirectlyInFirestore(
  data: Partial<Product>,
  sellerUser?: User | null
): Promise<Product> {
  const id = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const price = Number(data.price) || 0;
  const originalPrice =
    data.originalPrice && Number(data.originalPrice) > price ? Number(data.originalPrice) : undefined;

  const cleanedImages = Array.isArray(data.images)
    ? data.images
        .filter((img): img is string => isValidImageUrl(img))
        .sort((a, b) => {
          const score = (url: string) => {
            if (url.startsWith('https://firebasestorage.googleapis.com')) return 100;
            if (url.startsWith('https://')) return 90;
            if (url.startsWith('data:image/')) return 80;
            if (url.startsWith('http://')) return 70;
            return 10;
          };
          return score(b) - score(a);
        })
    : [];

  if (cleanedImages.length === 0) {
    throw new Error('At least one valid product image is required before publishing.');
  }

  const product: Product = {
    id,
    sellerId: sellerUser?.id || data.sellerId || auth.currentUser?.uid || 'campus-seller',
    sellerName: sellerUser?.name || data.sellerName || auth.currentUser?.displayName || 'FUWUKARI Student',
    shopName: data.shopName || `${sellerUser?.name || 'FU MARKET'}'s Store`,
    whatsappNumber: data.whatsappNumber || sellerUser?.whatsappNumber || sellerUser?.phone || '',
    title: String(data.title || '').trim(),
    description: String(data.description || '').trim(),
    price,
    ...(originalPrice !== undefined ? { originalPrice } : {}),
    categoryId: data.categoryId || 'hostel-items',
    condition: data.condition === 'used' ? 'used' : 'new',
    images: cleanedImages,
    imageUrl: cleanedImages[0],
    state: data.state || 'Taraba',
    city: data.city || 'Wukari',
    quantity: Math.max(1, Number(data.quantity) || 1),
    status: 'active',
    moderationStatus: 'approved',
    views: 0,
    whatsappClicks: 0,
    createdAt: now,
    updatedAt: now
  };

  await saveProductToFirestore(product);
  return product;
}

// 5. Firebase Authentication & Firestore User/Seller Account Management
const SESSION_UID_KEY = 'fu_market_session_uid';
const SESSION_USER_KEY = 'fu_market_auth_user';
const SESSION_SELLER_KEY = 'fu_market_seller_profile';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitizeUserDoc(id: string, data: any): User {
  const role: User['role'] =
    data?.role === 'admin'
      ? 'admin'
      : data?.role === 'seller'
      ? 'seller'
      : 'buyer';

  return {
    id,
    name: String(data?.name || data?.displayName || 'FUWUKARI Student').trim(),
    email: String(data?.email || '').toLowerCase().trim(),
    role,
    phone: data?.phone ? String(data.phone).trim() : '',
    whatsappNumber: data?.whatsappNumber ? String(data.whatsappNumber).trim() : (data?.phone ? String(data.phone).trim() : ''),
    state: data?.state ? String(data.state).trim() : 'Taraba',
    city: data?.city ? String(data.city).trim() : 'Wukari',
    ...(data?.avatarUrl || data?.photoURL ? { avatarUrl: String(data.avatarUrl || data.photoURL) } : {}),
    ...(data?.isSuspended ? { isSuspended: true } : {}),
    ...(data?.suspensionReason ? { suspensionReason: String(data.suspensionReason) } : {}),
    createdAt: data?.createdAt ? toIsoString(data.createdAt) : new Date().toISOString()
  };
}

export function saveUserSessionCache(user: User | null, sellerProfile?: SellerProfile | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (user) {
      const cleanUser = sanitizeUserDoc(user.id, user);
      localStorage.setItem(SESSION_UID_KEY, cleanUser.id);
      localStorage.setItem(SESSION_USER_KEY, JSON.stringify(cleanUser));
      localStorage.setItem('zangamarket_auth_user', JSON.stringify(cleanUser));
      if (sellerProfile) {
        localStorage.setItem(SESSION_SELLER_KEY, JSON.stringify(sellerProfile));
      } else {
        localStorage.removeItem(SESSION_SELLER_KEY);
      }
    } else {
      localStorage.removeItem(SESSION_UID_KEY);
      localStorage.removeItem(SESSION_USER_KEY);
      localStorage.removeItem(SESSION_SELLER_KEY);
      localStorage.removeItem('zangamarket_auth_user');
    }
  } catch {
    // Non-blocking storage safeguard
  }
}

export function getCachedSessionInfo(): { uid: string | null; user: User | null; sellerProfile: SellerProfile | null } {
  if (typeof window === 'undefined') return { uid: null, user: null, sellerProfile: null };
  try {
    const uid = localStorage.getItem(SESSION_UID_KEY);
    const rawUser = localStorage.getItem(SESSION_USER_KEY) || localStorage.getItem('zangamarket_auth_user');
    const rawSeller = localStorage.getItem(SESSION_SELLER_KEY);
    const user = rawUser ? (JSON.parse(rawUser) as User) : null;
    const sellerProfile = rawSeller ? (JSON.parse(rawSeller) as SellerProfile) : null;
    return {
      uid: uid || user?.id || null,
      user,
      sellerProfile
    };
  } catch {
    return { uid: null, user: null, sellerProfile: null };
  }
}

export function mapAuthErrorToUserMessage(err: any): string {
  const code = String(err?.code || '');
  const msg = String(err?.message || '');

  if (code === 'auth/email-already-in-use') {
    return 'This email address is already registered. Please sign in.';
  }
  if (code === 'auth/invalid-email') {
    return 'Please enter a valid email address.';
  }
  if (code === 'auth/weak-password') {
    return 'Password must be at least 6 characters long. Use a mix of letters and numbers for better security.';
  }
  if (code === 'auth/wrong-password' || code === 'auth/invalid-credential' || code === 'auth/user-not-found') {
    return 'Invalid email or password.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return 'Google sign-in was cancelled.';
  }
  if (
    code === 'auth/network-request-failed' ||
    code === 'unavailable' ||
    msg.toLowerCase().includes('network') ||
    msg.toLowerCase().includes('failed to fetch')
  ) {
    return 'Unable to connect. Please check your internet connection and try again.';
  }
  if (msg.includes('Request failed with status') || msg.includes('Backend API route')) {
    return 'Unable to reach registration service. Please check your internet connection and try again.';
  }
  return msg || 'Unable to complete authentication. Please try again.';
}

async function getSellerProfileForUser(uid: string): Promise<SellerProfile | null> {
  try {
    const directSnap = await getDoc(doc(db, 'sellerProfiles', `profile-${uid}`));
    if (directSnap.exists()) {
      return { id: directSnap.id, ...(directSnap.data() as any) } as SellerProfile;
    }

    const q = query(collection(db, 'sellerProfiles'), where('userId', '==', uid), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const d = snap.docs[0];
      return { id: d.id, ...(d.data() as any) } as SellerProfile;
    }
    return null;
  } catch (err) {
    console.warn('[getSellerProfileForUser warning]:', err);
    return null;
  }
}

export async function getUserSessionFromFirestore(uid: string): Promise<{
  user: User;
  sellerProfile: SellerProfile | null;
  favourites: string[];
} | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) return null;

    const rawData = userDoc.data() || {};
    const user = sanitizeUserDoc(userDoc.id, rawData);
    const sellerProfile = await getSellerProfileForUser(user.id);
    const favourites = Array.isArray(rawData.favourites)
      ? rawData.favourites.filter((f: any) => typeof f === 'string')
      : [];

    saveUserSessionCache(user, sellerProfile);
    return { user, sellerProfile, favourites };
  } catch (err) {
    console.warn('[getUserSessionFromFirestore warning]:', err);
    return null;
  }
}

export async function registerAccountInFirebase(payload: {
  name: string;
  email: string;
  password: string;
  role?: 'buyer' | 'seller';
  phone?: string;
  whatsapp?: string;
  whatsappNumber?: string;
  state?: string;
  city?: string;
  shopName?: string;
  shopDescription?: string;
}): Promise<{ user: User; token: string; sellerProfile?: SellerProfile }> {
  const cleanName = String(payload.name || '').trim();
  const normalizedEmail = String(payload.email || '').trim().toLowerCase();
  const password = String(payload.password || '');
  const accountRole: 'buyer' | 'seller' = payload.role === 'seller' ? 'seller' : 'buyer';
  const cleanWhatsapp = String(payload.whatsappNumber || payload.whatsapp || payload.phone || '').trim();
  const cleanPhone = String(payload.phone || cleanWhatsapp).trim();
  const cleanState = String(payload.state || 'Taraba').trim();
  const cleanCity = String(payload.city || 'Wukari').trim();
  const cleanShopName = String(payload.shopName || '').trim();

  if (!cleanName) {
    throw new Error('Please enter your full name.');
  }
  if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail)) {
    throw new Error('Please enter a valid email address.');
  }
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters long. Use letters and numbers for stronger security.');
  }
  if (!cleanWhatsapp || cleanWhatsapp.replace(/[^0-9]/g, '').length < 10) {
    throw new Error('Please enter a valid WhatsApp phone number (e.g. 08012345678).');
  }
  if (!cleanCity) {
    throw new Error('Please enter your hostel or campus location.');
  }
  if (accountRole === 'seller' && !cleanShopName) {
    throw new Error('Please enter your shop or business name.');
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('Unable to connect. Please check your internet connection and try again.');
  }

  try {
    // 1. Check duplicate email in Cloud Firestore users collection
    const existingSnap = await getDocs(
      query(collection(db, 'users'), where('email', '==', normalizedEmail), limit(1))
    );
    if (!existingSnap.empty) {
      throw new Error('This email address is already registered. Please sign in.');
    }

    let uid = '';
    let passwordHash: string | undefined;

    // 2. Attempt real Firebase Authentication Email/Password signup
    try {
      const cred = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      uid = cred.user.uid;
      await updateFirebaseProfile(cred.user, { displayName: cleanName }).catch(() => {});
    } catch (authErr: any) {
      const code = String(authErr?.code || '');
      if (code === 'auth/operation-not-allowed' || code === 'auth/admin-restricted-operation') {
        // Project has not enabled Email/Password sign-in in Firebase Console:
        // Store salted bcrypt credential securely in Cloud Firestore so registration & login still work seamlessly.
        uid = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        const salt = await bcrypt.genSalt(10);
        passwordHash = await bcrypt.hash(password, salt);
      } else {
        throw new Error(mapAuthErrorToUserMessage(authErr));
      }
    }

    const now = new Date().toISOString();
    const userDocData: Record<string, any> = {
      id: uid,
      name: cleanName,
      email: normalizedEmail,
      role: accountRole,
      phone: cleanPhone,
      whatsappNumber: cleanWhatsapp,
      state: cleanState,
      city: cleanCity,
      isOnline: true,
      lastSeen: Date.now(),
      favourites: [],
      createdAt: now,
      updatedAt: now
    };
    if (passwordHash) {
      userDocData.passwordHash = passwordHash;
    }

    await setDoc(doc(db, 'users', uid), stripUndefined(userDocData));

    let sellerProfile: SellerProfile | undefined;
    if (accountRole === 'seller') {
      const slugBase = cleanShopName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'campus-store';

      sellerProfile = {
        id: `profile-${uid}`,
        userId: uid,
        shopName: cleanShopName,
        shopSlug: `${slugBase}-${uid.slice(-4)}`,
        description:
          payload.shopDescription?.trim() ||
          `Welcome to ${cleanShopName} on FU MARKET. Chat with us for fast campus delivery!`,
        whatsappNumber: cleanWhatsapp,
        state: cleanState,
        city: cleanCity,
        isVerified: false,
        createdAt: now
      };

      await setDoc(doc(db, 'sellerProfiles', sellerProfile.id), stripUndefined(sellerProfile));
    }

    const cleanUser = sanitizeUserDoc(uid, userDocData);
    saveUserSessionCache(cleanUser, sellerProfile || null);

    return {
      user: cleanUser,
      token: `firebase-session:${uid}`,
      ...(sellerProfile ? { sellerProfile } : {})
    };
  } catch (err: any) {
    throw new Error(mapAuthErrorToUserMessage(err));
  }
}

export async function loginAccountInFirebase(
  email: string,
  password: string
): Promise<{ user: User; token: string; sellerProfile?: SellerProfile } | null> {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail)) {
    throw new Error('Please enter a valid email address.');
  }
  if (!password) {
    throw new Error('Please enter your password.');
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('Unable to connect. Please check your internet connection and try again.');
  }

  try {
    // 1. Try Firebase Auth email/password sign-in first
    try {
      const cred = await signInWithEmailAndPassword(auth, normalizedEmail, password);
      const fbUser = cred.user;
      let userDoc = await getDoc(doc(db, 'users', fbUser.uid));

      if (!userDoc.exists()) {
        // Check if profile exists by email
        const byEmail = await getDocs(
          query(collection(db, 'users'), where('email', '==', normalizedEmail), limit(1))
        );
        if (!byEmail.empty) {
          userDoc = byEmail.docs[0];
        }
      }

      let cleanUser: User;
      if (userDoc.exists()) {
        const raw = userDoc.data();
        if (raw?.isSuspended) {
          throw new Error(
            `Account suspended by marketplace moderation: ${raw.suspensionReason || 'Violation of trust & safety policy.'}`
          );
        }
        cleanUser = sanitizeUserDoc(userDoc.id, raw);
      } else {
        cleanUser = {
          id: fbUser.uid,
          name: fbUser.displayName || 'FUWUKARI Student',
          email: normalizedEmail,
          role: 'buyer',
          state: 'Taraba',
          city: 'Wukari',
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', fbUser.uid), stripUndefined(cleanUser), { merge: true });
      }

      const sellerProfile = await getSellerProfileForUser(cleanUser.id);
      saveUserSessionCache(cleanUser, sellerProfile);
      return {
        user: cleanUser,
        token: `firebase-session:${cleanUser.id}`,
        ...(sellerProfile ? { sellerProfile } : {})
      };
    } catch (authErr: any) {
      const code = String(authErr?.code || '');
      if (code === 'auth/network-request-failed' || code === 'auth/too-many-requests') {
        throw new Error(mapAuthErrorToUserMessage(authErr));
      }
      // Fall through to Firestore credential lookup when Email/Password provider isn't enabled or user migrated
    }

    // 2. Check Cloud Firestore users collection by email
    const q = query(collection(db, 'users'), where('email', '==', normalizedEmail), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) {
      return null;
    }

    const userDoc = snap.docs[0];
    const data = userDoc.data() || {};

    if (data.isSuspended) {
      throw new Error(
        `Account suspended by marketplace moderation: ${data.suspensionReason || 'Violation of trust & safety policy.'}`
      );
    }

    if (data.passwordHash) {
      const valid = await bcrypt.compare(password, String(data.passwordHash));
      if (!valid) {
        throw new Error('Invalid email or password.');
      }
    } else {
      throw new Error("This account uses Google Sign-In. Please click 'Continue with Google' or reset your password.");
    }

    const cleanUser = sanitizeUserDoc(userDoc.id, data);
    const sellerProfile = await getSellerProfileForUser(cleanUser.id);
    await updateDoc(userDoc.ref, { isOnline: true, lastSeen: Date.now() }).catch(() => {});
    saveUserSessionCache(cleanUser, sellerProfile);

    return {
      user: cleanUser,
      token: `firebase-session:${cleanUser.id}`,
      ...(sellerProfile ? { sellerProfile } : {})
    };
  } catch (err: any) {
    throw new Error(mapAuthErrorToUserMessage(err));
  }
}

export async function signInWithGoogle(): Promise<{
  user: User;
  firebaseUser: FirebaseUser;
  sellerProfile?: SellerProfile | null;
}> {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    const fbUser = cred.user;
    const normalizedEmail = (fbUser.email || '').toLowerCase().trim();

    let userDocRef = doc(db, 'users', fbUser.uid);
    let userDoc = await getDoc(userDocRef);

    if (!userDoc.exists() && normalizedEmail) {
      const byEmailSnap = await getDocs(
        query(collection(db, 'users'), where('email', '==', normalizedEmail), limit(1))
      );
      if (!byEmailSnap.empty) {
        userDoc = byEmailSnap.docs[0];
        userDocRef = userDoc.ref;
      }
    }

    let appUser: User;
    if (userDoc.exists()) {
      appUser = sanitizeUserDoc(userDoc.id, userDoc.data());
      await updateDoc(userDocRef, { isOnline: true, lastSeen: Date.now() }).catch(() => {});
    } else {
      appUser = stripUndefined({
        id: fbUser.uid,
        name: fbUser.displayName || 'FUWUKARI Student',
        email: normalizedEmail,
        role: 'buyer' as const,
        phone: fbUser.phoneNumber || '',
        whatsappNumber: fbUser.phoneNumber || '',
        state: 'Taraba',
        city: 'Wukari',
        ...(fbUser.photoURL ? { avatarUrl: fbUser.photoURL } : {}),
        createdAt: new Date().toISOString()
      });
      await setDoc(userDocRef, stripUndefined({ ...appUser, isOnline: true, lastSeen: Date.now(), favourites: [] }));
    }

    const sellerProfile = await getSellerProfileForUser(appUser.id);
    saveUserSessionCache(appUser, sellerProfile);
    return { user: appUser, firebaseUser: fbUser, sellerProfile };
  } catch (err: any) {
    console.error('Google Sign-In Error:', err);
    throw new Error(mapAuthErrorToUserMessage(err));
  }
}

export async function signOutFromFirebase(): Promise<void> {
  saveUserSessionCache(null);
  try {
    await signOut(auth);
  } catch {
    // Non-blocking
  }
}

export function subscribeToFirebaseAuthChanges(callback: (fbUser: FirebaseUser | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export async function sendPasswordResetInFirebase(email: string): Promise<{ success: boolean; message: string }> {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail)) {
    throw new Error('Please enter a valid email address.');
  }

  try {
    await sendPasswordResetEmail(auth, normalizedEmail);
    return {
      success: true,
      message: 'Password reset instructions have been sent to your email address.'
    };
  } catch (err: any) {
    const code = String(err?.code || '');
    if (
      code === 'auth/operation-not-allowed' ||
      code === 'auth/user-not-found' ||
      code === 'auth/invalid-credential'
    ) {
      const snap = await getDocs(
        query(collection(db, 'users'), where('email', '==', normalizedEmail), limit(1))
      );
      if (!snap.empty) {
        return {
          success: true,
          message: 'Account verified. Enter your new password below.'
        };
      }
    }
    throw new Error(mapAuthErrorToUserMessage(err));
  }
}

export async function resetAccountPasswordInFirestore(
  email: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail)) {
    throw new Error('Please enter a valid email address.');
  }
  if (!newPassword || newPassword.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  const snap = await getDocs(
    query(collection(db, 'users'), where('email', '==', normalizedEmail), limit(1))
  );
  if (snap.empty) {
    throw new Error('No user account found with this email address.');
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(newPassword, salt);
  await updateDoc(snap.docs[0].ref, {
    passwordHash,
    updatedAt: new Date().toISOString()
  });

  return {
    success: true,
    message: 'Password has been updated successfully! You can now sign in.'
  };
}

export async function updateUserProfileInFirestore(
  uid: string,
  profileData: Partial<User>
): Promise<{ user: User; sellerProfile?: SellerProfile | null }> {
  const userRef = doc(db, 'users', uid);
  const cleanUpdates: Record<string, any> = {
    updatedAt: new Date().toISOString()
  };
  if (profileData.name) cleanUpdates.name = profileData.name.trim();
  if (profileData.phone !== undefined) cleanUpdates.phone = profileData.phone.trim();
  if (profileData.whatsappNumber !== undefined) cleanUpdates.whatsappNumber = profileData.whatsappNumber.trim();
  if (profileData.state !== undefined) cleanUpdates.state = profileData.state.trim();
  if (profileData.city !== undefined) cleanUpdates.city = profileData.city.trim();
  if (profileData.avatarUrl !== undefined) cleanUpdates.avatarUrl = profileData.avatarUrl;

  await setDoc(userRef, stripUndefined(cleanUpdates), { merge: true });
  const updatedSnap = await getDoc(userRef);
  const user = sanitizeUserDoc(uid, updatedSnap.data() || {});

  const sellerProfile = await getSellerProfileForUser(uid);
  if (sellerProfile) {
    const sellerUpdates: Record<string, any> = {};
    if (profileData.whatsappNumber !== undefined) sellerUpdates.whatsappNumber = profileData.whatsappNumber.trim();
    if (profileData.state !== undefined) sellerUpdates.state = profileData.state.trim();
    if (profileData.city !== undefined) sellerUpdates.city = profileData.city.trim();
    if (Object.keys(sellerUpdates).length > 0) {
      await setDoc(doc(db, 'sellerProfiles', sellerProfile.id), stripUndefined(sellerUpdates), { merge: true });
      Object.assign(sellerProfile, sellerUpdates);
    }
  }

  saveUserSessionCache(user, sellerProfile);
  return { user, sellerProfile };
}

export async function getSellerStorefrontFromFirestore(identifier: string): Promise<{
  seller: SellerProfile & { totalListings: number };
  products: Product[];
}> {
  const cleanId = String(identifier || '').trim();
  let profile: SellerProfile | null = null;

  // 1. Direct lookup in sellerProfiles
  const directSnap = await getDoc(doc(db, 'sellerProfiles', cleanId));
  if (directSnap.exists()) {
    profile = { id: directSnap.id, ...(directSnap.data() as any) } as SellerProfile;
  }

  if (!profile) {
    const byUserSnap = await getDocs(
      query(collection(db, 'sellerProfiles'), where('userId', '==', cleanId), limit(1))
    );
    if (!byUserSnap.empty) {
      const d = byUserSnap.docs[0];
      profile = { id: d.id, ...(d.data() as any) } as SellerProfile;
    }
  }

  if (!profile) {
    const bySlugSnap = await getDocs(
      query(collection(db, 'sellerProfiles'), where('shopSlug', '==', cleanId), limit(1))
    );
    if (!bySlugSnap.empty) {
      const d = bySlugSnap.docs[0];
      profile = { id: d.id, ...(d.data() as any) } as SellerProfile;
    }
  }

  // 2. Auto-build from users doc if needed
  if (!profile) {
    const userSnap = await getDoc(doc(db, 'users', cleanId));
    if (userSnap.exists()) {
      const u = sanitizeUserDoc(userSnap.id, userSnap.data());
      const shopName = `${u.name}'s Store`;
      const slug = shopName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      profile = {
        id: `profile-${u.id}`,
        userId: u.id,
        shopName,
        shopSlug: `${slug}-${u.id.slice(-4)}`,
        description: `Student storefront on FU MARKET (${u.city || 'Wukari'}).`,
        whatsappNumber: u.whatsappNumber || u.phone || '',
        state: u.state || 'Taraba',
        city: u.city || 'Wukari',
        isVerified: false,
        createdAt: u.createdAt
      };
    }
  }

  // 3. Load matching seller products
  const products = await getProductsFromFirestore({ sellerId: profile?.userId || cleanId, limitCount: 100 });

  if (!profile && products.length > 0) {
    const first = products[0];
    const shopName = first.shopName || first.sellerName || 'FU MARKET Seller';
    const slug = shopName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    profile = {
      id: `profile-${cleanId}`,
      userId: cleanId,
      shopName,
      shopSlug: `${slug}-${cleanId.slice(-4)}`,
      description: 'Genuine FUWUKARI student seller on FU MARKET.',
      whatsappNumber: first.whatsappNumber || '',
      state: first.state || 'Taraba',
      city: first.city || 'Wukari',
      isVerified: false,
      createdAt: first.createdAt
    };
  }

  if (!profile) {
    throw new Error('Seller storefront not found.');
  }

  return {
    seller: {
      ...profile,
      totalListings: products.length
    },
    products
  };
}

export async function updateSellerProfileInFirestore(
  user: User,
  profileData: Partial<SellerProfile>
): Promise<SellerProfile> {
  const existing = await getSellerProfileForUser(user.id);
  const now = new Date().toISOString();
  const nextShopName = (profileData.shopName || existing?.shopName || `${user.name}'s Store`).trim();
  const slugBase = nextShopName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'campus-store';

  const updatedProfile: SellerProfile = stripUndefined({
    id: existing?.id || `profile-${user.id}`,
    userId: user.id,
    shopName: nextShopName,
    shopSlug: `${slugBase}-${user.id.slice(-4)}`,
    description: profileData.description !== undefined
      ? profileData.description.trim()
      : existing?.description || 'Official student storefront on FU MARKET.',
    whatsappNumber: profileData.whatsappNumber !== undefined
      ? profileData.whatsappNumber.trim()
      : existing?.whatsappNumber || user.whatsappNumber || '',
    state: profileData.state !== undefined ? profileData.state.trim() : existing?.state || user.state || 'Taraba',
    city: profileData.city !== undefined ? profileData.city.trim() : existing?.city || user.city || 'Wukari',
    ...(profileData.address !== undefined ? { address: profileData.address.trim() } : existing?.address ? { address: existing.address } : {}),
    ...(profileData.shopLogo !== undefined ? { shopLogo: profileData.shopLogo } : existing?.shopLogo ? { shopLogo: existing.shopLogo } : {}),
    ...(profileData.coverImage !== undefined ? { coverImage: profileData.coverImage } : existing?.coverImage ? { coverImage: existing.coverImage } : {}),
    isVerified: Boolean(existing?.isVerified),
    createdAt: existing?.createdAt || now
  });

  await setDoc(doc(db, 'sellerProfiles', updatedProfile.id), stripUndefined(updatedProfile), { merge: true });
  await setDoc(doc(db, 'users', user.id), stripUndefined({
    whatsappNumber: updatedProfile.whatsappNumber,
    state: updatedProfile.state,
    city: updatedProfile.city,
    updatedAt: now
  }), { merge: true });

  saveUserSessionCache(
    {
      ...user,
      whatsappNumber: updatedProfile.whatsappNumber,
      state: updatedProfile.state,
      city: updatedProfile.city
    },
    updatedProfile
  );

  return updatedProfile;
}

export async function toggleFavouriteInFirestore(
  uid: string,
  productId: string
): Promise<{ favourited: boolean; message: string }> {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  const current = snap.exists() && Array.isArray(snap.data().favourites)
    ? (snap.data().favourites as string[])
    : [];
  const exists = current.includes(productId);
  const next = exists ? current.filter((id) => id !== productId) : [...current, productId];
  await setDoc(userRef, { favourites: next, updatedAt: new Date().toISOString() }, { merge: true });
  return {
    favourited: !exists,
    message: !exists ? 'Saved to favourites' : 'Removed from favourites'
  };
}

export async function submitProductReportToFirestore(
  productId: string,
  reportData: { reason: string; details: string; reporterEmail?: string; productTitle?: string; sellerId?: string }
): Promise<{ success: boolean; message: string }> {
  const id = `report-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  await setDoc(doc(db, 'reports', id), stripUndefined({
    id,
    productId,
    productTitle: reportData.productTitle || '',
    sellerId: reportData.sellerId || '',
    reason: reportData.reason,
    details: reportData.details,
    reporterEmail: reportData.reporterEmail || 'anonymous@student.fuwukari.edu.ng',
    status: 'pending',
    createdAt: new Date().toISOString()
  }));
  return { success: true, message: 'Report submitted successfully to FU MARKET safety team.' };
}

// 6. Bike Riders (Wukari Okada Directory)
export async function getBikeRidersFromFirestore(areaFilter?: string): Promise<BikeRider[]> {
  const path = 'bikeRiders';
  try {
    const ridersCollection = collection(db, 'bikeRiders');
    let q = query(ridersCollection);
    if (areaFilter && areaFilter !== 'all' && areaFilter.trim().length > 0) {
      q = query(ridersCollection, where('area', '==', areaFilter));
    }

    const snapshot = await getDocs(q);
    const riders: BikeRider[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      riders.push({
        id: docSnap.id,
        name: data.name || '',
        photoUrl: data.photoUrl || '',
        phoneNumber: data.phoneNumber || '',
        whatsappNumber: data.whatsappNumber || data.phoneNumber || '',
        area: data.area || 'Anywhere in Wukari',
        isAvailable: data.isAvailable !== false,
        createdAt: toIsoString(data.createdAt),
        userId: data.userId || ''
      });
    });

    return riders.sort((a, b) => {
      if (a.isAvailable === b.isAvailable) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return a.isAvailable ? -1 : 1;
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return [];
  }
}

export async function saveBikeRiderToFirestore(rider: BikeRider): Promise<void> {
  const path = `bikeRiders/${rider.id}`;
  try {
    const riderRef = doc(db, 'bikeRiders', rider.id);
    await setDoc(riderRef, stripUndefined({
      ...rider,
      updatedAt: new Date().toISOString()
    }));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function createBikeRiderDirectlyInFirestore(
  data: Omit<BikeRider, 'id' | 'createdAt'>
): Promise<BikeRider> {
  const id = `rider-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();
  const rider: BikeRider = {
    ...data,
    id,
    createdAt: now,
    isAvailable: data.isAvailable !== false
  };

  await saveBikeRiderToFirestore(rider);
  return rider;
}

export async function updateBikeRiderAvailability(id: string, isAvailable: boolean): Promise<void> {
  const path = `bikeRiders/${id}`;
  try {
    const riderRef = doc(db, 'bikeRiders', id);
    await updateDoc(riderRef, {
      isAvailable,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// ============================================================================
// 1. SINGLE HUB - FUWukari (Open Group Chat Real-Time Persistence)
// ============================================================================

export function subscribeToHubMessages(
  callback: (messages: HubMessage[]) => void,
  limitCount: number = 80
): () => void {
  const path = 'hubMessages';
  try {
    const q = query(
      collection(db, path),
      orderBy('createdAt', 'asc'),
      limit(limitCount)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const msgs: HubMessage[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const img = typeof data.imageUrl === 'string' && data.imageUrl.trim().length > 0
            ? data.imageUrl.trim()
            : undefined;
          msgs.push({
            id: docSnap.id,
            senderId: data.senderId || '',
            senderName: data.senderName || 'Anonymous Student',
            matricNumber: data.matricNumber || '',
            text: data.text || '',
            ...(img ? { imageUrl: img } : {}),
            createdAt: toIsoString(data.createdAt),
            timestamp: data.timestamp || Date.now()
          });
        });
        callback(msgs);
      },
      (err) => {
        console.error('[subscribeToHubMessages error]:', err);
        callback([]);
      }
    );
  } catch (err) {
    console.error('[subscribeToHubMessages setup error]:', err);
    return () => {};
  }
}

export async function sendHubMessage(message: {
  senderId: string;
  senderName: string;
  matricNumber?: string;
  text?: string;
  imageUrl?: string | null;
}): Promise<void> {
  const path = 'hubMessages';
  const id = `hub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const messageData: Record<string, any> = {
    id,
    senderId: message.senderId,
    senderName: message.senderName || 'Anonymous Student',
    text: (message.text || '').trim(),
    createdAt: now,
    timestamp: Date.now()
  };

  if (message.matricNumber && message.matricNumber.trim()) {
    messageData.matricNumber = message.matricNumber.trim();
  }

  if (typeof message.imageUrl === 'string' && message.imageUrl.trim().length > 0) {
    messageData.imageUrl = message.imageUrl.trim();
  }

  try {
    const docRef = doc(db, path, id);
    await setDoc(docRef, stripUndefined(messageData));
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateHubPresence(
  userId: string,
  name: string,
  matricNumber?: string
): Promise<void> {
  try {
    const refDoc = doc(db, 'hubActiveUsers', userId);
    await setDoc(refDoc, stripUndefined({
      userId,
      name,
      matricNumber: matricNumber || '',
      lastActiveAt: Date.now()
    }), { merge: true });
  } catch (err) {
    console.warn('[updateHubPresence warning]:', err);
  }
}

export function subscribeToHubActiveUsers(
  callback: (count: number, users: HubActiveUser[]) => void
): () => void {
  const path = 'hubActiveUsers';
  try {
    const q = query(collection(db, path), limit(100));
    return onSnapshot(
      q,
      (snapshot) => {
        const threshold = Date.now() - 3 * 60 * 1000;
        const active: HubActiveUser[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.lastActiveAt && data.lastActiveAt >= threshold) {
            active.push({
              userId: docSnap.id,
              name: data.name || 'Student',
              matricNumber: data.matricNumber || '',
              lastActiveAt: data.lastActiveAt
            });
          }
        });
        callback(active.length, active);
      },
      (err) => {
        console.warn('[subscribeToHubActiveUsers warning]:', err);
        callback(0, []);
      }
    );
  } catch (err) {
    console.warn('[subscribeToHubActiveUsers setup warning]:', err);
    return () => {};
  }
}

// ============================================================================
// 2. FRIEND SYSTEM, PRESENCE & DIRECT/PRIVATE 1-ON-1 CHAT
// ============================================================================

export async function saveCampusUserProfile(user: RegisteredUser): Promise<void> {
  const path = `users/${user.id}`;
  try {
    const refDoc = doc(db, 'users', user.id);
    await setDoc(refDoc, stripUndefined({
      ...user,
      isOnline: true,
      lastSeen: Date.now(),
      updatedAt: new Date().toISOString()
    }), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export function subscribeToRegisteredUsers(
  currentUserId: string,
  callback: (users: RegisteredUser[]) => void
): () => void {
  const path = 'users';
  try {
    const q = query(collection(db, path), limit(200));
    return onSnapshot(
      q,
      (snapshot) => {
        const now = Date.now();
        const onlineThresholdMs = 5 * 60 * 1000;
        const list: RegisteredUser[] = [];
        snapshot.forEach((docSnap) => {
          if (docSnap.id !== currentUserId) {
            const data = docSnap.data();
            const lastSeenMs =
              typeof data.lastSeen === 'number'
                ? data.lastSeen
                : data.lastSeen
                ? Date.parse(String(data.lastSeen)) || 0
                : 0;
            const actuallyOnline = lastSeenMs > 0 && now - lastSeenMs <= onlineThresholdMs;
            list.push({
              id: docSnap.id,
              name: data.name || 'FUWUKARI Student',
              matricNumber: data.matricNumber || '',
              email: data.email || '',
              phone: data.phone || data.whatsappNumber || '',
              whatsappNumber: data.whatsappNumber || data.phone || '',
              avatarUrl: data.avatarUrl || '',
              isOnline: actuallyOnline,
              lastSeen: data.lastSeen,
              department: data.department || '',
              bio: data.bio || '',
              createdAt: data.createdAt ? toIsoString(data.createdAt) : ''
            });
          }
        });
        callback(list);
      },
      (err) => {
        console.error('[subscribeToRegisteredUsers error]:', err);
        callback([]);
      }
    );
  } catch (err) {
    console.error('[subscribeToRegisteredUsers setup error]:', err);
    return () => {};
  }
}

export async function sendFriendRequest(
  fromUser: { id: string; name: string; matricNumber?: string; avatarUrl?: string },
  toUser: { id: string; name: string }
): Promise<void> {
  const path = 'friendRequests';
  const requestId = `req_${[fromUser.id, toUser.id].sort().join('_')}`;

  try {
    const refDoc = doc(db, path, requestId);
    await setDoc(refDoc, stripUndefined({
      id: requestId,
      fromId: fromUser.id,
      fromName: fromUser.name,
      fromMatric: fromUser.matricNumber || '',
      fromAvatar: fromUser.avatarUrl || '',
      toId: toUser.id,
      toName: toUser.name,
      status: 'pending',
      createdAt: new Date().toISOString()
    }));
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export function subscribeToFriendRequests(
  userId: string,
  callback: (requests: FriendRequest[]) => void
): () => void {
  const path = 'friendRequests';
  try {
    const q = query(collection(db, path), limit(150));

    return onSnapshot(
      q,
      (snapshot) => {
        const list: FriendRequest[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.toId === userId || data.fromId === userId) {
            list.push({
              id: docSnap.id,
              fromId: data.fromId,
              fromName: data.fromName || 'Student',
              fromMatric: data.fromMatric || '',
              fromAvatar: data.fromAvatar || '',
              toId: data.toId,
              toName: data.toName || 'Student',
              status: data.status || 'pending',
              createdAt: toIsoString(data.createdAt)
            });
          }
        });
        callback(list);
      },
      (err) => {
        console.error('[subscribeToFriendRequests error]:', err);
        callback([]);
      }
    );
  } catch (err) {
    console.error('[subscribeToFriendRequests setup error]:', err);
    return () => {};
  }
}

export async function respondToFriendRequest(
  request: FriendRequest,
  action: 'accepted' | 'rejected'
): Promise<void> {
  const reqRef = doc(db, 'friendRequests', request.id);
  try {
    if (action === 'accepted') {
      await updateDoc(reqRef, {
        status: 'accepted',
        acceptedAt: new Date().toISOString()
      });

      const pairKey = [request.fromId, request.toId].sort().join('_');
      const friendRef = doc(db, 'friends', pairKey);
      await setDoc(friendRef, stripUndefined({
        id: pairKey,
        userA: request.fromId,
        userAName: request.fromName,
        userAMatric: request.fromMatric || '',
        userB: request.toId,
        userBName: request.toName,
        chatId: pairKey,
        friendSince: new Date().toISOString()
      }));
    } else {
      await updateDoc(reqRef, {
        status: 'rejected',
        rejectedAt: new Date().toISOString()
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `friendRequests/${request.id}`);
  }
}

export function subscribeToFriends(
  userId: string,
  callback: (friends: Friend[]) => void
): () => void {
  const path = 'friends';
  try {
    const q = query(collection(db, path), limit(150));
    return onSnapshot(
      q,
      async (snapshot) => {
        const list: Friend[] = [];
        const now = Date.now();
        const onlineThresholdMs = 5 * 60 * 1000;

        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          if (data.userA === userId || data.userB === userId) {
            const isUserA = data.userA === userId;
            const friendUserId = isUserA ? data.userB : data.userA;
            const friendName = isUserA ? data.userBName : data.userAName;
            const friendMatric = isUserA ? data.userBMatric : data.userAMatric;

            let isOnline = false;
            let lastSeen: number | string | undefined;
            try {
              const userDoc = await getDoc(doc(db, 'users', friendUserId));
              if (userDoc.exists()) {
                const uData = userDoc.data();
                lastSeen = uData.lastSeen;
                const lastSeenMs =
                  typeof uData.lastSeen === 'number'
                    ? uData.lastSeen
                    : uData.lastSeen
                    ? Date.parse(String(uData.lastSeen)) || 0
                    : 0;
                isOnline = lastSeenMs > 0 && now - lastSeenMs <= onlineThresholdMs;
              }
            } catch {
              isOnline = false;
            }

            list.push({
              id: docSnap.id,
              userId: friendUserId,
              name: friendName || 'FUWUKARI Friend',
              matricNumber: friendMatric || '',
              avatarUrl: data.avatarUrl || '',
              friendSince: toIsoString(data.friendSince),
              isOnline,
              lastSeen,
              chatId: data.chatId || docSnap.id
            });
          }
        }
        callback(list);
      },
      (err) => {
        console.error('[subscribeToFriends error]:', err);
        callback([]);
      }
    );
  } catch (err) {
    console.error('[subscribeToFriends setup error]:', err);
    return () => {};
  }
}

export function getPrivateChatId(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join('_');
}

/**
 * Ensures a direct 1-on-1 chat metadata document exists between Buyer & Seller,
 * Student & Agent, or Student & Requester so they can message immediately.
 */
export async function openOrCreateDirectChat(
  currentUser: { id: string; name: string; matricNumber?: string },
  targetUser: { id: string; name: string; matricNumber?: string }
): Promise<string> {
  const chatId = getPrivateChatId(currentUser.id, targetUser.id);
  const chatRef = doc(db, 'privateChats', chatId);
  try {
    await setDoc(
      chatRef,
      stripUndefined({
        chatId,
        participants: [currentUser.id, targetUser.id].sort(),
        participantNames: {
          [currentUser.id]: currentUser.name,
          [targetUser.id]: targetUser.name
        },
        participantMatrics: {
          ...(currentUser.matricNumber ? { [currentUser.id]: currentUser.matricNumber } : {}),
          ...(targetUser.matricNumber ? { [targetUser.id]: targetUser.matricNumber } : {})
        },
        updatedAt: new Date().toISOString()
      }),
      { merge: true }
    );
    return chatId;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `privateChats/${chatId}`);
  }
}

export function subscribeToMyPrivateChats(
  userId: string,
  callback: (chats: ChatMetadata[]) => void
): () => void {
  try {
    const q = query(
      collection(db, 'privateChats'),
      where('participants', 'array-contains', userId),
      limit(100)
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const chats: ChatMetadata[] = [];
        snapshot.forEach((docSnap) => {
          chats.push({
            ...(docSnap.data() as ChatMetadata),
            chatId: docSnap.id
          });
        });
        chats.sort((a, b) => {
          const tA = Date.parse(a.lastMessageTime || a.updatedAt || '') || 0;
          const tB = Date.parse(b.lastMessageTime || b.updatedAt || '') || 0;
          return tB - tA;
        });
        callback(chats);
      },
      (err) => {
        console.warn('[subscribeToMyPrivateChats warning]:', err);
        callback([]);
      }
    );
  } catch (err) {
    return () => {};
  }
}

export function subscribeToPrivateMessages(
  chatId: string,
  callback: (messages: PrivateMessage[]) => void
): () => void {
  const path = `privateChats/${chatId}/messages`;
  try {
    const q = query(
      collection(db, path),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const list: PrivateMessage[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const img = typeof data.imageUrl === 'string' && data.imageUrl.trim().length > 0
            ? data.imageUrl.trim()
            : undefined;
          list.push({
            id: docSnap.id,
            chatId,
            senderId: data.senderId,
            senderName: data.senderName,
            text: data.text || '',
            ...(img ? { imageUrl: img } : {}),
            createdAt: toIsoString(data.createdAt),
            timestamp: data.timestamp || Date.now(),
            seen: Boolean(data.seen),
            seenAt: data.seenAt
          });
        });
        callback(list);
      },
      (err) => {
        console.error('[subscribeToPrivateMessages error]:', err);
        callback([]);
      }
    );
  } catch (err) {
    console.error('[subscribeToPrivateMessages setup error]:', err);
    return () => {};
  }
}

export async function sendPrivateMessage(
  chatId: string,
  msg: {
    senderId: string;
    senderName: string;
    text?: string;
    imageUrl?: string | null;
    participants?: string[];
  }
): Promise<void> {
  const msgId = `pmsg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const msgRef = doc(db, `privateChats/${chatId}/messages`, msgId);
  const chatRef = doc(db, 'privateChats', chatId);

  const payload: Record<string, any> = {
    id: msgId,
    chatId,
    senderId: msg.senderId,
    senderName: msg.senderName,
    text: (msg.text || '').trim(),
    createdAt: now,
    timestamp: Date.now(),
    seen: false
  };

  if (typeof msg.imageUrl === 'string' && msg.imageUrl.trim().length > 0) {
    payload.imageUrl = msg.imageUrl.trim();
  }

  try {
    await setDoc(msgRef, stripUndefined(payload));

    await setDoc(
      chatRef,
      stripUndefined({
        chatId,
        ...(Array.isArray(msg.participants) && msg.participants.length > 0 ? { participants: msg.participants } : {}),
        lastMessageText: payload.text || (payload.imageUrl ? 'Photo' : ''),
        lastMessageTime: now,
        lastSenderId: msg.senderId,
        updatedAt: now
      }),
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `privateChats/${chatId}/messages`);
  }
}

export async function setChatTypingStatus(
  chatId: string,
  userId: string,
  isTyping: boolean
): Promise<void> {
  try {
    const chatRef = doc(db, 'privateChats', chatId);
    await setDoc(
      chatRef,
      {
        [`typing.${userId}`]: isTyping ? Date.now() : 0
      },
      { merge: true }
    );
  } catch {
    // Non-blocking
  }
}

export function subscribeToChatMetadata(
  chatId: string,
  callback: (meta: ChatMetadata | null) => void
): () => void {
  try {
    const chatRef = doc(db, 'privateChats', chatId);
    return onSnapshot(
      chatRef,
      (snapshot) => {
        if (snapshot.exists()) {
          callback(snapshot.data() as ChatMetadata);
        } else {
          callback(null);
        }
      },
      (err) => {
        console.warn('[subscribeToChatMetadata error]:', err);
        callback(null);
      }
    );
  } catch {
    return () => {};
  }
}

export async function markPrivateMessagesSeen(
  chatId: string,
  readerId: string
): Promise<void> {
  try {
    const q = query(
      collection(db, `privateChats/${chatId}/messages`),
      limit(25)
    );
    const snap = await getDocs(q);
    const now = new Date().toISOString();
    snap.forEach(async (d) => {
      const data = d.data();
      if (data.senderId !== readerId && !data.seen) {
        await updateDoc(d.ref, { seen: true, seenAt: now });
      }
    });
  } catch {
    // Non-blocking
  }
}

// ============================================================================
// 3. WUKARI AGENT (Rent & Roommate Housing Persistence)
// ============================================================================

export async function createHuxListing(
  data: Omit<HuxListing, 'id' | 'createdAt'>
): Promise<HuxListing> {
  const path = 'hux';
  const id = `hux-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const cleanedImages = Array.isArray(data.images)
    ? data.images.filter((img) => isValidImageUrl(img))
    : [];

  const hux: HuxListing = stripUndefined({
    ...data,
    id,
    images: cleanedImages,
    imageUrl: cleanedImages[0] || '',
    isAvailable: data.isAvailable !== false,
    createdAt: now,
    updatedAt: now,
    savedCount: 0
  });

  try {
    const refDoc = doc(db, path, id);
    await setDoc(refDoc, stripUndefined(hux));
    return hux;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
    throw err;
  }
}

export async function updateHuxListing(
  id: string,
  updates: Partial<HuxListing>
): Promise<void> {
  const path = `hux/${id}`;
  try {
    const refDoc = doc(db, 'hux', id);
    await updateDoc(
      refDoc,
      stripUndefined({
        ...updates,
        updatedAt: new Date().toISOString()
      })
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export function subscribeToHuxListings(
  category: HuxCategory | 'all',
  callback: (listings: HuxListing[]) => void
): () => void {
  const path = 'hux';
  try {
    const q = query(
      collection(db, path),
      orderBy('createdAt', 'desc'),
      limit(120)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const list: HuxListing[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as HuxListing;
          if (category === 'all' || data.category === category) {
            const imgs = Array.isArray(data.images) ? data.images.filter((i) => isValidImageUrl(i)) : [];
            list.push({
              ...data,
              id: docSnap.id,
              images: imgs,
              imageUrl: data.imageUrl && isValidImageUrl(data.imageUrl) ? data.imageUrl : imgs[0] || '',
              isAvailable: data.isAvailable !== false,
              createdAt: toIsoString(data.createdAt)
            });
          }
        });
        callback(list);
      },
      (err) => {
        console.error('[subscribeToHuxListings error]:', err);
        callback([]);
      }
    );
  } catch (err) {
    console.error('[subscribeToHuxListings setup error]:', err);
    return () => {};
  }
}

export async function deleteHuxListing(id: string): Promise<void> {
  const path = `hux/${id}`;
  try {
    const refDoc = doc(db, 'hux', id);
    await deleteDoc(refDoc);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function reportHuxListing(report: Omit<HuxReport, 'id' | 'createdAt'>): Promise<void> {
  const path = 'huxReports';
  const id = `report-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  try {
    const refDoc = doc(db, path, id);
    await setDoc(refDoc, stripUndefined({
      ...report,
      id,
      status: 'pending',
      createdAt: new Date().toISOString()
    }));
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export function subscribeToHuxReports(
  callback: (reports: HuxReport[]) => void
): () => void {
  try {
    const q = query(collection(db, 'huxReports'), orderBy('createdAt', 'desc'), limit(100));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: HuxReport[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            huxId: data.huxId || '',
            huxTitle: data.huxTitle || '',
            reason: data.reason || '',
            details: data.details || '',
            reporterName: data.reporterName || '',
            reporterContact: data.reporterContact || '',
            status: data.status || 'pending',
            createdAt: toIsoString(data.createdAt)
          });
        });
        callback(list);
      },
      () => callback([])
    );
  } catch {
    return () => {};
  }
}

export async function resolveHuxReport(
  id: string,
  status: 'resolved' | 'dismissed'
): Promise<void> {
  const path = `huxReports/${id}`;
  try {
    await updateDoc(doc(db, 'huxReports', id), { status });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// ============================================================================
// 4. WHAT STUDENTS NEED ("studentRequests" collection)
// ============================================================================

export async function createStudentRequest(
  data: Omit<StudentRequest, 'id' | 'createdAt' | 'status'>
): Promise<StudentRequest> {
  const path = 'studentRequests';
  const id = `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const payload: Record<string, any> = {
    id,
    title: String(data.title || '').trim(),
    description: String(data.description || '').trim(),
    budget: Number(data.budget) || 0,
    location: String(data.location || '').trim(),
    phone: String(data.phone || '').trim(),
    whatsapp: String(data.whatsapp || data.phone || '').trim(),
    userId: data.userId,
    userName: data.userName,
    status: 'open',
    createdAt: now,
    updatedAt: now
  };

  if (data.matricNumber && data.matricNumber.trim()) {
    payload.matricNumber = data.matricNumber.trim();
  }
  if (typeof data.imageUrl === 'string' && isValidImageUrl(data.imageUrl)) {
    payload.imageUrl = data.imageUrl.trim();
  }

  try {
    await setDoc(doc(db, path, id), stripUndefined(payload));
    return payload as StudentRequest;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
    throw err;
  }
}

export async function updateStudentRequest(
  id: string,
  updates: Partial<StudentRequest>
): Promise<void> {
  const path = `studentRequests/${id}`;
  try {
    const cleanUpdates: Record<string, any> = { ...updates, updatedAt: new Date().toISOString() };
    if (cleanUpdates.imageUrl === undefined || cleanUpdates.imageUrl === null || cleanUpdates.imageUrl === '') {
      delete cleanUpdates.imageUrl;
    }
    await updateDoc(doc(db, 'studentRequests', id), stripUndefined(cleanUpdates));
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteStudentRequest(id: string): Promise<void> {
  const path = `studentRequests/${id}`;
  try {
    await deleteDoc(doc(db, 'studentRequests', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export function subscribeToStudentRequests(
  callback: (requests: StudentRequest[]) => void
): () => void {
  const path = 'studentRequests';
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'), limit(120));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: StudentRequest[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const img = typeof data.imageUrl === 'string' && isValidImageUrl(data.imageUrl)
            ? data.imageUrl.trim()
            : undefined;
          list.push({
            id: docSnap.id,
            title: data.title || '',
            description: data.description || '',
            budget: Number(data.budget) || 0,
            location: data.location || '',
            phone: data.phone || '',
            whatsapp: data.whatsapp || data.phone || '',
            ...(img ? { imageUrl: img } : {}),
            userId: data.userId || '',
            userName: data.userName || 'FUWUKARI Student',
            matricNumber: data.matricNumber || '',
            status: data.status === 'fulfilled' ? 'fulfilled' : 'open',
            createdAt: toIsoString(data.createdAt),
            updatedAt: data.updatedAt ? toIsoString(data.updatedAt) : undefined
          });
        });
        callback(list);
      },
      (err) => {
        console.error('[subscribeToStudentRequests error]:', err);
        callback([]);
      }
    );
  } catch (err) {
    console.error('[subscribeToStudentRequests setup error]:', err);
    return () => {};
  }
}

// ============================================================================
// 5. ORDERS & CART REVIEW PERSISTENCE ("orders" collection)
// ============================================================================

export async function createOrderInFirestore(
  orderData: Omit<OrderRecord, 'id' | 'createdAt' | 'status'>
): Promise<OrderRecord> {
  const path = 'orders';
  const id = `ord-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const order: OrderRecord = stripUndefined({
    ...orderData,
    id,
    status: 'pending_confirmation',
    createdAt: now
  });

  try {
    await setDoc(doc(db, path, id), stripUndefined(order));
    return order;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
    throw err;
  }
}
