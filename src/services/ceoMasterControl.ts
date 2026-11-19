import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { auth, db, invalidateProductsCache, stripUndefined, toIsoString } from './firebase.js';
import { getAdminHeaders, safeFetchJson } from './api.js';
import { CEO_EMAIL, isFirebaseCeoVerified } from './events.js';
import { recordAdminAuditLog, sanitizeAdDoc } from './ads.js';
import {
  AdminAuditLogRecord,
  ContentArchiveRecord,
  UnifiedContentRecord
} from '../types.js';

export const DELETE_CONFIRMATION_MESSAGE = 'ARE YOU SURE YOU WANT TO DELETE THIS CONTENT?';

// Protected collections & records MUST NEVER be bulk-deleted
export const PROTECTED_COLLECTIONS = ['admins', 'adPayments', 'adminAuditLogs'] as const;

function assertCeo(): void {
  if (!isFirebaseCeoVerified()) {
    throw new Error(
      `CEO access denied: Please sign in with the authorized CEO Google account (${CEO_EMAIL}).`
    );
  }
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 128);
}

function safeStr(val: unknown, fallback = ''): string {
  return typeof val === 'string' && val.trim() ? val.trim() : fallback;
}

export interface UploadedFileRecord {
  filename: string;
  url: string;
  sizeBytes: number;
  createdAt: string;
  modifiedAt: string;
}

