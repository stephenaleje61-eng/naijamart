import { Router, Request, Response } from 'express';
import {
  CEO_EMAIL,
  CEO_PHONE,
  CEO_ROLE_LABEL,
  AuthenticatedRequest,
  generateCeoSessionToken,
  getClientIp,
  normalizeNigerianPhone,
  requireCeoAdmin,
  requireCeoRecentReauth,
  verifyFirebaseIdToken
} from '../auth.js';
import { ensureCeoCustomClaim, isFirebaseAdminConfigured } from '../firebaseAdmin.js';
import { ceoStore } from '../ceoStore.js';
import { db } from '../db.js';

const router = Router();

// Public read-only verification logo config for public VERIFIED BY FU MARKET CEO badges
router.get('/verification-config', (_req: Request, res: Response) => {
  const data = ceoStore.getData();
  res.json({
    config: data.verificationConfig
  });
});

// Check brute-force lockout status before login attempt
router.get('/session/lockout-status', (req: Request, res: Response) => {
  const ip = getClientIp(req);
  const emailHint = String(req.query.email || CEO_EMAIL).toLowerCase().trim();
  const ipStatus = ceoStore.getLockoutStatus(`ip:${ip}`);
  const emailStatus = ceoStore.getLockoutStatus(`email:${emailHint}`);

  const locked = ipStatus.locked || emailStatus.locked;
  const remainingSeconds = Math.max(ipStatus.remainingSeconds, emailStatus.remainingSeconds);
  const attempts = Math.max(ipStatus.attempts, emailStatus.attempts);

  res.json({
    locked,
    remainingSeconds,
    attempts,
    maxAttempts: ceoStore.getData().ceoSettings.maxFailedLoginAttempts
  });
});

