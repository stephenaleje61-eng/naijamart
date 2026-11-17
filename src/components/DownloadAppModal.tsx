import React from 'react';
import {
  CheckCircle2,
  Download,
  ExternalLink,
  Laptop,
  Share,
  Smartphone,
  Sparkles,
  X
} from 'lucide-react';
import { AppSettings } from '../types.js';

interface DownloadAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  isInstalled: boolean;
  isInstallable: boolean;
  isIOS: boolean;
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
      aria-label="Download NIGERIA CAMPUS MARKET App"
    >
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-[#D9E5DF] overflow-hidden">
        {/* Deep Forest Executive Header */}
        <div className="bg-gradient-to-r from-[#10251D] to-[#087443] text-white p-5 flex items-center justify-between gap-4 border-b border-[#D4A62A]/60">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/pwa-192x192.png"
              alt="NIGERIA CAMPUS MARKET App Icon"
              className="w-12 h-12 rounded-xl border border-[#D4A62A] bg-white shrink-0"
            />
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight truncate">
                GET THE NIGERIA CAMPUS MARKET APP
              </h2>
              <p className="text-xs text-slate-100 mt-0.5 truncate">
                Version {appSettings.appVersion || '2.0.0'} · Buy. Sell. Connect. Grow Across Nigerian Campuses.
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

        <div className="p-5 space-y-4">
          {/* Announcement */}
          {appSettings.installAnnouncement && (
            <div className="p-3.5 rounded-xl bg-[#F4F8F5] border border-[#D9E5DF] text-xs text-[#10251D]">
              <p className="font-semibold flex items-center gap-1.5 text-[#10251D]">
                <Sparkles className="w-4 h-4 text-[#D4A62A] shrink-0" />
                <span>App Highlight</span>
              </p>
              <p className="mt-1 text-slate-700">{appSettings.installAnnouncement}</p>
            </div>
          )}

          {/* Installed State vs Install Actions */}
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
            <div className="space-y-3">
              {/* Android / Desktop Chromium 1-Tap PWA Install */}
              {isInstallable && (
                <button
                  type="button"
                  onClick={handlePwaInstallClick}
                  className="w-full py-3 px-4 rounded-xl bg-[#087443] hover:bg-[#065D36] text-white text-sm font-extrabold flex items-center justify-center gap-2 shadow-sm transition"
                >
                  <Download className="w-4 h-4 text-[#D4A62A]" />
                  <span>Install Web App Now (Android &amp; Desktop)</span>
                </button>
              )}

              {/* iPhone / iPad Safari Guide */}
              {isIOS ? (
                <div className="p-4 rounded-xl bg-[#F4F8F5] border border-[#D9E5DF] space-y-2">
                  <p className="text-xs font-extrabold text-[#10251D] flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-[#087443]" />
                    <span>Install on iPhone / iPad (Safari)</span>
                  </p>
                  <ol className="text-xs text-slate-700 space-y-1.5 list-decimal list-inside">
                    <li>
                      Tap the <Share className="w-3.5 h-3.5 inline text-[#087443]" />{' '}
                      <strong>Share</strong> button in your Safari toolbar.
                    </li>
                    <li>
                      Scroll down and tap <strong>Add to Home Screen</strong>.
                    </li>
                    <li>
                      Tap <strong>Add</strong> in the top-right corner to launch NG Campus Market as an app.
                    </li>
                  </ol>
                </div>
              ) : (
                !isInstallable && (
                  <div className="p-4 rounded-xl bg-[#F4F8F5] border border-[#D9E5DF] space-y-1.5">
                    <p className="text-xs font-extrabold text-[#10251D] flex items-center gap-1.5">
                      <Laptop className="w-4 h-4 text-[#087443]" />
                      <span>Browser Install Instructions</span>
                    </p>
                    <p className="text-xs text-slate-700">
                      {appSettings.installInstructions ||
                        'Open your Chrome, Edge, or Brave menu (⋮) and tap "Install NIGERIA CAMPUS MARKET" or "Add to Home Screen".'}
                    </p>
                  </div>
                )
              )}
            </div>
          )}

          {/* CEO-Configured Official Android APK / Google Play Store Links */}
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
