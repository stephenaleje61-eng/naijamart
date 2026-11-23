import { useCallback, useEffect, useState } from 'react';
import { AppSettings, DevicePlatformType, PwaEventType, PwaInstallMetric } from '../types.js';
import { fetchPublicAppSettings, trackPwaInstallEvent } from '../services/ceoAdmin.js';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type VisitorBrowserType =
  | 'chrome'
  | 'edge'
  | 'safari'
  | 'samsung'
  | 'firefox'
  | 'in-app'
  | 'other';

declare global {
  interface Window {
    __ncmDeferredInstallPrompt?: Event;
  }
}

const DEFAULT_APP_SETTINGS: AppSettings = {
  id: 'app_distribution',
  apkUrl: '',
  playStoreUrl: '',
  apkEnabled: false,
  appVersion: '2.0.0',
  releaseNotes:
    'NIGERIA CAMPUS MARKET PWA with nationwide campus search, notifications, and fast mobile shopping.',
  installAnnouncement:
    'Install NIGERIA CAMPUS MARKET on your Android, iPhone, iPad, or desktop for fast campus trading.',
  installInstructions:
    'Android/Chrome: Tap Download App. iPhone/iPad Safari: Tap Share -> Add to Home Screen.'
};

export function detectVisitorDeviceType(): DevicePlatformType {
  if (typeof window === 'undefined') return 'unknown';
  const ua = window.navigator.userAgent.toLowerCase();
  const maxTouchPoints = Number(window.navigator.maxTouchPoints || 0);
  if (/ipad/.test(ua) || (/macintosh/.test(ua) && maxTouchPoints > 1)) {
    return 'ipad';
  }
  if (/iphone|ipod/.test(ua)) return 'iphone';
  if (/android/.test(ua)) return 'android';
  if (/windows|macintosh|linux|cros/.test(ua)) return 'desktop';
  return 'unknown';
}

export function detectVisitorBrowserType(): VisitorBrowserType {
  if (typeof window === 'undefined') return 'other';
  const ua = window.navigator.userAgent.toLowerCase();
  // Detect common social/messaging WebViews where PWA install menu is hidden
  if (/(fban|fbav|instagram|whatsapp|tiktok|bytedancewebview|snapchat|line\/|\bwv\b)/.test(ua)) {
    return 'in-app';
  }
  if (/samsungbrowser/.test(ua)) return 'samsung';
  if (/edg|edga|edgios/.test(ua)) return 'edge';
  if (/firefox|fxios/.test(ua)) return 'firefox';
  if (/chrome|crios|chromium/.test(ua) && !/edg|opr|opera/.test(ua)) return 'chrome';
  if (/safari/.test(ua) && !/chrome|crios|chromium|edg|fxios/.test(ua)) return 'safari';
  return 'other';
}

function mapDeviceToPwaPlatform(device: DevicePlatformType): PwaInstallMetric['platform'] {
  if (device === 'iphone' || device === 'ipad') return 'ios';
  if (device === 'android') return 'android';
  if (device === 'desktop') return 'desktop';
  return 'unknown';
}

function checkStandaloneInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function usePWAInstall(activeInstitutionId?: string) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() =>
    typeof window !== 'undefined' && window.__ncmDeferredInstallPrompt
      ? (window.__ncmDeferredInstallPrompt as BeforeInstallPromptEvent)
      : null
  );
  const [isInstalled, setIsInstalled] = useState<boolean>(() => checkStandaloneInstalled());
  const [isIOS, setIsIOS] = useState(() => mapDeviceToPwaPlatform(detectVisitorDeviceType()) === 'ios');
  const [deviceType, setDeviceType] = useState<DevicePlatformType>(() => detectVisitorDeviceType());
  const [browserType, setBrowserType] = useState<VisitorBrowserType>(() => detectVisitorBrowserType());
  const [platform, setPlatform] = useState<PwaInstallMetric['platform']>(() =>
    mapDeviceToPwaPlatform(detectVisitorDeviceType())
  );
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);

  useEffect(() => {
    setIsInstalled(checkStandaloneInstalled());

    const detectedDevice = detectVisitorDeviceType();
    const detectedBrowser = detectVisitorBrowserType();
    const detectedPlatform = mapDeviceToPwaPlatform(detectedDevice);
    setDeviceType(detectedDevice);
    setBrowserType(detectedBrowser);
    setPlatform(detectedPlatform);
    setIsIOS(detectedPlatform === 'ios');

    let promptTrackedThisSession = false;

    const capturePrompt = (promptEv: BeforeInstallPromptEvent) => {
      window.__ncmDeferredInstallPrompt = promptEv;
      setDeferredPrompt(promptEv);
      if (!promptTrackedThisSession) {
        promptTrackedThisSession = true;
        trackPwaInstallEvent('prompt_shown', detectedPlatform, activeInstitutionId).catch(() => {});
      }
    };

    if (window.__ncmDeferredInstallPrompt) {
      capturePrompt(window.__ncmDeferredInstallPrompt as BeforeInstallPromptEvent);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      capturePrompt(e as BeforeInstallPromptEvent);
    };

    const handleEarlyPromptReady = () => {
      if (window.__ncmDeferredInstallPrompt) {
        capturePrompt(window.__ncmDeferredInstallPrompt as BeforeInstallPromptEvent);
      }
    };

    const handleAppInstalled = () => {
      window.__ncmDeferredInstallPrompt = undefined;
      setIsInstalled(true);
      setDeferredPrompt(null);
      trackPwaInstallEvent('install_accepted', detectedPlatform, activeInstitutionId).catch(() => {});
    };

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (mqEv: MediaQueryListEvent) => {
      if (mqEv.matches) {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('ncm:deferred-prompt-ready', handleEarlyPromptReady);
    window.addEventListener('appinstalled', handleAppInstalled);
    mediaQuery.addEventListener?.('change', handleDisplayModeChange);

    fetchPublicAppSettings()
      .then((cfg) => setAppSettings(cfg))
      .catch(() => {});

    const handleSettingsUpdated = (ev: Event) => {
      const custom = ev as CustomEvent<AppSettings>;
      if (custom?.detail) setAppSettings(custom.detail);
    };
    window.addEventListener('nuh:app-settings-updated', handleSettingsUpdated);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('ncm:deferred-prompt-ready', handleEarlyPromptReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mediaQuery.removeEventListener?.('change', handleDisplayModeChange);
      window.removeEventListener('nuh:app-settings-updated', handleSettingsUpdated);
    };
  }, [activeInstitutionId]);

  const install = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    const activePrompt =
      deferredPrompt ||
      (typeof window !== 'undefined'
        ? (window.__ncmDeferredInstallPrompt as BeforeInstallPromptEvent | undefined)
        : undefined);
    if (!activePrompt) return 'unavailable';

    try {
      await activePrompt.prompt();
      const { outcome } = await activePrompt.userChoice;
      window.__ncmDeferredInstallPrompt = undefined;
      setDeferredPrompt(null);
      if (outcome === 'accepted') {
        setIsInstalled(true);
        trackPwaInstallEvent('install_accepted', platform, activeInstitutionId).catch(() => {});
        return 'accepted';
      }
      trackPwaInstallEvent('install_dismissed', platform, activeInstitutionId).catch(() => {});
      return 'dismissed';
    } catch {
      return 'unavailable';
    }
  }, [deferredPrompt, platform, activeInstitutionId]);

  const trackExternalDownload = useCallback(
    (eventType: Extract<PwaEventType, 'apk_download' | 'playstore_click'>) => {
      trackPwaInstallEvent(eventType, platform, activeInstitutionId).catch(() => {});
    },
    [platform, activeInstitutionId]
  );

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    deviceType,
    browserType,
    platform,
    appSettings,
    install,
    trackExternalDownload
  };
}