export async function fetchAllWebsiteContent(): Promise<{
  records: UnifiedContentRecord[];
  archivedCount: number;
  protectedStats: {
    paymentsCount: number;
    auditLogsCount: number;
    adminsProtected: number;
  };
}> {
  assertCeo();

  const headersPromise = getAdminHeaders();

  const [
    productsRes,
    servicesRes,
    serviceCatsRes,
    serviceRepsRes,
    adsRes,
    sellerProfilesRes,
    eventsRes,
    sportUpdatesRes,
    generalAnnRes,
    studentReqsRes,
    hubMessagesRes,
    commentsRes,
    huxRes,
    ridersRes,
    reportsRes,
    huxReportsRes,
    annReportsRes,
    usersRes,
    privateChatsRes,
    archiveRes,
    paymentsRes,
    auditRes,
    emergencyContactsRes,
    emergencyReportsRes,
    safetyAnnouncementsRes,
    lostFoundRes,
    accommodationRes,
    houseAgentsRes,
    uploadsRes
  ] = await Promise.allSettled([
    getDocs(collection(db, 'products')),
    getDocs(collection(db, 'services')),
    getDocs(collection(db, 'serviceCategories')),
    getDocs(collection(db, 'serviceReports')),
    getDocs(collection(db, 'advertisements')),
    getDocs(collection(db, 'sellerProfiles')),
    getDocs(collection(db, 'events')),
    getDocs(collection(db, 'sport_updates')),
    getDocs(collection(db, 'general_announcements')),
    getDocs(collection(db, 'studentRequests')),
    getDocs(collection(db, 'hubMessages')),
    getDocs(collection(db, 'announcement_comments')),
    getDocs(collection(db, 'hux')),
    getDocs(collection(db, 'bikeRiders')),
    getDocs(collection(db, 'reports')),
    getDocs(collection(db, 'huxReports')),
    getDocs(collection(db, 'announcement_reports')),
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'privateChats')),
    getDocs(collection(db, 'contentManagement')),
    getDocs(collection(db, 'adPayments')),
    getDocs(collection(db, 'adminAuditLogs')),
    getDocs(collection(db, 'emergency_contacts')),
    getDocs(collection(db, 'emergency_reports')),
    getDocs(collection(db, 'safety_announcements')),
    getDocs(collection(db, 'lost_and_found_items')),
    getDocs(collection(db, 'accommodation')),
    getDocs(collection(db, 'houseAgents')),
    headersPromise.then((headers) =>
      safeFetchJson('/api/ads/admin/uploaded-files', { headers, timeoutMs: 5000 })
    )
  ]);

  const records: UnifiedContentRecord[] = [];

  // 1. Marketplace Products + Food Vendor Products + 2. Product Images
  if (productsRes.status === 'fulfilled') {
    for (const d of productsRes.value.docs) {
      const data = d.data() || {};
      const imgs = Array.isArray(data.images) ? data.images : data.imageUrl ? [data.imageUrl] : [];
      const isFood = String(data.categoryId || '').toLowerCase() === 'food';
      const createdAt = toIsoString(data.createdAt);
      const priceStr = data.price ? `₦${Number(data.price).toLocaleString()}` : '';

      records.push({
        compositeKey: `products::${d.id}`,
        sourceCollection: 'products',
        sourceId: d.id,
        filterGroup: 'products',
        sectionTag: isFood
          ? 'Food Vendor Listing'
          : data.isFeatured
          ? 'Sponsored Product'
          : 'Marketplace Product',
        title: safeStr(data.title, 'Untitled Product'),
        subtitle: priceStr ? `${priceStr} · ${safeStr(data.city, 'Wukari')}` : safeStr(data.city, 'Wukari'),
        ownerName: safeStr(data.shopName || data.sellerName, 'Seller'),
        ownerContact: safeStr(data.whatsappNumber),
        categoryLabel: safeStr(data.categoryId, 'hostel-items'),
        statusLabel: `${safeStr(data.status, 'active')}${data.moderationStatus ? ` (${data.moderationStatus})` : ''}`,
        imageUrl: imgs[0],
        createdAt,
        supportsApproval: true,
        supportsEdit: true,
        supportsSoftDelete: true,
        rawData: { ...data, id: d.id }
      });

      // Expose each individual product image for targeted CEO image removal
      imgs.forEach((imgUrl: string, idx: number) => {
        if (typeof imgUrl === 'string' && imgUrl.trim()) {
          records.push({
            compositeKey: `product_images::${d.id}::${idx}`,
            sourceCollection: 'product_images',
            sourceId: `${d.id}::${idx}`,
            filterGroup: 'products',
            sectionTag: 'Product Image',
            title: `Photo #${idx + 1} — ${safeStr(data.title, d.id)}`,
            subtitle: `Product ID: ${d.id}`,
            ownerName: safeStr(data.shopName || data.sellerName, 'Seller'),
            categoryLabel: 'Product Media',
            statusLabel: safeStr(data.status, 'active'),
            imageUrl: imgUrl,
            createdAt,
            supportsApproval: false,
            supportsEdit: false,
            supportsSoftDelete: false,
            rawData: { productId: d.id, imageIndex: idx, imageUrl: imgUrl, totalImages: imgs.length, productTitle: data.title }
          });
        }
      });
    }
  }

  // Student Services Marketplace
  if (servicesRes.status === 'fulfilled') {
    for (const d of servicesRes.value.docs) {
      const data = d.data() || {};
      const imgs = Array.isArray(data.images) ? data.images : [];
      records.push({
        compositeKey: `services::${d.id}`,
        sourceCollection: 'services',
        sourceId: d.id,
        filterGroup: 'services',
        sectionTag: data.featured ? 'Featured Service' : 'Student Service',
        title: safeStr(data.serviceName, 'Student Service'),
        subtitle: `${safeStr(data.priceDisplay, `₦${Number(data.price || 0).toLocaleString()}`)} · ${safeStr(data.location)}`,
        ownerName: safeStr(data.providerName, 'Provider'),
        ownerContact: safeStr(data.whatsapp || data.phone),
        categoryLabel: safeStr(data.category, 'Other Services'),
        statusLabel: `${safeStr(data.status, 'active')}${data.featured ? ' · featured' : ''}`,
        imageUrl: imgs[0],
        createdAt: toIsoString(data.createdAt),
        supportsApproval: true,
        supportsEdit: true,
        supportsSoftDelete: true,
        rawData: { ...data, id: d.id }
      });
    }
  }

  if (serviceCatsRes.status === 'fulfilled') {
    for (const d of serviceCatsRes.value.docs) {
      const data = d.data() || {};
      records.push({
        compositeKey: `serviceCategories::${d.id}`,
        sourceCollection: 'serviceCategories',
        sourceId: d.id,
        filterGroup: 'services',
        sectionTag: 'Service Category',
        title: safeStr(data.name, d.id),
        subtitle: safeStr(data.slug, d.id),
        ownerName: 'NIGERIA CAMPUS MARKET CEO',
        categoryLabel: 'Service Categories',
        statusLabel: data.isActive === false ? 'hidden' : 'active',
        createdAt: toIsoString(data.updatedAt || data.createdAt),
        supportsApproval: false,
        supportsEdit: true,
        supportsSoftDelete: true,
        rawData: { ...data, id: d.id }
      });
    }
  }

  // 3. Advertisements & 4. Sponsored Promotions & 16. Job Ads
  if (adsRes.status === 'fulfilled') {
    for (const d of adsRes.value.docs) {
      const ad = sanitizeAdDoc(d.id, d.data());
      if (ad.isDeleted) continue;
      const isJobAd = ad.businessCategory.toLowerCase().includes('job');
      const sectionTag = ad.isFeatured
        ? 'Sponsored Promotion'
        : isJobAd
        ? 'Job Advertisement'
        : 'Advertisement';

      records.push({
        compositeKey: `advertisements::${ad.id}`,
        sourceCollection: 'advertisements',
        sourceId: ad.id,
        filterGroup: 'advertisements',
        sectionTag,
        title: `${ad.businessName} — ${ad.title}`,
        subtitle: `${ad.packageName} (₦${ad.packagePrice.toLocaleString()}) · ${ad.location}`,
        ownerName: ad.ownerName,
        ownerContact: ad.whatsappNumber || ad.phone,
        categoryLabel: ad.businessCategory,
        statusLabel: `${ad.status} · payment:${ad.paymentStatus}`,
        imageUrl: ad.imageUrl,
        createdAt: ad.createdAt,
        supportsApproval: true,
        supportsEdit: true,
        supportsSoftDelete: true,
        rawData: ad
      });
    }
  }

  // 5. Business Listings (Seller Storefronts)
  if (sellerProfilesRes.status === 'fulfilled') {
    for (const d of sellerProfilesRes.value.docs) {
      const data = d.data() || {};
      records.push({
        compositeKey: `sellerProfiles::${d.id}`,
        sourceCollection: 'sellerProfiles',
        sourceId: d.id,
        filterGroup: 'business_listings',
        sectionTag: 'Business Listing',
        title: safeStr(data.shopName, 'Business Storefront'),
        subtitle: `${safeStr(data.city, 'Wukari')}, ${safeStr(data.state, 'Taraba')}`,
        ownerName: safeStr(data.userId, d.id),
        ownerContact: safeStr(data.whatsappNumber),
        categoryLabel: 'Campus Storefront',
        statusLabel: data.isSuspended ? 'suspended' : data.isVerified ? 'verified' : 'active',
        imageUrl: data.shopLogo || data.coverImage,
        createdAt: toIsoString(data.createdAt),
        supportsApproval: true,
        supportsEdit: true,
        supportsSoftDelete: true,
        rawData: { ...data, id: d.id }
      });
    }
  }

  // 6. Event Announcements & 7. Birthday Announcements
  if (eventsRes.status === 'fulfilled') {
    for (const d of eventsRes.value.docs) {
      const data = d.data() || {};
      const isBirthday = String(data.eventType || '').toLowerCase().includes('birthday');
      records.push({
        compositeKey: `events::${d.id}`,
        sourceCollection: 'events',
        sourceId: d.id,
        filterGroup: 'events',
        sectionTag: isBirthday ? 'Birthday Announcement' : 'Event Announcement',
        title: `${safeStr(data.celebrantName, 'Event')} (${safeStr(data.eventType, 'Event')})`,
        subtitle: `${safeStr(data.eventDate)} · ${safeStr(data.venue)}`,
        ownerName: safeStr(data.createdByEmail, CEO_EMAIL),
        categoryLabel: safeStr(data.eventType, 'Campus Event'),
        statusLabel: safeStr(data.status, 'published'),
        imageUrl: safeStr(data.photoUrl),
        createdAt: toIsoString(data.createdAt),
        supportsApproval: true,
        supportsEdit: true,
        supportsSoftDelete: true,
        rawData: { ...data, id: d.id }
      });
    }
  }

  // 8. Sports Updates
  if (sportUpdatesRes.status === 'fulfilled') {
    for (const d of sportUpdatesRes.value.docs) {
      const data = d.data() || {};
      records.push({
        compositeKey: `sport_updates::${d.id}`,
        sourceCollection: 'sport_updates',
        sourceId: d.id,
        filterGroup: 'sports',
        sectionTag: 'Sports Update',
        title: safeStr(data.title, 'Sports Update'),
        subtitle: `${safeStr(data.sportCategory, 'Sports')}${data.venue ? ` · ${data.venue}` : ''}`,
        ownerName: safeStr(data.authorName, 'Student'),
        categoryLabel: safeStr(data.sportCategory, 'Sports'),
        statusLabel: safeStr(data.status, 'published'),
        imageUrl: safeStr(data.imageUrl),
        createdAt: toIsoString(data.createdAt),
        supportsApproval: true,
        supportsEdit: true,
        supportsSoftDelete: true,
        rawData: { ...data, id: d.id }
      });
    }
  }

  // 9. News & General Announcements (and job announcements)
  if (generalAnnRes.status === 'fulfilled') {
    for (const d of generalAnnRes.value.docs) {
      const data = d.data() || {};
      const cat = safeStr(data.announcementCategory, 'General Announcement');
      const isJob = cat.toLowerCase().includes('job');
      records.push({
        compositeKey: `general_announcements::${d.id}`,
        sourceCollection: 'general_announcements',
        sourceId: d.id,
        filterGroup: 'announcements',
        sectionTag: isJob ? 'Job Advertisement' : 'General Announcement',
        title: safeStr(data.title, 'Announcement'),
        subtitle: cat,
        ownerName: safeStr(data.authorName, 'Student'),
        categoryLabel: cat,
        statusLabel: safeStr(data.status, 'published'),
        imageUrl: safeStr(data.imageUrl),
        createdAt: toIsoString(data.createdAt),
        supportsApproval: true,
        supportsEdit: true,
        supportsSoftDelete: true,
        rawData: { ...data, id: d.id }
      });
    }
  }

  // 10. Student Posts (What Students Need)
  if (studentReqsRes.status === 'fulfilled') {
    for (const d of studentReqsRes.value.docs) {
      const data = d.data() || {};
      records.push({
        compositeKey: `studentRequests::${d.id}`,
        sourceCollection: 'studentRequests',
        sourceId: d.id,
        filterGroup: 'student_posts',
        sectionTag: 'Student Post',
        title: safeStr(data.title, 'Student Request'),
        subtitle: `Budget: ₦${Number(data.budget || 0).toLocaleString()} · ${safeStr(data.location)}`,
        ownerName: safeStr(data.userName, 'Student'),
        ownerContact: safeStr(data.phone || data.whatsapp),
        categoryLabel: 'What Students Need',
        statusLabel: safeStr(data.status, 'open'),
        imageUrl: safeStr(data.imageUrl),
        createdAt: toIsoString(data.createdAt),
        supportsApproval: false,
        supportsEdit: true,
        supportsSoftDelete: true,
        rawData: { ...data, id: d.id }
      });
    }
  }

  // 11. Community Discussions (Single Hub Messages & Private Chat Threads)
  if (hubMessagesRes.status === 'fulfilled') {
    for (const d of hubMessagesRes.value.docs) {
      const data = d.data() || {};
      records.push({
        compositeKey: `hubMessages::${d.id}`,
        sourceCollection: 'hubMessages',
        sourceId: d.id,
        filterGroup: 'groups_messages',
        sectionTag: 'University Group Message',
        title: safeStr(data.text, data.imageUrl ? '[Photo message in Single Hub]' : 'Hub Message').slice(0, 120),
        subtitle: 'Single Hub Campus Chat',
        ownerName: safeStr(data.senderName, 'Student'),
        categoryLabel: 'University Groups',
        statusLabel: 'live',
        imageUrl: safeStr(data.imageUrl),
        createdAt: toIsoString(data.createdAt),
        supportsApproval: false,
        supportsEdit: false,
        supportsSoftDelete: true,
        rawData: { ...data, id: d.id }
      });
    }
  }

  if (privateChatsRes.status === 'fulfilled') {
    for (const d of privateChatsRes.value.docs) {
      const data = d.data() || {};
      records.push({
        compositeKey: `privateChats::${d.id}`,
        sourceCollection: 'privateChats',
        sourceId: d.id,
        filterGroup: 'groups_messages',
        sectionTag: 'Private Message Thread',
        title: safeStr(data.lastMessageText, `Private chat ${d.id}`).slice(0, 120),
        subtitle: `Chat ID: ${d.id}`,
        ownerName: safeStr(Object.values(data.participantNames || {}).join(' & '), 'Students'),
        categoryLabel: 'Private Messaging',
        statusLabel: 'active',
        createdAt: toIsoString(data.updatedAt || data.lastMessageTime),
        supportsApproval: false,
        supportsEdit: false,
        supportsSoftDelete: true,
        rawData: { ...data, id: d.id }
      });
    }
  }

  // 12. Comments
  if (commentsRes.status === 'fulfilled') {
    for (const d of commentsRes.value.docs) {
      const data = d.data() || {};
      records.push({
        compositeKey: `announcement_comments::${d.id}`,
        sourceCollection: 'announcement_comments',
        sourceId: d.id,
        filterGroup: 'comments',
        sectionTag: 'Comment',
        title: safeStr(data.text, 'Comment').slice(0, 140),
        subtitle: `On ${safeStr(data.postCollection)} (${safeStr(data.postId)})`,
        ownerName: safeStr(data.authorName, 'User'),
        categoryLabel: 'Comments',
        statusLabel: 'published',
        createdAt: toIsoString(data.createdAt),
        supportsApproval: false,
        supportsEdit: true,
        supportsSoftDelete: true,
        rawData: { ...data, id: d.id }
      });
    }
  }

  // 13. Uploaded Files (/uploads on server disk)
  if (uploadsRes.status === 'fulfilled' && Array.isArray(uploadsRes.value?.files)) {
    for (const f of uploadsRes.value.files as UploadedFileRecord[]) {
      records.push({
        compositeKey: `uploaded_files::${f.filename}`,
        sourceCollection: 'uploaded_files',
        sourceId: f.filename,
        filterGroup: 'other',
        sectionTag: 'Uploaded File',
        title: f.filename,
        subtitle: `${Math.round((f.sizeBytes || 0) / 1024)} KB · Server /uploads`,
        ownerName: 'Server Storage',
        categoryLabel: 'Uploaded Files',
        statusLabel: 'stored',
        imageUrl: f.url,
        createdAt: toIsoString(f.modifiedAt || f.createdAt),
        supportsApproval: false,
        supportsEdit: false,
        supportsSoftDelete: false,
        rawData: f
      });
    }
  }

  // 14. Accommodation Listings (Wukari Agent / hux & National / accommodation)
  if (huxRes.status === 'fulfilled') {
    for (const d of huxRes.value.docs) {
      const data = d.data() || {};
      const imgs = Array.isArray(data.images) ? data.images : data.imageUrl ? [data.imageUrl] : [];
      records.push({
        compositeKey: `hux::${d.id}`,
        sourceCollection: 'hux',
        sourceId: d.id,
        filterGroup: 'accommodation',
        sectionTag: 'Accommodation Listing',
        title: safeStr(data.title, 'Accommodation'),
        subtitle: `₦${Number(data.price || 0).toLocaleString()} / ${safeStr(data.pricePer, 'year')} · ${safeStr(data.location)}`,
        ownerName: safeStr(data.userName || data.agentName, 'Agent'),
        ownerContact: safeStr(data.whatsapp || data.phone),
        categoryLabel: safeStr(data.category, 'rent'),
        statusLabel: data.isAvailable === false ? 'unavailable' : 'available',
        imageUrl: imgs[0],
        createdAt: toIsoString(data.createdAt),
        supportsApproval: false,
        supportsEdit: true,
        supportsSoftDelete: true,
        rawData: { ...data, id: d.id }
      });
    }
  }

  if (accommodationRes.status === 'fulfilled') {
    for (const d of accommodationRes.value.docs) {
      const data = d.data() || {};
      const imgs = Array.isArray(data.images) ? data.images : data.imageUrl ? [data.imageUrl] : [];
      records.push({
        compositeKey: `accommodation::${d.id}`,
        sourceCollection: 'accommodation',
        sourceId: d.id,
        filterGroup: 'accommodation',
        sectionTag: 'Accommodation Listing',
        title: safeStr(data.title, 'Accommodation'),
        subtitle: `₦${Number(data.price || 0).toLocaleString()} / ${safeStr(data.pricePer, 'year')} · ${safeStr(data.location)} (${safeStr(data.institutionId, 'fuwukari')})`,
        ownerName: safeStr(data.userName || data.agentName, 'Agent'),
        ownerContact: safeStr(data.whatsapp || data.phone),
        categoryLabel: safeStr(data.type || data.category, 'rent'),
        statusLabel: data.isAvailable === false ? 'unavailable' : 'available',
        imageUrl: imgs[0],
        createdAt: toIsoString(data.createdAt),
        supportsApproval: false,
        supportsEdit: true,
        supportsSoftDelete: true,
        rawData: { ...data, id: d.id }
      });
    }
  }

  if (houseAgentsRes.status === 'fulfilled') {
    for (const d of houseAgentsRes.value.docs) {
      const data = d.data() || {};
      records.push({
        compositeKey: `houseAgents::${d.id}`,
        sourceCollection: 'houseAgents',
        sourceId: d.id,
        filterGroup: 'business_listings',
        sectionTag: 'House Agent Profile',
        title: safeStr(data.agentName || data.agencyName, 'House Agent'),
        subtitle: `${safeStr(data.areaCovered)} · ${safeStr(data.campus)} (${safeStr(data.institutionId, 'fuwukari')})`,
        ownerName: safeStr(data.agentName, 'House Agent'),
        ownerContact: safeStr(data.whatsapp || data.phone),
        categoryLabel: safeStr(data.roleType, 'house_agent'),
        statusLabel: data.status === 'suspended' ? 'suspended' : data.isVerified ? 'verified' : 'active',
        imageUrl: safeStr(data.photoUrl),
        createdAt: toIsoString(data.createdAt),
        supportsApproval: true,
        supportsEdit: true,
        supportsSoftDelete: true,
        rawData: { ...data, id: d.id }
      });
    }
  }

  // 17. Other User-Generated Content (Okada Bike Riders, Reports, Non-Admin Users)
  if (ridersRes.status === 'fulfilled') {
    for (const d of ridersRes.value.docs) {
      const data = d.data() || {};
      records.push({
        compositeKey: `bikeRiders::${d.id}`,
        sourceCollection: 'bikeRiders',
        sourceId: d.id,
        filterGroup: 'other',
        sectionTag: 'Bike Rider Directory',
        title: safeStr(data.name, 'Rider'),
        subtitle: safeStr(data.area, 'Wukari'),
        ownerName: safeStr(data.name, 'Rider'),
        ownerContact: safeStr(data.whatsappNumber || data.phoneNumber),
        categoryLabel: 'Okada Directory',
        statusLabel: data.isAvailable === false ? 'offline' : 'available',
        imageUrl: safeStr(data.photoUrl),
        createdAt: toIsoString(data.createdAt),
        supportsApproval: false,
        supportsEdit: true,
        supportsSoftDelete: true,
        rawData: { ...data, id: d.id }
      });
    }
  }

  const addReports = (res: PromiseSettledResult<any>, colName: string, label: string) => {
    if (res.status !== 'fulfilled') return;
    for (const d of res.value.docs) {
      const data = d.data() || {};
      records.push({
        compositeKey: `${colName}::${d.id}`,
        sourceCollection: colName,
        sourceId: d.id,
        filterGroup: 'other',
        sectionTag: label,
        title: `${safeStr(data.reason, 'Report')}: ${safeStr(data.postTitle || data.huxTitle || data.productTitle || d.id)}`,
        subtitle: safeStr(data.details).slice(0, 120),
        ownerName: safeStr(data.reporterName || data.reporterEmail, 'User'),
        categoryLabel: 'Moderation Reports',
        statusLabel: safeStr(data.status, 'pending'),
        createdAt: toIsoString(data.createdAt),
        supportsApproval: true,
        supportsEdit: false,
        supportsSoftDelete: true,
        rawData: { ...data, id: d.id }
      });
    }
  };
  addReports(reportsRes, 'reports', 'Product Report');
  addReports(huxReportsRes, 'huxReports', 'Housing Report');
  addReports(annReportsRes, 'announcement_reports', 'Announcement Report');
  addReports(serviceRepsRes, 'serviceReports', 'Service Report');

  // Emergency & Safety Centre collections
  if (emergencyContactsRes.status === 'fulfilled') {
    for (const d of emergencyContactsRes.value.docs) {
      const data = d.data() || {};
      records.push({
        compositeKey: `emergency_contacts::${d.id}`,
        sourceCollection: 'emergency_contacts',
        sourceId: d.id,
        filterGroup: 'emergency',
        sectionTag: 'Emergency Contact',
        title: safeStr(data.name, 'Emergency Contact'),
        subtitle: `${safeStr(data.department)} · ${safeStr(data.phone)}`,
        ownerName: 'NIGERIA CAMPUS MARKET CEO',
        ownerContact: safeStr(data.phone),
        categoryLabel: safeStr(data.department, 'emergency'),
        statusLabel: data.verified ? 'verified' : 'unverified',
        createdAt: toIsoString(data.updatedAt || data.createdAt),
        supportsApproval: true,
        supportsEdit: true,
        supportsSoftDelete: true,
        rawData: { ...data, id: d.id }
      });
    }
  }

  if (emergencyReportsRes.status === 'fulfilled') {
    for (const d of emergencyReportsRes.value.docs) {
      const data = d.data() || {};
      records.push({
        compositeKey: `emergency_reports::${d.id}`,
        sourceCollection: 'emergency_reports',
        sourceId: d.id,
        filterGroup: 'emergency',
        sectionTag: data.kind === 'security_concern' ? 'Security Concern Report' : 'Emergency Report',
        title: `${safeStr(data.reportType, 'Emergency Report')} (${safeStr(data.reportId, d.id)})`,
        subtitle: `${safeStr(data.location)} · ${safeStr(data.description).slice(0, 90)}`,
        ownerName: data.isConfidential ? 'Confidential Reporter' : safeStr(data.reporterName, 'Reporter'),
        ownerContact: safeStr(data.contactPhone),
        categoryLabel: safeStr(data.reportType, 'Emergency'),
        statusLabel: safeStr(data.status, 'Received'),
        createdAt: toIsoString(data.createdAt),
        supportsApproval: true,
        supportsEdit: true,
        supportsSoftDelete: true,
        rawData: { ...data, id: d.id }
      });
    }
  }

  if (safetyAnnouncementsRes.status === 'fulfilled') {
    for (const d of safetyAnnouncementsRes.value.docs) {
      const data = d.data() || {};
      records.push({
        compositeKey: `safety_announcements::${d.id}`,
        sourceCollection: 'safety_announcements',
        sourceId: d.id,
        filterGroup: 'emergency',
        sectionTag: 'Safety Announcement',
        title: safeStr(data.title, 'Safety Notice'),
        subtitle: safeStr(data.description).slice(0, 120),
        ownerName: safeStr(data.createdBy, CEO_EMAIL),
        categoryLabel: safeStr(data.category, 'safety_notice'),
        statusLabel: data.isActive === false ? 'archived' : safeStr(data.severity, 'info'),
        createdAt: toIsoString(data.publishedAt || data.updatedAt),
        supportsApproval: true,
        supportsEdit: true,
        supportsSoftDelete: true,
        rawData: { ...data, id: d.id }
      });
    }
  }

  if (lostFoundRes.status === 'fulfilled') {
    for (const d of lostFoundRes.value.docs) {
      const data = d.data() || {};
      records.push({
        compositeKey: `lost_and_found_items::${d.id}`,
        sourceCollection: 'lost_and_found_items',
        sourceId: d.id,
        filterGroup: 'emergency',
        sectionTag: data.reportType === 'found' ? 'Found Item' : 'Lost Item',
        title: safeStr(data.title, 'Lost & Found Item'),
        subtitle: `${safeStr(data.location)} · ${safeStr(data.itemCategory)}`,
        ownerName: safeStr(data.reporterLabel, 'Reporter'),
        ownerContact: safeStr(data.publicRecoveryContact),
        categoryLabel: 'Lost and Found',
        statusLabel: data.isHiddenByAdmin ? 'hidden' : safeStr(data.status, 'open'),
        imageUrl: safeStr(data.imageUrl),
        createdAt: toIsoString(data.createdAt),
        supportsApproval: true,
        supportsEdit: true,
        supportsSoftDelete: true,
        rawData: { ...data, id: d.id }
      });
    }
  }

  // Users (PROTECTED RULE: Exclude Admin / CEO accounts completely from deletable list!)
  let adminsProtected = 1;
  if (usersRes.status === 'fulfilled') {
    for (const d of usersRes.value.docs) {
      const data = d.data() || {};
      const emailLower = String(data.email || '').toLowerCase().trim();
      if (data.role === 'admin' || emailLower === CEO_EMAIL) {
        adminsProtected++;
        continue;
      }
      records.push({
        compositeKey: `users::${d.id}`,
        sourceCollection: 'users',
        sourceId: d.id,
        filterGroup: 'other',
        sectionTag: 'User Account',
        title: `${safeStr(data.name, 'User')} (${safeStr(data.email, d.id)})`,
        subtitle: `Role: ${safeStr(data.role, 'buyer')} · ${safeStr(data.city, 'Wukari')}`,
        ownerName: safeStr(data.name, 'User'),
        ownerContact: safeStr(data.whatsappNumber || data.phone),
        categoryLabel: 'Registered Users',
        statusLabel: data.isSuspended ? 'suspended' : 'active',
        imageUrl: safeStr(data.avatarUrl),
        createdAt: toIsoString(data.createdAt),
        supportsApproval: false,
        supportsEdit: false,
        supportsSoftDelete: true,
        rawData: { ...data, id: d.id }
      });
    }
  }

  records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return {
    records,
    archivedCount: archiveRes.status === 'fulfilled' ? archiveRes.value.docs.length : 0,
    protectedStats: {
      paymentsCount: paymentsRes.status === 'fulfilled' ? paymentsRes.value.docs.length : 0,
      auditLogsCount: auditRes.status === 'fulfilled' ? auditRes.value.docs.length : 0,
      adminsProtected
    }
  };
}

