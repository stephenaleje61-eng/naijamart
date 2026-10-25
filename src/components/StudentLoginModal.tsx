import React, { useState } from 'react';
import { X, GraduationCap, User, Phone, BookOpen, Sparkles, CheckCircle2 } from 'lucide-react';
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
  title = "Join Single Hub — FUWukari",
  subtitle = "Enter your name and matric number to join the campus group chat, connect with friends, and post hux."
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
      setError('Please enter your full name (at least 2 letters)');
      return;
    }

    if (!trimmedMatric || trimmedMatric.length < 3) {
      setError('Please enter your Matric Number (e.g. FUW/2022/...)');
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
      setError(err?.message || 'Could not save profile. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 my-4 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header bar */}
        <div className="bg-gradient-to-r from-[#008751] via-[#00a86b] to-[#008751] p-5 text-white relative">
          <button
            onClick={onClose}
            type="button"
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl">
              🎓
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">{title}</h3>
              <p className="text-[11px] text-emerald-100 mt-0.5">Federal University Wukari • Campus ID</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          <p className="text-xs text-gray-600 leading-relaxed">
            {subtitle}
          </p>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
              <span className="font-bold">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Stephen Aleje"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#008751]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Matriculation Number <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <GraduationCap className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={matricNumber}
                onChange={(e) => setMatricNumber(e.target.value)}
                placeholder="e.g. FUW/2021/CS/042"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold uppercase text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#008751]"
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Used to verify genuine FUWukari student peers</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Department / Faculty <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <BookOpen className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Computer Science, Faculty of Pure & Applied"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#008751]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Phone or WhatsApp <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 08167258121"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#008751]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 py-3 bg-[#008751] hover:bg-[#007043] text-white text-xs sm:text-sm font-black rounded-xl shadow-lg shadow-emerald-700/20 active:scale-95 transition flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{initialData ? 'Update Campus Profile' : 'Continue to Single Hub'}</span>
          </button>
        </form>

      </div>
    </div>
  );
};
