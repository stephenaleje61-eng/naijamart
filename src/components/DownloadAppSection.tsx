import React, { useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  Download,
  ExternalLink,
  Share,
  ShieldCheck,
  Smartphone,
  Tablet,
  WifiOff,
  Zap
} from 'lucide-react';
import { AppSettings, DevicePlatformType } from '../types.js';

interface DownloadAppSectionProps {
  deviceType: DevicePlatformType;
  isInstalled: boolean;
  isInstallable: boolean;
  appSettings: AppSettings;
  onTriggerInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
  onTrackExternalDownload: (type: 'apk_download' | 'playstore_click') => void;
  onOpenInstallModal: () => void;
  onShowToast: (msg: string) => void;
}

export const DownloadAppSection: React.FC<DownloadAppSectionProps> = ({
  deviceType,
  isInstalled,
  isInstallable,
  appSettings,
  onTriggerInstall,
  onTrackExternalDownload,
  onOpenInstallModal,
  onShowToast
}) => {
  const [expandedGuide, setExpandedGuide] = useState<'android' | 'iphone' | 'ipad' | null>(null);

  const hasApk = Boolean(appSettings.apkEnabled && appSettings.apkUrl && appSettings.apkUrl.trim());
  const hasPlayStore = Boolean(appSettings.playStoreUrl && appSettings.playStoreUrl.trim());

  const handleAndroidInstall = async () => {
    const res = await onTriggerInstall();
    if (res === 'accepted') {
      onShowToast('NIGERIA CAMPUS MARKET installed on your device!');
    } else if (res === 'dismissed') {
      onShowToast('Install dismissed. You can install anytime from this section.');
    } else {
      setExpandedGuide('android');
      onOpenInstallModal();
    }
  };

  return (
    <section
      id="download-wukarimart"
      className="bg-gradient-to-br from-[#10251D] via-[#0E2E21] to-[#087443] text-white rounded-3xl p-6 sm:p-8 lg:p-10 border-b-4 border-[#D4A62A] shadow-xl scroll-mt-24"
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Heading Banner */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <img
              src="/pwa-192x192.png"
              alt="NIGERIA CAMPUS MARKET App"
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 border-[#D4A62A] bg-white shrink-0 shadow-lg"
            />
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-[#D4A62A] text-[#10251D]">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Installable Campus App v{appSettings.appVersion || '2.0.0'}</span>
                </span>
                {isInstalled && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-white/15 text-[#D4A62A] border border-[#D4A62A]/40">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Installed on Device</span>
                  </span>
                )}
              </div>
              <h2 className="font-display text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white">
                DOWNLOAD NIGERIA UNIVERSITY MARKET
              </h2>
              <p className="text-xs sm:text-sm text-white/85 max-w-2xl leading-relaxed">
                Take your university marketplace everywhere. Buy, sell, connect and chat directly from your device.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold text-white/90">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15">
              <Zap className="w-3.5 h-3.5 text-[#D4A62A]" />
              <span>Instant Campus Loading</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15">
              <WifiOff className="w-3.5 h-3.5 text-[#D4A62A]" />
              <span>Offline Fallback Ready</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15">
              <ShieldCheck className="w-3.5 h-3.5 text-[#D4A62A]" />
              <span>Zero App Store Fees</span>
            </span>
          </div>
        </div>

        {/* 3 Device Cards: Android, iPhone, iPad */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Android */}
          <div
            className={`rounded-2xl p-5 flex flex-col justify-between gap-4 transition border ${
              deviceType === 'android'
                ? 'bg-white text-[#10251D] border-[#D4A62A] ring-2 ring-[#D4A62A]'
                : 'bg-white text-[#10251D] border-[#D9E5DF]'
            }`}
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="w-11 h-11 rounded-2xl bg-[#087443] text-[#D4A62A] flex items-center justify-center shadow-xs">
                  <Smartphone className="w-5 h-5" />
                </div>
                {deviceType === 'android' && (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#D4A62A] text-[#10251D] text-[10px] font-black uppercase">
                    Your Device
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-base font-black text-[#10251D]">Android</h3>
                <p className="text-xs font-bold text-[#087443]">Download for Android</p>
              </div>
              <p className="text-xs text-[#555555] leading-relaxed">
                Install straight to your Android home screen for full-screen marketplace speed, hostel browsing, and student chat.
              </p>

              {(expandedGuide === 'android' || (!isInstallable && !isInstalled)) && (
                <ol className="text-[11px] text-[#374151] bg-[#F4F8F5] border border-[#D9E5DF] rounded-xl p-3 space-y-1 list-decimal list-inside">
                  <li>Open in Google Chrome or Edge on Android.</li>
                  <li>
                    Tap browser menu (<strong>⋮</strong>) and choose{' '}
                    <strong>Install app</strong> or <strong>Add to Home screen</strong>.
                  </li>
                </ol>
              )}
            </div>

            <div className="space-y-2 pt-1">
              {isInstalled ? (
                <div className="w-full py-2.5 px-4 rounded-xl bg-[#087443]/10 border border-[#087443]/30 text-[#087443] text-xs font-black flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>App Installed</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleAndroidInstall}
                  className="w-full py-3 px-4 rounded-xl bg-[#087443] hover:bg-[#065D36] text-white text-xs font-black flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[#D4A62A]" />
                  <span>{isInstallable ? 'Install Android App Now' : 'Download for Android'}</span>
                </button>
              )}

              {hasApk && (
                <a
                  href={appSettings.apkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onTrackExternalDownload('apk_download')}
                  className="w-full py-2 px-3 rounded-xl bg-[#10251D] hover:bg-black text-[#D4A62A] text-[11px] font-black flex items-center justify-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Direct Android APK</span>
                </a>
              )}
              {hasPlayStore && (
                <a
                  href={appSettings.playStoreUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onTrackExternalDownload('playstore_click')}
                  className="w-full py-2 px-3 rounded-xl border border-[#D9E5DF] hover:border-[#087443] text-[#10251D] text-[11px] font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <span>Google Play Store</span>
                  <ExternalLink className="w-3 h-3 text-[#087443]" />
                </a>
              )}
            </div>
          </div>

          {/* Card 2: iPhone */}
          <div
            className={`rounded-2xl p-5 flex flex-col justify-between gap-4 transition border ${
              deviceType === 'iphone'
                ? 'bg-white text-[#10251D] border-[#D4A62A] ring-2 ring-[#D4A62A]'
                : 'bg-white text-[#10251D] border-[#D9E5DF]'
            }`}
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="w-11 h-11 rounded-2xl bg-[#10251D] text-[#D4A62A] flex items-center justify-center shadow-xs">
                  <Smartphone className="w-5 h-5" />
                </div>
                {deviceType === 'iphone' && (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#D4A62A] text-[#10251D] text-[10px] font-black uppercase">
                    Your Device
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-base font-black text-[#10251D]">iPhone</h3>
                <p className="text-xs font-bold text-[#087443]">Install on iPhone</p>
              </div>
              <p className="text-xs text-[#555555] leading-relaxed">
                Add NIGERIA CAMPUS MARKET directly to your iPhone Home Screen in Safari for a native-style app icon and fast campus access.
              </p>

              {(expandedGuide === 'iphone' || deviceType === 'iphone') && (
                <ol className="text-[11px] text-[#374151] bg-[#F4F8F5] border border-[#D9E5DF] rounded-xl p-3 space-y-1 list-decimal list-inside">
                  <li>Open this site in Safari on your iPhone.</li>
                  <li>
                    Tap <Share className="w-3 h-3 inline text-[#087443]" /> <strong>Share</strong> at the bottom of Safari.
                  </li>
                  <li>
                    Scroll and tap <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>.
                  </li>
                </ol>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setExpandedGuide((prev) => (prev === 'iphone' ? null : 'iphone'));
                onOpenInstallModal();
              }}
              className="w-full py-3 px-4 rounded-xl bg-[#10251D] hover:bg-black text-[#D4A62A] text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Share className="w-4 h-4" />
              <span>Install on iPhone</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 3: iPad */}
          <div
            className={`rounded-2xl p-5 flex flex-col justify-between gap-4 transition border ${
              deviceType === 'ipad'
                ? 'bg-white text-[#10251D] border-[#D4A62A] ring-2 ring-[#D4A62A]'
                : 'bg-white text-[#10251D] border-[#D9E5DF]'
            }`}
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="w-11 h-11 rounded-2xl bg-[#087443] text-white flex items-center justify-center shadow-xs">
                  <Tablet className="w-5 h-5 text-[#D4A62A]" />
                </div>
                {deviceType === 'ipad' && (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#D4A62A] text-[#10251D] text-[10px] font-black uppercase">
                    Your Device
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-base font-black text-[#10251D]">iPad</h3>
                <p className="text-xs font-bold text-[#087443]">Install on iPad</p>
              </div>
              <p className="text-xs text-[#555555] leading-relaxed">
                Launch NIGERIA CAMPUS MARKET across wide iPad screens for side-by-side product discovery, GPA tools, and hostel comparison.
              </p>

              {(expandedGuide === 'ipad' || deviceType === 'ipad') && (
                <ol className="text-[11px] text-[#374151] bg-[#F4F8F5] border border-[#D9E5DF] rounded-xl p-3 space-y-1 list-decimal list-inside">
                  <li>Open this page in iPadOS Safari.</li>
                  <li>
                    Tap <Share className="w-3 h-3 inline text-[#087443]" /> <strong>Share</strong> in the top toolbar.
                  </li>
                  <li>
                    Choose <strong>Add to Home Screen</strong> → tap <strong>Add</strong>.
                  </li>
                </ol>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setExpandedGuide((prev) => (prev === 'ipad' ? null : 'ipad'));
                onOpenInstallModal();
              }}
              className="w-full py-3 px-4 rounded-xl bg-[#F4F8F5] hover:bg-[#087443] hover:text-white border border-[#D9E5DF] text-[#10251D] text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Tablet className="w-4 h-4 text-[#D4A62A]" />
              <span>Install on iPad</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
