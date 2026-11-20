import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  KeyRound,
  Laptop,
  Loader2,
  Lock,
  LogOut,
  Monitor,
  Power,
  Shield,
  Smartphone,
  Trash2
} from 'lucide-react';
import {
  MessageAudience,
  PrivacySettings,
  User,
  UserSessionRecord,
  UserSettingsDocument,
  VisibilityAudience
} from '../../types.js';
import { auth } from '../../services/firebase.js';
import {
  changeAccountPassword,
  deactivateUserAccount,
  deleteUserAccountPermanently,
  getOrCreateDeviceSessionId,
  saveUserSettings,
  sendAccountRecoveryReset,
  signOutOtherUserSessions,
  signOutSessionById,
  subscribeToUserSessions
} from '../../services/settings.js';
import { formatTimestamp } from '../../utils/formatters.js';

interface PrivacySettingsPanelProps {
  user: User;
  settings: UserSettingsDocument;
  onSettingsSaved: (next: UserSettingsDocument) => void;
  onUserUpdated: (updated: User) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const PrivacySettingsPanel: React.FC<PrivacySettingsPanelProps> = ({
  user,
  settings,
  onSettingsSaved,
  onUserUpdated,
  onShowToast
}) => {
  const [privacy, setPrivacy] = useState<PrivacySettings>(settings.privacy);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPrivacy(settings.privacy);
  }, [settings.privacy]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const next = await saveUserSettings(user.id, { privacy }, user);
      onSettingsSaved(next);
      onUserUpdated({ ...user, privacy: next.privacy });
      onShowToast('Privacy controls updated and applied across the platform.', 'success');
    } catch (err: any) {
      onShowToast(err?.message || 'Unable to save privacy settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const ToggleRow = ({
    label,
    desc,
    checked,
    onChange
  }: {
    label: string;
    desc: string;
    checked: boolean;
    onChange: (val: boolean) => void;
  }) => (
    <label className="flex items-center justify-between gap-4 py-3.5 border-b border-[#F1F5F9] dark:border-slate-800 last:border-b-0 cursor-pointer">
      <div>
        <div className="text-sm font-semibold text-[#202938] dark:text-white">{label}</div>
        <div className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">{desc}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors cursor-pointer ${
          checked ? 'bg-[#16834A]' : 'bg-slate-300 dark:bg-slate-700'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-0.5 ${
            checked ? 'translate-x-5.5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  );

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
        <div className="flex items-center gap-2 text-sm font-bold text-[#202938] dark:text-white">
          <Eye className="w-4 h-4 text-[#16834A]" />
          Audience & Discovery Controls
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#202938] dark:text-slate-200 mb-1.5">
              Who Can View My Profile
            </label>
            <select
              value={privacy.profileVisibility}
              onChange={(e) =>
                setPrivacy((p) => ({ ...p, profileVisibility: e.target.value as VisibilityAudience }))
              }
              className="w-full px-3 py-2.5 text-sm rounded-xl bg-[#F5F7FA] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#202938] dark:text-white focus:border-[#16834A] outline-none"
            >
              <option value="everyone">Everyone on Platform</option>
              <option value="same_university">Same University Only</option>
              <option value="connections_only">Campus Friends Only</option>
              <option value="only_me">Only Me (Private)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#202938] dark:text-slate-200 mb-1.5">
              Who Can See My Posts
            </label>
            <select
              value={privacy.postVisibility}
              onChange={(e) =>
                setPrivacy((p) => ({
                  ...p,
                  postVisibility: e.target.value as PrivacySettings['postVisibility']
                }))
              }
              className="w-full px-3 py-2.5 text-sm rounded-xl bg-[#F5F7FA] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#202938] dark:text-white focus:border-[#16834A] outline-none"
            >
              <option value="everyone">Everyone Nationwide</option>
              <option value="same_university">My University Only</option>
              <option value="connections_only">Friends & Followers Only</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#202938] dark:text-slate-200 mb-1.5">
              Who Can Message Me
            </label>
            <select
              value={privacy.whoCanMessage}
              onChange={(e) =>
                setPrivacy((p) => ({ ...p, whoCanMessage: e.target.value as MessageAudience }))
              }
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#F5F7FA] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#202938] dark:text-white focus:border-[#16834A] outline-none"
            >
              <option value="everyone">Everyone</option>
              <option value="same_university">Students at My University</option>
              <option value="connections_only">Connected Friends Only</option>
            </select>
          </div>
        </div>

        <div className="pt-2">
          <ToggleRow
            label="Show University & Department Info"
            desc="Display your institution name, campus, and department on your public student profile."
            checked={privacy.showUniversityInfo}
            onChange={(val) => setPrivacy((p) => ({ ...p, showUniversityInfo: val }))}
          />
          <ToggleRow
            label="Appear in Search & People Discovery"
            desc="Allow other students to find your profile when searching campus people or classmates."
            checked={privacy.appearInSearch}
            onChange={(val) => setPrivacy((p) => ({ ...p, appearInSearch: val }))}
          />
          <ToggleRow
            label="Show Online Activity Status"
            desc="Let friends and buyers see when you are currently active on the platform."
            checked={privacy.showOnlineStatus}
            onChange={(val) => setPrivacy((p) => ({ ...p, showOnlineStatus: val }))}
          />
          <ToggleRow
            label="Show Phone Number Publicly"
            desc="Display your phone/WhatsApp button on public profiles. When off, users contact you via in-app chat."
            checked={privacy.showPhoneNumber}
            onChange={(val) => setPrivacy((p) => ({ ...p, showPhoneNumber: val }))}
          />
        </div>

        <div className="pt-3 border-t border-[#F1F5F9] dark:border-slate-800 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#16834A] hover:bg-[#126B3C] text-white text-sm font-bold shadow-xs transition disabled:opacity-60 cursor-pointer"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving Privacy...' : 'Save Privacy Settings'}
          </button>
        </div>
      </div>
    </form>
  );
};