// Soft-delete (default when supported) or permanent delete of a single UnifiedContentRecord
export async function deleteUnifiedContentRecord(
  record: UnifiedContentRecord,
  options: { softDelete?: boolean; reason?: string } = { softDelete: true }
): Promise<void> {
  assertCeo();

  // Safety guard: never allow deleting protected collections or admin account
  if ((PROTECTED_COLLECTIONS as readonly string[]).includes(record.sourceCollection)) {
    throw new Error('This protected system record cannot be deleted from bulk or global content controls.');
  }
  if (
    record.sourceCollection === 'users' &&
    (record.rawData?.role === 'admin' ||
      String(record.rawData?.email || '').toLowerCase().trim() === CEO_EMAIL)
  ) {
    throw new Error('Administrator/CEO accounts are protected from deletion.');
  }

  const nowIso = new Date().toISOString();
  const useSoft = options.softDelete !== false && record.supportsSoftDelete;

  // Special case 1: Individual Product Image removal
  if (record.sourceCollection === 'product_images') {
    const productId = String(record.rawData.productId);
    const imageUrlToRemove = String(record.rawData.imageUrl);
    const prodSnap = await getDoc(doc(db, 'products', productId));
    if (prodSnap.exists()) {
      const pData = prodSnap.data() || {};
      const currImages = Array.isArray(pData.images) ? pData.images : [];
      const nextImages = currImages.filter((url: string) => url !== imageUrlToRemove);
      if (nextImages.length === 0) {
        // Cannot leave images empty due to Firestore isValidProduct rule -> keep placeholder OR notify
        await updateDoc(doc(db, 'products', productId), {
          images: ['https://fuwukari-placeholder/removed-by-admin'],
          imageUrl: '',
          updatedAt: nowIso
        });
      } else {
        await updateDoc(doc(db, 'products', productId), {
          images: nextImages,
          imageUrl: nextImages[0],
          updatedAt: nowIso
        });
      }
      invalidateProductsCache();
    }
    await recordAdminAuditLog({
      action: 'delete',
      contentType: 'product_images',
      recordId: record.sourceId,
      recordTitle: record.title,
      reason: options.reason
    });
    return;
  }

  // Special case 2: Server disk Uploaded File
  if (record.sourceCollection === 'uploaded_files') {
    const headers = await getAdminHeaders();
    await safeFetchJson(
      `/api/ads/admin/uploaded-files/${encodeURIComponent(record.sourceId)}`,
      {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ reason: options.reason }),
        timeoutMs: 6000
      }
    );
    await recordAdminAuditLog({
      action: 'delete',
      contentType: 'uploaded_files',
      recordId: record.sourceId,
      recordTitle: record.title,
      reason: options.reason
    });
    return;
  }

  // Special case 3: Soft-delete into contentManagement archive before removing from active collection
  if (useSoft) {
    const archiveId = makeId('arc');
    await setDoc(
      doc(db, 'contentManagement', archiveId),
      stripUndefined({
        id: archiveId,
        sourceCollection: record.sourceCollection,
        sourceId: record.sourceId,
        contentType: record.sectionTag,
        title: record.title.slice(0, 200),
        ownerName: record.ownerName.slice(0, 120),
        categoryLabel: record.categoryLabel.slice(0, 80),
        statusLabel: record.statusLabel.slice(0, 80),
        deletedByEmail: auth.currentUser?.email || CEO_EMAIL,
        ...(options.reason ? { deletionReason: options.reason.slice(0, 400) } : {}),
        originalCreatedAt: record.createdAt,
        deletedAt: nowIso,
        payload: record.rawData
      })
    );
  }

  if (record.sourceCollection === 'advertisements' && useSoft) {
    await updateDoc(doc(db, 'advertisements', record.sourceId), {
      isDeleted: true,
      status: 'paused',
      deletedAt: nowIso,
      deletedBy: auth.currentUser?.email || CEO_EMAIL,
      updatedAt: serverTimestamp()
    });
  } else {
    await deleteDoc(doc(db, record.sourceCollection, record.sourceId));
    if (record.sourceCollection === 'products') {
      invalidateProductsCache();
    }
  }

  await recordAdminAuditLog({
    action: useSoft ? 'soft_delete' : 'delete',
    contentType: record.sourceCollection,
    recordId: record.sourceId,
    recordTitle: record.title,
    reason: options.reason
  });
}

