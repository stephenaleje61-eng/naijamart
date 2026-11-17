import fs from 'fs';
import path from 'path';
import { Router, Request, Response, NextFunction } from 'express';
import {
  AuthenticatedRequest,
  CEO_EMAIL,
  getClientIp,
  normalizeNigerianPhone,
  requireCeoAdmin,
  verifyFirebaseIdToken
} from '../auth.js';
import { ceoStore, RegionalModeratorRecord } from '../ceoStore.js';
import { db } from '../db.js';
import {
  deleteFirestoreDocument,
  formatServerFirestoreError,
  listCollectionDocuments,
  setFirestoreDocument,
  updateFirestoreDocument
} from '../firestore.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const ANTISCAM_REGISTRY_FILE = path.join(DATA_DIR, 'nuh_antiscam_registry.json');
const ANNOUNCEMENTS_FALLBACK_FILE = path.join(DATA_DIR, 'nuh_national_announcements.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface FlaggedRegistryItem {
  id: string;
  identifierType: 'phone' | 'bank_account';
  identifierValue: string;
  normalizedValue: string;
  reportCount: number;
  status: 'reported' | 'under_investigation' | 'confirmed_fraudulent' | 'dismissed';
  lastReportedAt: string;
  notes?: string;
}

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
    }
  } catch {
    // Fallback
  }
  return fallback;
}

function writeJsonFile(filePath: string, data: any): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn(`[SocialAntiScam] Failed writing ${filePath}:`, (err as Error).message);
  }
}

export function normalizeIdentifierValue(type: 'phone' | 'bank_account', raw: string): string {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';
  if (type === 'phone') {
    const phone = normalizeNigerianPhone(trimmed);
    return phone || trimmed.replace(/\D/g, '');
  }
  return trimmed.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

export function makeFlagDocId(type: 'phone' | 'bank_account', normalized: string): string {
  return `${type}_${normalized.replace(/[^a-zA-Z0-9_-]/g, '')}`.slice(0, 120);
}

// In-memory rate limiter for anti-scam / network actions
const rateBuckets = new Map<string, number[]>();
function rateLimit(maxHits = 40, windowMs = 60_000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIp(req);
    const now = Date.now();
    const list = (rateBuckets.get(ip) || []).filter((t) => now - t < windowMs);
    if (list.length >= maxHits) {
      return res.status(429).json({
        error: 'Too many requests in a short window. Please wait a moment and try again.'
      });
    }
    list.push(now);
    rateBuckets.set(ip, list);
    next();
  };
}

async function resolveCeoOrModerator(req: AuthenticatedRequest): Promise<{
  authorized: boolean;
  isCeo: boolean;
  email: string;
  uid: string;
  fbIdToken?: string;
  moderator?: RegionalModeratorRecord;
}> {
  const rawFb = req.headers['x-firebase-id-token'];
  const fbIdToken = typeof rawFb === 'string' ? rawFb.trim() : '';
  if (!fbIdToken) {
    return { authorized: false, isCeo: false, email: '', uid: '' };
  }
  const fbUser = await verifyFirebaseIdToken(fbIdToken);
  if (!fbUser || !fbUser.emailVerified) {
    return { authorized: false, isCeo: false, email: '', uid: '' };
  }

  const normalizedEmail = fbUser.email.toLowerCase().trim();
  if (normalizedEmail === CEO_EMAIL && fbUser.ceoAdminClaim !== false) {
    return {
      authorized: true,
      isCeo: true,
      email: fbUser.email,
      uid: fbUser.uid,
      fbIdToken
    };
  }

  const moderators = ceoStore.getData().moderators || [];
  const activeMod = moderators.find(
    (m) => m.status === 'active' && m.email.toLowerCase().trim() === normalizedEmail
  );
  if (activeMod) {
    return {
      authorized: true,
      isCeo: false,
      email: fbUser.email,
      uid: fbUser.uid,
      fbIdToken,
      moderator: activeMod
    };
  }

  return { authorized: false, isCeo: false, email: fbUser.email, uid: fbUser.uid };
}

