import React, { useEffect, useState } from 'react';
import {
  X,
  Upload,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { AdPackageId, Advertisement } from '../types.js';
import {
  AD_SUBMISSION_SUCCESS_MESSAGE,
  ADVERTISING_PACKAGES,
  BUSINESS_CATEGORIES,
  CEO_ADS_PHONE,
  fetchPaystackStatus,
  getPackageById,
  initializePaystackPayment,
  submitAdvertisement,
  verifyPaystackPayment
} from '../services/ads.js';
import { uploadAdLogoImage, uploadAdvertisementImage } from '../services/imageStorage.js';
import { useAuth } from '../context/AuthContext.js';
import { CeoContactButton } from './CeoContactButton.js';
import { formatNaira } from './ProductCard.js';

interface AdvertiseBusinessModalProps {
  initialPackageId?: AdPackageId;
  onClose: () => void;
  onSubmitted?: (ad: Advertisement) => void;
}

export const AdvertiseBusinessModal: React.FC<AdvertiseBusinessModalProps> = ({
  initialPackageId = 'basic',
  onClose,
  onSubmitted
}) => {
  const { user } = useAuth();

  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [whatsappNumber, setWhatsappNumber] = useState(user?.whatsappNumber || user?.phone || '');
  const [businessCategory, setBusinessCategory] = useState<string>(BUSINESS_CATEGORIES[0]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('Wukari / FUWUKARI Campus');
  const [packageId, setPackageId] = useState<AdPackageId>(initialPackageId);
  const [websiteOrSocialLink, setWebsiteOrSocialLink] = useState('');

  const [imageUrl, setImageUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [bannerProgress, setBannerProgress] = useState(0);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoProgress, setLogoProgress] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedAd, setSubmittedAd] = useState<Advertisement | null>(null);

  const [paystackConfigured, setPaystackConfigured] = useState<boolean | null>(null);
  const [paystackStatusMessage, setPaystackStatusMessage] = useState<string>('');
  const [paying, setPaying] = useState(false);
  const [payRefInput, setPayRefInput] = useState('');
  const [payResultMsg, setPayResultMsg] = useState<string | null>(null);
  const [payErrorMsg, setPayErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchPaystackStatus()
      .then((res) => {
        setPaystackConfigured(Boolean(res?.configured));
        setPaystackStatusMessage(res?.message || '');
      })
      .catch(() => {
        setPaystackConfigured(false);
        setPaystackStatusMessage(
          `Paystack checkout status could not be reached. Please contact NIGERIA CAMPUS MARKET CEO (${CEO_ADS_PHONE}) on WhatsApp for payment instructions.`
        );
      });
  }, []);

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setUploadingBanner(true);
    setBannerProgress(5);
    try {
      const result = await uploadAdvertisementImage(file, user?.id || 'advertiser', (pct) =>
        setBannerProgress(pct)
      );
      setImageUrl(result.downloadUrl);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to upload advertisement image.');
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setUploadingLogo(true);
    setLogoProgress(5);
    try {
      const result = await uploadAdLogoImage(file, user?.id || 'advertiser', (pct) =>
        setLogoProgress(pct)
      );
      setLogoUrl(result.downloadUrl);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to upload business logo.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!imageUrl) {
      setErrorMsg('Please upload your advertisement banner or image.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await submitAdvertisement({
        businessName,
        ownerName,
        phone,
        whatsappNumber,
        businessCategory,
        title,
        description,
        imageUrl,
        logoUrl: logoUrl || undefined,
        location,
        packageId,
        websiteOrSocialLink: websiteOrSocialLink || undefined
      });
      setSubmittedAd(created);
      onSubmitted?.(created);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to submit advertisement. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayWithPaystack = async () => {
    if (!submittedAd) return;
    setPayErrorMsg(null);
    setPayResultMsg(null);
    setPaying(true);
    try {
      const initRes = await initializePaystackPayment({
        adId: submittedAd.id,
        packageId: submittedAd.packageId,
        businessName: submittedAd.businessName,
        phone: submittedAd.phone,
        email: user?.email
      });
      setPayRefInput(initRes.reference);
      setPayResultMsg(
        `Transaction initialized (${initRes.reference}). Redirecting to Paystack checkout—or copy/save your reference and click "Verify Payment" below.`
      );
      window.location.assign(initRes.authorizationUrl);
    } catch (err: any) {
      setPayErrorMsg(
        err?.message ||
          `Unable to start Paystack checkout. Please contact NIGERIA CAMPUS MARKET CEO (${CEO_ADS_PHONE}) on WhatsApp.`
      );
    } finally {
      setPaying(false);
    }
  };

  const handleVerifyPaystackRef = async () => {
    if (!submittedAd || !payRefInput.trim()) return;
    setPayErrorMsg(null);
    setPayResultMsg(null);
    setPaying(true);
    try {
      const res = await verifyPaystackPayment({
        reference: payRefInput.trim(),
        adId: submittedAd.id,
        packageId: submittedAd.packageId
      });
      if (res.verified) {
        setPayResultMsg(
          `Payment verified (${res.payment.reference} · ${formatNaira(res.payment.amountNaira)}). Your advert is queued for CEO activation.`
        );
      }
    } catch (err: any) {
      setPayErrorMsg(err?.message || 'Payment verification failed.');
    } finally {
      setPaying(false);
    }
  };

  const selectedPkg = getPackageById(packageId);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs overflow-y-auto flex items-center justify-center p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label="Advertise Your Business on NIGERIA CAMPUS MARKET"
    >
      <div className="relative w-full max-w-2xl bg-white border border-[#E5E7EB] rounded-2xl shadow-xl overflow-hidden my-4 text-[#10251D]">
        {/* Header */}
        <div className="bg-[#087443] text-white px-5 py-4 flex items-center justify-between gap-4 border-b border-[#065D36]">
          <div>
            <h2 className="text-base sm:text-lg font-black text-[#D4A62A]">
              ADVERTISE YOUR BUSINESS
            </h2>
            <p className="text-xs text-white/90">
              NIGERIA CAMPUS MARKET ADS · Reach Students Nationwide
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-9 h-9 rounded-lg bg-[#065D36] hover:bg-[#D4A62A] text-white hover:text-[#10251D] flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 max-h-[82vh] overflow-y-auto space-y-5">
          {submittedAd ? (
            /* SUBMISSION SUCCESS SCREEN */
            <div className="space-y-5">
              <div className="p-4 sm:p-5 bg-[#F0FDF4] border border-[#86EFAC] rounded-xl space-y-2">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-[#087443] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-black text-[#065D36] leading-relaxed">
                      {AD_SUBMISSION_SUCCESS_MESSAGE}
                    </p>
                    <p className="text-xs text-[#333333] tabular-nums">
                      Reference ID: <span className="font-mono font-bold">{submittedAd.id}</span> ·{' '}
                      {selectedPkg.name} ({formatNaira(selectedPkg.priceNaira)} · {selectedPkg.durationDays} days)
                    </p>
                  </div>
                </div>
              </div>

              {/* Official CEO Orange WhatsApp Contact */}
              <div className="p-4 sm:p-5 bg-[#FFF7ED] border border-[#FDBA74] rounded-xl space-y-3">
                <p className="text-xs font-bold text-[#9A3412]">
                  Direct CEO Advertising Desk
                </p>
                <CeoContactButton businessName={submittedAd.businessName} />
              </div>

              {/* Secure Paystack Checkout Section */}
              <div className="p-4 sm:p-5 border border-[#E5E7EB] rounded-xl space-y-3 bg-[#F9FAFB]">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#087443]" />
                    <h3 className="text-sm font-black text-[#10251D]">
                      Paystack Online Payment ({formatNaira(submittedAd.packagePrice)})
                    </h3>
                  </div>
                  <ShieldCheck className="w-4 h-4 text-[#087443]" />
                </div>

                {paystackConfigured === false ? (
                  <div className="text-xs text-[#555555] space-y-1.5">
                    <p className="font-semibold text-[#92400E]">
                      Paystack online gateway is not configured on this server yet (`PAYSTACK_SECRET_KEY` missing).
                    </p>
                    <p>
                      Please tap <strong>MESSAGE CEO FOR ANY ADVERT</strong> above or message{' '}
                      <strong className="tabular-nums">{CEO_ADS_PHONE}</strong> on WhatsApp to receive payment details and fast CEO approval.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-[#555555]">
                      {paystackStatusMessage ||
                        'Every payment is cryptographically verified by our server before admin activation.'}
                    </p>
                    <button
                      type="button"
                      disabled={paying}
                      onClick={handlePayWithPaystack}
                      className="px-4 py-2.5 bg-[#087443] hover:bg-[#065D36] disabled:opacity-60 text-white text-xs font-black rounded-xl transition flex items-center gap-2"
                    >
                      {paying && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span>Pay {formatNaira(submittedAd.packagePrice)} via Paystack</span>
                    </button>

                    <div className="pt-2 border-t border-[#E5E7EB] flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="Enter Paystack reference to verify..."
                        value={payRefInput}
                        onChange={(e) => setPayRefInput(e.target.value)}
                        className="flex-1 px-3 py-2 text-xs font-mono border border-[#E5E7EB] rounded-lg bg-white outline-none focus:border-[#087443]"
                      />
                      <button
                        type="button"
                        disabled={paying || !payRefInput.trim()}
                        onClick={handleVerifyPaystackRef}
                        className="px-4 py-2 bg-[#10251D] hover:bg-[#065D36] disabled:opacity-50 text-white text-xs font-bold rounded-lg transition whitespace-nowrap"
                      >
                        Verify Payment
                      </button>
                    </div>
                  </div>
                )}

                {payResultMsg && (
                  <p className="text-xs font-bold text-[#087443] bg-white p-2.5 rounded-lg border border-[#86EFAC]">
                    {payResultMsg}
                  </p>
                )}
                {payErrorMsg && (
                  <p className="text-xs font-bold text-[#B91C1C] bg-[#FEF2F2] p-2.5 rounded-lg border border-[#FCA5A5]">
                    {payErrorMsg}
                  </p>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-[#10251D] text-white text-xs font-bold rounded-xl hover:bg-[#065D36] transition"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* SUBMISSION FORM */
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Official CEO Contact Banner Inside Submission Form */}
              <div className="p-3.5 bg-[#FFF7ED] border border-[#FDBA74] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-[#7C2D12]">
                  <p className="font-bold">Need direct help or custom advert rates?</p>
                  <p className="mt-0.5 tabular-nums">NIGERIA CAMPUS MARKET CEO – {CEO_ADS_PHONE}</p>
                </div>
                <CeoContactButton compact showSubLabel={false} />
              </div>

              {errorMsg && (
                <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-xs font-bold rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Package Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-[#10251D]">
                  Select Advertising Package *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {ADVERTISING_PACKAGES.map((pkg) => {
                    const active = packageId === pkg.id;
                    return (
                      <button
                        key={pkg.id}
                        type="button"
                        onClick={() => setPackageId(pkg.id)}
                        className={`p-3 rounded-xl border text-left transition ${
                          active
                            ? 'border-[#087443] bg-[#F0FDF4]'
                            : 'border-[#E5E7EB] bg-white hover:border-[#087443]/60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-black text-[#10251D]">{pkg.name}</span>
                        </div>
                        <p className="text-base font-black text-[#087443] mt-1 tabular-nums">
                          {formatNaira(pkg.priceNaira)}
                        </p>
                        <p className="text-[11px] text-[#555555] mt-0.5 tabular-nums">
                          {pkg.durationDays} days · {pkg.placementLabel}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Business & Owner Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#10251D] mb-1">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={140}
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Wukari Campus Kitchen"
                    className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl focus:border-[#087443] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#10251D] mb-1">
                    Owner&apos;s Name *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={120}
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl focus:border-[#087443] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#10251D] mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={40}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 08012345678"
                    className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl focus:border-[#087443] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#10251D] mb-1">
                    WhatsApp Number *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={40}
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="e.g. 08012345678"
                    className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl focus:border-[#087443] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#10251D] mb-1">
                    Business Category *
                  </label>
                  <select
                    value={businessCategory}
                    onChange={(e) => setBusinessCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl focus:border-[#087443] outline-none bg-white"
                  >
                    {BUSINESS_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#10251D] mb-1">
                    Business Location *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={180}
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Behind LT, New Site, Wukari"
                    className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl focus:border-[#087443] outline-none"
                  />
                </div>
              </div>

              {/* Ad Content */}
              <div>
                <label className="block text-xs font-bold text-[#10251D] mb-1">
                  Advertisement Title / Headline *
                </label>
                <input
                  type="text"
                  required
                  maxLength={180}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Catchy headline for FUWUKARI students"
                  className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl focus:border-[#087443] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#10251D] mb-1">
                  Advertisement Description *
                </label>
                <textarea
                  required
                  rows={4}
                  maxLength={4000}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your products, prices, discounts, delivery hours, and why students should contact you..."
                  className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl focus:border-[#087443] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#10251D] mb-1">
                  Website or Social Media Link (Optional)
                </label>
                <input
                  type="text"
                  maxLength={500}
                  value={websiteOrSocialLink}
                  onChange={(e) => setWebsiteOrSocialLink(e.target.value)}
                  placeholder="https://instagram.com/yourbusiness"
                  className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl focus:border-[#087443] outline-none"
                />
              </div>

              {/* Firebase Storage Uploads */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 border border-[#E5E7EB] rounded-xl space-y-2 bg-[#F9FAFB]">
                  <label className="block text-xs font-bold text-[#10251D]">
                    Advertisement Image / Banner *
                  </label>
                  <label className="flex items-center justify-center gap-2 px-3 py-2.5 bg-white border border-dashed border-[#087443] rounded-xl text-xs font-bold text-[#087443] cursor-pointer hover:bg-[#F0FDF4] transition">
                    <Upload className="w-4 h-4" />
                    <span>{uploadingBanner ? `Uploading ${bannerProgress}%` : imageUrl ? 'Change Banner Image' : 'Upload Banner Image'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleBannerUpload}
                      className="hidden"
                    />
                  </label>
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt="Advertisement preview"
                      className="w-full h-28 object-cover rounded-lg border border-[#E5E7EB]"
                    />
                  )}
                </div>

                <div className="p-3.5 border border-[#E5E7EB] rounded-xl space-y-2 bg-[#F9FAFB]">
                  <label className="block text-xs font-bold text-[#10251D]">
                    Business Logo (Optional)
                  </label>
                  <label className="flex items-center justify-center gap-2 px-3 py-2.5 bg-white border border-dashed border-[#E5E7EB] rounded-xl text-xs font-bold text-[#555555] cursor-pointer hover:border-[#087443] transition">
                    <Upload className="w-4 h-4" />
                    <span>{uploadingLogo ? `Uploading ${logoProgress}%` : logoUrl ? 'Change Logo' : 'Upload Business Logo'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                  {logoUrl && (
                    <img
                      src={logoUrl}
                      alt="Logo preview"
                      className="w-16 h-16 object-cover rounded-xl border border-[#E5E7EB]"
                    />
                  )}
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[#E5E7EB]">
                <p className="text-[11px] text-[#555555]">
                  Selected: <strong className="text-[#10251D]">{selectedPkg.name}</strong> ({formatNaira(selectedPkg.priceNaira)} · {selectedPkg.durationDays} days)
                </p>
                <button
                  type="submit"
                  disabled={submitting || uploadingBanner || uploadingLogo}
                  className="px-6 py-3 bg-[#087443] hover:bg-[#065D36] disabled:opacity-60 text-white text-xs sm:text-sm font-black rounded-xl transition flex items-center justify-center gap-2 min-h-[44px]"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Submit Advertisement</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
