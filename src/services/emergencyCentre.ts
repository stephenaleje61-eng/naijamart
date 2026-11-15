import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import { auth, db, ensureGuestAuth, stripUndefined, toIsoString } from './firebase.js';
import { CEO_EMAIL, isFirebaseCeoVerified } from './events.js';
import { recordAdminAuditLog } from './ads.js';
import {
  EmergencyAuditLog,
  EmergencyContact,
  EmergencyDepartment,
  EmergencyReport,
  EmergencyReportKind,
  EmergencyReportStatus,
  EmergencyReportTrackingStatus,
  LostFoundItem,
  LostFoundItemCategory,
  LostFoundPrivateRecord,
  LostFoundReportType,
  LostFoundStatus,
  SafetyAnnouncement,
  SafetyAnnouncementCategory,
  SafetyAnnouncementSeverity
} from '../types.js';

export const EMERGENCY_DEPARTMENT_OPTIONS: {
  id: EmergencyDepartment;
  label: string;
  shortLabel: string;
}[] = [
  { id: 'security', label: 'University Security Contacts', shortLabel: 'Campus Security' },
  { id: 'student_affairs', label: 'Student Affairs Contact', shortLabel: 'Student Affairs' },
  { id: 'health_centre', label: 'University Health Centre Contact', shortLabel: 'Health Centre' },
  { id: 'fire_rescue', label: 'Fire and Rescue Contacts', shortLabel: 'Fire & Rescue' },
  { id: 'police', label: 'Police Emergency Contacts', shortLabel: 'Police Emergency' },
  { id: 'local_emergency', label: 'Relevant Local Emergency Services', shortLabel: 'Local Emergency' }
];

export const EMERGENCY_CATEGORIES = [
  'Security threat',
  'Medical emergency',
  'Fire incident',
  'Accident',
  'Theft',
  'Harassment',
  'Missing person',
  'Other emergency'
] as const;

export const SECURITY_CONCERN_CATEGORIES = [
  'Suspicious activities',
  'Theft reports',
  'Unsafe locations',
  'Damaged security infrastructure',
  'Suspicious messages or scams',
  'Other safety concerns'
] as const;

export const EMERGENCY_REPORT_STATUSES: EmergencyReportStatus[] = [
  'Received',
  'Under Review',
  'Assigned',
  'Resolved',
  'Closed'
];

export const SAFETY_ANNOUNCEMENT_CATEGORIES: {
  id: SafetyAnnouncementCategory;
  label: string;
}[] = [
  { id: 'safety_notice', label: 'Important Campus Safety Notice' },
  { id: 'fire_safety', label: 'Fire Safety Information' },
  { id: 'security_warning', label: 'Verified Security Warning' },
  { id: 'service_update', label: 'Emergency Service Update' }
];

export const LOST_FOUND_CATEGORIES: {
  id: LostFoundItemCategory;
  label: string;
}[] = [
  { id: 'phone', label: 'Lost / Found Phones' },
  { id: 'student_id', label: 'Student ID Cards' },
  { id: 'wallet', label: 'Wallets & Purses' },
  { id: 'bag', label: 'Bags & Backpacks' },
  { id: 'keys', label: 'Keys & Access Tags' },
  { id: 'other', label: 'Other Personal Belongings' }
];

export const FUWUKARI_EMERGENCY_LOCATIONS = [
  'Main Campus (FUWUKARI)',
  'Main Gate',
  'Lecture Theatres (LT / Behind LT)',
  'New Site',
  'Male Hostel',
  'Female Hostel',
  'University Health Centre / Clinic Area',
  'Library / Senate Building',
  'Puje',
  'Bye Pass',
  'Wukari Town'
] as const;

export interface CampusSafetyTopic {
  id: string;
  title: string;
  summary: string;
  points: string[];
}

