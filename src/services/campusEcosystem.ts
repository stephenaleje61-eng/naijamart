import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import {
  AccommodationInspectionRequest,
  AmbassadorApplication,
  CampusBookListing,
  CampusJobListing,
  CodPolicySettings,
  DeliveryPartner,
  FoodCategoryId,
  FoodMenuItem,
  FoodOrder,
  FoodOrderStatus,
  FoodVendor,
  HouseAgentVerificationRequest,
  InspectionRequestStatus,
  ProductReview,
  ReferralRecord,
  SellerFollower,
  StudentDeal,
  StudentGiveaway
} from '../types.js';
import {
  db,
  OperationType,
  handleFirestoreError,
  stripUndefined,
  toIsoString
} from './firebase.js';
import { createNotification } from './notifications.js';

export const FOOD_CATEGORIES: FoodCategoryId[] = [
  'Rice & Stew',
  'Swallow & Soup',
  'Fast Food',
  'Snacks',
  'Drinks',
  'Shawarma',
  'Small Chops',
  'Grilled Chicken & Fish',
  'Breakfast',
  'Pastries',
  'Healthy Meals',
  'Student Meal Combos'
];

export const FOOD_ORDER_STAGES: FoodOrderStatus[] = [
  'Order Received',
  'Order Accepted',
  'Preparing Food',
  'Ready for Pickup',
  'Out for Delivery',
  'Delivered'
];

// ============================================================================
// PRODUCT REVIEWS & SELLER FOLLOWING
// ============================================================================
export function subscribeToProductReviews(
  productId: string,
  onData: (reviews: ProductReview[]) => void
): () => void {
  if (!productId) {
    onData([]);
    return () => {};
  }
  const q = query(
    collection(db, 'productReviews'),
    where('productId', '==', productId),
    limit(80)
  );
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d) => ({
          ...(d.data() as ProductReview),
          id: d.id,
          createdAt: toIsoString((d.data() as any).createdAt)
        }))
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
        .slice(0, 50);
      onData(items);
    },
    () => onData([])
  );
}

