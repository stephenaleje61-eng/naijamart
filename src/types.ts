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
  isVerified?: boolean;
  ceoVerified?: boolean;
  verifiedBadgeText?: string;
  verifiedByCeoAt?: string;
  verifiedByCeoEmail?: string;
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
  ceoVerified?: boolean;
  verifiedBadgeText?: string;
  verifiedByCeoAt?: string;
  verifiedByCeoEmail?: string;
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
  forceRefresh?: boolean;
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

// ============================================================================
// FU MARKET BIRTHDAY & EVENTS ANNOUNCEMENT CENTRE (CEO-ONLY PUBLISHING)
// ============================================================================
export interface CampusEvent {
  id: string;
  celebrantName: string;
  eventType: string;
  eventDate: string; // YYYY-MM-DD
  eventTime?: string;
  venue: string;
  description: string;
  additionalInfo?: string;
  photoUrl: string;
  status: 'published' | 'draft';
  publishAt?: string; // Optional ISO datetime for scheduled publishing
  createdByUid?: string;
  createdByEmail?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// FU MARKET PUBLIC SPORT UPDATES & GENERAL ANNOUNCEMENTS CENTRE
// ============================================================================
export type PostCollectionName = 'sport_updates' | 'general_announcements';
export type AnnouncementModerationStatus = 'published' | 'pending' | 'rejected' | 'removed';

export interface SportUpdatePost {
  id: string;
  categoryType: 'sport_update';
  sportCategory: string;
  title: string;
  teamOrPlayer?: string;
  competitionName?: string;
  matchDate?: string;
  matchTime?: string;
  venue?: string;
  score?: string;
  description: string;
  imageUrl?: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  status: AnnouncementModerationStatus;
  moderationFlags?: string[];
  adminNotes?: string;
  isPinned: boolean;
  isFeatured: boolean;
  isUnverifiedUserPost?: boolean;
  likesCount: number;
  commentsCount: number;
  views: number;
  createdAt: string;
  updatedAt: string;
}

export interface GeneralAnnouncementPost {
  id: string;
  categoryType: 'general_announcement';
  announcementCategory: string;
  title: string;
  eventDate?: string;
  eventTime?: string;
  location?: string;
  description: string;
  imageUrl?: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  status: AnnouncementModerationStatus;
  moderationFlags?: string[];
  adminNotes?: string;
  isPinned: boolean;
  isFeatured: boolean;
  likesCount: number;
  commentsCount: number;
  views: number;
  createdAt: string;
  updatedAt: string;
}

export type CommunityAnnouncementPost = SportUpdatePost | GeneralAnnouncementPost;

export interface AnnouncementComment {
  id: string;
  postId: string;
  postCollection: PostCollectionName;
  parentCommentId?: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnnouncementReport {
  id: string;
  postId: string;
  postCollection: PostCollectionName;
  postTitle: string;
  reason: string;
  details: string;
  reporterId?: string;
  reporterName?: string;
  status: 'pending' | 'resolved' | 'dismissed';
  adminNotes?: string;
  createdAt: string;
}

export interface PublicAuthorProfile {
  authorId: string;
  name: string;
  avatarUrl?: string;
  city?: string;
  isVerifiedSeller?: boolean;
  joinedAt?: string;
}

// ============================================================================
// FU MARKET ADS & CEO MASTER CONTROL SYSTEM
// ============================================================================
export type AdPackageId = 'basic' | 'premium' | 'featured';

export interface AdvertisingPackage {
  id: AdPackageId;
  name: string;
  priceNaira: number;
  durationDays: number;
  placementLabel: string;
  benefits: string[];
  featuredPosition?: boolean;
}

export type AdStatus = 'pending_approval' | 'active' | 'paused' | 'rejected' | 'expired';
export type AdPaymentStatus = 'unpaid' | 'pending_verification' | 'paid' | 'failed';

export interface Advertisement {
  id: string;
  businessName: string;
  ownerName: string;
  phone: string;
  whatsappNumber: string;
  businessCategory: string;
  title: string;
  description: string;
  imageUrl: string;
  logoUrl?: string;
  location: string;
  packageId: AdPackageId;
  packageName?: string;
  packagePrice: number;
  durationDays: number;
  websiteOrSocialLink?: string;
  ownerUid?: string;
  status: AdStatus;
  paymentStatus: AdPaymentStatus;
  paymentReference?: string;
  isFeatured: boolean;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  startDate?: string;
  expiryDate?: string;
  impressions: number;
  clicks: number;
  whatsappClicks: number;
  adminNotes?: string;
  isVerified?: boolean;
  ceoVerified?: boolean;
  verifiedBadgeText?: string;
  verifiedByCeoAt?: string;
  verifiedByCeoEmail?: string;
  verificationNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdPaymentRecord {
  id: string;
  reference: string;
  adId: string;
  businessName: string;
  payerEmail?: string;
  payerPhone?: string;
  packageId: AdPackageId;
  amountNaira: number;
  currency: 'NGN';
  provider: 'paystack' | 'ceo_manual';
  status: 'initialized' | 'verified' | 'failed';
  gatewayResponse?: string;
  verifiedAt?: string;
  createdAt: string;
}

export interface AdAnalyticsEvent {
  id: string;
  adId: string;
  eventType: 'impression' | 'click' | 'whatsapp_click';
  createdAt: string;
}

export interface AdminAuditLogRecord {
  id: string;
  action:
    | 'delete'
    | 'bulk_delete'
    | 'soft_delete'
    | 'restore'
    | 'permanent_delete'
    | 'edit'
    | 'approve'
    | 'reject'
    | 'pause'
    | 'reactivate'
    | 'feature'
    | 'verify_payment';
  contentType: string;
  recordId: string;
  recordTitle?: string;
  adminEmail: string;
  reason?: string;
  createdAt: string;
}

export interface ContentArchiveRecord {
  id: string;
  sourceCollection: string;
  sourceId: string;
  contentType: string;
  title: string;
  ownerName: string;
  categoryLabel: string;
  statusLabel: string;
  deletedByEmail: string;
  deletionReason?: string;
  originalCreatedAt: string;
  deletedAt: string;
  payload: Record<string, any>;
}

export type WebsiteContentFilterKey =
  | 'all'
  | 'products'
  | 'services'
  | 'advertisements'
  | 'events'
  | 'announcements'
  | 'sports'
  | 'emergency'
  | 'business_listings'
  | 'student_posts'
  | 'comments'
  | 'other';

export interface UnifiedContentRecord {
  compositeKey: string;
  sourceCollection: string;
  sourceId: string;
  filterGroup: Exclude<WebsiteContentFilterKey, 'all'>;
  sectionTag: string;
  title: string;
  subtitle?: string;
  ownerName: string;
  ownerContact?: string;
  categoryLabel: string;
  statusLabel: string;
  imageUrl?: string;
  createdAt: string;
  supportsApproval?: boolean;
  supportsEdit?: boolean;
  supportsSoftDelete?: boolean;
  rawData: Record<string, any>;
}

// ============================================================================
// FU MARKET STUDENT SERVICES MARKETPLACE
// ============================================================================
export type ServiceAvailability = 'available' | 'busy' | 'unavailable';
export type ServiceStatus = 'active' | 'pending' | 'rejected' | 'suspended' | 'unavailable';
export type ServicePromotionPlanId = 'homepage' | 'weekly' | 'monthly';
export type ServicePromotionStatus =
  | 'none'
  | 'pending_payment'
  | 'pending_approval'
  | 'active'
  | 'expired';

export interface ServicePromotionPlan {
  id: ServicePromotionPlanId;
  name: string;
  priceNaira: number;
  durationDays: number;
  placementLabel: string;
  benefits: string[];
}

export interface ServiceListing {
  serviceId: string;
  providerId: string;
  providerName: string;
  serviceName: string;
  category: string;
  description: string;
  price: number;
  priceMax?: number;
  priceDisplay?: string;
  location: string;
  phone: string;
  whatsapp: string;
  images: string[];
  availability: ServiceAvailability;
  availabilityNote?: string;
  status: ServiceStatus;
  featured: boolean;
  promotionPlan?: 'none' | ServicePromotionPlanId;
  promotionStatus?: ServicePromotionStatus;
  promotionPrice?: number;
  promotionReference?: string;
  promotionStartDate?: string;
  promotionExpiryDate?: string;
  views: number;
  whatsappClicks: number;
  moderationNotes?: string;
  isGuestPost?: boolean;
  isVerified?: boolean;
  ceoVerified?: boolean;
  verifiedBadgeText?: string;
  verifiedByCeoAt?: string;
  verifiedByCeoEmail?: string;
  verificationNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ServiceReport {
  id: string;
  serviceId: string;
  serviceName: string;
  providerId?: string;
  reason: string;
  details: string;
  reporterId?: string;
  reporterName?: string;
  status: 'pending' | 'resolved' | 'dismissed';
  adminNotes?: string;
  createdAt: string;
}

// ============================================================================
// FU MARKET CAMPUS EMERGENCY & HELP CENTRE
// ============================================================================
export type EmergencyDepartment =
  | 'security'
  | 'student_affairs'
  | 'health_centre'
  | 'fire_rescue'
  | 'police'
  | 'local_emergency';

export interface EmergencyContact {
  id: string;
  name: string;
  department: EmergencyDepartment;
  phone: string;
  description: string;
  verified: boolean;
  operatingHours: string;
  createdAt: string;
  updatedAt: string;
}

export type EmergencyReportKind = 'emergency' | 'security_concern';

export type EmergencyReportStatus =
  | 'Received'
  | 'Under Review'
  | 'Assigned'
  | 'Resolved'
  | 'Closed';

export interface EmergencyReport {
  reportId: string;
  kind: EmergencyReportKind;
  reportType: string;
  description: string;
  location: string;
  incidentDate: string;
  contactPhone?: string;
  reporterName?: string;
  isConfidential: boolean;
  reporterUid?: string;
  attachmentUrls?: string[];
  status: EmergencyReportStatus;
  adminNotes?: string;
  trackingHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmergencyReportTrackingStatus {
  lookupHash: string;
  reportId: string;
  kind: EmergencyReportKind;
  reportType: string;
  status: EmergencyReportStatus;
  statusMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export type SafetyAnnouncementCategory =
  | 'safety_notice'
  | 'fire_safety'
  | 'security_warning'
  | 'service_update';

export type SafetyAnnouncementSeverity = 'info' | 'important' | 'urgent';

export interface SafetyAnnouncement {
  id: string;
  title: string;
  description: string;
  category: SafetyAnnouncementCategory;
  severity: SafetyAnnouncementSeverity;
  publishedAt: string;
  createdBy: string;
  isActive: boolean;
  isPinned?: boolean;
  updatedAt?: string;
}

export type LostFoundReportType = 'lost' | 'found';
export type LostFoundItemCategory =
  | 'phone'
  | 'student_id'
  | 'wallet'
  | 'bag'
  | 'keys'
  | 'other';
export type LostFoundStatus = 'open' | 'matched' | 'recovered' | 'closed';

export interface LostFoundItem {
  id: string;
  reportType: LostFoundReportType;
  itemCategory: LostFoundItemCategory;
  title: string;
  description: string;
  location: string;
  incidentDate: string;
  recoveryInstructions: string;
  publicRecoveryContact?: string;
  imageUrl?: string;
  reporterUid?: string;
  reporterLabel?: string;
  status: LostFoundStatus;
  isHiddenByAdmin?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LostFoundPrivateRecord {
  id: string;
  itemId: string;
  privatePhone?: string;
  privateIdentifierHint?: string;
  createdAt: string;
}

export interface EmergencyAuditLog {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  summary: string;
  adminEmail: string;
  createdAt: string;
}

// ============================================================================
// EXCLUSIVE CEO ADMIN LOGIN, VERIFICATION & SECURITY TYPES
// ============================================================================
export interface CeoVerificationSettings {
  id: string;
  logoUrl: string;
  badgeText: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface CeoVerificationLog {
  id: string;
  action: 'VERIFIED' | 'UNVERIFIED' | 'LOGO_UPDATED' | 'LOGO_REMOVED';
  targetType: 'user' | 'seller' | 'advertisement' | 'service' | 'verification_logo';
  targetId: string;
  targetName: string;
  ceoEmail: string;
  notes?: string;
  createdAt: string;
}

export type CeoSecurityEventType =
  | 'CEO_LOGIN_SUCCESS'
  | 'CEO_LOGIN_FAILED'
  | 'CEO_LOGIN_LOCKOUT'
  | 'CEO_LOGOUT'
  | 'CEO_SESSION_EXPIRED'
  | 'CEO_SENSITIVE_REAUTH'
  | 'UNAUTHORIZED_CEO_ACCESS'
  | 'CEO_VERIFICATION_CHANGE'
  | 'CEO_LOGO_UPDATED'
  | 'CEO_LOGO_REMOVED'
  | 'CEO_SETTINGS_UPDATED'
  | 'CEO_USER_MODERATION';

export interface CeoSecurityLog {
  id: string;
  eventType: CeoSecurityEventType;
  severity: 'info' | 'warning' | 'critical';
  actorEmail?: string;
  actorUid?: string;
  targetType?: string;
  targetId?: string;
  ipAddress?: string;
  userAgent?: string;
  summary: string;
  createdAt: string;
}

export interface CeoSecuritySettings {
  sessionTimeoutMinutes: number;
  requirePhoneCheckOnLogin: boolean;
  reauthWindowMinutes: number;
  maxFailedLoginAttempts: number;
  lockoutDurationMinutes: number;
  updatedAt?: string;
}

export interface CeoSessionState {
  authorized: boolean;
  role: 'CEO SUPER ADMINISTRATOR';
  email: string;
  uid: string;
  phoneVerified: boolean;
  ceoSessionToken: string;
  sessionExpiresAt: number;
  reauthAt: number;
  verificationMethod?: string;
  customClaim?: {
    adminSdkConfigured: boolean;
    claimStatus: 'active' | 'pending_service_account' | 'failed';
    message: string;
  };
}



