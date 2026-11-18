export type InstitutionType =
  | 'Federal University'
  | 'State University'
  | 'Private University'
  | 'Federal Polytechnic'
  | 'State Polytechnic'
  | 'Private Polytechnic'
  | 'College of Education';

export interface Institution {
  id: string;
  name: string;
  shortName: string;
  type: InstitutionType;
  state: string;
  location: string;
  campuses: string[];
  campus: string;
  status: 'active' | 'inactive';
  isDefault?: boolean;
  logoUrl?: string;
  bannerUrl?: string;
  description?: string;
  primaryColor?: string;
  secondaryColor?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export type AccountType =
  | 'student'
  | 'seller'
  | 'house_agent'
  | 'landlord'
  | 'food_vendor'
  | 'delivery_partner'
  | 'business_owner'
  | 'student_association'
  | 'sports_organizer';

export interface InstitutionUserProfile {
  id: string;
  userId: string;
  institutionId: string;
  campus: string;
  name: string;
  email?: string;
  phone?: string;
  whatsappNumber?: string;
  accountType: AccountType;
  department?: string;
  levelOfStudy?: string;
  bio?: string;
  interests?: string[];
  preferredContactMethod?: 'whatsapp' | 'phone' | 'both';
  isVerified?: boolean;
  ceoVerified?: boolean;
  studentVerificationStatus?: 'unverified' | 'pending' | 'verified' | 'rejected';
  updatedAt: string;
  createdAt: string;
}

export type ScamEntityStatus = 'clear' | 'reported' | 'under_investigation' | 'confirmed_fraudulent';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'buyer' | 'seller' | 'admin';
  accountType?: AccountType;
  department?: string;
  levelOfStudy?: string;
  bio?: string;
  interests?: string[];
  institutionId?: string;
  campus?: string;
  joinedInstitutionIds?: string[];
  preferredContactMethod?: 'whatsapp' | 'phone' | 'both';
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
  studentVerificationStatus?: 'unverified' | 'pending' | 'verified' | 'rejected';
  verificationMethod?: 'edu_email' | 'student_id' | 'ceo_approved';
  scamStatus?: ScamEntityStatus;
  scamReportsCount?: number;
  lastSeen?: string | number;
  lastSeenAt?: string;
  createdAt: string;
}

export type DevicePlatformType = 'android' | 'iphone' | 'ipad' | 'desktop' | 'unknown';

export interface VisitorDayStat {
  dateKey: string;
  visits: number;
  uniqueVisitors: number;
  devices: Record<DevicePlatformType, number>;
}

