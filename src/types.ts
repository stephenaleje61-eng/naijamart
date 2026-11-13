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
  imageUrl?: string;
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
  expiresAt?: string;
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

export interface BikeRider {
  id: string;
  name: string;
  photoUrl: string;
  phoneNumber: string;
  whatsappNumber: string;
  area: string;
  isAvailable: boolean;
  createdAt: string;
  userId?: string;
}

// ============================================================================
// STUDENT REQUESTS ("What Students Need")
// ============================================================================
export interface StudentRequest {
  id: string;
  title: string;
  description: string;
  budget: number;
  location: string;
  phone: string;
  whatsapp?: string;
  imageUrl?: string;
  userId: string;
  userName: string;
  matricNumber?: string;
  status: 'open' | 'fulfilled';
  createdAt: string;
  updatedAt?: string;
}

// ============================================================================
// CART & ORDER REVIEW
// ============================================================================
export interface CartItem {
  productId: string;
  title: string;
  price: number;
  quantity: number;
  imageUrl: string;
  sellerId: string;
  sellerName: string;
  shopName: string;
  whatsappNumber: string;
  maxQuantity: number;
}

export interface OrderRecord {
  id: string;
  buyerId: string;
  buyerName: string;
  buyerPhone: string;
  deliveryLocation: string;
  deliveryNotes?: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  paymentMethod: 'pay_on_inspection' | 'whatsapp_arrangement';
  status: 'pending_confirmation' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: string;
}

// ============================================================================
// SINGLE HUB - FUWukari (Open Group Chat)
// ============================================================================
export interface HubMessage {
  id: string;
  senderId: string;
  senderName: string;
  matricNumber?: string;
  text?: string;
  imageUrl?: string;
  createdAt: string;
  timestamp?: number;
}

export interface HubActiveUser {
  userId: string;
  name: string;
  matricNumber?: string;
  lastActiveAt: number;
}

// ============================================================================
// FRIEND SYSTEM & PRIVATE 1-ON-1 CHAT
// ============================================================================
export interface RegisteredUser {
  id: string;
  name: string;
  matricNumber?: string;
  email?: string;
  phone?: string;
  whatsappNumber?: string;
  avatarUrl?: string;
  isOnline?: boolean;
  lastSeen?: string | number;
  department?: string;
  bio?: string;
  createdAt?: string;
}

export interface FriendRequest {
  id: string;
  fromId: string;
  fromName: string;
  fromMatric?: string;
  fromAvatar?: string;
  toId: string;
  toName: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface Friend {
  id: string;
  userId: string;
  name: string;
  matricNumber?: string;
  avatarUrl?: string;
  friendSince: string;
  isOnline?: boolean;
  lastSeen?: string | number;
  chatId: string;
  unreadCount?: number;
}

export interface PrivateMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  text?: string;
  imageUrl?: string;
  createdAt: string;
  timestamp?: number;
  seen: boolean;
  seenAt?: string;
}

export interface ChatMetadata {
  chatId: string;
  participants: string[];
  participantNames?: Record<string, string>;
  participantMatrics?: Record<string, string>;
  lastMessageText?: string;
  lastMessageTime?: string;
  lastSenderId?: string;
  updatedAt?: string;
  typing?: Record<string, number>;
}

// ============================================================================
// HOUSING - WUKARI AGENT (Rent & Roommate)
// ============================================================================
export type HuxCategory = 'rent' | 'roommate';
export type HuxType =
  | 'Self-contain'
  | 'Single room'
  | '1-Bedroom'
  | '2-Bedroom'
  | 'Student lodge'
  | 'Shared room'
  | 'Flat'
  | 'Other';

export interface HuxListing {
  id: string;
  category: HuxCategory;
  title: string;
  location: string;
  price: number;
  pricePer: 'year' | 'semester' | 'month';
  phone: string;
  whatsapp: string;
  images: string[];
  imageUrl?: string;
  description: string;
  type: HuxType;
  rooms?: number;
  facilities?: string[];
  isAvailable?: boolean;
  isAgent?: boolean;
  agentName?: string;
  userId: string;
  userName: string;
  matricNumber?: string;
  createdAt: string;
  updatedAt?: string;
  savedCount?: number;
}

export interface HuxReport {
  id: string;
  huxId: string;
  huxTitle: string;
  reason: string;
  details: string;
  reporterName?: string;
  reporterContact?: string;
  status?: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
}
