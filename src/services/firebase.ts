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
  User as FirebaseUser
} from 'firebase/auth';
import activeFirebaseConfig from './firebaseConfig.js';
import { isValidImageUrl } from '../utils/productImages.js';
import {
  Product,
  User,
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

// 5. Firebase Authentication Helpers
export async function signInWithGoogle(): Promise<{ user: User; firebaseUser: FirebaseUser }> {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    const fbUser = cred.user;

    const userDocRef = doc(db, 'users', fbUser.uid);
    const userDoc = await getDoc(userDocRef);

    let appUser: User;
    if (userDoc.exists()) {
      appUser = userDoc.data() as User;
    } else {
      appUser = stripUndefined({
        id: fbUser.uid,
        name: fbUser.displayName || 'FUWUKARI Student',
        email: fbUser.email || '',
        role: 'seller' as const,
        phone: fbUser.phoneNumber || '',
        whatsappNumber: fbUser.phoneNumber || '',
        state: 'Taraba',
        city: 'Wukari',
        ...(fbUser.photoURL ? { avatarUrl: fbUser.photoURL } : {}),
        createdAt: new Date().toISOString()
      });
      await setDoc(userDocRef, appUser);
    }

    return { user: appUser, firebaseUser: fbUser };
  } catch (err) {
    console.error('Google Sign-In Error:', err);
    throw err;
  }
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