export const antiScamRouter = Router();
export const networkRouter = Router();

// 1. Duplicate Listing Detection against active marketplace products
antiScamRouter.post('/check-duplicate', rateLimit(60), (req: Request, res: Response) => {
  const { title, price, sellerId, whatsappNumber, excludeProductId } = req.body || {};
  const cleanTitle = String(title || '').trim().toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ');
  const numPrice = Number(price) || 0;
  const cleanPhone = normalizeNigerianPhone(whatsappNumber);

  if (!cleanTitle || cleanTitle.length < 3) {
    return res.json({ hasDuplicates: false, matches: [] });
  }

  const titleTokens = new Set(cleanTitle.split(' ').filter((w) => w.length >= 3));
  const matches = db.products
    .filter((p) => {
      if (p.id === excludeProductId || p.status !== 'active') return false;
      const pTitle = String(p.title || '').trim().toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ');
      const pPhone = normalizeNigerianPhone(p.whatsappNumber);
      const sameOwnerOrPhone =
        (sellerId && p.sellerId === sellerId) ||
        (cleanPhone && pPhone && cleanPhone === pPhone);

      if (pTitle === cleanTitle && sameOwnerOrPhone) return true;

      // Token overlap + price proximity check across same phone/seller
      const pTokens = pTitle.split(' ').filter((w) => w.length >= 3);
      const shared = pTokens.filter((t) => titleTokens.has(t)).length;
      const overlapRatio = titleTokens.size > 0 ? shared / Math.max(titleTokens.size, pTokens.length) : 0;
      const priceSimilar =
        numPrice > 0 && p.price > 0
          ? Math.abs(numPrice - p.price) / Math.max(numPrice, p.price) <= 0.15
          : false;

      if (sameOwnerOrPhone && overlapRatio >= 0.75 && priceSimilar) return true;
      if (overlapRatio >= 0.9 && priceSimilar && pTitle === cleanTitle) return true;
      return false;
    })
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      title: p.title,
      price: p.price,
      sellerName: p.sellerName,
      city: p.city
    }));

  res.json({
    hasDuplicates: matches.length > 0,
    warningMessage:
      matches.length > 0
        ? `Possible duplicate listing detected (${matches.length} matching active item${matches.length > 1 ? 's' : ''}). Avoid reposting identical listings to keep marketplace results clean.`
        : undefined,
    matches
  });
});

// 2. Flagged Phone & Bank Account Check
antiScamRouter.get('/check-identifier', rateLimit(80), async (req: Request, res: Response) => {
  const rawPhone = String(req.query.phone || '').trim();
  const rawBank = String(req.query.bankAccount || '').trim();
  const phoneNorm = normalizeIdentifierValue('phone', rawPhone);
  const bankNorm = normalizeIdentifierValue('bank_account', rawBank);

  if (!phoneNorm && !bankNorm) {
    return res.json({ status: 'clear', reportCount: 0, matches: [] });
  }

  const registry = readJsonFile<Record<string, FlaggedRegistryItem>>(ANTISCAM_REGISTRY_FILE, {});
  const matches: FlaggedRegistryItem[] = [];

  if (phoneNorm) {
    const id = makeFlagDocId('phone', phoneNorm);
    if (registry[id]) matches.push(registry[id]);
  }
  if (bankNorm) {
    const id = makeFlagDocId('bank_account', bankNorm);
    if (registry[id]) matches.push(registry[id]);
  }

  try {
    const fsDocs = await listCollectionDocuments(
      process.env.FIRESTORE_DATABASE_ID || '(default)',
      'flaggedIdentifiers',
      200,
      500
    ).catch(() => []);
    for (const d of fsDocs) {
      const val = String(d.data?.normalizedValue || '');
      if (!val) continue;
      if ((phoneNorm && val === phoneNorm) || (bankNorm && val === bankNorm)) {
        const existingIdx = matches.findIndex((m) => m.normalizedValue === val);
        const item: FlaggedRegistryItem = {
          id: d.id,
          identifierType: d.data.identifierType === 'bank_account' ? 'bank_account' : 'phone',
          identifierValue: String(d.data.identifierValue || val),
          normalizedValue: val,
          reportCount: Number(d.data.reportCount || 1),
          status: (d.data.status || 'reported') as FlaggedRegistryItem['status'],
          lastReportedAt: String(d.data.lastReportedAt || new Date().toISOString()),
          notes: d.data.notes ? String(d.data.notes) : undefined
        };
        if (existingIdx >= 0) {
          matches[existingIdx] = item;
        } else {
          matches.push(item);
        }
      }
    }
  } catch {
    // Non-blocking Firestore fallback to local registry
  }

  const activeMatches = matches.filter((m) => m.status !== 'dismissed');
  const priority = (s: FlaggedRegistryItem['status']) =>
    s === 'confirmed_fraudulent' ? 3 : s === 'under_investigation' ? 2 : s === 'reported' ? 1 : 0;

  activeMatches.sort((a, b) => priority(b.status) - priority(a.status));
  const top = activeMatches[0];

  res.json({
    status: top ? top.status : 'clear',
    reportCount: activeMatches.reduce((sum, m) => Math.max(sum, m.reportCount || 0), 0),
    matches: activeMatches
  });
});

