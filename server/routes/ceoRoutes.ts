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
import { ceoStore, PwaEventType, RegionalModeratorRecord } from '../ceoStore.js';
import { db } from '../db.js';

const router = Router();

// Public read-only verification logo config for public VERIFIED BY NIGERIA CAMPUS MARKET CEO badges
router.get('/verification-config', (_req: Request, res: Response) => {
  const data = ceoStore.getData();
  res.json({
    config: data.verificationConfig
  });
});

// Public read-only app download & APK settings for Download App modal / CTA
router.get('/app-settings', (_req: Request, res: Response) => {
  const data = ceoStore.getData();
  res.json({
    appSettings: data.appSettings
  });
});

// CEO-only update for App Management (APK URL, Play Store URL, enable/disable APK, version, release notes)
router.put(
  '/app-settings',
  requireCeoAdmin,
  requireCeoRecentReauth(),
  (req: AuthenticatedRequest, res: Response) => {
    const fbUser = req.firebaseUser!;
    const updated = ceoStore.updateAppSettings(req.body || {}, fbUser.email);
    ceoStore.recordSecurityLog({
      eventType: 'CEO_APP_SETTINGS_UPDATED',
      severity: 'info',
      actorEmail: fbUser.email,
      actorUid: fbUser.uid,
      ipAddress: getClientIp(req),
      summary: `CEO updated App Management (v${updated.appVersion}, apkEnabled=${updated.apkEnabled}).`
    });
    res.json({ appSettings: updated });
  }
);

// Public genuine PWA / APK install event tracking (no fabricated stats)
router.post('/pwa-track', (req: Request, res: Response) => {
  const { eventType, platform, institutionId } = req.body || {};
  const allowedEvents: PwaEventType[] = [
    'prompt_shown',
    'install_accepted',
    'install_dismissed',
    'apk_download',
    'playstore_click'
  ];
  if (!allowedEvents.includes(eventType)) {
    return res.status(400).json({ error: 'Invalid PWA telemetry event type.' });
  }
  const safePlatform = ['android', 'ios', 'desktop', 'unknown'].includes(platform)
    ? platform
    : 'unknown';

  const recorded = ceoStore.recordPwaEvent({
    eventType,
    platform: safePlatform,
    userAgent: String(req.headers['user-agent'] || '').slice(0, 180),
    institutionId: typeof institutionId === 'string' ? institutionId.slice(0, 80) : undefined
  });
  res.status(201).json({ recorded: true, event: recorded });
});

// Protected CEO-only genuine PWA & APK analytics summary
router.get('/analytics/installs', requireCeoAdmin, (_req: AuthenticatedRequest, res: Response) => {
  res.json({
    installs: ceoStore.getPwaAnalyticsSummary(),
    appSettings: ceoStore.getData().appSettings
  });
});

// Protected CEO-only Regional / Institution Moderator Management (never grants CEO privileges)
router.get('/moderators', requireCeoAdmin, (_req: AuthenticatedRequest, res: Response) => {
  res.json({ moderators: ceoStore.getData().moderators });
});

router.post(
  '/moderators',
  requireCeoAdmin,
  requireCeoRecentReauth(),
  (req: AuthenticatedRequest, res: Response) => {
    const fbUser = req.firebaseUser!;
    const { email, name, assignedInstitutionId, assignedState, permissions } = req.body || {};
    const cleanEmail = String(email || '').toLowerCase().trim();
    const cleanName = String(name || '').trim().slice(0, 120);

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: 'Valid moderator email address is required.' });
    }
    if (cleanEmail === CEO_EMAIL) {
      return res.status(400).json({ error: 'The CEO Super Administrator already holds master authority.' });
    }
    if (!cleanName) {
      return res.status(400).json({ error: 'Moderator name is required.' });
    }

    const allowedPerms: RegionalModeratorRecord['permissions'] = Array.isArray(permissions)
      ? permissions.filter((p): p is RegionalModeratorRecord['permissions'][number] =>
          ['moderate_listings', 'review_reports', 'manage_announcements'].includes(p)
        )
      : ['moderate_listings', 'review_reports'];

    const storeData = ceoStore.getData();
    const existingIdx = storeData.moderators.findIndex((m) => m.email === cleanEmail);
    const nowIso = new Date().toISOString();

    const record: RegionalModeratorRecord = {
      id: existingIdx >= 0 ? storeData.moderators[existingIdx].id : `mod_${Date.now()}`,
      email: cleanEmail,
      name: cleanName,
      assignedInstitutionId:
        typeof assignedInstitutionId === 'string' && assignedInstitutionId.trim()
          ? assignedInstitutionId.trim().slice(0, 100)
          : undefined,
      assignedState:
        typeof assignedState === 'string' && assignedState.trim()
          ? assignedState.trim().slice(0, 60)
          : undefined,
      permissions: allowedPerms.length > 0 ? allowedPerms : ['moderate_listings'],
      status: 'active',
      assignedByEmail: fbUser.email,
      createdAt: existingIdx >= 0 ? storeData.moderators[existingIdx].createdAt : nowIso,
      updatedAt: nowIso
    };

    if (existingIdx >= 0) {
      storeData.moderators[existingIdx] = record;
    } else {
      storeData.moderators.unshift(record);
    }
    ceoStore.save();

    ceoStore.recordSecurityLog({
      eventType: 'CEO_MODERATOR_UPDATED',
      severity: 'info',
      actorEmail: fbUser.email,
      actorUid: fbUser.uid,
      targetType: 'moderator',
      targetId: record.id,
      ipAddress: getClientIp(req),
      summary: `CEO assigned/updated regional moderator ${record.email} (scope: ${record.assignedInstitutionId || record.assignedState || 'National Support'}).`
    });

    res.status(201).json({ moderator: record });
  }
);

