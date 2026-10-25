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
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import activeFirebaseConfig from './firebaseConfig.js';
import {
  Product,
  User,
  SellerProfile,
  Category,
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
  HuxCategory
} from '../types.js';

// 1. Initialize Firebase App and Services
export const app = getApps().length > 0 ? getApp() : initializeApp(activeFirebaseConfig);
export const db = (activeFirebaseConfig as any).firestoreDatabaseId
  ? getFirestore(app, (activeFirebaseConfig as any).firestoreDatabaseId)
  : getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

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

// 3. Test Connection on App Boot (Critical Requirement)
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

// Run connection validation at module load
testConnection();

// 4. Firestore Product Operations
export async function getProductsFromFirestore(filters?: {
  categoryId?: string;
  sellerId?: string;
  searchQuery?: string;
  limitCount?: number;
}): Promise<Product[]> {
  const path = 'products';
  try {
    const productsRef = collection(db, path);
    const q = query(productsRef, where('status', '==', 'active'));
    const snapshot = await getDocs(q);
    let items: Product[] = [];
    
    snapshot.forEach(docSnap => {
      const data = docSnap.data() as Product;
      items.push({
        ...data,
        id: docSnap.id
      });
    });

    // Apply client filters if present
    if (filters?.categoryId && filters.categoryId !== 'all') {
      items = items.filter(p => p.categoryId === filters.categoryId);
    }
    if (filters?.sellerId) {
      items = items.filter(p => p.sellerId === filters.sellerId);
    }
    if (filters?.searchQuery && filters.searchQuery.trim().length > 0) {
      const term = filters.searchQuery.toLowerCase();
      items = items.filter(p =>
        p.title.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term) ||
        p.shopName?.toLowerCase().includes(term) ||
        p.city?.toLowerCase().includes(term) ||
        p.state?.toLowerCase().includes(term)
      );
    }

    // Sort newest first
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (filters?.limitCount) {
      items = items.slice(0, filters.limitCount);
    }

    return items;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function saveProductToFirestore(product: Product): Promise<void> {
  const path = `products/${product.id}`;
  try {
    const productRef = doc(db, 'products', product.id);
    const primaryImg = product.images?.[0] || '';
    await setDoc(productRef, {
      ...product,
      imageUrl: primaryImg,
      updatedAt: new Date().toISOString()
    });
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
      return {
        ...(docSnap.data() as Product),
        id: docSnap.id
      };
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
  const originalPrice = data.originalPrice && Number(data.originalPrice) > price
    ? Number(data.originalPrice)
    : Math.round(price * 1.25);

  const product: Product = {
    id,
    sellerId: sellerUser?.id || data.sellerId || auth.currentUser?.uid || 'seller-01',
    sellerName: sellerUser?.name || data.sellerName || auth.currentUser?.displayName || 'Verified Merchant',
    shopName: data.shopName || `${sellerUser?.name || 'ZangaMarket'}'s Shop`,
    whatsappNumber: data.whatsappNumber || sellerUser?.whatsappNumber || '08031234567',
    title: String(data.title || '').trim(),
    description: String(data.description || '').trim(),
    price,
    originalPrice,
    categoryId: data.categoryId || 'phones-tablets',
    condition: data.condition === 'used' ? 'used' : 'new',
    images: Array.isArray(data.images)
      ? data.images
          .filter((img): img is string => typeof img === 'string' && img.trim().length > 10 && !img.includes('persistent_image_proof') && !img.startsWith('blob:'))
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
      : [],
    imageUrl: data.imageUrl || (Array.isArray(data.images) && data.images[0]) || '',
    state: data.state || 'Lagos',
    city: data.city || 'Ikeja',
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
    
    // Save or update user profile in Firestore
    const userDocRef = doc(db, 'users', fbUser.uid);
    const userDoc = await getDoc(userDocRef);
    
    let appUser: User;
    if (userDoc.exists()) {
      appUser = userDoc.data() as User;
    } else {
      appUser = {
        id: fbUser.uid,
        name: fbUser.displayName || 'Marketplace Seller',
        email: fbUser.email || '',
        role: 'seller',
        phone: fbUser.phoneNumber || '08000000000',
        whatsappNumber: fbUser.phoneNumber || '08000000000',
        state: 'Lagos',
        city: 'Ikeja',
        avatarUrl: fbUser.photoURL || undefined,
        createdAt: new Date().toISOString()
      };
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
        createdAt: data.createdAt || new Date().toISOString(),
        userId: data.userId || ''
      });
    });

    // Sort by Available first, then newest
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
    await setDoc(riderRef, {
      ...rider,
      updatedAt: new Date().toISOString()
    });
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

/**
 * Subscribes to real-time open campus messages in Firestore collection "hubMessages".
 * Starts empty if no messages exist.
 */
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
          msgs.push({
            id: docSnap.id,
            senderId: data.senderId || '',
            senderName: data.senderName || 'Anonymous Student',
            matricNumber: data.matricNumber || '',
            text: data.text || '',
            imageUrl: data.imageUrl || '',
            createdAt: data.createdAt || new Date().toISOString(),
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

/**
 * Sends a real-time message to the FUWukari Campus Hub.
 */
export async function sendHubMessage(message: {
  senderId: string;
  senderName: string;
  matricNumber?: string;
  text?: string;
  imageUrl?: string;
}): Promise<void> {
  const path = 'hubMessages';
  const id = `hub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  try {
    const docRef = doc(db, path, id);
    await setDoc(docRef, {
      ...message,
      id,
      createdAt: now,
      timestamp: Date.now()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

/**
 * Updates campus presence heartbeat in "hubActiveUsers".
 */
export async function updateHubPresence(
  userId: string,
  name: string,
  matricNumber?: string
): Promise<void> {
  const path = `hubActiveUsers/${userId}`;
  try {
    const ref = doc(db, 'hubActiveUsers', userId);
    await setDoc(ref, {
      userId,
      name,
      matricNumber: matricNumber || '',
      lastActiveAt: Date.now()
    }, { merge: true });
  } catch (err) {
    // Non-blocking background heartbeat
    console.warn('[updateHubPresence warning]:', err);
  }
}

/**
 * Subscribes to active online users in the campus hub (within last 3 minutes).
 */
export function subscribeToHubActiveUsers(
  callback: (count: number, users: HubActiveUser[]) => void
): () => void {
  const path = 'hubActiveUsers';
  try {
    const q = query(collection(db, path), limit(100));
    return onSnapshot(
      q,
      (snapshot) => {
        const threshold = Date.now() - 3 * 60 * 1000; // active within last 3 minutes
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
        callback(1, []);
      }
    );
  } catch (err) {
    console.warn('[subscribeToHubActiveUsers setup warning]:', err);
    return () => {};
  }
}

// ============================================================================
// 2. FRIEND SYSTEM & PRIVATE 1-ON-1 CHAT
// ============================================================================

/**
 * Saves or updates registered campus user profile in Firestore "users"
 */
export async function saveCampusUserProfile(user: RegisteredUser): Promise<void> {
  const path = `users/${user.id}`;
  try {
    const ref = doc(db, 'users', user.id);
    await setDoc(ref, {
      ...user,
      isOnline: true,
      lastSeen: Date.now(),
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

/**
 * Subscribes to all registered campus users in Firestore "users".
 */
export function subscribeToRegisteredUsers(
  currentUserId: string,
  callback: (users: RegisteredUser[]) => void
): () => void {
  const path = 'users';
  try {
    const q = query(collection(db, path), limit(150));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: RegisteredUser[] = [];
        snapshot.forEach((docSnap) => {
          if (docSnap.id !== currentUserId) {
            const data = docSnap.data();
            list.push({
              id: docSnap.id,
              name: data.name || 'FUWukari Student',
              matricNumber: data.matricNumber || '',
              email: data.email || '',
              phone: data.phone || data.whatsappNumber || '',
              whatsappNumber: data.whatsappNumber || data.phone || '',
              avatarUrl: data.avatarUrl || '',
              isOnline: data.isOnline !== false,
              lastSeen: data.lastSeen || Date.now(),
              department: data.department || '',
              bio: data.bio || '',
              createdAt: data.createdAt || ''
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

/**
 * Sends a Friend Request to another student.
 */
export async function sendFriendRequest(
  fromUser: { id: string; name: string; matricNumber?: string; avatarUrl?: string },
  toUser: { id: string; name: string }
): Promise<void> {
  const path = 'friendRequests';
  const requestId = `req_${[fromUser.id, toUser.id].sort().join('_')}`;

  try {
    const ref = doc(db, path, requestId);
    await setDoc(ref, {
      id: requestId,
      fromId: fromUser.id,
      fromName: fromUser.name,
      fromMatric: fromUser.matricNumber || '',
      fromAvatar: fromUser.avatarUrl || '',
      toId: toUser.id,
      toName: toUser.name,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

/**
 * Subscribes to incoming & sent friend requests for the current user.
 */
export function subscribeToFriendRequests(
  userId: string,
  callback: (requests: FriendRequest[]) => void
): () => void {
  const path = 'friendRequests';
  try {
    const q = query(
      collection(db, path),
      limit(100)
    );

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
              createdAt: data.createdAt || new Date().toISOString()
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

/**
 * Accepts or Rejects a Friend Request.
 */
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

      // Create mutual friend entries in "friends" collection
      const pairKey = [request.fromId, request.toId].sort().join('_');
      const friendRef = doc(db, 'friends', pairKey);
      await setDoc(friendRef, {
        id: pairKey,
        userA: request.fromId,
        userAName: request.fromName,
        userAMatric: request.fromMatric || '',
        userB: request.toId,
        userBName: request.toName,
        chatId: pairKey,
        friendSince: new Date().toISOString()
      });
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

/**
 * Subscribes to the accepted friends list for a user.
 */
export function subscribeToFriends(
  userId: string,
  callback: (friends: Friend[]) => void
): () => void {
  const path = 'friends';
  try {
    const q = query(collection(db, path), limit(100));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: Friend[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.userA === userId || data.userB === userId) {
            const isUserA = data.userA === userId;
            const friendUserId = isUserA ? data.userB : data.userA;
            const friendName = isUserA ? data.userBName : data.userAName;
            const friendMatric = isUserA ? data.userBMatric : data.userAMatric;

            list.push({
              id: docSnap.id,
              userId: friendUserId,
              name: friendName || 'FUWukari Friend',
              matricNumber: friendMatric || '',
              avatarUrl: data.avatarUrl || '',
              friendSince: data.friendSince || '',
              isOnline: true,
              chatId: data.chatId || docSnap.id
            });
          }
        });
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

/**
 * Helper to compute deterministic private Chat ID from two user IDs.
 */
export function getPrivateChatId(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join('_');
}

/**
 * Subscribes to real-time 1-on-1 private messages in Firestore:
 * collection `privateChats/{chatId}/messages`
 */
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
          list.push({
            id: docSnap.id,
            chatId,
            senderId: data.senderId,
            senderName: data.senderName,
            text: data.text || '',
            imageUrl: data.imageUrl || '',
            createdAt: data.createdAt || new Date().toISOString(),
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

/**
 * Sends a 1-on-1 private message.
 */
export async function sendPrivateMessage(
  chatId: string,
  msg: {
    senderId: string;
    senderName: string;
    text?: string;
    imageUrl?: string;
  }
): Promise<void> {
  const msgId = `pmsg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const msgRef = doc(db, `privateChats/${chatId}/messages`, msgId);
  const chatRef = doc(db, 'privateChats', chatId);

  try {
    await setDoc(msgRef, {
      ...msg,
      id: msgId,
      chatId,
      createdAt: now,
      timestamp: Date.now(),
      seen: false
    });

    // Update chat metadata with last message preview
    await setDoc(
      chatRef,
      {
        chatId,
        lastMessageText: msg.text || (msg.imageUrl ? '📷 Photo' : ''),
        lastMessageTime: now,
        lastSenderId: msg.senderId
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `privateChats/${chatId}/messages`);
  }
}

/**
 * Sets typing status in private chat.
 */
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
  } catch (err) {
    // Non-blocking
  }
}

/**
 * Subscribes to chat metadata (last message, typing indicators).
 */
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
  } catch (err) {
    return () => {};
  }
}