// Verify Firebase ID token for exclusive CEO login + optional phone identity check
router.post('/session/verify', async (req: Request, res: Response) => {
  const ipAddress = getClientIp(req);
  const userAgent = String(req.headers['user-agent'] || '').slice(0, 200);
  const { idToken, phone } = req.body || {};

  const ipLock = ceoStore.getLockoutStatus(`ip:${ipAddress}`);
  const ceoEmailLock = ceoStore.getLockoutStatus(`email:${CEO_EMAIL}`);
  if (ipLock.locked || ceoEmailLock.locked) {
    const remainingSeconds = Math.max(ipLock.remainingSeconds, ceoEmailLock.remainingSeconds);
    return res.status(429).json({
      error: `Too many failed CEO login attempts. Please wait ${Math.ceil(remainingSeconds / 60)} minute(s) before trying again.`,
      locked: true,
      remainingSeconds
    });
  }

  const rawToken =
    typeof idToken === 'string' && idToken.trim()
      ? idToken.trim()
      : typeof req.headers['x-firebase-id-token'] === 'string'
        ? req.headers['x-firebase-id-token'].trim()
        : '';

  if (!rawToken) {
    const failure = ceoStore.registerFailedAttempt(`ip:${ipAddress}`);
    ceoStore.recordSecurityLog({
      eventType: failure.locked ? 'CEO_LOGIN_LOCKOUT' : 'CEO_LOGIN_FAILED',
      severity: failure.locked ? 'critical' : 'warning',
      ipAddress,
      userAgent,
      summary: 'Rejected CEO session verification attempt with missing Firebase ID token.'
    });
    return res.status(failure.locked ? 429 : 401).json({
      error: 'Valid Firebase authentication token is required.',
      locked: failure.locked,
      remainingSeconds: failure.remainingSeconds
    });
  }

  const fbUser = await verifyFirebaseIdToken(rawToken);
  if (!fbUser) {
    const failure = ceoStore.registerFailedAttempt(`ip:${ipAddress}`);
    ceoStore.recordSecurityLog({
      eventType: failure.locked ? 'CEO_LOGIN_LOCKOUT' : 'CEO_LOGIN_FAILED',
      severity: failure.locked ? 'critical' : 'warning',
      ipAddress,
      userAgent,
      summary: 'Rejected invalid or tampered Firebase ID token during CEO verification.'
    });
    return res.status(failure.locked ? 429 : 401).json({
      error: 'Invalid or expired Firebase authentication token.',
      locked: failure.locked,
      remainingSeconds: failure.remainingSeconds
    });
  }

  const normalizedEmail = fbUser.email.toLowerCase().trim();
  if (normalizedEmail !== CEO_EMAIL || !fbUser.emailVerified || fbUser.ceoAdminClaim === false) {
    const ipFail = ceoStore.registerFailedAttempt(`ip:${ipAddress}`);
    ceoStore.registerFailedAttempt(`email:${normalizedEmail}`);
    ceoStore.recordSecurityLog({
      eventType: ipFail.locked ? 'CEO_LOGIN_LOCKOUT' : 'UNAUTHORIZED_CEO_ACCESS',
      severity: 'critical',
      actorEmail: fbUser.email,
      actorUid: fbUser.uid,
      ipAddress,
      userAgent,
      summary: `Blocked non-CEO Firebase account "${fbUser.email}" (emailVerified=${fbUser.emailVerified}) from CEO login.`
    });
    return res.status(ipFail.locked ? 429 : 403).json({
      error: 'Access Denied: Only the verified FU MARKET CEO SUPER ADMINISTRATOR account may sign in here.',
      locked: ipFail.locked,
      remainingSeconds: ipFail.remainingSeconds
    });
  }

  const settings = ceoStore.getData().ceoSettings;
  const suppliedPhone = normalizeNigerianPhone(phone);
  if (settings.requirePhoneCheckOnLogin && !suppliedPhone) {
    return res.status(400).json({
      error: 'Additional CEO phone verification is enabled. Please enter the authorized CEO phone number.'
    });
  }

  let phoneVerified = false;
  if (suppliedPhone) {
    if (suppliedPhone !== CEO_PHONE) {
      const fail = ceoStore.registerFailedAttempt(`email:${CEO_EMAIL}`);
      ceoStore.recordSecurityLog({
        eventType: fail.locked ? 'CEO_LOGIN_LOCKOUT' : 'CEO_LOGIN_FAILED',
        severity: 'critical',
        actorEmail: fbUser.email,
        actorUid: fbUser.uid,
        ipAddress,
        userAgent,
        summary: 'CEO login blocked due to mismatched phone verification number.'
      });
      return res.status(fail.locked ? 429 : 403).json({
        error: 'Authorized CEO phone check failed.',
        locked: fail.locked,
        remainingSeconds: fail.remainingSeconds
      });
    }
    phoneVerified = true;
  }

  // Success: clear brute-force counters
  ceoStore.clearFailedAttempts(`ip:${ipAddress}`);
  ceoStore.clearFailedAttempts(`email:${CEO_EMAIL}`);

  const claimResult = await ensureCeoCustomClaim(fbUser.uid, fbUser.email, CEO_EMAIL);
  const { token, payload } = generateCeoSessionToken({
    uid: fbUser.uid,
    email: fbUser.email,
    phoneVerified,
    sessionTimeoutMinutes: settings.sessionTimeoutMinutes,
    reauthAt: Date.now()
  });

  ceoStore.recordSecurityLog({
    eventType: 'CEO_LOGIN_SUCCESS',
    severity: 'info',
    actorEmail: fbUser.email,
    actorUid: fbUser.uid,
    ipAddress,
    userAgent,
    summary: `CEO authenticated successfully (${fbUser.verificationMethod}, phoneCheck=${phoneVerified ? 'verified' : 'skipped'}).`
  });

  res.json({
    authorized: true,
    role: CEO_ROLE_LABEL,
    email: fbUser.email,
    uid: fbUser.uid,
    phoneVerified,
    ceoSessionToken: token,
    sessionExpiresAt: payload.exp,
    reauthAt: payload.reauthAt,
    verificationMethod: fbUser.verificationMethod,
    customClaim: claimResult,
    settings
  });
});