router.patch(
  '/moderators/:id',
  requireCeoAdmin,
  requireCeoRecentReauth(),
  (req: AuthenticatedRequest, res: Response) => {
    const fbUser = req.firebaseUser!;
    const storeData = ceoStore.getData();
    const mod = storeData.moderators.find((m) => m.id === req.params.id);
    if (!mod) {
      return res.status(404).json({ error: 'Moderator not found.' });
    }
    if (req.body?.status === 'active' || req.body?.status === 'suspended') {
      mod.status = req.body.status;
    }
    if (Array.isArray(req.body?.permissions)) {
      const nextPerms = req.body.permissions.filter((p: string) =>
        ['moderate_listings', 'review_reports', 'manage_announcements'].includes(p)
      );
      if (nextPerms.length > 0) mod.permissions = nextPerms;
    }
    mod.updatedAt = new Date().toISOString();
    ceoStore.save();

    ceoStore.recordSecurityLog({
      eventType: 'CEO_MODERATOR_UPDATED',
      severity: 'warning',
      actorEmail: fbUser.email,
      actorUid: fbUser.uid,
      targetType: 'moderator',
      targetId: mod.id,
      ipAddress: getClientIp(req),
      summary: `CEO updated moderator ${mod.email} (status=${mod.status}).`
    });
    res.json({ moderator: mod });
  }
);

router.delete(
  '/moderators/:id',
  requireCeoAdmin,
  requireCeoRecentReauth(),
  (req: AuthenticatedRequest, res: Response) => {
    const fbUser = req.firebaseUser!;
    const storeData = ceoStore.getData();
    const target = storeData.moderators.find((m) => m.id === req.params.id);
    if (!target) {
      return res.status(404).json({ error: 'Moderator not found.' });
    }
    storeData.moderators = storeData.moderators.filter((m) => m.id !== req.params.id);
    ceoStore.save();

    ceoStore.recordSecurityLog({
      eventType: 'CEO_MODERATOR_UPDATED',
      severity: 'warning',
      actorEmail: fbUser.email,
      actorUid: fbUser.uid,
      targetType: 'moderator',
      targetId: target.id,
      ipAddress: getClientIp(req),
      summary: `CEO revoked moderator access for ${target.email}.`
    });
    res.json({ success: true });
  }
);

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
      error:
        'Access Denied: Only the verified NIGERIA CAMPUS MARKET CEO SUPER ADMINISTRATOR account may sign in here.',
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
    appSettings: ceoStore.getData().appSettings,
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
      summary: 'CEO uploaded or updated the official NIGERIA CAMPUS MARKET verification logo.'
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
      summary: 'CEO removed the official NIGERIA CAMPUS MARKET verification logo.'
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
      (s) => s.id === targetId || s.userId === targetId
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
    const targetUser = db.users.find((u) => u.id === req.params.id);
    const fbUser = req.firebaseUser!;

    if (!targetUser) {
      return res.json({ success: true, localUpdated: false, message: 'Synced Firestore-only user action.' });
    }

    if (targetUser.email.toLowerCase().trim() === CEO_EMAIL) {
      return res.status(400).json({ error: 'The CEO Super Administrator account cannot be suspended or deleted.' });
    }

    if (action === 'suspend') {
      targetUser.isSuspended = true;
      targetUser.suspensionReason = String(reason || 'Suspended by NIGERIA CAMPUS MARKET CEO.');
      const sellerProf = db.sellerProfiles.find((s) => s.userId === targetUser.id);
      if (sellerProf) sellerProf.isSuspended = true;
    } else if (action === 'activate') {
      targetUser.isSuspended = false;
      delete targetUser.suspensionReason;
      const sellerProf = db.sellerProfiles.find((s) => s.userId === targetUser.id);
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
