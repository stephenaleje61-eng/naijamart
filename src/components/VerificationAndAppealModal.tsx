import React, { useEffect, useState } from 'react';
import {
  BadgeCheck,
  CheckCircle2,
  Clock,
  FileCheck2,
  Loader2,
  Mail,
  ShieldAlert,
  ShieldCheck,
  Upload,
  X
} from 'lucide-react';
import { AccountAppealRecord, Institution, StudentVerificationRequest } from '../types.js';
import { NIGERIAN_INSTITUTIONS } from '../constants/institutions.js';
import { useAuth } from '../context/AuthContext.js';
import { uploadImageToFirebaseStorage } from '../services/imageStorage.js';
import {
  submitStudentVerificationRequest,
  subscribeToMyVerificationRequests
} from '../services/universityNetwork.js';
import {
  submitAccountAppeal,
  subscribeToAccountAppeals
} from '../services/antiScam.js';

interface VerificationAndAppealModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'verification' | 'appeal';
  institutions?: Institution[];
}

const LEVELS = ['100 Level', '200 Level', '300 Level', '400 Level', '500 Level', 'ND 1', 'ND 2', 'HND 1', 'HND 2', 'Postgraduate', 'Graduated / Alumni'];

export const VerificationAndAppealModal: React.FC<VerificationAndAppealModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'verification',
  institutions = NIGERIAN_INSTITUTIONS
}) => {
  const { user } = useAuth();
  const [mode, setMode] = useState<'verification' | 'appeal'>(initialMode);

  // Verification form
  const [method, setMethod] = useState<'edu_email' | 'student_id'>('edu_email');
  const [institutionId, setInstitutionId] = useState(user?.institutionId || institutions[0]?.id || 'fuwukari');
  const [campus, setCampus] = useState(user?.campus || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [levelOfStudy, setLevelOfStudy] = useState(user?.levelOfStudy || '200 Level');
  const [matricNumber, setMatricNumber] = useState('');
  const [institutionalEmail, setInstitutionalEmail] = useState('');
  const [phone, setPhone] = useState(user?.whatsappNumber || user?.phone || '');
  const [studentIdUrl, setStudentIdUrl] = useState('');
  const [uploadingId, setUploadingId] = useState(false);
  const [verifSubmitting, setVerifSubmitting] = useState(false);
  const [myRequests, setMyRequests] = useState<StudentVerificationRequest[]>([]);
  const [verifMessage, setVerifMessage] = useState<string | null>(null);
  const [verifError, setVerifError] = useState<string | null>(null);

  // Appeal form
  const [explanation, setExplanation] = useState('');
  const [appealEvidenceUrl, setAppealEvidenceUrl] = useState('');
  const [appealUploading, setAppealUploading] = useState(false);
  const [appealSubmitting, setAppealSubmitting] = useState(false);
  const [myAppeals, setMyAppeals] = useState<AccountAppealRecord[]>([]);
  const [appealMessage, setAppealMessage] = useState<string | null>(null);
  const [appealError, setAppealError] = useState<string | null>(null);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode, isOpen]);

  useEffect(() => {
    if (!isOpen || !user?.id) return;
    const unsub1 = subscribeToMyVerificationRequests(user.id, setMyRequests);
    const unsub2 = subscribeToAccountAppeals(setMyAppeals, user.id);
    return () => {
      unsub1();
      unsub2();
    };
  }, [isOpen, user?.id]);

  if (!isOpen) return null;

  const selectedInst = institutions.find((i) => i.id === institutionId);

  const handleUploadIdDoc = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingId(true);
    setVerifError(null);
    try {
      const res = await uploadImageToFirebaseStorage(file, {
        folder: 'student_verifications',
        ownerId: user.id,
        allowPersistentFallback: true
      });
      setStudentIdUrl(res.downloadUrl);
    } catch (err: any) {
      setVerifError(err?.message || 'Failed to upload Student ID image.');
    } finally {
      setUploadingId(false);
      e.target.value = '';
    }
  };

  const handleUploadAppealDoc = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setAppealUploading(true);
    try {
      const res = await uploadImageToFirebaseStorage(file, {
        folder: 'appeal_evidence',
        ownerId: user.id,
        allowPersistentFallback: true
      });
      setAppealEvidenceUrl(res.downloadUrl);
    } catch (err: any) {
      setAppealError(err?.message || 'Failed to upload evidence.');
    } finally {
      setAppealUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setVerifError('Please sign in first to submit student verification.');
      return;
    }
    if (!department.trim() || !phone.trim()) {
      setVerifError('Department and active phone number are required.');
      return;
    }
    if (method === 'edu_email') {
      const cleanEdu = institutionalEmail.trim().toLowerCase();
      if (!cleanEdu.includes('@') || (!cleanEdu.endsWith('.edu.ng') && !cleanEdu.endsWith('.edu'))) {
        setVerifError('Please enter a valid .edu.ng or .edu university email, or switch to Student ID upload.');
        return;
      }
    } else if (!studentIdUrl) {
      setVerifError('Please upload a clear photo of your Student ID card or admission letter.');
      return;
    }

    setVerifSubmitting(true);
    setVerifError(null);
    setVerifMessage(null);
    try {
      await submitStudentVerificationRequest({
        userId: user.id,
        userName: user.name,
        email: user.email,
        institutionalEmail: method === 'edu_email' ? institutionalEmail.trim() : undefined,
        phone: phone.trim(),
        institutionId,
        institutionName: selectedInst?.name,
        campus: campus || selectedInst?.campus,
        department: department.trim(),
        levelOfStudy,
        matricNumber: matricNumber.trim() || undefined,
        verificationMethod: method,
        studentIdDocumentUrl: method === 'student_id' ? studentIdUrl : undefined
      });
      setVerifMessage('Verification submitted! The CEO verification office will review your credentials and grant your Verified badge upon approval.');
    } catch (err: any) {
      setVerifError(err?.message || 'Could not submit verification request.');
    } finally {
      setVerifSubmitting(false);
    }
  };

  const handleSubmitAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setAppealError('Please sign in with your account to submit an appeal.');
      return;
    }
    if (explanation.trim().length < 15) {
      setAppealError('Please provide a clear explanation (at least 15 characters).');
      return;
    }
    setAppealSubmitting(true);
    setAppealError(null);
    setAppealMessage(null);
    try {
      await submitAccountAppeal({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        phone: user.whatsappNumber || user.phone,
        explanation: explanation.trim(),
        evidenceUrl: appealEvidenceUrl || undefined
      });
      setAppealMessage('Your appeal has been queued for NIGERIA UNIVERSITY HUB CEO review.');
      setExplanation('');
    } catch (err: any) {
      setAppealError(err?.message || 'Unable to submit appeal.');
    } finally {
      setAppealSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#172B24]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Verification and Appeals"
    >
      <div className="bg-white w-full max-w-xl max-h-[92vh] rounded-2xl border border-[#D9E5DF] shadow-2xl flex flex-col overflow-hidden">
        <div className="bg-[#172B24] text-white px-5 py-4 flex items-center justify-between border-b border-[#D4A62A]/40">
          <div className="flex items-center gap-2.5">
            <BadgeCheck className="w-5 h-5 text-[#D4A62A]" />
            <div>
              <h2 className="text-sm sm:text-base font-extrabold">
                STUDENT VERIFICATION &amp; ACCOUNT APPEALS
              </h2>
              <p className="text-[11px] text-emerald-200">
                Trusted Nigerian Campus Identity · Fair Protection System
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

        <div className="bg-[#F5F8F6] px-5 py-2.5 border-b border-[#D9E5DF] flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMode('verification')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition ${
              mode === 'verification'
                ? 'bg-[#087443] text-white'
                : 'bg-white text-[#172B24] border border-[#D9E5DF]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Student / Seller Verification</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('appeal')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition ${
              mode === 'appeal'
                ? 'bg-[#172B24] text-white'
                : 'bg-white text-[#172B24] border border-[#D9E5DF]'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Suspension / Flag Appeal</span>
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {mode === 'verification' ? (
            <>
              {user?.isVerified || user?.ceoVerified ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-[#087443]/30 flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-[#087443] shrink-0" />
                  <div>
                    <p className="text-sm font-extrabold text-[#172B24]">
                      Your Account is Officially Verified
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Badge status: <strong>{user.verifiedBadgeText || 'Verified Student'}</strong>
                    </p>
                  </div>
                </div>
              ) : null}

              {myRequests.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-extrabold text-[#172B24] uppercase tracking-wide">
                    Recent Submissions
                  </h4>
                  {myRequests.slice(0, 2).map((req) => (
                    <div
                      key={req.id}
                      className="p-3 rounded-xl bg-[#F5F8F6] border border-[#D9E5DF] flex items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <p className="font-bold text-[#172B24]">
                          {req.institutionName || req.institutionId} · {req.department}
                        </p>
                        <p className="text-[11px] text-slate-600">
                          Method: {req.verificationMethod === 'edu_email' ? '.edu.ng Email' : 'Student ID Card'}
                        </p>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase ${
                          req.status === 'approved'
                            ? 'bg-emerald-100 text-[#087443]'
                            : req.status === 'rejected'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleSubmitVerification} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMethod('edu_email')}
                    className={`p-3 rounded-xl border text-left transition ${
                      method === 'edu_email'
                        ? 'border-[#087443] bg-[#F5F8F6]'
                        : 'border-[#D9E5DF] bg-white'
                    }`}
                  >
                    <Mail className="w-4 h-4 text-[#087443] mb-1" />
                    <p className="text-xs font-extrabold text-[#172B24]">Institution .edu.ng Email</p>
                    <p className="text-[10px] text-slate-600">Fast verification via university email</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod('student_id')}
                    className={`p-3 rounded-xl border text-left transition ${
                      method === 'student_id'
                        ? 'border-[#087443] bg-[#F5F8F6]'
                        : 'border-[#D9E5DF] bg-white'
                    }`}
                  >
                    <FileCheck2 className="w-4 h-4 text-[#087443] mb-1" />
                    <p className="text-xs font-extrabold text-[#172B24]">Student ID / Admission Letter</p>
                    <p className="text-[10px] text-slate-600">Upload ID document for CEO review</p>
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#172B24] mb-1">Institution *</label>
                  <select
                    value={institutionId}
                    onChange={(e) => {
                      setInstitutionId(e.target.value);
                      const inst = institutions.find((i) => i.id === e.target.value);
                      if (inst) setCampus(inst.campus);
                    }}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#D9E5DF] bg-white text-xs font-semibold text-[#172B24]"
                  >
                    {institutions.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name} ({i.state})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#172B24] mb-1">Department *</label>
                    <input
                      type="text"
                      required
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="e.g. Computer Science"
                      className="w-full px-3 py-2 rounded-xl border border-[#D9E5DF] text-xs text-[#172B24]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#172B24] mb-1">Level *</label>
                    <select
                      value={levelOfStudy}
                      onChange={(e) => setLevelOfStudy(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#D9E5DF] bg-white text-xs text-[#172B24]"
                    >
                      {LEVELS.map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {lvl}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#172B24] mb-1">Active Phone *</label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="08012345678"
                      className="w-full px-3 py-2 rounded-xl border border-[#D9E5DF] text-xs text-[#172B24]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#172B24] mb-1">Matric / Reg Number</label>
                    <input
                      type="text"
                      value={matricNumber}
                      onChange={(e) => setMatricNumber(e.target.value)}
                      placeholder="Optional matric no."
                      className="w-full px-3 py-2 rounded-xl border border-[#D9E5DF] text-xs text-[#172B24]"
                    />
                  </div>
                </div>

                {method === 'edu_email' ? (
                  <div>
                    <label className="block text-xs font-bold text-[#172B24] mb-1">
                      Institutional Email (.edu.ng) *
                    </label>
                    <input
                      type="email"
                      value={institutionalEmail}
                      onChange={(e) => setInstitutionalEmail(e.target.value)}
                      placeholder="name@student.university.edu.ng"
                      className="w-full px-3 py-2 rounded-xl border border-[#D9E5DF] text-xs text-[#172B24]"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-[#172B24] mb-1">
                      Upload Student ID Card Photo *
                    </label>
                    <label className="flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-[#D9E5DF] bg-[#F5F8F6] hover:border-[#087443] cursor-pointer text-xs font-bold text-[#172B24]">
                      {uploadingId ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#087443]" />
                      ) : (
                        <Upload className="w-4 h-4 text-[#087443]" />
                      )}
                      <span>{studentIdUrl ? 'Student ID Uploaded (Replace)' : 'Choose Student ID Photo'}</span>
                      <input type="file" accept="image/*" onChange={handleUploadIdDoc} className="hidden" />
                    </label>
                    {studentIdUrl && (
                      <img src={studentIdUrl} alt="Student ID preview" className="mt-2 h-28 rounded-xl object-cover border border-[#D9E5DF]" />
                    )}
                  </div>
                )}

                {verifError && <p className="text-xs font-bold text-red-600 bg-red-50 p-2.5 rounded-xl">{verifError}</p>}
                {verifMessage && <p className="text-xs font-bold text-[#087443] bg-emerald-50 p-2.5 rounded-xl">{verifMessage}</p>}

                <button
                  type="submit"
                  disabled={verifSubmitting || uploadingId || !user}
                  className="w-full py-3 rounded-xl bg-[#087443] hover:bg-[#065D36] text-white text-xs font-extrabold flex items-center justify-center gap-2 transition disabled:opacity-60"
                >
                  {verifSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Submit for Verification Review</span>
                </button>
              </form>
            </>
          ) : (
            <div className="space-y-4">
              {user?.isSuspended ? (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
                  <p className="font-extrabold">Account Restricted / Suspended</p>
                  <p className="mt-0.5">{user.suspensionReason || 'Your account was restricted after a safety review. Submit facts below for review.'}</p>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-[#F5F8F6] border border-[#D9E5DF] text-xs text-[#172B24] flex items-start gap-2">
                  <Clock className="w-4 h-4 text-[#087443] shrink-0 mt-0.5" />
                  <span>
                    If your account or phone number received a false report or suspension, submit an appeal below with delivery receipts or clarification.
                  </span>
                </div>
              )}

              {myAppeals.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-extrabold text-[#172B24] uppercase">Your Appeals</h4>
                  {myAppeals.slice(0, 3).map((ap) => (
                    <div key={ap.id} className="p-3 rounded-xl bg-[#F5F8F6] border border-[#D9E5DF] text-xs flex items-center justify-between gap-2">
                      <p className="line-clamp-2 text-[#172B24]">{ap.explanation}</p>
                      <span className="px-2 py-1 rounded-lg bg-white border border-[#D9E5DF] text-[10px] font-extrabold uppercase shrink-0">
                        {ap.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleSubmitAppeal} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#172B24] mb-1">
                    Appeal Explanation *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                    placeholder="Explain what happened, provide transaction/delivery context, and clarify why your account should be reinstated..."
                    className="w-full px-3 py-2.5 rounded-xl border border-[#D9E5DF] text-xs text-[#172B24]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#172B24] mb-1">
                    Attach Proof / Receipt (Optional)
                  </label>
                  <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F5F8F6] border border-[#D9E5DF] text-xs font-bold text-[#172B24] cursor-pointer">
                    {appealUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-[#087443]" />}
                    <span>{appealEvidenceUrl ? 'Proof Attached' : 'Upload Image'}</span>
                    <input type="file" accept="image/*" onChange={handleUploadAppealDoc} className="hidden" />
                  </label>
                </div>

                {appealError && <p className="text-xs font-bold text-red-600 bg-red-50 p-2.5 rounded-xl">{appealError}</p>}
                {appealMessage && <p className="text-xs font-bold text-[#087443] bg-emerald-50 p-2.5 rounded-xl">{appealMessage}</p>}

                <button
                  type="submit"
                  disabled={appealSubmitting || !user}
                  className="w-full py-3 rounded-xl bg-[#172B24] hover:bg-[#087443] text-white text-xs font-extrabold flex items-center justify-center gap-2 transition disabled:opacity-60"
                >
                  {appealSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Submit Appeal to CEO Office</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
