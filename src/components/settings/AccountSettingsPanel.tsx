import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  AtSign,
  Camera,
  CheckCircle2,
  Loader2,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  User as UserIcon
} from 'lucide-react';
import { AccountType, User, UserSettingsDocument } from '../../types.js';
import { auth } from '../../services/firebase.js';
import {
  checkUsernameAvailability,
  requestEmailChange,
  requestEmailVerification,
  saveAccountProfileUpdate,
  saveUserSettings,
  uploadUserAvatar
} from '../../services/settings.js';

const ACCOUNT_TYPE_OPTIONS: { value: AccountType; label: string }[] = [
  { value: 'student', label: 'University / Polytechnic Student' },
  { value: 'seller', label: 'Student Entrepreneur / Seller' },
  { value: 'house_agent', label: 'Accommodation / House Agent' },
  { value: 'landlord', label: 'Landlord / Hostel Caretaker' },
  { value: 'food_vendor', label: 'Campus Food Vendor' },
  { value: 'delivery_partner', label: 'Campus Delivery Rider' },
  { value: 'business_owner', label: 'Graduate / Campus Business' },
  { value: 'student_association', label: 'Department / Faculty Association' },
  { value: 'sports_organizer', label: 'Campus Sports Organizer' }
];

interface AccountPersonalPanelProps {
  user: User;
  onUserUpdated: (updated: User) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AccountPersonalPanel: React.FC<AccountPersonalPanelProps> = ({
  user,
  onUserUpdated,
  onShowToast
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState(user.name || '');
  const [username, setUsername] = useState(user.username || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [whatsappNumber, setWhatsappNumber] = useState(user.whatsappNumber || user.phone || '');
  const [bio, setBio] = useState(user.bio || '');
  const [accountType, setAccountType] = useState<AccountType>(
    user.accountType || (user.role === 'seller' ? 'seller' : 'student')
  );
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<{
    available?: boolean;
    message?: string;
  }>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setName(user.name || '');
    setUsername(user.username || '');
    setPhone(user.phone || '');
    setWhatsappNumber(user.whatsappNumber || user.phone || '');
    setBio(user.bio || '');
    setAccountType(user.accountType || (user.role === 'seller' ? 'seller' : 'student'));
    setAvatarUrl(user.avatarUrl || '');
  }, [user]);

  const handleUsernameBlur = async () => {
    const clean = username.trim().toLowerCase().replace(/^@+/, '');
    if (!clean) {
      setUsernameStatus({});
      return;
    }
    setCheckingUsername(true);
    try {
      const res = await checkUsernameAvailability(clean, user.id);
      setUsername(res.normalized);
      setUsernameStatus({
        available: res.available,
        message: res.available ? `@${res.normalized} is available` : res.reason
      });
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleAvatarSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploadProgress(5);
    try {
      const url = await uploadUserAvatar(user.id, file, (pct) => setUploadProgress(pct));
      setAvatarUrl(url);
      const { user: updated } = await saveAccountProfileUpdate(user.id, { avatarUrl: url }, user);
      onUserUpdated(updated);
      onShowToast('Profile picture updated successfully.', 'success');
    } catch (err: any) {
      const msg = err?.message || 'Could not upload profile picture.';
      setError(msg);
      onShowToast(msg, 'error');
    } finally {
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Full name is required.');
      return;
    }
    if (username.trim()) {
      const check = await checkUsernameAvailability(username, user.id);
      if (!check.available) {
        setError(check.reason || 'Choose a different username.');
        return;
      }
    }

    setSaving(true);
    try {
      const { user: updated } = await saveAccountProfileUpdate(
        user.id,
        {
          name: name.trim(),
          username: username.trim().toLowerCase().replace(/^@+/, ''),
          phone: phone.trim(),
          whatsappNumber: whatsappNumber.trim() || phone.trim(),
          bio: bio.trim(),
          accountType,
          avatarUrl
        },
        user
      );
      onUserUpdated(updated);
      onShowToast('Personal information saved successfully.', 'success');
    } catch (err: any) {
      const msg = err?.message || 'Unable to save personal details.';
      setError(msg);
      onShowToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Avatar Upload Banner */}
      <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-5 shadow-xs">
        <div className="relative w-20 h-20 rounded-2xl bg-[#E8F5EE] dark:bg-emerald-950/50 border-2 border-[#16834A]/25 overflow-hidden flex items-center justify-center shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={user.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          ) : (
            <UserIcon className="w-9 h-9 text-[#16834A]" />
          )}
          {uploadProgress !== null && (
            <div className="absolute inset-0 bg-black/55 flex items-center justify-center text-white text-xs font-bold">
              {uploadProgress}%
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-[#202938] dark:text-white">Profile Picture</h3>
          <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
            Upload a clear photo so verified buyers, sellers, and classmates recognize you.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarSelected}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadProgress !== null}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#16834A] hover:bg-[#126B3C] text-white text-xs font-semibold transition disabled:opacity-60 cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              {uploadProgress !== null ? 'Uploading...' : 'Change Photo'}
            </button>
            {avatarUrl && (
              <button
                type="button"
                onClick={() => setAvatarUrl('')}
                className="px-3 py-2 rounded-xl border border-[#E2E8F0] dark:border-slate-700 text-xs font-medium text-[#64748B] dark:text-slate-300 hover:bg-[#F5F7FA] dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Remove Photo
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Profile Fields */}
      <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#202938] dark:text-slate-200 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#F5F7FA] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#202938] dark:text-white focus:border-[#16834A] focus:bg-white dark:focus:bg-slate-900 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#202938] dark:text-slate-200 mb-1.5">
              Username
            </label>
            <div className="relative">
              <AtSign className="w-4 h-4 text-[#64748B] absolute left-3 top-3" />
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.replace(/\s+/g, '').toLowerCase());
                  setUsernameStatus({});
                }}
                onBlur={handleUsernameBlur}
                placeholder="e.g. austin.butlers"
                className="w-full pl-9 pr-9 py-2.5 text-sm rounded-xl bg-[#F5F7FA] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#202938] dark:text-white focus:border-[#16834A] focus:bg-white dark:focus:bg-slate-900 outline-none transition"
              />
              {checkingUsername && (
                <Loader2 className="w-4 h-4 animate-spin text-[#16834A] absolute right-3 top-3" />
              )}
            </div>
            {usernameStatus.message && (
              <p
                className={`mt-1 text-[11px] font-medium ${
                  usernameStatus.available ? 'text-[#16834A]' : 'text-red-600 dark:text-red-400'
                }`}
              >
                {usernameStatus.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#202938] dark:text-slate-200 mb-1.5">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-[#64748B] absolute left-3 top-3" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+234 800 000 0000"
                className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl bg-[#F5F7FA] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#202938] dark:text-white focus:border-[#16834A] outline-none transition font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#202938] dark:text-slate-200 mb-1.5">
              WhatsApp Number
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-[#16834A] absolute left-3 top-3" />
              <input
                type="tel"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="+234 800 000 0000"
                className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl bg-[#F5F7FA] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#202938] dark:text-white focus:border-[#16834A] outline-none transition font-mono"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#202938] dark:text-slate-200 mb-1.5">
            Platform Account Category
          </label>
          <select
            value={accountType}
            onChange={(e) => setAccountType(e.target.value as AccountType)}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#F5F7FA] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#202938] dark:text-white focus:border-[#16834A] outline-none transition"
          >
            {ACCOUNT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-[#202938] dark:text-slate-200">
              Biography / Campus Introduction
            </label>
            <span className="text-[11px] text-[#64748B] dark:text-slate-400">
              {bio.length}/400
            </span>
          </div>
          <textarea
            rows={4}
            maxLength={400}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell fellow students what you study, sell, or offer on campus..."
            className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#F5F7FA] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#202938] dark:text-white focus:border-[#16834A] outline-none transition resize-none"
          />
        </div>

        <div className="pt-2 flex items-center justify-between gap-3 border-t border-[#F1F5F9] dark:border-slate-800">
          <div className="text-xs text-[#64748B] dark:text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#16834A]" />
            <span>Role: <strong className="uppercase text-[#202938] dark:text-slate-200">{user.role}</strong></span>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#16834A] hover:bg-[#126B3C] text-white text-sm font-bold shadow-xs transition disabled:opacity-60 cursor-pointer"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving...' : 'Save Personal Info'}
          </button>
        </div>
      </div>
    </form>
  );
};

interface AccountLoginEmailPanelProps {
  user: User;
  settings: UserSettingsDocument;
  onSettingsSaved: (next: UserSettingsDocument) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onNavigateSubPanel: (panel: 'password' | 'sessions') => void;
}

export const AccountLoginEmailPanel: React.FC<AccountLoginEmailPanelProps> = ({
  user,
  settings,
  onSettingsSaved,
  onShowToast,
  onNavigateSubPanel
}) => {
  const fbUser = auth.currentUser;
  const emailVerified = Boolean(fbUser?.emailVerified);
  const [newEmail, setNewEmail] = useState(user.email || '');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState(settings.security.recoveryEmail || user.email || '');
  const [recoveryPhone, setRecoveryPhone] = useState(settings.security.recoveryPhone || user.phone || '');
  const [sendingVerify, setSendingVerify] = useState(false);
  const [updatingEmail, setUpdatingEmail] = useState(false);
  const [savingRecovery, setSavingRecovery] = useState(false);

  const handleSendVerification = async () => {
    setSendingVerify(true);
    try {
      await requestEmailVerification();
      onShowToast('Verification email sent! Please check your inbox.', 'success');
    } catch (err: any) {
      onShowToast(err?.message || 'Unable to send verification email.', 'error');
    } finally {
      setSendingVerify(false);
    }
  };

  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newEmail.trim().toLowerCase() === (user.email || '').toLowerCase()) {
      onShowToast('Enter a different email address to update.', 'info');
      return;
    }
    setUpdatingEmail(true);
    try {
      const res = await requestEmailChange(newEmail, confirmPassword);
      onShowToast(res.message, 'success');
      setConfirmPassword('');
    } catch (err: any) {
      onShowToast(err?.message || 'Could not initiate email update.', 'error');
    } finally {
      setUpdatingEmail(false);
    }
  };

  const handleSaveRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRecovery(true);
    try {
      const next = await saveUserSettings(
        user.id,
        {
          security: {
            ...settings.security,
            recoveryEmail: recoveryEmail.trim(),
            recoveryPhone: recoveryPhone.trim()
          }
        },
        user
      );
      onSettingsSaved(next);
      onShowToast('Recovery contact details saved.', 'success');
    } catch (err: any) {
      onShowToast(err?.message || 'Unable to save recovery details.', 'error');
    } finally {
      setSavingRecovery(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Email & Verification Status */}
      <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#202938] dark:text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#16834A]" />
              Primary Sign-In Email
            </h3>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
              Current email: <span className="font-semibold text-[#202938] dark:text-slate-200">{user.email}</span>
            </p>
          </div>
          {emailVerified ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E8F5EE] dark:bg-emerald-950/60 text-[#16834A] dark:text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Email Verified
            </span>
          ) : (
            <button
              type="button"
              onClick={handleSendVerification}
              disabled={sendingVerify}
              className="px-3.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-bold hover:bg-amber-100 transition cursor-pointer"
            >
              {sendingVerify ? 'Sending...' : 'Verify Email Address'}
            </button>
          )}
        </div>

        <form onSubmit={handleEmailUpdate} className="pt-3 border-t border-[#F1F5F9] dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[#202938] dark:text-slate-200 mb-1">
              New Email Address
            </label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="you@university.edu.ng"
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-[#F5F7FA] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#202938] dark:text-white focus:border-[#16834A] outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#202938] dark:text-slate-200 mb-1">
              Current Password (if email/password login)
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm current password"
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-[#F5F7FA] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#202938] dark:text-white focus:border-[#16834A] outline-none"
            />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={updatingEmail}
              className="px-4 py-2 rounded-xl bg-[#16834A] hover:bg-[#126B3C] text-white text-xs font-bold transition disabled:opacity-60 cursor-pointer"
            >
              {updatingEmail ? 'Sending Confirmation...' : 'Send Email Change Link'}
            </button>
          </div>
        </form>
      </div>

      {/* Recovery Contact */}
      <form
        onSubmit={handleSaveRecovery}
        className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs"
      >
        <h3 className="text-sm font-bold text-[#202938] dark:text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#16834A]" />
          Account Recovery Details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#202938] dark:text-slate-200 mb-1">
              Recovery Email
            </label>
            <input
              type="email"
              value={recoveryEmail}
              onChange={(e) => setRecoveryEmail(e.target.value)}
              placeholder="backup@gmail.com"
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-[#F5F7FA] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#202938] dark:text-white focus:border-[#16834A] outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#202938] dark:text-slate-200 mb-1">
              Recovery Phone
            </label>
            <input
              type="tel"
              value={recoveryPhone}
              onChange={(e) => setRecoveryPhone(e.target.value)}
              placeholder="+234 800 000 0000"
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-[#F5F7FA] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#202938] dark:text-white focus:border-[#16834A] outline-none font-mono"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#F1F5F9] dark:border-slate-800">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onNavigateSubPanel('password')}
              className="px-3.5 py-2 rounded-xl border border-[#E2E8F0] dark:border-slate-700 text-xs font-bold text-[#202938] dark:text-slate-200 hover:bg-[#F5F7FA] dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Change Password
            </button>
            <button
              type="button"
              onClick={() => onNavigateSubPanel('sessions')}
              className="px-3.5 py-2 rounded-xl border border-[#E2E8F0] dark:border-slate-700 text-xs font-bold text-[#202938] dark:text-slate-200 hover:bg-[#F5F7FA] dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Manage Active Sessions
            </button>
          </div>
          <button
            type="submit"
            disabled={savingRecovery}
            className="px-4 py-2 rounded-xl bg-[#16834A] hover:bg-[#126B3C] text-white text-xs font-bold transition disabled:opacity-60 cursor-pointer"
          >
            {savingRecovery ? 'Saving...' : 'Save Recovery Details'}
          </button>
        </div>
      </form>
    </div>
  );
};
