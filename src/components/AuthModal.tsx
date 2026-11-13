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

  // Form states (default Taraba / Wukari for FUWUKARI)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [state, setState] = useState('Taraba');
  const [city, setCity] = useState('Wukari');
  const [shopName, setShopName] = useState('');

  // Password Reset states
  const [resetStep, setResetStep] = useState<'request' | 'reset'>('request');
  const [newPassword, setNewPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Backend API URL Configuration
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-md bg-[#121212] border border-[#333333] rounded-3xl shadow-2xl overflow-hidden my-4">
        {/* Header */}
        <div className="bg-[#1C1C1C] border-b border-[#333333] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FFFFFF] flex items-center justify-center font-black text-black text-sm shadow-sm">
              FU
            </div>
            <div>
              <h3 className="font-black text-base leading-tight text-white">
                {mode === 'login'
                  ? 'Welcome Back to FU MARKET'
                  : mode === 'register'
                  ? 'Join FU MARKET'
                  : 'Password Recovery'}
              </h3>
              <p className="text-[11px] text-[#BDBDBD]">
                {mode === 'login'
                  ? 'Sign in with your genuine FUWUKARI marketplace account'
                  : mode === 'register'
                  ? 'Create a verified student buyer or seller account'
                  : 'Recover your account access'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#121212] border border-[#333333] hover:border-[#FFFFFF] flex items-center justify-center transition"
          >
            <X className="w-4 h-4 text-[#BDBDBD] hover:text-white" />
          </button>
        </div>

        {/* Tab switch between Login and Register */}
        {mode !== 'forgot' && (
          <div className="grid grid-cols-2 border-b border-[#333333] bg-[#1C1C1C] text-xs font-bold">
            <button
              onClick={() => {
                setMode('login');
                setError('');
                setSuccessMsg('');
              }}
              className={`py-3 transition ${
                mode === 'login'
                  ? 'border-b-2 border-[#FFFFFF] text-[#FFFFFF]'
                  : 'text-[#BDBDBD] hover:text-white'
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
                  ? 'border-b-2 border-[#FFFFFF] text-[#FFFFFF]'
                  : 'text-[#BDBDBD] hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span className="break-words">{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-950/60 border border-emerald-700 rounded-xl text-xs text-emerald-200 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#BDBDBD] mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#BDBDBD] absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-[#1C1C1C] border border-[#333333] rounded-xl text-white placeholder-[#BDBDBD]/60 focus:border-[#FFFFFF] outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-[#BDBDBD]">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setError('');
                      setSuccessMsg('');
                    }}
                    className="text-[11px] text-[#FFFFFF] font-semibold hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#BDBDBD] absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-[#1C1C1C] border border-[#333333] rounded-xl text-white placeholder-[#BDBDBD]/60 focus:border-[#FFFFFF] outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#FFFFFF] hover:bg-[#E5E5E5] text-black font-black text-xs sm:text-sm rounded-xl transition disabled:opacity-50"
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-[#333333]"></div>
                <span className="flex-shrink mx-2 text-[10px] text-[#BDBDBD] uppercase font-bold tracking-wider">
                  Or
                </span>
                <div className="flex-grow border-t border-[#333333]"></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-[#1C1C1C] hover:bg-black text-white font-bold text-xs sm:text-sm rounded-xl border border-[#333333] hover:border-[#FFFFFF] transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google</span>
              </button>
            </form>
          )}

          {/* REGISTER FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#BDBDBD] mb-1">I want to:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('buyer')}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      role === 'buyer'
                        ? 'bg-[#FFFFFF]/15 border-[#FFFFFF] text-[#FFFFFF]'
                        : 'border-[#333333] text-[#BDBDBD]'
                    }`}
                  >
                    Buy on FU MARKET
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('seller')}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      role === 'seller'
                        ? 'bg-[#FFFFFF]/15 border-[#FFFFFF] text-[#FFFFFF]'
                        : 'border-[#333333] text-[#BDBDBD]'
                    }`}
                  >
                    Sell on FU MARKET
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#BDBDBD] mb-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-[#BDBDBD] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="Your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-[#1C1C1C] border border-[#333333] rounded-xl text-white placeholder-[#BDBDBD]/60 focus:border-[#FFFFFF] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#BDBDBD] mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#BDBDBD] absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-[#1C1C1C] border border-[#333333] rounded-xl text-white placeholder-[#BDBDBD]/60 focus:border-[#FFFFFF] outline-none"
                  />
                </div>
              </div>

              {role === 'seller' && (
                <div>
                  <label className="block text-xs font-bold text-[#BDBDBD] mb-1">Shop / Business Name</label>
                  <div className="relative">
                    <Store className="w-4 h-4 text-[#BDBDBD] absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Campus Gadgets Wukari"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-[#1C1C1C] border border-[#333333] rounded-xl text-white placeholder-[#BDBDBD]/60 focus:border-[#FFFFFF] outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-[#BDBDBD] mb-1">WhatsApp Phone</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#BDBDBD] absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      required
                      placeholder="080..."
                      value={whatsappNumber}
                      onChange={(e) => {
                        setWhatsappNumber(e.target.value);
                        setPhone(e.target.value);
                      }}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-[#1C1C1C] border border-[#333333] rounded-xl text-white placeholder-[#BDBDBD]/60 focus:border-[#FFFFFF] outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#BDBDBD] mb-1">State</label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full p-2 text-xs bg-[#1C1C1C] border border-[#333333] rounded-xl text-white focus:border-[#FFFFFF] outline-none"
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
                <label className="block text-xs font-bold text-[#BDBDBD] mb-1">City / Campus</label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#1C1C1C] border border-[#333333] rounded-xl text-white focus:border-[#FFFFFF] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#BDBDBD] mb-1">Create Password (min 6 chars)</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#BDBDBD] absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-[#1C1C1C] border border-[#333333] rounded-xl text-white placeholder-[#BDBDBD]/60 focus:border-[#FFFFFF] outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#FFFFFF] hover:bg-[#E5E5E5] text-black font-black text-xs sm:text-sm rounded-xl transition disabled:opacity-50 mt-2"
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
              <p className="text-xs text-[#BDBDBD]">
                {resetStep === 'request'
                  ? 'Enter your registered email address to receive password recovery authorization.'
                  : 'Enter your new password below to update your account.'}
              </p>

              {resetStep === 'request' ? (
                <form onSubmit={handleForgotPassword} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[#BDBDBD] mb-1">Registered Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full p-2.5 text-xs bg-[#1C1C1C] border border-[#333333] rounded-xl text-white outline-none focus:border-[#FFFFFF]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-[#FFFFFF] hover:bg-[#E5E5E5] text-black font-black text-xs rounded-xl transition disabled:opacity-50"
                  >
                    {loading ? 'Verifying...' : 'Request Password Recovery'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[#BDBDBD] mb-1">Account Email</label>
                    <input
                      type="email"
                      disabled
                      value={email}
                      className="w-full p-2 text-xs bg-[#1C1C1C]/60 text-[#BDBDBD] border border-[#333333] rounded-xl outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#BDBDBD] mb-1">New Password (min 6 chars)</label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-[#BDBDBD] absolute left-3 top-3" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 text-xs bg-[#1C1C1C] border border-[#333333] rounded-xl text-white outline-none focus:border-[#FFFFFF]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-[#FFFFFF] hover:bg-[#E5E5E5] text-black font-black text-xs rounded-xl transition disabled:opacity-50"
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
                className="w-full text-center text-xs text-[#BDBDBD] hover:text-white font-semibold"
              >
                Back to Sign In
              </button>
            </div>
          )}

          {/* Backend Connection & API Diagnostics Panel */}
          <div className="mt-5 pt-3 border-t border-[#333333]">
            <button
              type="button"
              onClick={() => setShowBackendConfig(!showBackendConfig)}
              className="w-full flex items-center justify-between text-[11px] text-[#BDBDBD] hover:text-white py-1 transition"
            >
              <span className="flex items-center gap-1.5 font-medium">
                <Server className="w-3.5 h-3.5 text-[#FFFFFF]" />
                Backend Connection Settings
              </span>
              <span className="text-[10px] bg-[#1C1C1C] border border-[#333333] px-2 py-0.5 rounded text-[#BDBDBD]">
                {getApiBaseUrl() ? 'Custom API' : 'Direct Full-Stack'}
              </span>
            </button>

            {showBackendConfig && (
              <div className="mt-2.5 p-3 bg-[#1C1C1C] border border-[#333333] rounded-xl space-y-2 text-xs">
                <div className="text-[11px] text-[#BDBDBD]">
                  Configure custom API base URL if hosted separately:
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="url"
                    placeholder="https://your-backend.onrender.com"
                    value={backendUrlInput}
                    onChange={(e) => setBackendUrlInput(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs bg-[#121212] border border-[#333333] rounded-lg text-white outline-none focus:border-[#FFFFFF]"
                  />
                  <button
                    type="button"
                    onClick={handleTestBackend}
                    disabled={testingBackend}
                    className="px-2.5 py-1.5 bg-[#121212] border border-[#333333] hover:border-[#FFFFFF] text-white text-[11px] font-bold rounded-lg transition shrink-0 flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${testingBackend ? 'animate-spin' : ''}`} />
                    Test
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveBackend}
                    className="px-3 py-1.5 bg-[#FFFFFF] hover:bg-[#E5E5E5] text-black text-[11px] font-black rounded-lg transition shrink-0"
                  >
                    Save
                  </button>
                </div>

                {backendStatus && (
                  <p className="text-[11px] font-mono p-1.5 bg-[#121212] rounded border border-[#333333] text-white">
                    {backendStatus}
                  </p>
                )}

                <div className="flex items-center justify-between text-[10px] text-[#BDBDBD] pt-1">
                  <span>Current Endpoint: {getApiBaseUrl() || '(Local / Relative /api)'}</span>
                  {getApiBaseUrl() && (
                    <button
                      type="button"
                      onClick={() => {
                        setBackendUrlInput('');
                        setApiBaseUrl(null);
                        setSuccessMsg('Reset to default backend endpoint');
                      }}
                      className="text-[#FFFFFF] hover:underline"
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
