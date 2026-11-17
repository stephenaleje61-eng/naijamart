import crypto from 'crypto';
import { Router, Request, Response, NextFunction } from 'express';
import {
  AuthenticatedRequest,
  getClientIp,
  requireCeoAdmin,
  requireCeoRecentReauth
} from '../auth.js';
import { ceoStore, ServerInstitutionGradingConfig } from '../ceoStore.js';
import { formatServerFirestoreError, setFirestoreDocument } from '../firestore.js';

const router = Router();

// Simple in-memory sliding-window rate limiter per IP for write actions
const writeBuckets = new Map<string, number[]>();
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX_WRITES = 45;

function writeRateLimit(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIp(req);
  const now = Date.now();
  const timestamps = (writeBuckets.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (timestamps.length >= RATE_MAX_WRITES) {
    return res.status(429).json({
      error: 'Too many requests in a short window. Please wait a moment and try again.'
    });
  }
  timestamps.push(now);
  writeBuckets.set(ip, timestamps);
  next();
}

// Track referral registrations in-memory for instant server-side duplicate / self-referral abuse checks
const referralHistory: Array<{
  referrerUid: string;
  referredUid: string;
  referredEmail: string;
  ipAddress: string;
  createdAt: string;
}> = [];

router.post('/validate-referral', writeRateLimit, (req: Request, res: Response) => {
  const { referrerUid, referredUid, referredEmail, referrerEmail } = req.body || {};
  const cleanReferrerUid = String(referrerUid || '').trim();
  const cleanReferredUid = String(referredUid || '').trim();
  const cleanReferredEmail = String(referredEmail || '').trim().toLowerCase();
  const cleanReferrerEmail = String(referrerEmail || '').trim().toLowerCase();
  const ipAddress = getClientIp(req);

  if (!cleanReferrerUid || !cleanReferredUid || !cleanReferredEmail) {
    return res.status(400).json({ valid: false, reason: 'Missing required referral fields.' });
  }

  if (cleanReferrerUid === cleanReferredUid) {
    return res.status(400).json({
      valid: false,
      flagged: true,
      reason: 'Self-referrals are not permitted.'
    });
  }

  if (cleanReferrerEmail && cleanReferrerEmail === cleanReferredEmail) {
    return res.status(400).json({
      valid: false,
      flagged: true,
      reason: 'Referrer and referred account cannot share the same email address.'
    });
  }

  const alreadyReferred = referralHistory.some(
    (r) => r.referredUid === cleanReferredUid || r.referredEmail === cleanReferredEmail
  );
  if (alreadyReferred) {
    return res.status(409).json({
      valid: false,
      flagged: true,
      reason: 'This account has already claimed a referral reward.'
    });
  }

  // Flag excessive signups from identical IP within 24h
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const recentSameIp = referralHistory.filter(
    (r) => r.ipAddress === ipAddress && new Date(r.createdAt).getTime() > oneDayAgo
  ).length;

  referralHistory.unshift({
    referrerUid: cleanReferrerUid,
    referredUid: cleanReferredUid,
    referredEmail: cleanReferredEmail,
    ipAddress,
    createdAt: new Date().toISOString()
  });
  if (referralHistory.length > 2000) referralHistory.length = 2000;

  if (recentSameIp >= 5) {
    return res.json({
      valid: true,
      flagged: true,
      status: 'flagged_abuse',
      reason: 'Multiple referrals detected from the same network in 24h; queued for CEO review.'
    });
  }

  return res.json({
    valid: true,
    flagged: false,
    status: 'verified'
  });
});

// Public: List all admin-configured institution grading scales
router.get('/grading-configs', (_req: Request, res: Response) => {
  const configs = Object.values(ceoStore.getData().gradingConfigs || {});
  res.json({ configs });
});

router.get('/grading-configs/:institutionId', (req: Request, res: Response) => {
  const instId = String(req.params.institutionId || '').trim().toLowerCase();
  const config = ceoStore.getData().gradingConfigs?.[instId] || null;
  res.json({ config });
});

// CEO-only: Create or update an institution's grading configuration
router.put(
  '/ceo/grading-configs/:institutionId',
  requireCeoAdmin,
  requireCeoRecentReauth(),
  (req: AuthenticatedRequest, res: Response) => {
    const fbUser = req.firebaseUser!;
    const instId = String(req.params.institutionId || '').trim().toLowerCase();
    if (!instId) {
      return res.status(400).json({ error: 'Valid institutionId is required.' });
    }

    const { scaleMax, isVerifiedOfficial, scaleLabel, grades } = req.body || {};
    if (!Array.isArray(grades) || grades.length === 0) {
      return res.status(400).json({ error: 'Grades array cannot be empty.' });
    }

    const sanitizedGrades = grades.map((g: any) => ({
      letter: String(g.letter || 'A').trim().toUpperCase().slice(0, 4),
      minScore: Math.max(0, Math.min(100, Number(g.minScore) || 0)),
      maxScore: Math.max(0, Math.min(100, Number(g.maxScore) || 100)),
      point: Math.max(0, Math.min(5, Number(g.point) || 0))
    }));

    const config: ServerInstitutionGradingConfig = {
      id: instId,
      institutionId: instId,
      scaleMax: scaleMax === 4 ? 4 : 5,
      isVerifiedOfficial: Boolean(isVerifiedOfficial),
      scaleLabel: String(scaleLabel || `${instId.toUpperCase()} Custom Scale`).slice(0, 140),
      grades: sanitizedGrades,
      updatedByEmail: fbUser.email,
      updatedAt: new Date().toISOString()
    };

    const data = ceoStore.getData();
    if (!data.gradingConfigs) data.gradingConfigs = {};
    data.gradingConfigs[instId] = config;
    ceoStore.save();

    ceoStore.recordSecurityLog({
      eventType: 'CEO_SETTINGS_UPDATED',
      severity: 'info',
      actorEmail: fbUser.email,
      actorUid: fbUser.uid,
      targetType: 'institution_grading_config',
      targetId: instId,
      ipAddress: getClientIp(req),
      summary: `CEO updated grading scale for ${instId} (${config.scaleMax}.0, verifiedOfficial=${config.isVerifiedOfficial}).`
    });

    res.json({ config });
  }
);

// Public: Subscribe email address to NIGERIA CAMPUS MARKET newsletter
router.post('/newsletter', writeRateLimit, async (req: Request, res: Response) => {
  const rawEmail = String(req.body?.email || '').trim().toLowerCase();
  const source = String(req.body?.source || 'footer').trim().slice(0, 64) || 'footer';

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!rawEmail || rawEmail.length > 160 || !emailRegex.test(rawEmail)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const subscriberId = `sub_${crypto.createHash('sha256').update(rawEmail).digest('hex').slice(0, 24)}`;
  const payload = {
    id: subscriberId,
    email: rawEmail,
    source,
    createdAt: new Date().toISOString()
  };

  try {
    await setFirestoreDocument('newsletterSubscribers', subscriberId, payload, true);
    return res.status(201).json({
      success: true,
      message: 'Subscribed! You will receive verified campus deals and university updates.',
      subscriberId
    });
  } catch (err: any) {
    const formatted = formatServerFirestoreError(err);
    console.error('[Newsletter] Failed to save subscription:', formatted.message);
    return res.status(500).json({ error: 'Unable to save subscription right now. Please try again.' });
  }
});

export default router;
