import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { db, User } from './db.js';
import { verifyFirebaseIdTokenCryptographic, CryptographicFirebaseUser } from './firebaseAdmin.js';
import { ceoStore } from './ceoStore.js';

const JWT_SECRET = process.env.JWT_SECRET || 'naijamart-super-secret-production-key-2026';
export const CEO_EMAIL = 'stephenaleje61@gmail.com';
export const CEO_PHONE = '08167258121';
export const CEO_ROLE_LABEL = 'CEO SUPER ADMINISTRATOR';

export interface AuthPayload {
  userId: string;
  email: string;
  role: 'buyer' | 'seller' | 'admin';
  name: string;
}

export interface CeoSessionPayload {
  type: 'ceo_session';
  uid: string;
  email: string;
  role: 'CEO_SUPER_ADMIN';
  phoneVerified: boolean;
  reauthAt: number;
  issuedAt: number;
  exp: number;
}

export function normalizeNigerianPhone(raw?: string): string {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('234') && digits.length === 13) {
    return `0${digits.slice(3)}`;
  }
  if (digits.length === 10 && !digits.startsWith('0')) {
    return `0${digits}`;
  }
  return digits;
}

export function generateToken(payload: AuthPayload): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 })).toString('base64url');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');

    if (signature !== expectedSig) return null;

    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    if (payload.type === 'ceo_session') return null;
    if (payload.exp && payload.exp < Date.now()) {
      return null;
    }
    return payload as AuthPayload;
  } catch {
    return null;
  }
}

export function generateCeoSessionToken(params: {
  uid: string;
  email: string;
  phoneVerified: boolean;
  sessionTimeoutMinutes?: number;
  reauthAt?: number;
}): { token: string; payload: CeoSessionPayload } {
  const now = Date.now();
  const minutes = Math.max(10, Math.min(240, params.sessionTimeoutMinutes || 60));
  const payload: CeoSessionPayload = {
    type: 'ceo_session',
    uid: params.uid,
    email: params.email.toLowerCase().trim(),
    role: 'CEO_SUPER_ADMIN',
    phoneVerified: params.phoneVerified,
    reauthAt: params.reauthAt || now,
    issuedAt: now,
    exp: now + minutes * 60 * 1000
  };
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  return { token: `${header}.${body}.${signature}`, payload };
}

export function verifyCeoSessionToken(token: string): CeoSessionPayload | null {
  try {
    const parts = String(token || '').trim().split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');

    if (signature !== expectedSig) return null;

    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    if (
      payload?.type !== 'ceo_session' ||
      payload?.role !== 'CEO_SUPER_ADMIN' ||
      String(payload?.email || '').toLowerCase().trim() !== CEO_EMAIL
    ) {
      return null;
    }
    if (!payload.exp || payload.exp < Date.now()) {
      return null;
    }
    return payload as CeoSessionPayload;
  } catch {
    return null;
  }
}

export type VerifiedFirebaseUser = CryptographicFirebaseUser;

export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedFirebaseUser | null> {
  return verifyFirebaseIdTokenCryptographic(idToken);
}

export function getClientIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.trim()) {
    return fwd.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || 'unknown';
}

export interface AuthenticatedRequest extends Request {
  user?: User;
  ceoSession?: CeoSessionPayload;
  firebaseUser?: VerifiedFirebaseUser;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }

  const user = db.users.find(u => u.id === payload.userId);
  if (!user) {
    return res.status(401).json({ error: 'User account not found.' });
  }

  req.user = user;
  next();
}

export function requireSeller(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (!req.user || (req.user.role !== 'seller' && req.user.role !== 'admin')) {
      return res.status(403).json({ error: 'Seller account required to perform this action.' });
    }
    next();
  });
}

