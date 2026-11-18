import React from 'react';
import {
  CheckCircle2,
  Download,
  ExternalLink,
  Laptop,
  Share,
  Smartphone,
  Sparkles,
  Tablet,
  X
} from 'lucide-react';
import { AppSettings, DevicePlatformType } from '../types.js';

interface DownloadAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  isInstalled: boolean;
  isInstallable: boolean;
  isIOS: boolean;
  deviceType?: DevicePlatformType;
  appSettings: AppSettings;
  onTriggerInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
  onTrackExternalDownload: (type: 'apk_download' | 'playstore_click') => void;
  onShowToast: (msg: string) => void;
}

export const DownloadAppModal: React.FC<DownloadAppModalProps> = ({
  isOpen,
  onClose,
  isInstalled,
  isInstallable,
  isIOS,
  deviceType = 'unknown',
  appSettings,
  onTriggerInstall,
  onTrackExternalDownload,
  onShowToast
}) => {
  if (!isOpen) return null;

  const hasApk = Boolean(appSettings.apkEnabled && appSettings.apkUrl && appSettings.apkUrl.trim());
  const hasPlayStore = Boolean(appSettings.playStoreUrl && appSettings.playStoreUrl.trim());

  const handlePwaInstallClick = async () => {
    const outcome = await onTriggerInstall();
    if (outcome === 'accepted') {
      onShowToast('NIGERIA CAMPUS MARKET installed on your device!');
      onClose();
    } else if (outcome === 'dismissed') {
      onShowToast('Install prompt dismissed. You can install anytime from this menu.');
    } else {
      onShowToast('Use your browser menu -> "Install App" or "Add to Home Screen".');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#10251D]/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Download NIGERIA UNIVERSITY MARKET App"
    >
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-[#D9E5DF] overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#10251D] to-[#087443] text-white p-5 flex items-center justify-between gap-4 border-b border-[#D4A62A]/60 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/pwa-192x192.png"
              alt="NIGERIA CAMPUS MARKET App Icon"
              className="w-12 h-12 rounded-xl border border-[#D4A62A] bg-white shrink-0"
            />
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight truncate">
                DOWNLOAD NIGERIA UNIVERSITY MARKET
              </h2>
              <p className="text-xs text-slate-100 mt-0.5 truncate">
                Version {appSettings.appVersion || '2.0.0'} · Take your university marketplace everywhere.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-10 min-w-10 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition shrink-0"
            aria-label="Close app download dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {appSettings.installAnnouncement && (
            <div className="p-3.5 rounded-xl bg-[#F4F8F5] border border-[#D9E5DF] text-xs text-[#10251D]">
              <p className="font-semibold flex items-center gap-1.5 text-[#10251D]">
                <Sparkles className="w-4 h-4 text-[#D4A62A] shrink-0" />
                <span>Multi-Device Campus App</span>
              </p>
              <p className="mt-1 text-slate-700">{appSettings.installAnnouncement}</p>
            </div>
          )}

          {isInstalled ? (
            <div className="p-4 rounded-xl bg-[#087443]/10 border border-[#087443]/30 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-[#087443] shrink-0" />
              <div>
                <p className="text-sm font-bold text-[#10251D]">
                  NIGERIA CAMPUS MARKET App Is Already Installed
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  You are running the installable app experience on your device.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Android */}
              <div
                className={`p-3.5 rounded-xl border space-y-2.5 flex flex-col justify-between ${
                  deviceType === 'android'
                    ? 'bg-emerald-50/70 border-[#087443]'
                    : 'bg-[#F4F8F5] border-[#D9E5DF]'
                }`}
              >
                <div className="space-y-1.5">
                  <p className="text-xs font-black text-[#10251D] flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-[#087443]" />
                    <span>Android</span>
                  </p>
                  <p className="text-[11px] text-slate-700 leading-relaxed">
                    Tap Install below or open Chrome menu (<strong>⋮</strong>) →{' '}
                    <strong>Install app</strong>.
                  </p>
                </div>
                {isInstallable && !isIOS ? (
                  <button
                    type="button"
                    onClick={handlePwaInstallClick}
                    className="w-full py-2 px-3 rounded-xl bg-[#087443] hover:bg-[#065D36] text-white text-[11px] font-black flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5 text-[#D4A62A]" />
                    <span>Download for Android</span>
                  </button>
                ) : (
                  <span className="text-[10px] font-bold text-[#087443]">
                    Chrome / Edge PWA Ready
                  </span>
                )}
              </div>

              {/* iPhone */}
              <div
                className={`p-3.5 rounded-xl border space-y-2 ${
                  deviceType === 'iphone'
                    ? 'bg-emerald-50/70 border-[#087443]'
                    : 'bg-[#F4F8F5] border-[#D9E5DF]'
                }`}
              >
                <p className="text-xs font-black text-[#10251D] flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-[#10251D]" />
                  <span>Install on iPhone</span>
                </p>
                <ol className="text-[11px] text-slate-700 space-y-1 list-decimal list-inside">
                  <li>Open in Safari.</li>
                  <li>
                    Tap <Share className="w-3 h-3 inline text-[#087443]" /> <strong>Share</strong>.
                  </li>
                  <li>
                    Tap <strong>Add to Home Screen</strong> → <strong>Add</strong>.
                  </li>
                </ol>
              </div>

              {/* iPad */}
              <div
                className={`p-3.5 rounded-xl border space-y-2 ${
                  deviceType === 'ipad'
                    ? 'bg-emerald-50/70 border-[#087443]'
                    : 'bg-[#F4F8F5] border-[#D9E5DF]'
                }`}
              >
                <p className="text-xs font-black text-[#10251D] flex items-center gap-1.5">
                  <Tablet className="w-4 h-4 text-[#087443]" />
                  <span>Install on iPad</span>
                </p>
                <ol className="text-[11px] text-slate-700 space-y-1 list-decimal list-inside">
                  <li>Open in iPadOS Safari.</li>
                  <li>
                    Tap <Share className="w-3 h-3 inline text-[#087443]" /> <strong>Share</strong> (top bar).
                  </li>
                  <li>
                    Tap <strong>Add to Home Screen</strong> → <strong>Add</strong>.
                  </li>
                </ol>
              </div>
            </div>
          )}

          {!isInstalled && isInstallable && (
            <button
              type="button"
              onClick={handlePwaInstallClick}
              className="w-full py-3 px-4 rounded-xl bg-[#087443] hover:bg-[#065D36] text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-sm transition"
            >
              <Laptop className="w-4 h-4 text-[#D4A62A]" />
              <span>Install Web App Directly on This Device</span>
            </button>
          )}

          {(hasApk || hasPlayStore) && (
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <p className="text-xs font-bold text-[#10251D]">Official Android Packages</p>
              <div className="flex flex-col sm:flex-row gap-2">
                {hasApk && (
                  <a
                    href={appSettings.apkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onTrackExternalDownload('apk_download')}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-[#10251D] hover:bg-[#091812] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition"
                  >
                    <Download className="w-4 h-4 text-[#D4A62A]" />
                    <span>Download Android APK</span>
                  </a>
                )}
                {hasPlayStore && (
                  <a
                    href={appSettings.playStoreUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onTrackExternalDownload('playstore_click')}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-[#D9E5DF] hover:border-[#087443] bg-white text-[#10251D] text-xs font-bold flex items-center justify-center gap-1.5 transition"
                  >
                    <span>Google Play Store</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#087443]" />
                  </a>
                )}
              </div>
            </div>
          )}

          {appSettings.releaseNotes && (
            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
              <strong className="text-[#10251D]">Release Notes:</strong> {appSettings.releaseNotes}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
