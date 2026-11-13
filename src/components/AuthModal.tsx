import React, { useState } from 'react';
import {
  X,
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  Store,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Server,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { NIGERIA_STATES } from '../constants/states.js';
import { sendForgotPassword, submitResetPassword, getApiBaseUrl, setApiBaseUrl } from '../services/api.js';

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
  const { login, register, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  const [role, setRole] = useState<'buyer' | 'seller'>(defaultRole);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [state, setState] = useState('Taraba');
  const [city, setCity] = useState('Hostel A, 100L');
  const [shopName, setShopName] = useState('');

  const [resetStep, setResetStep] = useState<'request' | 'reset'>('request');
  const [newPassword, setNewPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [showBackendConfig, setShowBackendConfig] = useState(false);
  const [backendUrlInput, setBackendUrlInput] = useState(getApiBaseUrl() || '');
  const [testingBackend, setTestingBackend] = useState(false);
  const [backendStatus, setBackendStatus] = useState<string | null>(null);

  const handleTestBackend = async () => {
    setTestingBackend(true);
    setBackendStatus(null);
    try {
      const urlToTest = (backendUrlInput.trim() || window.location.origin).replace(/\/+$/, '');
      const testRes = await fetch(`${urlToTest}/api/health`, {
        headers: { Accept: 'application/json' }
      });
      const data = await testRes.json();
      if (testRes.ok && data?.status === 'ok') {
        setBackendStatus('Backend is online and healthy.');
      } else {
        setBackendStatus(`Server responded with HTTP ${testRes.status}`);
      }
    } catch (err: any) {
      setBackendStatus(`Connection failed: ${err.message}`);
    } finally {
      setTestingBackend(false);
    }
  };

  const handleSaveBackend = () => {
    const cleanUrl = backendUrlInput.trim();
    setApiBaseUrl(cleanUrl || null);
    setSuccessMsg(`Backend API URL updated to: ${cleanUrl || '(current host)'}`);
    setShowBackendConfig(false);
  };

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

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Google sign in failed. Please try again.');
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
        phone: phone || whatsappNumber,
        whatsappNumber: whatsappNumber || phone,
        state,
        city,
        shopName: role === 'seller' ? shopName || `${name}'s Store` : undefined
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
      setSuccessMsg(res.message || 'Password recovery verified. Enter your new password.');
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-md bg-white border border-[#E5E7EB] rounded-3xl shadow-2xl overflow-hidden my-4 text-[#111111]">
        {/* Green Header */}
        <div className="bg-[#0B6B3A] border-b-4 border-[#F2B90D] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#F2B90D] flex items-center justify-center font-black text-[#111111] text-sm shadow-sm">
              WM
            </div>
            <div>
              <h3 className="font-black text-base leading-tight text-white">
                {mode === 'login'
                  ? 'Login to WukariMart'
                  : mode === 'register'
                  ? 'Join WukariMart'
                  : 'Password Recovery'}
              </h3>
              <p className="text-[11px] text-white/90">
                {mode === 'login'
                  ? 'Sign in with your FUWUKARI marketplace account'
                  : mode === 'register'
                  ? 'Create a free student buyer or seller account'
                  : 'Recover your account access'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#14532D] border border-white/25 hover:border-[#F2B90D] flex items-center justify-center transition"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Tab switch between Login and Register */}
        {mode !== 'forgot' && (
          <div className="grid grid-cols-2 border-b border-[#E5E7EB] bg-[#F5F5F5] text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
                setSuccessMsg('');
              }}
              className={`py-3 transition ${
                mode === 'login'
                  ? 'border-b-2 border-[#0B6B3A] text-[#0B6B3A] bg-white font-black'
                  : 'text-[#555555] hover:text-[#111111]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
                setSuccessMsg('');
              }}
              className={`py-3 transition ${
                mode === 'register'
                  ? 'border-b-2 border-[#0B6B3A] text-[#0B6B3A] bg-white font-black'
                  : 'text-[#555555] hover:text-[#111111]'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        <div className="p-6 bg-white">
          {error && (
            <div className="mb-4 p-3 bg-[#FFF8DB] border-2 border-[#111111] rounded-xl text-xs text-[#111111] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-[#111111] shrink-0 mt-0.5" />
              <span className="break-words font-semibold">{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-[#F5F5F5] border border-[#0B6B3A] rounded-xl text-xs text-[#0B6B3A] font-bold flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#0B6B3A] shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#333333] mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#0B6B3A] absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl text-[#111111] placeholder-[#666666] focus:border-[#0B6B3A] outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-[#333333]">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setError('');
                      setSuccessMsg('');
                    }}
                    className="text-[11px] text-[#0B6B3A] font-bold hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#0B6B3A] absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl text-[#111111] placeholder-[#666666] focus:border-[#0B6B3A] outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#0B6B3A] hover:bg-[#14532D] text-white font-black text-xs sm:text-sm rounded-xl transition disabled:opacity-50"
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-[#E5E7EB]"></div>
                <span className="flex-shrink mx-2 text-[10px] text-[#666666] uppercase font-bold tracking-wider">
                  Or
                </span>
                <div className="flex-grow border-t border-[#E5E7EB]"></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-[#F5F5F5] hover:bg-[#E5E7EB] text-[#111111] font-bold text-xs sm:text-sm rounded-xl border border-[#E5E7EB] transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span className="w-5 h-5 rounded-full bg-[#0B6B3A] text-[#F2B90D] font-black text-xs flex items-center justify-center">
                  G
                </span>
                <span>Continue with Google</span>
              </button>
            </form>
          )}

          {/* REGISTER FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#333333] mb-1">I want to:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('buyer')}
                    className={`py-2 text-xs font-black rounded-xl border transition ${
                      role === 'buyer'
                        ? 'bg-[#0B6B3A] border-[#0B6B3A] text-[#F2B90D]'
                        : 'bg-[#F5F5F5] border-[#E5E7EB] text-[#444444]'
                    }`}
                  >
                    Buy on WukariMart
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('seller')}
                    className={`py-2 text-xs font-black rounded-xl border transition ${
                      role === 'seller'
                        ? 'bg-[#0B6B3A] border-[#0B6B3A] text-[#F2B90D]'
                        : 'bg-[#F5F5F5] border-[#E5E7EB] text-[#444444]'
                    }`}
                  >
                    Sell on WukariMart
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#333333] mb-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-[#0B6B3A] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="Your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl text-[#111111] placeholder-[#666666] focus:border-[#0B6B3A] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#333333] mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#0B6B3A] absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl text-[#111111] placeholder-[#666666] focus:border-[#0B6B3A] outline-none"
                  />
                </div>
              </div>

              {role === 'seller' && (
                <div>
                  <label className="block text-xs font-bold text-[#333333] mb-1">Shop / Business Name</label>
                  <div className="relative">
                    <Store className="w-4 h-4 text-[#0B6B3A] absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Hostel A Gadgets"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl text-[#111111] placeholder-[#666666] focus:border-[#0B6B3A] outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-[#333333] mb-1">WhatsApp Phone</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#0B6B3A] absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      required
                      placeholder="080..."
                      value={whatsappNumber}
                      onChange={(e) => {
                        setWhatsappNumber(e.target.value);
                        setPhone(e.target.value);
                      }}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl text-[#111111] placeholder-[#666666] focus:border-[#0B6B3A] outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#333333] mb-1">State</label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full p-2 text-xs bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl text-[#111111] focus:border-[#0B6B3A] outline-none"
                  >
                    {NIGERIA_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#333333] mb-1">Hostel / Campus Location</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hostel A, 100L"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl text-[#111111] focus:border-[#0B6B3A] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#333333] mb-1">Create Password (min 6 chars)</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#0B6B3A] absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl text-[#111111] placeholder-[#666666] focus:border-[#0B6B3A] outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#F2B90D] hover:bg-[#FFC107] text-[#111111] font-black text-xs sm:text-sm rounded-xl transition disabled:opacity-50 mt-2"
              >
                {loading
                  ? 'Creating Account...'
                  : role === 'seller'
                  ? 'Create Free Seller Account'
                  : 'Register Account'}
              </button>
            </form>
          )}

          {/* PASSWORD RECOVERY & RESET FORM */}
          {mode === 'forgot' && (
            <div className="space-y-4">
              <p className="text-xs text-[#555555]">
                {resetStep === 'request'
                  ? 'Enter your registered email address to receive password recovery authorization.'
                  : 'Enter your new password below to update your account.'}
              </p>

              {resetStep === 'request' ? (
                <form onSubmit={handleForgotPassword} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[#333333] mb-1">Registered Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full p-2.5 text-xs bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl text-[#111111] outline-none focus:border-[#0B6B3A]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-[#0B6B3A] hover:bg-[#14532D] text-white font-black text-xs rounded-xl transition disabled:opacity-50"
                  >
                    {loading ? 'Verifying...' : 'Request Password Recovery'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[#333333] mb-1">Account Email</label>
                    <input
                      type="email"
                      disabled
                      value={email}
                      className="w-full p-2 text-xs bg-[#F5F5F5] text-[#555555] border border-[#E5E7EB] rounded-xl outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#333333] mb-1">New Password (min 6 chars)</label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-[#0B6B3A] absolute left-3 top-3" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 text-xs bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl text-[#111111] outline-none focus:border-[#0B6B3A]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-[#0B6B3A] hover:bg-[#14532D] text-white font-black text-xs rounded-xl transition disabled:opacity-50"
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
                className="w-full text-center text-xs text-[#0B6B3A] hover:underline font-bold"
              >
                Back to Sign In
              </button>
            </div>
          )}

          {/* Backend Connection & API Diagnostics Panel */}
          <div className="mt-5 pt-3 border-t border-[#E5E7EB]">
            <button
              type="button"
              onClick={() => setShowBackendConfig(!showBackendConfig)}
              className="w-full flex items-center justify-between text-[11px] text-[#555555] hover:text-[#111111] py-1 transition"
            >
              <span className="flex items-center gap-1.5 font-medium">
                <Server className="w-3.5 h-3.5 text-[#0B6B3A]" />
                Backend Connection Settings
              </span>
              <span className="text-[10px] bg-[#F5F5F5] border border-[#E5E7EB] px-2 py-0.5 rounded text-[#555555]">
                {getApiBaseUrl() ? 'Custom API' : 'Direct Full-Stack'}
              </span>
            </button>

            {showBackendConfig && (
              <div className="mt-2.5 p-3 bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl space-y-2 text-xs">
                <div className="text-[11px] text-[#555555]">
                  Configure custom API base URL if hosted separately:
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="url"
                    placeholder="https://your-backend.onrender.com"
                    value={backendUrlInput}
                    onChange={(e) => setBackendUrlInput(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-lg text-[#111111] outline-none focus:border-[#0B6B3A]"
                  />
                  <button
                    type="button"
                    onClick={handleTestBackend}
                    disabled={testingBackend}
                    className="px-2.5 py-1.5 bg-white border border-[#E5E7EB] hover:border-[#0B6B3A] text-[#111111] text-[11px] font-bold rounded-lg transition shrink-0 flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${testingBackend ? 'animate-spin' : ''}`} />
                    Test
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveBackend}
                    className="px-3 py-1.5 bg-[#0B6B3A] hover:bg-[#14532D] text-white text-[11px] font-black rounded-lg transition shrink-0"
                  >
                    Save
                  </button>
                </div>

                {backendStatus && (
                  <p className="text-[11px] font-mono p-1.5 bg-white rounded border border-[#E5E7EB] text-[#111111]">
                    {backendStatus}
                  </p>
                )}

                <div className="flex items-center justify-between text-[10px] text-[#555555] pt-1">
                  <span>Current Endpoint: {getApiBaseUrl() || '(Local / Relative /api)'}</span>
                  {getApiBaseUrl() && (
                    <button
                      type="button"
                      onClick={() => {
                        setBackendUrlInput('');
                        setApiBaseUrl(null);
                        setSuccessMsg('Reset to default backend endpoint');
                      }}
                      className="text-[#0B6B3A] font-bold hover:underline"
                    >
                      Reset Default
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