export const CAMPUS_SAFETY_TOPICS: CampusSafetyTopic[] = [
  {
    id: 'personal-safety',
    title: 'Personal Safety Tips',
    summary: 'Everyday habits that keep you safer across FUWUKARI Main Campus, New Site, and off-campus lodges.',
    points: [
      'Share your destination and expected return time with a trusted roommate or course mate when going out.',
      'Stay alert in crowded shuttle parks, lecture halls, and market areas; avoid wearing both earphones near roads.',
      'Keep emergency contacts saved offline in your phone speed-dial rather than relying solely on mobile data.'
    ]
  },
  {
    id: 'night-safety',
    title: 'Night-Time Movement Safety',
    summary: 'Extra precautions when reading late on campus or returning to hostels, Puje, or Bye Pass after dark.',
    points: [
      'Walk in groups of two or more after dark and stick to well-lit, populated campus walkways.',
      'Use verified campus shuttle drivers or known Okada riders from the FU MARKET directory rather than unmarked rides.',
      'Keep a small charged torch or power bank with you during power outages.'
    ]
  },
  {
    id: 'emergency-preparedness',
    title: 'Emergency Preparedness',
    summary: 'Know how to act calmly in medical, fire, or sudden security situations.',
    points: [
      'Locate fire exits, muster points, and security posts near your hostel, faculty building, and Lecture Theatres.',
      'Keep key medical allergy or blood-group details accessible in case friends need to assist you to the Health Centre.',
      'Note landmarks around your lodge so you can give exact directions clearly on an emergency phone call.'
    ]
  },
  {
    id: 'online-scams',
    title: 'Online Scam Prevention',
    summary: 'Protect your money and personal accounts when buying or chatting online.',
    points: [
      'Never transfer advance reservation fees, delivery fees, or agent "unlock charges" before physically inspecting items or lodges.',
      'Inspect goods in open daytime campus locations (Main Gate, LT courtyard, or Security Post surroundings).',
      'Never share OTP codes, BVN, NIN, or banking PINs with anyone claiming to be support staff or prize agents.'
    ]
  },
  {
    id: 'phone-theft',
    title: 'Phone Theft Prevention',
    summary: 'Reduce the risk of snatching or device loss around busy areas and transport stops.',
    points: [
      'Enable screen lock, Find My Device / Find My iPhone, and SIM PIN protection.',
      'Avoid holding your phone visibly while standing right beside slow-moving traffic or poorly lit junctions.',
      'Record your IMEI (*#06#) safely offline so you can report and block a stolen device immediately.'
    ]
  },
  {
    id: 'report-suspicious',
    title: 'How to Report Suspicious Activities',
    summary: 'Steps to alert campus security or submit a confidential concern safely.',
    points: [
      'Move to a safe, well-lit location first before making a phone call or writing down observations.',
      'Note exact location, time, clothing description, or vehicle plate details—never confront dangerous individuals directly.',
      'Use direct verified emergency numbers for active danger; use the confidential Security Concern form for non-urgent risks.'
    ]
  },
  {
    id: 'emergency-procedures',
    title: 'Important Emergency Procedures',
    summary: 'Immediate actions during fire outbreaks, medical crises, or security threats.',
    points: [
      'Medical emergency: Keep airways clear, do not move someone with suspected neck/back trauma unnecessarily, and call the Health Centre directly.',
      'Fire incident: Sound nearby alarms, switch off electrical mains if safe, stay low under smoke, evacuate immediately, and call Fire & Rescue.',
      'Remember: Submitting an online form logs a help centre record and reference number—always call verified phone numbers directly when urgent.'
    ]
  }
];

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write'
}

function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email
        })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 128);
}

function generateReferenceNumber(kind: EmergencyReportKind): string {
  const prefix = kind === 'emergency' ? 'FUM-EMG' : 'FUM-SEC';
  const rand = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  const stamp = String(Date.now()).slice(-6);
  return `${prefix}-${stamp}${rand}`.replace(/[^a-zA-Z0-9_-]/g, '-');
}

function generateVerificationPin(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}

export async function computeTrackingLookupHash(
  reportId: string,
  verificationPin: string
): Promise<string> {
  const normalized = `${reportId.trim().toUpperCase()}::${verificationPin
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')}`;
  const data = new TextEncoder().encode(normalized);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuf = await crypto.subtle.digest('SHA-256', data);
    const bytes = Array.from(new Uint8Array(hashBuf));
    return bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Deterministic fallback hash if SubtleCrypto is unavailable in non-secure context
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < data.length; i++) {
    h1 ^= data[i];
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= data[i] + i;
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return `trk_${(h1 >>> 0).toString(16).padStart(8, '0')}_${(h2 >>> 0)
    .toString(16)
    .padStart(8, '0')}_${normalized.length.toString(16).padStart(12, '0')}`;
}

export function buildEmergencyCallHref(phone: string): string {
  const cleaned = String(phone || '').replace(/[^\d+]/g, '');
  return cleaned ? `tel:${cleaned}` : '#';
}

export function redactSensitiveIdentifiers(input: string): {
  sanitized: string;
  hadRedactions: boolean;
} {
  let hadRedactions = false;
  let output = String(input || '');

  // Redact FUWUKARI-style matric numbers (e.g. FUW/SCI/22/0123 or similar slash-digit patterns)
  output = output.replace(/\b[A-Z]{2,5}\/[A-Z]{2,6}\/\d{2,4}\/\d{2,6}\b/gi, () => {
    hadRedactions = true;
    return '[ID REDACTED]';
  });

  // Redact long numeric sequences >= 8 digits (NIN, BVN, Card PANs, serial numbers)
  output = output.replace(/\b(?:\d[\s-]?){8,19}\b/g, () => {
    hadRedactions = true;
    return '[NUMBER REDACTED]';
  });

  return { sanitized: output, hadRedactions };
}

function assertAdmin(): void {
  if (!isFirebaseCeoVerified()) {
    throw new Error(
      `Administrator access denied: Sign in with the authorized FU MARKET CEO Google account (${CEO_EMAIL}).`
    );
  }
}

