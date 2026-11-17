import { useCallback, useEffect, useState } from 'react';
import { AppSettings, PwaEventType, PwaInstallMetric } from '../types.js';
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
  installAnnouncement: 'Install NIGERIA CAMPUS MARKET on your Android, iPhone, or laptop for fast campus trading.',
  installInstructions: 'Android/Chrome: Tap Install Web App. iPhone/iPad Safari: Tap Share -> Add to Home Screen.'
};

function detectPlatform(ua: string): PwaInstallMetric['platform'] {
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  if (/windows|macintosh|linux|cros/.test(ua)) return 'desktop';
  return 'unknown';
}

export function usePWAInstall(activeInstitutionId?: string) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [platform, setPlatform] = useState<PwaInstallMetric['platform']>('unknown');
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const detected = detectPlatform(userAgent);
    setPlatform(detected);
    setIsIOS(detected === 'ios');

    let promptTrackedThisSession = false;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!promptTrackedThisSession) {
        promptTrackedThisSession = true;
        trackPwaInstallEvent('prompt_shown', detected, activeInstitutionId).catch(() => {});
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      trackPwaInstallEvent('install_accepted', detected, activeInstitutionId).catch(() => {});
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
    platform,
    appSettings,
    install,
    trackExternalDownload
  };
}