export async function bulkDeleteUnifiedContentRecords(
  records: UnifiedContentRecord[],
  options: { softDelete?: boolean; reason?: string } = { softDelete: true }
): Promise<{ deleted: number; failed: number }> {
  assertCeo();
  let deleted = 0;
  let failed = 0;

  for (const rec of records) {
    try {
      await deleteUnifiedContentRecord(rec, options);
      deleted++;
    } catch (err) {
      console.warn('[Bulk delete skipped record]:', rec.compositeKey, err);
      failed++;
    }
  }

  await recordAdminAuditLog({
    action: 'bulk_delete',
    contentType: 'mixed_content',
    recordId: `${deleted}_items`,
    recordTitle: `Bulk deleted ${deleted} record(s)`,
    reason: options.reason
  });

  return { deleted, failed };
}

export async function editUnifiedContentRecord(
  record: UnifiedContentRecord,
  updates: {
    title?: string;
    description?: string;
    status?: string;
    price?: number;
    location?: string;
  }
): Promise<void> {
  assertCeo();
  const col = record.sourceCollection;
  const id = record.sourceId;
  const nowIso = new Date().toISOString();

  if (col === 'products') {
    await updateDoc(
      doc(db, 'products', id),
      stripUndefined({
        ...(updates.title !== undefined ? { title: updates.title.trim() } : {}),
        ...(updates.description !== undefined ? { description: updates.description.trim() } : {}),
        ...(updates.price !== undefined && !isNaN(updates.price) ? { price: Number(updates.price) } : {}),
        ...(updates.status !== undefined ? { status: updates.status } : {}),
        updatedAt: nowIso
      })
    );
    invalidateProductsCache();
  } else if (col === 'advertisements') {
    await updateDoc(
      doc(db, 'advertisements', id),
      stripUndefined({
        ...(updates.title !== undefined ? { title: updates.title.trim() } : {}),
        ...(updates.description !== undefined ? { description: updates.description.trim() } : {}),
        ...(updates.location !== undefined ? { location: updates.location.trim() } : {}),
        updatedAt: serverTimestamp()
      })
    );
  } else if (col === 'events') {
    await updateDoc(
      doc(db, 'events', id),
      stripUndefined({
        ...(updates.title !== undefined ? { celebrantName: updates.title.trim() } : {}),
        ...(updates.description !== undefined ? { description: updates.description.trim() } : {}),
        ...(updates.location !== undefined ? { venue: updates.location.trim() } : {}),
        ...(updates.status !== undefined ? { status: updates.status } : {}),
        updatedAt: nowIso
      })
    );
  } else if (col === 'sport_updates' || col === 'general_announcements') {
    await updateDoc(
      doc(db, col, id),
      stripUndefined({
        ...(updates.title !== undefined ? { title: updates.title.trim() } : {}),
        ...(updates.description !== undefined ? { description: updates.description.trim() } : {}),
        ...(updates.status !== undefined ? { status: updates.status } : {}),
        updatedAt: serverTimestamp()
      })
    );
  } else if (col === 'studentRequests') {
    await updateDoc(
      doc(db, 'studentRequests', id),
      stripUndefined({
        ...(updates.title !== undefined ? { title: updates.title.trim() } : {}),
        ...(updates.description !== undefined ? { description: updates.description.trim() } : {}),
        ...(updates.price !== undefined && !isNaN(updates.price) ? { budget: Number(updates.price) } : {}),
        ...(updates.location !== undefined ? { location: updates.location.trim() } : {}),
        ...(updates.status !== undefined ? { status: updates.status } : {}),
        updatedAt: nowIso
      })
    );
  } else if (col === 'announcement_comments') {
    await updateDoc(
      doc(db, 'announcement_comments', id),
      stripUndefined({
        ...(updates.description !== undefined ? { text: updates.description.trim() } : {}),
        updatedAt: serverTimestamp()
      })
    );
  } else if (col === 'hux' || col === 'accommodation') {
    await updateDoc(
      doc(db, col, id),
      stripUndefined({
        ...(updates.title !== undefined ? { title: updates.title.trim() } : {}),
        ...(updates.description !== undefined ? { description: updates.description.trim() } : {}),
        ...(updates.price !== undefined && !isNaN(updates.price) ? { price: Number(updates.price) } : {}),
        ...(updates.location !== undefined ? { location: updates.location.trim() } : {}),
        updatedAt: nowIso
      })
    );
  } else if (col === 'houseAgents') {
    await updateDoc(
      doc(db, 'houseAgents', id),
      stripUndefined({
        ...(updates.title !== undefined ? { agentName: updates.title.trim() } : {}),
        ...(updates.description !== undefined ? { bio: updates.description.trim() } : {}),
        ...(updates.location !== undefined ? { areaCovered: updates.location.trim() } : {}),
        ...(updates.status !== undefined ? { status: updates.status } : {}),
        updatedAt: nowIso
      })
    );
  } else if (col === 'sellerProfiles') {
    await updateDoc(
      doc(db, 'sellerProfiles', id),
      stripUndefined({
        ...(updates.title !== undefined ? { shopName: updates.title.trim() } : {}),
        ...(updates.description !== undefined ? { description: updates.description.trim() } : {})
      })
    );
  } else if (col === 'bikeRiders') {
    await updateDoc(
      doc(db, 'bikeRiders', id),
      stripUndefined({
        ...(updates.title !== undefined ? { name: updates.title.trim() } : {}),
        ...(updates.location !== undefined ? { area: updates.location.trim() } : {})
      })
    );
  } else if (col === 'services') {
    await updateDoc(
      doc(db, 'services', id),
      stripUndefined({
        ...(updates.title !== undefined ? { serviceName: updates.title.trim() } : {}),
        ...(updates.description !== undefined ? { description: updates.description.trim() } : {}),
        ...(updates.price !== undefined && !isNaN(updates.price)
          ? { price: Number(updates.price), priceDisplay: `₦${Number(updates.price).toLocaleString()}` }
          : {}),
        ...(updates.location !== undefined ? { location: updates.location.trim() } : {}),
        ...(updates.status !== undefined ? { status: updates.status } : {}),
        updatedAt: serverTimestamp()
      })
    );
  } else if (col === 'serviceCategories') {
    await updateDoc(
      doc(db, 'serviceCategories', id),
      stripUndefined({
        ...(updates.title !== undefined ? { name: updates.title.trim() } : {}),
        ...(updates.description !== undefined ? { description: updates.description.trim() } : {}),
        updatedAt: nowIso
      })
    );
  } else if (col === 'emergency_contacts') {
    await updateDoc(
      doc(db, 'emergency_contacts', id),
      stripUndefined({
        ...(updates.title !== undefined ? { name: updates.title.trim() } : {}),
        ...(updates.description !== undefined ? { description: updates.description.trim() } : {}),
        updatedAt: serverTimestamp()
      })
    );
  } else if (col === 'safety_announcements') {
    await updateDoc(
      doc(db, 'safety_announcements', id),
      stripUndefined({
        ...(updates.title !== undefined ? { title: updates.title.trim() } : {}),
        ...(updates.description !== undefined ? { description: updates.description.trim() } : {}),
        updatedAt: serverTimestamp()
      })
    );
  } else if (col === 'lost_and_found_items') {
    await updateDoc(
      doc(db, 'lost_and_found_items', id),
      stripUndefined({
        ...(updates.title !== undefined ? { title: updates.title.trim() } : {}),
        ...(updates.description !== undefined ? { description: updates.description.trim() } : {}),
        ...(updates.location !== undefined ? { location: updates.location.trim() } : {}),
        updatedAt: serverTimestamp()
      })
    );
  } else if (col === 'emergency_reports') {
    await updateDoc(
      doc(db, 'emergency_reports', id),
      stripUndefined({
        ...(updates.description !== undefined ? { description: updates.description.trim() } : {}),
        ...(updates.location !== undefined ? { location: updates.location.trim() } : {}),
        updatedAt: serverTimestamp()
      })
    );
  }

  await recordAdminAuditLog({
    action: 'edit',
    contentType: col,
    recordId: id,
    recordTitle: updates.title || record.title
  });
}