// 3. Submit Scam Report (Always enters as 'reported' - fair investigation workflow)
antiScamRouter.post('/report', rateLimit(20), async (req: Request, res: Response) => {
  const {
    targetType,
    targetId,
    targetName,
    targetUserId,
    suspectPhone,
    suspectBankAccount,
    suspectBankName,
    institutionId,
    reporterId,
    reporterName,
    reporterEmail,
    reason,
    details,
    evidenceUrls
  } = req.body || {};

  if (!targetType || !targetId || !targetName || !reason || !details) {
    return res.status(400).json({ error: 'targetType, targetId, targetName, reason, and details are required.' });
  }

  const now = new Date().toISOString();
  const id = `scam_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const rawFb = req.headers['x-firebase-id-token'];
  const fbIdToken = typeof rawFb === 'string' ? rawFb.trim() : undefined;

  const reportPayload = {
    id,
    targetType: String(targetType).slice(0, 40),
    targetId: String(targetId).slice(0, 140),
    targetName: String(targetName).trim().slice(0, 180),
    ...(targetUserId ? { targetUserId: String(targetUserId).slice(0, 140) } : {}),
    ...(suspectPhone ? { suspectPhone: String(suspectPhone).trim().slice(0, 40) } : {}),
    ...(suspectBankAccount ? { suspectBankAccount: String(suspectBankAccount).trim().slice(0, 40) } : {}),
    ...(suspectBankName ? { suspectBankName: String(suspectBankName).trim().slice(0, 80) } : {}),
    ...(institutionId ? { institutionId: String(institutionId).trim().slice(0, 80) } : {}),
    reporterId: String(reporterId || 'anonymous').slice(0, 140),
    reporterName: String(reporterName || 'Campus Member').trim().slice(0, 120),
    ...(reporterEmail ? { reporterEmail: String(reporterEmail).trim().slice(0, 140) } : {}),
    reason: String(reason).trim().slice(0, 160),
    details: String(details).trim().slice(0, 2500),
    evidenceUrls: Array.isArray(evidenceUrls) ? evidenceUrls.slice(0, 5) : [],
    status: 'reported' as const,
    createdAt: now,
    updatedAt: now
  };

  // Update server registry counts for phone / bank account
  const registry = readJsonFile<Record<string, FlaggedRegistryItem>>(ANTISCAM_REGISTRY_FILE, {});
  const phoneNorm = normalizeIdentifierValue('phone', suspectPhone);
  const bankNorm = normalizeIdentifierValue('bank_account', suspectBankAccount);

  if (phoneNorm) {
    const fid = makeFlagDocId('phone', phoneNorm);
    const prev = registry[fid];
    registry[fid] = {
      id: fid,
      identifierType: 'phone',
      identifierValue: String(suspectPhone).trim(),
      normalizedValue: phoneNorm,
      reportCount: (prev?.reportCount || 0) + 1,
      status: prev?.status === 'confirmed_fraudulent' ? 'confirmed_fraudulent' : prev?.status === 'under_investigation' ? 'under_investigation' : 'reported',
      lastReportedAt: now
    };
  }
  if (bankNorm) {
    const fid = makeFlagDocId('bank_account', bankNorm);
    const prev = registry[fid];
    registry[fid] = {
      id: fid,
      identifierType: 'bank_account',
      identifierValue: String(suspectBankAccount).trim(),
      normalizedValue: bankNorm,
      reportCount: (prev?.reportCount || 0) + 1,
      status: prev?.status === 'confirmed_fraudulent' ? 'confirmed_fraudulent' : prev?.status === 'under_investigation' ? 'under_investigation' : 'reported',
      lastReportedAt: now
    };
  }
  writeJsonFile(ANTISCAM_REGISTRY_FILE, registry);

  try {
    await setFirestoreDocument('scamReports', id, reportPayload, false, undefined, fbIdToken);
  } catch (err) {
    console.warn('[scamReports REST save warning]:', formatServerFirestoreError(err).message);
  }

  ceoStore.recordSecurityLog({
    eventType: 'CEO_USER_MODERATION',
    severity: 'warning',
    actorEmail: reporterEmail || reportPayload.reporterName,
    targetType: reportPayload.targetType,
    targetId: reportPayload.targetId,
    ipAddress: getClientIp(req),
    summary: `New anti-scam report submitted (${reportPayload.reason}) against ${reportPayload.targetName}. Status: reported (awaiting review).`
  });

  res.status(201).json({ success: true, report: reportPayload });
});

// 4. CEO / Assigned Moderator reviews Scam Report with fair status transitions
antiScamRouter.post('/review/:reportId', rateLimit(30), async (req: AuthenticatedRequest, res: Response) => {
  const actor = await resolveCeoOrModerator(req);
  if (!actor.authorized || (!actor.isCeo && !actor.moderator?.permissions.includes('review_reports'))) {
    return res.status(403).json({
      error: 'Forbidden: Only CEO Super Administrator or authorized Moderation officers may review anti-scam reports.'
    });
  }

  const reportId = String(req.params.reportId || '').trim();
  const {
    status,
    adminNotes,
    suspendTargetUser,
    targetUserId,
    suspectPhone,
    suspectBankAccount,
    targetName,
    reporterId
  } = req.body || {};

  if (!reportId || !['under_investigation', 'confirmed_fraudulent', 'dismissed'].includes(status)) {
    return res.status(400).json({
      error: 'Valid reportId and status (under_investigation | confirmed_fraudulent | dismissed) are required.'
    });
  }

  const now = new Date().toISOString();
  const token = actor.fbIdToken;

  try {
    await updateFirestoreDocument(
      'scamReports',
      reportId,
      {
        status,
        adminNotes: String(adminNotes || '').trim().slice(0, 800),
        reviewedByEmail: actor.email,
        reviewedAt: now,
        updatedAt: now
      },
      undefined,
      token
    );
  } catch (err) {
    return res.status(502).json({ error: formatServerFirestoreError(err).message });
  }

  // Update phone/bank identifier status in registry & Firestore
  const registry = readJsonFile<Record<string, FlaggedRegistryItem>>(ANTISCAM_REGISTRY_FILE, {});
  const phoneNorm = normalizeIdentifierValue('phone', suspectPhone);
  const bankNorm = normalizeIdentifierValue('bank_account', suspectBankAccount);

  for (const [type, norm, rawVal] of [
    ['phone', phoneNorm, suspectPhone],
    ['bank_account', bankNorm, suspectBankAccount]
  ] as const) {
    if (!norm) continue;
    const fid = makeFlagDocId(type, norm);
    const updatedItem: FlaggedRegistryItem = {
      id: fid,
      identifierType: type,
      identifierValue: String(rawVal || norm).trim(),
      normalizedValue: norm,
      reportCount: Math.max(1, registry[fid]?.reportCount || 1),
      status,
      lastReportedAt: now,
      notes: adminNotes ? String(adminNotes).trim().slice(0, 300) : undefined
    };
    registry[fid] = updatedItem;
    await setFirestoreDocument('flaggedIdentifiers', fid, updatedItem, true, undefined, token).catch(() => {});
  }
  writeJsonFile(ANTISCAM_REGISTRY_FILE, registry);

  // Fair enforcement: NEVER suspend user unless confirmed_fraudulent + explicit CEO confirmation
  const scamEntityStatus =
    status === 'confirmed_fraudulent'
      ? 'confirmed_fraudulent'
      : status === 'under_investigation'
      ? 'under_investigation'
      : 'clear';

  if (targetUserId && String(targetUserId).trim()) {
    const cleanUid = String(targetUserId).trim();
    const shouldSuspend = Boolean(status === 'confirmed_fraudulent' && suspendTargetUser && actor.isCeo);

    const userUpdate: Record<string, any> = {
      scamStatus: scamEntityStatus,
      updatedAt: now
    };
    if (shouldSuspend) {
      userUpdate.isSuspended = true;
      userUpdate.suspensionReason =
        adminNotes || 'Account suspended following confirmed fraud investigation on NIGERIA UNIVERSITY HUB.';
    } else if (status === 'dismissed') {
      userUpdate.scamStatus = 'clear';
    }

    await updateFirestoreDocument('users', cleanUid, userUpdate, undefined, token).catch(() => {});

    const localUser = db.users.find((u) => u.id === cleanUid);
    if (localUser && localUser.email.toLowerCase().trim() !== CEO_EMAIL) {
      if (shouldSuspend) {
        localUser.isSuspended = true;
        localUser.suspensionReason = userUpdate.suspensionReason;
        const sp = db.sellerProfiles.find((s) => s.userId === cleanUid);
        if (sp) sp.isSuspended = true;
        db.save();
      }
    }

    if (status === 'confirmed_fraudulent' || status === 'under_investigation') {
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      await setFirestoreDocument(
        'notifications',
        notifId,
        {
          id: notifId,
          userId: cleanUid,
          type: 'security_warning',
          title:
            status === 'confirmed_fraudulent'
              ? 'Account Security Action — Confirmed Violation'
              : 'Account Notice — Report Under Investigation',
          body:
            status === 'confirmed_fraudulent'
              ? `Your account has been restricted after a confirmed fraud review. You may submit an appeal if you believe this was an error.`
              : `A report referencing your listing or contact details is currently under review by NIGERIA UNIVERSITY HUB Safety Team.`,
          read: false,
          targetType: 'appeal',
          targetId: reportId,
          createdAt: now
        },
        false,
        undefined,
        token
      ).catch(() => {});
    }
  }

  if (reporterId && reporterId !== 'anonymous') {
    const rNotifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await setFirestoreDocument(
      'notifications',
      rNotifId,
      {
        id: rNotifId,
        userId: String(reporterId),
        type: 'security_warning',
        title: `Anti-Scam Report Update (${targetName || 'Listing'})`,
        body: `Your report is now marked "${status.replace(/_/g, ' ')}". Thank you for helping keep Nigerian campuses safe.`,
        read: false,
        targetType: 'scam_report',
        targetId: reportId,
        createdAt: now
      },
      false,
      undefined,
      token
    ).catch(() => {});
  }

  ceoStore.recordSecurityLog({
    eventType: 'CEO_USER_MODERATION',
    severity: status === 'confirmed_fraudulent' ? 'critical' : 'info',
    actorEmail: actor.email,
    actorUid: actor.uid,
    targetType: 'scam_report',
    targetId: reportId,
    ipAddress: getClientIp(req),
    summary: `Safety officer ${actor.email} marked scam report ${reportId} (${targetName || 'item'}) as ${status}.`
  });

  res.json({ success: true, status, scamEntityStatus });
});

// 5. Submit Suspension Appeal
antiScamRouter.post('/appeal', rateLimit(15), async (req: Request, res: Response) => {
  const { userId, userName, userEmail, phone, explanation, evidenceUrl } = req.body || {};
  if (!userId || !userEmail || !explanation || String(explanation).trim().length < 10) {
    return res.status(400).json({ error: 'userId, email, and detailed explanation are required.' });
  }

  const now = new Date().toISOString();
  const id = `appeal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const rawFb = req.headers['x-firebase-id-token'];
  const fbIdToken = typeof rawFb === 'string' ? rawFb.trim() : undefined;

  const appeal = {
    id,
    userId: String(userId).slice(0, 140),
    userName: String(userName || 'Student Member').trim().slice(0, 120),
    userEmail: String(userEmail).trim().toLowerCase().slice(0, 140),
    ...(phone ? { phone: String(phone).trim().slice(0, 40) } : {}),
    explanation: String(explanation).trim().slice(0, 2000),
    ...(evidenceUrl ? { evidenceUrl: String(evidenceUrl).trim().slice(0, 600) } : {}),
    status: 'pending' as const,
    createdAt: now,
    updatedAt: now
  };

  try {
    await setFirestoreDocument('accountAppeals', id, appeal, false, undefined, fbIdToken);
  } catch (err) {
    return res.status(502).json({ error: formatServerFirestoreError(err).message });
  }

  res.status(201).json({ success: true, appeal });
});