export async function recordEmergencyAuditLog(entry: {
  action: string;
  targetType: string;
  targetId: string;
  summary: string;
}): Promise<void> {
  if (!isFirebaseCeoVerified()) return;
  const id = makeId('emglog');
  const adminEmail = auth.currentUser?.email || CEO_EMAIL;
  try {
    await setDoc(doc(db, 'emergency_audit_logs', id), {
      id,
      action: entry.action.slice(0, 80),
      targetType: entry.targetType.slice(0, 80),
      targetId: entry.targetId.slice(0, 128),
      summary: entry.summary.slice(0, 600),
      adminEmail,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.warn('[Emergency audit log write warning]:', err);
  }

  // Also cross-log into master adminAuditLogs silently
  recordAdminAuditLog({
    action: 'edit',
    contentType: `emergency_${entry.targetType}`,
    recordId: entry.targetId,
    recordTitle: entry.summary.slice(0, 160),
    reason: entry.action
  }).catch(() => {});
}

// ============================================================================
// REAL-TIME PUBLIC & ADMIN SUBSCRIPTIONS
// ============================================================================

function parseContact(id: string, raw: Record<string, any>): EmergencyContact {
  return {
    id,
    name: String(raw.name || 'Emergency Contact'),
    department: (raw.department || 'local_emergency') as EmergencyDepartment,
    phone: String(raw.phone || ''),
    description: String(raw.description || ''),
    verified: Boolean(raw.verified),
    operatingHours: String(raw.operatingHours || '24/7'),
    createdAt: toIsoString(raw.createdAt),
    updatedAt: toIsoString(raw.updatedAt)
  };
}

export function subscribeToEmergencyContacts(
  onUpdate: (contacts: EmergencyContact[]) => void,
  onError?: (err: Error) => void
): () => void {
  return onSnapshot(
    collection(db, 'emergency_contacts'),
    (snap) => {
      const list = snap.docs
        .map((d) => parseContact(d.id, d.data() || {}))
        .sort((a, b) => {
          if (a.verified !== b.verified) return a.verified ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
      onUpdate(list);
    },
    (err) => {
      console.warn('[Emergency contacts subscription warning]:', err?.message);
      onError?.(err as Error);
    }
  );
}

function parseAnnouncement(id: string, raw: Record<string, any>): SafetyAnnouncement {
  return {
    id,
    title: String(raw.title || 'Safety Notice'),
    description: String(raw.description || ''),
    category: (raw.category || 'safety_notice') as SafetyAnnouncementCategory,
    severity: (raw.severity || 'info') as SafetyAnnouncementSeverity,
    publishedAt: toIsoString(raw.publishedAt),
    createdBy: String(raw.createdBy || CEO_EMAIL),
    isActive: raw.isActive !== false,
    isPinned: Boolean(raw.isPinned),
    updatedAt: toIsoString(raw.updatedAt)
  };
}

export function subscribeToSafetyAnnouncements(
  onUpdate: (list: SafetyAnnouncement[]) => void,
  onError?: (err: Error) => void,
  includeInactiveForAdmin = false
): () => void {
  const ref = includeInactiveForAdmin
    ? collection(db, 'safety_announcements')
    : query(collection(db, 'safety_announcements'), where('isActive', '==', true));

  return onSnapshot(
    ref,
    (snap) => {
      const list = snap.docs
        .map((d) => parseAnnouncement(d.id, d.data() || {}))
        .sort((a, b) => {
          if (Boolean(a.isPinned) !== Boolean(b.isPinned)) return a.isPinned ? -1 : 1;
          const rank: Record<SafetyAnnouncementSeverity, number> = {
            urgent: 0,
            important: 1,
            info: 2
          };
          if (rank[a.severity] !== rank[b.severity]) return rank[a.severity] - rank[b.severity];
          return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
        });
      onUpdate(list);
    },
    (err) => {
      console.warn('[Safety announcements subscription warning]:', err?.message);
      onError?.(err as Error);
    }
  );
}

function parseLostFoundItem(id: string, raw: Record<string, any>): LostFoundItem {
  return {
    id,
    reportType: raw.reportType === 'found' ? 'found' : 'lost',
    itemCategory: (raw.itemCategory || 'other') as LostFoundItemCategory,
    title: String(raw.title || 'Reported Item'),
    description: String(raw.description || ''),
    location: String(raw.location || 'Campus'),
    incidentDate: String(raw.incidentDate || ''),
    recoveryInstructions: String(raw.recoveryInstructions || ''),
    publicRecoveryContact: raw.publicRecoveryContact
      ? String(raw.publicRecoveryContact)
      : undefined,
    imageUrl: raw.imageUrl ? String(raw.imageUrl) : undefined,
    reporterUid: raw.reporterUid ? String(raw.reporterUid) : undefined,
    reporterLabel: raw.reporterLabel ? String(raw.reporterLabel) : undefined,
    status: (raw.status || 'open') as LostFoundStatus,
    isHiddenByAdmin: Boolean(raw.isHiddenByAdmin),
    createdAt: toIsoString(raw.createdAt),
    updatedAt: toIsoString(raw.updatedAt)
  };
}

export function subscribeToLostFoundItems(
  onUpdate: (items: LostFoundItem[]) => void,
  onError?: (err: Error) => void,
  includeHiddenForAdmin = false
): () => void {
  const ref = includeHiddenForAdmin
    ? collection(db, 'lost_and_found_items')
    : query(collection(db, 'lost_and_found_items'), where('isHiddenByAdmin', '==', false));

  return onSnapshot(
    ref,
    (snap) => {
      const list = snap.docs
        .map((d) => parseLostFoundItem(d.id, d.data() || {}))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(list);
    },
    (err) => {
      console.warn('[Lost & Found subscription warning]:', err?.message);
      onError?.(err as Error);
    }
  );
}

function parseEmergencyReport(id: string, raw: Record<string, any>): EmergencyReport {
  return {
    reportId: String(raw.reportId || id),
    kind: raw.kind === 'security_concern' ? 'security_concern' : 'emergency',
    reportType: String(raw.reportType || 'Other emergency'),
    description: String(raw.description || ''),
    location: String(raw.location || ''),
    incidentDate: String(raw.incidentDate || ''),
    contactPhone: raw.contactPhone ? String(raw.contactPhone) : undefined,
    reporterName: raw.reporterName ? String(raw.reporterName) : undefined,
    isConfidential: Boolean(raw.isConfidential),
    reporterUid: raw.reporterUid ? String(raw.reporterUid) : undefined,
    attachmentUrls: Array.isArray(raw.attachmentUrls) ? raw.attachmentUrls.map(String) : [],
    status: (raw.status || 'Received') as EmergencyReportStatus,
    adminNotes: raw.adminNotes ? String(raw.adminNotes) : undefined,
    trackingHash: String(raw.trackingHash || ''),
    createdAt: toIsoString(raw.createdAt),
    updatedAt: toIsoString(raw.updatedAt)
  };
}

export function subscribeToEmergencyReportsForAdmin(
  onUpdate: (reports: EmergencyReport[]) => void,
  onError?: (err: Error) => void
): () => void {
  assertAdmin();
  return onSnapshot(
    collection(db, 'emergency_reports'),
    (snap) => {
      const list = snap.docs
        .map((d) => parseEmergencyReport(d.id, d.data() || {}))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(list);
    },
    (err) => {
      onError?.(err as Error);
    }
  );
}

export function subscribeToEmergencyAuditLogsForAdmin(
  onUpdate: (logs: EmergencyAuditLog[]) => void,
  onError?: (err: Error) => void
): () => void {
  assertAdmin();
  return onSnapshot(
    collection(db, 'emergency_audit_logs'),
    (snap) => {
      const list = snap.docs
        .map((d) => {
          const raw = d.data() || {};
          return {
            id: d.id,
            action: String(raw.action || ''),
            targetType: String(raw.targetType || ''),
            targetId: String(raw.targetId || ''),
            summary: String(raw.summary || ''),
            adminEmail: String(raw.adminEmail || CEO_EMAIL),
            createdAt: toIsoString(raw.createdAt)
          };
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(list);
    },
    (err) => {
      console.warn('[Emergency audit logs subscription warning]:', err?.message);
      onError?.(err as Error);
    }
  );
}

// ============================================================================
// REPORT SUBMISSION & ZERO-PII STATUS TRACKING
// ============================================================================

export async function createEmergencyReport(input: {
  kind: EmergencyReportKind;
  reportType: string;
  description: string;
  location: string;
  incidentDate: string;
  contactPhone?: string;
  reporterName?: string;
  isConfidential: boolean;
  attachmentUrls?: string[];
}): Promise<{
  reportId: string;
  verificationPin: string;
  status: EmergencyReportStatus;
}> {
  if (!input.reportType.trim()) throw new Error('Please choose a report category.');
  if (!input.description.trim()) throw new Error('Please describe what happened.');
  if (!input.location.trim()) throw new Error('Please enter or select the incident location.');
  if (!input.incidentDate.trim()) throw new Error('Please enter the incident date and time.');
  if (input.kind === 'emergency' && (!input.contactPhone || input.contactPhone.trim().length < 5)) {
    throw new Error('A contact phone number is required for emergency reports.');
  }

  let effectiveUid = auth.currentUser?.uid;
  if (!effectiveUid) {
    effectiveUid = (await ensureGuestAuth().catch(() => null)) || undefined;
  }

  const reportId = generateReferenceNumber(input.kind);
  const verificationPin = generateVerificationPin();
  const trackingHash = await computeTrackingLookupHash(reportId, verificationPin);

  const reportPayload = stripUndefined({
    reportId,
    kind: input.kind,
    reportType: input.reportType.trim().slice(0, 100),
    description: input.description.trim().slice(0, 4000),
    location: input.location.trim().slice(0, 200),
    incidentDate: input.incidentDate.trim().slice(0, 64),
    contactPhone: input.isConfidential && !input.contactPhone?.trim()
      ? undefined
      : input.contactPhone?.trim().slice(0, 40) || undefined,
    reporterName: input.isConfidential
      ? 'Confidential Reporter'
      : input.reporterName?.trim().slice(0, 120) || undefined,
    isConfidential: Boolean(input.isConfidential),
    reporterUid: effectiveUid ? effectiveUid.slice(0, 128) : undefined,
    attachmentUrls: Array.isArray(input.attachmentUrls) ? input.attachmentUrls.slice(0, 5) : [],
    status: 'Received' as EmergencyReportStatus,
    trackingHash,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  const trackingPayload = stripUndefined({
    lookupHash: trackingHash,
    reportId,
    kind: input.kind,
    reportType: input.reportType.trim().slice(0, 100),
    status: 'Received' as EmergencyReportStatus,
    statusMessage:
      'Logged in FU MARKET Help Centre queue for administrator review. Remember to call verified emergency contacts directly for urgent danger.',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  try {
    await setDoc(doc(db, 'emergency_reports', reportId), reportPayload);
    await setDoc(doc(db, 'emergency_report_tracking', trackingHash), trackingPayload);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `emergency_reports/${reportId}`);
  }

  return {
    reportId,
    verificationPin,
    status: 'Received'
  };
}

export async function trackEmergencyReportStatus(
  referenceNumber: string,
  verificationPin: string
): Promise<EmergencyReportTrackingStatus | null> {
  const refClean = referenceNumber.trim().toUpperCase();
  const pinClean = verificationPin.trim().toUpperCase();
  if (!refClean || !pinClean) {
    throw new Error('Enter both your Report Reference Number and Verification Code.');
  }

  const lookupHash = await computeTrackingLookupHash(refClean, pinClean);
  try {
    const snap = await getDoc(doc(db, 'emergency_report_tracking', lookupHash));
    if (!snap.exists()) return null;
    const raw = snap.data() || {};
    return {
      lookupHash: snap.id,
      reportId: String(raw.reportId || refClean),
      kind: raw.kind === 'security_concern' ? 'security_concern' : 'emergency',
      reportType: String(raw.reportType || ''),
      status: (raw.status || 'Received') as EmergencyReportStatus,
      statusMessage: raw.statusMessage ? String(raw.statusMessage) : undefined,
      createdAt: toIsoString(raw.createdAt),
      updatedAt: toIsoString(raw.updatedAt)
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `emergency_report_tracking/${lookupHash}`);
  }
}

// ============================================================================
// LOST AND FOUND CENTRE
// ============================================================================

export async function createLostFoundItem(input: {
  reportType: LostFoundReportType;
  itemCategory: LostFoundItemCategory;
  title: string;
  description: string;
  location: string;
  incidentDate: string;
  recoveryInstructions: string;
  showPublicContact: boolean;
  contactPhone?: string;
  privateIdentifierHint?: string;
  imageUrl?: string;
  reporterLabel?: string;
}): Promise<LostFoundItem> {
  if (!input.title.trim()) throw new Error('Item title is required.');
  if (!input.description.trim()) throw new Error('Item description is required.');
  if (!input.location.trim()) throw new Error('Location is required.');
  if (!input.recoveryInstructions.trim()) {
    throw new Error('Please provide recovery or return instructions.');
  }

  let effectiveUid = auth.currentUser?.uid;
  if (!effectiveUid) {
    effectiveUid = (await ensureGuestAuth().catch(() => null)) || undefined;
  }

  const titleCheck = redactSensitiveIdentifiers(input.title.trim());
  const descCheck = redactSensitiveIdentifiers(input.description.trim());
  const recoveryCheck = redactSensitiveIdentifiers(input.recoveryInstructions.trim());

  const id = makeId('lnf');
  const nowIso = new Date().toISOString();

  const publicPayload = stripUndefined({
    id,
    reportType: input.reportType,
    itemCategory: input.itemCategory,
    title: titleCheck.sanitized.slice(0, 160),
    description: descCheck.sanitized.slice(0, 2000),
    location: input.location.trim().slice(0, 180),
    incidentDate: (input.incidentDate || nowIso.slice(0, 10)).trim().slice(0, 64),
    recoveryInstructions: recoveryCheck.sanitized.slice(0, 500),
    publicRecoveryContact:
      input.showPublicContact && input.contactPhone?.trim()
        ? input.contactPhone.trim().slice(0, 40)
        : undefined,
    imageUrl: input.imageUrl?.trim() || undefined,
    reporterUid: effectiveUid ? effectiveUid.slice(0, 128) : undefined,
    reporterLabel: input.reporterLabel?.trim().slice(0, 100) || 'FUWUKARI Community Member',
    status: 'open' as LostFoundStatus,
    isHiddenByAdmin: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  try {
    await setDoc(doc(db, 'lost_and_found_items', id), publicPayload);

    if (input.contactPhone?.trim() || input.privateIdentifierHint?.trim()) {
      await setDoc(
        doc(db, 'lost_and_found_private', id),
        stripUndefined({
          id,
          itemId: id,
          privatePhone: input.contactPhone?.trim().slice(0, 40) || undefined,
          privateIdentifierHint: input.privateIdentifierHint?.trim().slice(0, 300) || undefined,
          createdAt: serverTimestamp()
        })
      );
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `lost_and_found_items/${id}`);
  }

  return {
    id,
    reportType: input.reportType,
    itemCategory: input.itemCategory,
    title: titleCheck.sanitized.slice(0, 160),
    description: descCheck.sanitized.slice(0, 2000),
    location: input.location.trim().slice(0, 180),
    incidentDate: (input.incidentDate || nowIso.slice(0, 10)).trim().slice(0, 64),
    recoveryInstructions: recoveryCheck.sanitized.slice(0, 500),
    publicRecoveryContact:
      input.showPublicContact && input.contactPhone?.trim()
        ? input.contactPhone.trim().slice(0, 40)
        : undefined,
    imageUrl: input.imageUrl?.trim() || undefined,
    reporterUid: effectiveUid,
    reporterLabel: input.reporterLabel?.trim().slice(0, 100) || 'FUWUKARI Community Member',
    status: 'open',
    isHiddenByAdmin: false,
    createdAt: nowIso,
    updatedAt: nowIso
  };
}

// ============================================================================
// ADMIN / CEO MANAGEMENT ACTIONS (ALL AUDITED)
// ============================================================================

export async function saveEmergencyContact(input: {
  id?: string;
  name: string;
  department: EmergencyDepartment;
  phone: string;
  description: string;
  verified: boolean;
  operatingHours: string;
}): Promise<string> {
  assertAdmin();
  if (!input.name.trim()) throw new Error('Department or contact name is required.');
  if (!input.phone.trim()) throw new Error('Phone number is required.');
  if (!input.description.trim()) throw new Error('Service description is required.');
  if (!input.operatingHours.trim()) throw new Error('Operating hours are required.');

  const isEdit = Boolean(input.id);
  const id = (input.id || makeId('econtact')).replace(/[^a-zA-Z0-9_-]/g, '_');

  try {
    if (isEdit) {
      await updateDoc(doc(db, 'emergency_contacts', id), {
        name: input.name.trim().slice(0, 140),
        department: input.department,
        phone: input.phone.trim().slice(0, 40),
        description: input.description.trim().slice(0, 1000),
        verified: Boolean(input.verified),
        operatingHours: input.operatingHours.trim().slice(0, 140),
        updatedAt: serverTimestamp()
      });
    } else {
      await setDoc(doc(db, 'emergency_contacts', id), {
        id,
        name: input.name.trim().slice(0, 140),
        department: input.department,
        phone: input.phone.trim().slice(0, 40),
        description: input.description.trim().slice(0, 1000),
        verified: Boolean(input.verified),
        operatingHours: input.operatingHours.trim().slice(0, 140),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `emergency_contacts/${id}`);
  }

  await recordEmergencyAuditLog({
    action: isEdit ? 'edit_contact' : 'add_contact',
    targetType: 'emergency_contact',
    targetId: id,
    summary: `${isEdit ? 'Updated' : 'Added'} emergency contact "${input.name.trim()}" (${
      input.verified ? 'Verified' : 'Unverified'
    })`
  });

  return id;
}

export async function toggleEmergencyContactVerification(
  contact: EmergencyContact
): Promise<void> {
  assertAdmin();
  const nextVerified = !contact.verified;
  try {
    await updateDoc(doc(db, 'emergency_contacts', contact.id), {
      verified: nextVerified,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `emergency_contacts/${contact.id}`);
  }

  await recordEmergencyAuditLog({
    action: 'verify_contact',
    targetType: 'emergency_contact',
    targetId: contact.id,
    summary: `Marked contact "${contact.name}" as ${nextVerified ? 'Verified' : 'Unverified'}`
  });
}

export async function deleteEmergencyContact(contact: EmergencyContact): Promise<void> {
  assertAdmin();
  try {
    await deleteDoc(doc(db, 'emergency_contacts', contact.id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `emergency_contacts/${contact.id}`);
  }

  await recordEmergencyAuditLog({
    action: 'delete_contact',
    targetType: 'emergency_contact',
    targetId: contact.id,
    summary: `Removed emergency contact "${contact.name}"`
  });
}

export async function updateEmergencyReportStatus(
  report: EmergencyReport,
  nextStatus: EmergencyReportStatus,
  adminNotes?: string
): Promise<void> {
  assertAdmin();
  const cleanNotes = adminNotes?.trim().slice(0, 1000);
  try {
    await updateDoc(
      doc(db, 'emergency_reports', report.reportId),
      stripUndefined({
        status: nextStatus,
        adminNotes: cleanNotes || undefined,
        updatedAt: serverTimestamp()
      })
    );

    if (report.trackingHash) {
      const statusMessage = cleanNotes
        ? cleanNotes.slice(0, 500)
        : `Status updated to "${nextStatus}" by FU MARKET administrator.`;
      await updateDoc(doc(db, 'emergency_report_tracking', report.trackingHash), {
        status: nextStatus,
        statusMessage,
        updatedAt: serverTimestamp()
      }).catch(() => {});
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `emergency_reports/${report.reportId}`);
  }

  await recordEmergencyAuditLog({
    action: 'update_report_status',
    targetType: 'emergency_report',
    targetId: report.reportId,
    summary: `Updated report ${report.reportId} status from "${report.status}" to "${nextStatus}"`
  });
}

export async function deleteEmergencyReport(report: EmergencyReport): Promise<void> {
  assertAdmin();
  try {
    await deleteDoc(doc(db, 'emergency_reports', report.reportId));
    if (report.trackingHash) {
      await deleteDoc(doc(db, 'emergency_report_tracking', report.trackingHash)).catch(() => {});
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `emergency_reports/${report.reportId}`);
  }

  await recordEmergencyAuditLog({
    action: 'delete_report',
    targetType: 'emergency_report',
    targetId: report.reportId,
    summary: `Removed emergency/concern report ${report.reportId} (${report.reportType})`
  });
}

export async function publishSafetyAnnouncement(input: {
  id?: string;
  title: string;
  description: string;
  category: SafetyAnnouncementCategory;
  severity: SafetyAnnouncementSeverity;
  isPinned?: boolean;
}): Promise<string> {
  assertAdmin();
  if (!input.title.trim()) throw new Error('Announcement title is required.');
  if (!input.description.trim()) throw new Error('Announcement details are required.');

  const isEdit = Boolean(input.id);
  const id = (input.id || makeId('salert')).replace(/[^a-zA-Z0-9_-]/g, '_');
  const adminEmail = auth.currentUser?.email || CEO_EMAIL;

  try {
    if (isEdit) {
      await updateDoc(doc(db, 'safety_announcements', id), {
        title: input.title.trim().slice(0, 180),
        description: input.description.trim().slice(0, 4000),
        category: input.category,
        severity: input.severity,
        isPinned: Boolean(input.isPinned),
        updatedAt: serverTimestamp()
      });
    } else {
      await setDoc(doc(db, 'safety_announcements', id), {
        id,
        title: input.title.trim().slice(0, 180),
        description: input.description.trim().slice(0, 4000),
        category: input.category,
        severity: input.severity,
        publishedAt: serverTimestamp(),
        createdBy: adminEmail,
        isActive: true,
        isPinned: Boolean(input.isPinned),
        updatedAt: serverTimestamp()
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `safety_announcements/${id}`);
  }

  await recordEmergencyAuditLog({
    action: isEdit ? 'edit_safety_announcement' : 'publish_safety_announcement',
    targetType: 'safety_announcement',
    targetId: id,
    summary: `${isEdit ? 'Updated' : 'Published'} safety announcement: "${input.title.trim()}"`
  });

  return id;
}

export async function toggleSafetyAnnouncementActive(
  announcement: SafetyAnnouncement
): Promise<void> {
  assertAdmin();
  const nextActive = !announcement.isActive;
  try {
    await updateDoc(doc(db, 'safety_announcements', announcement.id), {
      isActive: nextActive,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `safety_announcements/${announcement.id}`);
  }

  await recordEmergencyAuditLog({
    action: 'toggle_safety_announcement',
    targetType: 'safety_announcement',
    targetId: announcement.id,
    summary: `${nextActive ? 'Activated' : 'Archived'} safety announcement "${announcement.title}"`
  });
}

export async function deleteSafetyAnnouncement(announcement: SafetyAnnouncement): Promise<void> {
  assertAdmin();
  try {
    await deleteDoc(doc(db, 'safety_announcements', announcement.id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `safety_announcements/${announcement.id}`);
  }

  await recordEmergencyAuditLog({
    action: 'delete_safety_announcement',
    targetType: 'safety_announcement',
    targetId: announcement.id,
    summary: `Deleted safety announcement "${announcement.title}"`
  });
}

export async function updateLostFoundStatus(
  item: LostFoundItem,
  status: LostFoundStatus
): Promise<void> {
  assertAdmin();
  try {
    await updateDoc(doc(db, 'lost_and_found_items', item.id), {
      status,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `lost_and_found_items/${item.id}`);
  }

  await recordEmergencyAuditLog({
    action: 'update_lost_found_status',
    targetType: 'lost_and_found',
    targetId: item.id,
    summary: `Marked Lost & Found "${item.title}" as "${status}"`
  });
}

export async function toggleLostFoundHidden(item: LostFoundItem): Promise<void> {
  assertAdmin();
  const nextHidden = !item.isHiddenByAdmin;
  try {
    await updateDoc(doc(db, 'lost_and_found_items', item.id), {
      isHiddenByAdmin: nextHidden,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `lost_and_found_items/${item.id}`);
  }

  await recordEmergencyAuditLog({
    action: nextHidden ? 'hide_lost_found' : 'unhide_lost_found',
    targetType: 'lost_and_found',
    targetId: item.id,
    summary: `${nextHidden ? 'Hidden' : 'Restored'} Lost & Found item "${item.title}"`
  });
}

export async function deleteLostFoundItem(item: LostFoundItem): Promise<void> {
  assertAdmin();
  try {
    await deleteDoc(doc(db, 'lost_and_found_items', item.id));
    await deleteDoc(doc(db, 'lost_and_found_private', item.id)).catch(() => {});
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `lost_and_found_items/${item.id}`);
  }

  await recordEmergencyAuditLog({
    action: 'delete_lost_found',
    targetType: 'lost_and_found',
    targetId: item.id,
    summary: `Deleted Lost & Found listing "${item.title}"`
  });
}

export async function fetchLostFoundPrivateForAdmin(
  itemId: string
): Promise<LostFoundPrivateRecord | null> {
  assertAdmin();
  try {
    const snap = await getDoc(doc(db, 'lost_and_found_private', itemId));
    if (!snap.exists()) return null;
    const raw = snap.data() || {};
    return {
      id: snap.id,
      itemId: String(raw.itemId || itemId),
      privatePhone: raw.privatePhone ? String(raw.privatePhone) : undefined,
      privateIdentifierHint: raw.privateIdentifierHint
        ? String(raw.privateIdentifierHint)
        : undefined,
      createdAt: toIsoString(raw.createdAt)
    };
  } catch {
    return null;
  }
}

export async function fetchAllEmergencyContactsOnce(): Promise<EmergencyContact[]> {
  try {
    const snap = await getDocs(collection(db, 'emergency_contacts'));
    return snap.docs.map((d) => parseContact(d.id, d.data() || {}));
  } catch {
    return [];
  }
}

export function exportEmergencyReportsCsv(reports: EmergencyReport[]): void {
  const escape = (v: unknown) => {
    const s = String(v ?? '').replace(/"/g, '""');
    return `"${s}"`;
  };
  const header = [
    'Reference ID',
    'Kind',
    'Category',
    'Status',
    'Location',
    'Incident Date',
    'Confidential',
    'Reporter Name',
    'Contact Phone',
    'Description',
    'Admin Notes',
    'Submitted At',
    'Updated At'
  ];
  const rows = reports.map((r) => [
    r.reportId,
    r.kind,
    r.reportType,
    r.status,
    r.location,
    r.incidentDate,
    r.isConfidential ? 'Yes' : 'No',
    r.isConfidential ? 'Confidential Reporter' : r.reporterName || '',
    r.contactPhone || '',
    r.description,
    r.adminNotes || '',
    r.createdAt,
    r.updatedAt
  ]);

  const csvContent = [header, ...rows]
    .map((cols) => cols.map(escape).join(','))
    .join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `fu-market-emergency-reports-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  recordEmergencyAuditLog({
    action: 'export_summary',
    targetType: 'emergency_report',
    targetId: 'csv_export',
    summary: `Exported ${reports.length} emergency/security report(s) to CSV`
  }).catch(() => {});
}

// ============================================================================
// BROWSER PUSH / WEB NOTIFICATIONS FOR SAFETY ALERTS
// ============================================================================
const NOTIFY_OPTIN_KEY = 'fu_market_safety_notifications_optin_v1';

export function isWebNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermissionState(): NotificationPermission | 'unsupported' {
  if (!isWebNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export function isSafetyNotificationsOptedIn(): boolean {
  if (!isWebNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;
  try {
    return localStorage.getItem(NOTIFY_OPTIN_KEY) === 'true';
  } catch {
    return false;
  }
}

export async function requestSafetyNotificationPermission(): Promise<{
  granted: boolean;
  status: NotificationPermission | 'unsupported';
}> {
  if (!isWebNotificationSupported()) {
    return { granted: false, status: 'unsupported' };
  }
  const permission = await Notification.requestPermission();
  const granted = permission === 'granted';
  try {
    localStorage.setItem(NOTIFY_OPTIN_KEY, granted ? 'true' : 'false');
  } catch {
    // Ignore storage error
  }
  return { granted, status: permission };
}

export function setSafetyNotificationsOptedIn(enabled: boolean): void {
  try {
    localStorage.setItem(NOTIFY_OPTIN_KEY, enabled ? 'true' : 'false');
  } catch {
    // Ignore
  }
}

export async function dispatchSafetyNotification(
  announcement: SafetyAnnouncement
): Promise<void> {
  if (!isSafetyNotificationsOptedIn()) return;
  const title = `FU MARKET Safety Alert: ${announcement.title}`;
  const body = announcement.description.slice(0, 180);

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: `fu-safety-${announcement.id}`
        });
        return;
      }
    }
    new Notification(title, {
      body,
      icon: '/pwa-192x192.png',
      tag: `fu-safety-${announcement.id}`
    });
  } catch {
    // Ignore unsupported platform contexts
  }
}