export async function approveOrRejectUnifiedRecord(
  record: UnifiedContentRecord,
  decision: 'approve' | 'reject'
): Promise<void> {
  assertCeo();
  const col = record.sourceCollection;
  const id = record.sourceId;

  if (col === 'products') {
    await updateDoc(doc(db, 'products', id), {
      moderationStatus: decision === 'approve' ? 'approved' : 'rejected',
      status: decision === 'approve' ? 'active' : 'unavailable',
      updatedAt: new Date().toISOString()
    });
    invalidateProductsCache();
  } else if (col === 'sport_updates' || col === 'general_announcements') {
    await updateDoc(doc(db, col, id), {
      status: decision === 'approve' ? 'published' : 'rejected',
      updatedAt: serverTimestamp()
    });
  } else if (col === 'events') {
    await updateDoc(doc(db, 'events', id), {
      status: decision === 'approve' ? 'published' : 'draft',
      updatedAt: new Date().toISOString()
    });
  } else if (col === 'sellerProfiles') {
    await updateDoc(doc(db, 'sellerProfiles', id), {
      isVerified: decision === 'approve',
      isSuspended: decision === 'reject'
    });
  } else if (col === 'houseAgents') {
    await updateDoc(doc(db, 'houseAgents', id), {
      isVerified: decision === 'approve',
      ceoVerified: decision === 'approve',
      status: decision === 'reject' ? 'suspended' : 'active',
      updatedAt: new Date().toISOString()
    });
  } else if (col === 'reports' || col === 'huxReports' || col === 'announcement_reports' || col === 'serviceReports') {
    await updateDoc(doc(db, col, id), {
      status: decision === 'approve' ? 'resolved' : 'dismissed'
    });
  } else if (col === 'services') {
    await updateDoc(doc(db, 'services', id), {
      status: decision === 'approve' ? 'active' : 'rejected',
      updatedAt: serverTimestamp()
    });
  } else if (col === 'emergency_contacts') {
    await updateDoc(doc(db, 'emergency_contacts', id), {
      verified: decision === 'approve',
      updatedAt: serverTimestamp()
    });
  } else if (col === 'safety_announcements') {
    await updateDoc(doc(db, 'safety_announcements', id), {
      isActive: decision === 'approve',
      updatedAt: serverTimestamp()
    });
  } else if (col === 'lost_and_found_items') {
    await updateDoc(doc(db, 'lost_and_found_items', id), {
      isHiddenByAdmin: decision === 'reject',
      updatedAt: serverTimestamp()
    });
  } else if (col === 'emergency_reports') {
    await updateDoc(doc(db, 'emergency_reports', id), {
      status: decision === 'approve' ? 'Resolved' : 'Closed',
      updatedAt: serverTimestamp()
    });
  }

  await recordAdminAuditLog({
    action: decision,
    contentType: col,
    recordId: id,
    recordTitle: record.title
  });
}

