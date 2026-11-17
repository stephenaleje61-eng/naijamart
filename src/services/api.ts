import {
  Product,
  Category,
  User,
  SellerProfile,
  ProductFilter,
  AdminMetrics,
  ReportItem,
  AuditLogItem,
  BikeRider
} from '../types.js';
import {
  getProductsFromFirestore,
  saveProductToFirestore,
  deleteProductFromFirestore,
  getProductByIdFromFirestore,
  createProductDirectlyInFirestore,
  getBikeRidersFromFirestore,
  createBikeRiderDirectlyInFirestore,
  updateBikeRiderAvailability,
  registerAccountInFirebase,
  loginAccountInFirebase,
  getUserSessionFromFirestore,
  updateUserProfileInFirestore,
  sendPasswordResetInFirebase,
  resetAccountPasswordInFirestore,
  getSellerStorefrontFromFirestore,
  updateSellerProfileInFirestore,
  toggleFavouriteInFirestore,
  submitProductReportToFirestore,
  getCachedSessionInfo,
  saveUserSessionCache,
  mapAuthErrorToUserMessage,
  invalidateProductsCache,
  auth
} from './firebase.js';
import { DEFAULT_CATEGORIES } from '../constants/categories.js';

const TOKEN_KEY = 'zangamarket_auth_token';
const BACKEND_URL_KEY = 'zangamarket_backend_url';

export const getAuthToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY) || localStorage.getItem('naijamart_auth_token');
};

export const setAuthToken = (token: string | null) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('naijamart_auth_token');
  }
};

export function normalizeApiBaseUrl(raw?: string | null): string {
  if (!raw || typeof raw !== 'string') return '';
  let trimmed = raw.trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null' || trimmed.includes('your-backend.onrender.com')) {
    return '';
  }
  trimmed = trimmed.replace(/\/+$/, '').replace(/\/api$/i, '');
  if (!trimmed) return '';

  // Ensure external hostnames without scheme do not become relative paths (which cause 404)
  if (!/^https?:\/\//i.test(trimmed)) {
    if (/^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/.test(trimmed)) {
      trimmed = `https://${trimmed}`;
    } else {
      return '';
    }
  }

  try {
    const parsed = new URL(trimmed);
    const normalized = parsed.origin + parsed.pathname.replace(/\/+$/, '').replace(/\/api$/i, '');
    if (typeof window !== 'undefined' && normalized === window.location.origin) {
      return '';
    }
    return normalized;
  } catch {
    return '';
  }
}

export const getApiBaseUrl = (): string => {
  // 1. User configured custom URL in localStorage (explicit override)
  const custom =
    typeof window !== 'undefined'
      ? localStorage.getItem(BACKEND_URL_KEY) || localStorage.getItem('naijamart_backend_url')
      : null;
  const normalizedCustom = normalizeApiBaseUrl(custom);
  if (normalizedCustom) {
    return normalizedCustom;
  }

  // 2. Build-time environment variable VITE_BACKEND_URL
  const envUrl = (import.meta as any).env?.VITE_BACKEND_URL;
  const normalizedEnv = normalizeApiBaseUrl(envUrl);
  if (normalizedEnv) {
    return normalizedEnv;
  }

  // 3. Default: relative path (in full-stack Express + Vite environment)
  return '';
};

export const setApiBaseUrl = (url: string | null) => {
  const normalized = normalizeApiBaseUrl(url);
  if (normalized) {
    localStorage.setItem(BACKEND_URL_KEY, normalized);
  } else {
    localStorage.removeItem(BACKEND_URL_KEY);
    localStorage.removeItem('naijamart_backend_url');
  }
};

