import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { requireAdmin, AuthenticatedRequest } from '../auth.js';

const router = Router();

const DATA_DIR = path.resolve(process.cwd(), 'data');
const SERVICE_PAYMENTS_FILE = path.join(DATA_DIR, 'naijamart_service_payments.json');
const PROOF_SECRET =
  process.env.PAYMENT_PROOF_SECRET ||
  process.env.JWT_SECRET ||
  'fu-market-service-promo-secret-2026';

export type ServicePromoPlanId = 'homepage' | 'weekly' | 'monthly';

const SERVICE_PROMO_PLANS: Record<
  ServicePromoPlanId,
  { id: ServicePromoPlanId; name: string; priceNaira: number; durationDays: number }
> = {
  weekly: { id: 'weekly', name: 'WEEKLY PROMOTION', priceNaira: 2500, durationDays: 7 },
  homepage: { id: 'homepage', name: 'HOMEPAGE PROMOTION', priceNaira: 3500, durationDays: 7 },
  monthly: { id: 'monthly', name: 'MONTHLY PROMOTION', priceNaira: 8000, durationDays: 30 }
};

export interface ServicePaymentRecord {
  id: string;
  reference: string;
  serviceId: string;
  serviceName: string;
  providerName: string;
  payerEmail?: string;
  payerPhone?: string;
  planId: ServicePromoPlanId;
  amountNaira: number;
  currency: 'NGN';
  provider: 'paystack' | 'ceo_manual';
  status: 'initialized' | 'verified' | 'failed';
  gatewayResponse?: string;
  verifiedAt?: string;
  createdAt: string;
}

function loadPayments(): ServicePaymentRecord[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(SERVICE_PAYMENTS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(SERVICE_PAYMENTS_FILE, 'utf-8'));
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (err) {
    console.warn('[ServicePayments load warning]:', err);
  }
  return [];
}