// 6. CEO-only Review Appeal
antiScamRouter.post('/appeals/review/:appealId', requireCeoAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const appealId = String(req.params.appealId || '').trim();
  const { decision, targetUserId, reviewerNotes } = req.body || {};
  if (!appealId || !['approved', 'rejected'].includes(decision)) {
    return res.status(400).json({ error: 'appealId and decision (approved | rejected) are required.' });
  }

  const token = typeof req.headers['x-firebase-id-token'] === 'string' ? req.headers['x-firebase-id-token'].trim() : undefined;
  const now = new Date().toISOString();
  const fbUser = req.firebaseUser!;

  try {
    await updateFirestoreDocument(
      'accountAppeals',
      appealId,
      {
        status: decision,
        reviewerNotes: String(reviewerNotes || '').trim().slice(0, 600),
        reviewedByEmail: fbUser.email,
        reviewedAt: now,
        updatedAt: now
      },
      undefined,
      token
    );

    if (decision === 'approved' && targetUserId) {
      await updateFirestoreDocument(
        'users',
        String(targetUserId),
        {
          isSuspended: false,
          suspensionReason: '',
          scamStatus: 'clear',
          updatedAt: now
        },
        undefined,
        token
      ).catch(() => {});

      const localUser = db.users.find((u) => u.id === targetUserId);
      if (localUser) {
        localUser.isSuspended = false;
        delete localUser.suspensionReason;
        const sp = db.sellerProfiles.find((s) => s.userId === targetUserId);
        if (sp) sp.isSuspended = false;
        db.save();
      }
    }

    if (targetUserId) {
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      await setFirestoreDocument(
        'notifications',
        notifId,
        {
          id: notifId,
          userId: String(targetUserId),
          type: 'security_warning',
          title: decision === 'approved' ? 'Account Appeal Approved & Restored' : 'Account Appeal Decision',
          body:
            decision === 'approved'
              ? 'Your appeal was approved by NIGERIA UNIVERSITY HUB CEO. Your account access has been restored.'
              : `Your account appeal was declined. ${reviewerNotes ? `Reason: ${reviewerNotes}` : ''}`,
          read: false,
          targetType: 'appeal',
          targetId: appealId,
          createdAt: now
        },
        false,
        undefined,
        token
      ).catch(() => {});
    }

    res.json({ success: true, decision });
  } catch (err) {
    res.status(502).json({ error: formatServerFirestoreError(err).message });
  }
});