export async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const ipAddress = getClientIp(req);
  const userAgent = String(req.headers['user-agent'] || '').slice(0, 200);

  // 1. Check cryptographic Firebase ID token for the authorized administrator account
  const rawFbHeader = req.headers['x-firebase-id-token'];
  const fbIdToken = typeof rawFbHeader === 'string' ? rawFbHeader.trim() : '';
  if (fbIdToken) {
    const fbUser = await verifyFirebaseIdToken(fbIdToken);
    if (!fbUser) {
      ceoStore.recordSecurityLog({
        eventType: 'UNAUTHORIZED_CEO_ACCESS',
        severity: 'warning',
        ipAddress,
        userAgent,
        summary: `Rejected invalid/expired Firebase token on admin route ${req.method} ${req.originalUrl}.`
      });
      return res.status(401).json({ error: 'Invalid or expired Firebase authentication token.' });
    }
    if (
      fbUser.email.toLowerCase().trim() !== CEO_EMAIL ||
      !fbUser.emailVerified ||
      fbUser.ceoAdminClaim === false
    ) {
      ceoStore.recordSecurityLog({
        eventType: 'UNAUTHORIZED_CEO_ACCESS',
        severity: 'critical',
        actorEmail: fbUser.email,
        actorUid: fbUser.uid,
        ipAddress,
        userAgent,
        summary: `Blocked unauthorized user (${fbUser.email}, verified=${fbUser.emailVerified}) from admin route ${req.method} ${req.originalUrl}.`
      });
      return res.status(403).json({
        error: 'Access Denied: Only the verified NIGERIA CAMPUS MARKET administrator account can access admin controls.'
      });
    }
    req.firebaseUser = fbUser;
    req.user = {
      id: fbUser.uid,
      name: fbUser.displayName || 'NIGERIA CAMPUS MARKET CEO',
      email: fbUser.email,
      passwordHash: '',
      role: 'admin',
      createdAt: new Date().toISOString()
    };
    return next();
  }

  // 2. Reject any Express JWT whose email is not the authorized administrator
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    const ceoSession = verifyCeoSessionToken(token);
    if (ceoSession && ceoSession.email.toLowerCase().trim() === CEO_EMAIL) {
      req.ceoSession = ceoSession;
      req.user = {
        id: ceoSession.uid,
        name: 'NIGERIA CAMPUS MARKET CEO',
        email: ceoSession.email,
        passwordHash: '',
        role: 'admin',
        createdAt: new Date().toISOString()
      };
      return next();
    }

    const payload = verifyToken(token);
    if (payload) {
      const user = db.users.find((u) => u.id === payload.userId);
      if (user && user.role === 'admin' && user.email.toLowerCase().trim() === CEO_EMAIL) {
        req.user = user;
        return next();
      }
      ceoStore.recordSecurityLog({
        eventType: 'UNAUTHORIZED_CEO_ACCESS',
        severity: 'critical',
        actorEmail: payload.email,
        actorUid: payload.userId,
        ipAddress,
        userAgent,
        summary: `Blocked non-administrator account (${payload.email}) from accessing admin route ${req.method} ${req.originalUrl}.`
      });
      return res.status(403).json({
        error: 'Access Denied: Ordinary accounts cannot access administrator endpoints.'
      });
    }
  }

  return res.status(401).json({
    error: 'Administrator authentication required. Please sign in with the authorized administrator account.'
  });
}

/**
 * STRICT CEO-ONLY GUARD:
 * - Rejects ordinary Express 'admin', 'seller', or 'buyer' JWT tokens with HTTP 403.
 * - Requires a valid cryptographic Firebase ID Token belonging to verified CEO_EMAIL (stephenaleje61@gmail.com).
 * - If Firebase Admin custom claim `ceoAdmin` is explicitly false, rejects with HTTP 403.
 * - Also verifies `x-ceo-session` token when supplied (enforcing session expiration).
 * - Records every unauthorized access attempt into CeoSecurityStore.
 */
