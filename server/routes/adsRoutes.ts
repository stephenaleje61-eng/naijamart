import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { requireAdmin, AuthenticatedRequest } from '../auth.js';

const router = Router();

const DATA_DIR = path.resolve(process.cwd(), 'data');
const ADS_DB_FILE = path.join(DATA_DIR, 'naijamart_ads_db.json');
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
const PAYMENT_PROOF_SECRET =
  process.env.PAYMENT_PROOF_SECRET ||
  process.env.JWT_SECRET ||
  'fu-market-paystack-proof-secret-2026';

export type AdPackageId = 'basic' | 'premium' | 'featured';

const PACKAGES: Record<
  AdPackageId,
  { id: AdPackageId; name: string; priceNaira: number; durationDays: number }
> = {
  basic: { id: 'basic', name: 'BASIC PACKAGE', priceNaira: 2000, durationDays: 7 },
  premium: { id: 'premium', name: 'PREMIUM PACKAGE', priceNaira: 5000, durationDays: 14 },
  featured: { id: 'featured', name: 'FEATURED PACKAGE', priceNaira: 10000, durationDays: 30 }
};

export interface ServerPaymentRecord {
  id: string;
  reference: string;
  adId: string;
  businessName: string;
  payerEmail?: string;
  payerPhone?: string;
  packageId: AdPackageId;
  amountNaira: number;
  currency: 'NGN';
  provider: 'paystack' | 'ceo_manual';
  status: 'initialized' | 'verified' | 'failed';
  gatewayResponse?: string;
  verifiedAt?: string;
  createdAt: string;
}

export interface ServerAuditLog {
  id: string;
  action: string;
  contentType: string;
  recordId: string;
  recordTitle?: string;
  adminEmail: string;
  reason?: string;
  createdAt: string;
}

interface AdsServerStore {
  payments: ServerPaymentRecord[];
  auditLogs: ServerAuditLog[];
}

function loadStore(): AdsServerStore {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(ADS_DB_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(ADS_DB_FILE, 'utf-8'));
      return {
        payments: Array.isArray(parsed?.payments) ? parsed.payments : [],
        auditLogs: Array.isArray(parsed?.auditLogs) ? parsed.auditLogs : []
      };
    }
  } catch (err) {
    console.warn('[AdsStore load warning]:', err);
  }
  return { payments: [], auditLogs: [] };
}

function saveStore(store: AdsServerStore): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(ADS_DB_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[AdsStore save warning]:', err);
  }
}

const adsStore = loadStore();

function signVerificationProof(record: ServerPaymentRecord): string {
  return crypto
    .createHmac('sha256', PAYMENT_PROOF_SECRET)
    .update(`${record.reference}:${record.adId}:${record.packageId}:${record.amountNaira}:${record.status}`)
    .digest('hex');
}

function getPaystackSecretKey(): string {
  return String(process.env.PAYSTACK_SECRET_KEY || '').trim();
}

// 1. Check whether Paystack is configured on server (never exposes the secret key)
router.get('/paystack/status', (_req: Request, res: Response) => {
  const configured = Boolean(getPaystackSecretKey());
  const publicKey = String(process.env.PAYSTACK_PUBLIC_KEY || '').trim();
  res.json({
    configured,
    publicKeyConfigured: Boolean(publicKey),
    message: configured
      ? 'Paystack payment verification is active.'
      : 'Paystack API key (PAYSTACK_SECRET_KEY) is not configured on the server. Use "MESSAGE CEO FOR ANY ADVERT" (08167258121) for direct approval and payment instructions.'
  });
});

