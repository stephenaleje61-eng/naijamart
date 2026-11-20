import React, { useEffect, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  GraduationCap,
  Loader2,
  Phone,
  ShieldCheck,
  UserCheck,
  X
} from 'lucide-react';
import { AccountType, Institution, User } from '../types.js';
import { upsertInstitutionUserProfile } from '../services/institutions.js';
import { findInstitutionById, getInstitutionById } from '../constants/institutions.js';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  institutions: Institution[];
  selectedInstitutionId: string;
  selectedCampus: string;
  onProfileSaved: (updatedUser: User, institutionId: string, campus: string) => void;
  onOpenFullSettings?: () => void;
  onRequireLogin?: () => void;
}

const ACCOUNT_TYPE_OPTIONS: { value: AccountType; label: string }[] = [
  { value: 'student', label: 'Student' },
  { value: 'seller', label: 'Student Seller / Vendor' },
  { value: 'house_agent', label: 'House Agent' },
  { value: 'landlord', label: 'Landlord / Caretaker' },
  { value: 'business_owner', label: 'Campus Business Owner' },
  { value: 'student_association', label: 'Student Association / Union' },
  { value: 'sports_organizer', label: 'Campus Sports Organizer' }
];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  institutions,
  selectedInstitutionId,
  selectedCampus,
  onProfileSaved,
  onOpenFullSettings,
  onRequireLogin
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('student');
  const [department, setDepartment] = useState('');
  const [institutionId, setInstitutionId] = useState(
    selectedInstitutionId && selectedInstitutionId !== 'all' ? selectedInstitutionId : ''
  );
  const [campus, setCampus] = useState(selectedCampus || '');
  const [preferredContactMethod, setPreferredContactMethod] = useState<'whatsapp' | 'phone' | 'both'>('whatsapp');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setSuccess('');
    setName(currentUser?.name || '');
    setPhone(currentUser?.phone || '');
    setWhatsappNumber(currentUser?.whatsappNumber || currentUser?.phone || '');
    setAccountType(currentUser?.accountType || (currentUser?.role === 'seller' ? 'seller' : 'student'));
    setDepartment(currentUser?.department || '');
    const rawInst = currentUser?.institutionId || selectedInstitutionId;
    const instId = rawInst && rawInst !== 'all' ? rawInst : '';
    setInstitutionId(instId);
    const inst = findInstitutionById(instId, institutions);
    setCampus(currentUser?.campus || selectedCampus || inst?.campus || inst?.campuses[0] || '');
    setPreferredContactMethod(currentUser?.preferredContactMethod || 'whatsapp');
  }, [isOpen, currentUser, selectedInstitutionId, selectedCampus, institutions]);

  if (!isOpen) return null;

  const chosenInstitution = institutionId ? findInstitutionById(institutionId, institutions) : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onClose();
      onRequireLogin?.();
      return;
    }
    if (!name.trim()) {
      setError('Please enter your display name.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const saved = await upsertInstitutionUserProfile({
        userId: currentUser.id,
        name: name.trim(),
        email: currentUser.email,
        phone: phone.trim(),
        whatsappNumber: whatsappNumber.trim() || phone.trim(),
        institutionId: institutionId || '',
        campus: campus || chosenInstitution?.campus || '',
        accountType,
        department: department.trim(),
        preferredContactMethod
      });

      const updatedUser: User = {
        ...currentUser,
        name: saved.name,
        phone: saved.phone,
        whatsappNumber: saved.whatsappNumber,
        institutionId: saved.institutionId,
        campus: saved.campus,
        accountType: saved.accountType,
        department: saved.department,
        preferredContactMethod: saved.preferredContactMethod
      };

      onProfileSaved(updatedUser, saved.institutionId, saved.campus);
      setSuccess('Your campus profile and contact preferences have been updated.');
    } catch (err: any) {
      setError(err?.message || 'Unable to save profile updates. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-[#087443]/20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#087443] text-white px-5 py-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#D4A62A]">
              NIGERIA CAMPUS MARKET ACCOUNT
            </p>
            <h3 className="text-lg font-extrabold flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-[#D4A62A]" />
              My Campus Profile &amp; Settings
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {!currentUser ? (
            <div className="bg-[#F4F8F5] border border-[#087443]/20 rounded-xl p-5 text-center space-y-3">
              <GraduationCap className="w-10 h-10 text-[#087443] mx-auto" />
              <p className="font-bold text-[#10251D] text-sm">
                Sign in to manage your campus profile, phone contact, and institution settings.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRequireLogin?.();
                }}
                className="px-5 py-2.5 rounded-xl bg-[#087443] hover:bg-[#065D36] text-white font-bold text-xs cursor-pointer"
              >
                Sign In Now
              </button>
            </div>
          ) : (
            <>
              {(currentUser.ceoVerified || currentUser.isVerified) && (
                <div className="bg-[#087443]/8 border border-[#087443]/25 rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 text-xs font-bold text-[#087443]">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-[#087443]" />
                  <span>VERIFIED BY NIGERIA CAMPUS MARKET CEO — Trusted Campus Account</span>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-3.5 py-2.5 rounded-xl">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-emerald-50 border border-emerald-200 text-[#087443] text-xs font-semibold px-3.5 py-2.5 rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#10251D] mb-1">Full / Display Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 focus:border-[#087443] rounded-xl text-sm text-[#10251D] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#10251D] mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="08012345678"
                    className="w-full px-3 py-2 border border-gray-300 focus:border-[#087443] rounded-xl text-sm text-[#10251D] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#10251D] mb-1">WhatsApp Number</label>
                  <input
                    type="tel"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="08012345678"
                    className="w-full px-3 py-2 border border-gray-300 focus:border-[#087443] rounded-xl text-sm text-[#10251D] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#10251D] mb-1">Account Type</label>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value as AccountType)}
                    className="w-full px-3 py-2 border border-gray-300 focus:border-[#087443] rounded-xl text-sm text-[#10251D] bg-white outline-none"
                  >
                    {ACCOUNT_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#10251D] mb-1">Department / Faculty</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Computer Science"
                    className="w-full px-3 py-2 border border-gray-300 focus:border-[#087443] rounded-xl text-sm text-[#10251D] outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#10251D] mb-1 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-[#087443]" /> Institution
                  </label>
                  <select
                    value={institutionId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      setInstitutionId(nextId);
                      const inst = nextId ? getInstitutionById(nextId, institutions) : undefined;
                      setCampus(inst?.campus || inst?.campuses[0] || '');
                    }}
                    className="w-full px-3 py-2 border border-gray-300 focus:border-[#087443] rounded-xl text-sm text-[#10251D] bg-white outline-none"
                  >
                    <option value="">-- Select University / Institution --</option>
                    {institutions.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name} ({inst.state})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#10251D] mb-1">Preferred Campus</label>
                  <select
                    value={campus}
                    onChange={(e) => setCampus(e.target.value)}
                    disabled={!chosenInstitution}
                    className="w-full px-3 py-2 border border-gray-300 focus:border-[#087443] rounded-xl text-sm text-[#10251D] bg-white outline-none disabled:bg-gray-50"
                  >
                    <option value="">{chosenInstitution ? 'Select Campus' : 'Select institution first'}</option>
                    {(chosenInstitution?.campuses || []).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#10251D] mb-1 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-[#087443]" /> Contact Preference
                  </label>
                  <select
                    value={preferredContactMethod}
                    onChange={(e) =>
                      setPreferredContactMethod(e.target.value as 'whatsapp' | 'phone' | 'both')
                    }
                    className="w-full px-3 py-2 border border-gray-300 focus:border-[#087443] rounded-xl text-sm text-[#10251D] bg-white outline-none"
                  >
                    <option value="whatsapp">WhatsApp Preferred</option>
                    <option value="phone">Direct Call Preferred</option>
                    <option value="both">WhatsApp &amp; Direct Call</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-2.5 border-t border-gray-100">
                {onOpenFullSettings ? (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenFullSettings();
                    }}
                    className="px-3.5 py-2 rounded-xl bg-[#F4F8F5] hover:bg-emerald-50 border border-[#087443]/25 text-xs font-extrabold text-[#087443] cursor-pointer"
                  >
                    Open Full Settings &amp; Privacy
                  </button>
                ) : (
                  <span />
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-bold text-[#10251D] hover:bg-gray-50 cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 rounded-xl bg-[#087443] hover:bg-[#065D36] text-white text-xs font-extrabold flex items-center gap-2 disabled:opacity-60 cursor-pointer"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {saving ? 'Saving Profile...' : 'Save Profile Changes'}
                  </button>
                </div>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
