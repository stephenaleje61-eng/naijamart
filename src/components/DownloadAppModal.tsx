import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  ExternalLink,
  Laptop,
  MoreVertical,
  Share,
  Smartphone,
  Sparkles,
  Tablet,
  X
} from 'lucide-react';
import { AppSettings, DevicePlatformType } from '../types.js';
import { VisitorBrowserType } from '../hooks/usePWAInstall.js';

interface DownloadAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  isInstalled: boolean;
  isInstallable: boolean;
  isIOS: boolean;
  deviceType?: DevicePlatformType;
  browserType?: VisitorBrowserType;
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
  browserType = 'other',
  appSettings,
  onTriggerInstall,
  onTrackExternalDownload,
  onShowToast
}) => {
  if (!isOpen) return null;

  const hasApk = Boolean(appSettings.apkEnabled && appSettings.apkUrl && appSettings.apkUrl.trim());
  const hasPlayStore = Boolean(appSettings.playStoreUrl && appSettings.playStoreUrl.trim());

  const handlePwaInstallClick = async () => {
    if (isInstalled) {
      onShowToast('APP ALREADY INSTALLED on your device!');
      return;
    }
    const outcome = await onTriggerInstall();
    if (outcome === 'accepted') {
      onShowToast('NIGERIA CAMPUS MARKET installed on your device!');
      onClose();
    } else if (outcome === 'dismissed') {
      onShowToast('Install dismissed. Follow the browser menu steps below anytime.');
    } else {
      onShowToast('Automatic prompt unavailable here — follow the device steps below.');
    }
  };

  const renderBrowserNotice = () => {
    if (isInstalled) return null;

    if (browserType === 'in-app') {
      return (
        <div className="p-3.5 rounded-xl bg-[#FFF4EB] border border-[#FF6A00] text-xs text-[#222222] flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-[#FF6A00] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-black">In-App Browser Detected</p>
            <p className="text-[#303030] leading-relaxed">
              In-app browsers (WhatsApp, Instagram, Facebook, TikTok) block app installation. Tap the menu icon (<strong>⋮</strong> or <strong>•••</strong>) and select <strong>Open in Chrome</strong> (Android) or <strong>Open in Safari</strong> (iPhone/iPad).
            </p>
          </div>
        </div>
      );
    }

    if (isIOS && browserType !== 'safari') {
      return (
        <div className="p-3.5 rounded-xl bg-[#FFF4EB] border border-[#FF6A00] text-xs text-[#222222] flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-[#FF6A00] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-black">Open in Safari on {deviceType === 'ipad' ? 'iPad' : 'iPhone'}</p>
            <p className="text-[#303030] leading-relaxed">
              Apple devices require <strong>Safari</strong> (iOS/iPadOS 16.4+) for Add to Home Screen. Copy this link and open it in Safari, then tap <strong>Share → Add to Home Screen</strong>.
            </p>
          </div>
        </div>
      );
    }

    if (!isInstallable && browserType === 'firefox') {
      return (
        <div className="p-3.5 rounded-xl bg-[#FFF4EB] border border-[#F68B1F] text-xs text-[#222222] flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-[#FF6A00] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-black">Browser Install Instructions (Firefox)</p>
            <p className="text-[#303030] leading-relaxed">
              On Android Firefox, tap the <strong>⋮</strong> menu → <strong>Install</strong>. On Desktop Firefox, open this page in <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong> for one-click app installation.
            </p>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#222222]/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Download NIGERIA CAMPUS MARKET App"
    >
      <div className="bg-[#FFFFFF] w-full max-w-2xl rounded-2xl shadow-2xl border border-[#EEEEEE] overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#222222] text-white p-5 flex items-center justify-between gap-4 border-b-2 border-[#F68B1F] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/pwa-192x192.png"
              alt="NIGERIA CAMPUS MARKET App Icon"
              className="w-12 h-12 rounded-xl border border-[#F68B1F] bg-white shrink-0"
            />
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight truncate">
                DOWNLOAD OUR APP – SHOP FASTER
              </h2>
              <p className="text-xs text-white/80 mt-0.5 truncate">
                NIGERIA CAMPUS MARKET v{appSettings.appVersion || '2.0.0'} · Anytime, Anywhere
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-10 min-w-10 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition shrink-0 cursor-pointer"
            aria-label="Close app download dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {isInstalled ? (
            <div className="p-4 rounded-xl bg-[#FFF4EB] border-2 border-[#FF6A00] flex items-center gap-3">
              <CheckCircle2 className="w-7 h-7 text-[#FF6A00] shrink-0" />
              <div>
                <p className="text-sm font-black text-[#222222] uppercase tracking-wide">
                  APP ALREADY INSTALLED
                </p>
                <p className="text-xs text-[#303030]/85 mt-0.5">
                  You are already running the NIGERIA CAMPUS MARKET installed mobile/desktop app experience.
                </p>
              </div>
            </div>
          ) : (
            <>
              {isInstallable && (
                <button
                  type="button"
                  onClick={handlePwaInstallClick}
                  className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-[#FF6A00] to-[#F68B1F] hover:brightness-105 text-white text-sm font-black flex items-center justify-center gap-2.5 shadow-md transition cursor-pointer"
                >
                  <Download className="w-5 h-5" />
                  <span>INSTALL NIGERIA CAMPUS MARKET APP NOW</span>
                </button>
              )}

              {renderBrowserNotice()}

              {appSettings.installAnnouncement && (
                <div className="p-3.5 rounded-xl bg-[#FFF9F4] border border-[#F68B1F]/30 text-xs text-[#303030]">
                  <p className="font-semibold flex items-center gap-1.5 text-[#222222]">
                    <Sparkles className="w-4 h-4 text-[#FF6A00] shrink-0" />
                    <span>Instant Install Across All Devices</span>
                  </p>
                  <p className="mt-1 text-[#303030]/85">{appSettings.installAnnouncement}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Android */}
                <div
                  className={`p-3.5 rounded-xl border space-y-2.5 flex flex-col justify-between ${
                    deviceType === 'android'
                      ? 'bg-[#FFF9F4] border-2 border-[#FF6A00]'
                      : 'bg-[#F7F7F7] border-[#EEEEEE]'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-black text-[#222222] flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-[#FF6A00]" />
                        <span>Android (Chrome / Edge)</span>
                      </p>
                      {deviceType === 'android' && (
                        <span className="px-2 py-0.5 rounded bg-[#222222] text-white text-[9px] font-black uppercase">
                          Your Device
                        </span>
                      )}
                    </div>
                    <ol className="text-[11px] text-[#303030]/90 space-y-1 list-decimal list-inside leading-relaxed">
                      <li>Tap <strong>Install Now</strong> above if prompted automatically.</li>
                      <li>
                        Or tap Chrome menu <MoreVertical className="w-3 h-3 inline text-[#FF6A00]" /> (<strong>⋮</strong>) at the top-right.
                      </li>
                      <li>
                        Tap <strong>Install app</strong> or <strong>Add to Home screen</strong> → <strong>Install</strong>.
                      </li>
                    </ol>
                  </div>
                  {isInstallable && !isIOS && (
                    <button
                      type="button"
                      onClick={handlePwaInstallClick}
                      className="w-full py-2 px-3 rounded-xl bg-[#FF6A00] hover:bg-[#F68B1F] text-white text-[11px] font-black flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Install on Android</span>
                    </button>
                  )}
                </div>

                {/* iPhone */}
                <div
                  className={`p-3.5 rounded-xl border space-y-2 ${
                    deviceType === 'iphone'
                      ? 'bg-[#FFF9F4] border-2 border-[#FF6A00]'
                      : 'bg-[#F7F7F7] border-[#EEEEEE]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-black text-[#222222] flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-[#222222]" />
                      <span>iPhone (Safari)</span>
                    </p>
                    {deviceType === 'iphone' && (
                      <span className="px-2 py-0.5 rounded bg-[#222222] text-white text-[9px] font-black uppercase">
                        Your Device
                      </span>
                    )}
                  </div>
                  <ol className="text-[11px] text-[#303030]/90 space-y-1 list-decimal list-inside leading-relaxed">
                    <li>Open NIGERIA CAMPUS MARKET in <strong>Safari</strong>.</li>
                    <li>
                      Tap <Share className="w-3 h-3 inline text-[#FF6A00]" /> <strong>Share</strong> at the bottom of Safari.
                    </li>
                    <li>
                      Scroll down and tap <strong>Add to Home Screen</strong> → <strong>Add</strong>.
                    </li>
                  </ol>
                </div>

                {/* iPad */}
                <div
                  className={`p-3.5 rounded-xl border space-y-2 ${
                    deviceType === 'ipad'
                      ? 'bg-[#FFF9F4] border-2 border-[#FF6A00]'
                      : 'bg-[#F7F7F7] border-[#EEEEEE]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-black text-[#222222] flex items-center gap-1.5">
                      <Tablet className="w-4 h-4 text-[#FF6A00]" />
                      <span>iPad (Safari)</span>
                    </p>
                    {deviceType === 'ipad' && (
                      <span className="px-2 py-0.5 rounded bg-[#222222] text-white text-[9px] font-black uppercase">
                        Your Device
                      </span>
                    )}
                  </div>
                  <ol className="text-[11px] text-[#303030]/90 space-y-1 list-decimal list-inside leading-relaxed">
                    <li>Open this marketplace in iPadOS <strong>Safari</strong>.</li>
                    <li>
                      Tap <Share className="w-3 h-3 inline text-[#FF6A00]" /> <strong>Share</strong> in the top toolbar.
                    </li>
                    <li>
                      Select <strong>Add to Home Screen</strong> → tap <strong>Add</strong>.
                    </li>
                  </ol>
                </div>

                {/* Desktop */}
                <div
                  className={`p-3.5 rounded-xl border space-y-2.5 flex flex-col justify-between ${
                    deviceType === 'desktop'
                      ? 'bg-[#FFF9F4] border-2 border-[#FF6A00]'
                      : 'bg-[#F7F7F7] border-[#EEEEEE]'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-black text-[#222222] flex items-center gap-1.5">
                        <Laptop className="w-4 h-4 text-[#222222]" />
                        <span>Desktop (Chrome / Edge)</span>
                      </p>
                      {deviceType === 'desktop' && (
                        <span className="px-2 py-0.5 rounded bg-[#222222] text-white text-[9px] font-black uppercase">
                          Your Device
                        </span>
                      )}
                    </div>
                    <ol className="text-[11px] text-[#303030]/90 space-y-1 list-decimal list-inside leading-relaxed">
                      <li>Open in Google Chrome or Microsoft Edge.</li>
                      <li>
                        Click the <strong>Install</strong> icon on the right side of the address bar, or open browser menu (<strong>⋮</strong>) → <strong>Cast, save, and share</strong> → <strong>Install page as app</strong>.
                      </li>
                    </ol>
                  </div>
                  {isInstallable && deviceType === 'desktop' && (
                    <button
                      type="button"
                      onClick={handlePwaInstallClick}
                      className="w-full py-2 px-3 rounded-xl bg-[#222222] hover:bg-[#303030] text-white text-[11px] font-black flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-[#F68B1F]" />
                      <span>Install Desktop App</span>
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          {(hasApk || hasPlayStore) && (
            <div className="pt-2 border-t border-[#EEEEEE] space-y-2">
              <p className="text-xs font-bold text-[#222222]">Official Android Packages</p>
              <div className="flex flex-col sm:flex-row gap-2">
                {hasApk && (
                  <a
                    href={appSettings.apkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onTrackExternalDownload('apk_download')}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-[#222222] hover:bg-[#303030] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition"
                  >
                    <Download className="w-4 h-4 text-[#F68B1F]" />
                    <span>Download Android APK</span>
                  </a>
                )}
                {hasPlayStore && (
                  <a
                    href={appSettings.playStoreUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onTrackExternalDownload('playstore_click')}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-[#EEEEEE] hover:border-[#F68B1F] bg-white text-[#222222] text-xs font-bold flex items-center justify-center gap-1.5 transition"
                  >
                    <span>Google Play Store</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#FF6A00]" />
                  </a>
                )}
              </div>
            </div>
          )}

          {appSettings.releaseNotes && (
            <div className="pt-2 border-t border-[#EEEEEE] text-[11px] text-[#303030]/75">
              <strong className="text-[#222222]">Release Notes:</strong> {appSettings.releaseNotes}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
