import React, { useEffect, useState } from 'react';
import {
  X,
  Star,
  CreditCard,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { ServiceListing, ServicePromotionPlanId } from '../types.js';
import {
  SERVICE_PROMOTION_PLANS,
  fetchServicePaystackStatus,
  getServicePromoPlan,
  initializeServicePromoPayment,
  verifyServicePromoPayment
} from '../services/servicesMarketplace.js';
import { CEO_ADS_PHONE } from '../services/ads.js';
import { CeoContactButton } from './CeoContactButton.js';
import { useAuth } from '../context/AuthContext.js';
import { formatNaira } from './ProductCard.js';

interface ServicePromotionModalProps {
  service: ServiceListing;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ServicePromotionModal: React.FC<ServicePromotionModalProps> = ({
  service,
  onClose,
  onSuccess
}) => {
  const { user } = useAuth();
  const [selectedPlanId, setSelectedPlanId] = useState<ServicePromotionPlanId>('homepage');
  const [paystackConfigured, setPaystackConfigured] = useState<boolean | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [refInput, setRefInput] = useState('');
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchServicePaystackStatus()
      .then((res) => {
        setPaystackConfigured(Boolean(res?.configured));
        setStatusMessage(res?.message || '');
      })
      .catch(() => {
        setPaystackConfigured(false);
        setStatusMessage(
          `Paystack gateway could not be reached. Please contact NIGERIA CAMPUS MARKET CEO (${CEO_ADS_PHONE}) for payment instructions.`
        );
      });
  }, []);

  const plan = getServicePromoPlan(selectedPlanId);

  const handleStartPaystack = async () => {
    setErrorMsg(null);
    setResultMsg(null);
    setLoading(true);
    try {
      const res = await initializeServicePromoPayment({
        serviceId: service.serviceId,
        planId: plan.id,
        serviceName: service.serviceName,
        providerName: service.providerName,
        phone: service.phone,
        email: user?.email
      });
      setRefInput(res.reference);
      setResultMsg(
        `Paystack payment initialized (${res.reference}). Redirecting to checkout—save your reference or return here to verify.`
      );
      window.location.assign(res.authorizationUrl);
    } catch (err: any) {
      setErrorMsg(
        err?.message ||
          `Unable to start Paystack checkout. Please contact NIGERIA CAMPUS MARKET CEO (${CEO_ADS_PHONE}) on WhatsApp.`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPayment = async () => {
    if (!refInput.trim()) return;
    setErrorMsg(null);
    setResultMsg(null);
    setLoading(true);
    try {
      const res = await verifyServicePromoPayment({
        reference: refInput.trim(),
        serviceId: service.serviceId,
        planId: plan.id
      });
      if (res?.verified) {
        setResultMsg(
          `Payment verified (${res.payment.reference} · ${formatNaira(res.payment.amountNaira)}). Your featured service placement is queued for confirmation and activation.`
        );
        onSuccess?.();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to verify payment reference.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs overflow-y-auto flex items-center justify-center p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label="Promote Your Service"
    >
      <div className="relative w-full max-w-xl bg-white border border-[#E5E7EB] rounded-2xl shadow-2xl overflow-hidden my-4 text-[#10251D]">
        <div className="bg-[#087443] text-white px-5 py-4 flex items-center justify-between gap-4 border-b border-[#065D36]">
          <div className="flex items-center gap-2 min-w-0">
            <Star className="w-5 h-5 text-[#D4A62A] shrink-0" />
            <div className="min-w-0">
              <h2 className="text-base font-black text-[#D4A62A] truncate">
                FEATURED SERVICES – PROMOTE YOUR BUSINESS
              </h2>
              <p className="text-xs text-white/90 truncate">{service.serviceName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-9 h-9 rounded-lg bg-[#065D36] hover:bg-[#D4A62A] text-white hover:text-[#10251D] flex items-center justify-center transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          <div className="space-y-2">
            <label className="block text-xs font-black text-[#10251D]">
              Select Promotion Plan
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {SERVICE_PROMOTION_PLANS.map((p) => {
                const active = selectedPlanId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPlanId(p.id)}
                    className={`p-3.5 rounded-xl border text-left transition ${
                      active
                        ? 'border-[#087443] bg-[#F0FDF4]'
                        : 'border-[#E5E7EB] bg-white hover:border-[#087443]/60'
                    }`}
                  >
                    <p className="text-xs font-black text-[#10251D]">{p.name}</p>
                    <p className="text-lg font-black text-[#087443] mt-1 tabular-nums">
                      {formatNaira(p.priceNaira)}
                    </p>
                    <p className="text-[11px] text-[#555555] mt-0.5 tabular-nums">
                      {p.durationDays} days · {p.placementLabel}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#087443]" />
                <h3 className="text-sm font-black text-[#10251D]">
                  Verified Payment ({formatNaira(plan.priceNaira)})
                </h3>
              </div>
              <ShieldCheck className="w-4 h-4 text-[#087443]" />
            </div>

            <p className="text-[11px] text-[#555555]">
              Paid promotions are activated ONLY after verified payment confirmation.
            </p>

            {paystackConfigured === false ? (
              <div className="space-y-3 pt-1">
                <p className="text-xs font-semibold text-[#92400E]">
                  {statusMessage ||
                    'Paystack online payment is not configured on this server yet.'}
                </p>
                <div className="p-3 bg-[#FFF7ED] border border-[#FDBA74] rounded-xl space-y-2">
                  <p className="text-xs font-bold text-[#9A3412]">
                    Contact NIGERIA CAMPUS MARKET CEO ({CEO_ADS_PHONE}) for payment instructions and instant featured activation:
                  </p>
                  <CeoContactButton businessName={`${service.serviceName} (${plan.name})`} compact />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleStartPaystack}
                  className="px-4 py-2.5 bg-[#087443] hover:bg-[#065D36] disabled:opacity-60 text-white text-xs font-black rounded-xl transition flex items-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Pay {formatNaira(plan.priceNaira)} via Paystack</span>
                </button>

                <div className="pt-2 border-t border-[#E5E7EB] flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={refInput}
                    onChange={(e) => setRefInput(e.target.value)}
                    placeholder="Enter Paystack reference..."
                    className="flex-1 px-3 py-2 text-xs font-mono border border-[#E5E7EB] rounded-lg bg-white outline-none focus:border-[#087443]"
                  />
                  <button
                    type="button"
                    disabled={loading || !refInput.trim()}
                    onClick={handleVerifyPayment}
                    className="px-4 py-2 bg-[#10251D] hover:bg-[#065D36] disabled:opacity-50 text-white text-xs font-bold rounded-lg transition whitespace-nowrap"
                  >
                    Verify Payment
                  </button>
                </div>
              </div>
            )}

            {resultMsg && (
              <div className="p-3 bg-[#F0FDF4] border border-[#86EFAC] rounded-lg text-xs font-bold text-[#065D36] flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{resultMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-lg text-xs font-bold text-[#B91C1C] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