// 7. CEO-only Review Student / Seller Identity Verification Request
networkRouter.post(
  '/verifications/review/:requestId',
  requireCeoAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    const requestId = String(req.params.requestId || '').trim();
    const { decision, targetUserId, userName, institutionId, verificationMethod, reviewNotes } = req.body || {};

    if (!requestId || !['approved', 'rejected'].includes(decision) || !targetUserId) {
      return res.status(400).json({ error: 'requestId, targetUserId, and decision (approved | rejected) are required.' });
    }

    const token =
      typeof req.headers['x-firebase-id-token'] === 'string'
        ? req.headers['x-firebase-id-token'].trim()
        : undefined;
    const now = new Date().toISOString();
    const fbUser = req.firebaseUser!;

    try {
      await updateFirestoreDocument(
        'studentVerifications',
        requestId,
        {
          status: decision,
          reviewNotes: String(reviewNotes || '').trim().slice(0, 600),
          reviewedByEmail: fbUser.email,
          reviewedAt: now,
          updatedAt: now
        },
        undefined,
        token
      );

      const userFields =
        decision === 'approved'
          ? {
              isVerified: true,
              ceoVerified: true,
              verifiedBadgeText: 'Verified Student',
              verifiedByCeoAt: now,
              verifiedByCeoEmail: fbUser.email,
              studentVerificationStatus: 'verified',
              verificationMethod: verificationMethod === 'edu_email' ? 'edu_email' : 'student_id',
              updatedAt: now
            }
          : {
              studentVerificationStatus: 'rejected',
              updatedAt: now
            };

      await updateFirestoreDocument('users', String(targetUserId), userFields, undefined, token).catch(() => {});

      const sp = db.sellerProfiles.find((s) => s.userId === targetUserId);
      if (sp && decision === 'approved') {
        sp.isVerified = true;
        db.save();
      }

      if (institutionId) {
        const instProfId = `${String(targetUserId)}__${String(institutionId)}`;
        await updateFirestoreDocument(
          'institutionUsers',
          instProfId,
          {
            isVerified: decision === 'approved',
            ceoVerified: decision === 'approved',
            studentVerificationStatus: decision === 'approved' ? 'verified' : 'rejected',
            updatedAt: now
          },
          undefined,
          token
        ).catch(() => {});
      }

      ceoStore.recordVerificationLog({
        action: decision === 'approved' ? 'VERIFIED' : 'UNVERIFIED',
        targetType: 'user',
        targetId: String(targetUserId),
        targetName: String(userName || targetUserId),
        ceoEmail: fbUser.email,
        notes: `Student verification (${verificationMethod || 'id'}) ${decision}. ${reviewNotes || ''}`.trim()
      });

      const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      await setFirestoreDocument(
        'notifications',
        notifId,
        {
          id: notifId,
          userId: String(targetUserId),
          type: 'verification',
          title:
            decision === 'approved'
              ? 'Student Verification Approved!'
              : 'Student Verification Update',
          body:
            decision === 'approved'
              ? 'Congratulations! Your student/seller account on NIGERIA UNIVERSITY HUB now carries an official Verified Student badge.'
              : `Your student verification submission needs attention. ${reviewNotes ? `Note: ${reviewNotes}` : 'Please review your details and resubmit.'}`,
          read: false,
          targetType: 'verification',
          targetId: requestId,
          createdAt: now
        },
        false,
        undefined,
        token
      ).catch(() => {});

      res.json({ success: true, decision });
    } catch (err) {
      res.status(502).json({ error: formatServerFirestoreError(err).message });
    }
  }
);