function savePayments(records: ServicePaymentRecord[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(SERVICE_PAYMENTS_FILE, JSON.stringify(records, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[ServicePayments save warning]:', err);
  }
}

const paymentsStore: ServicePaymentRecord[] = loadPayments();

function signProof(record: ServicePaymentRecord): string {
  return crypto
    .createHmac('sha256', PROOF_SECRET)
    .update(`${record.reference}:${record.serviceId}:${record.planId}:${record.amountNaira}:${record.status}`)
    .digest('hex');
}

function getPaystackSecretKey(): string {
  return String(process.env.PAYSTACK_SECRET_KEY || '').trim();
}

router.get('/paystack/status', (_req: Request, res: Response) => {
  const configured = Boolean(getPaystackSecretKey());
  res.json({
    configured,
    message: configured
      ? 'Paystack service promotion checkout is active.'
      : 'Paystack API key (PAYSTACK_SECRET_KEY) is not configured on the server. Use direct CEO verification (08167258121) for manual payment confirmation.'
  });
});

router.post('/paystack/initialize', async (req: Request, res: Response) => {
  const secretKey = getPaystackSecretKey();
  if (!secretKey) {
    return res.status(503).json({
      configured: false,
      error:
        'Paystack payment gateway is not configured on this server (PAYSTACK_SECRET_KEY missing). Please contact FU MARKET CEO (08167258121) on WhatsApp for payment instructions.'
    });
  }

  const { serviceId, planId, serviceName, providerName, email, phone, callbackUrl } = req.body || {};
  const plan = SERVICE_PROMO_PLANS[planId as ServicePromoPlanId];

  if (!plan) {
    return res.status(400).json({ error: 'Invalid service promotion plan selected.' });
  }
  if (!serviceId || typeof serviceId !== 'string' || serviceId.length > 128) {
    return res.status(400).json({ error: 'Valid service ID is required.' });
  }

  const safeServiceName = String(serviceName || 'FU MARKET Service').trim().slice(0, 140);
  const safeProviderName = String(providerName || 'Service Provider').trim().slice(0, 120);
  const safeEmail =
    typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      ? email.trim()
      : `service-${serviceId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16) || 'srv'}@fumarket.ng`;

  const reference = `FUMKT_SRV_${Date.now()}_${crypto.randomBytes(5).toString('hex').toUpperCase()}`;

  try {
    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: safeEmail,
        amount: plan.priceNaira * 100,
        currency: 'NGN',
        reference,
        ...(callbackUrl ? { callback_url: String(callbackUrl) } : {}),
        metadata: {
          serviceId,
          planId: plan.id,
          planName: plan.name,
          serviceName: safeServiceName,
          providerName: safeProviderName,
          phone: phone ? String(phone).slice(0, 40) : ''
        }
      })
    });

    const data: any = await paystackRes.json();
    if (!paystackRes.ok || !data?.status || !data?.data?.authorization_url) {
      return res.status(502).json({
        configured: true,
        error: data?.message || 'Unable to initialize Paystack transaction.'
      });
    }

    const record: ServicePaymentRecord = {
      id: `spay_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      reference,
      serviceId,
      serviceName: safeServiceName,
      providerName: safeProviderName,
      payerEmail: safeEmail,
      payerPhone: phone ? String(phone).slice(0, 40) : undefined,
      planId: plan.id,
      amountNaira: plan.priceNaira,
      currency: 'NGN',
      provider: 'paystack',
      status: 'initialized',
      createdAt: new Date().toISOString()
    };

    paymentsStore.unshift(record);
    savePayments(paymentsStore);

    return res.json({
      configured: true,
      reference,
      authorizationUrl: data.data.authorization_url,
      amountNaira: plan.priceNaira,
      durationDays: plan.durationDays,
      currency: 'NGN'
    });
  } catch (err: any) {
    return res.status(502).json({
      configured: true,
      error: err?.message || 'Network error while connecting to Paystack.'
    });
  }
});

router.post('/paystack/verify', async (req: Request, res: Response) => {
  const secretKey = getPaystackSecretKey();
  if (!secretKey) {
    return res.status(503).json({
      configured: false,
      error:
        'Paystack payment gateway is not configured on this server (PAYSTACK_SECRET_KEY missing). Contact FU MARKET CEO (08167258121) for manual verification.'
    });
  }

  const { reference, serviceId, planId } = req.body || {};
  const cleanRef = String(reference || '').trim();
  const cleanServiceId = String(serviceId || '').trim();
  const plan = SERVICE_PROMO_PLANS[planId as ServicePromoPlanId];

  if (!cleanRef || cleanRef.length > 160) {
    return res.status(400).json({ error: 'Valid Paystack payment reference is required.' });
  }
  if (!cleanServiceId || cleanServiceId.length > 128) {
    return res.status(400).json({ error: 'Valid service ID is required.' });
  }
  if (!plan) {
    return res.status(400).json({ error: 'Valid promotion plan is required.' });
  }

  const existingVerified = paymentsStore.find(
    (p) => p.reference === cleanRef && p.status === 'verified'
  );
  if (existingVerified) {
    if (existingVerified.serviceId !== cleanServiceId) {
      return res.status(409).json({
        error: 'Duplicate transaction blocked: This Paystack reference has already been used for another service.'
      });
    }
    return res.json({
      verified: true,
      alreadyVerified: true,
      payment: existingVerified,
      proofSignature: signProof(existingVerified)
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
    const expectedKobo = plan.priceNaira * 100;

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
        error: `Amount paid (₦${(paidKobo / 100).toLocaleString()}) is less than ${plan.name} price (₦${plan.priceNaira.toLocaleString()}).`
      });
    }

    const existingInit = paymentsStore.find((p) => p.reference === cleanRef);
    const nowIso = new Date().toISOString();

    let savedRecord: ServicePaymentRecord;
    if (existingInit) {
      existingInit.status = 'verified';
      existingInit.gatewayResponse = String(tx.gateway_response || 'Approved');
      existingInit.verifiedAt = nowIso;
      savedRecord = existingInit;
    } else {
      savedRecord = {
        id: `spay_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        reference: cleanRef,
        serviceId: cleanServiceId,
        serviceName: String(tx?.metadata?.serviceName || 'FU MARKET Service'),
        providerName: String(tx?.metadata?.providerName || 'Provider'),
        payerEmail: tx?.customer?.email ? String(tx.customer.email) : undefined,
        planId: plan.id,
        amountNaira: paidKobo / 100,
        currency: 'NGN',
        provider: 'paystack',
        status: 'verified',
        gatewayResponse: String(tx.gateway_response || 'Approved'),
        verifiedAt: nowIso,
        createdAt: nowIso
      };
      paymentsStore.unshift(savedRecord);
    }

    savePayments(paymentsStore);

    return res.json({
      verified: true,
      payment: savedRecord,
      proofSignature: signProof(savedRecord),
      message: 'Payment verified successfully via Paystack.'
    });
  } catch (err: any) {
    return res.status(502).json({
      verified: false,
      error: err?.message || 'Network error while verifying payment with Paystack.'
    });
  }
});

router.get('/admin/payments', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  res.json({ payments: paymentsStore });
});

router.post(
  '/admin/promotions/manual-verify',
  requireAdmin,
  (req: AuthenticatedRequest, res: Response) => {
    const admin = req.user!;
    const { serviceId, serviceName, providerName, planId, reference, amountNaira, payerPhone } =
      req.body || {};
    const plan = SERVICE_PROMO_PLANS[planId as ServicePromoPlanId];
    if (!serviceId || !plan) {
      return res.status(400).json({ error: 'serviceId and valid planId are required.' });
    }

    const cleanRef =
      String(reference || '').trim() ||
      `CEO_SRV_${Date.now()}_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const dup = paymentsStore.find(
      (p) => p.reference === cleanRef && p.status === 'verified' && p.serviceId !== serviceId
    );
    if (dup) {
      return res
        .status(409)
        .json({ error: 'Duplicate payment reference already used for another service.' });
    }

    const nowIso = new Date().toISOString();
    const record: ServicePaymentRecord = {
      id: `spay_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      reference: cleanRef,
      serviceId: String(serviceId),
      serviceName: String(serviceName || 'FU MARKET Service').slice(0, 140),
      providerName: String(providerName || 'Provider').slice(0, 120),
      payerPhone: payerPhone ? String(payerPhone).slice(0, 40) : undefined,
      planId: plan.id,
      amountNaira: Number(amountNaira) > 0 ? Number(amountNaira) : plan.priceNaira,
      currency: 'NGN',
      provider: 'ceo_manual',
      status: 'verified',
      gatewayResponse: `Verified by CEO (${admin.email})`,
      verifiedAt: nowIso,
      createdAt: nowIso
    };

    paymentsStore.unshift(record);
    savePayments(paymentsStore);

    return res.json({ success: true, payment: record });
  }
);

export default router;
