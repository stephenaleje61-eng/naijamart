import React, { useState } from 'react';
import {
  X,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Megaphone
} from 'lucide-react';
import {
  AdPackageId,
  AdType,
  AdVisibilityScope,
  AdvertisingRequest
} from '../types.js';
import {
  AD_TYPE_OPTIONS,
  ADVERTISING_PACKAGES,
  AUDIENCE_SCOPE_OPTIONS,
  BUSINESS_CATEGORIES,
  CEO_ADS_PHONE,
  getPackageById,
  submitAdvertisingRequest
} from '../services/ads.js';
import { uploadAdRequestAttachment } from '../services/imageStorage.js';
import { useAuth } from '../context/AuthContext.js';
import { CeoContactButton } from './CeoContactButton.js';
import { formatNaira } from './ProductCard.js';

interface AdvertiseBusinessModalProps {
  initialPackageId?: AdPackageId;
  activeInstitutionId?: string;
  onClose: () => void;
  onSubmitted?: (request: AdvertisingRequest) => void;
}

export const AdvertiseBusinessModal: React.FC<AdvertiseBusinessModalProps> = ({
  initialPackageId = 'featured',
  activeInstitutionId,
  onClose,
  onSubmitted
}) => {
  const { user } = useAuth();

  const [advertiserName, setAdvertiserName] = useState(user?.name || '');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [whatsappNumber, setWhatsappNumber] = useState(user?.whatsappNumber || user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [category, setCategory] = useState<string>(BUSINESS_CATEGORIES[0]);
  const [adType, setAdType] = useState<AdType>('business_ad');
  const [targetAudience, setTargetAudience] = useState<AdVisibilityScope>('all_institutions');
  const [preferredPackageId, setPreferredPackageId] = useState<AdPackageId>(initialPackageId);
  const [message, setMessage] = useState('');

  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedRequest, setSubmittedRequest] = useState<AdvertisingRequest | null>(null);

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 4 - attachments.length);
    if (files.length === 0) return;

    setErrorMsg(null);
    setUploadingFile(true);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        setUploadProgress(10);
        const result = await uploadAdRequestAttachment(file, user?.id || 'requester', (pct) =>
          setUploadProgress(pct)
        );
        uploaded.push(result.downloadUrl);
      }
      setAttachments((prev) => [...prev, ...uploaded].slice(0, 4));
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to upload image/flyer. Please try another file.');
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const created = await submitAdvertisingRequest({
        advertiserName,
        businessName,
        phone,
        whatsappNumber: whatsappNumber || phone,
        email: email || undefined,
        category,
        adType,
        message,
        targetAudience,
        targetInstitutionId:
          activeInstitutionId && activeInstitutionId !== 'all' ? activeInstitutionId : undefined,
        preferredPackageId,
        attachments
      });
      setSubmittedRequest(created);
      onSubmitted?.(created);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to submit advertising request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedPkg = getPackageById(preferredPackageId);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs overflow-y-auto flex items-center justify-center p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label="Submit Advertising Request on NIGERIA CAMPUS MARKET"
    >
      <div className="relative w-full max-w-2xl bg-[#FFFFFF] border border-[#D9E5DF] rounded-2xl shadow-xl overflow-hidden my-4 text-[#202B26]">
        <div className="bg-[#075B3B] text-[#FFFFFF] px-5 py-4 flex items-center justify-between gap-4 border-b border-[#0B8050]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0B8050] flex items-center justify-center shrink-0">
              <Megaphone className="w-5 h-5 text-[#F2C94C]" />
            </div>
            <div>
              <h2 className="font-display text-base sm:text-lg font-black text-[#FFFFFF]">
                Advertise on Nigeria Campus Market
              </h2>
              <p className="text-xs text-[#F2C94C] font-semibold">
                Reach Nigerian Universities, Campuses &amp; Student Communities
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-9 h-9 rounded-lg bg-[#0B8050] hover:bg-[#F2C94C] text-[#FFFFFF] hover:text-[#202B26] flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 max-h-[82vh] overflow-y-auto space-y-5">
          {submittedRequest ? (
            <div className="space-y-5">
              <div className="p-4 sm:p-5 bg-[#F4F7F5] border border-[#0B8050]/40 rounded-xl space-y-2">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-[#075B3B] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-[#075B3B]">
                      Advertising Request Sent to Admin Inbox
                    </h3>
                    <p className="text-xs text-[#202B26]/80 leading-relaxed">
                      Thank you, <strong>{submittedRequest.advertiserName}</strong>. Your campaign inquiry for{' '}
                      <strong>{submittedRequest.businessName}</strong> has been received and our team will review and contact you shortly.
                    </p>
                    <p className="text-xs text-[#202B26]/70 tabular-nums pt-1">
                      Reference ID: <span className="font-mono font-bold text-[#202B26]">{submittedRequest.id}</span> ·{' '}
                      {selectedPkg.name} ({formatNaira(selectedPkg.priceNaira)} · {selectedPkg.durationDays} days)
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-5 bg-[#F4F7F5] border border-[#F2C94C]/60 rounded-xl space-y-3">
                <p className="text-xs font-extrabold text-[#202B26]">
                  Need Immediate Approval or Custom Multi-University Placement?
                </p>
                <CeoContactButton businessName={submittedRequest.businessName} />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-[#075B3B] hover:bg-[#0B8050] text-[#FFFFFF] text-xs font-extrabold rounded-xl transition"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="p-3.5 bg-[#F4F7F5] border border-[#D9E5DF] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-[#202B26]/80">
                  <p className="font-extrabold text-[#075B3B]">Submit Your Campaign Request</p>
                  <p className="mt-0.5 tabular-nums">
                    Requests go directly to our Super Admin Advertising Inbox ({CEO_ADS_PHONE}).
                  </p>
                </div>
                <CeoContactButton compact showSubLabel={false} />
              </div>

              {errorMsg && (
                <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-xs font-bold rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-xs font-black text-[#202B26]">
                  Preferred Advertising Package
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {ADVERTISING_PACKAGES.map((pkg) => {
                    const active = preferredPackageId === pkg.id;
                    return (
                      <button
                        key={pkg.id}
                        type="button"
                        onClick={() => setPreferredPackageId(pkg.id)}
                        className={`p-3 rounded-xl border text-left transition ${
                          active
                            ? 'border-[#075B3B] bg-[#F4F7F5] ring-1 ring-[#0B8050]'
                            : 'border-[#D9E5DF] bg-[#FFFFFF] hover:border-[#0B8050]/60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-black text-[#202B26]">{pkg.name}</span>
                          {pkg.featuredPosition && (
                            <span className="px-1.5 py-0.5 rounded bg-[#F2C94C] text-[#202B26] text-[9px] font-black">
                              POPULAR
                            </span>
                          )}
                        </div>
                        <p className="text-base font-black text-[#075B3B] mt-1 tabular-nums">
                          {formatNaira(pkg.priceNaira)}
                        </p>
                        <p className="text-[11px] text-[#202B26]/70 mt-0.5 tabular-nums">
                          {pkg.durationDays} days · {pkg.placementLabel}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#202B26] mb-1">
                    Advertiser Name *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={120}
                    value={advertiserName}
                    onChange={(e) => setAdvertiserName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full px-3 py-2 text-xs border border-[#D9E5DF] rounded-xl focus:border-[#075B3B] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#202B26] mb-1">
                    Business / Organization Name *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={140}
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Campus Kitchen, Hostel Brand, NGO"
                    className="w-full px-3 py-2 text-xs border border-[#D9E5DF] rounded-xl focus:border-[#075B3B] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#202B26] mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={40}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 08012345678"
                    className="w-full px-3 py-2 text-xs border border-[#D9E5DF] rounded-xl focus:border-[#075B3B] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#202B26] mb-1">
                    WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    maxLength={40}
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="e.g. 08012345678"
                    className="w-full px-3 py-2 text-xs border border-[#D9E5DF] rounded-xl focus:border-[#075B3B] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#202B26] mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    maxLength={160}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@business.com"
                    className="w-full px-3 py-2 text-xs border border-[#D9E5DF] rounded-xl focus:border-[#075B3B] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#202B26] mb-1">
                    Business Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#D9E5DF] rounded-xl focus:border-[#075B3B] outline-none bg-[#FFFFFF]"
                  >
                    {BUSINESS_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#202B26] mb-1">
                    Advertisement Type
                  </label>
                  <select
                    value={adType}
                    onChange={(e) => setAdType(e.target.value as AdType)}
                    className="w-full px-3 py-2 text-xs border border-[#D9E5DF] rounded-xl focus:border-[#075B3B] outline-none bg-[#FFFFFF]"
                  >
                    {AD_TYPE_OPTIONS.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#202B26] mb-1">
                    Target Audience Preference
                  </label>
                  <select
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value as AdVisibilityScope)}
                    className="w-full px-3 py-2 text-xs border border-[#D9E5DF] rounded-xl focus:border-[#075B3B] outline-none bg-[#FFFFFF]"
                  >
                    {AUDIENCE_SCOPE_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202B26] mb-1">
                  Advertising Message &amp; Campaign Details *
                </label>
                <textarea
                  required
                  rows={4}
                  maxLength={4000}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe what you want to advertise, your target universities/campuses, offers, dates, and website or WhatsApp link..."
                  className="w-full px-3 py-2 text-xs border border-[#D9E5DF] rounded-xl focus:border-[#075B3B] outline-none"
                />
              </div>

              <div className="p-3.5 border border-[#D9E5DF] rounded-xl space-y-2.5 bg-[#F4F7F5]">
                <div className="flex items-center justify-between gap-2">
                  <label className="block text-xs font-bold text-[#202B26]">
                    Upload Campaign Flyers or Product Images (Optional, up to 4)
                  </label>
                  <span className="text-[11px] font-bold text-[#075B3B] tabular-nums">
                    {attachments.length}/4
                  </span>
                </div>

                {attachments.length < 4 && (
                  <label className="flex items-center justify-center gap-2 px-3 py-2.5 bg-[#FFFFFF] border border-dashed border-[#075B3B] rounded-xl text-xs font-bold text-[#075B3B] cursor-pointer hover:bg-[#E6EFEA] transition">
                    <Upload className="w-4 h-4" />
                    <span>
                      {uploadingFile
                        ? `Uploading ${uploadProgress}%...`
                        : 'Select Image(s) / Flyer to Attach'}
                    </span>
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleAttachmentUpload}
                      className="hidden"
                    />
                  </label>
                )}

                {attachments.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {attachments.map((url, idx) => (
                      <div key={`${url}-${idx}`} className="relative group">
                        <img
                          src={url}
                          alt={`Attachment ${idx + 1}`}
                          className="w-full h-20 object-cover rounded-lg border border-[#D9E5DF]"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setAttachments((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-[#202B26]/80 text-white flex items-center justify-center hover:bg-red-600 transition"
                          aria-label="Remove attachment"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[#D9E5DF]">
                <p className="text-[11px] text-[#202B26]/70">
                  Selected: <strong className="text-[#202B26]">{selectedPkg.name}</strong> ({formatNaira(selectedPkg.priceNaira)} · {selectedPkg.durationDays} days)
                </p>
                <button
                  type="submit"
                  disabled={submitting || uploadingFile}
                  className="px-6 py-3 bg-[#075B3B] hover:bg-[#0B8050] disabled:opacity-60 text-[#FFFFFF] text-xs sm:text-sm font-black rounded-xl transition flex items-center justify-center gap-2 min-h-[44px]"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Send Advertising Request</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
