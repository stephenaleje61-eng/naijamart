import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import {
  AuthenticatedRequest,
  getClientIp,
  requireCeoAdmin,
  requireCeoRecentReauth
} from '../auth.js';
import {
  ceoStore,
  ServerPaymentTransactionRecord,
  SubscriptionPlanRecord
} from '../ceoStore.js';

const router = Router();

function getPaystackSecret(): string {
  return String(process.env.PAYSTACK_SECRET_KEY || '').trim();
}

function getFlutterwaveSecret(): string {
  return String(process.env.FLUTTERWAVE_SECRET_KEY || '').trim();
}

function getFlutterwaveWebhookHash(): string {
  return String(process.env.FLUTTERWAVE_WEBHOOK_HASH || '').trim();
}

// Public: List subscription plans & ad boost packages (in NGN)
router.get('/plans', (_req: Request, res: Response) => {
  const plans = ceoStore.getData().subscriptionPlans.filter((p) => p.isActive);
  res.json({ plans });
});

// Public: Report live payment gateway configuration state (never exposes secret keys)
router.get('/gateway-status', (_req: Request, res: Response) => {
  const paystackConfigured = Boolean(getPaystackSecret());
  const flutterwaveConfigured = Boolean(getFlutterwaveSecret());
  const codPolicy = ceoStore.getData().codPolicy;
  res.json({
    paystackConfigured,
    flutterwaveConfigured,
    paystackPublicKeyConfigured: Boolean(String(process.env.PAYSTACK_PUBLIC_KEY || '').trim()),
    flutterwavePublicKeyConfigured: Boolean(String(process.env.FLUTTERWAVE_PUBLIC_KEY || '').trim()),
    anyConfigured: paystackConfigured || flutterwaveConfigured,
    codPolicy,
    fallbackContactPhone: '08167258121',
    message:
      paystackConfigured || flutterwaveConfigured
        ? 'Live Nigerian payment gateway active (NGN).'
        : 'Paystack / Flutterwave secret keys are not yet configured on this server. No simulated charges are performed; contact NIGERIA CAMPUS MARKET CEO (08167258121) for manual verification.'
  });
});

// Public: Read current Pay-on-Delivery policy
router.get('/cod-policy', (_req: Request, res: Response) => {
  res.json({ codPolicy: ceoStore.getData().codPolicy });
});

// CEO-only: Update Pay-on-Delivery policy
router.put(
  '/ceo/cod-policy',
  requireCeoAdmin,
  requireCeoRecentReauth(),
  (req: AuthenticatedRequest, res: Response) => {
    const fbUser = req.firebaseUser!;
    const updated = ceoStore.updateCodPolicy(req.body || {}, fbUser.email);
    ceoStore.recordSecurityLog({
      eventType: 'CEO_SETTINGS_UPDATED',
      severity: 'info',
      actorEmail: fbUser.email,
      actorUid: fbUser.uid,
      ipAddress: getClientIp(req),
      summary: `CEO updated Pay-on-Delivery policy (codEnabled=${updated.codEnabled}, codFoodEnabled=${updated.codFoodEnabled}).`
    });
    res.json({ codPolicy: updated });
  }
);

// CEO-only: Update subscription plan pricing, duration, description, or availability
router.put(
  '/ceo/plans',
  requireCeoAdmin,
  requireCeoRecentReauth(),
  (req: AuthenticatedRequest, res: Response) => {
    const fbUser = req.firebaseUser!;
    const { plans } = req.body || {};
    if (!Array.isArray(plans) || plans.length === 0) {
      return res.status(400).json({ error: 'Array of subscription plans is required.' });
    }

    const nowIso = new Date().toISOString();
    const sanitized: SubscriptionPlanRecord[] = plans.map((p: any) => ({
      id: String(p.id || `plan_${Date.now()}`).slice(0, 80),
      slug: String(p.slug || p.id || 'plan').slice(0, 80),
      audience: p.audience || 'seller_pro',
      name: String(p.name || 'Subscription Plan').trim().slice(0, 120),
      description: String(p.description || '').trim().slice(0, 400),
      priceNaira: Math.max(0, Math.round(Number(p.priceNaira) || 0)),
      durationDays: Math.max(1, Math.min(3650, Math.round(Number(p.durationDays) || 30))),
      currency: 'NGN',
      features: Array.isArray(p.features)
        ? p.features.map((f: any) => String(f).trim()).filter(Boolean).slice(0, 8)
        : [],
      isActive: p.isActive !== false,
      targetScope: ['campus', 'state', 'nationwide'].includes(p.targetScope)
        ? p.targetScope
        : 'campus',
      updatedAt: nowIso
    }));

    const storeData = ceoStore.getData();
    storeData.subscriptionPlans = sanitized;
    ceoStore.save();

    ceoStore.recordSecurityLog({
      eventType: 'CEO_PRICING_UPDATED',
      severity: 'info',
      actorEmail: fbUser.email,
      actorUid: fbUser.uid,
      ipAddress: getClientIp(req),
      summary: `CEO updated ${sanitized.length} subscription/advertising plan(s).`
    });

    res.json({ plans: storeData.subscriptionPlans });
  }
);

