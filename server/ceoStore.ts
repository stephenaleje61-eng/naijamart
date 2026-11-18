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
    | 'CEO_USER_MODERATION'
    | 'CEO_APP_SETTINGS_UPDATED'
    | 'CEO_MODERATOR_UPDATED'
    | 'CEO_PRICING_UPDATED';
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
  targetType:
    | 'user'
    | 'seller'
    | 'advertisement'
    | 'service'
    | 'house_agent'
    | 'verification_logo';
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

export interface AppSettingsRecord {
  id: string;
  apkUrl: string;
  playStoreUrl: string;
  apkEnabled: boolean;
  appVersion: string;
  releaseNotes: string;
  installAnnouncement: string;
  installInstructions: string;
  updatedAt: string;
  updatedBy: string;
}

export type PwaEventType =
  | 'prompt_shown'
  | 'install_accepted'
  | 'install_dismissed'
  | 'apk_download'
  | 'playstore_click';

export interface PwaInstallEventRecord {
  id: string;
  eventType: PwaEventType;
  platform: 'android' | 'ios' | 'desktop' | 'unknown';
  userAgent?: string;
  institutionId?: string;
  createdAt: string;
}

export interface RegionalModeratorRecord {
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

export interface SubscriptionPlanRecord {
  id: string;
  slug: string;
  audience:
    | 'seller_pro'
    | 'verified_business'
    | 'house_agent'
    | 'campus_ad_boost'
    | 'national_ad_boost';
  name: string;
  description: string;
  priceNaira: number;
  durationDays: number;
  currency: 'NGN';
  features: string[];
  isActive: boolean;
  targetScope: 'campus' | 'state' | 'nationwide';
  updatedAt: string;
}

export interface ServerPaymentTransactionRecord {
  id: string;
  reference: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  orderType?: 'subscription' | 'product_order' | 'food_order' | 'ad_package';
  orderId?: string;
  planId: string;
  planName: string;
  amountNaira: number;
  currency: 'NGN';
  gateway: 'paystack' | 'flutterwave' | 'ceo_manual' | 'pay_on_delivery';
  status: 'initialized' | 'verified' | 'failed';
  gatewayTransactionId?: string;
  gatewayResponse?: string;
  institutionId?: string;
  verifiedAt?: string;
  createdAt: string;
}

export interface CodPolicyRecord {
  codEnabled: boolean;
  codFoodEnabled: boolean;
  codMaxOrderNaira: number;
  codNote: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface ServerGradingScaleGrade {
  letter: string;
  minScore: number;
  maxScore: number;
  point: number;
}

export interface ServerInstitutionGradingConfig {
  id: string;
  institutionId: string;
  scaleMax: 5 | 4;
  isVerifiedOfficial: boolean;
  scaleLabel: string;
  grades: ServerGradingScaleGrade[];
  updatedByEmail?: string;
  updatedAt: string;
}

export type VisitorDeviceType = 'android' | 'iphone' | 'ipad' | 'desktop' | 'other';

export interface VisitorDayBucket {
  date: string; // YYYY-MM-DD (UTC/WAT aligned)
  totalVisits: number;
  uniqueVisitorIds: string[];
  android: number;
  iphone: number;
  ipad: number;
  desktop: number;
  other: number;
}

export interface VisitorAnalyticsState {
  lifetimeVisits: number;
  uniqueVisitorIds: string[];
  dailyBuckets: Record<string, VisitorDayBucket>;
}

export interface CeoSecurityStoreSchema {
  securityLogs: CeoSecurityLogRecord[];
  verificationLogs: CeoVerificationLogRecord[];
  verificationConfig: CeoVerificationConfigRecord;
  ceoSettings: CeoSettingsRecord;
  failedAttempts: Record<string, FailedAttemptBucket>;
  appSettings: AppSettingsRecord;
  pwaInstallEvents: PwaInstallEventRecord[];
  moderators: RegionalModeratorRecord[];
  subscriptionPlans: SubscriptionPlanRecord[];
  paymentTransactions: ServerPaymentTransactionRecord[];
  codPolicy: CodPolicyRecord;
  gradingConfigs: Record<string, ServerInstitutionGradingConfig>;
  visitorAnalytics: VisitorAnalyticsState;
}

export const DEFAULT_SUBSCRIPTION_PLANS: SubscriptionPlanRecord[] = [
  {
    id: 'plan_seller_pro',
    slug: 'seller-pro',
    audience: 'seller_pro',
    name: 'Seller Pro Monthly',
    description: 'Priority visibility in campus & nationwide searches plus storefront analytics.',
    priceNaira: 2500,
    durationDays: 30,
    currency: 'NGN',
    features: [
      'Priority ranking inside your campus & nationwide searches',
      'Featured Storefront badge in Sellers directory',
      'Detailed click & view insights'
    ],
    isActive: true,
    targetScope: 'campus',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'plan_verified_business',
    slug: 'verified-business',
    audience: 'verified_business',
    name: 'Verified Business Plan',
    description: 'Eligibility review for CEO Verification & multi-campus business trust placement.',
    priceNaira: 5000,
    durationDays: 30,
    currency: 'NGN',
    features: [
      'Fast-track CEO verification review',
      'Verified business spotlight on campus feeds',
      'Direct WhatsApp & phone lead tracking'
    ],
    isActive: true,
    targetScope: 'state',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'plan_house_agent',
    slug: 'house-agent',
    audience: 'house_agent',
    name: 'House Agent Listing Plan',
    description: 'Publish unlimited verified lodges & apartments with priority accommodation placement.',
    priceNaira: 4000,
    durationDays: 30,
    currency: 'NGN',
    features: [
      'Priority placement in Student Accommodation & Hux',
      'Multiple lodge listings per campus',
      'Direct call & WhatsApp inspection scheduling'
    ],
    isActive: true,
    targetScope: 'campus',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'plan_campus_ad_boost',
    slug: 'campus-ad-boost',
    audience: 'campus_ad_boost',
    name: 'Campus Ad Boost',
    description: 'Sponsored placement inside a single target university or polytechnic campus.',
    priceNaira: 3500,
    durationDays: 14,
    currency: 'NGN',
    features: [
      'Targeted to one Nigerian university or polytechnic',
      'Clear Sponsored tag & business logo',
      'Impression, click, and WhatsApp lead reporting'
    ],
    isActive: true,
    targetScope: 'campus',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'plan_national_ad_boost',
    slug: 'national-ad-boost',
    audience: 'national_ad_boost',
    name: 'National Ad Boost',
    description: 'Nationwide banner & discovery placement across all active Nigerian campuses.',
    priceNaira: 10000,
    durationDays: 30,
    currency: 'NGN',
    features: [
      'Appears across all active Nigerian universities & polytechnics',
      'Homepage Sponsored showcase priority',
      'State & Nationwide search spotlight'
    ],
    isActive: true,
    targetScope: 'nationwide',
    updatedAt: new Date().toISOString()
  }
];

const DEFAULT_APP_SETTINGS: AppSettingsRecord = {
  id: 'global_app_settings',
  apkUrl: '',
  playStoreUrl: '',
  apkEnabled: false,
  appVersion: '3.0.0',
  releaseNotes: 'NIGERIA CAMPUS MARKET nationwide university marketplace, campus food, accommodation & GPA tools.',
  installAnnouncement: 'Install NIGERIA CAMPUS MARKET on your phone or laptop for fast campus access.',
  installInstructions:
    'On Android/Chrome, tap "Install App" to install directly from your browser. On iPhone/iPad Safari, tap Share then "Add to Home Screen".',
  updatedAt: '',
  updatedBy: ''
};

const DEFAULT_COD_POLICY: CodPolicyRecord = {
  codEnabled: true,
  codFoodEnabled: true,
  codMaxOrderNaira: 150000,
  codNote: 'Pay on delivery / campus handover available for eligible local campus orders.',
  updatedAt: new Date().toISOString()
};

const DEFAULT_STORE: CeoSecurityStoreSchema = {
  securityLogs: [],
  verificationLogs: [],
  verificationConfig: {
    logoUrl: '',
    badgeText: 'VERIFIED BY NIGERIA CAMPUS MARKET CEO',
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
  failedAttempts: {},
  appSettings: DEFAULT_APP_SETTINGS,
  pwaInstallEvents: [],
  moderators: [],
  subscriptionPlans: DEFAULT_SUBSCRIPTION_PLANS,
  paymentTransactions: [],
  codPolicy: DEFAULT_COD_POLICY,
  gradingConfigs: {},
  visitorAnalytics: {
    lifetimeVisits: 0,
    uniqueVisitorIds: [],
    dailyBuckets: {}
  }
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
        const existingBadge = String(parsed?.verificationConfig?.badgeText || '').trim();
        const migratedBadge =
          !existingBadge ||
          existingBadge === 'VERIFIED BY FU MARKET CEO' ||
          existingBadge === 'VERIFIED BY NIGERIA UNIVERSITY HUB CEO'
            ? 'VERIFIED BY NIGERIA CAMPUS MARKET CEO'
            : existingBadge;

        return {
          securityLogs: Array.isArray(parsed.securityLogs) ? parsed.securityLogs : [],
          verificationLogs: Array.isArray(parsed.verificationLogs) ? parsed.verificationLogs : [],
          verificationConfig: {
            ...DEFAULT_STORE.verificationConfig,
            ...(parsed.verificationConfig || {}),
            badgeText: migratedBadge
          },
          ceoSettings: {
            ...DEFAULT_STORE.ceoSettings,
            ...(parsed.ceoSettings || {})
          },
          failedAttempts:
            parsed.failedAttempts && typeof parsed.failedAttempts === 'object'
              ? parsed.failedAttempts
              : {},
          appSettings: {
            ...DEFAULT_APP_SETTINGS,
            ...(parsed.appSettings || {})
          },
          pwaInstallEvents: Array.isArray(parsed.pwaInstallEvents) ? parsed.pwaInstallEvents : [],
          moderators: Array.isArray(parsed.moderators) ? parsed.moderators : [],
          subscriptionPlans:
            Array.isArray(parsed.subscriptionPlans) && parsed.subscriptionPlans.length > 0
              ? parsed.subscriptionPlans
              : JSON.parse(JSON.stringify(DEFAULT_SUBSCRIPTION_PLANS)),
          paymentTransactions: Array.isArray(parsed.paymentTransactions)
            ? parsed.paymentTransactions
            : [],
          codPolicy: {
            ...DEFAULT_COD_POLICY,
            ...(parsed.codPolicy || {})
          },
          gradingConfigs:
            parsed.gradingConfigs && typeof parsed.gradingConfigs === 'object'
              ? parsed.gradingConfigs
              : {},
          visitorAnalytics: {
            lifetimeVisits: Number(parsed?.visitorAnalytics?.lifetimeVisits) || 0,
            uniqueVisitorIds: Array.isArray(parsed?.visitorAnalytics?.uniqueVisitorIds)
              ? parsed.visitorAnalytics.uniqueVisitorIds.map(String)
              : [],
            dailyBuckets:
              parsed?.visitorAnalytics?.dailyBuckets && typeof parsed.visitorAnalytics.dailyBuckets === 'object'
                ? parsed.visitorAnalytics.dailyBuckets
                : {}
          }
        };
      }
    } catch (err) {
      console.warn('[CeoStore] Failed to parse security store, using defaults:', err);
    }
    return JSON.parse(JSON.stringify(DEFAULT_STORE));
  }