export async function submitProductReview(params: {
  productId: string;
  sellerId?: string;
  reviewerId: string;
  reviewerName: string;
  institutionId?: string;
  rating: number;
  comment: string;
}): Promise<ProductReview> {
  const cleanRating = Math.max(1, Math.min(5, Math.round(params.rating)));
  const cleanComment = params.comment.trim();
  if (!cleanComment || cleanComment.length < 3) {
    throw new Error('Please write a genuine review of at least 3 characters.');
  }
  const id = `rev_${params.productId}_${params.reviewerId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  const nowIso = new Date().toISOString();
  const payload: ProductReview = stripUndefined({
    id,
    productId: params.productId,
    sellerId: params.sellerId,
    reviewerId: params.reviewerId,
    reviewerName: params.reviewerName.trim() || 'Student Buyer',
    institutionId: params.institutionId,
    rating: cleanRating,
    comment: cleanComment.slice(0, 800),
    createdAt: nowIso,
    updatedAt: nowIso
  });

  try {
    await setDoc(doc(db, 'productReviews', id), payload, { merge: true });
    if (params.sellerId && params.sellerId !== params.reviewerId) {
      createNotification({
        userId: params.sellerId,
        type: 'enquiry',
        title: `New ${cleanRating}-star product review`,
        body: `${payload.reviewerName}: "${payload.comment.slice(0, 90)}"`,
        targetType: 'product',
        targetId: params.productId,
        institutionId: params.institutionId
      }).catch(() => {});
    }
    return payload;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `productReviews/${id}`);
    throw err;
  }
}

export function subscribeToSellerFollowers(
  sellerId: string,
  onData: (followers: SellerFollower[]) => void
): () => void {
  if (!sellerId) {
    onData([]);
    return () => {};
  }
  const q = query(
    collection(db, 'sellerFollowers'),
    where('sellerId', '==', sellerId),
    limit(250)
  );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ ...(d.data() as SellerFollower), id: d.id }))),
    () => onData([])
  );
}

export async function toggleFollowSeller(params: {
  followerUid: string;
  followerName?: string;
  sellerId: string;
  sellerName?: string;
  institutionId?: string;
  currentlyFollowing: boolean;
}): Promise<boolean> {
  const id = `follow_${params.followerUid}_${params.sellerId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  try {
    if (params.currentlyFollowing) {
      await deleteDoc(doc(db, 'sellerFollowers', id));
      return false;
    } else {
      const record: SellerFollower = stripUndefined({
        id,
        followerUid: params.followerUid,
        followerName: params.followerName,
        sellerId: params.sellerId,
        sellerName: params.sellerName,
        institutionId: params.institutionId,
        createdAt: new Date().toISOString()
      });
      await setDoc(doc(db, 'sellerFollowers', id), record);
      if (params.sellerId !== params.followerUid) {
        createNotification({
          userId: params.sellerId,
          type: 'system',
          title: 'New Storefront Follower',
          body: `${params.followerName || 'A student'} started following your campus store.`,
          targetType: 'seller',
          targetId: params.sellerId,
          institutionId: params.institutionId
        }).catch(() => {});
      }
      return true;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `sellerFollowers/${id}`);
    throw err;
  }
}

// ============================================================================
// ACCOMMODATION INSPECTION REQUESTS & HOUSE AGENT VERIFICATION
// ============================================================================
export async function submitInspectionRequest(
  input: Omit<AccommodationInspectionRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>
): Promise<AccommodationInspectionRequest> {
  const id = `insp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const nowIso = new Date().toISOString();
  const payload: AccommodationInspectionRequest = stripUndefined({
    ...input,
    id,
    status: 'pending',
    createdAt: nowIso,
    updatedAt: nowIso
  });

  try {
    await setDoc(doc(db, 'inspectionRequests', id), payload);
    if (input.agentUserId && input.agentUserId !== input.studentUid) {
      createNotification({
        userId: input.agentUserId,
        type: 'inspection',
        title: `New Property Inspection Request`,
        body: `${input.studentName} requested an inspection of "${input.propertyTitle}" on ${input.preferredDate} at ${input.preferredTime}.`,
        targetType: 'inspection',
        targetId: id,
        institutionId: input.institutionId
      }).catch(() => {});
    }
    return payload;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `inspectionRequests/${id}`);
    throw err;
  }
}

export function subscribeToStudentInspectionRequests(
  studentUid: string | undefined,
  onData: (items: AccommodationInspectionRequest[]) => void
): () => void {
  if (!studentUid) {
    onData([]);
    return () => {};
  }
  const q = query(
    collection(db, 'inspectionRequests'),
    where('studentUid', '==', studentUid),
    limit(80)
  );
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d) => ({
          ...(d.data() as AccommodationInspectionRequest),
          id: d.id,
          createdAt: toIsoString((d.data() as any).createdAt)
        }))
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
        .slice(0, 60);
      onData(items);
    },
    () => onData([])
  );
}

export function subscribeToAgentInspectionRequests(
  agentUserId: string | undefined,
  onData: (items: AccommodationInspectionRequest[]) => void
): () => void {
  if (!agentUserId) {
    onData([]);
    return () => {};
  }
  const q = query(
    collection(db, 'inspectionRequests'),
    where('agentUserId', '==', agentUserId),
    limit(100)
  );
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d) => ({
          ...(d.data() as AccommodationInspectionRequest),
          id: d.id,
          createdAt: toIsoString((d.data() as any).createdAt)
        }))
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
        .slice(0, 80);
      onData(items);
    },
    () => onData([])
  );
}

export async function updateInspectionRequestStatus(
  id: string,
  status: InspectionRequestStatus,
  agentResponseNote?: string,
  notifyStudentUid?: string,
  propertyTitle?: string
): Promise<void> {
  try {
    await updateDoc(
      doc(db, 'inspectionRequests', id),
      stripUndefined({
        status,
        agentResponseNote: agentResponseNote?.trim() || undefined,
        updatedAt: new Date().toISOString()
      })
    );
    if (notifyStudentUid) {
      createNotification({
        userId: notifyStudentUid,
        type: 'inspection',
        title: `Inspection Request ${status.toUpperCase()}`,
        body: `Your inspection request for "${propertyTitle || 'campus property'}" was marked ${status}.${agentResponseNote ? ` Note: ${agentResponseNote}` : ''}`,
        targetType: 'inspection',
        targetId: id
      }).catch(() => {});
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `inspectionRequests/${id}`);
    throw err;
  }
}

export async function submitAgentVerificationRequest(
  input: Omit<HouseAgentVerificationRequest, 'id' | 'status' | 'createdAt'>
): Promise<HouseAgentVerificationRequest> {
  const id = `agentver_${input.agentId}`;
  const payload: HouseAgentVerificationRequest = stripUndefined({
    ...input,
    id,
    status: 'pending',
    createdAt: new Date().toISOString()
  });
  try {
    await setDoc(doc(db, 'agentVerificationRequests', id), payload, { merge: true });
    return payload;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `agentVerificationRequests/${id}`);
    throw err;
  }
}

export function subscribeToAgentVerificationRequests(
  onData: (items: HouseAgentVerificationRequest[]) => void
): () => void {
  const q = query(
    collection(db, 'agentVerificationRequests'),
    orderBy('createdAt', 'desc'),
    limit(100)
  );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ ...(d.data() as HouseAgentVerificationRequest), id: d.id }))),
    () => onData([])
  );
}

// ============================================================================
// CAMPUS FOOD ORDERING & DELIVERY ECOSYSTEM
// ============================================================================
export function subscribeToFoodVendors(
  onData: (vendors: FoodVendor[]) => void
): () => void {
  const q = query(collection(db, 'foodVendors'), orderBy('createdAt', 'desc'), limit(120));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ ...(d.data() as FoodVendor), id: d.id }))),
    () => onData([])
  );
}

export async function saveFoodVendor(
  vendor: Omit<FoodVendor, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<FoodVendor> {
  const id = vendor.id || `fv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const nowIso = new Date().toISOString();
  const payload: FoodVendor = stripUndefined({
    ...vendor,
    id,
    status: vendor.status || 'active',
    createdAt: (vendor as any).createdAt || nowIso,
    updatedAt: nowIso
  });
  try {
    await setDoc(doc(db, 'foodVendors', id), payload, { merge: true });
    return payload;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `foodVendors/${id}`);
    throw err;
  }
}