export interface VisitorAnalyticsSummary {
  totalVisits: number;
  totalUniqueVisitors: number;
  todayVisits: number;
  todayUniqueVisitors: number;
  byDevice: Record<DevicePlatformType, number>;
  daily: VisitorDayStat[];
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
  institutionId?: string;
  campus?: string;
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
  institutionId?: string;
  campus?: string;
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
  institutionId?: string;
  campus?: string;
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
  institutionId?: string;
  campus?: string;
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
  buyerEmail?: string;
  buyerPhone: string;
  institutionId?: string;
  deliveryLocation: string;
  deliveryNotes?: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  paymentMethod: 'paystack' | 'flutterwave' | 'pay_on_delivery' | 'pay_on_inspection' | 'whatsapp_arrangement';
  paymentStatus?: 'unpaid' | 'pending' | 'paid' | 'failed';
  paymentReference?: string;
  status: 'pending_confirmation' | 'confirmed' | 'in_transit' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt?: string;
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
  institutionId?: string;
  campus?: string;
  department?: string;
  levelOfStudy?: string;
  bio?: string;
  interests?: string[];
  isVerified?: boolean;
  ceoVerified?: boolean;
  scamStatus?: ScamEntityStatus;
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
  | 'Hostel'
  | 'Off-campus accommodation'
  | 'Shop & business space'
  | 'Shared room'
  | 'Flat'
  | 'Other';

export interface HuxListing {
  id: string;
  category: HuxCategory;
  title: string;
  location: string;
  institutionId?: string;
  campus?: string;
  distanceToCampus?: string;
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
  agentId?: string;
  ceoVerified?: boolean;
  isVerified?: boolean;
  userId: string;
  userName: string;
  matricNumber?: string;
  sourceCollection?: 'hux' | 'accommodation';
  createdAt: string;
  updatedAt?: string;
  savedCount?: number;
}

export interface AccommodationProperty extends HuxListing {
  institutionId: string;
  campus?: string;
  distanceToCampus?: string;
}

export interface HouseAgentProfile {
  id: string;
  userId: string;
  agentName: string;
  agencyName?: string;
  institutionId: string;
  campus: string;
  areaCovered: string;
  phone: string;
  whatsapp: string;
  bio: string;
  photoUrl?: string;
  roleType: 'house_agent' | 'landlord';
  isVerified?: boolean;
  ceoVerified?: boolean;
  verifiedBadgeText?: string;
  verifiedByCeoAt?: string;
  verifiedByCeoEmail?: string;
  verificationNotes?: string;
  status: 'active' | 'suspended';
  createdAt: string;
  updatedAt: string;
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
export type SportMatchStatus =
  | 'upcoming'
  | 'live'
  | 'completed'
  | 'announcement'
  | 'other_sport';

export interface SportUpdatePost {
  id: string;
  categoryType: 'sport_update';
  sportCategory: string;
  matchStatus?: SportMatchStatus;
  institutionId?: string;
  campus?: string;
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
  institutionId?: string;
  campus?: string;
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
export type AdPlacement =
  | 'ads_section'
  | 'homepage_hero'
  | 'category_feed'
  | 'institution_spotlight';
export type AdVisibilityScope = 'all_institutions' | 'specific_institution';

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
  institutionId?: string;
  campus?: string;
  placement?: AdPlacement;
  visibilityScope?: AdVisibilityScope;
  createdByCeoEmail?: string;
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
  institutionId?: string;
  campus?: string;
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
  targetType: 'user' | 'seller' | 'advertisement' | 'service' | 'house_agent' | 'verification_logo';
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

// ============================================================================
// NIGERIA CAMPUS MARKET: SEARCH, NOTIFICATIONS, SAFETY, MONETIZATION & APP
// ============================================================================
export type NationalSearchScope = 'institution' | 'nationwide';

export type NationalSearchCategory =
  | 'all'
  | 'products'
  | 'accommodation'
  | 'house_agents'
  | 'food'
  | 'jobs'
  | 'books'
  | 'deals'
  | 'businesses'
  | 'sports'
  | 'announcements'
  | 'events'
  | 'services'
  | 'student_requests';

export interface NationalSearchFilters {
  query: string;
  scope: NationalSearchScope;
  category: NationalSearchCategory;
  institutionId: string;
  institutionType?: InstitutionType | 'all';
  state?: string;
  listingCategory?: string;
  minPrice?: number;
  maxPrice?: number;
  location?: string;
  datePosted?: 'all' | '24h' | '7d' | '30d';
  sort?: 'relevance' | 'newest' | 'popular' | 'price-asc' | 'price-desc';
}

export interface NationalSearchResult {
  id: string;
  entityType: Exclude<NationalSearchCategory, 'all'>;
  title: string;
  subtitle: string;
  description: string;
  imageUrl?: string;
  priceNaira?: number;
  institutionId: string;
  institutionName?: string;
  state?: string;
  location?: string;
  categoryLabel: string;
  engagementScore: number;
  createdAt: string;
  raw: any;
}

export type AppNotificationType =
  | 'message'
  | 'enquiry'
  | 'approval'
  | 'report'
  | 'announcement'
  | 'football'
  | 'favourite'
  | 'subscription'
  | 'advertisement'
  | 'food_order'
  | 'order'
  | 'inspection'
  | 'referral'
  | 'friend_request'
  | 'friend_accepted'
  | 'like'
  | 'comment'
  | 'verification'
  | 'security_warning'
  | 'system';

export interface AppNotification {
  id: string;
  userId: string;
  type: AppNotificationType;
  title: string;
  body: string;
  read: boolean;
  targetType?: string;
  targetId?: string;
  institutionId?: string;
  createdAt: string;
}

export interface NotificationPreferences {
  userId: string;
  messages: boolean;
  enquiries: boolean;
  approvals: boolean;
  announcements: boolean;
  footballUpdates: boolean;
  favourites: boolean;
  subscriptionsAndAds: boolean;
  browserAlertsEnabled: boolean;
  updatedAt: string;
}

export interface BlockedUserRecord {
  id: string;
  blockerId: string;
  blockedUserId: string;
  blockedUserName?: string;
  reason?: string;
  createdAt: string;
}

export interface ConversationReportRecord {
  id: string;
  chatId: string;
  reporterId: string;
  reporterName: string;
  reportedUserId: string;
  reportedUserName: string;
  reason: string;
  details: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  adminNotes?: string;
  createdAt: string;
}

export type SubscriptionPlanAudience =
  | 'seller_pro'
  | 'verified_business'
  | 'house_agent'
  | 'campus_ad_boost'
  | 'national_ad_boost';

export interface SubscriptionPlan {
  id: string;
  slug: string;
  audience: SubscriptionPlanAudience;
  name: string;
  description: string;
  priceNaira: number;
  durationDays: number;
  currency: 'NGN';
  features: string[];
  isActive: boolean;
  targetScope: 'campus' | 'state' | 'nationwide';
  updatedAt?: string;
}

export interface UserSubscription {
  id: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  planId: string;
  planName: string;
  audience: SubscriptionPlanAudience;
  institutionId?: string;
  status: 'active' | 'expired' | 'cancelled' | 'pending';
  paymentReference: string;
  amountNaira: number;
  startedAt: string;
  expiresAt: string;
}

export interface PaymentTransaction {
  id: string;
  reference: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  planId: string;
  planName: string;
  amountNaira: number;
  currency: 'NGN';
  gateway: 'paystack' | 'flutterwave' | 'ceo_manual';
  status: 'initialized' | 'verified' | 'failed';
  gatewayTransactionId?: string;
  gatewayResponse?: string;
  institutionId?: string;
  verifiedAt?: string;
  createdAt: string;
}

export interface AppSettings {
  id: string;
  apkUrl: string;
  playStoreUrl: string;
  apkEnabled: boolean;
  appVersion: string;
  releaseNotes: string;
  installAnnouncement: string;
  installInstructions: string;
  updatedAt?: string;
  updatedBy?: string;
}

export type PwaEventType =
  | 'prompt_shown'
  | 'install_accepted'
  | 'install_dismissed'
  | 'apk_download'
  | 'playstore_click';

export interface PwaInstallMetric {
  id: string;
  eventType: PwaEventType;
  platform: 'android' | 'ios' | 'desktop' | 'unknown';
  userAgent?: string;
  institutionId?: string;
  createdAt: string;
}

export interface RegionalModerator {
  id: string;
  email: string;
  name: string;
  assignedInstitutionId?: string;
  assignedState?: string;
  permissions: Array<'moderate_listings' | 'review_reports' | 'manage_announcements'>;
  status: 'active' | 'suspended';
  assignedByEmail: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// NIGERIA CAMPUS MARKET: REVIEWS, INSPECTIONS, FOOD, OPPORTUNITIES & GPA
// ============================================================================
export interface ProductReview {
  id: string;
  productId: string;
  sellerId?: string;
  reviewerId: string;
  reviewerName: string;
  institutionId?: string;
  rating: number; // 1..5
  comment: string;
  verifiedPurchase?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface SellerFollower {
  id: string;
  followerUid: string;
  followerName?: string;
  sellerId: string;
  sellerName?: string;
  institutionId?: string;
  createdAt: string;
}

export type InspectionRequestStatus = 'pending' | 'confirmed' | 'completed' | 'declined' | 'cancelled';

export interface AccommodationInspectionRequest {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyLocation: string;
  agentUserId: string;
  agentName: string;
  agentPhone?: string;
  studentUid: string;
  studentName: string;
  studentPhone: string;
  preferredDate: string;
  preferredTime: string;
  notes?: string;
  institutionId: string;
  status: InspectionRequestStatus;
  agentResponseNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HouseAgentVerificationRequest {
  id: string;
  agentId: string;
  userId: string;
  agentName: string;
  agencyName?: string;
  institutionId: string;
  phone: string;
  idType: 'National ID (NIN)' | 'Voter Card' | 'Driver License' | 'Student/Staff ID' | 'CAC Business Name';
  idNumberMasked?: string;
  documentUrl?: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedByEmail?: string;
  reviewedAt?: string;
  createdAt: string;
}

export type FoodCategoryId =
  | 'Rice & Stew'
  | 'Swallow & Soup'
  | 'Fast Food'
  | 'Snacks'
  | 'Drinks'
  | 'Shawarma'
  | 'Small Chops'
  | 'Grilled Chicken & Fish'
  | 'Breakfast'
  | 'Pastries'
  | 'Healthy Meals'
  | 'Student Meal Combos';

export type FoodOrderStatus =
  | 'Order Received'
  | 'Order Accepted'
  | 'Preparing Food'
  | 'Ready for Pickup'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled';

export interface FoodVendor {
  id: string;
  ownerUid: string;
  vendorName: string;
  description: string;
  institutionId: string;
  campus: string;
  location: string;
  phone: string;
  whatsapp: string;
  logoUrl?: string;
  bannerUrl?: string;
  openingHours: string;
  isOpen: boolean;
  deliveryFeeNaira: number;
  supportsPickup: boolean;
  supportsDelivery: boolean;
  categories: FoodCategoryId[];
  ceoVerified?: boolean;
  isVerified?: boolean;
  status: 'active' | 'pending' | 'suspended';
  totalOrders?: number;
  createdAt: string;
  updatedAt: string;
}

export interface FoodMenuItem {
  id: string;
  vendorId: string;
  vendorName: string;
  ownerUid: string;
  institutionId: string;
  name: string;
  description: string;
  category: FoodCategoryId;
  priceNaira: number;
  imageUrl?: string;
  prepTimeMinutes: number;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FoodCartItem {
  menuItemId: string;
  vendorId: string;
  vendorName: string;
  name: string;
  priceNaira: number;
  quantity: number;
  imageUrl?: string;
}

export interface FoodOrder {
  id: string;
  buyerUid: string;
  buyerName: string;
  buyerEmail?: string;
  buyerPhone: string;
  vendorId: string;
  vendorName: string;
  vendorOwnerUid: string;
  institutionId: string;
  fulfillmentType: 'pickup' | 'delivery';
  deliveryPoint?: 'Hostel' | 'Department' | 'Gate' | 'Off-campus';
  deliveryAddress: string;
  deliveryNotes?: string;
  items: FoodCartItem[];
  subtotalNaira: number;
  deliveryFeeNaira: number;
  totalNaira: number;
  paymentMethod: 'paystack' | 'flutterwave' | 'pay_on_delivery';
  paymentStatus: 'unpaid' | 'pending' | 'paid' | 'failed';
  paymentReference?: string;
  status: FoodOrderStatus;
  deliveryPartnerUid?: string;
  deliveryPartnerName?: string;
  deliveryPartnerPhone?: string;
  statusHistory?: Array<{ status: FoodOrderStatus; timestamp: string; note?: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryPartner {
  id: string;
  userUid: string;
  fullName: string;
  phone: string;
  whatsapp: string;
  institutionId: string;
  campus: string;
  vehicleType: 'Bicycle' | 'Motorcycle (Okada)' | 'Tricycle (Keke)' | 'On Foot' | 'Car';
  areasCovered: string;
  photoUrl?: string;
  isAvailable: boolean;
  ceoVerified?: boolean;
  completedDeliveries: number;
  totalEarningsNaira: number;
  status: 'active' | 'pending' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export interface CampusJobListing {
  id: string;
  posterUid: string;
  posterName: string;
  companyOrOrg: string;
  title: string;
  jobType: 'Part-time' | 'Internship' | 'SIWES' | 'Freelance' | 'Remote' | 'Campus Rep' | 'Graduate';
  institutionId: string;
  isNationwide: boolean;
  location: string;
  compensation: string;
  description: string;
  requirements: string;
  applicationLinkOrContact: string;
  deadline?: string;
  status: 'active' | 'closed' | 'pending';
  ceoVerified?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CampusBookListing {
  id: string;
  uploaderUid: string;
  uploaderName: string;
  title: string;
  courseCode?: string;
  department: string;
  level: string;
  materialType: 'Textbook' | 'Past Question' | 'Lecture Note' | 'Handout' | 'Lab Manual';
  institutionId: string;
  isFree: boolean;
  priceNaira: number;
  description: string;
  fileOrPreviewUrl?: string;
  contactPhone?: string;
  downloadsCount: number;
  status: 'active' | 'pending' | 'removed';
  createdAt: string;
  updatedAt: string;
}

export interface StudentDeal {
  id: string;
  creatorUid: string;
  businessName: string;
  title: string;
  discountBadge: string;
  category: string;
  institutionId: string;
  isNationwide: boolean;
  promoCode?: string;
  originalPriceNaira?: number;
  dealPriceNaira?: number;
  description: string;
  claimContact: string;
  expiryDate: string;
  imageUrl?: string;
  status: 'active' | 'expired' | 'pending';
  createdAt: string;
}

export interface StudentGiveaway {
  id: string;
  hostUid: string;
  hostName: string;
  title: string;
  prizeDescription: string;
  institutionId: string;
  isNationwide: boolean;
  eligibility: string;
  endDate: string;
  participantUids: string[];
  winnerUid?: string;
  winnerName?: string;
  status: 'open' | 'closed' | 'awarded';
  createdAt: string;
}

export interface ReferralRecord {
  id: string;
  referrerUid: string;
  referrerEmail?: string;
  referralCode: string;
  referredUid: string;
  referredEmail: string;
  referredName: string;
  institutionId?: string;
  rewardPoints: number;
  status: 'verified' | 'flagged_abuse' | 'pending';
  flagReason?: string;
  createdAt: string;
}

export interface AmbassadorApplication {
  id: string;
  userUid: string;
  fullName: string;
  email: string;
  phone: string;
  whatsapp: string;
  institutionId: string;
  department: string;
  level: string;
  motivation: string;
  socialHandle?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedByEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GradingScaleGrade {
  letter: string;
  minScore: number;
  maxScore: number;
  point: number;
}

export interface InstitutionGradingConfig {
  id: string; // institutionId or 'default_5_0' | 'default_4_0'
  institutionId: string;
  scaleMax: 5 | 4;
  isVerifiedOfficial: boolean;
  scaleLabel: string;
  grades: GradingScaleGrade[];
  updatedByEmail?: string;
  updatedAt: string;
}

export interface GpaCourseEntry {
  id: string;
  courseCode: string;
  courseTitle: string;
  creditUnits: number;
  grade: string;
  numericScore?: number;
}

export interface GpaSemesterRecord {
  id: string;
  session: string; // e.g. '2025/2026'
  semester: 'First Semester' | 'Second Semester' | 'Summer / Harmattan' | string;
  courses: GpaCourseEntry[];
}

export interface SavedAcademicRecord {
  id: string; // userId
  userId: string;
  institutionId: string;
  scaleMax: 5 | 4;
  customGrades?: GradingScaleGrade[];
  semesters: GpaSemesterRecord[];
  updatedAt: string;
}

export interface CodPolicySettings {
  codEnabled: boolean;
  codFoodEnabled: boolean;
  codMaxOrderNaira: number;
  codNote: string;
  updatedAt?: string;
  updatedBy?: string;
}

// ============================================================================
// NIGERIA UNIVERSITY HUB: SOCIAL FEED, COMMUNITIES, VERIFICATION & ANTI-SCAM
// ============================================================================
export type StudentPostCategory =
  | 'campus_update'
  | 'academic_discussion'
  | 'study_resource'
  | 'marketplace_highlight'
  | 'event_meetup'
  | 'sport_gist';

export interface StudentPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorInstitutionId?: string;
  authorInstitutionName?: string;
  authorDepartment?: string;
  authorLevel?: string;
  authorVerified?: boolean;
  institutionId: string;
  state?: string;
  category: StudentPostCategory;
  content: string;
  imageUrls?: string[];
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  status: 'published' | 'flagged' | 'removed';
  createdAt: string;
  updatedAt: string;
}

export interface StudentPostComment {
  id: string;
  postId: string;
  parentCommentId?: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorInstitutionId?: string;
  authorVerified?: boolean;
  text: string;
  createdAt: string;
}

export interface StudentPostReport {
  id: string;
  postId: string;
  postAuthorId: string;
  reporterId: string;
  reporterName: string;
  reason: string;
  details: string;
  status: 'pending' | 'reviewed' | 'removed' | 'dismissed';
  reviewedByEmail?: string;
  createdAt: string;
}

export interface FollowedDiscussion {
  id: string;
  userId: string;
  postId: string;
  createdAt: string;
}

export interface UniversityCommunityMembership {
  id: string;
  userId: string;
  userName: string;
  institutionId: string;
  campus?: string;
  department?: string;
  levelOfStudy?: string;
  joinedAt: string;
}

export interface StudentVerificationRequest {
  id: string;
  userId: string;
  userName: string;
  email: string;
  institutionalEmail?: string;
  phone: string;
  institutionId: string;
  institutionName?: string;
  campus?: string;
  department: string;
  levelOfStudy: string;
  matricNumber?: string;
  verificationMethod: 'edu_email' | 'student_id';
  studentIdDocumentUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewNotes?: string;
  reviewedByEmail?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type ScamTargetType = 'product' | 'seller' | 'user' | 'service' | 'housing' | 'post' | 'chat';
export type ScamInvestigationStatus = 'reported' | 'under_investigation' | 'confirmed_fraudulent' | 'dismissed';

export interface ScamReportRecord {
  id: string;
  targetType: ScamTargetType;
  targetId: string;
  targetName: string;
  targetUserId?: string;
  suspectPhone?: string;
  suspectBankAccount?: string;
  suspectBankName?: string;
  institutionId?: string;
  reporterId: string;
  reporterName: string;
  reporterEmail?: string;
  reason: string;
  details: string;
  evidenceUrls?: string[];
  status: ScamInvestigationStatus;
  adminNotes?: string;
  reviewedByEmail?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FlaggedIdentifierRecord {
  id: string;
  identifierType: 'phone' | 'bank_account';
  identifierValue: string;
  normalizedValue: string;
  reportCount: number;
  status: ScamInvestigationStatus;
  lastReportedAt: string;
  notes?: string;
}

export interface AccountAppealRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  phone?: string;
  explanation: string;
  evidenceUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewerNotes?: string;
  reviewedByEmail?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type AnnouncementAudienceScope =
  | 'all_universities'
  | 'all_polytechnics'
  | 'selected_institutions'
  | 'selected_states'
  | 'single_institution';

export interface NationalCampusAnnouncement {
  id: string;
  title: string;
  body: string;
  category:
    | 'National Policy'
    | 'Scholarship & Grants'
    | 'Academic Calendar'
    | 'Security Alert'
    | 'Campus Event'
    | 'Marketplace Notice';
  audienceScope: AnnouncementAudienceScope;
  targetInstitutionIds?: string[];
  targetStates?: string[];
  singleInstitutionId?: string;
  authorId: string;
  authorName: string;
  authorRole: 'ceo' | 'admin' | 'campus_representative';
  isPinned: boolean;
  isUrgent?: boolean;
  imageUrl?: string;
  status: 'published' | 'archived';
  createdAt: string;
  updatedAt: string;
}

