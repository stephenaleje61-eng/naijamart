import React, { useState } from 'react';
import { X, UserCheck, AlertCircle, PlusCircle, MessageCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { mapAuthErrorToUserMessage } from '../services/firebase.js';

interface GuestChoiceModalProps {
  isOpen: boolean;
  actionType: 'post' | 'chat';
  onClose: () => void;
  onContinueAsGuest: () => void;
  onGoogleSuccess: () => void;
}

export const GuestChoiceModal: React.FC<GuestChoiceModalProps> = ({
  isOpen,
  actionType,
  onClose,
  onContinueAsGuest,
  onGoogleSuccess
}) => {
  const { loginWithGoogle } = useAuth();
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoadingGoogle(true);
    try {
      await loginWithGoogle();
      onGoogleSuccess();
    } catch (err: any) {
      setError(mapAuthErrorToUserMessage(err));
    } finally {
      setLoadingGoogle(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guest-choice-title"
    >
      <div className="relative w-full max-w-sm bg-white border border-[#E5E7EB] rounded-3xl shadow-2xl overflow-hidden text-[#10251D]">
        {/* Header */}
        <div className="bg-[#087443] border-b-4 border-[#D4A62A] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#D4A62A] text-[#10251D] flex items-center justify-center shrink-0">
              {actionType === 'post' ? (
                <PlusCircle className="w-4 h-4" />
              ) : (
                <MessageCircle className="w-4 h-4" />
              )}
            </div>
            <div>
              <h3 id="guest-choice-title" className="font-black text-sm text-white leading-tight">
                {actionType === 'post' ? 'Post an Item on NIGERIA CAMPUS MARKET' : 'Chat with Seller'}
              </h3>
              <p className="text-[11px] text-white/85">No email or password required</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-7 h-7 rounded-full bg-[#065D36] border border-white/25 hover:border-[#D4A62A] flex items-center justify-center transition"
          >
            <X className="w-3.5 h-3.5 text-white" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3 bg-white">
          <p className="text-xs text-[#444444] leading-relaxed">
            {actionType === 'post'
              ? 'Continue instantly as a Guest or sign in with Google to publish your item on NIGERIA CAMPUS MARKET.'
              : 'Continue instantly as a Guest or sign in with Google to chat with this seller.'}
          </p>

          {error && (
            <div className="p-3 bg-[#FFF8DB] border border-[#D4A62A] rounded-xl text-[11px] text-[#10251D] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-[#087443] shrink-0 mt-0.5" />
              <span className="font-semibold leading-snug">{error}</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setError(null);
              onContinueAsGuest();
            }}
            className="w-full py-3 px-4 bg-[#D4A62A] hover:bg-[#E0B43B] text-[#10251D] font-black text-xs sm:text-sm rounded-xl shadow-sm active:scale-95 transition flex items-center justify-center gap-2"
          >
            <UserCheck className="w-4 h-4 text-[#087443]" />
            <span>Continue as Guest</span>
          </button>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loadingGoogle}
            className="w-full py-2.5 px-4 bg-[#087443] hover:bg-[#065D36] text-white font-bold text-xs sm:text-sm rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loadingGoogle ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#D4A62A]" />
                <span>Connecting to Google...</span>
              </>
            ) : (
              <>
                <span className="w-5 h-5 rounded-full bg-[#D4A62A] text-[#10251D] font-black text-xs flex items-center justify-center">
                  G
                </span>
                <span>Sign In with Google</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