export function subscribeToFoodMenuItems(
  onData: (items: FoodMenuItem[]) => void
): () => void {
  const q = query(collection(db, 'foodMenuItems'), orderBy('createdAt', 'desc'), limit(250));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ ...(d.data() as FoodMenuItem), id: d.id }))),
    () => onData([])
  );
}

export async function saveFoodMenuItem(
  item: Omit<FoodMenuItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<FoodMenuItem> {
  const id = item.id || `fmi_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const nowIso = new Date().toISOString();
  const payload: FoodMenuItem = stripUndefined({
    ...item,
    id,
    createdAt: (item as any).createdAt || nowIso,
    updatedAt: nowIso
  });
  try {
    await setDoc(doc(db, 'foodMenuItems', id), payload, { merge: true });
    return payload;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `foodMenuItems/${id}`);
    throw err;
  }
}

export async function deleteFoodMenuItem(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'foodMenuItems', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `foodMenuItems/${id}`);
    throw err;
  }
}

export async function createFoodOrder(
  input: Omit<FoodOrder, 'id' | 'status' | 'statusHistory' | 'createdAt' | 'updatedAt'>
): Promise<FoodOrder> {
  const id = `forder_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const nowIso = new Date().toISOString();
  const payload: FoodOrder = stripUndefined({
    ...input,
    id,
    status: 'Order Received',
    statusHistory: [{ status: 'Order Received', timestamp: nowIso }],
    createdAt: nowIso,
    updatedAt: nowIso
  });
  try {
    await setDoc(doc(db, 'foodOrders', id), payload);
    if (input.vendorOwnerUid && input.vendorOwnerUid !== input.buyerUid) {
      createNotification({
        userId: input.vendorOwnerUid,
        type: 'food_order',
        title: `New Food Order: ${input.items.length} item(s)`,
        body: `${input.buyerName} ordered ${input.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')} (${input.fulfillmentType}).`,
        targetType: 'food_order',
        targetId: id,
        institutionId: input.institutionId
      }).catch(() => {});
    }
    return payload;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `foodOrders/${id}`);
    throw err;
  }
}

