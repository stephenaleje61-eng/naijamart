import { useCallback, useEffect, useState } from 'react';
import { AppSettings, DevicePlatformType, PwaEventType, PwaInstallMetric } from '../types.js';
import { fetchPublicAppSettings, trackPwaInstallEvent } from '../services/ceoAdmin.js';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DEFAULT_APP_SETTINGS: AppSettings = {
  id: 'app_distribution',
  apkUrl: '',
  playStoreUrl: '',
  apkEnabled: false,
  appVersion: '2.0.0',
  releaseNotes: 'NIGERIA CAMPUS MARKET PWA with nationwide campus search, notifications, and NGN subscriptions.',
  installAnnouncement: 'Install NIGERIA CAMPUS MARKET on your Android, iPhone, iPad, or desktop for fast campus trading.',
  installInstructions: 'Android/Chrome: Tap Install Web App. iPhone/iPad Safari: Tap Share -> Add to Home Screen.'
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

function mapDeviceToPwaPlatform(device: DevicePlatformType): PwaInstallMetric['platform'] {
  if (device === 'iphone' || device === 'ipad') return 'ios';
  if (device === 'android') return 'android';
  if (device === 'desktop') return 'desktop';
  return 'unknown';
}

export function usePWAInstall(activeInstitutionId?: string) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(() => mapDeviceToPwaPlatform(detectVisitorDeviceType()) === 'ios');
  const [deviceType, setDeviceType] = useState<DevicePlatformType>(() => detectVisitorDeviceType());
  const [platform, setPlatform] = useState<PwaInstallMetric['platform']>(() =>
    mapDeviceToPwaPlatform(detectVisitorDeviceType())
  );
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const detectedDevice = detectVisitorDeviceType();
    const detectedPlatform = mapDeviceToPwaPlatform(detectedDevice);
    setDeviceType(detectedDevice);
    setPlatform(detectedPlatform);
    setIsIOS(detectedPlatform === 'ios');

    let promptTrackedThisSession = false;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!promptTrackedThisSession) {
        promptTrackedThisSession = true;
        trackPwaInstallEvent('prompt_shown', detectedPlatform, activeInstitutionId).catch(() => {});
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      trackPwaInstallEvent('install_accepted', detectedPlatform, activeInstitutionId).catch(() => {});
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

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
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('nuh:app-settings-updated', handleSettingsUpdated);
    };
  }, [activeInstitutionId]);

  const install = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferredPrompt) return 'unavailable';
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      trackPwaInstallEvent('install_accepted', platform, activeInstitutionId).catch(() => {});
      return 'accepted';
    }
    trackPwaInstallEvent('install_dismissed', platform, activeInstitutionId).catch(() => {});
    return 'dismissed';
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
    platform,
    appSettings,
    install,
    trackExternalDownload
  };
}