export async function fetchArchivedContent(): Promise<ContentArchiveRecord[]> {
  assertCeo();
  const snap = await getDocs(collection(db, 'contentManagement'));
  return snap.docs
    .map((d) => {
      const data = d.data() || {};
      return {
        id: d.id,
        sourceCollection: safeStr(data.sourceCollection),
        sourceId: safeStr(data.sourceId),
        contentType: safeStr(data.contentType),
        title: safeStr(data.title),
        ownerName: safeStr(data.ownerName),
        categoryLabel: safeStr(data.categoryLabel),
        statusLabel: safeStr(data.statusLabel),
        deletedByEmail: safeStr(data.deletedByEmail, CEO_EMAIL),
        deletionReason: data.deletionReason ? String(data.deletionReason) : undefined,
        originalCreatedAt: toIsoString(data.originalCreatedAt),
        deletedAt: toIsoString(data.deletedAt),
        payload: (data.payload as Record<string, any>) || {}
      };
    })
    .sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
}

export async function restoreArchivedContent(archive: ContentArchiveRecord): Promise<void> {
  assertCeo();
  if (!archive.sourceCollection || !archive.sourceId || !archive.payload) {
    throw new Error('Archive snapshot is incomplete and cannot be restored.');
  }

  if (archive.sourceCollection === 'advertisements') {
    await updateDoc(doc(db, 'advertisements', archive.sourceId), {
      isDeleted: false,
      deletedAt: null,
      updatedAt: serverTimestamp()
    });
  } else {
    const restoredPayload: Record<string, any> = stripUndefined({ ...archive.payload, id: archive.sourceId });
    if (
      archive.sourceCollection === 'sport_updates' ||
      archive.sourceCollection === 'general_announcements' ||
      archive.sourceCollection === 'announcement_comments' ||
      archive.sourceCollection === 'services'
    ) {
      restoredPayload.createdAt = serverTimestamp();
      restoredPayload.updatedAt = serverTimestamp();
    }
    await setDoc(doc(db, archive.sourceCollection, archive.sourceId), restoredPayload);
    if (archive.sourceCollection === 'products') {
      invalidateProductsCache();
    }
  }

  await deleteDoc(doc(db, 'contentManagement', archive.id));

  await recordAdminAuditLog({
    action: 'restore',
    contentType: archive.sourceCollection,
    recordId: archive.sourceId,
    recordTitle: archive.title
  });
}

export async function fetchImmutableAuditLogs(): Promise<AdminAuditLogRecord[]> {
  assertCeo();
  const merged = new Map<string, AdminAuditLogRecord>();

  try {
    const snap = await getDocs(collection(db, 'adminAuditLogs'));
    for (const d of snap.docs) {
      const data = d.data() || {};
      merged.set(d.id, {
        id: d.id,
        action: data.action || 'delete',
        contentType: safeStr(data.contentType),
        recordId: safeStr(data.recordId),
        recordTitle: data.recordTitle ? String(data.recordTitle) : undefined,
        adminEmail: safeStr(data.adminEmail, CEO_EMAIL),
        reason: data.reason ? String(data.reason) : undefined,
        createdAt: toIsoString(data.createdAt)
      });
    }
  } catch {
    // fallback
  }

  try {
    const headers = await getAdminHeaders();
    const serverRes = await safeFetchJson('/api/ads/admin/audit-logs', {
      headers,
      timeoutMs: 4500
    });
    if (Array.isArray(serverRes?.logs)) {
      for (const l of serverRes.logs as AdminAuditLogRecord[]) {
        if (!merged.has(l.id)) merged.set(l.id, l);
      }
    }
  } catch {
    // ignore
  }

  return Array.from(merged.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