export function subscribeToBuyerFoodOrders(
  buyerUid: string | undefined,
  onData: (orders: FoodOrder[]) => void
): () => void {
  if (!buyerUid) {
    onData([]);
    return () => {};
  }
  const q = query(
    collection(db, 'foodOrders'),
    where('buyerUid', '==', buyerUid),
    limit(80)
  );
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d) => ({
          ...(d.data() as FoodOrder),
          id: d.id,
          createdAt: toIsoString((d.data() as any).createdAt)
        }))
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
        .slice(0, 60);
      onData(items);
    },
    () => onData([])
  );
}

export function subscribeToVendorFoodOrders(
  vendorOwnerUid: string | undefined,
  onData: (orders: FoodOrder[]) => void
): () => void {
  if (!vendorOwnerUid) {
    onData([]);
    return () => {};
  }
  const q = query(
    collection(db, 'foodOrders'),
    where('vendorOwnerUid', '==', vendorOwnerUid),
    limit(100)
  );
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d) => ({
          ...(d.data() as FoodOrder),
          id: d.id,
          createdAt: toIsoString((d.data() as any).createdAt)
        }))
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
        .slice(0, 80);
      onData(items);
    },
    () => onData([])
  );
}

export function subscribeToAllFoodOrders(onData: (orders: FoodOrder[]) => void): () => void {
  const q = query(collection(db, 'foodOrders'), orderBy('createdAt', 'desc'), limit(120));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ ...(d.data() as FoodOrder), id: d.id }))),
    () => onData([])
  );
}

export async function updateFoodOrderStatus(params: {
  order: FoodOrder;
  nextStatus: FoodOrderStatus;
  note?: string;
  deliveryPartnerUid?: string;
  deliveryPartnerName?: string;
  deliveryPartnerPhone?: string;
  paymentStatus?: FoodOrder['paymentStatus'];
}): Promise<void> {
  const nowIso = new Date().toISOString();
  const nextHistory = [
    ...(params.order.statusHistory || []),
    { status: params.nextStatus, timestamp: nowIso, ...(params.note ? { note: params.note } : {}) }
  ];

  try {
    await updateDoc(
      doc(db, 'foodOrders', params.order.id),
      stripUndefined({
        status: params.nextStatus,
        statusHistory: nextHistory,
        ...(params.deliveryPartnerUid ? { deliveryPartnerUid: params.deliveryPartnerUid } : {}),
        ...(params.deliveryPartnerName ? { deliveryPartnerName: params.deliveryPartnerName } : {}),
        ...(params.deliveryPartnerPhone ? { deliveryPartnerPhone: params.deliveryPartnerPhone } : {}),
        ...(params.paymentStatus ? { paymentStatus: params.paymentStatus } : {}),
        updatedAt: nowIso
      })
    );

    if (params.order.buyerUid) {
      createNotification({
        userId: params.order.buyerUid,
        type: 'food_order',
        title: `Food Order Update: ${params.nextStatus}`,
        body: `Your order from ${params.order.vendorName} is now "${params.nextStatus}".${params.note ? ` ${params.note}` : ''}`,
        targetType: 'food_order',
        targetId: params.order.id,
        institutionId: params.order.institutionId
      }).catch(() => {});
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `foodOrders/${params.order.id}`);
    throw err;
  }
}

// ============================================================================
// DELIVERY PARTNERS
// ============================================================================
export function subscribeToDeliveryPartners(onData: (partners: DeliveryPartner[]) => void): () => void {
  const q = query(collection(db, 'deliveryPartners'), orderBy('createdAt', 'desc'), limit(100));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ ...(d.data() as DeliveryPartner), id: d.id }))),
    () => onData([])
  );
}

export async function saveDeliveryPartner(
  partner: Omit<DeliveryPartner, 'id' | 'completedDeliveries' | 'totalEarningsNaira' | 'createdAt' | 'updatedAt'> & {
    id?: string;
    completedDeliveries?: number;
    totalEarningsNaira?: number;
  }
): Promise<DeliveryPartner> {
  const id = partner.id || `dp_${partner.userUid}`;
  const nowIso = new Date().toISOString();
  const payload: DeliveryPartner = stripUndefined({
    ...partner,
    id,
    completedDeliveries: partner.completedDeliveries ?? 0,
    totalEarningsNaira: partner.totalEarningsNaira ?? 0,
    status: partner.status || 'active',
    createdAt: (partner as any).createdAt || nowIso,
    updatedAt: nowIso
  });
  try {
    await setDoc(doc(db, 'deliveryPartners', id), payload, { merge: true });
    return payload;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `deliveryPartners/${id}`);
    throw err;
  }
}

