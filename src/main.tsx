import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import { bootstrapAppearanceFromStorage } from './utils/theme.js';

bootstrapAppearanceFromStorage();

// Capture beforeinstallprompt early before React hydration completes
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    (window as Window & { __ncmDeferredInstallPrompt?: Event }).__ncmDeferredInstallPrompt = event;
    window.dispatchEvent(new CustomEvent('ncm:deferred-prompt-ready'));
  });
}

// Register and continuously upgrade the Service Worker so outdated/broken SW caches self-heal immediately
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  let reloadingForSwUpgrade = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloadingForSwUpgrade) return;
    // Reload once if transitioning cleanly onto the new service worker version
    if (sessionStorage.getItem('ncm_sw_upgrading') === '1') {
      sessionStorage.removeItem('ncm_sw_upgrading');
      reloadingForSwUpgrade = true;
      window.location.reload();
    }
  });

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      sessionStorage.setItem('ncm_sw_upgrading', '1');
      updateSW(true).catch(() => {});
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      registration.update().catch(() => {});
      if (registration.waiting) {
        sessionStorage.setItem('ncm_sw_upgrading', '1');
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    },
    onRegisterError() {
      // Non-fatal in private browsing or restricted contexts
    }
  });
}

async function bootstrap() {
  const { default: App } = await import('./App.tsx');
  createRoot(document.getElementById('root')!).render(<App />);
}

bootstrap();