// Sensitive action reauthentication
router.post('/session/reauth', requireCeoAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const fbUser = req.firebaseUser!;
  const ipAddress = getClientIp(req);
  const userAgent = String(req.headers['user-agent'] || '').slice(0, 200);
  const { phone } = req.body || {};

  if (phone) {
    const normalized = normalizeNigerianPhone(phone);
    if (normalized !== CEO_PHONE) {
      ceoStore.recordSecurityLog({
        eventType: 'CEO_LOGIN_FAILED',
        severity: 'warning',
        actorEmail: fbUser.email,
        actorUid: fbUser.uid,
        ipAddress,
        userAgent,
        summary: 'CEO sensitive-action reauthentication rejected due to phone mismatch.'
      });
      return res.status(403).json({ error: 'Authorized CEO phone number did not match.' });
    }
  }

  // Require Firebase auth_time within last 5 minutes for true password/Google reauth proof
  const authAgeMs = fbUser.authTime ? Date.now() - fbUser.authTime * 1000 : 0;
  if (fbUser.authTime && authAgeMs > 5 * 60 * 1000) {
    return res.status(401).json({
      error: 'Please complete fresh Firebase password/Google reauthentication to verify your identity.'
    });
  }

  const settings = ceoStore.getData().ceoSettings;
  const { token, payload } = generateCeoSessionToken({
    uid: fbUser.uid,
    email: fbUser.email,
    phoneVerified: Boolean(phone || req.ceoSession?.phoneVerified),
    sessionTimeoutMinutes: settings.sessionTimeoutMinutes,
    reauthAt: Date.now()
  });

  ceoStore.recordSecurityLog({
    eventType: 'CEO_SENSITIVE_REAUTH',
    severity: 'info',
    actorEmail: fbUser.email,
    actorUid: fbUser.uid,
    ipAddress,
    userAgent,
    summary: 'CEO completed sensitive-action identity reauthentication.'
  });

  res.json({
    ceoSessionToken: token,
    sessionExpiresAt: payload.exp,
    reauthAt: payload.reauthAt
  });
});

// Record failed Firebase Auth login attempt for rate limiting & security audit log
router.post('/session/failed-attempt', (req: Request, res: Response) => {
  const ipAddress = getClientIp(req);
  const userAgent = String(req.headers['user-agent'] || '').slice(0, 200);
  const { email, reason } = req.body || {};
  const normalizedEmail = String(email || 'unknown').toLowerCase().trim().slice(0, 120);

  const ipFail = ceoStore.registerFailedAttempt(`ip:${ipAddress}`);
  const emailFail = normalizedEmail
    ? ceoStore.registerFailedAttempt(`email:${normalizedEmail}`)
    : ipFail;

  const locked = ipFail.locked || emailFail.locked;
  const remainingSeconds = Math.max(ipFail.remainingSeconds, emailFail.remainingSeconds);

  ceoStore.recordSecurityLog({
    eventType: locked ? 'CEO_LOGIN_LOCKOUT' : 'CEO_LOGIN_FAILED',
    severity: locked ? 'critical' : 'warning',
    actorEmail: normalizedEmail,
    ipAddress,
    userAgent,
    summary: `Failed CEO login attempt (${String(reason || 'invalid credentials').slice(0, 120)}). Attempts: ${Math.max(ipFail.attempts, emailFail.attempts)}/${ipFail.maxAttempts}.`
  });

  res.status(locked ? 429 : 200).json({
    locked,
    remainingSeconds,
    attempts: Math.max(ipFail.attempts, emailFail.attempts),
    maxAttempts: ipFail.maxAttempts
  });
});

// Record CEO logout
router.post('/session/logout', requireCeoAdmin, (req: AuthenticatedRequest, res: Response) => {
  const fbUser = req.firebaseUser!;
  ceoStore.recordSecurityLog({
    eventType: 'CEO_LOGOUT',
    severity: 'info',
    actorEmail: fbUser.email,
    actorUid: fbUser.uid,
    ipAddress: getClientIp(req),
    summary: 'CEO signed out securely.'
  });
  res.json({ success: true });
});

