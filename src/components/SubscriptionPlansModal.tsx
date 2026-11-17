import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  CreditCard,
  Crown,
  ExternalLink,
  Loader2,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  X
} from 'lucide-react';
import {
  Institution,
  SubscriptionPlan,
  User,
  UserSubscription
} from '../types.js';
import {
  fetchPaymentGatewayStatus,
  fetchSubscriptionPlans,
  GatewayStatusResponse,
  initializePlanCheckout
} from '../services/monetization.js';
import { CEO_ADS_PHONE, getCeoAdsWhatsAppUrl } from '../services/ads.js';

interface SubscriptionPlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  activeInstitution: Institution;
  userSubscriptions: UserSubscription[];
  onRequireLogin: () => void;
  onShowToast: (msg: string) => void;
}

export const SubscriptionPlansModal: React.FC<SubscriptionPlansModalProps> = ({
  isOpen,
  onClose,
  user,
  activeInstitution,
  userSubscriptions,
  onRequireLogin,
  onShowToast
}) => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingKey, setProcessingKey] = useState<string | null>(null);
  const [checkoutLink, setCheckoutLink] = useState<{ url: string; planName: string; gateway: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setLoading(true);
    setErrorMsg('');
    Promise.all([fetchSubscriptionPlans(), fetchPaymentGatewayStatus()])
      .then(([loadedPlans, gw]) => {
        if (!active) return;
        setPlans(loadedPlans.filter((p) => p.isActive));
        setGatewayStatus(gw);
      })
      .catch((err) => {
        if (active) setErrorMsg(err instanceof Error ? err.message : 'Unable to load plans.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCheckout = async (plan: SubscriptionPlan, gateway: 'paystack' | 'flutterwave') => {
    if (!user) {
      onShowToast('Please sign in first to subscribe to a plan.');
      onRequireLogin();
      return;
    }

    const opKey = `${plan.id}:${gateway}`;
    setProcessingKey(opKey);
    setErrorMsg('');
    setCheckoutLink(null);

    try {
      const res = await initializePlanCheckout({
        planId: plan.id,
        gateway,
        userId: user.id,
        userEmail: user.email || `${user.id}@nigeriauniversityhub.ng`,
        userName: user.name,
        institutionId: activeInstitution.id
      });
      setCheckoutLink({ url: res.authorizationUrl, planName: plan.name, gateway });
      onShowToast(`Redirecting to ${gateway === 'paystack' ? 'Paystack' : 'Flutterwave'} secure checkout...`);
      window.location.assign(res.authorizationUrl);
    } catch (err: any) {
      setErrorMsg(
        err?.message ||
          `Gateway checkout could not be initialized. Contact NIGERIA CAMPUS MARKET CEO (${CEO_ADS_PHONE}) for manual activation.`
      );
    } finally {
      setProcessingKey(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#10251D]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="NIGERIA CAMPUS MARKET Monetization & Plans"
    >
      <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl border border-[#D9E5DF] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#10251D] text-white px-5 sm:px-6 py-4 flex items-center justify-between gap-4 border-b border-[#D4A62A]/50">
          <div className="flex items-center gap-2.5">
            <Crown className="w-5 h-5 text-[#D4A62A]" />
            <div>
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight">
                NIGERIA CAMPUS MARKET PLANS &amp; PROMOTIONS (NGN)
              </h2>
              <p className="text-xs text-slate-200 mt-0.5">
                Upgrade your store visibility, campus agent status, or nationwide business promotion.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-10 min-w-10 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
            aria-label="Close plans modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#F4F8F5] space-y-5">
          {/* Active Subscriptions Banner */}
          {userSubscriptions.filter((s) => s.status === 'active').length > 0 && (
            <div className="bg-white border border-[#087443]/40 rounded-xl p-4">
              <h3 className="text-xs font-extrabold text-[#087443] uppercase tracking-wider mb-2">
                Your Active Subscriptions
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {userSubscriptions
                  .filter((s) => s.status === 'active')
                  .map((sub) => (
                    <div
                      key={sub.id}
                      className="p-3 rounded-lg bg-[#F4F8F5] border border-[#D9E5DF] flex items-center justify-between gap-2"
                    >
                      <div>
                        <p className="text-xs font-bold text-[#10251D]">{sub.planName}</p>
                        <p className="text-[11px] text-slate-600 tabular-nums">
                          Expires: {new Date(sub.expiresAt).toLocaleDateString('en-NG')}
                        </p>
                      </div>
                      <span className="text-[11px] font-bold text-[#087443] flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Active</span>
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Gateway Configuration Notice */}
          {gatewayStatus && !gatewayStatus.anyGatewayConfigured && (
            <div className="bg-white border border-[#D4A62A] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#10251D]">
                  Online Card Gateways Awaiting Server Keys
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Online Paystack / Flutterwave checkout activates automatically once live server keys are configured. Contact NIGERIA CAMPUS MARKET CEO directly on WhatsApp ({CEO_ADS_PHONE}) for verified bank transfer activation.
                </p>
              </div>
              <a
                href={getCeoAdsWhatsAppUrl('NIGERIA CAMPUS MARKET Plan Activation')}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg bg-[#087443] hover:bg-[#065D36] text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp CEO ({CEO_ADS_PHONE})</span>
              </a>
            </div>
          )}

          {checkoutLink && (
            <div className="bg-white border border-[#087443] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs font-semibold text-[#10251D]">
                Checkout ready for <strong>{checkoutLink.planName}</strong> via{' '}
                {checkoutLink.gateway}. If not redirected automatically, tap the button.
              </p>
              <a
                href={checkoutLink.url}
                className="px-4 py-2 rounded-lg bg-[#087443] text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <span>Open Secure Payment Page</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-xs text-red-700 font-medium">
              {errorMsg}
            </div>
          )}

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-600">
              <Loader2 className="w-7 h-7 animate-spin text-[#087443] mb-2" />
              <p className="text-xs font-semibold">Loading official NGN subscription plans...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className="bg-white border border-[#D9E5DF] rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#087443]">
                        {plan.targetScope} visibility
                      </span>
                      <span className="text-xs font-semibold text-slate-500 tabular-nums">
                        {plan.durationDays} days
                      </span>
                    </div>
                    <h3 className="text-base font-extrabold text-[#10251D] mt-1 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#D4A62A] shrink-0" />
                      <span>{plan.name}</span>
                    </h3>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-2xl font-black text-[#10251D] tabular-nums">
                        ₦{Number(plan.priceNaira || 0).toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-500">NGN</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-2">{plan.description}</p>

                    <ul className="mt-4 space-y-1.5">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="text-xs text-[#10251D] flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#087443] shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-slate-100">
                    {gatewayStatus?.paystackConfigured && (
                      <button
                        type="button"
                        disabled={Boolean(processingKey)}
                        onClick={() => handleCheckout(plan, 'paystack')}
                        className="w-full py-2.5 px-3 rounded-xl bg-[#087443] hover:bg-[#065D36] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition"
                      >
                        {processingKey === `${plan.id}:paystack` ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CreditCard className="w-3.5 h-3.5" />
                        )}
                        <span>Pay ₦{Number(plan.priceNaira).toLocaleString()} via Paystack</span>
                      </button>
                    )}

                    {gatewayStatus?.flutterwaveConfigured && (
                      <button
                        type="button"
                        disabled={Boolean(processingKey)}
                        onClick={() => handleCheckout(plan, 'flutterwave')}
                        className="w-full py-2.5 px-3 rounded-xl bg-[#10251D] hover:bg-[#091812] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition"
                      >
                        {processingKey === `${plan.id}:flutterwave` ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CreditCard className="w-3.5 h-3.5 text-[#D4A62A]" />
                        )}
                        <span>Pay ₦{Number(plan.priceNaira).toLocaleString()} via Flutterwave</span>
                      </button>
                    )}

                    <a
                      href={getCeoAdsWhatsAppUrl(`${plan.name} (₦${Number(plan.priceNaira).toLocaleString()})`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 px-3 rounded-xl border border-[#D9E5DF] hover:border-[#087443] bg-[#F4F8F5] text-[#10251D] text-xs font-bold flex items-center justify-center gap-1.5 transition"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-[#087443]" />
                      <span>Activate via CEO WhatsApp</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
