import React, { useState } from 'react';
import {
  X,
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  Store,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { NIGERIA_STATES } from '../constants/states.js';
import { sendForgotPassword, submitResetPassword } from '../services/api.js';

interface AuthModalProps {
  initialMode?: 'login' | 'register';
  defaultRole?: 'buyer' | 'seller';
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  initialMode = 'login',
  defaultRole = 'buyer',
  onClose,
  onSuccess
}) => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  const [role, setRole] = useState<'buyer' | 'seller'>(defaultRole);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [state, setState] = useState('Lagos');
  const [city, setCity] = useState('Ikeja');
  const [shopName, setShopName] = useState('');

  // Password Reset states
  const [resetStep, setResetStep] = useState<'request' | 'reset'>('request');
  const [newPassword, setNewPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({
        name,
        email,
        password,
        role,
        phone,
        whatsappNumber: whatsappNumber || phone,
        state,
        city,
        shopName: role === 'seller' ? shopName || `${name}'s Shop` : undefined
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const res = await sendForgotPassword(email);
      setSuccessMsg(res.message || 'Password reset code verified. Enter your new password.');
      setResetStep('reset');
    } catch (err: any) {
      setError(err.message || 'Failed to request password recovery.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const res = await submitResetPassword(email, newPassword);
      setSuccessMsg(res.message || 'Password updated successfully!');
      setTimeout(() => {
        setMode('login');
        setResetStep('request');
        setPassword(newPassword);
        setSuccessMsg('You can now sign in with your new password.');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo fill buttons for fast testing
  const fillQuickDemo = (type: 'buyer' | 'seller' | 'admin') => {
    setError('');
    if (type === 'admin') {
      setMode('login');
      setEmail('admin@naijamart.ng');
      setPassword('Admin123!');
    } else if (type === 'seller') {
      setMode('login');
      setEmail('ikejatech@naijamart.demo');
      setPassword('Password123!');
    } else {
      setMode('login');
      setEmail('yetundefashion@naijamart.demo');
      setPassword('Password123!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden my-4">
        {/* Header */}
        <div className="bg-[#1C1917] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#F68B1F] flex items-center justify-center font-black text-white text-sm shadow-sm">
              ZM
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">
                {mode === 'login' ? 'Welcome Back to ZangaMarket' : mode === 'register' ? 'Join ZangaMarket' : 'Password Recovery'}
              </h3>
              <p className="text-[11px] text-gray-400">
                {mode === 'login' ? 'Sign in to manage listings or browse deals' : mode === 'register' ? 'Create a buyer or seller account' : 'Recover your account access'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Tab switch between Login and Register */}
        {mode !== 'forgot' && (
          <div className="grid grid-cols-2 border-b border-gray-200 text-xs font-bold">
            <button
              onClick={() => {
                setMode('login');
                setError('');
                setSuccessMsg('');
              }}
              className={`py-3 transition ${
                mode === 'login'
                  ? 'border-b-2 border-[#F68B1F] text-[#F68B1F]'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setMode('register');
                setError('');
                setSuccessMsg('');
              }}
              className={`py-3 transition ${
                mode === 'register'
                  ? 'border-b-2 border-[#F68B1F] text-[#F68B1F]'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span className="break-words">{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-gray-50 border border-gray-300 rounded-xl focus:border-[#F68B1F] focus:bg-white outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-gray-700">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setError('');
                      setSuccessMsg('');
                    }}
                    className="text-[11px] text-[#F68B1F] font-semibold hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-gray-50 border border-gray-300 rounded-xl focus:border-[#F68B1F] focus:bg-white outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#F68B1F] hover:bg-[#E07A15] text-white font-black text-xs sm:text-sm rounded-xl shadow-md transition disabled:opacity-50"
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </button>

              {/* Fast Account Switcher for Demo Testing */}
              <div className="pt-3 border-t border-gray-100">
                <span className="block text-[11px] text-gray-600 uppercase font-bold text-center mb-2">
                  Fast Demo Test Logins:
                </span>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => fillQuickDemo('seller')}
                    className="p-1.5 bg-orange-50 hover:bg-orange-100 text-[#E07A15] font-semibold rounded-lg text-center"
                  >
                    Tech Seller
                  </button>
                  <button
                    type="button"
                    onClick={() => fillQuickDemo('buyer')}
                    className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg text-center"
                  >
                    Fashion Shop
                  </button>
                  <button
                    type="button"
                    onClick={() => fillQuickDemo('admin')}
                    className="p-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-lg text-center"
                  >
                    Admin Desk
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* REGISTER FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">I want to:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('buyer')}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      role === 'buyer'
                        ? 'bg-orange-50 border-[#F68B1F] text-[#E07A15]'
                        : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    Shop & Buy Goods
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('seller')}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      role === 'seller'
                        ? 'bg-orange-50 border-[#F68B1F] text-[#E07A15]'
                        : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    Sell on ZangaMarket
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="Chinedu Adeleke"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:border-[#F68B1F] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:border-[#F68B1F] outline-none"
                  />
                </div>
              </div>

              {role === 'seller' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Shop / Business Name</label>
                  <div className="relative">
                    <Store className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Lagos Tech Plug"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:border-[#F68B1F] outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">WhatsApp Phone</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                      type="tel"
                      required
                      placeholder="08012345678"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:border-[#F68B1F] outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">State</label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full p-2 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:border-[#F68B1F] outline-none"
                  >
                    {NIGERIA_STATES.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Create Password (min 6 chars)</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:border-[#F68B1F] outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#F68B1F] hover:bg-[#E07A15] text-white font-black text-xs sm:text-sm rounded-xl shadow-md transition disabled:opacity-50 mt-2"
              >
                {loading ? 'Creating Account...' : role === 'seller' ? 'Create Free Seller Account' : 'Register Account'}
              </button>
            </form>
          )}

          {/* REAL PASSWORD RECOVERY & RESET FORM */}
          {mode === 'forgot' && (
            <div className="space-y-4">
              <p className="text-xs text-gray-600">
                {resetStep === 'request'
                  ? 'Enter your registered email address to receive password recovery authorization.'
                  : 'Enter your new password below to update your account.'}
              </p>

              {resetStep === 'request' ? (
                <form onSubmit={handleForgotPassword} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Registered Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-[#F68B1F] hover:bg-[#E07A15] text-white font-bold text-xs rounded-xl shadow transition disabled:opacity-50"
                  >
                    {loading ? 'Verifying...' : 'Request Password Recovery'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Account Email</label>
                    <input
                      type="email"
                      disabled
                      value={email}
                      className="w-full p-2 text-xs bg-gray-100 text-gray-600 border border-gray-200 rounded-xl outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">New Password (min 6 chars)</label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-[#F68B1F] hover:bg-[#E07A15] text-white font-bold text-xs rounded-xl shadow transition disabled:opacity-50"
                  >
                    {loading ? 'Updating Password...' : 'Save New Password'}
                  </button>
                </form>
              )}

              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError('');
                  setSuccessMsg('');
                  setResetStep('request');
                }}
                className="w-full text-center text-xs text-gray-500 hover:text-gray-800 font-semibold"
              >
                Back to Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