// ============================================================================
// JOBS, BOOKS, DEALS, GIVEAWAYS, REFERRALS & AMBASSADORS
// ============================================================================
export function subscribeToCampusJobs(onData: (items: CampusJobListing[]) => void): () => void {
  const q = query(collection(db, 'campusJobs'), orderBy('createdAt', 'desc'), limit(120));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ ...(d.data() as CampusJobListing), id: d.id }))),
    () => onData([])
  );
}

export async function saveCampusJob(
  input: Omit<CampusJobListing, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<CampusJobListing> {
  const id = input.id || `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const nowIso = new Date().toISOString();
  const payload: CampusJobListing = stripUndefined({
    ...input,
    id,
    createdAt: (input as any).createdAt || nowIso,
    updatedAt: nowIso
  });
  await setDoc(doc(db, 'campusJobs', id), payload, { merge: true });
  return payload;
}

export function subscribeToCampusBooks(onData: (items: CampusBookListing[]) => void): () => void {
  const q = query(collection(db, 'campusBooks'), orderBy('createdAt', 'desc'), limit(150));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ ...(d.data() as CampusBookListing), id: d.id }))),
    () => onData([])
  );
}

export async function saveCampusBook(
  input: Omit<CampusBookListing, 'id' | 'downloadsCount' | 'createdAt' | 'updatedAt'> & {
    id?: string;
    downloadsCount?: number;
  }
): Promise<CampusBookListing> {
  const id = input.id || `book_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const nowIso = new Date().toISOString();
  const payload: CampusBookListing = stripUndefined({
    ...input,
    id,
    downloadsCount: input.downloadsCount ?? 0,
    createdAt: (input as any).createdAt || nowIso,
    updatedAt: nowIso
  });
  await setDoc(doc(db, 'campusBooks', id), payload, { merge: true });
  return payload;
}

export function subscribeToStudentDeals(onData: (items: StudentDeal[]) => void): () => void {
  const q = query(collection(db, 'studentDeals'), orderBy('createdAt', 'desc'), limit(100));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ ...(d.data() as StudentDeal), id: d.id }))),
    () => onData([])
  );
}

export async function saveStudentDeal(
  input: Omit<StudentDeal, 'id' | 'createdAt'> & { id?: string }
): Promise<StudentDeal> {
  const id = input.id || `deal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const payload: StudentDeal = stripUndefined({
    ...input,
    id,
    createdAt: (input as any).createdAt || new Date().toISOString()
  });
  await setDoc(doc(db, 'studentDeals', id), payload, { merge: true });
  return payload;
}

export function subscribeToStudentGiveaways(onData: (items: StudentGiveaway[]) => void): () => void {
  const q = query(collection(db, 'studentGiveaways'), orderBy('createdAt', 'desc'), limit(80));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ ...(d.data() as StudentGiveaway), id: d.id }))),
    () => onData([])
  );
}

export async function saveStudentGiveaway(
  input: Omit<StudentGiveaway, 'id' | 'createdAt'> & { id?: string }
): Promise<StudentGiveaway> {
  const id = input.id || `giv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const payload: StudentGiveaway = stripUndefined({
    ...input,
    id,
    participantUids: Array.isArray(input.participantUids) ? input.participantUids : [],
    createdAt: (input as any).createdAt || new Date().toISOString()
  });
  await setDoc(doc(db, 'studentGiveaways', id), payload, { merge: true });
  return payload;
}

export async function enterStudentGiveaway(giveaway: StudentGiveaway, uid: string): Promise<void> {
  if (giveaway.status !== 'open') throw new Error('This giveaway is no longer open for entries.');
  if (giveaway.participantUids.includes(uid)) return;
  await updateDoc(doc(db, 'studentGiveaways', giveaway.id), {
    participantUids: [...giveaway.participantUids, uid]
  });
}

export function getUserReferralCode(uid: string): string {
  return `NCM-${String(uid || '').slice(0, 6).toUpperCase()}`;
}