export async function requireCeoAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const ipAddress = getClientIp(req);
  const userAgent = String(req.headers['user-agent'] || '').slice(0, 200);

  // Reject standard marketplace buyer/seller/regular-admin JWTs outright
  const authHeader = req.headers.authorization;
  let bearerCeoSession: CeoSessionPayload | null = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearerToken = authHeader.substring(7).trim();
    const regularUser = verifyToken(bearerToken);
    if (regularUser) {
      ceoStore.recordSecurityLog({
        eventType: 'UNAUTHORIZED_CEO_ACCESS',
        severity: 'critical',
        actorEmail: regularUser.email,
        actorUid: regularUser.userId,
        ipAddress,
        userAgent,
        summary: `Blocked ${regularUser.role} account (${regularUser.email}) from accessing CEO endpoint ${req.method} ${req.originalUrl}.`
      });
      return res.status(403).json({
        error: 'Forbidden: Only the authorized NIGERIA UNIVERSITY HUB CEO SUPER ADMINISTRATOR may perform this action.'
      });
    }
    bearerCeoSession = verifyCeoSessionToken(bearerToken);
  }

  const rawCeoHeader = req.headers['x-ceo-session'];
  const ceoSessionToken = typeof rawCeoHeader === 'string' ? rawCeoHeader.trim() : '';
  const parsedCeoSession = ceoSessionToken ? verifyCeoSessionToken(ceoSessionToken) : bearerCeoSession;

  if (ceoSessionToken && !parsedCeoSession) {
    ceoStore.recordSecurityLog({
      eventType: 'CEO_SESSION_EXPIRED',
      severity: 'warning',
      ipAddress,
      userAgent,
      summary: `Rejected expired or tampered CEO session token on ${req.method} ${req.originalUrl}.`
    });
    return res.status(401).json({
      error: 'CEO session expired or invalid. Please sign in again via NIGERIA UNIVERSITY HUB CEO ADMIN LOGIN.'
    });
  }

  const rawFbHeader = req.headers['x-firebase-id-token'];
  const fbIdToken = typeof rawFbHeader === 'string' ? rawFbHeader.trim() : '';

  if (!fbIdToken) {
    return res.status(401).json({
      error: 'CEO Firebase authentication required. Please sign in at NIGERIA UNIVERSITY HUB CEO ADMIN LOGIN.'
    });
  }

  const fbUser = await verifyFirebaseIdToken(fbIdToken);
  if (!fbUser) {
    ceoStore.recordSecurityLog({
      eventType: 'UNAUTHORIZED_CEO_ACCESS',
      severity: 'warning',
      ipAddress,
      userAgent,
      summary: `Rejected invalid/expired Firebase ID token on CEO route ${req.method} ${req.originalUrl}.`
    });
    return res.status(401).json({
      error: 'Invalid or expired Firebase authentication token.'
    });
  }

  const normalizedEmail = fbUser.email.toLowerCase().trim();
  if (normalizedEmail !== CEO_EMAIL || !fbUser.emailVerified || fbUser.ceoAdminClaim === false) {
    ceoStore.recordSecurityLog({
      eventType: 'UNAUTHORIZED_CEO_ACCESS',
      severity: 'critical',
      actorEmail: fbUser.email,
      actorUid: fbUser.uid,
      ipAddress,
      userAgent,
      summary: `Denied non-CEO Firebase user (${fbUser.email}, verified=${fbUser.emailVerified}) attempting ${req.method} ${req.originalUrl}.`
    });
    return res.status(403).json({
      error: 'Forbidden: Account is not the authorized NIGERIA UNIVERSITY HUB CEO SUPER ADMINISTRATOR.'
    });
  }

  if (parsedCeoSession && parsedCeoSession.uid !== fbUser.uid) {
    ceoStore.recordSecurityLog({
      eventType: 'UNAUTHORIZED_CEO_ACCESS',
      severity: 'critical',
      actorEmail: fbUser.email,
      actorUid: fbUser.uid,
      ipAddress,
      userAgent,
      summary: `CEO session UID mismatch detected on ${req.method} ${req.originalUrl}.`
    });
    return res.status(403).json({
      error: 'Forbidden: CEO session identity mismatch.'
    });
  }

  req.firebaseUser = fbUser;
  req.ceoSession = parsedCeoSession || undefined;
  req.user = {
    id: fbUser.uid,
    name: fbUser.displayName || 'NIGERIA UNIVERSITY HUB CEO',
    email: fbUser.email,
    passwordHash: '',
    role: 'admin',
    createdAt: new Date().toISOString()
  };
  return next();
}

export function requireCeoRecentReauth(maxAgeMinutes?: number) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const settings = ceoStore.getData().ceoSettings;
    const windowMins = maxAgeMinutes || settings.reauthWindowMinutes || 10;
    const maxAgeMs = windowMins * 60 * 1000;

    const fbAuthTimeMs = req.firebaseUser?.authTime ? req.firebaseUser.authTime * 1000 : 0;
    const sessionReauthMs = req.ceoSession?.reauthAt || 0;
    const latestReauthMs = Math.max(fbAuthTimeMs, sessionReauthMs);

    if (!latestReauthMs || Date.now() - latestReauthMs > maxAgeMs) {
      return res.status(428).json({
        code: 'CEO_REAUTH_REQUIRED',
        error: `Sensitive CEO action requires recent identity reauthentication (within the last ${windowMins} minutes).`
      });
    }
    return next();
  };
}