// 2. Initialize Paystack transaction with unique reference & server-authoritative package pricing
router.post('/paystack/initialize', async (req: Request, res: Response) => {
  const secretKey = getPaystackSecretKey();
  if (!secretKey) {
    return res.status(503).json({
      configured: false,
      error:
        'Paystack payment gateway is not configured on this server (PAYSTACK_SECRET_KEY missing). Please contact NIGERIA UNIVERSITY HUB CEO (08167258121) on WhatsApp for payment instructions.'
    });
  }

  const { adId, packageId, email, phone, businessName, callbackUrl } = req.body || {};
  const pkg = PACKAGES[packageId as AdPackageId];
  if (!pkg) {
    return res.status(400).json({ error: 'Invalid advertising package selected.' });
  }
  if (!adId || typeof adId !== 'string' || adId.length > 128) {
    return res.status(400).json({ error: 'Valid advertisement ID is required.' });
  }

  const safeBusinessName = String(businessName || 'NIGERIA UNIVERSITY HUB Advertiser').trim().slice(0, 140);
  const safeEmail =
    typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      ? email.trim()
      : `advert-${adId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16) || 'biz'}@fumarket.ng`;

  const reference = `FUMKT_AD_${Date.now()}_${crypto.randomBytes(5).toString('hex').toUpperCase()}`;

  try {
    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: safeEmail,
        amount: pkg.priceNaira * 100, // NGN -> Kobo
        currency: 'NGN',
        reference,
        ...(callbackUrl ? { callback_url: String(callbackUrl) } : {}),
        metadata: {
          adId,
          packageId: pkg.id,
          packageName: pkg.name,
          businessName: safeBusinessName,
          phone: phone ? String(phone).slice(0, 40) : ''
        }
      })
    });

    const data: any = await paystackRes.json();
    if (!paystackRes.ok || !data?.status || !data?.data?.authorization_url) {
      return res.status(502).json({
        configured: true,
        error: data?.message || 'Unable to initialize Paystack transaction. Please try again or contact CEO.'
      });
    }

    const paymentRecord: ServerPaymentRecord = {
      id: `pay_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      reference,
      adId,
      businessName: safeBusinessName,
      payerEmail: safeEmail,
      payerPhone: phone ? String(phone).slice(0, 40) : undefined,
      packageId: pkg.id,
      amountNaira: pkg.priceNaira,
      currency: 'NGN',
      provider: 'paystack',
      status: 'initialized',
      createdAt: new Date().toISOString()
    };

    adsStore.payments.unshift(paymentRecord);
    saveStore(adsStore);

    return res.json({
      configured: true,
      reference,
      authorizationUrl: data.data.authorization_url,
      accessCode: data.data.access_code,
      amountNaira: pkg.priceNaira,
      currency: 'NGN'
    });
  } catch (err: any) {
    return res.status(502).json({
      configured: true,
      error: err?.message || 'Network error while connecting to Paystack.'
    });
  }
});

// 3. Server-side Paystack transaction verification with duplicate prevention
router.post('/paystack/verify', async (req: Request, res: Response) => {
  const secretKey = getPaystackSecretKey();
  if (!secretKey) {
    return res.status(503).json({
      configured: false,
      error:
        'Paystack payment gateway is not configured on this server (PAYSTACK_SECRET_KEY missing). Contact NIGERIA UNIVERSITY HUB CEO (08167258121) for manual verification.'
    });
  }

  const { reference, adId, packageId } = req.body || {};
  const cleanRef = String(reference || '').trim();
  const cleanAdId = String(adId || '').trim();
  const pkg = PACKAGES[packageId as AdPackageId];

  if (!cleanRef || cleanRef.length > 160) {
    return res.status(400).json({ error: 'Valid Paystack payment reference is required.' });
  }
  if (!cleanAdId || cleanAdId.length > 128) {
    return res.status(400).json({ error: 'Valid advertisement ID is required.' });
  }
  if (!pkg) {
    return res.status(400).json({ error: 'Valid advertising package is required.' });
  }

  // Prevent duplicate transaction replay across ads
  const existingVerified = adsStore.payments.find(
    (p) => p.reference === cleanRef && p.status === 'verified'
  );
  if (existingVerified) {
    if (existingVerified.adId !== cleanAdId) {
      return res.status(409).json({
        error: 'Duplicate transaction blocked: This Paystack reference has already been used for another advertisement.'
      });
    }
    return res.json({
      verified: true,
      alreadyVerified: true,
      payment: existingVerified,
      proofSignature: signVerificationProof(existingVerified)
    });
  }

  try {
    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(cleanRef)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${secretKey}`
        }
      }
    );

    const data: any = await verifyRes.json();
    if (!verifyRes.ok || !data?.status || !data?.data) {
      return res.status(400).json({
        verified: false,
        error: data?.message || 'Paystack could not verify this payment reference.'
      });
    }

    const tx = data.data;
    const paidKobo = Number(tx.amount || 0);
    const expectedKobo = pkg.priceNaira * 100;

    if (tx.status !== 'success') {
      return res.status(400).json({
        verified: false,
        error: `Paystack transaction status is "${tx.status}", not successful.`
      });
    }
    if (String(tx.currency || '').toUpperCase() !== 'NGN') {
      return res.status(400).json({
        verified: false,
        error: 'Invalid payment currency. Expected NGN.'
      });
    }
    if (paidKobo < expectedKobo) {
      return res.status(400).json({
        verified: false,
        error: `Amount paid (₦${(paidKobo / 100).toLocaleString()}) is less than ${pkg.name} price (₦${pkg.priceNaira.toLocaleString()}).`
      });
    }

    const existingInit = adsStore.payments.find((p) => p.reference === cleanRef);
    const nowIso = new Date().toISOString();

    let savedRecord: ServerPaymentRecord;
    if (existingInit) {
      existingInit.status = 'verified';
      existingInit.gatewayResponse = String(tx.gateway_response || 'Approved');
      existingInit.verifiedAt = nowIso;
      savedRecord = existingInit;
    } else {
      savedRecord = {
        id: `pay_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        reference: cleanRef,
        adId: cleanAdId,
        businessName: String(tx?.metadata?.businessName || 'NIGERIA UNIVERSITY HUB Advertiser'),
        payerEmail: tx?.customer?.email ? String(tx.customer.email) : undefined,
        packageId: pkg.id,
        amountNaira: paidKobo / 100,
        currency: 'NGN',
        provider: 'paystack',
        status: 'verified',
        gatewayResponse: String(tx.gateway_response || 'Approved'),
        verifiedAt: nowIso,
        createdAt: nowIso
      };
      adsStore.payments.unshift(savedRecord);
    }

    saveStore(adsStore);

    return res.json({
      verified: true,
      payment: savedRecord,
      proofSignature: signVerificationProof(savedRecord),
      message: 'Payment verified successfully via Paystack backend. Pending CEO approval before going live.'
    });
  } catch (err: any) {
    return res.status(502).json({
      verified: false,
      error: err?.message || 'Network error while verifying payment with Paystack.'
    });
  }
});

// ============================================================================
// ADMIN-ONLY ENDPOINTS (PAYMENTS, UPLOADED FILES, IMMUTABLE AUDIT LOGS)
// ============================================================================

// List server-verified payment records (Protected: never deletable)
router.get('/admin/payments', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  res.json({ payments: adsStore.payments });
});

// CEO Manual Payment Verification (e.g., bank transfer confirmed via 08167258121)
router.post('/admin/payments/manual-verify', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const admin = req.user!;
  const { adId, businessName, packageId, reference, amountNaira, payerPhone } = req.body || {};
  const pkg = PACKAGES[packageId as AdPackageId];
  if (!adId || !pkg) {
    return res.status(400).json({ error: 'adId and valid packageId are required.' });
  }

  const cleanRef =
    String(reference || '').trim() ||
    `CEO_MANUAL_${Date.now()}_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

  const dup = adsStore.payments.find((p) => p.reference === cleanRef && p.status === 'verified' && p.adId !== adId);
  if (dup) {
    return res.status(409).json({ error: 'Duplicate payment reference already used for another ad.' });
  }

  const nowIso = new Date().toISOString();
  const record: ServerPaymentRecord = {
    id: `pay_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    reference: cleanRef,
    adId: String(adId),
    businessName: String(businessName || 'Advertiser').slice(0, 140),
    payerPhone: payerPhone ? String(payerPhone).slice(0, 40) : undefined,
    packageId: pkg.id,
    amountNaira: Number(amountNaira) > 0 ? Number(amountNaira) : pkg.priceNaira,
    currency: 'NGN',
    provider: 'ceo_manual',
    status: 'verified',
    gatewayResponse: `Verified by CEO (${admin.email})`,
    verifiedAt: nowIso,
    createdAt: nowIso
  };

  adsStore.payments.unshift(record);
  adsStore.auditLogs.unshift({
    id: `audit_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    action: 'verify_payment',
    contentType: 'adPayments',
    recordId: record.id,
    recordTitle: `${record.businessName} (${cleanRef})`,
    adminEmail: admin.email,
    reason: 'Manual payment verified by CEO',
    createdAt: nowIso
  });
  saveStore(adsStore);

  res.json({ success: true, payment: record });
});

