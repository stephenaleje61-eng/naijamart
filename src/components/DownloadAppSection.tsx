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
    if (isInstalled) {
      onShowToast('APP ALREADY INSTALLED on your device!');
      onOpenInstallModal();
      return;
    }
    const res = await onTriggerInstall();
    if (res === 'accepted') {
      onShowToast('NIGERIA CAMPUS MARKET installed on your device!');
    } else if (res === 'dismissed') {
      onShowToast('Install dismissed. Follow the browser menu guide anytime.');
      setExpandedGuide('android');
      onOpenInstallModal();
    } else {
      setExpandedGuide('android');
      onOpenInstallModal();
    }
  };

  return (
    <section
      id="download-wukarimart"
      className="bg-[#FFFFFF] text-[#303030] rounded-2xl p-5 sm:p-8 border border-[#EEEEEE] border-b-4 border-b-[#F68B1F] shadow-sm scroll-mt-24"
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Heading Banner */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <img
              src="/pwa-192x192.png"
              alt="NIGERIA CAMPUS MARKET App"
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 border-[#F68B1F] bg-white shrink-0 shadow-sm"
            />
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-[#FFF4EB] text-[#FF6A00] border border-[#F68B1F]/30">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Installable Campus App v{appSettings.appVersion || '2.0.0'}</span>
                </span>
                {isInstalled && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-[#222222] text-[#FFFFFF]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#F68B1F]" />
                    <span>APP ALREADY INSTALLED</span>
                  </span>
                )}
              </div>
              <h2 className="font-display text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-[#222222]">
                DOWNLOAD OUR APP – SHOP FASTER, ANYTIME, ANYWHERE.
              </h2>
              <p className="text-xs sm:text-sm text-[#303030]/80 max-w-2xl leading-relaxed">
                Take your campus marketplace everywhere. Buy, sell, chat, connect and discover opportunities across Nigerian universities.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleAndroidInstall}
              className="px-6 py-3 rounded-xl bg-[#FF6A00] hover:bg-[#F68B1F] text-[#FFFFFF] text-xs sm:text-sm font-black inline-flex items-center justify-center gap-2 shadow-sm transition cursor-pointer whitespace-nowrap"
            >
              {isInstalled ? <CheckCircle2 className="w-4 h-4" /> : <Download className="w-4 h-4" />}
              <span>{isInstalled ? 'APP ALREADY INSTALLED' : 'DOWNLOAD APP'}</span>
            </button>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-[#303030]/75">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F7F7F7] border border-[#EEEEEE]">
                <Zap className="w-3 h-3 text-[#FF6A00]" />
                <span>Fast Loading</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F7F7F7] border border-[#EEEEEE]">
                <WifiOff className="w-3 h-3 text-[#FF6A00]" />
                <span>Offline Ready</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F7F7F7] border border-[#EEEEEE]">
                <ShieldCheck className="w-3 h-3 text-[#FF6A00]" />
                <span>Free</span>
              </span>
            </div>
          </div>
        </div>

        {/* 3 Device Cards: Android, iPhone, iPad */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Android */}
          <div
            className={`rounded-2xl p-5 flex flex-col justify-between gap-4 transition border ${
              deviceType === 'android'
                ? 'bg-[#FFF9F4] text-[#222222] border-[#F68B1F] ring-1 ring-[#F68B1F]'
                : 'bg-[#F7F7F7] text-[#222222] border-[#EEEEEE]'
            }`}
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="w-11 h-11 rounded-2xl bg-[#FF6A00] text-[#FFFFFF] flex items-center justify-center shadow-xs">
                  <Smartphone className="w-5 h-5" />
                </div>
                {deviceType === 'android' && (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#222222] text-[#FFFFFF] text-[10px] font-black uppercase">
                    Your Device
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-base font-black text-[#222222]">Android</h3>
                <p className="text-xs font-bold text-[#FF6A00]">Download for Android</p>
              </div>
              <p className="text-xs text-[#303030]/80 leading-relaxed">
                Install straight to your Android home screen for full-screen marketplace speed, hostel browsing, and student chat.
              </p>

              {(expandedGuide === 'android' || (!isInstallable && !isInstalled)) && (
                <ol className="text-[11px] text-[#303030] bg-[#FFFFFF] border border-[#EEEEEE] rounded-xl p-3 space-y-1 list-decimal list-inside">
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
                <div className="w-full py-2.5 px-4 rounded-xl bg-[#FFF4EB] border border-[#F68B1F]/40 text-[#FF6A00] text-xs font-black flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>APP ALREADY INSTALLED</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleAndroidInstall}
                  className="w-full py-3 px-4 rounded-xl bg-[#F68B1F] hover:bg-[#FF6A00] text-white text-xs font-black flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{isInstallable ? 'Install Android App Now' : 'Download for Android'}</span>
                </button>
              )}

              {hasApk && (
                <a
                  href={appSettings.apkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onTrackExternalDownload('apk_download')}
                  className="w-full py-2 px-3 rounded-xl bg-[#222222] hover:bg-[#303030] text-[#FFFFFF] text-[11px] font-black flex items-center justify-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5 text-[#F68B1F]" />
                  <span>Direct Android APK</span>
                </a>
              )}
              {hasPlayStore && (
                <a
                  href={appSettings.playStoreUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onTrackExternalDownload('playstore_click')}
                  className="w-full py-2 px-3 rounded-xl border border-[#EEEEEE] hover:border-[#F68B1F] bg-[#FFFFFF] text-[#222222] text-[11px] font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <span>Google Play Store</span>
                  <ExternalLink className="w-3 h-3 text-[#FF6A00]" />
                </a>
              )}
            </div>
          </div>

          {/* Card 2: iPhone */}
          <div
            className={`rounded-2xl p-5 flex flex-col justify-between gap-4 transition border ${
              deviceType === 'iphone'
                ? 'bg-[#FFF9F4] text-[#222222] border-[#F68B1F] ring-1 ring-[#F68B1F]'
                : 'bg-[#F7F7F7] text-[#222222] border-[#EEEEEE]'
            }`}
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="w-11 h-11 rounded-2xl bg-[#222222] text-[#F68B1F] flex items-center justify-center shadow-xs">
                  <Smartphone className="w-5 h-5" />
                </div>
                {deviceType === 'iphone' && (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#FF6A00] text-[#FFFFFF] text-[10px] font-black uppercase">
                    Your Device
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-base font-black text-[#222222]">iPhone</h3>
                <p className="text-xs font-bold text-[#FF6A00]">Install on iPhone</p>
              </div>
              <p className="text-xs text-[#303030]/80 leading-relaxed">
                Add NIGERIA CAMPUS MARKET directly to your iPhone Home Screen in Safari for a native-style app icon and fast campus access.
              </p>

              {(expandedGuide === 'iphone' || deviceType === 'iphone') && (
                <ol className="text-[11px] text-[#303030] bg-[#FFFFFF] border border-[#EEEEEE] rounded-xl p-3 space-y-1 list-decimal list-inside">
                  <li>Open this site in Safari on your iPhone.</li>
                  <li>
                    Tap <Share className="w-3 h-3 inline text-[#FF6A00]" /> <strong>Share</strong> at the bottom of Safari.
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
              className="w-full py-3 px-4 rounded-xl bg-[#222222] hover:bg-[#303030] text-[#FFFFFF] text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Share className="w-4 h-4 text-[#F68B1F]" />
              <span>Install on iPhone</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 3: iPad */}
          <div
            className={`rounded-2xl p-5 flex flex-col justify-between gap-4 transition border ${
              deviceType === 'ipad'
                ? 'bg-[#FFF9F4] text-[#222222] border-[#F68B1F] ring-1 ring-[#F68B1F]'
                : 'bg-[#F7F7F7] text-[#222222] border-[#EEEEEE]'
            }`}
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="w-11 h-11 rounded-2xl bg-[#F68B1F] text-[#FFFFFF] flex items-center justify-center shadow-xs">
                  <Tablet className="w-5 h-5" />
                </div>
                {deviceType === 'ipad' && (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#FF6A00] text-[#FFFFFF] text-[10px] font-black uppercase">
                    Your Device
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-base font-black text-[#222222]">iPad</h3>
                <p className="text-xs font-bold text-[#FF6A00]">Install on iPad</p>
              </div>
              <p className="text-xs text-[#303030]/80 leading-relaxed">
                Launch NIGERIA CAMPUS MARKET across wide iPad screens for side-by-side product discovery, GPA tools, and hostel comparison.
              </p>

              {(expandedGuide === 'ipad' || deviceType === 'ipad') && (
                <ol className="text-[11px] text-[#303030] bg-[#FFFFFF] border border-[#EEEEEE] rounded-xl p-3 space-y-1 list-decimal list-inside">
                  <li>Open this page in iPadOS Safari.</li>
                  <li>
                    Tap <Share className="w-3 h-3 inline text-[#FF6A00]" /> <strong>Share</strong> in the top toolbar.
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
              className="w-full py-3 px-4 rounded-xl bg-[#FFFFFF] hover:bg-[#FF6A00] hover:text-white border border-[#EEEEEE] hover:border-[#FF6A00] text-[#222222] text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Tablet className="w-4 h-4 text-[#F68B1F]" />
              <span>Install on iPad</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
