import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Upload,
  X
} from 'lucide-react';
import { ScamTargetType } from '../types.js';
import {
  checkFlaggedIdentifier,
  IdentifierCheckResult,
  submitScamReport
} from '../services/antiScam.js';
import { uploadImageToFirebaseStorage } from '../services/imageStorage.js';
import { useAuth } from '../context/AuthContext.js';
import { getLocalStudentSession } from '../utils/studentAuth.js';

interface AntiScamReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: ScamTargetType;
  targetId: string;
  targetName: string;
  targetUserId?: string;
  defaultPhone?: string;
  institutionId?: string;
}

const SCAM_REASONS = [
  'Payment collected without delivering item/service',
  'Fake product or misleading photos',
  'Suspicious advance payment / deposit demand',
  'Impersonation of verified student or official agent',
  'Harassment or fraudulent messages',
  'Duplicate scam listing / stolen identity',
  'Other safety / fraud concern'
];

export const AntiScamReportModal: React.FC<AntiScamReportModalProps> = ({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetName,
  targetUserId,
  defaultPhone,
  institutionId
}) => {
  const { user } = useAuth();
  const [reason, setReason] = useState(SCAM_REASONS[0]);
  const [details, setDetails] = useState('');
  const [suspectPhone, setSuspectPhone] = useState(defaultPhone || '');
  const [suspectBankAccount, setSuspectBankAccount] = useState('');
  const [suspectBankName, setSuspectBankName] = useState('');
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [identifierLookup, setIdentifierLookup] = useState<IdentifierCheckResult | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSuspectPhone(defaultPhone || '');
    setDetails('');
    setSuspectBankAccount('');
    setSuspectBankName('');
    setEvidenceUrls([]);
    setError(null);
    setSubmittedId(null);
    setIdentifierLookup(null);
  }, [isOpen, defaultPhone, targetId]);

  useEffect(() => {
    if (!isOpen) return;
    const cleanPhone = suspectPhone.trim();
    const cleanBank = suspectBankAccount.trim();
    if (!cleanPhone && !cleanBank) {
      setIdentifierLookup(null);
      return;
    }
    const timer = setTimeout(() => {
      checkFlaggedIdentifier({ phone: cleanPhone, bankAccount: cleanBank })
        .then(setIdentifierLookup)
        .catch(() => {});
    }, 350);
    return () => clearTimeout(timer);
  }, [isOpen, suspectPhone, suspectBankAccount]);

  if (!isOpen) return null;

  const handleEvidenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded = await uploadImageToFirebaseStorage(file, {
        folder: 'scam_evidence',
        ownerId: user?.id || 'reporter',
        allowPersistentFallback: true
      });
      setEvidenceUrls((prev) => [...prev, uploaded.downloadUrl].slice(0, 4));
    } catch (err: any) {
      setError(err?.message || 'Could not upload screenshot evidence.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!details.trim() || details.trim().length < 12) {
      setError('Please describe what happened with clear dates, amounts, or details (at least 12 characters).');
      return;
    }
    setSubmitting(true);
    setError(null);

    const localStudent = getLocalStudentSession();
    const reporterId = user?.id || localStudent?.id || 'campus_reporter';
    const reporterName = user?.name || localStudent?.name || 'Campus Member';

    try {
      const report = await submitScamReport({
        targetType,
        targetId,
        targetName,
        targetUserId,
        suspectPhone: suspectPhone.trim() || undefined,
        suspectBankAccount: suspectBankAccount.trim() || undefined,
        suspectBankName: suspectBankName.trim() || undefined,
        institutionId,
        reporterId,
        reporterName,
        reporterEmail: user?.email,
        reason,
        details: details.trim(),
        evidenceUrls
      });
      setSubmittedId(report.id);
    } catch (err: any) {
      setError(err?.message || 'Unable to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#172B24]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Report Scam or Safety Concern"
    >
      <div className="bg-white w-full max-w-lg max-h-[92vh] rounded-2xl border border-[#D9E5DF] shadow-2xl flex flex-col overflow-hidden">
        <div className="bg-[#172B24] text-white px-5 py-4 flex items-center justify-between border-b border-[#D4A62A]/40">
          <div className="flex items-center gap-2.5 min-w-0">
            <ShieldAlert className="w-5 h-5 text-[#D4A62A] shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-extrabold tracking-tight truncate">
                ANTI-SCAM &amp; SAFETY REPORT
              </h2>
              <p className="text-[11px] text-emerald-200 truncate">
                Reporting {targetType}: {targetName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {submittedId ? (
            <div className="py-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#F5F8F6] border border-[#087443]/30 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6 text-[#087443]" />
              </div>
              <h3 className="text-base font-extrabold text-[#172B24]">
                Report Logged for Fair Investigation
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
                Reference <span className="font-mono font-bold text-[#172B24]">{submittedId}</span> has been recorded as{' '}
                <span className="font-bold text-amber-700">Reported (Pending Review)</span>. The NIGERIA UNIVERSITY HUB Safety Team reviews evidence before confirming fraud or suspending any account.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-[#087443] hover:bg-[#065D36] text-white text-xs font-extrabold transition"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="p-3 rounded-xl bg-[#F5F8F6] border border-[#D9E5DF] text-[11px] text-[#172B24] flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-[#087443] shrink-0 mt-0.5" />
                <span>
                  Fair Investigation Policy: Reports enter as <strong>Reported</strong> first and move to{' '}
                  <strong>Under Investigation</strong> or <strong>Confirmed Fraudulent</strong> after CEO/Moderator verification.
                </span>
              </div>

              {identifierLookup && identifierLookup.status !== 'clear' && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-extrabold uppercase text-[11px]">
                      {identifierLookup.status === 'confirmed_fraudulent'
                        ? 'Confirmed Scam Warning'
                        : identifierLookup.status === 'under_investigation'
                        ? 'Under Safety Investigation'
                        : 'Previously Reported Identifier'}
                    </p>
                    <p className="mt-0.5">
                      This phone or bank number already has {identifierLookup.reportCount} report(s) in NIGERIA UNIVERSITY HUB Anti-Scam Registry. Do not pay upfront.
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#172B24] mb-1">Report Category</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#D9E5DF] bg-white text-xs font-semibold text-[#172B24] focus:outline-none focus:border-[#087443]"
                >
                  {SCAM_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#172B24] mb-1">
                    Suspect Phone / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={suspectPhone}
                    onChange={(e) => setSuspectPhone(e.target.value)}
                    placeholder="e.g. 08012345678"
                    className="w-full px-3 py-2 rounded-xl border border-[#D9E5DF] text-xs text-[#172B24] focus:outline-none focus:border-[#087443]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#172B24] mb-1">
                    Bank Account Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={suspectBankAccount}
                    onChange={(e) => setSuspectBankAccount(e.target.value)}
                    placeholder="10-digit NUBAN if paid"
                    className="w-full px-3 py-2 rounded-xl border border-[#D9E5DF] text-xs text-[#172B24] focus:outline-none focus:border-[#087443]"
                  />
                </div>
              </div>

              {suspectBankAccount.trim() && (
                <div>
                  <label className="block text-xs font-bold text-[#172B24] mb-1">Bank / Fintech Name</label>
                  <input
                    type="text"
                    value={suspectBankName}
                    onChange={(e) => setSuspectBankName(e.target.value)}
                    placeholder="e.g. OPAY, PalmPay, GTBank, Access"
                    className="w-full px-3 py-2 rounded-xl border border-[#D9E5DF] text-xs text-[#172B24] focus:outline-none focus:border-[#087443]"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#172B24] mb-1">
                  Incident Details &amp; Evidence Summary *
                </label>
                <textarea
                  rows={4}
                  required
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Describe what happened, amount requested/paid, chat behaviour, or meet-up issue..."
                  className="w-full px-3 py-2.5 rounded-xl border border-[#D9E5DF] text-xs text-[#172B24] focus:outline-none focus:border-[#087443]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#172B24] mb-1.5">
                  Upload Screenshot / Receipt Evidence (Optional)
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F5F8F6] hover:bg-emerald-50 border border-[#D9E5DF] text-xs font-bold text-[#172B24] cursor-pointer">
                    {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#087443]" /> : <Upload className="w-3.5 h-3.5 text-[#087443]" />}
                    <span>{uploading ? 'Uploading...' : 'Attach Image'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleEvidenceUpload}
                      className="hidden"
                      disabled={uploading || evidenceUrls.length >= 4}
                    />
                  </label>
                  {evidenceUrls.map((url, idx) => (
                    <div key={url + idx} className="relative w-12 h-12 rounded-lg overflow-hidden border border-[#D9E5DF]">
                      <img src={url} alt={`Evidence ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setEvidenceUrls((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute top-0 right-0 bg-black/70 text-white w-4 h-4 flex items-center justify-center text-[10px]"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-[#F5F8F6] text-[#172B24] text-xs font-bold hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploading}
                  className="px-5 py-2.5 rounded-xl bg-[#087443] hover:bg-[#065D36] text-white text-xs font-extrabold flex items-center gap-1.5 transition disabled:opacity-60"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Submit Report</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
