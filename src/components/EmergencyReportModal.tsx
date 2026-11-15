import React, { useMemo, useState } from 'react';
import {
  X,
  AlertOctagon,
  ShieldAlert,
  Phone,
  Upload,
  CheckCircle2,
  Lock,
  Copy,
  AlertTriangle
} from 'lucide-react';
import {
  EmergencyContact,
  EmergencyReportKind,
  EmergencyReportStatus
} from '../types.js';
import {
  EMERGENCY_CATEGORIES,
  SECURITY_CONCERN_CATEGORIES,
  FUWUKARI_EMERGENCY_LOCATIONS,
  buildEmergencyCallHref,
  createEmergencyReport
} from '../services/emergencyCentre.js';
import { uploadEmergencyAttachment } from '../services/imageStorage.js';
import { useAuth } from '../context/AuthContext.js';
import { auth } from '../services/firebase.js';

interface EmergencyReportModalProps {
  initialKind: EmergencyReportKind;
  contacts: EmergencyContact[];
  defaultCategory?: string;
  onClose: () => void;
  onSubmitted?: (receipt: {
    reportId: string;
    verificationPin: string;
    status: EmergencyReportStatus;
  }) => void;
  onOpenDirectory?: () => void;
}

function getDefaultDateTimeLocal(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export const EmergencyReportModal: React.FC<EmergencyReportModalProps> = ({
  initialKind,
  contacts,
  defaultCategory,
  onClose,
  onSubmitted,
  onOpenDirectory
}) => {
  const { user } = useAuth();
  const [kind, setKind] = useState<EmergencyReportKind>(initialKind);
  const categoryList =
    kind === 'emergency' ? EMERGENCY_CATEGORIES : SECURITY_CONCERN_CATEGORIES;

  const [reportType, setReportType] = useState<string>(() => {
    if (defaultCategory && categoryList.includes(defaultCategory as never)) {
      return defaultCategory;
    }
    return categoryList[0];
  });
  const [description, setDescription] = useState('');
  const [locationPreset, setLocationPreset] = useState<string>(FUWUKARI_EMERGENCY_LOCATIONS[0]);
  const [customLocation, setCustomLocation] = useState('');
  const [incidentDate, setIncidentDate] = useState<string>(() => getDefaultDateTimeLocal());
  const [contactPhone, setContactPhone] = useState<string>(() => user?.phone || '');
  const [reporterName, setReporterName] = useState<string>(() => user?.name || '');
  const [isConfidential, setIsConfidential] = useState<boolean>(
    initialKind === 'security_concern'
  );
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedReceipt, setCopiedReceipt] = useState(false);

  const [receipt, setReceipt] = useState<{
    reportId: string;
    verificationPin: string;
    status: EmergencyReportStatus;
  } | null>(null);

  const verifiedContacts = useMemo(
    () => contacts.filter((c) => c.verified).slice(0, 4),
    [contacts]
  );

  const handleKindSwitch = (nextKind: EmergencyReportKind) => {
    setKind(nextKind);
    const nextList =
      nextKind === 'emergency' ? EMERGENCY_CATEGORIES : SECURITY_CONCERN_CATEGORIES;
    setReportType(nextList[0]);
    if (nextKind === 'security_concern') {
      setIsConfidential(true);
    }
    setErrorMsg(null);
  };

  const handleUploadPicture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setUploadingPhoto(true);
    setUploadProgress(5);
    try {
      const uid = auth.currentUser?.uid || user?.id || 'reporter';
      const uploaded = await uploadEmergencyAttachment(file, uid, (pct) =>
        setUploadProgress(pct)
      );
      setAttachmentUrls((prev) => [...prev.slice(0, 4), uploaded.downloadUrl]);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to upload attachment photo.');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const resolvedLocation =
      locationPreset === 'Other' ? customLocation.trim() : locationPreset;

    if (!resolvedLocation) {
      setErrorMsg('Please specify the incident location.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await createEmergencyReport({
        kind,
        reportType,
        description,
        location: resolvedLocation,
        incidentDate,
        contactPhone: contactPhone.trim() || undefined,
        reporterName: isConfidential ? undefined : reporterName.trim() || undefined,
        isConfidential,
        attachmentUrls
      });
      setReceipt(created);
      onSubmitted?.(created);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyReceipt = async () => {
    if (!receipt) return;
    const text = `FU MARKET Help Centre Report\nReference ID: ${receipt.reportId}\nVerification PIN: ${receipt.verificationPin}\nStatus: ${receipt.status}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedReceipt(true);
      setTimeout(() => setCopiedReceipt(false), 2500);
    } catch {
      // Ignore clipboard failure
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-2xl bg-white border border-[#E5E7EB] rounded-3xl shadow-2xl overflow-hidden my-4 max-h-[92vh] flex flex-col text-[#111111]">
        {/* Header */}
        <div
          className={`p-5 flex items-center justify-between gap-3 shrink-0 text-white ${
            kind === 'emergency' ? 'bg-[#991B1B]' : 'bg-[#0F1E3D]'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
              {kind === 'emergency' ? (
                <AlertOctagon className="w-6 h-6 text-white" />
              ) : (
                <ShieldAlert className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <h2 className="font-display text-base sm:text-lg font-black">
                {kind === 'emergency'
                  ? 'Report an Emergency'
                  : 'Report a Security Concern'}
              </h2>
              <p className="text-xs text-white/85">
                {kind === 'emergency'
                  ? 'Log urgent incidents for Help Centre review & access direct emergency numbers'
                  : 'Report suspicious activity, unsafe areas, or scams · Confidential option available'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="min-w-[44px] min-h-[44px] rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mandatory Honest Disclaimer + Direct Call Strip */}
        <div className="bg-[#FEF2F2] border-b border-[#FECACA] px-5 py-3 space-y-2 shrink-0">
          <div className="flex items-start gap-2 text-xs text-[#7F1D1D]">
            <AlertTriangle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="font-black">Important Safety Notice:</strong> Submitting an online report logs a record in the FU MARKET Help Centre queue for administrator review and{' '}
              <strong>does NOT automatically contact or dispatch police, fire services, hospital staff, or university security</strong>. If someone is in immediate danger, call a verified emergency line directly.
            </p>
          </div>

          {verifiedContacts.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {verifiedContacts.map((c) => (
                <a
                  key={c.id}
                  href={buildEmergencyCallHref(c.phone)}
                  className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#0B6B3A] hover:bg-[#14532D] text-white text-[11px] font-black inline-flex items-center gap-1.5 transition"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>
                    Call {c.name}: {c.phone}
                  </span>
                </a>
              ))}
            </div>
          ) : (
            onOpenDirectory && (
              <button
                type="button"
                onClick={onOpenDirectory}
                className="text-[11px] font-black text-[#0F1E3D] underline hover:opacity-80"
              >
                Open Emergency Contact Directory
              </button>
            )
          )}
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1">
          {receipt ? (
            <div className="space-y-5 py-2">
              <div className="p-5 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] space-y-3">
                <div className="flex items-center gap-2 text-[#0B6B3A]">
                  <CheckCircle2 className="w-6 h-6 shrink-0" />
                  <h3 className="text-base font-black">
                    Report Logged in Help Centre Queue
                  </h3>
                </div>
                <p className="text-xs text-[#14532D] leading-relaxed">
                  Save your Reference Number and Verification PIN below. You can use them at any time in <strong>Track Report Status</strong> to check administrator review updates.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3.5 rounded-xl bg-white border border-[#A7F3D0]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#475569] block">
                      Reference Number
                    </span>
                    <span className="text-base font-mono font-black text-[#0F1E3D] tabular-nums select-all">
                      {receipt.reportId}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white border border-[#A7F3D0]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#475569] block">
                      Verification PIN
                    </span>
                    <span className="text-base font-mono font-black text-[#0F1E3D] tabular-nums select-all">
                      {receipt.verificationPin}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCopyReceipt}
                    className="min-h-[44px] px-4 py-2 bg-[#0F1E3D] hover:bg-[#16294F] text-white text-xs font-black rounded-xl inline-flex items-center gap-1.5 transition"
                  >
                    <Copy className="w-4 h-4" />
                    <span>{copiedReceipt ? 'Copied Receipt' : 'Copy Reference & PIN'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="min-h-[44px] px-4 py-2 bg-white border border-[#CBD5E1] hover:border-[#0F1E3D] text-[#111111] text-xs font-bold rounded-xl transition"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Kind Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-[#F1F5F9] rounded-2xl">
                <button
                  type="button"
                  onClick={() => handleKindSwitch('emergency')}
                  className={`min-h-[44px] rounded-xl text-xs font-black transition ${
                    kind === 'emergency'
                      ? 'bg-[#DC2626] text-white shadow-xs'
                      : 'text-[#334155] hover:text-[#0F1E3D]'
                  }`}
                >
                  Urgent Emergency Report
                </button>
                <button
                  type="button"
                  onClick={() => handleKindSwitch('security_concern')}
                  className={`min-h-[44px] rounded-xl text-xs font-black transition ${
                    kind === 'security_concern'
                      ? 'bg-[#0F1E3D] text-white shadow-xs'
                      : 'text-[#334155] hover:text-[#0F1E3D]'
                  }`}
                >
                  Security Concern Report
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs font-bold text-[#991B1B]">
                  {errorMsg}
                </div>
              )}

              {/* Report Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-[#0F1E3D] block">
                  {kind === 'emergency' ? 'Type of Emergency *' : 'Security Concern Category *'}
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] focus:border-[#0F1E3D] rounded-xl text-xs font-bold text-[#111111] outline-none"
                >
                  {categoryList.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location + Incident Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-[#0F1E3D] block">
                    Campus / Wukari Location *
                  </label>
                  <select
                    value={locationPreset}
                    onChange={(e) => setLocationPreset(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] focus:border-[#0F1E3D] rounded-xl text-xs font-bold text-[#111111] outline-none"
                  >
                    {FUWUKARI_EMERGENCY_LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                    <option value="Other">Other specific location...</option>
                  </select>
                  {locationPreset === 'Other' && (
                    <input
                      type="text"
                      required
                      value={customLocation}
                      onChange={(e) => setCustomLocation(e.target.value)}
                      placeholder="Enter exact landmark, street, or building..."
                      className="w-full min-h-[44px] px-3 py-2 mt-1.5 bg-white border border-[#CBD5E1] focus:border-[#0F1E3D] rounded-xl text-xs text-[#111111] outline-none"
                    />
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-[#0F1E3D] block">
                    Incident Date &amp; Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={incidentDate}
                    onChange={(e) => setIncidentDate(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] focus:border-[#0F1E3D] rounded-xl text-xs font-bold text-[#111111] outline-none tabular-nums"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-[#0F1E3D] block">
                  Incident Description *
                </label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe clearly what happened, exact landmarks nearby, and any helpful details..."
                  className="w-full p-3 bg-[#F8FAFC] border border-[#CBD5E1] focus:border-[#0F1E3D] rounded-xl text-xs text-[#111111] outline-none"
                />
              </div>

              {/* Confidentiality & Contact Details */}
              <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isConfidential}
                    onChange={(e) => setIsConfidential(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-[#0F1E3D]"
                  />
                  <span className="text-xs text-[#1E293B]">
                    <span className="font-black inline-flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-[#0F1E3D]" />
                      Submit Confidentially
                    </span>
                    <span className="block text-[11px] text-[#475569] mt-0.5">
                      Confidential reports are never displayed publicly and are visible only to the authorized FU MARKET Help Centre administrator.
                    </span>
                  </span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#0F1E3D] block">
                      Contact Phone {kind === 'emergency' ? '*' : '(Optional)'}
                    </label>
                    <input
                      type="tel"
                      required={kind === 'emergency'}
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="e.g. 0803..."
                      className="w-full min-h-[44px] px-3 py-2 bg-white border border-[#CBD5E1] focus:border-[#0F1E3D] rounded-xl text-xs text-[#111111] outline-none tabular-nums"
                    />
                  </div>

                  {!isConfidential && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#0F1E3D] block">
                        Your Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={reporterName}
                        onChange={(e) => setReporterName(e.target.value)}
                        placeholder="Optional name"
                        className="w-full min-h-[44px] px-3 py-2 bg-white border border-[#CBD5E1] focus:border-[#0F1E3D] rounded-xl text-xs text-[#111111] outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Optional Evidence Upload */}
              <div className="space-y-2">
                <label className="text-xs font-black text-[#0F1E3D] block">
                  Optional Picture / Photo Evidence
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="min-h-[44px] px-4 py-2 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#CBD5E1] rounded-xl text-xs font-bold text-[#0F1E3D] inline-flex items-center gap-2 cursor-pointer transition">
                    <Upload className="w-4 h-4" />
                    <span>
                      {uploadingPhoto ? `Uploading (${uploadProgress}%)...` : 'Attach Photo'}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={uploadingPhoto || attachmentUrls.length >= 5}
                      onChange={handleUploadPicture}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[11px] text-[#64748B]">
                    Up to 5 private attachments (only visible to Help Centre admin)
                  </span>
                </div>

                {attachmentUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {attachmentUrls.map((url, idx) => (
                      <div
                        key={url + idx}
                        className="relative w-16 h-16 rounded-xl overflow-hidden border border-[#CBD5E1]"
                      >
                        <img src={url} alt={`Evidence ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() =>
                            setAttachmentUrls((prev) => prev.filter((_, i) => i !== idx))
                          }
                          aria-label="Remove attachment"
                          className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/75 text-white text-[10px] flex items-center justify-center"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Row */}
              <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2.5 pt-2 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[44px] px-5 py-2.5 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] text-xs font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploadingPhoto}
                  className={`min-h-[44px] px-6 py-2.5 text-white text-xs font-black rounded-xl transition disabled:opacity-60 ${
                    kind === 'emergency'
                      ? 'bg-[#DC2626] hover:bg-[#B91C1C]'
                      : 'bg-[#0F1E3D] hover:bg-[#16294F]'
                  }`}
                >
                  {submitting ? 'Submitting Report...' : 'Submit Report to Help Centre'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
