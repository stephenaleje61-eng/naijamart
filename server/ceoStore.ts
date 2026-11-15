import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const CEO_SECURITY_FILE = path.join(DATA_DIR, 'naijamart_ceo_security.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export interface CeoSecurityLogRecord {
  id: string;
  eventType:
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

export interface CeoVerificationLogRecord {
  id: string;
  action: 'VERIFIED' | 'UNVERIFIED' | 'LOGO_UPDATED' | 'LOGO_REMOVED';
  targetType: 'user' | 'seller' | 'advertisement' | 'service' | 'verification_logo';
  targetId: string;
  targetName: string;
  ceoEmail: string;
  notes?: string;
  createdAt: string;
}

export interface CeoVerificationConfigRecord {
  logoUrl: string;
  badgeText: string;
  updatedAt: string;
  updatedBy: string;
}

export interface CeoSettingsRecord {
  sessionTimeoutMinutes: number;
  requirePhoneCheckOnLogin: boolean;
  reauthWindowMinutes: number;
  maxFailedLoginAttempts: number;
  lockoutDurationMinutes: number;
  updatedAt: string;
}

export interface FailedAttemptBucket {
  key: string;
  count: number;
  firstAttemptAt: string;
  lastAttemptAt: string;
  lockedUntil?: string;
}

export interface CeoSecurityStoreSchema {
  securityLogs: CeoSecurityLogRecord[];
  verificationLogs: CeoVerificationLogRecord[];
  verificationConfig: CeoVerificationConfigRecord;
  ceoSettings: CeoSettingsRecord;
  failedAttempts: Record<string, FailedAttemptBucket>;
}

const DEFAULT_STORE: CeoSecurityStoreSchema = {
  securityLogs: [],
  verificationLogs: [],
  verificationConfig: {
    logoUrl: '',
    badgeText: 'VERIFIED BY FU MARKET CEO',
    updatedAt: '',
    updatedBy: ''
  },
  ceoSettings: {
    sessionTimeoutMinutes: 60,
    requirePhoneCheckOnLogin: false,
    reauthWindowMinutes: 10,
    maxFailedLoginAttempts: 5,
    lockoutDurationMinutes: 15,
    updatedAt: new Date().toISOString()
  },
  failedAttempts: {}
};

class CeoSecurityStore {
  private data: CeoSecurityStoreSchema;

  constructor() {
    this.data = this.load();
  }

  private load(): CeoSecurityStoreSchema {
    try {
      if (fs.existsSync(CEO_SECURITY_FILE)) {
        const raw = fs.readFileSync(CEO_SECURITY_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          securityLogs: Array.isArray(parsed.securityLogs) ? parsed.securityLogs : [],
          verificationLogs: Array.isArray(parsed.verificationLogs) ? parsed.verificationLogs : [],
          verificationConfig: {
            ...DEFAULT_STORE.verificationConfig,
            ...(parsed.verificationConfig || {})
          },
          ceoSettings: {
            ...DEFAULT_STORE.ceoSettings,
            ...(parsed.ceoSettings || {})
          },
          failedAttempts:
            parsed.failedAttempts && typeof parsed.failedAttempts === 'object'
              ? parsed.failedAttempts
              : {}
        };
      }
    } catch (err) {
      console.warn('[CeoStore] Failed to parse security store, using defaults:', err);
    }
    return JSON.parse(JSON.stringify(DEFAULT_STORE));
  }

  private save() {
    try {
      const tmp = `${CEO_SECURITY_FILE}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tmp, CEO_SECURITY_FILE);
    } catch (err) {
      console.error('[CeoStore] Error saving security store:', err);
    }
  }

  getData(): CeoSecurityStoreSchema {
    return this.data;
  }

  recordSecurityLog(entry: Omit<CeoSecurityLogRecord, 'id' | 'createdAt'>): CeoSecurityLogRecord {
    const full: CeoSecurityLogRecord = {
      id: `ceosec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      ...entry,
      createdAt: new Date().toISOString()
    };
    this.data.securityLogs.unshift(full);
    if (this.data.securityLogs.length > 500) {
      this.data.securityLogs.length = 500;
    }
    this.save();
    return full;
  }

  recordVerificationLog(
    entry: Omit<CeoVerificationLogRecord, 'id' | 'createdAt'>
  ): CeoVerificationLogRecord {
    const full: CeoVerificationLogRecord = {
      id: `ceover_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      ...entry,
      createdAt: new Date().toISOString()
    };
    this.data.verificationLogs.unshift(full);
    if (this.data.verificationLogs.length > 500) {
      this.data.verificationLogs.length = 500;
    }
    this.save();
    return full;
  }

  setVerificationLogo(logoUrl: string, updatedBy: string): CeoVerificationConfigRecord {
    this.data.verificationConfig = {
      logoUrl: logoUrl.trim(),
      badgeText: 'VERIFIED BY FU MARKET CEO',
      updatedAt: new Date().toISOString(),
      updatedBy
    };
    this.save();
    return this.data.verificationConfig;
  }

  updateSettings(partial: Partial<CeoSettingsRecord>): CeoSettingsRecord {
    this.data.ceoSettings = {
      ...this.data.ceoSettings,
      sessionTimeoutMinutes:
        typeof partial.sessionTimeoutMinutes === 'number'
          ? Math.max(10, Math.min(240, Math.round(partial.sessionTimeoutMinutes)))
          : this.data.ceoSettings.sessionTimeoutMinutes,
      requirePhoneCheckOnLogin:
        typeof partial.requirePhoneCheckOnLogin === 'boolean'
          ? partial.requirePhoneCheckOnLogin
          : this.data.ceoSettings.requirePhoneCheckOnLogin,
      reauthWindowMinutes:
        typeof partial.reauthWindowMinutes === 'number'
          ? Math.max(2, Math.min(30, Math.round(partial.reauthWindowMinutes)))
          : this.data.ceoSettings.reauthWindowMinutes,
      maxFailedLoginAttempts:
        typeof partial.maxFailedLoginAttempts === 'number'
          ? Math.max(3, Math.min(10, Math.round(partial.maxFailedLoginAttempts)))
          : this.data.ceoSettings.maxFailedLoginAttempts,
      lockoutDurationMinutes:
        typeof partial.lockoutDurationMinutes === 'number'
          ? Math.max(5, Math.min(60, Math.round(partial.lockoutDurationMinutes)))
          : this.data.ceoSettings.lockoutDurationMinutes,
      updatedAt: new Date().toISOString()
    };
    this.save();
    return this.data.ceoSettings;
  }

  getLockoutStatus(bucketKey: string): { locked: boolean; remainingSeconds: number; attempts: number } {
    const bucket = this.data.failedAttempts[bucketKey];
    if (!bucket) return { locked: false, remainingSeconds: 0, attempts: 0 };
    if (bucket.lockedUntil) {
      const untilMs = new Date(bucket.lockedUntil).getTime();
      const now = Date.now();
      if (untilMs > now) {
        return {
          locked: true,
          remainingSeconds: Math.ceil((untilMs - now) / 1000),
          attempts: bucket.count
        };
      }
      // Lock expired — reset bucket
      delete this.data.failedAttempts[bucketKey];
      this.save();
      return { locked: false, remainingSeconds: 0, attempts: 0 };
    }
    return { locked: false, remainingSeconds: 0, attempts: bucket.count };
  }

  registerFailedAttempt(bucketKey: string): {
    locked: boolean;
    remainingSeconds: number;
    attempts: number;
    maxAttempts: number;
  } {
    const now = new Date();
    const maxAttempts = this.data.ceoSettings.maxFailedLoginAttempts || 5;
    const lockoutMinutes = this.data.ceoSettings.lockoutDurationMinutes || 15;
    const existing = this.data.failedAttempts[bucketKey];

    // If previous failure window > 30 mins ago and not locked, start fresh
    let count = 1;
    let firstAttemptAt = now.toISOString();
    if (existing && !existing.lockedUntil) {
      const ageMs = now.getTime() - new Date(existing.firstAttemptAt).getTime();
      if (ageMs < 30 * 60 * 1000) {
        count = existing.count + 1;
        firstAttemptAt = existing.firstAttemptAt;
      }
    } else if (existing && existing.lockedUntil) {
      const untilMs = new Date(existing.lockedUntil).getTime();
      if (untilMs > now.getTime()) {
        return {
          locked: true,
          remainingSeconds: Math.ceil((untilMs - now.getTime()) / 1000),
          attempts: existing.count,
          maxAttempts
        };
      }
    }

    const bucket: FailedAttemptBucket = {
      key: bucketKey,
      count,
      firstAttemptAt,
      lastAttemptAt: now.toISOString()
    };

    let locked = false;
    let remainingSeconds = 0;
    if (count >= maxAttempts) {
      const lockedUntilMs = now.getTime() + lockoutMinutes * 60 * 1000;
      bucket.lockedUntil = new Date(lockedUntilMs).toISOString();
      locked = true;
      remainingSeconds = lockoutMinutes * 60;
    }

    this.data.failedAttempts[bucketKey] = bucket;
    this.save();
    return { locked, remainingSeconds, attempts: count, maxAttempts };
  }

  clearFailedAttempts(bucketKey: string) {
    if (this.data.failedAttempts[bucketKey]) {
      delete this.data.failedAttempts[bucketKey];
      this.save();
    }
  }
}

export const ceoStore = new CeoSecurityStore();