// Initialize genuine Paystack or Flutterwave transaction (NGN) for plans OR verified product/food orders
router.post('/initialize', async (req: Request, res: Response) => {
  const {
    planId,
    orderType = 'subscription',
    orderId,
    amountNaira: requestedAmountNaira,
    title: requestedTitle,
    gateway = 'paystack',
    userId,
    userEmail,
    userName,
    institutionId,
    callbackUrl
  } = req.body || {};

  const storeData = ceoStore.getData();
  const isOrderCheckout =
    orderType === 'product_order' || orderType === 'food_order' || orderType === 'ad_package';

  let resolvedAmountNaira = 0;
  let resolvedPlanId = String(planId || orderType || 'order');
  let resolvedPlanName = String(requestedTitle || 'NIGERIA CAMPUS MARKET Order').slice(0, 120);

  if (isOrderCheckout) {
    const parsed = Math.round(Number(requestedAmountNaira) || 0);
    if (!Number.isFinite(parsed) || parsed < 100 || parsed > 50000000) {
      return res.status(400).json({ error: 'Order total must be between ₦100 and ₦50,000,000.' });
    }
    resolvedAmountNaira = parsed;
    resolvedPlanId = String(orderId || orderType);
    resolvedPlanName = String(
      requestedTitle || (orderType === 'food_order' ? 'Campus Food Order' : 'Campus Marketplace Order')
    ).slice(0, 120);
  } else {
    const plan = storeData.subscriptionPlans.find((p) => p.id === planId && p.isActive);
    if (!plan) {
      return res.status(400).json({ error: 'Selected subscription plan is invalid or inactive.' });
    }
    resolvedAmountNaira = plan.priceNaira;
    resolvedPlanId = plan.id;
    resolvedPlanName = plan.name;
  }

  const chosenGateway: 'paystack' | 'flutterwave' =
    gateway === 'flutterwave' ? 'flutterwave' : 'paystack';

  if (chosenGateway === 'paystack') {
    const secret = getPaystackSecret();
    if (!secret) {
      return res.status(503).json({
        configured: false,
        gateway: 'paystack',
        error:
          'Paystack API key (PAYSTACK_SECRET_KEY) is not configured on this server. No simulated payment was executed.'
      });
    }

    const safeEmail =
      typeof userEmail === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail.trim())
        ? userEmail.trim()
        : `member-${Date.now()}@nigeriacampusmarket.ng`;
    const reference = `NCM_PSK_${Date.now()}_${crypto.randomBytes(5).toString('hex').toUpperCase()}`;

    try {
      const psRes = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secret}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: safeEmail,
          amount: resolvedAmountNaira * 100,
          currency: 'NGN',
          reference,
          ...(callbackUrl ? { callback_url: String(callbackUrl) } : {}),
          metadata: {
            orderType,
            orderId: orderId ? String(orderId).slice(0, 128) : undefined,
            planId: resolvedPlanId,
            planName: resolvedPlanName,
            userId: String(userId || 'guest').slice(0, 128),
            userName: String(userName || 'Student').slice(0, 120),
            institutionId: String(institutionId || 'fuwukari').slice(0, 100)
          }
        })
      });

      const data: any = await psRes.json();
      if (!psRes.ok || !data?.status || !data?.data?.authorization_url) {
        return res.status(502).json({
          configured: true,
          error: data?.message || 'Unable to initialize Paystack checkout.'
        });
      }

      const txRecord: ServerPaymentTransactionRecord = {
        id: `ptx_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        reference,
        userId: String(userId || 'guest').slice(0, 128),
        userEmail: safeEmail,
        userName: userName ? String(userName).slice(0, 120) : undefined,
        orderType,
        orderId: orderId ? String(orderId).slice(0, 128) : undefined,
        planId: resolvedPlanId,
        planName: resolvedPlanName,
        amountNaira: resolvedAmountNaira,
        currency: 'NGN',
        gateway: 'paystack',
        status: 'initialized',
        institutionId: institutionId ? String(institutionId).slice(0, 100) : undefined,
        createdAt: new Date().toISOString()
      };
      storeData.paymentTransactions.unshift(txRecord);
      ceoStore.save();

      return res.json({
        configured: true,
        gateway: 'paystack',
        reference,
        authorizationUrl: data.data.authorization_url,
        amountNaira: resolvedAmountNaira,
        currency: 'NGN'
      });
    } catch (err: any) {
      return res.status(502).json({
        configured: true,
        error: err?.message || 'Network error while connecting to Paystack.'
      });
    }
  } else {
    const flwSecret = getFlutterwaveSecret();
    if (!flwSecret) {
      return res.status(503).json({
        configured: false,
        gateway: 'flutterwave',
        error:
          'Flutterwave API key (FLUTTERWAVE_SECRET_KEY) is not configured on this server. No simulated payment was executed.'
      });
    }

    const safeEmail =
      typeof userEmail === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail.trim())
        ? userEmail.trim()
        : `member-${Date.now()}@nigeriacampusmarket.ng`;
    const reference = `NCM_FLW_${Date.now()}_${crypto.randomBytes(5).toString('hex').toUpperCase()}`;

    try {
      const flwRes = await fetch('https://api.flutterwave.com/v3/payments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${flwSecret}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tx_ref: reference,
          amount: resolvedAmountNaira,
          currency: 'NGN',
          redirect_url: callbackUrl || 'https://nigeriacampusmarket.ng',
          customer: {
            email: safeEmail,
            name: String(userName || 'NIGERIA CAMPUS MARKET Member').slice(0, 120)
          },
          customizations: {
            title: 'NIGERIA CAMPUS MARKET',
            description: resolvedPlanName
          },
          meta: {
            orderType,
            orderId: orderId ? String(orderId).slice(0, 128) : undefined,
            planId: resolvedPlanId,
            userId: String(userId || 'guest').slice(0, 128),
            institutionId: String(institutionId || 'fuwukari').slice(0, 100)
          }
        })
      });

      const data: any = await flwRes.json();
      if (!flwRes.ok || data?.status !== 'success' || !data?.data?.link) {
        return res.status(502).json({
          configured: true,
          error: data?.message || 'Unable to initialize Flutterwave checkout.'
        });
      }

      const txRecord: ServerPaymentTransactionRecord = {
        id: `ptx_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        reference,
        userId: String(userId || 'guest').slice(0, 128),
        userEmail: safeEmail,
        userName: userName ? String(userName).slice(0, 120) : undefined,
        orderType,
        orderId: orderId ? String(orderId).slice(0, 128) : undefined,
        planId: resolvedPlanId,
        planName: resolvedPlanName,
        amountNaira: resolvedAmountNaira,
        currency: 'NGN',
        gateway: 'flutterwave',
        status: 'initialized',
        institutionId: institutionId ? String(institutionId).slice(0, 100) : undefined,
        createdAt: new Date().toISOString()
      };
      storeData.paymentTransactions.unshift(txRecord);
      ceoStore.save();

      return res.json({
        configured: true,
        gateway: 'flutterwave',
        reference,
        authorizationUrl: data.data.link,
        amountNaira: resolvedAmountNaira,
        currency: 'NGN'
      });
    } catch (err: any) {
      return res.status(502).json({
        configured: true,
        error: err?.message || 'Network error while connecting to Flutterwave.'
      });
    }
  }
});

