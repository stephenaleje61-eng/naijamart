export interface User {
  id: string;
  name: string;
  email: string;
  role: 'buyer' | 'seller' | 'admin';
  phone?: string;
  whatsappNumber?: string;
  state?: string;
  city?: string;
  avatarUrl?: string;
  isSuspended?: boolean;
  suspensionReason?: string;
  createdAt: string;
}

export interface SellerProfile {
  id: string;
  userId: string;
  shopName: string;
  shopSlug: string;
  shopLogo?: string;
  coverImage?: string;
  description: string;
  whatsappNumber: string;
  state: string;
  city: string;
  address?: string;
  isVerified: boolean;
  isSuspended?: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  sellerId: string;
  sellerName: string;
  shopName: string;
  whatsappNumber: string;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  categoryId: string;
  condition: 'new' | 'used';
  images: string[];
  state: string;
  city: string;
  quantity: number;
  status: 'active' | 'sold' | 'unavailable' | 'expired';
  moderationStatus?: 'approved' | 'pending_review' | 'rejected';
  moderationFlags?: string[];
  views: number;
  whatsappClicks: number;
  isFeatured?: boolean;
  createdAt: string;
  expiresAt: string;
  updatedAt: string;
  remainingMs?: number;
  remainingHours?: number;
  remainingDays?: number;
  isExpiringSoon?: boolean;
  sellerProfile?: SellerProfile;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  featured?: boolean;
  productCount?: number;
}

export interface ProductFilter {
  q?: string;
  category?: string;
  condition?: string;
  state?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  sellerId?: string;
  sort?: 'newest' | 'price-asc' | 'price-desc' | 'popular';
  page?: number;
  limit?: number;
}

export interface AdminMetrics {
  totalProducts: number;
  activeProducts: number;
  totalSellers: number;
  totalBuyers: number;
  totalViews: number;
  totalWhatsAppClicks: number;
  pendingReports: number;
  totalExpiredPurged: number;
  lastCleanupRun: string;
}

export interface ReportItem {
  id: string;
  reporterEmail: string;
  reporterName?: string;
  productId?: string;
  productTitle?: string;
  sellerId?: string;
  reason: string;
  details: string;
  status: 'pending' | 'resolved' | 'dismissed';
  adminNotes?: string;
  createdAt: string;
}

export interface AuditLogItem {
  id: string;
  action: string;
  actor: string;
  details: string;
  timestamp: string;
}