// 8. National & Campus Targeted Announcements (CEO, Admin, or scoped Campus Representative)
networkRouter.get('/announcements', (_req: Request, res: Response) => {
  const local = readJsonFile<any[]>(ANNOUNCEMENTS_FALLBACK_FILE, []);
  res.json({ announcements: local });
});

networkRouter.post('/announcements', rateLimit(25), async (req: AuthenticatedRequest, res: Response) => {
  const actor = await resolveCeoOrModerator(req);
  if (
    !actor.authorized ||
    (!actor.isCeo && !actor.moderator?.permissions.includes('manage_announcements'))
  ) {
    return res.status(403).json({
      error: 'Forbidden: Only CEO, Admin, or approved Campus Representatives may publish official announcements.'
    });
  }

  const {
    title,
    body,
    category,
    audienceScope,
    targetInstitutionIds,
    targetStates,
    singleInstitutionId,
    isPinned,
    isUrgent,
    imageUrl
  } = req.body || {};

  if (!title || !body || !audienceScope) {
    return res.status(400).json({ error: 'title, body, and audienceScope are required.' });
  }

  // Enforce institution/state boundary if published by a Campus Representative
  if (!actor.isCeo && actor.moderator) {
    const mod = actor.moderator;
    if (audienceScope === 'all_universities' || audienceScope === 'all_polytechnics') {
      return res.status(403).json({
        error: 'Campus Representatives may only target their assigned institution or state.'
      });
    }
    if (mod.assignedInstitutionId && audienceScope === 'single_institution' && singleInstitutionId !== mod.assignedInstitutionId) {
      return res.status(403).json({
        error: `You are assigned to publish announcements only for institution "${mod.assignedInstitutionId}".`
      });
    }
  }

  const now = new Date().toISOString();
  const id = `nuh_ann_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const announcement = {
    id,
    title: String(title).trim().slice(0, 160),
    body: String(body).trim().slice(0, 3000),
    category: String(category || 'Campus Event'),
    audienceScope,
    ...(Array.isArray(targetInstitutionIds) && targetInstitutionIds.length > 0
      ? { targetInstitutionIds }
      : {}),
    ...(Array.isArray(targetStates) && targetStates.length > 0 ? { targetStates } : {}),
    ...(singleInstitutionId ? { singleInstitutionId: String(singleInstitutionId) } : {}),
    authorId: actor.uid,
    authorName: actor.isCeo
      ? 'CEO Office — NIGERIA UNIVERSITY HUB'
      : actor.moderator?.name || 'Campus Representative',
    authorRole: actor.isCeo ? 'ceo' : 'campus_representative',
    isPinned: Boolean(isPinned && actor.isCeo),
    isUrgent: Boolean(isUrgent),
    ...(imageUrl ? { imageUrl: String(imageUrl).trim() } : {}),
    status: 'published',
    createdAt: now,
    updatedAt: now
  };

  let firestoreSaved = false;
  if (actor.isCeo && actor.fbIdToken) {
    try {
      await setFirestoreDocument('nationalAnnouncements', id, announcement, false, undefined, actor.fbIdToken);
      firestoreSaved = true;
    } catch (err) {
      console.warn('[nationalAnnouncements Firestore save warning]:', formatServerFirestoreError(err).message);
    }
  }

  if (!firestoreSaved) {
    const local = readJsonFile<any[]>(ANNOUNCEMENTS_FALLBACK_FILE, []);
    local.unshift(announcement);
    writeJsonFile(ANNOUNCEMENTS_FALLBACK_FILE, local.slice(0, 200));
  }

  ceoStore.recordSecurityLog({
    eventType: 'CEO_SETTINGS_UPDATED',
    severity: 'info',
    actorEmail: actor.email,
    actorUid: actor.uid,
    targetType: 'national_announcement',
    targetId: id,
    ipAddress: getClientIp(req),
    summary: `Published targeted announcement "${announcement.title}" (scope=${audienceScope}).`
  });

  res.status(201).json({ success: true, announcement, firestoreSaved });
});

networkRouter.delete('/announcements/:id', rateLimit(25), async (req: AuthenticatedRequest, res: Response) => {
  const actor = await resolveCeoOrModerator(req);
  if (
    !actor.authorized ||
    (!actor.isCeo && !actor.moderator?.permissions.includes('manage_announcements'))
  ) {
    return res.status(403).json({ error: 'Forbidden.' });
  }

  const annId = String(req.params.id || '').trim();
  const local = readJsonFile<any[]>(ANNOUNCEMENTS_FALLBACK_FILE, []);
  const nextLocal = local.filter((a) => a.id !== annId);
  if (nextLocal.length !== local.length) {
    writeJsonFile(ANNOUNCEMENTS_FALLBACK_FILE, nextLocal);
  }

  if (actor.isCeo && actor.fbIdToken) {
    await deleteFirestoreDocument('nationalAnnouncements', annId, undefined, actor.fbIdToken).catch(() => {});
  }

  res.json({ success: true });
});