// Record unauthorized access event from frontend guards
router.post('/security-event', (req: Request, res: Response) => {
  const ipAddress = getClientIp(req);
  const userAgent = String(req.headers['user-agent'] || '').slice(0, 200);
  const { actorEmail, path: routePath, summary } = req.body || {};

  ceoStore.recordSecurityLog({
    eventType: 'UNAUTHORIZED_CEO_ACCESS',
    severity: 'warning',
    actorEmail: typeof actorEmail === 'string' ? actorEmail.slice(0, 140) : 'anonymous',
    ipAddress,
    userAgent,
    targetId: typeof routePath === 'string' ? routePath.slice(0, 120) : '/ceo-admin',
    summary:
      typeof summary === 'string' && summary.trim()
        ? summary.trim().slice(0, 300)
        : `Unauthorized attempt to access restricted CEO route (${String(routePath || '/ceo-admin').slice(0, 80)}).`
  });

  res.status(202).json({ logged: true });
});

// Protected: Get CEO Security Logs & Settings
router.get('/security-logs', requireCeoAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const data = ceoStore.getData();
  res.json({
    securityLogs: data.securityLogs,
    verificationLogs: data.verificationLogs,
    settings: data.ceoSettings,
    adminSdkConfigured: isFirebaseAdminConfigured()
  });
});

router.get('/settings', requireCeoAdmin, (_req: AuthenticatedRequest, res: Response) => {
  res.json({
    settings: ceoStore.getData().ceoSettings,
    verificationConfig: ceoStore.getData().verificationConfig,
    adminSdkConfigured: isFirebaseAdminConfigured()
  });
});

router.put(
  '/settings',
  requireCeoAdmin,
  requireCeoRecentReauth(),
  (req: AuthenticatedRequest, res: Response) => {
    const updated = ceoStore.updateSettings(req.body || {});
    ceoStore.recordSecurityLog({
      eventType: 'CEO_SETTINGS_UPDATED',
      severity: 'info',
      actorEmail: req.firebaseUser!.email,
      actorUid: req.firebaseUser!.uid,
      ipAddress: getClientIp(req),
      summary: `CEO updated session timeout (${updated.sessionTimeoutMinutes}m), phoneCheck=${updated.requirePhoneCheckOnLogin}.`
    });
    res.json({ settings: updated });
  }
);

// Protected + Sensitive Reauth: Set or update Official CEO Verification Logo
router.post(
  '/verification-logo',
  requireCeoAdmin,
  requireCeoRecentReauth(),
  (req: AuthenticatedRequest, res: Response) => {
    const { logoUrl } = req.body || {};
    if (!logoUrl || typeof logoUrl !== 'string' || !logoUrl.trim()) {
      return res.status(400).json({ error: 'Valid verification logo URL is required.' });
    }

    const fbUser = req.firebaseUser!;
    const config = ceoStore.setVerificationLogo(logoUrl.trim(), fbUser.email);

    ceoStore.recordVerificationLog({
      action: 'LOGO_UPDATED',
      targetType: 'verification_logo',
      targetId: 'ceo_verification',
      targetName: 'Official CEO Verification Logo',
      ceoEmail: fbUser.email
    });

    ceoStore.recordSecurityLog({
      eventType: 'CEO_LOGO_UPDATED',
      severity: 'info',
      actorEmail: fbUser.email,
      actorUid: fbUser.uid,
      ipAddress: getClientIp(req),
      summary: 'CEO uploaded or updated the official FU MARKET verification logo.'
    });

    res.json({ config });
  }
);