// Verify genuine payment transaction with server-side idempotency & amount checks
router.post('/verify', async (req: Request, res: Response) => {
  const { reference, gateway = 'paystack', transactionId, planId } = req.body || {};
  const cleanRef = String(reference || '').trim();
  if (!cleanRef || cleanRef.length > 160) {
    return res.status(400).json({ error: 'Valid payment reference is required.' });
  }

  const storeData = ceoStore.getData();
  const existingVerified = storeData.paymentTransactions.find(
    (t) => t.reference === cleanRef && t.status === 'verified'
  );
  if (existingVerified) {
    return res.json({
      verified: true,
      alreadyVerified: true,
      transaction: existingVerified
    });
  }

  const pendingTx = storeData.paymentTransactions.find((t) => t.reference === cleanRef);
  const plan =
    storeData.subscriptionPlans.find((p) => p.id === (planId || pendingTx?.planId)) || null;
  const expectedAmountNaira = pendingTx?.amountNaira || plan?.priceNaira || 0;

  if (gateway === 'flutterwave') {
    const flwSecret = getFlutterwaveSecret();
    if (!flwSecret) {
      return res.status(503).json({
        configured: false,
        verified: false,
        error: 'Flutterwave secret key is not configured on server.'
      });
    }
    const txId = String(transactionId || '').trim();
    const verifyEndpoint = txId
      ? `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(txId)}/verify`
      : `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(cleanRef)}`;

    try {
      const flwRes = await fetch(verifyEndpoint, {
        headers: { Authorization: `Bearer ${flwSecret}` }
      });
      const data: any = await flwRes.json();
      const tx = data?.data;
      if (!flwRes.ok || data?.status !== 'success' || !tx) {
        return res.status(400).json({ verified: false, error: data?.message || 'Verification failed.' });
      }
      if (tx.status !== 'successful' || String(tx.currency).toUpperCase() !== 'NGN') {
        return res.status(400).json({ verified: false, error: `Flutterwave status: ${tx.status}` });
      }
      if (expectedAmountNaira > 0 && Number(tx.amount) < expectedAmountNaira) {
        return res.status(400).json({ verified: false, error: 'Paid amount is less than plan price.' });
      }

      const nowIso = new Date().toISOString();
      if (pendingTx) {
        pendingTx.status = 'verified';
        pendingTx.gatewayTransactionId = String(tx.id || '');
        pendingTx.gatewayResponse = String(tx.processor_response || 'Successful');
        pendingTx.verifiedAt = nowIso;
        ceoStore.save();
        return res.json({ verified: true, transaction: pendingTx, plan });
      }

      const created: ServerPaymentTransactionRecord = {
        id: `ptx_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        reference: cleanRef,
        userId: String(tx?.meta?.userId || 'guest'),
        userEmail: tx?.customer?.email ? String(tx.customer.email) : undefined,
        planId: plan?.id || String(planId || 'custom'),
        planName: plan?.name || 'Subscription Plan',
        amountNaira: Number(tx.amount || expectedAmountNaira),
        currency: 'NGN',
        gateway: 'flutterwave',
        status: 'verified',
        gatewayTransactionId: String(tx.id || ''),
        gatewayResponse: String(tx.processor_response || 'Successful'),
        verifiedAt: nowIso,
        createdAt: nowIso
      };
      storeData.paymentTransactions.unshift(created);
      ceoStore.save();
      return res.json({ verified: true, transaction: created, plan });
    } catch (err: any) {
      return res.status(502).json({ verified: false, error: err?.message || 'Network verification error.' });
    }
  } else {
    const psSecret = getPaystackSecret();
    if (!psSecret) {
      return res.status(503).json({
        configured: false,
        verified: false,
        error: 'Paystack secret key is not configured on server.'
      });
    }

    try {
      const psRes = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(cleanRef)}`,
        {
          headers: { Authorization: `Bearer ${psSecret}` }
        }
      );
      const data: any = await psRes.json();
      const tx = data?.data;
      if (!psRes.ok || !data?.status || !tx) {
        return res.status(400).json({ verified: false, error: data?.message || 'Verification failed.' });
      }
      if (tx.status !== 'success' || String(tx.currency).toUpperCase() !== 'NGN') {
        return res.status(400).json({ verified: false, error: `Paystack status: ${tx.status}` });
      }
      const paidNaira = Number(tx.amount || 0) / 100;
      if (expectedAmountNaira > 0 && paidNaira < expectedAmountNaira) {
        return res.status(400).json({ verified: false, error: 'Paid amount is less than plan price.' });
      }

      const nowIso = new Date().toISOString();
      if (pendingTx) {
        pendingTx.status = 'verified';
        pendingTx.gatewayTransactionId = String(tx.id || '');
        pendingTx.gatewayResponse = String(tx.gateway_response || 'Approved');
        pendingTx.verifiedAt = nowIso;
        ceoStore.save();
        return res.json({ verified: true, transaction: pendingTx, plan });
      }

      const created: ServerPaymentTransactionRecord = {
        id: `ptx_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        reference: cleanRef,
        userId: String(tx?.metadata?.userId || 'guest'),
        userEmail: tx?.customer?.email ? String(tx.customer.email) : undefined,
        planId: plan?.id || String(planId || 'custom'),
        planName: plan?.name || 'Subscription Plan',
        amountNaira: paidNaira,
        currency: 'NGN',
        gateway: 'paystack',
        status: 'verified',
        gatewayTransactionId: String(tx.id || ''),
        gatewayResponse: String(tx.gateway_response || 'Approved'),
        verifiedAt: nowIso,
        createdAt: nowIso
      };
      storeData.paymentTransactions.unshift(created);
      ceoStore.save();
      return res.json({ verified: true, transaction: created, plan });
    } catch (err: any) {
      return res.status(502).json({ verified: false, error: err?.message || 'Network verification error.' });
    }
  }
});

// Cryptographically verified Paystack & Flutterwave Webhook endpoint
router.post('/webhook', (req: Request & { rawBody?: Buffer }, res: Response) => {
  const paystackSig = req.headers['x-paystack-signature'];
  const flwHash = req.headers['verif-hash'];

  if (typeof paystackSig === 'string') {
    const secret = getPaystackSecret();
    if (!secret) return res.status(503).json({ error: 'Paystack not configured.' });

    const payloadBuffer = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
    const expectedHash = crypto.createHmac('sha512', secret).update(payloadBuffer).digest('hex');
    if (paystackSig !== expectedHash) {
      return res.status(401).json({ error: 'Invalid Paystack webhook signature.' });
    }

    if (req.body?.event === 'charge.success' && req.body?.data?.reference) {
      const ref = String(req.body.data.reference);
      const storeData = ceoStore.getData();
      const tx = storeData.paymentTransactions.find((t) => t.reference === ref);
      if (tx && tx.status !== 'verified') {
        tx.status = 'verified';
        tx.gatewayResponse = String(req.body.data.gateway_response || 'Webhook Approved');
        tx.verifiedAt = new Date().toISOString();
        ceoStore.save();
      }
    }
    return res.sendStatus(200);
  }

  if (typeof flwHash === 'string') {
    const expected = getFlutterwaveWebhookHash();
    if (!expected || flwHash !== expected) {
      return res.status(401).json({ error: 'Invalid Flutterwave webhook hash.' });
    }

    if (req.body?.data?.tx_ref && req.body?.data?.status === 'successful') {
      const ref = String(req.body.data.tx_ref);
      const storeData = ceoStore.getData();
      const tx = storeData.paymentTransactions.find((t) => t.reference === ref);
      if (tx && tx.status !== 'verified') {
        tx.status = 'verified';
        tx.gatewayTransactionId = String(req.body.data.id || '');
        tx.gatewayResponse = 'Flutterwave Webhook Successful';
        tx.verifiedAt = new Date().toISOString();
        ceoStore.save();
      }
    }
    return res.sendStatus(200);
  }

  return res.status(400).json({ error: 'Missing gateway webhook verification signature.' });
});

// CEO-only: View all subscription & boost payment transactions
router.get('/ceo/transactions', requireCeoAdmin, (_req: AuthenticatedRequest, res: Response) => {
  res.json({ transactions: ceoStore.getData().paymentTransactions });
});

export default router;