export async function submitReferralClaim(params: {
  referrerUid: string;
  referrerEmail?: string;
  referralCode: string;
  referredUid: string;
  referredEmail: string;
  referredName: string;
  institutionId?: string;
}): Promise<ReferralRecord> {
  // Verify anti-abuse check with backend first
  const res = await fetch('/api/ecosystem/validate-referral', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      referrerUid: params.referrerUid,
      referrerEmail: params.referrerEmail,
      referredUid: params.referredUid,
      referredEmail: params.referredEmail
    })
  });
  const check = await res.json().catch(() => ({}));
  if (!res.ok || !check.valid) {
    throw new Error(check?.reason || 'Referral could not be validated.');
  }

  const id = `ref_${params.referredUid}`;
  const payload: ReferralRecord = stripUndefined({
    id,
    referrerUid: params.referrerUid,
    referrerEmail: params.referrerEmail,
    referralCode: params.referralCode,
    referredUid: params.referredUid,
    referredEmail: params.referredEmail,
    referredName: params.referredName,
    institutionId: params.institutionId,
    rewardPoints: check.flagged ? 0 : 100,
    status: check.flagged ? 'flagged_abuse' : 'verified',
    flagReason: check.flagged ? check.reason : undefined,
    createdAt: new Date().toISOString()
  });

  await setDoc(doc(db, 'referrals', id), payload);
  return payload;
}

export function subscribeToUserReferrals(
  referrerUid: string | undefined,
  onData: (items: ReferralRecord[]) => void
): () => void {
  if (!referrerUid) {
    onData([]);
    return () => {};
  }
  const q = query(
    collection(db, 'referrals'),
    where('referrerUid', '==', referrerUid),
    limit(120)
  );
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d) => ({
          ...(d.data() as ReferralRecord),
          id: d.id,
          createdAt: toIsoString((d.data() as any).createdAt)
        }))
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
        .slice(0, 100);
      onData(items);
    },
    () => onData([])
  );
}

export async function submitAmbassadorApplication(
  input: Omit<AmbassadorApplication, 'id' | 'status' | 'createdAt' | 'updatedAt'>
): Promise<AmbassadorApplication> {
  const id = `amb_${input.userUid}`;
  const nowIso = new Date().toISOString();
  const payload: AmbassadorApplication = stripUndefined({
    ...input,
    id,
    status: 'pending',
    createdAt: nowIso,
    updatedAt: nowIso
  });
  await setDoc(doc(db, 'ambassadorApplications', id), payload, { merge: true });
  return payload;
}

export function subscribeToAmbassadorApplications(
  onData: (items: AmbassadorApplication[]) => void
): () => void {
  const q = query(collection(db, 'ambassadorApplications'), orderBy('createdAt', 'desc'), limit(120));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ ...(d.data() as AmbassadorApplication), id: d.id }))),
    () => onData([])
  );
}

export async function fetchCodPolicy(): Promise<CodPolicySettings> {
  try {
    const res = await fetch('/api/payments/cod-policy');
    if (res.ok) {
      const data = await res.json();
      if (data?.codPolicy) return data.codPolicy;
    }
  } catch {
    // Fallback below
  }
  return {
    codEnabled: true,
    codFoodEnabled: true,
    codMaxOrderNaira: 150000,
    codNote: 'Pay on delivery / campus handover available for eligible campus orders.'
  };
}

export async function getAllProductOrdersForUser(userId: string): Promise<any[]> {
  try {
    const q = query(
      collection(db, 'orders'),
      where('buyerId', '==', userId),
      limit(80)
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => ({
        ...(d.data() as any),
        id: d.id,
        createdAt: toIsoString((d.data() as any)?.createdAt)
      }))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, 60);
  } catch {
    return [];
  }
}