// Protected + Sensitive Reauth: Remove Official CEO Verification Logo
router.delete(
  '/verification-logo',
  requireCeoAdmin,
  requireCeoRecentReauth(),
  (req: AuthenticatedRequest, res: Response) => {
    const fbUser = req.firebaseUser!;
    const config = ceoStore.setVerificationLogo('', fbUser.email);

    ceoStore.recordVerificationLog({
      action: 'LOGO_REMOVED',
      targetType: 'verification_logo',
      targetId: 'ceo_verification',
      targetName: 'Official CEO Verification Logo',
      ceoEmail: fbUser.email
    });

    ceoStore.recordSecurityLog({
      eventType: 'CEO_LOGO_REMOVED',
      severity: 'warning',
      actorEmail: fbUser.email,
      actorUid: fbUser.uid,
      ipAddress: getClientIp(req),
      summary: 'CEO removed the official FU MARKET verification logo.'
    });

    res.json({ config });
  }
);

// Protected: Verify or Unverify user/seller/ad/service and record audit log + sync local db
router.post('/verify-entity', requireCeoAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { targetType, targetId, targetName, verify, notes } = req.body || {};
  if (!targetType || !targetId || typeof verify !== 'boolean') {
    return res.status(400).json({ error: 'targetType, targetId, and verify boolean are required.' });
  }

  const fbUser = req.firebaseUser!;
  if (targetType === 'seller' || targetType === 'user') {
    const sellerProf = db.sellerProfiles.find(
      s => s.id === targetId || s.userId === targetId
    );
    if (sellerProf) {
      sellerProf.isVerified = verify;
      db.save();
    }
  }

  const verificationLog = ceoStore.recordVerificationLog({
    action: verify ? 'VERIFIED' : 'UNVERIFIED',
    targetType,
    targetId: String(targetId),
    targetName: String(targetName || targetId),
    ceoEmail: fbUser.email,
    notes: typeof notes === 'string' ? notes.trim().slice(0, 400) : undefined
  });

  ceoStore.recordSecurityLog({
    eventType: 'CEO_VERIFICATION_CHANGE',
    severity: 'info',
    actorEmail: fbUser.email,
    actorUid: fbUser.uid,
    targetType: String(targetType),
    targetId: String(targetId),
    ipAddress: getClientIp(req),
    summary: `CEO ${verify ? 'VERIFIED' : 'UNVERIFIED'} ${targetType} "${targetName || targetId}".`
  });

  res.json({ success: true, verificationLog });
});

router.get('/verification-logs', requireCeoAdmin, (_req: AuthenticatedRequest, res: Response) => {
  res.json({ verificationLogs: ceoStore.getData().verificationLogs });
});

// Protected + Sensitive Reauth: Suspend or delete user in local backend DB cleanly
router.post(
  '/users/:id/moderate',
  requireCeoAdmin,
  requireCeoRecentReauth(),
  (req: AuthenticatedRequest, res: Response) => {
    const { action, reason } = req.body || {};
    const targetUser = db.users.find(u => u.id === req.params.id);
    const fbUser = req.firebaseUser!;

    if (!targetUser) {
      return res.json({ success: true, localUpdated: false, message: 'Synced Firestore-only user action.' });
    }

    if (targetUser.email.toLowerCase().trim() === CEO_EMAIL) {
      return res.status(400).json({ error: 'The CEO Super Administrator account cannot be suspended or deleted.' });
    }

    if (action === 'suspend') {
      targetUser.isSuspended = true;
      targetUser.suspensionReason = String(reason || 'Suspended by FU MARKET CEO.');
      const sellerProf = db.sellerProfiles.find(s => s.userId === targetUser.id);
      if (sellerProf) sellerProf.isSuspended = true;
    } else if (action === 'activate') {
      targetUser.isSuspended = false;
      delete targetUser.suspensionReason;
      const sellerProf = db.sellerProfiles.find(s => s.userId === targetUser.id);
      if (sellerProf) sellerProf.isSuspended = false;
    }

    db.save();

    ceoStore.recordSecurityLog({
      eventType: 'CEO_USER_MODERATION',
      severity: 'warning',
      actorEmail: fbUser.email,
      actorUid: fbUser.uid,
      targetType: 'user',
      targetId: targetUser.id,
      ipAddress: getClientIp(req),
      summary: `CEO executed "${action}" on user ${targetUser.email}.`
    });

    res.json({ success: true, localUpdated: true });
  }
);

export default router;
