import React, { useState } from 'react';
import { X, GraduationCap, User, Phone, BookOpen, CheckCircle2 } from 'lucide-react';
import { RegisteredUser } from '../types.js';
import { generateStudentId, saveLocalStudentSession } from '../utils/studentAuth.js';

interface StudentLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (student: RegisteredUser) => void;
  initialData?: RegisteredUser | null;
  title?: string;
  subtitle?: string;
}

export const StudentLoginModal: React.FC<StudentLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  title = 'Join FU MARKET Campus Hub',
  subtitle = 'Enter your name and matric number to join Single Hub, message sellers or agents directly, and post student requests.'
}) => {
  const [fullName, setFullName] = useState(initialData?.name || '');
  const [matricNumber, setMatricNumber] = useState(initialData?.matricNumber || '');
  const [department, setDepartment] = useState(initialData?.department || '');
  const [phone, setPhone] = useState(initialData?.phone || initialData?.whatsappNumber || '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = fullName.trim();
    const trimmedMatric = matricNumber.trim().toUpperCase();

    if (!trimmedName || trimmedName.length < 2) {
      setError('Please enter your full name (at least 2 letters).');
      return;
    }

    if (!trimmedMatric || trimmedMatric.length < 3) {
      setError('Please enter your Matriculation Number (e.g. FUW/2022/...).');
      return;
    }

    setSubmitting(true);
    try {
      const studentId = initialData?.id || generateStudentId(trimmedMatric);
      const student: RegisteredUser = {
        id: studentId,
        name: trimmedName,
        matricNumber: trimmedMatric,
        department: department.trim() || undefined,
        phone: phone.trim() || undefined,
        whatsappNumber: phone.trim() || undefined,
        isOnline: true,
        lastSeen: Date.now(),
        createdAt: initialData?.createdAt || new Date().toISOString()
      };

      saveLocalStudentSession(student);
      onSuccess(student);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Could not save campus profile. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-[#E5E7EB] my-4 text-[#111111]">
        {/* Green Header */}
        <div className="bg-[#0B6B3A] border-b-4 border-[#F2B90D] p-5 text-white relative">
          <button
            onClick={onClose}
            type="button"
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#14532D] border border-white/25 hover:border-[#F2B90D] text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3 pr-8">
            <div className="w-10 h-10 rounded-2xl bg-[#F2B90D] flex items-center justify-center text-[#111111]">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight text-white">{title}</h3>
              <p className="text-[11px] text-white/90 mt-0.5">
                FU MARKET • Federal University Wukari (FUWUKARI)
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 bg-white">
          <p className="text-xs text-[#555555] leading-relaxed">{subtitle}</p>

          {error && (
            <div className="p-3 bg-[#FFF8DB] border-2 border-[#111111] text-[#111111] text-xs rounded-xl flex items-start gap-2 font-semibold">
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#333333] mb-1">
              Full Name <span className="text-[#0B6B3A]">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#0B6B3A] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full pl-10 pr-4 py-2.5 bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl text-xs font-semibold text-[#111111] placeholder-[#666666] focus:outline-none focus:border-[#0B6B3A]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#333333] mb-1">
              Matriculation Number <span className="text-[#0B6B3A]">*</span>
            </label>
            <div className="relative">
              <GraduationCap className="w-4 h-4 text-[#0B6B3A] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={matricNumber}
                onChange={(e) => setMatricNumber(e.target.value)}
                placeholder="e.g. FUW/2022/..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl text-xs font-semibold uppercase text-[#111111] placeholder-[#666666] focus:outline-none focus:border-[#0B6B3A]"
              />
            </div>
            <p className="text-[10px] text-[#555555] mt-1">
              Used to identify genuine FUWUKARI student members
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#333333] mb-1">
              Department / Faculty <span className="opacity-60 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <BookOpen className="w-4 h-4 text-[#0B6B3A] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Computer Science"
                className="w-full pl-10 pr-4 py-2.5 bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl text-xs font-semibold text-[#111111] placeholder-[#666666] focus:outline-none focus:border-[#0B6B3A]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#333333] mb-1">
              Phone or WhatsApp <span className="opacity-60 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-[#0B6B3A] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="080..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl text-xs font-semibold text-[#111111] placeholder-[#666666] focus:outline-none focus:border-[#0B6B3A]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 py-3 bg-[#F2B90D] hover:bg-[#FFC107] text-[#111111] text-xs sm:text-sm font-black rounded-xl active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4 text-[#0B6B3A]" />
            <span>{initialData ? 'Update Campus Profile' : 'Continue to FU MARKET'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
