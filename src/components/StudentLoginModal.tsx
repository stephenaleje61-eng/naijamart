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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-md bg-[#121212] rounded-3xl shadow-2xl overflow-hidden border border-[#333333] my-4">
        {/* Header bar */}
        <div className="bg-[#1C1C1C] border-b border-[#333333] p-5 text-white relative">
          <button
            onClick={onClose}
            type="button"
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#121212] border border-[#333333] hover:border-[#FFFFFF] text-[#BDBDBD] hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3 pr-8">
            <div className="w-10 h-10 rounded-2xl bg-[#FFFFFF]/15 border border-[#FFFFFF]/40 flex items-center justify-center text-[#FFFFFF]">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight text-white">{title}</h3>
              <p className="text-[11px] text-[#BDBDBD] mt-0.5">
                FU MARKET • Federal University Wukari (FUWUKARI)
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          <p className="text-xs text-[#BDBDBD] leading-relaxed">{subtitle}</p>

          {error && (
            <div className="p-3 bg-red-950/60 border border-red-800 text-red-200 text-xs rounded-xl flex items-start gap-2">
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#BDBDBD] mb-1">
              Full Name <span className="text-[#FFFFFF]">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#BDBDBD] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full pl-10 pr-4 py-2.5 bg-[#1C1C1C] border border-[#333333] rounded-xl text-xs font-semibold text-white placeholder-[#BDBDBD]/60 focus:outline-none focus:border-[#FFFFFF]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#BDBDBD] mb-1">
              Matriculation Number <span className="text-[#FFFFFF]">*</span>
            </label>
            <div className="relative">
              <GraduationCap className="w-4 h-4 text-[#BDBDBD] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={matricNumber}
                onChange={(e) => setMatricNumber(e.target.value)}
                placeholder="e.g. FUW/2022/..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#1C1C1C] border border-[#333333] rounded-xl text-xs font-semibold uppercase text-white placeholder-[#BDBDBD]/60 focus:outline-none focus:border-[#FFFFFF]"
              />
            </div>
            <p className="text-[10px] text-[#BDBDBD] mt-1">
              Used to identify genuine FUWUKARI student members
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#BDBDBD] mb-1">
              Department / Faculty <span className="opacity-60 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <BookOpen className="w-4 h-4 text-[#BDBDBD] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Computer Science"
                className="w-full pl-10 pr-4 py-2.5 bg-[#1C1C1C] border border-[#333333] rounded-xl text-xs font-semibold text-white placeholder-[#BDBDBD]/60 focus:outline-none focus:border-[#FFFFFF]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#BDBDBD] mb-1">
              Phone or WhatsApp <span className="opacity-60 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-[#BDBDBD] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="080..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#1C1C1C] border border-[#333333] rounded-xl text-xs font-semibold text-white placeholder-[#BDBDBD]/60 focus:outline-none focus:border-[#FFFFFF]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 py-3 bg-[#FFFFFF] hover:bg-[#E5E5E5] text-black text-xs sm:text-sm font-black rounded-xl active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{initialData ? 'Update Campus Profile' : 'Continue to FU MARKET'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