  public save() {
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
      badgeText: 'VERIFIED BY NIGERIA CAMPUS MARKET CEO',
      updatedAt: new Date().toISOString(),
      updatedBy
    };
    this.save();
    return this.data.verificationConfig;
  }

  updateCodPolicy(partial: Partial<CodPolicyRecord>, updatedBy: string): CodPolicyRecord {
    this.data.codPolicy = {
      codEnabled:
        typeof partial.codEnabled === 'boolean' ? partial.codEnabled : this.data.codPolicy.codEnabled,
      codFoodEnabled:
        typeof partial.codFoodEnabled === 'boolean'
          ? partial.codFoodEnabled
          : this.data.codPolicy.codFoodEnabled,
      codMaxOrderNaira:
        typeof partial.codMaxOrderNaira === 'number' && Number.isFinite(partial.codMaxOrderNaira)
          ? Math.max(0, Math.min(2000000, Math.round(partial.codMaxOrderNaira)))
          : this.data.codPolicy.codMaxOrderNaira,
      codNote:
        typeof partial.codNote === 'string'
          ? partial.codNote.trim().slice(0, 300)
          : this.data.codPolicy.codNote,
      updatedAt: new Date().toISOString(),
      updatedBy
    };
    this.save();
    return this.data.codPolicy;
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

  updateAppSettings(partial: Partial<AppSettingsRecord>, updatedBy: string): AppSettingsRecord {
    const cleanUrl = (v: unknown) => {
      if (typeof v !== 'string') return '';
      const trimmed = v.trim().slice(0, 500);
      if (!trimmed) return '';
      if (/^https?:\/\//i.test(trimmed)) return trimmed;
      return '';
    };

    this.data.appSettings = {
      ...this.data.appSettings,
      apkUrl: partial.apkUrl !== undefined ? cleanUrl(partial.apkUrl) : this.data.appSettings.apkUrl,
      playStoreUrl:
        partial.playStoreUrl !== undefined
          ? cleanUrl(partial.playStoreUrl)
          : this.data.appSettings.playStoreUrl,
      apkEnabled:
        typeof partial.apkEnabled === 'boolean'
          ? partial.apkEnabled
          : this.data.appSettings.apkEnabled,
      appVersion:
        typeof partial.appVersion === 'string' && partial.appVersion.trim()
          ? partial.appVersion.trim().slice(0, 40)
          : this.data.appSettings.appVersion,
      releaseNotes:
        typeof partial.releaseNotes === 'string'
          ? partial.releaseNotes.trim().slice(0, 1200)
          : this.data.appSettings.releaseNotes,
      installAnnouncement:
        typeof partial.installAnnouncement === 'string'
          ? partial.installAnnouncement.trim().slice(0, 400)
          : this.data.appSettings.installAnnouncement,
      installInstructions:
        typeof partial.installInstructions === 'string'
          ? partial.installInstructions.trim().slice(0, 1000)
          : this.data.appSettings.installInstructions,
      updatedAt: new Date().toISOString(),
      updatedBy
    };
    this.save();
    return this.data.appSettings;
  }

  recordPwaEvent(entry: Omit<PwaInstallEventRecord, 'id' | 'createdAt'>): PwaInstallEventRecord {
    const record: PwaInstallEventRecord = {
      id: `pwa_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      ...entry,
      createdAt: new Date().toISOString()
    };
    this.data.pwaInstallEvents.unshift(record);
    if (this.data.pwaInstallEvents.length > 2000) {
      this.data.pwaInstallEvents.length = 2000;
    }
    this.save();
    return record;
  }

  getPwaAnalyticsSummary() {
    const events = this.data.pwaInstallEvents;
    const summary = {
      totalEvents: events.length,
      promptShown: 0,
      installAccepted: 0,
      installDismissed: 0,
      apkDownload: 0,
      playstoreClick: 0,
      byPlatform: {
        android: 0,
        ios: 0,
        desktop: 0,
        unknown: 0
      },
      recentEvents: events.slice(0, 30)
    };
    for (const ev of events) {
      if (ev.eventType === 'prompt_shown') summary.promptShown++;
      else if (ev.eventType === 'install_accepted') summary.installAccepted++;
      else if (ev.eventType === 'install_dismissed') summary.installDismissed++;
      else if (ev.eventType === 'apk_download') summary.apkDownload++;
      else if (ev.eventType === 'playstore_click') summary.playstoreClick++;

      if (ev.platform === 'android') summary.byPlatform.android++;
      else if (ev.platform === 'ios') summary.byPlatform.ios++;
      else if (ev.platform === 'desktop') summary.byPlatform.desktop++;
      else summary.byPlatform.unknown++;
    }
    return summary;
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

  private getNigeriaDateKey(date = new Date()): string {
    // Nigeria WAT is UTC+1 year-round
    const watMs = date.getTime() + 60 * 60 * 1000;
    return new Date(watMs).toISOString().slice(0, 10);
  }

  recordSiteVisit(params: {
    visitorId: string;
    deviceType: VisitorDeviceType;
  }): { totalVisitors: number; lifetimeVisits: number; date: string } {
    const cleanVisitor = String(params.visitorId || '').trim().slice(0, 80);
    const device: VisitorDeviceType = ['android', 'iphone', 'ipad', 'desktop', 'other'].includes(params.deviceType)
      ? params.deviceType
      : 'other';
    const dateKey = this.getNigeriaDateKey();

    if (!this.data.visitorAnalytics) {
      this.data.visitorAnalytics = {
        lifetimeVisits: 0,
        uniqueVisitorIds: [],
        dailyBuckets: {}
      };
    }

    const va = this.data.visitorAnalytics;
    va.lifetimeVisits = (va.lifetimeVisits || 0) + 1;

    if (cleanVisitor && !va.uniqueVisitorIds.includes(cleanVisitor)) {
      va.uniqueVisitorIds.push(cleanVisitor);
      if (va.uniqueVisitorIds.length > 50000) {
        va.uniqueVisitorIds = va.uniqueVisitorIds.slice(-50000);
      }
    }

    if (!va.dailyBuckets[dateKey]) {
      va.dailyBuckets[dateKey] = {
        date: dateKey,
        totalVisits: 0,
        uniqueVisitorIds: [],
        android: 0,
        iphone: 0,
        ipad: 0,
        desktop: 0,
        other: 0
      };
    }

    const bucket = va.dailyBuckets[dateKey];
    bucket.totalVisits += 1;
    bucket[device] = (bucket[device] || 0) + 1;
    if (cleanVisitor && !bucket.uniqueVisitorIds.includes(cleanVisitor)) {
      bucket.uniqueVisitorIds.push(cleanVisitor);
      if (bucket.uniqueVisitorIds.length > 20000) {
        bucket.uniqueVisitorIds = bucket.uniqueVisitorIds.slice(-20000);
      }
    }

    // Prune daily buckets older than 120 days to keep JSON compact
    const allDates = Object.keys(va.dailyBuckets).sort();
    if (allDates.length > 120) {
      for (const oldKey of allDates.slice(0, allDates.length - 120)) {
        delete va.dailyBuckets[oldKey];
      }
    }

    this.save();
    return {
      totalVisitors: va.uniqueVisitorIds.length || va.lifetimeVisits,
      lifetimeVisits: va.lifetimeVisits,
      date: dateKey
    };
  }

  getVisitorAnalyticsSummary(days = 14) {
    const va = this.data.visitorAnalytics || {
      lifetimeVisits: 0,
      uniqueVisitorIds: [],
      dailyBuckets: {}
    };

    const todayKey = this.getNigeriaDateKey();
    const todayBucket = va.dailyBuckets[todayKey];

    const byDevice = { android: 0, iphone: 0, ipad: 0, desktop: 0, other: 0 };
    for (const bucket of Object.values(va.dailyBuckets)) {
      byDevice.android += Number(bucket.android) || 0;
      byDevice.iphone += Number(bucket.iphone) || 0;
      byDevice.ipad += Number(bucket.ipad) || 0;
      byDevice.desktop += Number(bucket.desktop) || 0;
      byDevice.other += Number(bucket.other) || 0;
    }

    const dailySeries: Array<{ date: string; label: string; visits: number; uniqueVisitors: number }> = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = this.getNigeriaDateKey(d);
      const b = va.dailyBuckets[dateKey];
      dailySeries.push({
        date: dateKey,
        label: dateKey.slice(5),
        visits: Number(b?.totalVisits) || 0,
        uniqueVisitors: Array.isArray(b?.uniqueVisitorIds) ? b.uniqueVisitorIds.length : 0
      });
    }

    const last7Unique = new Set<string>();
    const last30Unique = new Set<string>();
    for (let i = 0; i < 30; i++) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const b = va.dailyBuckets[this.getNigeriaDateKey(d)];
      if (b?.uniqueVisitorIds) {
        for (const id of b.uniqueVisitorIds) {
          last30Unique.add(id);
          if (i < 7) last7Unique.add(id);
        }
      }
    }

    return {
      totalVisitors: Math.max(va.uniqueVisitorIds.length, va.lifetimeVisits > 0 ? 1 : 0),
      totalPageViews: va.lifetimeVisits,
      todayVisitors: Array.isArray(todayBucket?.uniqueVisitorIds) ? todayBucket.uniqueVisitorIds.length : 0,
      todayPageViews: Number(todayBucket?.totalVisits) || 0,
      thisWeekVisitors: last7Unique.size,
      thisMonthVisitors: last30Unique.size,
      byDevice,
      dailySeries
    };
  }
}

export const ceoStore = new CeoSecurityStore();