const getHeaders = (isJson = true): Record<string, string> => {
  const headers: Record<string, string> = {
    'Accept': 'application/json'
  };
  if (isJson) {
    headers['Content-Type'] = 'application/json';
  }
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const getAdminHeaders = async (isJson = true): Promise<Record<string, string>> => {
  const headers = getHeaders(isJson);
  try {
    if (auth.currentUser) {
      const idToken = await auth.currentUser.getIdToken();
      if (idToken) {
        headers['X-Firebase-Id-Token'] = idToken;
      }
    }
  } catch {
    // Fallback gracefully to Authorization Bearer token
  }
  return headers;
};

// Robust fetch utility with timeout that parses JSON safely and prevents raw HTML or 404 crashes
export const safeFetchJson = async (
  endpoint: string,
  options: RequestInit & { timeoutMs?: number; baseOverride?: string } = {}
) => {
  const { timeoutMs = 4500, baseOverride, ...fetchOptions } = options;
  const base = baseOverride !== undefined ? baseOverride : getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = base ? `${base}${cleanEndpoint}` : cleanEndpoint;

  const mergedHeaders: Record<string, string> = {
    'Accept': 'application/json',
    ...(fetchOptions.headers as Record<string, string> || {})
  };

  const controller = new AbortController();
  const timeoutTimer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(fullUrl, {
      ...fetchOptions,
      headers: mergedHeaders,
      signal: fetchOptions.signal || controller.signal
    });
  } catch (networkErr: any) {
    if (networkErr?.name === 'AbortError') {
      throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)} seconds while contacting NIGERIA CAMPUS MARKET server.`);
    }
    console.error(`[Network Connection Failed] Unable to reach ${fullUrl}:`, networkErr);
    throw new Error(
      `Unable to connect to NIGERIA CAMPUS MARKET backend server at ${fullUrl}. Please check your internet connection.`
    );
  } finally {
    clearTimeout(timeoutTimer);
  }

  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();
  let data: any;

  try {
    data = JSON.parse(text);
  } catch {
    console.error(`[API Fetch Error] Server returned non-JSON response from ${fullUrl} (HTTP ${res.status}, Content-Type: ${contentType}):\n`, text.slice(0, 500));

    if (res.status === 200 && text.trim().length === 0) {
      throw new Error(
        `Server returned an empty response for ${cleanEndpoint}.`
      );
    }

    if (contentType.includes('text/html') || text.includes('<!DOCTYPE') || text.includes('<html')) {
      if (res.status === 404) {
        throw new Error(
          `Backend endpoint (${cleanEndpoint}) could not be reached. Switching to live database.`
        );
      }
      throw new Error(
        `Server returned an unexpected HTML page (${res.status}) for ${cleanEndpoint}.`
      );
    }

    throw new Error(
      `Server returned an unexpected response (${res.status}) instead of JSON.`
    );
  }

  if (!res.ok) {
    const errMsg = typeof data?.error === 'string'
      ? data.error
      : typeof data?.message === 'string'
      ? data.message
      : res.status === 404
      ? `Endpoint (${cleanEndpoint}) was not found on the selected server.`
      : `Request failed (${res.status}). Please try again.`;
    throw new Error(errMsg);
  }

  return data;
};

// --- PRODUCTS API ---
export async function fetchProducts(filters: ProductFilter = {}): Promise<{ items: Product[]; pagination: any }> {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.category && filters.category !== 'all') params.set('category', filters.category);
  if (filters.condition && filters.condition !== 'all') params.set('condition', filters.condition);
  if (filters.state && filters.state !== 'all') params.set('state', filters.state);
  if (filters.city && filters.city !== 'all') params.set('city', filters.city);
  if (filters.institutionId && filters.institutionId !== 'all') params.set('institutionId', filters.institutionId);
  if (filters.campus && filters.campus !== 'all') params.set('campus', filters.campus);
  if (filters.minPrice !== undefined && filters.minPrice > 0) params.set('minPrice', String(filters.minPrice));
  if (filters.maxPrice !== undefined && filters.maxPrice > 0) params.set('maxPrice', String(filters.maxPrice));
  if (filters.sellerId) params.set('sellerId', filters.sellerId);
  if (filters.sort) params.set('sort', filters.sort);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));

  const queryStr = params.toString();

  // Primary: direct Cloud Firestore with instant in-memory cache (0 redundant reads across filters/categories)
  try {
    const items = await getProductsFromFirestore({
      categoryId: filters.category,
      sellerId: filters.sellerId,
      searchQuery: filters.q,
      condition: filters.condition,
      state: filters.state,
      city: filters.city,
      institutionId: filters.institutionId,
      campus: filters.campus,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      sort: filters.sort,
      limitCount: filters.limit,
      forceRefresh: filters.forceRefresh
    });

    return {
      items,
      pagination: {
        page: filters.page || 1,
        pageSize: filters.limit || items.length || 24,
        total: items.length,
        totalPages: 1
      }
    };
  } catch (firestoreErr) {
    console.warn('[fetchProducts Firestore failed, trying Express API fallback]:', firestoreErr);

    try {
      return await safeFetchJson(`/api/products?${queryStr}`, { timeoutMs: 2500 });
    } catch (apiErr) {
      if (getApiBaseUrl()) {
        try {
          return await safeFetchJson(`/api/products?${queryStr}`, { timeoutMs: 2000, baseOverride: '' });
        } catch {
          // Throw primary Firestore error cleanly so user gets accurate diagnostic
        }
      }
      throw firestoreErr instanceof Error ? firestoreErr : apiErr;
    }
  }
}

export async function fetchFlashDeals(): Promise<Product[]> {
  try {
    return await safeFetchJson('/api/products/flash-deals');
  } catch (err) {
    console.warn('[fetchFlashDeals fallback to Firestore]:', err);
    return await getProductsFromFirestore({ limitCount: 10 });
  }
}

export async function fetchTrendingProducts(): Promise<Product[]> {
  try {
    return await safeFetchJson('/api/products/trending');
  } catch (err) {
    console.warn('[fetchTrendingProducts fallback to Firestore]:', err);
    return await getProductsFromFirestore({ limitCount: 12 });
  }
}

export async function fetchProductById(id: string): Promise<Product> {
  try {
    return await safeFetchJson(`/api/products/${id}`);
  } catch (err) {
    console.warn('[fetchProductById fallback to Firestore]:', err);
    const prod = await getProductByIdFromFirestore(id);
    if (prod) return prod;
    throw new Error('Product not found in Firestore database.');
  }
}

export async function recordProductView(id: string): Promise<void> {
  try {
    await safeFetchJson(`/api/products/${id}/view`, { method: 'POST' });
  } catch {
    // Non-blocking
  }
}

export async function triggerWhatsAppChat(id: string): Promise<{ link: string; message: string }> {
  return safeFetchJson(`/api/products/${id}/whatsapp-click`, {
    method: 'POST',
    headers: getHeaders()
  });
}

// Publish Product - Supports BOTH FormData and JSON payload with Firestore direct persistence
export async function createProductListing(
  payload: FormData | Partial<Product>
): Promise<{ success: boolean; product: Product; message: string }> {
  try {
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let body: any;
    if (payload instanceof FormData) {
      body = payload;
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(payload);
    }

    const createdRes = await safeFetchJson('/api/products', {
      method: 'POST',
      headers,
      body
    });
    invalidateProductsCache();
    return createdRes;
  } catch (networkOrServerErr) {
    console.warn('[createProductListing fallback directly to Cloud Firestore]:', networkOrServerErr);
    // Directly save to Google Cloud Firestore permanent database (e.g. on Netlify static build)
    let productData: Partial<Product> = {};
    if (payload instanceof FormData) {
      const rawImages = payload.get('images');
      let parsedImages: string[] = [];
      if (typeof rawImages === 'string') {
        try {
          parsedImages = JSON.parse(rawImages);
        } catch {
          parsedImages = [rawImages];
        }
      }
      productData = {
        title: String(payload.get('title') || ''),
        price: Number(payload.get('price')) || 0,
        originalPrice: payload.get('originalPrice') ? Number(payload.get('originalPrice')) : undefined,
        description: String(payload.get('description') || ''),
        state: String(payload.get('state') || 'Taraba'),
        city: String(payload.get('city') || 'Wukari'),
        institutionId: payload.get('institutionId') ? String(payload.get('institutionId')) : undefined,
        campus: payload.get('campus') ? String(payload.get('campus')) : undefined,
        whatsappNumber: String(payload.get('whatsapp') || payload.get('whatsappNumber') || ''),
        categoryId: String(payload.get('categoryId') || payload.get('category') || 'hostel-items'),
        condition: (payload.get('condition') === 'used' ? 'used' : 'new') as 'new' | 'used',
        quantity: Number(payload.get('quantity')) || 1,
        images: parsedImages
      };
    } else {
      productData = payload;
    }

    const cached = getCachedSessionInfo();
    if (!productData.shopName && cached.sellerProfile?.shopName) {
      productData.shopName = cached.sellerProfile.shopName;
    }
    const createdProduct = await createProductDirectlyInFirestore(productData, cached.user);
    invalidateProductsCache();
    return {
      success: true,
      product: createdProduct,
      message: 'Product posted successfully to Firestore permanent database!'
    };
  }
}

export async function updateProductListing(id: string, productData: Partial<Product>): Promise<{ product: Product; message: string }> {
  invalidateProductsCache();
  try {
    return await safeFetchJson(`/api/products/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(productData)
    });
  } catch (err) {
    console.warn('[updateProductListing fallback to Firestore]:', err);
    await saveProductToFirestore({ ...(productData as Product), id });
    return { product: productData as Product, message: 'Product updated successfully in Firestore.' };
  }
}

