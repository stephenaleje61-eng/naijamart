import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where
} from 'firebase/firestore';
import {
  AccountAppealRecord,
  FlaggedIdentifierRecord,
  ScamInvestigationStatus,
  ScamReportRecord,
  ScamTargetType
} from '../types.js';
import { auth, db, toIsoString } from './firebase.js';

export interface DuplicateListingCheckResult {
  hasDuplicates: boolean;
  warningMessage?: string;
  matches: Array<{
    id: string;
    title: string;
    price: number;
    sellerName: string;
    city?: string;
  }>;
}

export interface IdentifierCheckResult {
  status: 'clear' | ScamInvestigationStatus;
  reportCount: number;
  matches: FlaggedIdentifierRecord[];
}

export async function checkDuplicateListing(params: {
  title: string;
  price?: number;
  sellerId?: string;
  whatsappNumber?: string;
  excludeProductId?: string;
}): Promise<DuplicateListingCheckResult> {
  try {
    const res = await fetch('/api/antiscam/check-duplicate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) return { hasDuplicates: false, matches: [] };
    return (await res.json()) as DuplicateListingCheckResult;
  } catch {
    return { hasDuplicates: false, matches: [] };
  }
}

export async function checkFlaggedIdentifier(params: {
  phone?: string;
  bankAccount?: string;
}): Promise<IdentifierCheckResult> {
  const qs = new URLSearchParams();
  if (params.phone?.trim()) qs.set('phone', params.phone.trim());
  if (params.bankAccount?.trim()) qs.set('bankAccount', params.bankAccount.trim());
  if (!qs.toString()) return { status: 'clear', reportCount: 0, matches: [] };

  try {
    const res = await fetch(`/api/antiscam/check-identifier?${qs.toString()}`);
    if (!res.ok) return { status: 'clear', reportCount: 0, matches: [] };
    return (await res.json()) as IdentifierCheckResult;
  } catch {
    return { status: 'clear', reportCount: 0, matches: [] };
  }
}

export async function submitScamReport(params: {
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
}): Promise<ScamReportRecord> {
  const fbToken = await auth.currentUser?.getIdToken().catch(() => undefined);
  const res = await fetch('/api/antiscam/report', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(fbToken ? { 'x-firebase-id-token': fbToken } : {})
    },
    body: JSON.stringify(params)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || 'Could not submit scam report.');
  }
  return data.report as ScamReportRecord;
}

