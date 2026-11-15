import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Mail,
  Phone,
  Eye,
  EyeOff,
  ArrowLeft,
  KeyRound,
  LogIn,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import {
  CEO_EMAIL,
  CEO_ROLE_LABEL,
  checkCeoLockoutStatus,
  isAuthorizedCeoEmail,
  loginCeoWithEmailPassword,
  loginCeoWithGoogle,
  sendCeoPasswordReset
} from '../services/ceoAdmin.js';
import { CeoSessionState } from '../types.js';
import { auth } from '../services/firebase.js';

interface CeoLoginPageProps {
  onSuccess: (session: CeoSessionState) => void;
  onBackToMarketplace: () => void;
  initialNotice?: string | null;
}

export const CeoLoginPage: React.FC<CeoLoginPageProps> = ({
  onSuccess,
  onBackToMarketplace,
  initialNotice = null
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(initialNotice);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [lockout, setLockout] = useState<{
    locked: boolean;
    remainingSeconds: number;
    attempts: number;
    maxAttempts: number;
  }>({ locked: false, remainingSeconds: 0, attempts: 0, maxAttempts: 5 });

  const refreshLockout = async (emailHint?: string) => {
    const res = await checkCeoLockoutStatus(emailHint || email || CEO_EMAIL);
    setLockout(res);
  };

  useEffect(() => {
    refreshLockout(CEO_EMAIL);
  }, []);

  useEffect(() => {
    if (!lockout.locked || lockout.remainingSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockout((prev) => {
        if (prev.remainingSeconds <= 1) {
          return { ...prev, locked: false, remainingSeconds: 0 };
        }
        return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockout.locked]);

  const currentFbUser = auth.currentUser;
  const nonCeoSignedIn =
    currentFbUser &&
    !currentFbUser.isAnonymous &&
    currentFbUser.email &&
    !isAuthorizedCeoEmail(currentFbUser.email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);
    setLoading(true);
    try {
      const { session } = await loginCeoWithEmailPassword({
        email,
        password,
        phone: phone.trim() || undefined
      });
      onSuccess(session);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to authenticate CEO credentials.');
      await refreshLockout(email);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setStatusMsg(null);
    setGoogleLoading(true);
    try {
      const { session } = await loginCeoWithGoogle(phone.trim() || undefined);
      onSuccess(session);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Google sign-in for CEO failed.');
      await refreshLockout(CEO_EMAIL);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    setErrorMsg(null);
    setStatusMsg(null);
    setResetLoading(true);
    try {
      const msg = await sendCeoPasswordReset(email || CEO_EMAIL);
      setStatusMsg(msg);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not send password reset email.');
    } finally {
      setResetLoading(false);
    }
  };

  const formatCountdown = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins}:${rem.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1F14] via-[#0B3B22] to-[#111111] flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        <button
          type="button"
          onClick={onBackToMarketplace}
          className="mb-4 inline-flex items-center gap-2 text-xs font-bold text-white/80 hover:text-[#F2B90D] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to FU MARKET Marketplace</span>
        </button>

        <div className="bg-white rounded-3xl shadow-2xl border border-white/20 overflow-hidden text-[#111111]">
          {/* Header Banner */}
          <div className="bg-[#0B6B3A] text-white px-6 py-6 border-b-4 border-[#F2B90D]">
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#111111]/80 border border-[#F2B90D]/50 text-[#F2B90D] text-[10px] font-black tracking-widest uppercase">
                <ShieldCheck className="w-3.5 h-3.5" />
                {CEO_ROLE_LABEL}
              </span>
              <span className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider">
                Restricted Portal
              </span>
            </div>
            <h1 className="font-display text-xl sm:text-2xl font-black tracking-tight text-white">
              FU MARKET CEO ADMIN LOGIN
            </h1>
            <p className="text-xs text-emerald-100/90 mt-1">
              Exclusive Executive Control Gateway. Cryptographic Firebase authentication required.
            </p>
          </div>

          <div className="p-6 space-y-5">
            {nonCeoSignedIn && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-black">Currently signed in as non-CEO account</p>
                  <p className="mt-0.5 text-[11px]">
                    Active account ({currentFbUser.email}) does not have CEO Super Administrator authorization. Sign in with the authorized CEO account below.
                  </p>
                </div>
              </div>
            )}

            {lockout.locked && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-900 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-black">Security Lockout Active</p>
                  <p className="text-[11px] mt-0.5">
                    Too many failed login attempts detected. Login will unlock in{' '}
                    <strong className="font-mono">{formatCountdown(lockout.remainingSeconds)}</strong>.
                  </p>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="font-semibold">{errorMsg}</span>
              </div>
            )}

            {statusMsg && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-[#0B6B3A] flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#0B6B3A] shrink-0 mt-0.5" />
                <span className="font-semibold">{statusMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#333333] mb-1.5">
                  Authorized CEO Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#0B6B3A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter authorized CEO email"
                    disabled={lockout.locked || loading}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#D1D5DB] focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 outline-none text-sm font-medium bg-[#F9FAFB] focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-[#333333]">
                    CEO Firebase Password
                  </label>
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    disabled={resetLoading || lockout.locked}
                    className="text-[11px] font-bold text-[#0B6B3A] hover:underline flex items-center gap-1"
                  >
                    <KeyRound className="w-3 h-3" />
                    <span>{resetLoading ? 'Sending...' : 'Reset via Email'}</span>
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#0B6B3A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your Firebase password"
                    disabled={lockout.locked || loading}
                    className="w-full pl-10 pr-11 py-3 rounded-xl border border-[#D1D5DB] focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 outline-none text-sm font-medium bg-[#F9FAFB] focus:bg-white transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#111111]"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#333333] mb-1.5">
                  Phone Verification Check <span className="text-[#6B7280] font-semibold">(Optional Extra Check)</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#0B6B3A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Authorized CEO phone number"
                    disabled={lockout.locked || loading}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#D1D5DB] focus:border-[#0B6B3A] focus:ring-2 focus:ring-[#0B6B3A]/15 outline-none text-sm font-medium bg-[#F9FAFB] focus:bg-white transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || googleLoading || lockout.locked}
                className="w-full py-3.5 px-5 bg-[#0B6B3A] hover:bg-[#14532D] disabled:opacity-50 text-white font-black text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 uppercase tracking-wider"
              >
                <LogIn className="w-4 h-4 text-[#F2B90D]" />
                <span>{loading ? 'Verifying CEO Credentials...' : 'Sign In as FU MARKET CEO'}</span>
              </button>
            </form>

            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-[#E5E7EB]" />
              <span className="shrink mx-3 text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                Or Verify with Google Auth
              </span>
              <div className="flex-grow border-t border-[#E5E7EB]" />
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading || googleLoading || lockout.locked}
              className="w-full py-3 px-5 bg-[#111111] hover:bg-black disabled:opacity-50 text-[#F2B90D] font-black text-xs rounded-xl transition flex items-center justify-center gap-2.5 uppercase tracking-wider border border-[#F2B90D]/30"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>
                {googleLoading ? 'Authenticating Google Account...' : 'Sign In with Authorized CEO Google'}
              </span>
            </button>

            <p className="text-[11px] text-center text-[#6B7280] leading-relaxed">
              Every login attempt, failed attempt, and unauthorized entry is cryptographically verified and recorded in FU MARKET CEO Security Logs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