export async function ceoReviewAgentVerification(params: {
  requestId: string;
  userId: string;
  agentId?: string;
  decision: 'approved' | 'rejected';
  notes?: string;
  ceoEmail: string;
}): Promise<void> {
  const nowIso = new Date().toISOString();
  await updateDoc(doc(db, 'agentVerificationRequests', params.requestId), {
    status: params.decision,
    reviewNotes: params.notes || '',
    reviewedAt: nowIso
  });

  if (params.agentId) {
    await updateDoc(doc(db, 'houseAgents', params.agentId), {
      ceoVerified: params.decision === 'approved',
      isVerified: params.decision === 'approved',
      verifiedByCeoEmail: params.ceoEmail,
      verifiedByCeoAt: nowIso,
      updatedAt: nowIso
    }).catch(() => {});
  }

  await createNotification({
    userId: params.userId,
    type: 'approval',
    title:
      params.decision === 'approved'
        ? 'House Agent KYC Approved!'
        : 'House Agent KYC Review Update',
    body:
      params.decision === 'approved'
        ? 'Your House Agent verification was approved by NIGERIA CAMPUS MARKET CEO.'
        : params.notes || 'Please re-submit clearer verification documents.',
    targetType: 'house_agent',
    targetId: params.agentId || params.requestId
  });
}

export async function ceoToggleFoodVendorVerification(params: {
  vendorId: string;
  ownerUid: string;
  verified: boolean;
  ceoEmail: string;
}): Promise<void> {
  const nowIso = new Date().toISOString();
  await updateDoc(doc(db, 'foodVendors', params.vendorId), {
    ceoVerified: params.verified,
    isVerified: params.verified,
    verifiedByCeoEmail: params.ceoEmail,
    verifiedByCeoAt: nowIso,
    updatedAt: nowIso
  });
  await createNotification({
    userId: params.ownerUid,
    type: 'approval',
    title: params.verified ? 'Food Vendor CEO Verified' : 'Vendor Verification Updated',
    body: params.verified
      ? 'Your kitchen is now officially CEO Verified on NIGERIA CAMPUS MARKET.'
      : 'Your vendor verification badge was updated.',
    targetType: 'food_vendor',
    targetId: params.vendorId
  });
}

export async function ceoToggleDeliveryPartnerVerification(params: {
  partnerId: string;
  userUid: string;
  verified: boolean;
  ceoEmail: string;
}): Promise<void> {
  const nowIso = new Date().toISOString();
  await updateDoc(doc(db, 'deliveryPartners', params.partnerId), {
    ceoVerified: params.verified,
    isVerified: params.verified,
    verifiedByCeoEmail: params.ceoEmail,
    verifiedByCeoAt: nowIso,
    updatedAt: nowIso
  });
  await createNotification({
    userId: params.userUid,
    type: 'approval',
    title: params.verified ? 'Delivery Partner Verified' : 'Rider Verification Updated',
    body: params.verified
      ? 'Your Campus Delivery Rider account is now CEO Verified.'
      : 'Your delivery rider verification was updated.',
    targetType: 'delivery_partner',
    targetId: params.partnerId
  });
}

export async function ceoReviewAmbassadorApplication(params: {
  appId: string;
  userUid: string;
  status: 'approved' | 'rejected';
}): Promise<void> {
  const nowIso = new Date().toISOString();
  await updateDoc(doc(db, 'ambassadorApplications', params.appId), {
    status: params.status,
    updatedAt: nowIso
  });
  await createNotification({
    userId: params.userUid,
    type: 'approval',
    title:
      params.status === 'approved'
        ? 'Campus Ambassador Application Approved!'
        : 'Campus Ambassador Application Update',
    body:
      params.status === 'approved'
        ? 'Welcome! You are now an approved NIGERIA CAMPUS MARKET Campus Ambassador.'
        : 'Thank you for applying. Review your profile details or re-apply next cycle.',
    targetType: 'ambassador',
    targetId: params.appId
  });
}

export async function ceoModerateEcosystemRecord(
  colName: 'campusJobs' | 'campusBooks' | 'studentDeals' | 'studentGiveaways' | 'foodVendors',
  id: string,
  status: string
): Promise<void> {
  await updateDoc(doc(db, colName, id), {
    status,
    updatedAt: new Date().toISOString()
  });
}

export async function ceoSyncInstitutionGradingToFirestore(config: {
  institutionId: string;
  scaleMax: 5 | 4;
  isVerifiedOfficial: boolean;
  scaleLabel: string;
  grades: Array<{ letter: string; minScore: number; maxScore: number; point: number }>;
  updatedBy: string;
}): Promise<void> {
  await setDoc(
    doc(db, 'institutionGradingSystems', config.institutionId),
    stripUndefined({
      ...config,
      updatedAt: new Date().toISOString()
    }),
    { merge: true }
  );
}