export async function reviewScamReport(params: {
  reportId: string;
  status: 'under_investigation' | 'confirmed_fraudulent' | 'dismissed';
  adminNotes?: string;
  suspendTargetUser?: boolean;
  targetUserId?: string;
  suspectPhone?: string;
  suspectBankAccount?: string;
  targetName?: string;
  reporterId?: string;
  ceoSessionToken?: string;
}): Promise<void> {
  const fbToken = await auth.currentUser?.getIdToken().catch(() => undefined);
  if (!fbToken) {
    throw new Error('Firebase authentication token missing.');
  }
  const res = await fetch(`/api/antiscam/review/${encodeURIComponent(params.reportId)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-firebase-id-token': fbToken,
      ...(params.ceoSessionToken ? { 'x-ceo-session': params.ceoSessionToken } : {})
    },
    body: JSON.stringify(params)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || 'Failed to update scam report.');
  }
}

export async function submitAccountAppeal(params: {
  userId: string;
  userName: string;
  userEmail: string;
  phone?: string;
  explanation: string;
  evidenceUrl?: string;
}): Promise<AccountAppealRecord> {
  const fbToken = await auth.currentUser?.getIdToken().catch(() => undefined);
  const res = await fetch('/api/antiscam/appeal', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(fbToken ? { 'x-firebase-id-token': fbToken } : {})
    },
    body: JSON.stringify(params)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || 'Could not submit appeal.');
  }
  return data.appeal as AccountAppealRecord;
}

export async function reviewAccountAppeal(params: {
  appealId: string;
  decision: 'approved' | 'rejected';
  targetUserId?: string;
  reviewerNotes?: string;
  ceoSessionToken?: string;
}): Promise<void> {
  const fbToken = await auth.currentUser?.getIdToken().catch(() => undefined);
  if (!fbToken) throw new Error('CEO authentication required.');
  const res = await fetch(`/api/antiscam/appeals/review/${encodeURIComponent(params.appealId)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-firebase-id-token': fbToken,
      ...(params.ceoSessionToken ? { 'x-ceo-session': params.ceoSessionToken } : {})
    },
    body: JSON.stringify(params)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Failed to review appeal.');
}

export function subscribeToScamReports(
  onData: (reports: ScamReportRecord[]) => void
): () => void {
  try {
    const q = query(collection(db, 'scamReports'), orderBy('createdAt', 'desc'), limit(150));
    return onSnapshot(
      q,
      (snap) => {
        const list: ScamReportRecord[] = snap.docs.map((d) => {
          const data = d.data() || {};
          return {
            id: String(data.id || d.id),
            targetType: data.targetType || 'product',
            targetId: String(data.targetId || ''),
            targetName: String(data.targetName || 'Listing'),
            targetUserId: data.targetUserId,
            suspectPhone: data.suspectPhone,
            suspectBankAccount: data.suspectBankAccount,
            suspectBankName: data.suspectBankName,
            institutionId: data.institutionId,
            reporterId: String(data.reporterId || ''),
            reporterName: String(data.reporterName || 'Campus Member'),
            reporterEmail: data.reporterEmail,
            reason: String(data.reason || ''),
            details: String(data.details || ''),
            evidenceUrls: Array.isArray(data.evidenceUrls) ? data.evidenceUrls : [],
            status: (data.status || 'reported') as ScamInvestigationStatus,
            adminNotes: data.adminNotes,
            reviewedByEmail: data.reviewedByEmail,
            reviewedAt: data.reviewedAt,
            createdAt: toIsoString(data.createdAt),
            updatedAt: toIsoString(data.updatedAt)
          };
        });
        onData(list);
      },
      (err) => {
        console.warn('[subscribeToScamReports]:', err?.message || err);
        onData([]);
      }
    );
  } catch {
    return () => {};
  }
}

export function subscribeToFlaggedIdentifiers(
  onData: (items: FlaggedIdentifierRecord[]) => void
): () => void {
  try {
    const q = query(collection(db, 'flaggedIdentifiers'), limit(200));
    return onSnapshot(
      q,
      (snap) => {
        const list: FlaggedIdentifierRecord[] = snap.docs.map((d) => {
          const data = d.data() || {};
          return {
            id: String(data.id || d.id),
            identifierType: data.identifierType === 'bank_account' ? 'bank_account' : 'phone',
            identifierValue: String(data.identifierValue || ''),
            normalizedValue: String(data.normalizedValue || ''),
            reportCount: Number(data.reportCount || 1),
            status: (data.status || 'reported') as ScamInvestigationStatus,
            lastReportedAt: toIsoString(data.lastReportedAt),
            notes: data.notes
          };
        });
        onData(list);
      },
      () => onData([])
    );
  } catch {
    return () => {};
  }
}

export function subscribeToAccountAppeals(
  onData: (appeals: AccountAppealRecord[]) => void,
  onlyUserId?: string
): () => void {
  try {
    const q = onlyUserId
      ? query(collection(db, 'accountAppeals'), where('userId', '==', onlyUserId), limit(25))
      : query(collection(db, 'accountAppeals'), orderBy('createdAt', 'desc'), limit(120));
    return onSnapshot(
      q,
      (snap) => {
        const list: AccountAppealRecord[] = snap.docs.map((d) => {
          const data = d.data() || {};
          return {
            id: String(data.id || d.id),
            userId: String(data.userId || ''),
            userName: String(data.userName || ''),
            userEmail: String(data.userEmail || ''),
            phone: data.phone,
            explanation: String(data.explanation || ''),
            evidenceUrl: data.evidenceUrl,
            status: (data.status || 'pending') as AccountAppealRecord['status'],
            reviewerNotes: data.reviewerNotes,
            reviewedByEmail: data.reviewedByEmail,
            reviewedAt: data.reviewedAt,
            createdAt: toIsoString(data.createdAt),
            updatedAt: toIsoString(data.updatedAt)
          };
        });
        onData(list);
      },
      () => onData([])
    );
  } catch {
    return () => {};
  }
}
