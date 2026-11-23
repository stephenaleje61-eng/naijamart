import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Download,
  Laptop,
  ShieldCheck,
  Smartphone,
  Tablet,
  WifiOff,
  Zap
} from 'lucide-react';
import { DevicePlatformType } from '../types.js';
import { VisitorBrowserType } from '../hooks/usePWAInstall.js';

interface HeroDownloadBannerProps {
  deviceType: DevicePlatformType;
  browserType: VisitorBrowserType;
  isInstalled: boolean;
  isInstallable: boolean;
  isIOS: boolean;
  onTriggerInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
  onOpenInstallModal: () => void;
  onShowToast: (msg: string) => void;
}

export const HeroDownloadBanner: React.FC<HeroDownloadBannerProps> = ({
  deviceType,
  browserType,
  isInstalled,
  isInstallable,
  isIOS,
  onTriggerInstall,
  onOpenInstallModal,
  onShowToast
}) => {
  const [installing, setInstalling] = useState(false);

  const DeviceIcon =
    deviceType === 'ipad' ? Tablet : deviceType === 'desktop' ? Laptop : Smartphone;

  const getDeviceActionHint = () => {
    if (isInstalled) return 'Running as an installed app on your device';
    if (isInstallable) {
      return deviceType === 'android'
        ? 'Instant 1-Tap Android App Install'
        : 'Instant 1-Tap Browser App Install';
    }
    if (isIOS) {
      return browserType === 'safari'
        ? 'iPhone / iPad Safari — Add to Home Screen'
        : 'Open in Safari to Add to iPhone / iPad Home Screen';
    }
    if (deviceType === 'android') {
      return 'Tap for Android Chrome Install';
    }
    return 'Android • iPhone • Tablet • Desktop';
  };

  const handlePrimaryClick = async () => {
    if (isInstalled) {
      onShowToast('APP ALREADY INSTALLED on your device!');
      onOpenInstallModal();
      return;
    }

    if (isInstallable) {
      setInstalling(true);
      try {
        const outcome = await onTriggerInstall();
        if (outcome === 'accepted') {
          onShowToast('NIGERIA CAMPUS MARKET installed on your device!');
          return;
        }
        if (outcome === 'dismissed') {
          onShowToast('Prompt closed — follow quick steps in your browser menu anytime.');
          onOpenInstallModal();
          return;
        }
      } finally {
        setInstalling(false);
      }
    }

    onOpenInstallModal();
  };

  return (
    <section
      aria-label="Download NIGERIA CAMPUS MARKET Mobile App"
      className="max-w-7xl mx-auto px-3 sm:px-4 pt-4 sm:pt-5"
    >
      <div className="bg-[#FFFFFF] border-2 border-[#F68B1F]/40 rounded-2xl p-3 sm:p-4 shadow-md">
        <button
          type="button"
          onClick={handlePrimaryClick}
          disabled={installing}
          className={`group w-full rounded-2xl px-4 py-4 sm:px-7 sm:py-5 flex flex-col md:flex-row items-center justify-between gap-4 text-left transition-all duration-200 cursor-pointer active:scale-[0.99] ${
            isInstalled
              ? 'bg-[#222222] hover:bg-[#303030] text-[#FFFFFF] shadow-md'
              : 'bg-gradient-to-r from-[#FF6A00] via-[#F68B1F] to-[#FF6A00] hover:brightness-105 text-[#FFFFFF] shadow-[0_10px_28px_-6px_rgba(255,106,0,0.5)] hover:shadow-[0_14px_34px_-4px_rgba(255,106,0,0.62)] hover:-translate-y-0.5'
          }`}
        >
          {/* Left: App Icon Tile + Main Callout */}
          <div className="flex items-center gap-3.5 sm:gap-5 w-full md:w-auto">
            <div className="relative shrink-0">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#222222] border-2 border-[#FFFFFF] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-200">
                {isInstalled ? (
                  <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8 text-[#F68B1F]" />
                ) : (
                  <Download className="w-7 h-7 sm:w-8 sm:h-8 text-[#FFFFFF] group-hover:translate-y-0.5 transition-transform" />
                )}
              </div>
              <span className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-lg bg-[#FFFFFF] border border-[#222222]/15 flex items-center justify-center shadow-xs">
                <DeviceIcon className="w-4 h-4 text-[#222222]" />
              </span>
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#222222] text-[#FFFFFF] text-[10px] font-black uppercase tracking-wider">
                  {isInstalled ? 'APP ALREADY INSTALLED' : 'FREE MOBILE APP'}
                </span>
                <span className="text-[11px] font-bold text-[#FFFFFF]/95 hidden sm:inline-flex items-center gap-2">
                  <span className="inline-flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Fast
                  </span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <WifiOff className="w-3 h-3" /> Offline Ready
                  </span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Verified
                  </span>
                </span>
              </div>

              <h2 className="font-display text-base sm:text-xl lg:text-2xl font-black tracking-tight text-[#FFFFFF] leading-tight">
                DOWNLOAD OUR APP – SHOP FASTER, ANYTIME, ANYWHERE.
              </h2>

              <p className="text-xs sm:text-sm font-semibold text-[#FFFFFF]/95">
                {getDeviceActionHint()}
              </p>
            </div>
          </div>

          {/* Right: Large High-Contrast Action CTA Pill */}
          <div className="w-full md:w-auto shrink-0">
            <span
              className={`w-full md:w-auto min-h-[50px] px-6 sm:px-7 py-3 rounded-xl font-black text-sm sm:text-base inline-flex items-center justify-center gap-2.5 shadow-md transition-colors ${
                isInstalled
                  ? 'bg-[#F68B1F] text-[#FFFFFF]'
                  : 'bg-[#FFFFFF] group-hover:bg-[#222222] text-[#222222] group-hover:text-[#FFFFFF]'
              }`}
            >
              {isInstalled ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>APP ALREADY INSTALLED</span>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 text-[#FF6A00] group-hover:text-[#F68B1F]" />
                  <span>{installing ? 'OPENING PROMPT...' : 'DOWNLOAD APP'}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </span>
          </div>
        </button>
      </div>
    </section>
  );
};