// List uploaded server files for CEO Master Control ("Uploaded files")
router.get('/admin/uploaded-files', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  try {
    if (!fs.existsSync(UPLOADS_DIR)) {
      return res.json({ files: [] });
    }
    const entries = fs.readdirSync(UPLOADS_DIR);
    const files = entries
      .map((name) => {
        const fullPath = path.join(UPLOADS_DIR, name);
        const stat = fs.statSync(fullPath);
        if (!stat.isFile()) return null;
        return {
          filename: name,
          url: `/uploads/${name}`,
          sizeBytes: stat.size,
          createdAt: stat.birthtime ? stat.birthtime.toISOString() : stat.mtime.toISOString(),
          modifiedAt: stat.mtime.toISOString()
        };
      })
      .filter((f): f is NonNullable<typeof f> => Boolean(f))
      .sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());

    return res.json({ files });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Unable to list uploaded files.' });
  }
});

// Delete an uploaded file from server disk (CEO only)
router.delete('/admin/uploaded-files/:filename', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const admin = req.user!;
  const safeName = path.basename(String(req.params.filename || ''));
  if (!safeName) {
    return res.status(400).json({ error: 'Valid filename is required.' });
  }

  const targetPath = path.join(UPLOADS_DIR, safeName);
  if (!targetPath.startsWith(UPLOADS_DIR)) {
    return res.status(400).json({ error: 'Invalid file path.' });
  }

  try {
    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({ error: 'Uploaded file not found on server.' });
    }
    fs.unlinkSync(targetPath);

    adsStore.auditLogs.unshift({
      id: `audit_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      action: 'delete',
      contentType: 'uploaded_file',
      recordId: safeName,
      recordTitle: safeName,
      adminEmail: admin.email,
      reason: req.body?.reason ? String(req.body.reason).slice(0, 300) : 'Deleted by CEO from Uploaded Files',
      createdAt: new Date().toISOString()
    });
    saveStore(adsStore);

    return res.json({ success: true, message: `Deleted uploaded file "${safeName}".` });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to delete uploaded file.' });
  }
});

// Immutable Server Audit Logs
router.get('/admin/audit-logs', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  res.json({ logs: adsStore.auditLogs.slice(0, 200) });
});

router.post('/admin/audit-logs', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const admin = req.user!;
  const { action, contentType, recordId, recordTitle, reason } = req.body || {};
  if (!action || !contentType || !recordId) {
    return res.status(400).json({ error: 'action, contentType, and recordId are required.' });
  }

  const log: ServerAuditLog = {
    id: `audit_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    action: String(action).slice(0, 60),
    contentType: String(contentType).slice(0, 80),
    recordId: String(recordId).slice(0, 128),
    ...(recordTitle ? { recordTitle: String(recordTitle).slice(0, 200) } : {}),
    adminEmail: admin.email,
    ...(reason ? { reason: String(reason).slice(0, 400) } : {}),
    createdAt: new Date().toISOString()
  };

  adsStore.auditLogs.unshift(log);
  if (adsStore.auditLogs.length > 1000) {
    adsStore.auditLogs.length = 1000;
  }
  saveStore(adsStore);

  res.json({ success: true, log });
});

export default router;