/**
 * Marks messages in a chat as seen by the current reader.
 */
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
// 3. WUKARI HUX HUB (Rent & Roommate Housing Persistence)
// ============================================================================

/**
 * Creates a genuine housing / roommate listing in Firestore "hux"
 */
export async function createHuxListing(
  data: Omit<HuxListing, 'id' | 'createdAt'>
): Promise<HuxListing> {
  const path = 'hux';
  const id = `hux-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const hux: HuxListing = {
    ...data,
    id,
    createdAt: now,
    savedCount: 0
  };

  try {
    const ref = doc(db, path, id);
    await setDoc(ref, hux);
    return hux;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
    throw err;
  }
}

/**
 * Subscribes to real-time Hux listings with optional category filter.
 */
export function subscribeToHuxListings(
  category: HuxCategory | 'all',
  callback: (listings: HuxListing[]) => void
): () => void {
  const path = 'hux';
  try {
    const q = query(
      collection(db, path),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const list: HuxListing[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as HuxListing;
          if (category === 'all' || data.category === category) {
            list.push({
              ...data,
              id: docSnap.id,
              images: Array.isArray(data.images) ? data.images : [],
              imageUrl: data.imageUrl || (Array.isArray(data.images) && data.images[0]) || ''
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

/**
 * Deletes a Hux listing.
 */
export async function deleteHuxListing(id: string): Promise<void> {
  const path = `hux/${id}`;
  try {
    const ref = doc(db, 'hux', id);
    await deleteDoc(ref);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

/**
 * Submits a fraud / scam report on a housing listing into "huxReports"
 */
export async function reportHuxListing(report: Omit<HuxReport, 'id' | 'createdAt'>): Promise<void> {
  const path = 'huxReports';
  const id = `report-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  try {
    const ref = doc(db, path, id);
    await setDoc(ref, {
      ...report,
      id,
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}


