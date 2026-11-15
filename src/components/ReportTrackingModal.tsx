import React, { useState } from 'react';
import { X, Search, CheckCircle2, Clock, FileCheck, ShieldCheck } from 'lucide-react';
import { EmergencyReportTrackingStatus } from '../types.js';
import {
  EMERGENCY_REPORT_STATUSES,
  trackEmergencyReportStatus
} from '../services/emergencyCentre.js';

interface ReportTrackingModalProps {
  onClose: () => void;
}

export const ReportTrackingModal: React.FC<ReportTrackingModalProps> = ({ onClose }) => {
  const [referenceNumber, setReferenceNumber] = useState('');
  const [verificationPin, setVerificationPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [result, setResult] = useState<EmergencyReportTrackingStatus | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setNotFound(false);
    setResult(null);
    setLoading(true);

    try {
      const record = await trackEmergencyReportStatus(referenceNumber, verificationPin);
      if (!record) {
        setNotFound(true);
      } else {
        setResult(record);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to check report status right now.');
    } finally {
      setLoading(false);
    }
  };

  const currentStageIndex = result
    ? EMERGENCY_REPORT_STATUSES.indexOf(result.status)
    : -1;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-lg bg-white border border-[#E5E7EB] rounded-3xl shadow-2xl overflow-hidden my-4 flex flex-col text-[#111111]">
        {/* Header */}
        <div className="bg-[#0F1E3D] text-white p-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <FileCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-display text-base sm:text-lg font-black">
                Track Report Status
              </h2>
              <p className="text-xs text-white/80">
                Private status lookup using your Reference Number and Verification PIN
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close report tracking"
            className="min-w-[44px] min-h-[44px] rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <form onSubmit={handleLookup} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-black text-[#0F1E3D] block">
                Report Reference Number *
              </label>
              <input
                type="text"
                required
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. FUM-EMG-123456ABCD"
                className="w-full min-h-[44px] px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] focus:border-[#0F1E3D] rounded-xl text-xs font-mono font-bold text-[#111111] uppercase outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-[#0F1E3D] block">
                Verification PIN *
              </label>
              <input
                type="text"
                required
                value={verificationPin}
                onChange={(e) => setVerificationPin(e.target.value)}
                placeholder="6-character PIN (e.g. A7K9M2)"
                className="w-full min-h-[44px] px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] focus:border-[#0F1E3D] rounded-xl text-xs font-mono font-bold text-[#111111] uppercase outline-none"
              />
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs font-bold text-[#991B1B]">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[44px] px-4 py-2.5 bg-[#0F1E3D] hover:bg-[#16294F] text-white text-xs font-black rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-60"
            >
              <Search className="w-4 h-4" />
              <span>{loading ? 'Checking Status...' : 'Check Report Status'}</span>
            </button>
          </form>

          {notFound && (
            <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#475569]">
              No matching report was found for that Reference Number and Verification PIN. Please double-check your characters and try again.
            </div>
          )}

          {result && (
            <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#CBD5E1] space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[11px] font-mono font-black text-[#0F1E3D] tabular-nums">
                    {result.reportId}
                  </span>
                  <h3 className="text-sm font-black text-[#111111] mt-0.5">
                    {result.reportType}
                  </h3>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-[#0B6B3A] text-white text-[11px] font-black">
                  {result.status}
                </span>
              </div>

              {/* 5-Stage Progress Steps */}
              <div className="space-y-1.5 pt-1">
                {EMERGENCY_REPORT_STATUSES.map((stage, idx) => {
                  const completed = idx <= currentStageIndex;
                  const active = idx === currentStageIndex;
                  return (
                    <div
                      key={stage}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs ${
                        active
                          ? 'bg-[#ECFDF5] border border-[#A7F3D0] font-black text-[#0B6B3A]'
                          : completed
                          ? 'text-[#0F1E3D] font-bold'
                          : 'text-[#94A3B8]'
                      }`}
                    >
                      {completed ? (
                        <CheckCircle2 className="w-4 h-4 text-[#0B6B3A] shrink-0" />
                      ) : (
                        <Clock className="w-4 h-4 shrink-0" />
                      )}
                      <span>{stage}</span>
                    </div>
                  );
                })}
              </div>

              {result.statusMessage && (
                <div className="p-3 rounded-xl bg-white border border-[#E2E8F0] text-xs text-[#334155]">
                  <span className="font-bold text-[#0F1E3D] block mb-0.5">
                    Administrator Queue Note:
                  </span>
                  {result.statusMessage}
                </div>
              )}

              <div className="flex items-start gap-1.5 text-[11px] text-[#475569] pt-1">
                <ShieldCheck className="w-4 h-4 text-[#0F1E3D] shrink-0 mt-0.5" />
                <span>
                  This status reflects FU MARKET Help Centre administrator review—not external police or security agency dispatch.
                </span>
              </div>

              <div className="text-[11px] text-[#64748B] tabular-nums">
                Submitted: {new Date(result.createdAt).toLocaleString()} · Updated:{' '}
                {new Date(result.updatedAt).toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
