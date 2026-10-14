import {
  Product,
  Category,
  User,
  SellerProfile,
  ProductFilter,
  AdminMetrics,
  ReportItem,
  AuditLogItem
} from '../types.js';

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

export const getApiBaseUrl = (): string => {
  // 1. User configured custom URL in localStorage (explicit override)
  const custom = localStorage.getItem(BACKEND_URL_KEY) || localStorage.getItem('naijamart_backend_url');
  if (custom && custom.trim().length > 0) {
    return custom.trim().replace(/\/+$/, '');
  }

  // 2. Build-time environment variable VITE_BACKEND_URL
  const envUrl = (import.meta as any).env?.VITE_BACKEND_URL;
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // 3. Default: relative path (in full-stack Express + Vite environment)
  return '';
};

export const setApiBaseUrl = (url: string | null) => {
  if (url && url.trim().length > 0) {
    localStorage.setItem(BACKEND_URL_KEY, url.trim().replace(/\/+$/, ''));
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

// Robust fetch utility that parses JSON safely, handles status codes, and prevents raw HTML or [object Object] errors
export const safeFetchJson = async (endpoint: string, options: RequestInit = {}) => {
  const base = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = base ? `${base}${cleanEndpoint}` : cleanEndpoint;

  const mergedHeaders: Record<string, string> = {
    'Accept': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  let res: Response;
  try {
    res = await fetch(fullUrl, {
      ...options,
      headers: mergedHeaders
    });
  } catch (networkErr: any) {
    console.error(`[Network Connection Failed] Unable to reach ${fullUrl}:`, networkErr);
    throw new Error(
      `Unable to connect to ZangaMarket backend server at ${fullUrl}. Please check your internet connection or verify the backend service is running.`
    );
  }

  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();
  let data: any;

  try {
    data = JSON.parse(text);
  } catch (err) {
    console.error(`[API Fetch Error] Server returned non-JSON response from ${fullUrl} (HTTP ${res.status}, Content-Type: ${contentType}):\n`, text.slice(0, 500));
    
    // Provide precise, actionable diagnostics
    if (res.status === 200 && text.trim().length === 0) {
      throw new Error(
        `Server returned an empty response (200 OK with 0 bytes). The endpoint (${cleanEndpoint}) is currently returning empty data instead of JSON.`
      );
    }

    if (contentType.includes('text/html') || text.includes('<!DOCTYPE') || text.includes('<html')) {
      if (res.status === 404) {
        throw new Error(
          `Backend API route (${cleanEndpoint}) was not found (HTTP 404). Please ensure the backend is running and requests are directed to the live server.`
        );
      }
      throw new Error(
        `Server returned HTML page (${res.status}) instead of JSON. Ensure your backend route begins with /api and the API server is active.`
      );
    }

    throw new Error(
      `Server returned an unexpected response (${res.status}) instead of JSON. The backend service may be starting up or misconfigured.`
    );
  }

  if (!res.ok) {
    const errMsg = typeof data?.error === 'string'
      ? data.error
      : typeof data?.message === 'string'
      ? data.message
      : `Request failed with status ${res.status}`;
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
  if (filters.minPrice !== undefined && filters.minPrice > 0) params.set('minPrice', String(filters.minPrice));
  if (filters.maxPrice !== undefined && filters.maxPrice > 0) params.set('maxPrice', String(filters.maxPrice));
  if (filters.sellerId) params.set('sellerId', filters.sellerId);
  if (filters.sort) params.set('sort', filters.sort);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));

  return safeFetchJson(`/api/products?${params.toString()}`);
}

export async function fetchFlashDeals(): Promise<Product[]> {
  return safeFetchJson('/api/products/flash-deals');
}

export async function fetchTrendingProducts(): Promise<Product[]> {
  return safeFetchJson('/api/products/trending');
}

export async function fetchProductById(id: string): Promise<Product> {
  return safeFetchJson(`/api/products/${id}`);
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

// Publish Product - Supports BOTH FormData and JSON payload
export async function createProductListing(
  payload: FormData | Partial<Product>
): Promise<{ success: boolean; product: Product; message: string }> {
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

  return safeFetchJson('/api/products', {
    method: 'POST',
    headers,
    body
  });
}

export async function updateProductListing(id: string, productData: Partial<Product>): Promise<{ product: Product; message: string }> {
  return safeFetchJson(`/api/products/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(productData)
  });
}

export async function deleteProductListing(id: string): Promise<{ message: string }> {
  return safeFetchJson(`/api/products/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
}

export async function toggleProductFavourite(id: string): Promise<{ favourited: boolean; message: string }> {
  return safeFetchJson(`/api/products/${id}/favourite`, {
    method: 'POST',
    headers: getHeaders()
  });
}

export async function reportProduct(id: string, reportData: { reason: string; details: string; reporterEmail?: string }): Promise<any> {
  return safeFetchJson(`/api/products/${id}/report`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(reportData)
  });
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
  return safeFetchJson('/api/categories');
}

// --- AUTH API ---
export async function loginUser(email: string, password: string): Promise<{ user: User; token: string; sellerProfile?: SellerProfile }> {
  const data = await safeFetchJson('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  setAuthToken(data.token);
  return data;
}

export async function registerUser(userData: any): Promise<{ user: User; token: string; sellerProfile?: SellerProfile }> {
  const data = await safeFetchJson('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  setAuthToken(data.token);
  return data;
}

export async function sendForgotPassword(email: string): Promise<{ success: boolean; message: string }> {
  return safeFetchJson('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
}

export async function submitResetPassword(email: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  return safeFetchJson('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, newPassword })
  });
}

export async function fetchCurrentUser(): Promise<{ user: User; sellerProfile?: SellerProfile; favourites: string[] }> {
  return safeFetchJson('/api/auth/me', {
    headers: getHeaders()
  });
}

export async function updateProfile(profileData: any): Promise<{ user: User; sellerProfile?: SellerProfile }> {
  return safeFetchJson('/api/auth/profile', {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(profileData)
  });
}

// --- SELLER STOREFRONT & DASHBOARD API ---
export async function fetchSellerStorefront(identifier: string): Promise<{ seller: SellerProfile & { totalListings: number }; products: Product[] }> {
  return safeFetchJson(`/api/sellers/storefront/${identifier}`);
}

export async function fetchMySellerListings(): Promise<{ listings: Product[]; stats: any }> {
  return safeFetchJson('/api/sellers/my-listings', {
    headers: getHeaders()
  });
}

export async function updateSellerProfile(profileData: Partial<SellerProfile>): Promise<any> {
  return safeFetchJson('/api/sellers/profile', {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(profileData)
  });
}

// --- ADMIN API ---
export async function fetchAdminMetrics(): Promise<{ metrics: AdminMetrics; cleanupStats: any; recentAuditLogs: AuditLogItem[] }> {
  return safeFetchJson('/api/admin/metrics', {
    headers: getHeaders()
  });
}

export async function fetchAdminProducts(): Promise<{ products: Product[] }> {
  return safeFetchJson('/api/admin/products', {
    headers: getHeaders()
  });
}

export async function adminRemoveProduct(id: string): Promise<any> {
  return safeFetchJson(`/api/admin/products/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
}

export async function adminToggleFeatured(id: string): Promise<any> {
  return safeFetchJson(`/api/admin/products/${id}/toggle-featured`, {
    method: 'POST',
    headers: getHeaders()
  });
}

export async function fetchAdminUsers(): Promise<{ users: User[] }> {
  return safeFetchJson('/api/admin/users', {
    headers: getHeaders()
  });
}

export async function adminToggleSellerVerification(userId: string): Promise<any> {
  return safeFetchJson(`/api/admin/sellers/${userId}/toggle-verify`, {
    method: 'POST',
    headers: getHeaders()
  });
}

export async function fetchAdminReports(): Promise<{ reports: ReportItem[] }> {
  return safeFetchJson('/api/admin/reports', {
    headers: getHeaders()
  });
}

export async function adminResolveReport(id: string, status: 'resolved' | 'dismissed', adminNotes?: string): Promise<any> {
  return safeFetchJson(`/api/admin/reports/${id}/resolve`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ status, adminNotes })
  });
}

export async function adminModerateProduct(id: string, status: 'approved' | 'rejected' | 'pending_review', notes?: string): Promise<any> {
  return safeFetchJson(`/api/admin/products/${id}/moderate`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ status, notes })
  });
}

export async function adminToggleUserSuspension(id: string, reason?: string): Promise<any> {
  return safeFetchJson(`/api/admin/users/${id}/toggle-suspend`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ reason })
  });
}

export async function adminTriggerExpirationPurge(): Promise<any> {
  return safeFetchJson('/api/admin/trigger-cleanup', {
    method: 'POST',
    headers: getHeaders()
  });
}
