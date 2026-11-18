import { createRoot } from 'react-dom/client';
import './index.css';

async function prepareServiceWorkers(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const regs = await Promise.race([
      navigator.serviceWorker.getRegistrations(),
      new Promise<readonly ServiceWorkerRegistration[]>((resolve) => setTimeout(() => resolve([]), 350))
    ]);
    await Promise.all(
      regs.map(async (reg) => {
        const urls = [reg.active?.scriptURL, reg.waiting?.scriptURL, reg.installing?.scriptURL]
          .filter(Boolean)
          .join(' ');
        if (import.meta.env.DEV || urls.includes('dev-sw.js')) {
          await reg.unregister().catch(() => {});
        } else {
          reg.update().catch(() => {});
        }
      })
    );
  } catch {
    // Non-blocking cleanup
  }
}

async function bootstrap() {
  await prepareServiceWorkers();
  const { default: App } = await import('./App.tsx');
  createRoot(document.getElementById('root')!).render(<App />);
}

bootstrap();