export async function deleteProductListing(id: string): Promise<{ message: string }> {
  invalidateProductsCache();
  try {
    return await safeFetchJson(`/api/products/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
  } catch (err) {
    console.warn('[deleteProductListing fallback to Firestore]:', err);
    await deleteProductFromFirestore(id);
    return { message: 'Product deleted permanently from Firestore.' };
  }
}

export async function toggleProductFavourite(id: string): Promise<{ favourited: boolean; message: string }> {
  const cached = getCachedSessionInfo();
  const uid = auth.currentUser?.uid || cached.uid;
  if (uid) {
    return toggleFavouriteInFirestore(uid, id);
  }
  return safeFetchJson(`/api/products/${id}/favourite`, {
    method: 'POST',
    headers: getHeaders()
  });
}

export async function reportProduct(id: string, reportData: { reason: string; details: string; reporterEmail?: string }): Promise<any> {
  return submitProductReportToFirestore(id, reportData);
}

// --- IMAGE UPLOAD API ---
export async function uploadProductImages(files: File[]): Promise<string[]> {
  const formData = new FormData();
  for (const file of files) {
    formData.append('images', file);
  }

  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const data = await safeFetchJson('/api/upload', {
    method: 'POST',
    headers,
    body: formData
  });

  return data.urls as string[];
}

// --- CATEGORIES API ---
export async function fetchCategories(): Promise<Category[]> {
  try {
    return await safeFetchJson('/api/categories');
  } catch (err) {
    console.warn('[fetchCategories fallback to DEFAULT_CATEGORIES]:', err);
    return DEFAULT_CATEGORIES;
  }
}

// --- AUTH API ---
export async function loginUser(email: string, password: string): Promise<{ user: User; token: string; sellerProfile?: SellerProfile }> {
  const fbRes = await loginAccountInFirebase(email, password);
  if (fbRes) {
    setAuthToken(fbRes.token);
    return fbRes;
  }

  // Fallback for legacy Express-only accounts (e.g. local admin@fumarket.ng when Express backend is active)
  try {
    const data = await safeFetchJson('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    setAuthToken(data.token);
    if (data.user) {
      saveUserSessionCache(data.user, data.sellerProfile || null);
    }
    return data;
  } catch (err: any) {
    const msg = String(err?.message || '');
    if (msg.includes('404') || msg.includes('Backend API route')) {
      throw new Error('Invalid email or password.');
    }
    throw new Error(mapAuthErrorToUserMessage(err));
  }
}

export async function registerUser(userData: any): Promise<{ user: User; token: string; sellerProfile?: SellerProfile }> {
  // Primary unified registration in Firebase Auth + Cloud Firestore (no Express /api/* 404 failure)
  const res = await registerAccountInFirebase(userData);
  setAuthToken(res.token);

  // Best-effort non-blocking sync with running Express server memory (never causes 404 error to user)
  safeFetchJson('/api/auth/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user: res.user, sellerProfile: res.sellerProfile }),
    timeoutMs: 2500
  }).catch(() => {});

  return res;
}

export async function sendForgotPassword(email: string): Promise<{ success: boolean; message: string }> {
  try {
    return await sendPasswordResetInFirebase(email);
  } catch (err: any) {
    if (getApiBaseUrl()) {
      return safeFetchJson('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
    }
    throw err;
  }
}

export async function submitResetPassword(email: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  try {
    return await resetAccountPasswordInFirestore(email, newPassword);
  } catch (err: any) {
    if (getApiBaseUrl()) {
      return safeFetchJson('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword })
      });
    }
    throw err;
  }
}

export async function fetchCurrentUser(): Promise<{ user: User; sellerProfile?: SellerProfile | null; favourites: string[] }> {
  const token = getAuthToken();
  const cached = getCachedSessionInfo();
  const uid = auth.currentUser?.uid || cached.uid || (token?.startsWith('firebase-session:') ? token.replace('firebase-session:', '') : null);

  if (uid) {
    const session = await getUserSessionFromFirestore(uid);
    if (session) {
      return session;
    }
    if (cached.user) {
      return { user: cached.user, sellerProfile: cached.sellerProfile, favourites: [] };
    }
  }

  if (token && !token.startsWith('firebase-session:')) {
    return safeFetchJson('/api/auth/me', {
      headers: getHeaders()
    });
  }

  throw new Error('No active user session.');
}

export async function updateProfile(profileData: any): Promise<{ user: User; sellerProfile?: SellerProfile | null }> {
  const cached = getCachedSessionInfo();
  const uid = auth.currentUser?.uid || cached.uid;
  if (uid) {
    return updateUserProfileInFirestore(uid, profileData);
  }
  return safeFetchJson('/api/auth/profile', {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(profileData)
  });
}

// --- SELLER STOREFRONT & DASHBOARD API ---
export async function fetchSellerStorefront(identifier: string): Promise<{ seller: SellerProfile & { totalListings: number }; products: Product[] }> {
  return getSellerStorefrontFromFirestore(identifier);
}

export async function fetchMySellerListings(): Promise<{ listings: Product[]; stats: any }> {
  const cached = getCachedSessionInfo();
  const token = getAuthToken();
  const guestId =
    typeof window !== 'undefined' ? localStorage.getItem('fu_market_guest_id') || '' : '';
  const userId = auth.currentUser?.uid || cached.uid || cached.user?.id || guestId || '';

  const buildStats = (items: Product[]) => ({
    totalProducts: items.length,
    activeCount: items.filter(p => p.status === 'active').length,
    expiringSoonCount: 0,
    totalViews: items.reduce((sum, p) => sum + (p.views || 0), 0),
    totalWhatsAppClicks: items.reduce((sum, p) => sum + (p.whatsappClicks || 0), 0)
  });

  if (userId && (!token || token.startsWith('firebase-session:'))) {
    const items = await getProductsFromFirestore({ sellerId: userId, limitCount: 100 });
    return {
      listings: items,
      stats: buildStats(items)
    };
  }

  try {
    return await safeFetchJson('/api/sellers/my-listings', {
      headers: getHeaders()
    });
  } catch (err) {
    console.warn('[fetchMySellerListings fallback to Firestore]:', err);
    if (!userId) {
      return { listings: [], stats: buildStats([]) };
    }
    const items = await getProductsFromFirestore({ sellerId: userId, limitCount: 100 });
    return {
      listings: items,
      stats: buildStats(items)
    };
  }
}

export async function updateSellerProfile(profileData: Partial<SellerProfile>): Promise<any> {
  const cached = getCachedSessionInfo();
  const uid = auth.currentUser?.uid || cached.uid;
  if (uid && cached.user) {
    const profile = await updateSellerProfileInFirestore(cached.user, profileData);
    return { message: 'Storefront updated successfully.', profile };
  }
  return safeFetchJson('/api/sellers/profile', {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(profileData)
  });
}

// --- ADMIN API ---
export async function fetchAdminMetrics(): Promise<{ metrics: AdminMetrics; cleanupStats: any; recentAuditLogs: AuditLogItem[] }> {
  return safeFetchJson('/api/admin/metrics', {
    headers: await getAdminHeaders()
  });
}

export async function fetchAdminProducts(): Promise<{ products: Product[] }> {
  return safeFetchJson('/api/admin/products', {
    headers: await getAdminHeaders()
  });
}

export async function adminRemoveProduct(id: string): Promise<any> {
  return safeFetchJson(`/api/admin/products/${id}`, {
    method: 'DELETE',
    headers: await getAdminHeaders()
  });
}

export async function adminToggleFeatured(id: string): Promise<any> {
  return safeFetchJson(`/api/admin/products/${id}/toggle-featured`, {
    method: 'POST',
    headers: await getAdminHeaders()
  });
}

export async function fetchAdminUsers(): Promise<{ users: User[] }> {
  return safeFetchJson('/api/admin/users', {
    headers: await getAdminHeaders()
  });
}

export async function adminToggleSellerVerification(userId: string): Promise<any> {
  return safeFetchJson(`/api/admin/sellers/${userId}/toggle-verify`, {
    method: 'POST',
    headers: await getAdminHeaders()
  });
}

export async function fetchAdminReports(): Promise<{ reports: ReportItem[] }> {
  return safeFetchJson('/api/admin/reports', {
    headers: await getAdminHeaders()
  });
}

export async function adminResolveReport(id: string, status: 'resolved' | 'dismissed', adminNotes?: string): Promise<any> {
  return safeFetchJson(`/api/admin/reports/${id}/resolve`, {
    method: 'POST',
    headers: await getAdminHeaders(),
    body: JSON.stringify({ status, adminNotes })
  });
}

export async function adminModerateProduct(id: string, status: 'approved' | 'rejected' | 'pending_review', notes?: string): Promise<any> {
  return safeFetchJson(`/api/admin/products/${id}/moderate`, {
    method: 'POST',
    headers: await getAdminHeaders(),
    body: JSON.stringify({ status, notes })
  });
}

export async function adminToggleUserSuspension(id: string, reason?: string): Promise<any> {
  return safeFetchJson(`/api/admin/users/${id}/toggle-suspend`, {
    method: 'POST',
    headers: await getAdminHeaders(),
    body: JSON.stringify({ reason })
  });
}

export async function adminTriggerExpirationPurge(): Promise<any> {
  return safeFetchJson('/api/admin/trigger-cleanup', {
    method: 'POST',
    headers: await getAdminHeaders()
  });
}

export async function fetchLegacyRecoveryStatus(): Promise<any> {
  return safeFetchJson('/api/admin/legacy-status', {
    headers: await getAdminHeaders()
  });
}

export async function triggerLegacyRecovery(): Promise<any> {
  invalidateProductsCache();
  return safeFetchJson('/api/admin/migrate-legacy', {
    method: 'POST',
    headers: await getAdminHeaders()
  });
}

// --- WUKARI BIKE RIDERS (OKADA DIRECTORY) API ---
export async function fetchBikeRiders(area?: string): Promise<BikeRider[]> {
  try {
    const params = new URLSearchParams();
    if (area && area !== 'all') params.set('area', area);
    const res = await safeFetchJson(`/api/bike-riders?${params.toString()}`);
    if (res && Array.isArray(res.riders)) {
      return res.riders;
    }
    return await getBikeRidersFromFirestore(area);
  } catch (err) {
    console.warn('[fetchBikeRiders fallback directly to Firestore]:', err);
    return await getBikeRidersFromFirestore(area);
  }
}

export async function registerBikeRider(
  data: Omit<BikeRider, 'id' | 'createdAt'>
): Promise<{ success: boolean; rider: BikeRider; message: string }> {
  try {
    const res = await safeFetchJson('/api/bike-riders', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (res && res.rider) {
      return res;
    }
    const rider = await createBikeRiderDirectlyInFirestore(data);
    return { success: true, rider, message: 'Bike rider registered successfully in Wukari directory!' };
  } catch (err) {
    console.warn('[registerBikeRider fallback directly to Firestore]:', err);
    const rider = await createBikeRiderDirectlyInFirestore(data);
    return { success: true, rider, message: 'Bike rider registered successfully in Wukari directory!' };
  }
}

export async function setBikeRiderAvailability(id: string, isAvailable: boolean): Promise<void> {
  try {
    await safeFetchJson(`/api/bike-riders/${id}/availability`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ isAvailable })
    });
  } catch (err) {
    console.warn('[setBikeRiderAvailability fallback to Firestore]:', err);
    await updateBikeRiderAvailability(id, isAvailable);
  }
}

