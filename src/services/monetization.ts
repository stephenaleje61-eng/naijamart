import {
  collection,
  limit,
  onSnapshot,
  query,
  where
} from 'firebase/firestore';
import {
  PaymentTransaction,
  SubscriptionPlan,
  UserSubscription
} from '../types.js';
import { auth, db, toIsoString } from './firebase.js';
import { getApiBaseUrl } from './api.js';
import { getStoredCeoSession } from './ceoAdmin.js';

function buildApiUrl(path: string): string {
  const base = getApiBaseUrl();
  return base ? `${base}${path}` : path;
}

export interface GatewayStatusResponse {
  paystackConfigured: boolean;
  flutterwaveConfigured: boolean;
  anyGatewayConfigured: boolean;
  ceoContactPhone: string;
  ceoEmail: string;
}

export async function fetchSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const res = await fetch(buildApiUrl('/api/payments/plans'));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Failed to load subscription plans.');
  return Array.isArray(data.plans) ? data.plans : [];
}

export async function fetchPaymentGatewayStatus(): Promise<GatewayStatusResponse> {
  try {
    const res = await fetch(buildApiUrl('/api/payments/gateway-status'));
    if (res.ok) return await res.json();
  } catch {
    // Offline fallback
  }
  return {
    paystackConfigured: false,
    flutterwaveConfigured: false,
    anyGatewayConfigured: false,
    ceoContactPhone: '08167258121',
    ceoEmail: 'stephenaleje61@gmail.com'
  };
}

export async function ceoSaveSubscriptionPlans(plans: SubscriptionPlan[]): Promise<SubscriptionPlan[]> {
  const fbUser = auth.currentUser;
  if (!fbUser) throw new Error('CEO authentication required.');
  const idToken = await fbUser.getIdToken(false);
  const stored = getStoredCeoSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-firebase-id-token': idToken,
    ...(stored?.ceoSessionToken ? { 'x-ceo-session': stored.ceoSessionToken } : {})
  };

  const res = await fetch(buildApiUrl('/api/payments/ceo/plans'), {
    method: 'PUT',
    headers,
    body: JSON.stringify({ plans })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Failed to save subscription plans.');
  return data.plans as SubscriptionPlan[];
}

export async function initializePlanCheckout(params: {
  planId: string;
  gateway: 'paystack' | 'flutterwave';
  userId: string;
  userEmail: string;
  userName?: string;
  institutionId?: string;
}): Promise<{
  authorizationUrl: string;
  reference: string;
  gateway: 'paystack' | 'flutterwave';
  amountNaira: number;
}> {
  const callbackUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?subPlan=${encodeURIComponent(params.planId)}&gateway=${params.gateway}`
      : undefined;

  const res = await fetch(buildApiUrl('/api/payments/initialize'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...params, callbackUrl })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error(data?.error || 'Unable to initialize payment checkout.');
    err.status = res.status;
    err.configured = data?.configured;
    throw err;
  }
  return {
    authorizationUrl: data.authorizationUrl,
    reference: data.reference,
    gateway: data.gateway,
    amountNaira: Number(data.amountNaira) || 0
  };
}

export async function verifyPlanPayment(params: {
  reference: string;
  gateway: 'paystack' | 'flutterwave';
  transactionId?: string;
  planId?: string;
}): Promise<{
  verified: boolean;
  transaction: PaymentTransaction;
  subscription: UserSubscription;
}> {
  const res = await fetch(buildApiUrl('/api/payments/verify'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || 'Payment verification failed.');
  }
  return data;
}

export function subscribeToUserSubscriptions(
  userId: string | undefined,
  onData: (subs: UserSubscription[]) => void
): () => void {
  if (!userId) {
    onData([]);
    return () => {};
  }
  try {
    const q = query(
      collection(db, 'userSubscriptions'),
      where('userId', '==', userId),
      limit(20)
    );
    return onSnapshot(
      q,
      (snap) => {
        const list: UserSubscription[] = snap.docs.map((d) => {
          const data = d.data() || {};
          return {
            id: d.id,
            userId: String(data.userId || userId),
            userEmail: data.userEmail ? String(data.userEmail) : undefined,
            userName: data.userName ? String(data.userName) : undefined,
            planId: String(data.planId || ''),
            planName: String(data.planName || ''),
            audience: data.audience || 'seller_pro',
            institutionId: data.institutionId ? String(data.institutionId) : undefined,
            status: data.status || 'active',
            paymentReference: String(data.paymentReference || ''),
            amountNaira: Number(data.amountNaira) || 0,
            startedAt: data.startedAt ? toIsoString(data.startedAt) : new Date().toISOString(),
            expiresAt: data.expiresAt ? toIsoString(data.expiresAt) : new Date().toISOString()
          };
        });
        onData(list);
      },
      () => {
        onData([]);
      }
    );
  } catch {
    return () => {};
  }
}

export async function initializeOrderCheckout(params: {
  orderType: 'product_order' | 'food_order' | 'ad_package';
  orderId: string;
  amountNaira: number;
  title: string;
  gateway: 'paystack' | 'flutterwave';
  userId: string;
  userEmail: string;
  userName?: string;
  institutionId?: string;
  callbackPath?: string;
}): Promise<{
  authorizationUrl: string;
  reference: string;
  gateway: 'paystack' | 'flutterwave';
  amountNaira: number;
}> {
  const callbackUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${params.callbackPath || window.location.pathname}?orderRef=${encodeURIComponent(params.orderId)}&orderType=${params.orderType}&gateway=${params.gateway}`
      : undefined;

  const res = await fetch(buildApiUrl('/api/payments/initialize'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...params, callbackUrl })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error(data?.error || 'Unable to initialize online payment.');
    err.status = res.status;
    err.configured = data?.configured;
    throw err;
  }
  return {
    authorizationUrl: data.authorizationUrl,
    reference: data.reference,
    gateway: data.gateway,
    amountNaira: Number(data.amountNaira) || 0
  };
}

export async function ceoSaveCodPolicy(policy: {
  codEnabled: boolean;
  codFoodEnabled: boolean;
  codMaxOrderNaira: number;
  codNote: string;
}) {
  const fbUser = auth.currentUser;
  if (!fbUser) throw new Error('CEO authentication required.');
  const idToken = await fbUser.getIdToken(false);
  const stored = getStoredCeoSession();
  const res = await fetch(buildApiUrl('/api/payments/ceo/cod-policy'), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-firebase-id-token': idToken,
      ...(stored?.ceoSessionToken ? { 'x-ceo-session': stored.ceoSessionToken } : {})
    },
    body: JSON.stringify(policy)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Failed to update Pay-on-Delivery policy.');
  return data.codPolicy;
}

export async function ceoSaveGradingConfig(params: {
  institutionId: string;
  scaleMax: 5 | 4;
  isVerifiedOfficial: boolean;
  scaleLabel: string;
  grades: Array<{ letter: string; minScore: number; maxScore: number; point: number }>;
}) {
  const fbUser = auth.currentUser;
  if (!fbUser) throw new Error('CEO authentication required.');
  const idToken = await fbUser.getIdToken(false);
  const stored = getStoredCeoSession();
  const res = await fetch(
    buildApiUrl(`/api/ecosystem/ceo/grading-configs/${encodeURIComponent(params.institutionId)}`),
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-firebase-id-token': idToken,
        ...(stored?.ceoSessionToken ? { 'x-ceo-session': stored.ceoSessionToken } : {})
      },
      body: JSON.stringify(params)
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Failed to save institution grading scale.');
  return data.config;
}