interface SecuritySettingsPanelProps {
  user: User;
  settings: UserSettingsDocument;
  focusSection: 'password' | 'sessions' | 'account-management';
  onSettingsSaved: (next: UserSettingsDocument) => void;
  onUserUpdated: (updated: User) => void;
  onLoggedOut: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const SecuritySettingsPanel: React.FC<SecuritySettingsPanelProps> = ({
  user,
  settings,
  focusSection,
  onSettingsSaved,
  onLoggedOut,
  onShowToast
}) => {
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  // Active sessions state
  const [sessions, setSessions] = useState<UserSessionRecord[]>([]);
  const [revokingOther, setRevokingOther] = useState(false);
  const [suspiciousAlerts, setSuspiciousAlerts] = useState(
    settings.security.suspiciousLoginAlerts !== false
  );
  const currentDeviceSessionId = getOrCreateDeviceSessionId();

  // Deactivate / Delete state
  const [deactivateReason, setDeactivateReason] = useState('');
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    setSuspiciousAlerts(settings.security.suspiciousLoginAlerts !== false);
  }, [settings.security.suspiciousLoginAlerts]);

  useEffect(() => {
    return subscribeToUserSessions(user.id, setSessions);
  }, [user.id]);

  const isPasswordAccount = Boolean(
    auth.currentUser?.providerData?.some((p) => p.providerId === 'password')
  );

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      onShowToast('New password must be at least 6 characters.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      onShowToast('New password and confirmation do not match.', 'error');
      return;
    }
    setChangingPassword(true);
    try {
      await changeAccountPassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onShowToast('Password updated securely.', 'success');
    } catch (err: any) {
      onShowToast(err?.message || 'Unable to change password.', 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSendPasswordReset = async () => {
    if (!user.email) return;
    setSendingReset(true);
    try {
      await sendAccountRecoveryReset(user.email);
      onShowToast(`Password reset link sent to ${user.email}.`, 'success');
    } catch (err: any) {
      onShowToast(err?.message || 'Could not send reset email.', 'error');
    } finally {
      setSendingReset(false);
    }
  };

  const handleToggleSuspiciousAlerts = async () => {
    const nextVal = !suspiciousAlerts;
    setSuspiciousAlerts(nextVal);
    try {
      const next = await saveUserSettings(
        user.id,
        {
          security: { ...settings.security, suspiciousLoginAlerts: nextVal },
          notifications: { ...settings.notifications, suspiciousLoginAlerts: nextVal }
        },
        user
      );
      onSettingsSaved(next);
      onShowToast(
        nextVal ? 'Suspicious login alerts enabled.' : 'Suspicious login alerts disabled.',
        'success'
      );
    } catch (err: any) {
      setSuspiciousAlerts(!nextVal);
      onShowToast(err?.message || 'Could not save alert preference.', 'error');
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await signOutSessionById(sessionId);
      onShowToast('Device session signed out.', 'success');
      if (sessionId === currentDeviceSessionId) {
        onLoggedOut();
      }
    } catch (err: any) {
      onShowToast(err?.message || 'Could not sign out session.', 'error');
    }
  };

  const handleRevokeOtherDevices = async () => {
    setRevokingOther(true);
    try {
      const count = await signOutOtherUserSessions(user.id);
      onShowToast(
        count > 0
          ? `Signed out ${count} other active device${count > 1 ? 's' : ''}.`
          : 'No other active device sessions found.',
        'success'
      );
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to sign out other devices.', 'error');
    } finally {
      setRevokingOther(false);
    }
  };

  const handleDeactivateAccount = async () => {
    setDeactivating(true);
    try {
      await deactivateUserAccount(user.id, deactivateReason);
      onShowToast('Your account has been deactivated. Sign back in anytime to reactivate.', 'info');
      onLoggedOut();
    } catch (err: any) {
      onShowToast(err?.message || 'Could not deactivate account.', 'error');
    } finally {
      setDeactivating(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') {
      onShowToast('Please type DELETE in all caps to confirm.', 'error');
      return;
    }
    setDeletingAccount(true);
    try {
      await deleteUserAccountPermanently(user.id, deletePassword);
      onShowToast('Your account and settings have been permanently deleted.', 'info');
      onLoggedOut();
    } catch (err: any) {
      onShowToast(err?.message || 'Could not delete account.', 'error');
    } finally {
      setDeletingAccount(false);
    }
  };

  const renderDeviceIcon = (platformType: UserSessionRecord['platformType']) => {
    if (platformType === 'android' || platformType === 'iphone') {
      return <Smartphone className="w-5 h-5 text-[#16834A]" />;
    }
    if (platformType === 'ipad') return <Laptop className="w-5 h-5 text-[#16834A]" />;
    return <Monitor className="w-5 h-5 text-[#16834A]" />;
  };

  return (
    <div className="space-y-6">
      {/* 1. Change Password */}
      <div
        className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs ${
          focusSection === 'password'
            ? 'border-[#16834A]/50 ring-1 ring-[#16834A]/20'
            : 'border-[#E2E8F0] dark:border-slate-800'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#202938] dark:text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#16834A]" />
              Password & Authentication
            </h3>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
              Keep your account protected with a strong, unique password.
            </p>
          </div>
          {user.email && (
            <button
              type="button"
              onClick={handleSendPasswordReset}
              disabled={sendingReset}
              className="px-3.5 py-1.5 rounded-xl border border-[#E2E8F0] dark:border-slate-700 text-xs font-bold text-[#16834A] hover:bg-[#E8F5EE] dark:hover:bg-emerald-950/40 transition cursor-pointer"
            >
              {sendingReset ? 'Sending Email...' : 'Send Password Reset Email'}
            </button>
          )}
        </div>

        {isPasswordAccount ? (
          <form onSubmit={handleChangePassword} className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div>
              <label className="block text-xs font-bold text-[#202938] dark:text-slate-200 mb-1">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 text-sm rounded-xl bg-[#F5F7FA] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#202938] dark:text-white focus:border-[#16834A] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#202938] dark:text-slate-200 mb-1">
                New Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="w-full px-3.5 py-2 text-sm rounded-xl bg-[#F5F7FA] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#202938] dark:text-white focus:border-[#16834A] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#202938] dark:text-slate-200 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full px-3.5 py-2 text-sm rounded-xl bg-[#F5F7FA] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#202938] dark:text-white focus:border-[#16834A] outline-none"
              />
            </div>
            <div className="sm:col-span-3 flex justify-end pt-1">
              <button
                type="submit"
                disabled={changingPassword}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#16834A] hover:bg-[#126B3C] text-white text-xs font-bold transition disabled:opacity-60 cursor-pointer"
              >
                {changingPassword && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {changingPassword ? 'Updating Password...' : 'Update Password'}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-3.5 rounded-xl bg-[#F5F7FA] dark:bg-slate-800 text-xs text-[#64748B] dark:text-slate-300 flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#16834A] shrink-0" />
            <span>
              You signed in using Google or session authentication. Use{' '}
              <strong>Send Password Reset Email</strong> above if you want to set a direct password.
            </span>
          </div>
        )}
      </div>

      {/* 2. Active Sessions & Suspicious Login Alerts */}
      <div
        className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs ${
          focusSection === 'sessions'
            ? 'border-[#16834A]/50 ring-1 ring-[#16834A]/20'
            : 'border-[#E2E8F0] dark:border-slate-800'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#202938] dark:text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#16834A]" />
              Active Devices & Sessions
            </h3>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
              Monitor browsers and phones currently signed into your account.
            </p>
          </div>
          {sessions.length > 1 && (
            <button
              type="button"
              onClick={handleRevokeOtherDevices}
              disabled={revokingOther}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs font-bold hover:bg-red-100 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              {revokingOther ? 'Signing Out...' : 'Sign Out Other Devices'}
            </button>
          )}
        </div>

        <label className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-[#F5F7FA] dark:bg-slate-800/80 cursor-pointer">
          <div>
            <div className="text-xs font-bold text-[#202938] dark:text-white">
              Suspicious Login & Device Alerts
            </div>
            <div className="text-[11px] text-[#64748B] dark:text-slate-400 mt-0.5">
              Receive security alerts when a new device accesses your account.
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={suspiciousAlerts}
            onClick={handleToggleSuspiciousAlerts}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors cursor-pointer ${
              suspiciousAlerts ? 'bg-[#16834A]' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-0.5 ${
                suspiciousAlerts ? 'translate-x-5.5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </label>

        <div className="divide-y divide-[#F1F5F9] dark:divide-slate-800">
          {sessions.length === 0 ? (
            <div className="py-4 text-xs text-[#64748B] dark:text-slate-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#16834A]" />
              Current browser session is active and verified.
            </div>
          ) : (
            sessions.map((sess) => {
              const isCurrent = sess.id === currentDeviceSessionId;
              return (
                <div key={sess.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#E8F5EE] dark:bg-emerald-950/60 flex items-center justify-center shrink-0">
                      {renderDeviceIcon(sess.platformType)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#202938] dark:text-white flex items-center gap-2 flex-wrap">
                        <span className="truncate">{sess.deviceLabel}</span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F5EE] dark:bg-emerald-950/60 text-[#16834A]">
                            This Device
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#64748B] dark:text-slate-400">
                        Last active: {formatTimestamp(sess.lastActiveAt)}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRevokeSession(sess.id)}
                    className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-slate-700 text-xs font-semibold text-[#64748B] dark:text-slate-300 hover:text-red-600 hover:border-red-300 transition shrink-0 cursor-pointer"
                  >
                    {isCurrent ? 'Log Out' : 'Sign Out'}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 3. Account Deactivation & Permanent Deletion */}
      <div
        className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs ${
          focusSection === 'account-management'
            ? 'border-red-300 dark:border-red-900 ring-1 ring-red-200 dark:ring-red-900/40'
            : 'border-[#E2E8F0] dark:border-slate-800'
        }`}
      >
        <h3 className="text-sm font-bold text-[#202938] dark:text-white flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          Account Deactivation & Deletion
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Deactivate Card */}
          <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 space-y-3">
            <div className="flex items-start gap-2.5">
              <Power className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-[#202938] dark:text-white">
                  Temporarily Deactivate Account
                </h4>
                <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-0.5">
                  Hide your profile from campus discovery during exams or breaks. Sign back in anytime to restore everything.
                </p>
              </div>
            </div>
            {!showDeactivateConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeactivateConfirm(true)}
                className="w-full py-2 rounded-xl border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-900/30 transition cursor-pointer"
              >
                Deactivate Account
              </button>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={deactivateReason}
                  onChange={(e) => setDeactivateReason(e.target.value)}
                  placeholder="Optional reason (e.g. Exam break)"
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 text-[#202938] dark:text-white outline-none"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleDeactivateAccount}
                    disabled={deactivating}
                    className="flex-1 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition cursor-pointer"
                  >
                    {deactivating ? 'Deactivating...' : 'Confirm Deactivate'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeactivateConfirm(false)}
                    className="px-3 py-2 rounded-lg border border-[#E2E8F0] dark:border-slate-700 text-xs font-semibold text-[#64748B] dark:text-slate-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Delete Card */}
          <div className="p-4 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20 space-y-3">
            <div className="flex items-start gap-2.5">
              <Trash2 className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-red-700 dark:text-red-300">
                  Permanently Delete Account
                </h4>
                <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-0.5">
                  Irreversibly remove your profile, settings, and active login credentials from the platform.
                </p>
              </div>
            </div>
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-2 rounded-xl border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition cursor-pointer"
              >
                Delete My Account
              </button>
            ) : (
              <div className="space-y-2">
                {isPasswordAccount && (
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800 text-[#202938] dark:text-white outline-none"
                  />
                )}
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder='Type "DELETE" to confirm'
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800 text-[#202938] dark:text-white outline-none font-mono"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handlePermanentDelete}
                    disabled={deletingAccount || deleteConfirmText.trim().toUpperCase() !== 'DELETE'}
                    className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                  >
                    {deletingAccount ? 'Deleting...' : 'Permanently Delete'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText('');
                    }}
                    className="px-3 py-2 rounded-lg border border-[#E2E8F0] dark:border-slate-700 text-xs font-semibold text-[#64748B] dark:text-slate-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
